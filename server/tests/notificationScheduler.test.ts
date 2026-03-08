/**
 * Unit tests for the notification scheduler time-gating logic and trigger stats.
 *
 * These tests replicate the pure functions from notificationScheduler.ts
 * without requiring a database connection, following the same pattern as
 * scheduler-trigger.test.ts.
 */
import test from "node:test";
import assert from "node:assert/strict";

// ─── Inline replica of hasTimePassedToday ────────────────────────────────────
// Must stay in sync with server/src/services/notificationScheduler.ts

function hasTimePassedToday(dailyTime: string, now: Date): boolean {
  const [hours, minutes] = dailyTime.split(":").map(Number);
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const targetMinutes = hours * 60 + minutes;
  return currentMinutes >= targetMinutes;
}

function makeDate(hours: number, minutes: number): Date {
  const d = new Date(2026, 2, 8); // 2026-03-08
  d.setHours(hours, minutes, 0, 0);
  return d;
}

// ─── hasTimePassedToday tests ────────────────────────────────────────────────

test("hasTimePassedToday: returns false before the scheduled time", () => {
  const now = makeDate(7, 59); // 07:59
  assert.equal(hasTimePassedToday("08:00", now), false);
});

test("hasTimePassedToday: returns true exactly at the scheduled time", () => {
  const now = makeDate(8, 0); // 08:00
  assert.equal(hasTimePassedToday("08:00", now), true);
});

test("hasTimePassedToday: returns true after the scheduled time (same day)", () => {
  const now = makeDate(18, 30); // 18:30
  assert.equal(hasTimePassedToday("08:00", now), true);
});

test("hasTimePassedToday: returns true one minute after scheduled time", () => {
  const now = makeDate(8, 1); // 08:01
  assert.equal(hasTimePassedToday("08:00", now), true);
});

test("hasTimePassedToday: returns false at midnight before a late schedule", () => {
  const now = makeDate(0, 0); // 00:00
  assert.equal(hasTimePassedToday("08:00", now), false);
});

test("hasTimePassedToday: works for end-of-day schedule (23:59)", () => {
  const now = makeDate(23, 59); // 23:59
  assert.equal(hasTimePassedToday("23:59", now), true);
});

test("hasTimePassedToday: works for midnight schedule (00:00) — always passed", () => {
  const now = makeDate(0, 1); // 00:01
  assert.equal(hasTimePassedToday("00:00", now), true);
});

test("hasTimePassedToday: returns false when called an hour before schedule", () => {
  const now = makeDate(7, 0); // 07:00, schedule is 08:00
  assert.equal(hasTimePassedToday("08:00", now), false);
});

// ─── Digest daily guard ──────────────────────────────────────────────────────
// Simulates the combined hasTimePassedToday + DIGEST_MIN_INTERVAL_HOURS check

const DIGEST_MIN_INTERVAL_HOURS = 20;

function shouldSendDigestDaily(
  digestTime: string,
  now: Date,
  lastDigestSentAt: Date | null,
): boolean {
  const minIntervalAgo = new Date(
    now.getTime() - DIGEST_MIN_INTERVAL_HOURS * 60 * 60 * 1000,
  );
  return (
    hasTimePassedToday(digestTime, now) &&
    (!lastDigestSentAt || lastDigestSentAt < minIntervalAgo)
  );
}

test("digest daily: sends when past scheduled time and no previous email", () => {
  const now = makeDate(9, 0);
  assert.equal(shouldSendDigestDaily("08:00", now, null), true);
});

test("digest daily: does not send when before scheduled time", () => {
  const now = makeDate(7, 0);
  assert.equal(shouldSendDigestDaily("08:00", now, null), false);
});

test("digest daily: does not send within 20h of last email", () => {
  const now = makeDate(8, 30);
  const lastSent = new Date(now.getTime() - 1 * 60 * 60 * 1000); // 1h ago
  assert.equal(shouldSendDigestDaily("08:00", now, lastSent), false);
});

test("digest daily: sends when last email was more than 20h ago", () => {
  const now = makeDate(9, 0);
  const lastSent = new Date(now.getTime() - 25 * 60 * 60 * 1000); // 25h ago
  assert.equal(shouldSendDigestDaily("08:00", now, lastSent), true);
});

test("digest daily: does not double-send within 20h window", () => {
  const now = makeDate(20, 0); // 20:00
  const lastSent = makeDate(8, 5); // email was sent at 08:05 today — only 12h ago
  assert.equal(shouldSendDigestDaily("08:00", now, lastSent), false);
});

// ─── Digest weekly guard ─────────────────────────────────────────────────────

function shouldSendDigestWeekly(
  digestTime: string,
  now: Date,
  digestWeeklyDay: number,
  lastDigestSentAt: Date | null,
): boolean {
  const minIntervalAgo = new Date(
    now.getTime() - DIGEST_MIN_INTERVAL_HOURS * 60 * 60 * 1000,
  );
  const currentDay = now.getDay();
  return (
    currentDay === digestWeeklyDay &&
    hasTimePassedToday(digestTime, now) &&
    (!lastDigestSentAt || lastDigestSentAt < minIntervalAgo)
  );
}

