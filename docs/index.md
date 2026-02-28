# Nos limites — Documentation Index

> **Nos limites** is a Progressive Web App (PWA) that lets two people transparently define the boundaries of their relationship. Each participant independently checks the behaviours they accept, and only the limits checked by **both** are revealed — a privacy-first "match" system.

---

## Documentation Files

| File | Description |
|------|-------------|
| [architecture.md](./architecture.md) | System overview, tech stack, directory layout, and Mermaid diagrams |
| [api.md](./api.md) | Complete REST API reference grouped by domain |
| [database.md](./database.md) | Full database schema, column types, constraints, and ER diagram |
| [development.md](./development.md) | Local setup, environment variables, scripts, and testing |
| [deployment.md](./deployment.md) | Vercel + Turso production deployment guide |
| [security.md](./security.md) | Authentication flows, privacy model, GDPR, and security controls |
| [turso-setup.md](./turso-setup.md) | Step-by-step Turso database creation and configuration |

---

## Quick Links

- **Start developing** → [Development Guide](./development.md#quick-start)
- **Understand the data model** → [Database Schema](./database.md)
- **Integrate with the API** → [API Reference](./api.md)
- **Deploy to production** → [Deployment Guide](./deployment.md)
- **Security & privacy model** → [Security](./security.md#the-match-privacy-model)

---

## Technology at a Glance

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite, TypeScript, React Router v6, PWA |
| Backend | Node.js, Express, TypeScript |
| Database | SQLite / Turso (libSQL) via Drizzle ORM |
| Real-time | Server-Sent Events (SSE) |
| Auth | Magic link (email) + Google OAuth |
| Hosting | Vercel (frontend SPA + backend serverless functions) |
