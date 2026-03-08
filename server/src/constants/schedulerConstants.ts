/** Minimum milliseconds between successive trigger-emails calls. */
export const SCHEDULER_TRIGGER_RATE_LIMIT_MS = 10_000;

/**
 * Minimum hours between realtime notification emails for a single user.
 * Prevents email fatigue while still delivering timely alerts.
 */
export const REALTIME_MIN_INTERVAL_HOURS = 1;

/**
 * Buffer in minutes before a notification becomes eligible for realtime email.
 * Groups rapid successive events (e.g., partner checking multiple limits)
 * into a single email instead of sending one per event.
 */
export const REALTIME_BUFFER_MINUTES = 15;

/**
 * Minimum hours between digest emails for a single user.
 * 20 hours prevents duplicate sends across timezone boundaries
 * while still allowing daily delivery.
 */
export const DIGEST_MIN_INTERVAL_HOURS = 20;

/**
 * Hours within which a notification emailed via realtime is excluded
 * from the next digest, to avoid redundant content.
 */
export const REALTIME_DIGEST_EXCLUSION_HOURS = 24;
