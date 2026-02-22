import type { CorsOptions } from "cors";

const DEFAULT_FRONTEND_ORIGINS = [
  "http://localhost:5173",
  "https://nos-limites-app.vercel.app",
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

      callback(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  };
}
