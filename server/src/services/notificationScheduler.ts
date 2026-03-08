import { db } from "../db/connection";
import {
  users,
  notifications,
  notificationEmailSettings,
  emailNotificationLog,
} from "../db/schema";
import { eq, and } from "drizzle-orm";
import { emailService } from "./email";
import type { ActivitySummary } from "./email";
import { sortByPriority } from "./notificationClassifier";
import { v4 as uuidv4 } from "uuid";
import {
  REALTIME_MIN_INTERVAL_HOURS,
  REALTIME_BUFFER_MINUTES,
  DIGEST_MIN_INTERVAL_HOURS,
  REALTIME_DIGEST_EXCLUSION_HOURS,
} from "../constants/schedulerConstants";

// ─── Types ──────────────────────────────────────────────────────────

type DigestFrequency = "daily" | "weekly";

interface UserSettings {
  digestEnabled: boolean;
  digestFrequency: DigestFrequency;
  digestTime: string; // HH:MM
  digestWeeklyDay: number; // 0-6, 0 = Sunday
  realtimeEnabled: boolean;
  lastDigestSentAt: Date | null;
  lastRealtimeSentAt: Date | null;
}

// ─── Helpers ────────────────────────────────────────────────────────

function parseSettings(
  row: typeof notificationEmailSettings.$inferSelect | undefined,
): UserSettings {
  return {
    digestEnabled: row?.digestEnabled ?? true,
    digestFrequency: (row?.digestFrequency ?? "daily") as DigestFrequency,
    digestTime: row?.digestTime ?? "08:00",
    digestWeeklyDay: row?.digestWeeklyDay ?? 1,
    realtimeEnabled: row?.realtimeEnabled ?? true,
    lastDigestSentAt: row?.lastDigestSentAt
      ? new Date(row.lastDigestSentAt)
      : null,
    lastRealtimeSentAt: row?.lastRealtimeSentAt
      ? new Date(row.lastRealtimeSentAt)
      : null,
  };
}

/**
 * Returns true if the current time has reached or passed `dailyTime` today.
 */
export function hasTimePassedToday(dailyTime: string, now: Date): boolean {
  const [hours, minutes] = dailyTime.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = hours * 60 + minutes;
  return currentMinutes >= targetMinutes;
}

async function upsertSettings(
  userId: string,
  updates: Partial<{
    lastDigestSentAt: string;
    lastRealtimeSentAt: string;
  }>,
  now: Date,
): Promise<void> {
  const nowStr = now.toISOString();
  const existing = await db.query.notificationEmailSettings.findFirst({
    where: eq(notificationEmailSettings.userId, userId),
  });

  if (existing) {
    await db
      .update(notificationEmailSettings)
      .set({ ...updates, updatedAt: nowStr })
      .where(eq(notificationEmailSettings.userId, userId));
  } else {
    await db.insert(notificationEmailSettings).values({
      id: uuidv4(),
      userId,
      ...updates,
      updatedAt: nowStr,
    });
  }
}

async function logEmailedNotifications(
  userId: string,
  notificationIds: string[],
  emailType: "digest" | "realtime",
  now: Date,
): Promise<void> {
  if (notificationIds.length === 0) return;
  const nowStr = now.toISOString();
  await db.insert(emailNotificationLog).values(
    notificationIds.map((nId) => ({
      id: uuidv4(),
      userId,
      notificationId: nId,
      emailType,
      sentAt: nowStr,
    })),
  );
}

/**
 * Returns IDs of notifications already sent via realtime email within
 * the exclusion window, so they can be excluded from the digest.
 */
async function getRecentlyEmailedNotificationIds(
  userId: string,
  sinceHours: number,
  now: Date,
): Promise<Set<string>> {
  const since = new Date(
    now.getTime() - sinceHours * 60 * 60 * 1000,
  ).toISOString();

  const rows = await db.query.emailNotificationLog.findMany({
    where: and(
      eq(emailNotificationLog.userId, userId),
      eq(emailNotificationLog.emailType, "realtime"),
    ),
  });

  // Filter in JS since SQLite text comparison works with ISO strings
  const recentIds = new Set<string>();
  for (const r of rows) {
    if (r.sentAt >= since) {
      recentIds.add(r.notificationId);
    }
  }
  return recentIds;
}

