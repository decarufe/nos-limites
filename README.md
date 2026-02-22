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
````markdown
# Nos limites

**Définissez vos limites mutuelles en toute confiance.**

Nos limites est une application web progressive (PWA) en français qui permet à deux personnes de définir mutuellement et de façon transparente les limites de leur relation. Chaque participant coche indépendamment les comportements qu'il/elle accepte de l'autre, et seules les limites cochées par les deux sont révélées — un système de "match" qui encourage l'ouverture tout en protégeant la vulnérabilité de chacun.

## Stack Technique

- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + Express + TypeScript
- **Base de données:** SQLite (via better-sqlite3 + Drizzle ORM)
- **Authentification:** Magic link (email) + OAuth social (Google, Facebook)
- **Temps réel:** Server-Sent Events (SSE)
- **PWA:** Service Worker + manifest.json

## Prérequis

- Node.js 18+
- npm

## Installation et démarrage

```bash
# Rendre le script exécutable (Unix/macOS)
chmod +x init.sh

# Lancer l'environnement de développement
./init.sh
```

Ou manuellement :

```bash
# Backend
cd server
npm install
````markdown
# Nos limites

**Définissez vos limites mutuelles en toute confiance.**

Nos limites est une application web progressive (PWA) en français qui permet à deux personnes de définir mutuellement et de façon transparente les limites de leur relation. Chaque participant coche indépendamment les comportements qu'il/elle accepte de l'autre, et seules les limites cochées par les deux sont révélées — un système de "match" qui encourage l'ouverture tout en protégeant la vulnérabilité de chacun.

## Stack Technique

- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + Express + TypeScript
- **Base de données:** SQLite (via better-sqlite3 + Drizzle ORM)
- **Authentification:** Magic link (email) + OAuth social (Google, Facebook)
- **Temps réel:** Server-Sent Events (SSE)
- **PWA:** Service Worker + manifest.json

## Prérequis

- Node.js 18+
- npm

## Installation et démarrage

```bash
# Rendre le script exécutable (Unix/macOS)
chmod +x init.sh

# Lancer l'environnement de développement
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
├── client/                 # Frontend React (Vite)
│   ├── public/             # Fichiers statiques
│   └── src/
│       ├── components/     # Composants réutilisables
│       ├── pages/          # Pages/écrans de l'app
│       ├── hooks/          # Hooks React personnalisés
│       ├── services/       # Appels API
│       ├── context/        # Contextes React (auth, etc.)
│       └── styles/         # Styles globaux et variables CSS
│       └── utils/          # Fonctions utilitaires
├── server/                 # Backend Express
│   ├── data/               # Fichier SQLite
│   └── src/
│       ├── db/             # Schema, connexion, migrations, seed
│       ├── routes/         # Routes API Express
│       ├── middleware/     # Middleware (auth, etc.)
│       ├── services/       # Logique métier
│       └── utils/          # Fonctions utilitaires
└── init.sh                 # Script de setup et démarrage
```

## Catégories de limites

L'application couvre un spectre de comportements organisés en 5 catégories :

1. **Contact professionnel** 🤝 - Cadre professionnel respectueux
2. **Contact amical** 😊 - Interactions amicales et chaleureuses
3. **Flirt et séduction** 💬 - Interactions à caractère séducteur
4. **Contact rapproché** 🤗 - Contacts physiques plus intimes
5. **Intimité** 💕 - Propositions et contacts intimes

## Confidentialité

- Les limites non-communes sont **invisibles** à l'autre personne
- Les données sensibles sont chiffrées au repos
- Conformité RGPD (export et suppression des données)

````
