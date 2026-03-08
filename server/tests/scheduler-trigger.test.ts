import test from "node:test";
import assert from "node:assert/strict";
import { SCHEDULER_TRIGGER_RATE_LIMIT_MS as RATE_LIMIT_MS } from "../src/constants/schedulerConstants";

function makeRateLimiter() {
  let lastTriggerTime: number | null = null;

  function tryAcquire(now: number): { allowed: boolean; retryAfterMs?: number } {
    if (lastTriggerTime !== null && now - lastTriggerTime < RATE_LIMIT_MS) {
      return { allowed: false, retryAfterMs: RATE_LIMIT_MS - (now - lastTriggerTime) };
    }
    lastTriggerTime = now;
    return { allowed: true };
  }

  function reset() {
    lastTriggerTime = null;
  }

  return { tryAcquire, reset };
}

// ─── Simulate the mutex logic from triggerNotificationEmails ─────────────────

function makeTrigger() {
  let isProcessing = false;
  let callCount = 0;

  async function trigger(): Promise<{ alreadyRunning: boolean }> {
    if (isProcessing) return { alreadyRunning: true };
    isProcessing = true;
    try {
      callCount++;
      // Simulate async work
      await Promise.resolve();
      return { alreadyRunning: false };
    } finally {
      isProcessing = false;
    }
  }

  async function triggerSlow(durationMs: number): Promise<{ alreadyRunning: boolean }> {
    if (isProcessing) return { alreadyRunning: true };
    isProcessing = true;
    callCount++;
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          resolve({ alreadyRunning: false });
        } finally {
          isProcessing = false;
        }
      }, durationMs);
    });
  }

  return { trigger, triggerSlow, getCallCount: () => callCount, getIsProcessing: () => isProcessing };
}

// ─── Rate limiter tests ───────────────────────────────────────────────────────

test("rate limiter: first call is always allowed", () => {
  const rl = makeRateLimiter();
  const result = rl.tryAcquire(Date.now());
  assert.equal(result.allowed, true);
  assert.equal(result.retryAfterMs, undefined);
});

test("rate limiter: second call within 10 s is rejected", () => {
  const rl = makeRateLimiter();
  const t = 1_000_000;
  rl.tryAcquire(t);
  const result = rl.tryAcquire(t + 5_000); // 5 s later
  assert.equal(result.allowed, false);
  assert.ok(result.retryAfterMs !== undefined && result.retryAfterMs > 0);
});

test("rate limiter: call exactly at 10 s boundary is allowed", () => {
  const rl = makeRateLimiter();
  const t = 1_000_000;
  rl.tryAcquire(t);
  const result = rl.tryAcquire(t + RATE_LIMIT_MS); // exactly 10 s later
  assert.equal(result.allowed, true);
});

test("rate limiter: call after 10 s is allowed", () => {
  const rl = makeRateLimiter();
  const t = 1_000_000;
  rl.tryAcquire(t);
  const result = rl.tryAcquire(t + RATE_LIMIT_MS + 1); // 10 s + 1 ms later
  assert.equal(result.allowed, true);
});

test("rate limiter: retryAfterMs is positive and ≤ RATE_LIMIT_MS when rejected", () => {
  const rl = makeRateLimiter();
  const t = 1_000_000;
  rl.tryAcquire(t);
  const result = rl.tryAcquire(t + 1_000); // 1 s later
  assert.equal(result.allowed, false);
  assert.ok(result.retryAfterMs !== undefined);
  assert.ok(result.retryAfterMs > 0);
  assert.ok(result.retryAfterMs <= RATE_LIMIT_MS);
});

test("rate limiter: reset allows next call immediately", () => {
  const rl = makeRateLimiter();
  const t = 1_000_000;
  rl.tryAcquire(t);
  rl.reset();
  const result = rl.tryAcquire(t + 1_000);
  assert.equal(result.allowed, true);
});

// ─── Mutex / alreadyRunning tests ────────────────────────────────────────────

test("trigger: returns alreadyRunning=false on first call", async () => {
  const trig = makeTrigger();
  const result = await trig.trigger();
  assert.equal(result.alreadyRunning, false);
});

test("trigger: increments call count when not running", async () => {
  const trig = makeTrigger();
  await trig.trigger();
  assert.equal(trig.getCallCount(), 1);
});

test("trigger: returns alreadyRunning=true when a run is in progress", async () => {
  const trig = makeTrigger();

  // Start a slow run without awaiting
  const slowRun = trig.triggerSlow(50);

  // While the slow run is in progress, fire a second trigger
  const secondResult = await trig.trigger();
  assert.equal(secondResult.alreadyRunning, true);

  // The slow run should still complete normally
  const slowResult = await slowRun;
  assert.equal(slowResult.alreadyRunning, false);
});

test("trigger: after a run completes, another run can start", async () => {
  const trig = makeTrigger();
  await trig.trigger(); // first run completes
  const result = await trig.trigger(); // second run should start
  assert.equal(result.alreadyRunning, false);
  assert.equal(trig.getCallCount(), 2);
});

test("trigger: isProcessing is false after run completes", async () => {
  const trig = makeTrigger();
  await trig.trigger();
  assert.equal(trig.getIsProcessing(), false);
});