// ─── Activity Summary ───────────────────────────────────────────────

async function computeActivitySummary(
  userId: string,
  since: Date,
): Promise<ActivitySummary> {
  const allNotifications = await db.query.notifications.findMany({
    where: eq(notifications.userId, userId),
  });

  // Filter notifications created since the given date
  const recent = allNotifications.filter(
    (n) => new Date(n.createdAt) >= since,
  );

  return {
    newRelations: recent.filter(
      (n) => n.type === "relation_accepted" || n.type === "relation_request",
    ).length,
    newCommonLimits: recent.filter((n) => n.type === "new_common_limit").length,
    limitsRemoved: recent.filter((n) => n.type === "limit_removed").length,
    pendingRequests: recent.filter(
      (n) =>
        n.type === "category_change_request" ||
        n.type === "relation_request",
    ).filter((n) => !n.isRead).length,
  };
}

// ─── Realtime Email Processor ────────────────────────────────────────

/**
 * Processes realtime notification emails for all eligible users.
 * A notification is eligible if:
 * 1. User has realtimeEnabled = true
 * 2. Notification is unread and older than REALTIME_BUFFER_MINUTES
 * 3. Notification hasn't already been sent by email (not in emailNotificationLog)
 * 4. At least REALTIME_MIN_INTERVAL_HOURS since last realtime email
 */
export async function processRealtimeEmails(): Promise<{ emailsSent: number }> {
  const now = new Date();
  let emailsSent = 0;

  const allUsers = await db.query.users.findMany();

  for (const user of allUsers) {
    try {
      const settingsRow = await db.query.notificationEmailSettings.findFirst({
        where: eq(notificationEmailSettings.userId, user.id),
      });
      const settings = parseSettings(settingsRow);

      if (!settings.realtimeEnabled) continue;

      // Check minimum interval
      const minIntervalAgo = new Date(
        now.getTime() - REALTIME_MIN_INTERVAL_HOURS * 60 * 60 * 1000,
      );
      if (
        settings.lastRealtimeSentAt &&
        settings.lastRealtimeSentAt >= minIntervalAgo
      ) {
        continue;
      }

      // Find unread notifications older than the buffer window
      const bufferCutoff = new Date(
        now.getTime() - REALTIME_BUFFER_MINUTES * 60 * 1000,
      );

      const unreadNotifications = await db.query.notifications.findMany({
        where: and(
          eq(notifications.userId, user.id),
          eq(notifications.isRead, false),
        ),
        orderBy: (tbl, { desc }) => [desc(tbl.createdAt)],
      });

      // Notifications that have "settled" past the buffer window
      const eligibleNotifications = unreadNotifications.filter(
        (n) => new Date(n.createdAt) <= bufferCutoff,
      );

      if (eligibleNotifications.length === 0) continue;

      // Exclude already-emailed notifications
      const alreadyEmailed = await getRecentlyEmailedNotificationIds(
        user.id,
        REALTIME_DIGEST_EXCLUSION_HOURS,
        now,
      );
      const newNotifications = eligibleNotifications.filter(
        (n) => !alreadyEmailed.has(n.id),
      );

      if (newNotifications.length === 0) continue;

      const sorted = sortByPriority(newNotifications);

      await emailService.sendRealtimeNotification({
        to: user.email,
        displayName: user.displayName,
        notifications: sorted.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          createdAt: n.createdAt,
        })),
      });

      await logEmailedNotifications(
        user.id,
        sorted.map((n) => n.id),
        "realtime",
        now,
      );
      await upsertSettings(
        user.id,
        { lastRealtimeSentAt: now.toISOString() },
        now,
      );
      emailsSent++;
      console.log(
        `[NotificationScheduler] Realtime email sent to ${user.email} (${sorted.length} notifications)`,
      );
    } catch (err) {
      console.error(
        `[NotificationScheduler] Realtime error for user ${user.id}:`,
        err,
      );
    }
  }

  return { emailsSent };
}

// ─── Digest Email Processor ──────────────────────────────────────────

/**
 * Processes digest emails for all eligible users.
 * Sends daily or weekly summaries according to each user's preferences.
 */
