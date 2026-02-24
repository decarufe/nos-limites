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

## Configuration de l'authentification Google (OAuth)

L'authentification via Google est optionnelle. Si les variables d'environnement ne sont pas renseignées, le bouton "Continuer avec Google" n'apparaît pas dans l'interface.

### 1. Créer un projet Google Cloud

1. Rendez-vous sur [Google Cloud Console](https://console.cloud.google.com/).
2. Cliquez sur **Nouveau projet**, donnez-lui un nom (ex. `nos-limites`) et créez-le.

### 2. Activer l'API Google Identity

1. Dans le menu de navigation, allez dans **API et services > Bibliothèque**.
2. Recherchez **Google Identity** (ou **OAuth2 API**) et activez-la.

### 3. Créer des identifiants OAuth 2.0

1. Allez dans **API et services > Identifiants**.
2. Cliquez sur **+ Créer des identifiants** puis **ID client OAuth**.
3. Si demandé, configurez l'**écran de consentement OAuth** :
   - Type d'utilisateur : **Externe**
   - Remplissez le nom de l'application, l'email d'assistance et l'email du développeur.
   - Ajoutez les portées : `openid`, `email`, `profile`.
4. Pour le type d'application, choisissez **Application Web**.
5. Donnez un nom à vos identifiants.
6. Dans **URI de redirection autorisés**, ajoutez :
   - En développement : `http://localhost:3001/api/auth/google/callback`
   - En production : `https://<votre-domaine>/api/auth/google/callback`
7. Cliquez sur **Créer** et notez votre **Client ID** et **Client Secret**.

### 4. Configurer les variables d'environnement

Copiez `server/.env.example` vers `server/.env` si ce n'est pas déjà fait, puis renseignez :

```env
GOOGLE_CLIENT_ID=<votre-client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<votre-client-secret>
GOOGLE_CALLBACK_URL=http://localhost:3001/api/auth/google/callback
```

> En production, remplacez `http://localhost:3001` par l'URL de votre backend déployé.

### 5. Vérifier la configuration

Démarrez le serveur et appelez l'endpoint suivant :

```bash
curl http://localhost:3001/api/auth/providers
```

La réponse doit indiquer `"google": true` :

```json
{
  "providers": {
    "magic_link": true,
    "google": true,
    "facebook": false
  }
}
```

Si `google` est `false`, vérifiez que `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` sont bien définis et non vides.

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
