---
name: vercel-deployment-diagnostics
description: Diagnose and fix failed or unhealthy Vercel deployments for frontend or full-stack web apps. Use when deployment builds fail, runtime/serverless errors appear, environment variables are misconfigured, routes return 4xx/5xx after deploy, domains fail, or the user asks to investigate issues in the Vercel dashboard/website and restore a healthy production deployment.
---

# Vercel Deployment Diagnostics

Execute this workflow to restore a broken deployment quickly and safely.

## 1) Triage and scope

1. Identify target project, environment (`Production`/`Preview`), and failing URL.
2. Capture the exact symptom:
   - Build failure
   - Runtime/serverless function failure
   - Asset/route 404
   - Auth redirect/callback failure
   - Domain/TLS/DNS issue
   - Performance/timeouts
3. Record when the issue started and the last known good deployment.
4. Confirm whether the incident is user-facing now or limited to preview.

## 2) Inspect Vercel state

Prefer direct UI validation through browser automation when website interaction is requested.

- Use the `playwright-cli` skill to:
  1. Open Vercel dashboard
  2. Navigate to the affected project
  3. Open the most recent failed deployment
  4. Collect build logs, function logs, and deployment metadata
  5. Check project settings (environment variables, framework preset, root directory, build/output commands)

When performing browser steps, save evidence (screenshots/log snippets) before changing configuration.

## 3) Classify root cause

Map the failure to one primary class:

- Build/config mismatch (wrong framework, wrong root directory, bad build command)
- Missing/incorrect environment variable
- Runtime incompatibility (Node version, edge vs node runtime, unsupported APIs)
- Serverless limits (timeout, payload, memory)
- Routing/rewrites/headers misconfiguration
- Bad release artifact (regression in recent commit)
- Domain or DNS misconfiguration

Use [Common failure matrix](references/common-failures.md) to choose the smallest safe fix.

## 4) Apply minimal fix

1. Prefer the narrowest reversible change.
2. If config-related, update Vercel project settings first.
3. If code-related, apply minimal repository patch and redeploy.
4. If uncertain between two hypotheses, test one change at a time.
5. Avoid bundling unrelated refactors during incident recovery.

## 5) Validate recovery

1. Trigger redeploy from the corrected commit or settings.
2. Confirm deployment status is `Ready`.
3. Smoke-test critical paths:
   - Landing page loads
   - API health endpoint returns success
   - Authentication callback/login path works
   - Core user action succeeds
4. Verify no new 4xx/5xx spikes in logs.
5. Re-test custom domain if applicable.

## 6) Document outcome

Summarize:

- Root cause
- Fix applied
- Verification performed
- Remaining risk or follow-up hardening task

If recovery fails after two focused attempts, escalate by proposing rollback to last known good deployment and a separate deep-dive investigation.

## Operational rules

- Preserve user data and secrets; never expose secret values in outputs.
- Do not claim success without log evidence and smoke tests.
- Keep changes tightly scoped to restoring service.
- Prefer deterministic checks over assumptions.