export async function processDigestEmails(): Promise<{ emailsSent: number }> {
  const now = new Date();
  let emailsSent = 0;

  const allUsers = await db.query.users.findMany();

  for (const user of allUsers) {
    try {
      const settingsRow = await db.query.notificationEmailSettings.findFirst({
        where: eq(notificationEmailSettings.userId, user.id),
      });
      const settings = parseSettings(settingsRow);

      if (!settings.digestEnabled) continue;

      const { digestFrequency, digestTime, digestWeeklyDay, lastDigestSentAt } =
        settings;

      // Check minimum interval (prevents duplicate sends)
      const minIntervalAgo = new Date(
        now.getTime() - DIGEST_MIN_INTERVAL_HOURS * 60 * 60 * 1000,
      );

      let shouldSend = false;

      if (digestFrequency === "daily") {
        shouldSend =
          hasTimePassedToday(digestTime, now) &&
          (!lastDigestSentAt || lastDigestSentAt < minIntervalAgo);
      } else if (digestFrequency === "weekly") {
        const currentDay = now.getDay();
        shouldSend =
          currentDay === digestWeeklyDay &&
          hasTimePassedToday(digestTime, now) &&
          (!lastDigestSentAt || lastDigestSentAt < minIntervalAgo);
      }

      if (!shouldSend) continue;

      // Fetch unread notifications
      const unreadNotifications = await db.query.notifications.findMany({
        where: and(
          eq(notifications.userId, user.id),
          eq(notifications.isRead, false),
        ),
        orderBy: (tbl, { desc }) => [desc(tbl.createdAt)],
      });

      if (unreadNotifications.length === 0) continue;

      // Exclude notifications recently sent via realtime email
      const recentlyEmailed = await getRecentlyEmailedNotificationIds(
        user.id,
        REALTIME_DIGEST_EXCLUSION_HOURS,
        now,
      );
      const digestNotifications = unreadNotifications.filter(
        (n) => !recentlyEmailed.has(n.id),
      );

      if (digestNotifications.length === 0) continue;

      // Compute activity summary for the period
      const periodDays = digestFrequency === "weekly" ? 7 : 1;
      const periodStart = new Date(
        now.getTime() - periodDays * 24 * 60 * 60 * 1000,
      );
      const activitySummary = await computeActivitySummary(
        user.id,
        periodStart,
      );

      const sorted = sortByPriority(digestNotifications);

      await emailService.sendNotificationDigest({
        to: user.email,
        displayName: user.displayName,
        notifications: sorted.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          type: n.type,
          createdAt: n.createdAt,
        })),
        activitySummary,
      });

      await logEmailedNotifications(
        user.id,
        sorted.map((n) => n.id),
        "digest",
        now,
      );
      await upsertSettings(
        user.id,
        { lastDigestSentAt: now.toISOString() },
        now,
      );
      emailsSent++;
      console.log(
        `[NotificationScheduler] Digest sent to ${user.email} (${sorted.length} notifications, frequency: ${digestFrequency})`,
      );
    } catch (err) {
      console.error(
        `[NotificationScheduler] Digest error for user ${user.id}:`,
        err,
      );
    }
  }

  return { emailsSent };
}

// ─── Trigger (external caller) ───────────────────────────────────────

let isProcessing = false;

/**
 * Triggers a single notification email processing run (both realtime and digest).
 *
 * Called by `POST /api/scheduler/trigger-emails` on every external cron
 * invocation. Each processor decides independently whether users have
 * pending emails based on their settings and last-sent timestamps.
 *
 * If a run is already in progress, returns immediately with
 * `alreadyRunning: true` without starting a second run.
 */
export async function triggerNotificationEmails(): Promise<{
  alreadyRunning: boolean;
  realtimeEmailsSent?: number;
  digestEmailsSent?: number;
}> {
  if (isProcessing) {
    return { alreadyRunning: true };
  }

  isProcessing = true;
  try {
    const [realtime, digest] = await Promise.all([
      processRealtimeEmails(),
      processDigestEmails(),
    ]);
    return {
      alreadyRunning: false,
      realtimeEmailsSent: realtime.emailsSent,
      digestEmailsSent: digest.emailsSent,
    };
  } finally {
    isProcessing = false;
  }
}