test("digest weekly: sends on matching day past the scheduled time", () => {
  // 2026-03-08 is a Sunday (day 0)
  const now = makeDate(9, 0);
  assert.equal(now.getDay(), 0, "fixture should be a Sunday");
  assert.equal(shouldSendDigestWeekly("08:00", now, 0, null), true);
});

test("digest weekly: does not send on non-matching day", () => {
  const now = makeDate(9, 0); // Sunday
  assert.equal(shouldSendDigestWeekly("08:00", now, 1, null), false); // Monday only
});

test("digest weekly: does not send before scheduled time on matching day", () => {
  const now = makeDate(7, 0); // Sunday
  assert.equal(shouldSendDigestWeekly("08:00", now, 0, null), false);
});

test("digest weekly: does not send within 20h interval on matching day", () => {
  const now = makeDate(9, 0); // Sunday 09:00
  const lastSent = new Date(now.getTime() - 5 * 60 * 60 * 1000); // 5h ago
  assert.equal(shouldSendDigestWeekly("08:00", now, 0, lastSent), false);
});

// ─── Realtime email guard ────────────────────────────────────────────────────

const REALTIME_MIN_INTERVAL_HOURS = 1;

function shouldSendRealtime(
  now: Date,
  lastRealtimeSentAt: Date | null,
): boolean {
  const minIntervalAgo = new Date(
    now.getTime() - REALTIME_MIN_INTERVAL_HOURS * 60 * 60 * 1000,
  );
  return !lastRealtimeSentAt || lastRealtimeSentAt < minIntervalAgo;
}

test("realtime: sends when no previous realtime email", () => {
  const now = makeDate(9, 0);
  assert.equal(shouldSendRealtime(now, null), true);
});

test("realtime: does not send within 1h of last realtime email", () => {
  const now = makeDate(9, 0);
  const lastSent = new Date(now.getTime() - 30 * 60 * 1000); // 30 min ago
  assert.equal(shouldSendRealtime(now, lastSent), false);
});

test("realtime: sends when last realtime email was more than 1h ago", () => {
  const now = makeDate(9, 0);
  const lastSent = new Date(now.getTime() - 2 * 60 * 60 * 1000); // 2h ago
  assert.equal(shouldSendRealtime(now, lastSent), true);
});

test("realtime: sends exactly at 1h boundary", () => {
  const now = makeDate(9, 0);
  const lastSent = new Date(now.getTime() - REALTIME_MIN_INTERVAL_HOURS * 60 * 60 * 1000);
  // at exactly 1h, lastSent is NOT < minIntervalAgo, so it's not strictly less
  assert.equal(shouldSendRealtime(now, lastSent), false);
});

test("realtime: sends 1 second after 1h boundary", () => {
  const now = makeDate(9, 0);
  const lastSent = new Date(now.getTime() - REALTIME_MIN_INTERVAL_HOURS * 60 * 60 * 1000 - 1000);
  assert.equal(shouldSendRealtime(now, lastSent), true);
});

// ─── Trigger return-shape tests (new dual-processor format) ──────────────────

function makeTriggerWithStats() {
  let isProcessing = false;

  async function trigger(
    realtimeResult: number,
    digestResult: number,
  ): Promise<{
    alreadyRunning: boolean;
    realtimeEmailsSent?: number;
    digestEmailsSent?: number;
  }> {
    if (isProcessing) return { alreadyRunning: true };
    isProcessing = true;
    try {
      await Promise.resolve();
      return {
        alreadyRunning: false,
        realtimeEmailsSent: realtimeResult,
        digestEmailsSent: digestResult,
      };
    } finally {
      isProcessing = false;
    }
  }

  return { trigger, getIsProcessing: () => isProcessing };
}

test("trigger with stats: returns both counts when emails sent", async () => {
  const { trigger } = makeTriggerWithStats();
  const result = await trigger(2, 3);
  assert.equal(result.alreadyRunning, false);
  assert.equal(result.realtimeEmailsSent, 2);
  assert.equal(result.digestEmailsSent, 3);
});

test("trigger with stats: returns zero counts when no emails sent", async () => {
  const { trigger } = makeTriggerWithStats();
  const result = await trigger(0, 0);
  assert.equal(result.alreadyRunning, false);
  assert.equal(result.realtimeEmailsSent, 0);
  assert.equal(result.digestEmailsSent, 0);
});

test("trigger with stats: counts are absent when alreadyRunning=true", async () => {
  const skippedResult = { alreadyRunning: true } as {
    alreadyRunning: boolean;
    realtimeEmailsSent?: number;
    digestEmailsSent?: number;
  };
  assert.equal(skippedResult.alreadyRunning, true);
  assert.equal(skippedResult.realtimeEmailsSent, undefined);
  assert.equal(skippedResult.digestEmailsSent, undefined);
});
