/** Maps French page paths to English equivalents and vice versa. */

const frToEn: Record<string, string> = {
  '/': '/en/',
  '/fonctionnalites/': '/en/features/',
  '/comment-ca-marche/': '/en/how-it-works/',
  '/faq/': '/en/faq/',
  '/confidentialite/': '/en/privacy/',
  '/mentions-legales/': '/en/legal/',
  '/cgu/': '/en/terms/',
};

const enToFr: Record<string, string> = Object.fromEntries(
  Object.entries(frToEn).map(([fr, en]) => [en, fr])
);

/** Given current path and target locale, return the equivalent path. */
export function getLocalePath(currentPath: string, targetLang: 'fr' | 'en'): string {
  // Normalize: ensure trailing slash
  const normalized = currentPath.endsWith('/') ? currentPath : currentPath + '/';

  if (targetLang === 'en') {
    return frToEn[normalized] || `/en${normalized}`;
  }
  return enToFr[normalized] || normalized.replace(/^\/en\//, '/').replace(/^\/en$/, '/');
}
