# Nos Limites — Workspace Guidelines

## Architecture

TypeScript monorepo: **client/** (React/Vite SPA), **server/** (Express API), **landing/** (Astro static site).

- DB: SQLite via `better-sqlite3` + Drizzle ORM. Schema in `server/src/db/schema.ts`. Auto-migrates and seeds on server start.
- Auth: Magic link (email) + Google/Facebook OAuth. JWT sessions.
- Hosting: Vercel (separate projects for client, server, landing).

## Build & Test

### Install

```sh
npm --prefix server install
npm --prefix client install
npm --prefix landing install
```

### Build

```sh
npm --prefix server run build    # tsc → dist/
npm --prefix client run build    # tsc + vite build
npm --prefix landing run build   # astro build
```

### Dev Servers

```sh
# Backend (port 3001) — auto-reload
npm --prefix server run dev

# Frontend (port 5173) — proxies /api → localhost:3001
npm --prefix client run dev

# Landing (port 4321)
npm --prefix landing run dev
```

### Run Tests

```sh
# Server unit tests (Node built-in test runner via tsx)
npm --prefix server run test:config

# Client deployment config tests
npm --prefix client run test:deployment

# Ad-hoc integration tests (hit live API)
node test-feature-42.mjs
```

**Test framework:** `node:test` + `node:assert/strict` — no vitest/jest. Server tests use `tsx --test` (TypeScript), client tests use `node --test` (ESM .mjs).

## Debugging Playbook

### Quick API check

```sh
# Health endpoint
curl http://localhost:3001/api/health

# Or via PowerShell
Invoke-RestMethod http://localhost:3001/api/health
```

### Common issues

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| CORS errors in browser | `FRONTEND_URL` env missing or wrong | Set `FRONTEND_URL` to client origin (comma-separated for multiple) |
| DB empty after restart on Vercel | `/tmp/` is ephemeral | Expected — auto-seeds on cold start |
| Magic link email not received | `EMAIL_PROVIDER=console` (default) | Set `EMAIL_PROVIDER=resend` + `RESEND_API_KEY` |
| Client routing 404 in prod | Missing SPA rewrite | Check `client/vercel.json` has `/(.*) → /index.html` rewrite |
| JWT errors | Default dev secret in prod | Set `JWT_SECRET` and `JWT_REFRESH_SECRET` env vars |

### Server env defaults (from `.env.example`)

```
PORT=3001
DATABASE_URL=file:./data/noslimites.db
EMAIL_PROVIDER=console
FRONTEND_URL=http://localhost:5173
```

### Database

```sh
# Reset and reseed
npm --prefix server run db:seed

# Schema lives at server/src/db/schema.ts
# Migrations are idempotent CREATE TABLE IF NOT EXISTS in server/src/db/migrate.ts
```

## Key Directories

| Path | Contents |
|------|----------|
| `server/src/routes/` | Express route handlers: auth, profile, relationships, limits, notifications, health |
| `server/src/services/` | Email service (console/Resend) |
| `server/src/db/` | Schema, connection, migration, seed |
| `server/src/middleware/` | Auth middleware, error handling |
| `client/src/pages/` | React pages with co-located CSS Modules |
| `client/src/components/` | Shared components (AppLayout, BottomNav, ProtectedRoute) |
| `client/src/context/` | React context providers (Auth) |
| `landing/src/` | Astro pages, components, i18n (fr/en) |

## Conventions

- All UI text is in **French**.
- CSS Modules for styling (`.module.css` co-located with components).
- REST API, all routes prefixed `/api/`.
- SSE for real-time notifications.
- The Vite dev server proxies `/api` → `localhost:3001` — no `VITE_API_BASE_URL` needed locally.
- Production URLs: frontend `https://nos-limites-app.vercel.app`, API `https://nos-limites-api.vercel.app`.
