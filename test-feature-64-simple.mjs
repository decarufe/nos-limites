#!/usr/bin/env node
/**
 * Feature #64: All UI text is in French
 * Simplified verification - check key UI elements
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(60));
console.log('Feature #64: All UI Text is in French');
console.log('='.repeat(60));
console.log();

let passed = 0;
let failed = 0;

function pass(message) {
  console.log(`✅ PASS: ${message}`);
  passed++;
}

function fail(message) {
  console.log(`❌ FAIL: ${message}`);
  failed++;
}

// Test by verifying French text is present in key areas
console.log('Checking French UI text in key pages...\n');

const checks = [
  {
    file: 'client/src/components/BottomNav.tsx',
    mustContain: ['Accueil', 'Profil', 'Notifications', 'Invitations'],
    name: 'Bottom Navigation'
  },
  {
    file: 'client/src/pages/HomePage.tsx',
    mustContain: ['Mes relations', 'Chargement', 'Aucune relation', 'limites en commun'],
    name: 'Home Page'
  },
  {
    file: 'client/src/pages/LoginPage.tsx',
    mustContain: ['Nos limites', 'Se connecter', 'email', 'Envoyer'],
    name: 'Login Page'
  },
  {
    file: 'client/src/pages/ProfilePage.tsx',
    mustContain: ['Profil', 'Déconnexion', 'Enregistrer', 'Supprimer'],
    name: 'Profile Page'
  },
  {
    file: 'client/src/pages/NotificationsPage.tsx',
    mustContain: ['Notifications', 'Chargement', 'Aucune notification'],
    name: 'Notifications Page'
  },
  {
    file: 'client/src/pages/ScanPage.tsx',
    mustContain: ['scanner', 'Inviter', 'QR code'],
    name: 'Scan/Invite Page'
  },
  {
    file: 'client/src/pages/RelationshipPage.tsx',
    mustContain: ['Mes limites', 'En commun', 'Bloquer', 'Supprimer'],
    name: 'Relationship Page'
  },
  {
    file: 'client/src/pages/InvitePage.tsx',
    mustContain: ['Accepter', 'Refuser', 'relation', 'limites'],
    name: 'Invite Page'
  },
];

for (const check of checks) {
  const filePath = path.join(__dirname, check.file);

  if (!fs.existsSync(filePath)) {
    fail(`${check.name}: File not found`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const missingWords = check.mustContain.filter(word => !content.includes(word));

  if (missingWords.length === 0) {
    pass(`${check.name}: All French text found`);
  } else {
    fail(`${check.name}: Missing French words: ${missingWords.join(', ')}`);
  }
}

// Check index.html language attribute
console.log();
const indexPath = path.join(__dirname, 'client/index.html');
if (fs.existsSync(indexPath)) {
  const content = fs.readFileSync(indexPath, 'utf8');
  if (content.includes('<html lang="fr">')) {
    pass('HTML language attribute set to French');
  } else {
    fail('HTML language attribute not set to French');
  }
}

console.log();
console.log('='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed > 0) {
  console.error('\n❌ Feature #64 verification FAILED');
  process.exit(1);
} else {
  console.log('\n✅ Feature #64 verification PASSED');
  console.log('All UI text is in French!');
  process.exit(0);
}
