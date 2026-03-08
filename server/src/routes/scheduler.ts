import { Router, Request, Response } from "express";
import { triggerNotificationEmails } from "../services/notificationScheduler";
import { SCHEDULER_TRIGGER_RATE_LIMIT_MS } from "../constants/schedulerConstants";

const router = Router();

// ─── Rate limiting ────────────────────────────────────────────────────────────

let lastTriggerTime: number | null = null;

// ─── POST /api/scheduler/trigger-emails ──────────────────────────────────────

/**
 * Public endpoint called by an external scheduler to trigger outgoing
 * notification digest emails.
 *
 * - No authentication required.
 * - Rate-limited to one call per 10 seconds (returns 429 if exceeded).
 * - If an email processing run is already in progress, returns 200 "skipped"
 *   immediately without starting a new run.
 */
router.post(
  "/scheduler/trigger-emails",
  async (_req: Request, res: Response) => {
    const now = Date.now();

    if (lastTriggerTime !== null && now - lastTriggerTime < SCHEDULER_TRIGGER_RATE_LIMIT_MS) {
      const retryAfterMs = SCHEDULER_TRIGGER_RATE_LIMIT_MS - (now - lastTriggerTime);
      res.setHeader("Retry-After", Math.ceil(retryAfterMs / 1000).toString());
      res.status(429).json({
        status: "rate_limited",
        message: "Rate limit exceeded. Please wait before calling again.",
      });
      return;
    }

    lastTriggerTime = now;

    const { alreadyRunning } = await triggerNotificationEmails();

    if (alreadyRunning) {
      res.status(200).json({
        status: "skipped",
        message: "Email processing is already in progress.",
      });
      return;
    }

    res.status(200).json({
      status: "ok",
      message: "Email processing triggered.",
    });
  },
);

export default router;

// ─── Exported for testing ─────────────────────────────────────────────────────

/** Reset the in-module rate-limit state (test use only). */
export function _resetRateLimitForTests(): void {
  lastTriggerTime = null;
}
