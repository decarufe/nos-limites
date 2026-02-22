## Testing Commands

**Project Type:** TypeScript monorepo (Vite React client + Express server)
**Test Framework:** Node.js built-in test runner via `tsx --test` (server config checks) + Node test for client deployment config
**Operating System:** Windows

**Run All Tests:**

```
# No single root-level unified command configured yet
```

**Run Specific Test:**

```
# Client deployment regression
npm --prefix client run test:deployment

# Server CORS config regression
npm --prefix server run test:config
```

**Run Tests with Coverage:**

```
# Coverage not configured yet
```

**Additional Notes:**

- Current validation commands are build/runtime checks:
  - client: `npm run build`
  - server: `npm run build`
- Client production SPA routes require Vercel rewrite support for BrowserRouter paths.
- Server CORS policy must allow `https://nos-limites-app.vercel.app` for magic-link requests.
