import { db } from "../db/connection";
import { users, notifications, notificationEmailSettings } from "../db/schema";
import { eq, and } from "drizzle-orm";
import { emailService } from "./email";
import { v4 as uuidv4 } from "uuid";

// ─── Constants ──────────────────────────────────────────────────────

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

function parseSettings(
  row: typeof notificationEmailSettings.$inferSelect | undefined,
): UserSettings {
  return {
    enabled: row?.enabled ?? true,
    frequency: (row?.frequency ?? "daily") as NotificationFrequency,
    delayHours: row?.delayHours ?? 1,
    dailyTime: row?.dailyTime ?? "08:00",
    weeklyDays: row?.weeklyDays
      ? (JSON.parse(row.weeklyDays) as number[])
      : [0, 1, 2, 3, 4, 5, 6],
    lastEmailSentAt: row?.lastEmailSentAt
      ? new Date(row.lastEmailSentAt)
      : null,
  };
}

/**
 * Returns true if the current time has reached or passed `dailyTime` today.
 *
 * Unlike the previous window-based check, this works regardless of how often
 * the scheduler API is triggered externally. Deduplication (preventing multiple
 * sends on the same day) is handled by the `lastEmailSentAt` /
 * `MIN_EMAIL_INTERVAL_HOURS` guard in the caller.
 */
function hasTimePassedToday(dailyTime: string, now: Date): boolean {
  const [hours, minutes] = dailyTime.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = hours * 60 + minutes;
  return currentMinutes >= targetMinutes;
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

/**
 * Checks all users and sends notification digest emails according to each
 * user's configured frequency preference. Designed to be called on every
 * external API trigger — internal time/interval guards prevent duplicate sends.
 *
 * @returns The number of digest emails sent in this run.
 */
export async function processNotificationEmails(): Promise<{
  emailsSent: number;
}> {
  const now = new Date();
  let emailsSent = 0;

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

      const { frequency, delayHours, dailyTime, weeklyDays, lastEmailSentAt } =
        settings;

      // Prevent sending twice within MIN_EMAIL_INTERVAL_HOURS (for daily/weekly)
      const minIntervalAgo = new Date(
        now.getTime() - MIN_EMAIL_INTERVAL_HOURS * 60 * 60 * 1000,
      );

      if (frequency === "immediately") {
        // Send for notifications created after last email (or within the last scheduling interval)
        const since =
          lastEmailSentAt ??
          new Date(
            now.getTime() - DEFAULT_IMMEDIATE_WINDOW_MINUTES * 60 * 1000,
          );
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
        const minInterval = new Date(
          now.getTime() - Math.max(delayHours, 1) * 60 * 60 * 1000,
        );
        if (
          overdueNotifications.length > 0 &&
          (!lastEmailSentAt || lastEmailSentAt < minInterval)
        ) {
          notificationsToSend = overdueNotifications;
          shouldSend = true;
        }
      } else if (frequency === "daily") {
        if (
          hasTimePassedToday(dailyTime, now) &&
          (!lastEmailSentAt || lastEmailSentAt < minIntervalAgo)
        ) {
          shouldSend = true;
        }
      } else if (frequency === "weekly") {
        const currentDay = now.getDay();
        if (
          weeklyDays.includes(currentDay) &&
          hasTimePassedToday(dailyTime, now) &&
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
        emailsSent++;
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

  return { emailsSent };
}

// ─── Trigger (external caller) ───────────────────────────────────────

let isProcessing = false;

/**
 * Triggers a single notification email processing run.
 *
 * Called by `POST /api/scheduler/trigger-emails` on every external cron
 * invocation. The function itself decides whether each user has pending
 * emails to send based on their frequency settings and last-sent timestamp.
 *
 * If a run is already in progress, returns immediately with
 * `alreadyRunning: true` without starting a second run.
 *
 * @returns `{ alreadyRunning, emailsSent }` — `emailsSent` is omitted when
 *   the call was skipped due to a concurrent run.
 */
export async function triggerNotificationEmails(): Promise<{
  alreadyRunning: boolean;
  emailsSent?: number;
}> {
  if (isProcessing) {
    return { alreadyRunning: true };
  }

  isProcessing = true;
  try {
    const { emailsSent } = await processNotificationEmails();
    return { alreadyRunning: false, emailsSent };
  } finally {
    isProcessing = false;
  }
}
