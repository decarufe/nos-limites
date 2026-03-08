/**
 * Classifies notification types for the email system.
 *
 * All in-app notification types are eligible for both realtime and digest
 * emails, but each type has a priority that affects ordering in templates.
 */

// ─── Notification types ─────────────────────────────────────────────

/** All known notification types created by the application. */
export type NotificationType =
  | "relation_request"
  | "relation_accepted"
  | "new_common_limit"
  | "limit_removed"
  | "relation_deleted"
  | "category_change_request"
  | "category_change_accepted"
  | "category_change_declined";

/**
 * Priority levels for notification emails.
 * - "high": actionable events that require user attention (requests, deletions)
 * - "normal": informational events (acceptances, new common limits)
 */
export type NotificationPriority = "high" | "normal";

// ─── Priority mapping ───────────────────────────────────────────────

const PRIORITY_MAP: Record<NotificationType, NotificationPriority> = {
  relation_request: "high",
  category_change_request: "high",
  relation_deleted: "high",
  limit_removed: "normal",
  relation_accepted: "normal",
  category_change_accepted: "normal",
  category_change_declined: "normal",
  new_common_limit: "normal",
};

// ─── Public API ─────────────────────────────────────────────────────

/** Returns the priority of a notification type for email ordering. */
export function getNotificationPriority(
  type: string,
): NotificationPriority {
  return PRIORITY_MAP[type as NotificationType] ?? "normal";
}

/**
 * Sorts notifications by priority (high first), then by createdAt descending.
 * Returns a new array — does not mutate the input.
 */
export function sortByPriority<T extends { type: string; createdAt: string }>(
  items: T[],
): T[] {
  return [...items].sort((a, b) => {
    const pa = getNotificationPriority(a.type) === "high" ? 0 : 1;
    const pb = getNotificationPriority(b.type) === "high" ? 0 : 1;
    if (pa !== pb) return pa - pb;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}
