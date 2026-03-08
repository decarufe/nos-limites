import { db } from "../db/connection";
import { users, notifications, notificationEmailSettings } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { emailService } from "./email";
import { v4 as uuidv4 } from "uuid";

// ─── Constants ──────────────────────────────────────────────────────

/** Scheduler polling interval in milliseconds */
const SCHEDULER_INTERVAL_MS = 60 * 1000;

/**
 * Minimum hours between emails for daily/weekly frequencies.
 * 20 hours prevents duplicate sends across timezone boundaries
 * while still allowing daily delivery.
 */
const MIN_EMAIL_INTERVAL_HOURS = 20;

/**
 * Default lookback window (minutes) for "immediately" frequency
 * when no previous email has been sent yet.
 */
const DEFAULT_IMMEDIATE_WINDOW_MINUTES = 2;

// ─── Types ──────────────────────────────────────────────────────────

type NotificationFrequency = "immediately" | "delayed" | "daily" | "weekly";

interface UserSettings {
  enabled: boolean;
  frequency: NotificationFrequency;
  delayHours: number;
  dailyTime: string; // HH:MM
  weeklyDays: number[]; // 0-6, 0 = Sunday
  lastEmailSentAt: Date | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

function parseSettings(row: typeof notificationEmailSettings.$inferSelect | undefined): UserSettings {
  return {
    enabled: row?.enabled ?? true,
    frequency: (row?.frequency ?? "daily") as NotificationFrequency,
    delayHours: row?.delayHours ?? 1,
    dailyTime: row?.dailyTime ?? "08:00",
    weeklyDays: row?.weeklyDays ? (JSON.parse(row.weeklyDays) as number[]) : [0, 1, 2, 3, 4, 5, 6],
    lastEmailSentAt: row?.lastEmailSentAt ? new Date(row.lastEmailSentAt) : null,
  };
}

/**
 * Returns true if the current time falls within `windowMinutes` of `dailyTime`.
 * The tolerance window prevents missing scheduled emails due to scheduler
 * timing variations (e.g., if the scheduler fires at 08:01 for an 08:00 target).
 */
function isTimeMatch(dailyTime: string, now: Date, windowMinutes = 5): boolean {
  const [hours, minutes] = dailyTime.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = hours * 60 + minutes;
  return currentMinutes >= targetMinutes && currentMinutes < targetMinutes + windowMinutes;
}

async function upsertLastEmailSent(userId: string, now: Date): Promise<void> {
  const nowStr = now.toISOString();
  const existing = await db.query.notificationEmailSettings.findFirst({
    where: eq(notificationEmailSettings.userId, userId),
  });

  if (existing) {
    await db
      .update(notificationEmailSettings)
      .set({ lastEmailSentAt: nowStr, updatedAt: nowStr })
      .where(eq(notificationEmailSettings.userId, userId));
  } else {
    await db.insert(notificationEmailSettings).values({
      id: uuidv4(),
      userId,
      lastEmailSentAt: nowStr,
      updatedAt: nowStr,
    });
  }
}

// ─── Core Processing ─────────────────────────────────────────────────

export async function processNotificationEmails(): Promise<void> {
  const now = new Date();

  const allUsers = await db.query.users.findMany();

  for (const user of allUsers) {
    try {
      const settingsRow = await db.query.notificationEmailSettings.findFirst({
        where: eq(notificationEmailSettings.userId, user.id),
      });

      const settings = parseSettings(settingsRow);

      if (!settings.enabled) continue;

      const unreadNotifications = await db.query.notifications.findMany({
        where: and(
          eq(notifications.userId, user.id),
          eq(notifications.isRead, false),
        ),
        orderBy: (tbl, { desc }) => [desc(tbl.createdAt)],
      });

      if (unreadNotifications.length === 0) continue;

      let shouldSend = false;
      let notificationsToSend = unreadNotifications;

      const { frequency, delayHours, dailyTime, weeklyDays, lastEmailSentAt } = settings;

      // Prevent sending twice within MIN_EMAIL_INTERVAL_HOURS (for daily/weekly)
      const minIntervalAgo = new Date(now.getTime() - MIN_EMAIL_INTERVAL_HOURS * 60 * 60 * 1000);

      if (frequency === "immediately") {
        // Send for notifications created after last email (or within the last scheduling interval)
        const since = lastEmailSentAt ?? new Date(now.getTime() - DEFAULT_IMMEDIATE_WINDOW_MINUTES * 60 * 1000);
        const newNotifications = unreadNotifications.filter(
          (n) => new Date(n.createdAt) > since,
        );
        if (newNotifications.length > 0) {
          notificationsToSend = newNotifications;
          shouldSend = true;
        }
      } else if (frequency === "delayed") {
        // Send unread notifications older than delayHours
        const cutoff = new Date(now.getTime() - delayHours * 60 * 60 * 1000);
        const overdueNotifications = unreadNotifications.filter(
          (n) => new Date(n.createdAt) <= cutoff,
        );
        const minInterval = new Date(now.getTime() - Math.max(delayHours, 1) * 60 * 60 * 1000);
        if (
          overdueNotifications.length > 0 &&
          (!lastEmailSentAt || lastEmailSentAt < minInterval)
        ) {
          notificationsToSend = overdueNotifications;
          shouldSend = true;
        }
      } else if (frequency === "daily") {
        if (
          isTimeMatch(dailyTime, now) &&
          (!lastEmailSentAt || lastEmailSentAt < minIntervalAgo)
        ) {
          shouldSend = true;
        }
      } else if (frequency === "weekly") {
        const currentDay = now.getDay();
        if (
          weeklyDays.includes(currentDay) &&
          isTimeMatch(dailyTime, now) &&
          (!lastEmailSentAt || lastEmailSentAt < minIntervalAgo)
        ) {
          shouldSend = true;
        }
      }

      if (shouldSend && notificationsToSend.length > 0) {
        await emailService.sendNotificationDigest({
          to: user.email,
          displayName: user.displayName,
          notifications: notificationsToSend.map((n) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            createdAt: n.createdAt,
          })),
        });

        await upsertLastEmailSent(user.id, now);
        console.log(
          `[NotificationScheduler] Digest sent to ${user.email} (${notificationsToSend.length} notifications, frequency: ${frequency})`,
        );
      }
    } catch (err) {
      console.error(
        `[NotificationScheduler] Error processing user ${user.id}:`,
        err,
      );
    }
  }
}

// ─── Trigger (external caller) ───────────────────────────────────────

let isProcessing = false;

/**
 * Triggers a notification email processing run.
 * If a run is already in progress, returns immediately with `alreadyRunning: true`.
 * Safe to call concurrently — only one run executes at a time.
 */
export async function triggerNotificationEmails(): Promise<{ alreadyRunning: boolean }> {
  if (isProcessing) {
    return { alreadyRunning: true };
  }

  isProcessing = true;
  try {
    await processNotificationEmails();
    return { alreadyRunning: false };
  } finally {
    isProcessing = false;
  }
}

// ─── Scheduler ───────────────────────────────────────────────────────

let schedulerInterval: ReturnType<typeof setInterval> | null = null;

export function startNotificationScheduler(): void {
  if (schedulerInterval) return;

  // Check every minute
  schedulerInterval = setInterval(() => {
    processNotificationEmails().catch((err) => {
      console.error("[NotificationScheduler] Scheduler error:", err);
    });
  }, SCHEDULER_INTERVAL_MS);

  console.log("[NotificationScheduler] Notification scheduler started.");
}

export function stopNotificationScheduler(): void {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log("[NotificationScheduler] Notification scheduler stopped.");
  }
}
