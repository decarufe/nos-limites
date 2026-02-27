# Turso Database Setup — Nos limites

## Overview

The app uses **Turso** (hosted libSQL) as its production database. Locally, the same `@libsql/client` driver connects to a local SQLite file, so no Turso account is needed for development.

## Local Development

No configuration needed. The server will automatically create and use `server/data/noslimites.db` as a local SQLite file.

```bash
cd server
npm install
npm run dev
```

## Production Setup (Turso + Vercel)

### 1. Create a Turso Account & Database

```bash
# Install the Turso CLI
# macOS / Linux
curl -sSfL https://get.tur.so/install.sh | bash

# Windows (via scoop)
scoop install turso

# Login
turso auth login

# Create a database
turso db create nos-limites

# Get the database URL
turso db show nos-limites --url
# → libsql://nos-limites-<your-org>.turso.io

# Create an auth token
turso db tokens create nos-limites
# → eyJhbGci... (save this token securely)
```

### 2. Configure Environment Variables on Vercel

Go to the **Vercel dashboard** → your **nos-limites-api** project → **Settings** → **Environment Variables**.

Add these two variables for **Production** (and optionally Preview/Development):

| Variable              | Value                                          |
| --------------------- | ---------------------------------------------- |
| `TURSO_DATABASE_URL`  | `libsql://nos-limites-<your-org>.turso.io`     |
| `TURSO_AUTH_TOKEN`    | `eyJhbGci...` (the token from step 1)          |

### 3. Deploy

Push your code or trigger a redeploy. The server will automatically:
1. Connect to Turso using the environment variables
2. Run migrations (CREATE TABLE IF NOT EXISTS)
3. Seed the limit categories if the database is empty

### 4. Verify

```bash
curl https://nos-limites-api.vercel.app/api/health
# Should return: {"status":"ok","database":"connected","tables":11,...}
```

## Run Migrations Manually

Migrations run automatically on server start. To run them manually:

```bash
# Against local DB
cd server
npx tsx src/db/migrate.ts

# Against Turso (set env vars first)
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npx tsx src/db/migrate.ts
```

## Seed Data Manually

```bash
# Against local DB
cd server
npx tsx src/db/seed.ts

# Against Turso
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npx tsx src/db/seed.ts
```

## Drizzle Kit (Schema Inspection / Studio)

```bash
cd server

# Local
npx drizzle-kit studio

# Against Turso (set env vars in .env or inline)
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npx drizzle-kit studio
```

## Turso Dashboard

You can also inspect and query your database from the web:
- https://app.turso.tech/ → select your database → **Shell** tab

## Architecture Summary

| Environment   | Database                           | Connection                   |
| ------------- | ---------------------------------- | ---------------------------- |
| Local dev     | `server/data/noslimites.db` (file) | `file:./data/noslimites.db`  |
| Vercel prod   | Turso hosted libSQL                | `libsql://...turso.io`       |
| Tests         | In-memory (better-sqlite3)         | `:memory:` (devDependency)   |

## Files Changed in Migration

| File                          | Change                                               |
| ----------------------------- | ---------------------------------------------------- |
| `server/package.json`         | `better-sqlite3` → `@libsql/client` (prod dep)       |
| `server/src/db/connection.ts` | Rewrote to use `createClient()` from `@libsql/client` |
| `server/src/db/migrate.ts`    | `sqlite.exec()` → `client.batch()` (async)           |
| `server/src/db/seed.ts`       | Prepared statements → `client.batch()` (async)       |
| `server/src/db/init.ts`       | Sync → async initialization with shared promise      |
| `server/src/db/verify-schema.ts` | Sync → async libSQL client calls                  |
| `server/src/db/test-persistence.ts` | Sync → async libSQL client calls              |
| `server/src/routes/health.ts` | Uses `client.execute()` instead of `sqlite.prepare()` |
| `server/src/routes/limits.ts` | Added `await` to all Drizzle queries                 |
| `server/src/index.ts`         | Async DB init middleware + async listen callback     |
| `server/drizzle.config.ts`    | `dialect: "sqlite"` → `"turso"` with env var support |
