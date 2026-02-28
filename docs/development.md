# Development Guide — Nos limites

## Prerequisites

| Requirement | Version | Notes |
|-------------|---------|-------|
| Node.js | **18 or later** | Check with `node --version` |
| npm | **8 or later** | Bundled with Node.js |
| Git | Any recent version | For cloning the repository |

No database server is needed for local development — the app uses a local SQLite file automatically.

---

## Quick Start

The fastest way to get running is the `init.sh` script at the project root:

```bash
./init.sh
```

This script:
1. Installs dependencies for both `server/` and `client/`
2. Copies `server/.env.example` to `server/.env` if no `.env` exists
3. Runs database migrations (`db:migrate`)
4. Seeds the limit categories (`db:seed`)
5. Prints the URLs to access the app

After the script completes, start both servers (each in its own terminal):

```bash
# Terminal 1 — backend
cd server && npm run dev

# Terminal 2 — frontend
cd client && npm run dev
```

Then open **http://localhost:5173** in your browser.

---

## Manual Setup

If you prefer to set up each part individually:

### 1. Backend

```bash
cd server

# Install dependencies
npm install

# Copy the example environment file
cp .env.example .env
# Edit .env with your preferred settings (see Environment Variables below)

# Run database migrations (creates tables)
npm run db:migrate

# Seed limit categories
npm run db:seed

# Start the development server (with hot reload)
npm run dev
```

The API server starts on **http://localhost:3001**.

### 2. Frontend

```bash
cd client

# Install dependencies
npm install

# Start the Vite development server
npm run dev
```

The frontend starts on **http://localhost:5173**. All `/api/*` requests are automatically proxied to `localhost:3001`.

---

## Environment Variables

All configuration lives in `server/.env`. Copy `server/.env.example` as a starting point.

### Core Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Express server port |
| `NODE_ENV` | `development` | `development` or `production` |

### Database

| Variable | Default | Description |
|----------|---------|-------------|
| `DATABASE_URL` | `file:./data/noslimites.db` | Local SQLite file path. In production, use `TURSO_DATABASE_URL` instead. |

### JWT / Sessions

| Variable | Example | Description |
|----------|---------|-------------|
| `JWT_SECRET` | `dev-secret-…` | Secret for signing access tokens. **Change in production.** |
| `JWT_REFRESH_SECRET` | `dev-refresh-…` | Secret for signing refresh tokens. **Change in production.** |
| `SESSION_DURATION` | `30d` | Access token lifetime (e.g. `15m`, `1h`, `7d`) |

### Magic Links

| Variable | Default | Description |
|----------|---------|-------------|
| `MAGIC_LINK_EXPIRY` | `15m` | How long a magic link remains valid |
| `MAGIC_LINK_BASE_URL` | `http://localhost:5173` | Base URL prepended to the verification path in the email link |

### Email

| Variable | Default | Description |
|----------|---------|-------------|
| `EMAIL_PROVIDER` | `console` | `console` (dev) or `resend` (production) |
| `RESEND_API_KEY` | *(empty)* | Required when `EMAIL_PROVIDER=resend`. Get from [resend.com](https://resend.com). |
| `EMAIL_FROM` | `Nos limites <noreply@noslimites.app>` | Sender address shown in the magic link email |

> **Development tip — no email server needed**: When `EMAIL_PROVIDER=console`, magic links are printed directly to the server console output instead of being emailed. Look for a line like:
>
> ```
> [MAGIC LINK] http://localhost:5173/auth/verify?token=abc123...
> ```
>
> Copy and open that URL in your browser to log in.

### Google OAuth (optional)

| Variable | Example | Description |
|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | `123….apps.googleusercontent.com` | From [Google Cloud Console](https://console.cloud.google.com/apis/credentials) |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-…` | From Google Cloud Console |
| `GOOGLE_CALLBACK_URL` | `http://localhost:3001/api/auth/google/callback` | Must match the redirect URI registered in Google Cloud |

Leave `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` empty to disable Google OAuth entirely.

### Facebook OAuth (stub — optional)

| Variable | Description |
|----------|-------------|
| `FACEBOOK_APP_ID` | From [Meta for Developers](https://developers.facebook.com/apps) |
| `FACEBOOK_APP_SECRET` | From Meta for Developers |

> Facebook OAuth is implemented as a stub. Leaving these empty disables the Facebook option.

### CORS

| Variable | Default | Description |
|----------|---------|-------------|
| `FRONTEND_URL` | `http://localhost:5173` | Allowed origin for CORS. Must exactly match the frontend URL. |

---

## Dev URLs

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| Health check | http://localhost:3001/api/health |

---

## npm Scripts

### Server (`cd server`)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `tsx watch src/index.ts` | Start server with live reload |
| `build` | `tsc` | Compile TypeScript to `dist/` |
| `start` | `node dist/index.js` | Run compiled output (production) |
| `test` | `tsx --test tests/…` | Run all server tests |
| `db:migrate` | `tsx src/db/migrate.ts` | Apply schema migrations |
| `db:seed` | `tsx src/db/seed.ts` | Seed limit categories |

### Client (`cd client`)

| Script | Command | Description |
|--------|---------|-------------|
| `dev` | `vite` | Start Vite dev server |
| `build` | `tsc -b && vite build` | Type-check and build to `dist/` |
| `preview` | `vite preview` | Preview the production build locally |
| `test:deployment` | `node --test tests/vercel-spa-rewrite.test.mjs` | Validate Vercel SPA routing config |

---

## Testing

### Server tests

```bash
cd server
npm test
```

Runs three test suites using Node.js's built-in test runner (`tsx --test`):

| Suite | File | What it covers |
|-------|------|----------------|
| CORS config | `tests/cors-config.test.ts` | Validates allowed-origin logic |
| Frontend base URL | `tests/frontend-base-url.test.ts` | Validates URL construction helpers |
| Device service | `tests/device-service.test.ts` | Refresh token hashing and device management |

Tests use an in-memory SQLite database (`better-sqlite3` in devDependencies) — no connection to Turso required.

### Client deployment test

```bash
cd client
npm run test:deployment
```

Validates that `client/vercel.json` correctly rewrites all paths to `index.html` for SPA routing.

---

## Database Tooling

### Drizzle Kit Studio (visual DB inspector)

```bash
cd server

# Local database
npx drizzle-kit studio

# Remote Turso database
TURSO_DATABASE_URL=libsql://… TURSO_AUTH_TOKEN=… npx drizzle-kit studio
```

Opens a web-based schema and data browser at `http://local.drizzle.studio`.

### Manual migration / seed

```bash
cd server

# Run migrations only
npm run db:migrate

# Seed data only (idempotent)
npm run db:seed
```

See [turso-setup.md](./turso-setup.md) for running migrations against the production Turso database.

---

## Project Conventions

- **TypeScript strict mode** is enabled on both client and server.
- **No mock data in code** — all data must be read from and written to the real database.
- All user-facing text in the UI is written in **French**.
- API error messages use English (for developer tooling); UI messages use French.
- The Vite dev proxy (`/api → localhost:3001`) means the frontend never needs to know the backend port during development.
