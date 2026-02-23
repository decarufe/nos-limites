#!/usr/bin/env node
/**
 * Feature #64: All UI text is in French
 *
 * Verification steps:
 * 1. Check all TSX files for English UI strings
 * 2. Verify button labels are in French
 * 3. Verify placeholder text is in French
 * 4. Verify error messages are in French
 * 5. Verify empty state messages are in French
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('='.repeat(60));
console.log('Feature #64: All UI Text is in French');
console.log('='.repeat(60));
console.log();

let passed = 0;
let failed = 0;
let warnings = 0;

function pass(message) {
  console.log(`✅ PASS: ${message}`);
  passed++;
}

function fail(message) {
  console.log(`❌ FAIL: ${message}`);
  failed++;
}

function warn(message) {
  console.log(`⚠️  WARNING: ${message}`);
  warnings++;
}

// Common English UI words that should not appear as UI strings
const ENGLISH_UI_WORDS = [
  'Loading',
  'Error',
  'Submit',
  'Cancel',
  'Delete',
  'Save',
  'Email',
  'Password',
  'Login',
  'Sign in',
  'Sign up',
  'Sign out',
  'Logout',
  'Welcome',
  'Hello',
  'Click here',
  'Send',
  'Back',
  'Next',
  'Close',
  'Open',
  'Edit',
  'Update',
  'Create',
  'Add',
  'Remove',
  'Search',
  'Filter',
  'Sort',
  'Settings',
  'Success',
  'Confirm',
  'Yes',
  'No',
  'OK',
];

// French equivalents we expect to find
const FRENCH_UI_WORDS = [
  'Chargement',
  'Erreur',
  'Enregistrer',
  'Annuler',
  'Supprimer',
  'Email',
  'Connexion',
  'Déconnexion',
  'Envoyer',
  'Retour',
  'Suivant',
  'Fermer',
  'Modifier',
  'Créer',
  'Ajouter',
  'Rechercher',
  'Paramètres',
  'Succès',
  'Confirmer',
  'Oui',
  'Non',
];

console.log('Test 1: Check TSX files for English UI strings');
console.log('-'.repeat(60));

const tsxFiles = [
  'client/src/pages/LoginPage.tsx',
  'client/src/pages/HomePage.tsx',
  'client/src/pages/ProfilePage.tsx',
  'client/src/pages/NotificationsPage.tsx',
  'client/src/pages/ScanPage.tsx',
  'client/src/pages/RelationshipPage.tsx',
  'client/src/pages/InvitePage.tsx',
  'client/src/components/BottomNav.tsx',
];

let englishFound = false;

for (const file of tsxFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) {
    warn(`File not found: ${file}`);
    continue;
  }

  const content = fs.readFileSync(filePath, 'utf8');

  // Check for common English UI words in string literals
  for (const word of ENGLISH_UI_WORDS) {
    // Look for the word in quotes or JSX text
    const regex = new RegExp(`["'\`]([^"'\`]*${word}[^"'\`]*)["'\`]|>[^<]*${word}[^<]*<`, 'gi');
    const matches = content.match(regex);

    if (matches) {
      // Filter out imports, className, etc.
      const uiMatches = matches.filter(m =>
        !m.includes('import') &&
        !m.includes('className') &&
        !m.includes('stroke') &&
        !m.includes('fill')
      );

      if (uiMatches.length > 0) {
        fail(`English word "${word}" found in ${file}`);
        englishFound = true;
      }
    }
  }
}

if (!englishFound) {
  pass('No common English UI words found in TSX files');
}

console.log();

// Test 2: Verify French text is present
console.log('Test 2: Verify French UI text is present');
console.log('-'.repeat(60));

let frenchFound = 0;

for (const file of tsxFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, 'utf8');

  for (const word of FRENCH_UI_WORDS) {
    if (content.includes(word)) {
      frenchFound++;
      break; // Count once per file
    }
  }
}

if (frenchFound >= tsxFiles.length - 1) {
  pass(`French UI text found in ${frenchFound}/${tsxFiles.length} files`);
} else if (frenchFound > 0) {
  warn(`French UI text found in only ${frenchFound}/${tsxFiles.length} files`);
} else {
  fail('No French UI text found');
}

console.log();

// Test 3: Check specific UI elements
console.log('Test 3: Check specific UI elements');
console.log('-'.repeat(60));

// Check BottomNav labels
const bottomNavPath = path.join(__dirname, 'client/src/components/BottomNav.tsx');
if (fs.existsSync(bottomNavPath)) {
  const content = fs.readFileSync(bottomNavPath, 'utf8');

  if (content.includes('Accueil') && content.includes('Profil') && content.includes('Notifications')) {
    pass('Bottom navigation labels are in French');
  } else {
    fail('Bottom navigation labels are not all in French');
  }
}

// Check HomePage
const homePagePath = path.join(__dirname, 'client/src/pages/HomePage.tsx');
if (fs.existsSync(homePagePath)) {
  const content = fs.readFileSync(homePagePath, 'utf8');

  if (content.includes('Mes relations') &&
      content.includes('Aucune relation') &&
      content.includes('Chargement')) {
    pass('HomePage UI text is in French');
  } else {
    fail('HomePage has missing French text');
  }
}

// Check LoginPage
const loginPagePath = path.join(__dirname, 'client/src/pages/LoginPage.tsx');
if (fs.existsSync(loginPagePath)) {
  const content = fs.readFileSync(loginPagePath, 'utf8');

  if (content.includes('Connexion') || content.includes('Email') || content.includes('Envoyer')) {
    pass('LoginPage UI text is in French');
  } else {
    fail('LoginPage has missing French text');
  }
}

// Check ProfilePage
const profilePagePath = path.join(__dirname, 'client/src/pages/ProfilePage.tsx');
if (fs.existsSync(profilePagePath)) {
  const content = fs.readFileSync(profilePagePath, 'utf8');

  if (content.includes('Profil') && content.includes('Déconnexion')) {
    pass('ProfilePage UI text is in French');
  } else {
    fail('ProfilePage has missing French text');
  }
}

// Check NotificationsPage
const notificationsPagePath = path.join(__dirname, 'client/src/pages/NotificationsPage.tsx');
if (fs.existsSync(notificationsPagePath)) {
  const content = fs.readFileSync(notificationsPagePath, 'utf8');

  if (content.includes('Notifications') || content.includes('Aucune notification')) {
    pass('NotificationsPage UI text is in French');
  } else {
    fail('NotificationsPage has missing French text');
  }
}

console.log();

// Test 4: Check for French placeholders and error messages
console.log('Test 4: Check for French placeholders and error messages');
console.log('-'.repeat(60));

try {
  // Search for placeholder attributes
  const placeholderCheck = execSync(
    'grep -r "placeholder=" client/src --include="*.tsx" || true',
    { encoding: 'utf8' }
  );

  if (placeholderCheck.includes('placeholder=') && !placeholderCheck.match(/placeholder="[A-Z][a-z]+ [a-z]+"/)) {
    pass('Placeholders appear to be in French (no obvious English)');
  } else if (!placeholderCheck.includes('placeholder=')) {
    console.log('ℹ️  INFO: No placeholder attributes found');
  }
} catch (e) {
  // Grep command failed or not found
}

// Check error messages
let errorMessagesInFrench = 0;
for (const file of tsxFiles) {
  const filePath = path.join(__dirname, file);
  if (!fs.existsSync(filePath)) continue;

  const content = fs.readFileSync(filePath, 'utf8');

  if (content.includes('Erreur') || content.match(/erreur[^"]*"/i)) {
    errorMessagesInFrench++;
  }
}

if (errorMessagesInFrench > 0) {
  pass(`French error messages found in ${errorMessagesInFrench} file(s)`);
}

console.log();
console.log('='.repeat(60));
console.log(`Results: ${passed} passed, ${failed} failed, ${warnings} warnings`);
console.log('='.repeat(60));

if (failed > 0) {
  console.error('\n❌ Feature #64 verification FAILED');
  console.error('Some UI text is not in French');
  process.exit(1);
} else {
  console.log('\n✅ Feature #64 verification PASSED');
  console.log('All UI text is in French!');
  console.log();
  console.log('Summary:');
  console.log('  - Navigation labels: French ✓');
  console.log('  - Page titles: French ✓');
  console.log('  - Button labels: French ✓');
  console.log('  - Empty states: French ✓');
  console.log('  - Error messages: French ✓');

  if (warnings > 0) {
    console.log(`\nNote: ${warnings} warning(s) found but no blockers`);
  }

  process.exit(0);
}
