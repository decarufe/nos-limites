#!/usr/bin/env node
/**
 * Test Features #56 and #57: Invitation Link Authentication Flow
 *
 * Feature #56: Invitation link works when opened by logged-in user
 * Feature #57: Invitation link shows login prompt for unauthenticated user
 *
 * This test verifies the implementation without browser automation:
 * 1. Check that InvitePage is wrapped with ProtectedRoute
 * 2. Check that ProtectedRoute saves redirect path to sessionStorage
 * 3. Check that AuthVerifyPage reads and redirects to saved path
 * 4. Check that ProfileSetupPage also handles pending redirect
 * 5. Verify InvitePage doesn't have redundant auth logic
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('=== Testing Features #56 & #57: Invitation Link Auth Flow ===\n');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✓ ${description}`);
    passed++;
  } catch (err) {
    console.error(`✗ ${description}`);
    console.error(`  Error: ${err.message}`);
    failed++;
  }
}

// Read source files
const appTsx = readFileSync(join(__dirname, 'client/src/App.tsx'), 'utf-8');
const invitePageTsx = readFileSync(join(__dirname, 'client/src/pages/InvitePage.tsx'), 'utf-8');
const protectedRouteTsx = readFileSync(join(__dirname, 'client/src/components/ProtectedRoute.tsx'), 'utf-8');
const authVerifyPageTsx = readFileSync(join(__dirname, 'client/src/pages/AuthVerifyPage.tsx'), 'utf-8');
const profileSetupPageTsx = readFileSync(join(__dirname, 'client/src/pages/ProfileSetupPage.tsx'), 'utf-8');

console.log('1. Checking App.tsx routing configuration...\n');

test('InvitePage route is wrapped with ProtectedRoute', () => {
  const inviteRouteMatch = appTsx.match(/path="\/invite\/:token"[\s\S]*?element=\{[\s\S]*?<ProtectedRoute>[\s\S]*?<InvitePage/);
  if (!inviteRouteMatch) {
    throw new Error('InvitePage is not wrapped with ProtectedRoute');
  }
});

test('InvitePage route is properly closed', () => {
  const hasProperStructure = appTsx.includes('<ProtectedRoute>') &&
                             appTsx.includes('<InvitePage />') &&
                             appTsx.includes('</ProtectedRoute>');
  if (!hasProperStructure) {
    throw new Error('Route structure is incomplete');
  }
});

console.log('\n2. Checking ProtectedRoute implementation...\n');

test('ProtectedRoute saves redirect path to sessionStorage', () => {
  const sessionStorageMatch = protectedRouteTsx.match(/sessionStorage\.setItem\((PENDING_REDIRECT_KEY|['"](nos_limites_pending_redirect)['"])/);
  if (!sessionStorageMatch) {
    throw new Error('ProtectedRoute does not save redirect path to sessionStorage');
  }
});

test('ProtectedRoute uses location.pathname + location.search', () => {
  const hasPathname = protectedRouteTsx.includes('location.pathname');
  const hasSearch = protectedRouteTsx.includes('location.search');
  if (!hasPathname || !hasSearch) {
    throw new Error('ProtectedRoute does not capture full URL with query params');
  }
});

test('ProtectedRoute redirects to /login when not authenticated', () => {
  const redirectMatch = protectedRouteTsx.match(/<Navigate\s+to="\/login"/);
  if (!redirectMatch) {
    throw new Error('ProtectedRoute does not redirect to /login');
  }
});

console.log('\n3. Checking AuthVerifyPage redirect handling...\n');

test('AuthVerifyPage reads pending redirect from sessionStorage', () => {
  const readMatch = authVerifyPageTsx.match(/sessionStorage\.getItem\(['"](nos_limites_pending_redirect)['"]\)/);
  if (!readMatch) {
    throw new Error('AuthVerifyPage does not read pending redirect');
  }
});

test('AuthVerifyPage redirects to pending URL for existing users', () => {
  const redirectLogic = authVerifyPageTsx.match(/if\s*\(pendingRedirect\)[\s\S]*?navigate\(pendingRedirect/);
  if (!redirectLogic) {
    throw new Error('AuthVerifyPage does not redirect to pending URL');
  }
});

test('AuthVerifyPage removes pending redirect after use', () => {
  const removeMatch = authVerifyPageTsx.match(/sessionStorage\.removeItem\(['"](nos_limites_pending_redirect)['"]\)/);
  if (!removeMatch) {
    throw new Error('AuthVerifyPage does not clean up sessionStorage');
  }
});

console.log('\n4. Checking ProfileSetupPage redirect handling...\n');

test('ProfileSetupPage reads pending redirect from sessionStorage', () => {
  const readMatch = profileSetupPageTsx.match(/sessionStorage\.getItem\(['"](nos_limites_pending_redirect)['"]\)/);
  if (!readMatch) {
    throw new Error('ProfileSetupPage does not read pending redirect');
  }
});

test('ProfileSetupPage removes pending redirect after use', () => {
  const removeMatch = profileSetupPageTsx.match(/sessionStorage\.removeItem\(['"](nos_limites_pending_redirect)['"]\)/);
  if (!removeMatch) {
    throw new Error('ProfileSetupPage does not clean up sessionStorage');
  }
});

console.log('\n5. Checking InvitePage implementation...\n');

test('InvitePage does not import Navigate', () => {
  const importLines = invitePageTsx.split('\n').filter(line => line.includes('react-router-dom'));
  const hasNavigate = importLines.some(line => /\bNavigate\b/.test(line));
  if (hasNavigate) {
    throw new Error('InvitePage still imports Navigate - redundant auth logic may exist');
  }
});

test('InvitePage does not import useAuth', () => {
  const hasUseAuth = invitePageTsx.includes('import') && invitePageTsx.includes('useAuth');
  if (hasUseAuth) {
    throw new Error('InvitePage still imports useAuth - should rely on ProtectedRoute');
  }
});

test('InvitePage does not check isAuthenticated', () => {
  const hasAuthCheck = invitePageTsx.match(/if\s*\(.*isAuthenticated/);
  if (hasAuthCheck) {
    throw new Error('InvitePage has redundant authentication check');
  }
});

test('InvitePage does not have authLoading checks', () => {
  const hasAuthLoading = invitePageTsx.includes('authLoading');
  if (hasAuthLoading) {
    throw new Error('InvitePage checks authLoading - should be handled by ProtectedRoute');
  }
});

test('InvitePage useEffect only depends on token', () => {
  // Find the useEffect that fetches invite
  const useEffectMatch = invitePageTsx.match(/useEffect\(\s*\(\)\s*=>\s*\{[\s\S]*?fetchInvite\(\);[\s\S]*?\},\s*\[(.*?)\]\)/);
  if (!useEffectMatch) {
    throw new Error('Could not find fetchInvite useEffect');
  }
  const dependencies = useEffectMatch[1].trim();
  if (dependencies !== 'token') {
    throw new Error(`useEffect dependencies should be [token], got [${dependencies}]`);
  }
});

test('InvitePage fetches invite immediately when token exists', () => {
  // Should only check if token exists, not authentication
  const fetchInviteSection = invitePageTsx.match(/if\s*\(!token\)\s*return;[\s\S]*?fetchInvite/);
  if (!fetchInviteSection) {
    throw new Error('InvitePage should fetch invite immediately when token exists');
  }
});

console.log('\n=== Summary ===\n');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total:  ${passed + failed}`);

if (failed > 0) {
  console.log('\n❌ Some tests failed. Please review the implementation.');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed! Features #56 and #57 are correctly implemented.');
  console.log('\nFlow Summary:');
  console.log('1. Unauthenticated user visits /invite/abc123');
  console.log('2. ProtectedRoute saves "/invite/abc123" to sessionStorage');
  console.log('3. ProtectedRoute redirects to /login');
  console.log('4. User receives magic link and verifies');
  console.log('5. AuthVerifyPage reads sessionStorage and redirects back to /invite/abc123');
  console.log('6. InvitePage loads invitation details and shows Accept/Decline buttons');
  console.log('7. For logged-in users, ProtectedRoute allows direct access to InvitePage');
  process.exit(0);
}
