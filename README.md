# Nos limites

**D\u00E9finissez vos limites mutuelles en toute confiance.**

Nos limites est une application web progressive (PWA) en fran\u00E7ais qui permet \u00E0 deux personnes de d\u00E9finir mutuellement et de fa\u00E7on transparente les limites de leur relation. Chaque participant coche ind\u00E9pendamment les comportements qu'il/elle accepte de l'autre, et seules les limites coch\u00E9es par les deux sont r\u00E9v\u00E9l\u00E9es \u2014 un syst\u00E8me de "match" qui encourage l'ouverture tout en prot\u00E9geant la vuln\u00E9rabilit\u00E9 de chacun.

## Stack Technique

- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + Express + TypeScript
- **Base de donn\u00E9es:** SQLite (via better-sqlite3 + Drizzle ORM)
- **Authentification:** Magic link (email) + OAuth social (Google, Facebook)
- **Temps r\u00E9el:** Server-Sent Events (SSE)
- **PWA:** Service Worker + manifest.json

## Pr\u00E9requis

- Node.js 18+
- npm

## Installation et d\u00E9marrage

```bash
# Rendre le script ex\u00E9cutable (Unix/macOS)
chmod +x init.sh

# Lancer l'environnement de d\u00E9veloppement
./init.sh
```

Ou manuellement :

```bash
# Backend
cd server
npm install
npm run db:migrate
npm run db:seed
npm run dev

# Frontend (dans un autre terminal)
cd client
npm install
npm run dev
```

## URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **Health check:** http://localhost:3001/api/health

## Structure du projet

```
app/
\u251C\u2500\u2500 client/                 # Frontend React (Vite)
\u2502   \u251C\u2500\u2500 public/             # Fichiers statiques
\u2502   \u2514\u2500\u2500 src/
\u2502       \u251C\u2500\u2500 components/     # Composants r\u00E9utilisables
\u2502       \u251C\u2500\u2500 pages/          # Pages/\u00E9crans de l'app
\u2502       \u251C\u2500\u2500 hooks/          # Hooks React personnalis\u00E9s
\u2502       \u251C\u2500\u2500 services/       # Appels API
\u2502       \u251C\u2500\u2500 context/        # Contextes React (auth, etc.)
\u2502       \u251C\u2500\u2500 styles/         # Styles globaux et variables CSS
\u2502       \u2514\u2500\u2500 utils/          # Fonctions utilitaires
\u251C\u2500\u2500 server/                 # Backend Express
\u2502   \u251C\u2500\u2500 data/               # Fichier SQLite
\u2502   \u2514\u2500\u2500 src/
\u2502       \u251C\u2500\u2500 db/             # Schema, connexion, migrations, seed
\u2502       \u251C\u2500\u2500 routes/         # Routes API Express
\u2502       \u251C\u2500\u2500 middleware/     # Middleware (auth, etc.)
\u2502       \u251C\u2500\u2500 services/       # Logique m\u00E9tier
\u2502       \u2514\u2500\u2500 utils/          # Fonctions utilitaires
\u2514\u2500\u2500 init.sh                 # Script de setup et d\u00E9marrage
```

## Cat\u00E9gories de limites

L'application couvre un spectre de comportements organis\u00E9s en 5 cat\u00E9gories :

1. **Contact professionnel** \uD83E\uDD1D - Cadre professionnel respectueux
2. **Contact amical** \uD83D\uDE0A - Interactions amicales et chaleureuses
3. **Flirt et s\u00E9duction** \uD83D\uDCAC - Interactions \u00E0 caract\u00E8re s\u00E9ducteur
4. **Contact rapproch\u00E9** \uD83E\uDD17 - Contacts physiques plus intimes
5. **Intimit\u00E9** \uD83D\uDC95 - Propositions et contacts intimes

## Confidentialit\u00E9

- Les limites non-communes sont **invisibles** \u00E0 l'autre personne
- Les donn\u00E9es sensibles sont chiffr\u00E9es au repos
- Conformit\u00E9 RGPD (export et suppression des donn\u00E9es)
