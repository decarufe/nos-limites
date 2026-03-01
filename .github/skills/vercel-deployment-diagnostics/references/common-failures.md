# Common failure matrix

Use this matrix to pick fast, low-risk fixes.

## Build fails before artifact creation

### Symptom

- Build logs fail during install, compile, or framework build step.

### Typical causes

- Wrong `Root Directory`
- Wrong framework preset
- Wrong build command/output directory
- Missing env var required at build time
- Node version mismatch

### Checks

1. Verify project `Root Directory` matches repo layout.
2. Verify framework preset (Vite/Next.js/etc.) is correct.
3. Verify build command and output directory.
4. Verify required env vars exist for the target environment.
5. Compare Node.js version used locally vs Vercel project settings.

### Fixes

- Correct project settings and redeploy.
- Add missing env vars to `Production` and/or `Preview`.
- Pin Node version consistently.

## Deployment succeeds but runtime returns 500

### Symptom

- Deployment is `Ready`, but routes or APIs return `500`.

### Typical causes

- Missing runtime env var
- Serverless function crash
- Unsupported Node/Edge API
- External dependency outage or bad credentials

### Checks

1. Inspect function logs for stack traces.
2. Confirm env vars are present in the active environment.
3. Confirm runtime target (`Edge` vs `Node`) matches code requirements.
4. Test health endpoint and one critical API path.

### Fixes

- Add/fix runtime env vars and redeploy.
- Switch function runtime if APIs are unsupported.
- Guard null/undefined config paths causing crash at startup.

## 404 on valid routes/assets

### Symptom

- Existing pages or static assets return 404 after deploy.

### Typical causes

- Wrong output directory
- Missing rewrites/redirects for SPA
- Monorepo path misconfiguration

### Checks

1. Confirm output directory is generated and uploaded.
2. Validate rewrite rules for SPA fallback.
3. Verify base path/public path settings.

### Fixes

- Set correct output directory.
- Add/repair rewrite rule to index entrypoint for SPA routing.
- Align asset base path with deployment URL.

## Auth callback/login fails only on production

### Symptom

- OAuth or magic link callback fails on production domain.

### Typical causes

- Callback URL mismatch
- Secure cookie domain/sameSite mismatch
- Missing production env vars for auth provider

### Checks

1. Confirm provider callback URL exactly matches production domain and path.
2. Confirm cookie settings are production-safe.
3. Confirm provider keys/secrets are set in production scope.

### Fixes

- Correct callback URLs in provider and app settings.
- Fix cookie domain/sameSite/secure options.
- Sync auth env vars to production.

## Custom domain or TLS issue

### Symptom

- Domain not resolving, invalid cert, or intermittent SSL errors.

### Typical causes

- DNS records not pointing to Vercel
- DNS propagation delay
- Conflicting DNS records

### Checks

1. Verify domain status in Vercel domain settings.
2. Verify required DNS records in registrar/DNS provider.
3. Check for conflicting A/CNAME records.

### Fixes

- Correct DNS records and wait for propagation.
- Remove conflicting records.
- Re-run domain verification in Vercel.

## Rollback criteria

Rollback to last known good deployment when:

- Incident is production-facing and blocking core user journeys.
- Two targeted fix attempts fail.
- Root cause remains uncertain with rising user impact.

After rollback, open a follow-up task for permanent fix with evidence from logs and config diff.
