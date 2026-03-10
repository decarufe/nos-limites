import type { CorsOptions } from "cors";

const DEFAULT_FRONTEND_ORIGINS = [
  "http://localhost:5173",
  "https://app.nos-limites.com",
];

// Regex patterns for Vercel preview deployment URLs
const PREVIEW_ORIGIN_PATTERNS: RegExp[] = [
  /^https:\/\/nos-limites-client-[a-z0-9]+-ericdecarufel-2862s-projects\.vercel\.app$/,
  /^https:\/\/nos-limites-client-git-[a-z0-9-]+-ericdecarufel-2862s-projects\.vercel\.app$/,
];

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, "");
}

export function getAllowedOrigins(
  frontendUrl = process.env.FRONTEND_URL,
): string[] {
  const configuredOrigins = frontendUrl
    ?.split(",")
    .map((origin) => normalizeOrigin(origin))
    .filter((origin) => origin.length > 0);

  const merged = [...(configuredOrigins ?? []), ...DEFAULT_FRONTEND_ORIGINS];

  return [...new Set(merged.map((origin) => normalizeOrigin(origin)))];
}

function isAllowedPreviewOrigin(origin: string): boolean {
  return PREVIEW_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

export function createCorsOptions(
  frontendUrl = process.env.FRONTEND_URL,
): CorsOptions {
  const allowedOrigins = getAllowedOrigins(frontendUrl);

  return {
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const normalizedOrigin = normalizeOrigin(origin);

      if (allowedOrigins.includes(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      if (isAllowedPreviewOrigin(normalizedOrigin)) {
        callback(null, true);
        return;
      }

      if (
        process.env.NODE_ENV !== "production" &&
        /^https?:\/\/localhost(:\d+)?$/.test(normalizedOrigin)
      ) {
        callback(null, true);
        return;
      }

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  };
}
