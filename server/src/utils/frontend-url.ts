import type { Request } from "express";

const DEFAULT_LOCAL_FRONTEND_URL = "http://localhost:5173";
const DEFAULT_PRODUCTION_FRONTEND_URL = "https://nos-limites-app.vercel.app";

interface ResolveFrontendUrlOptions {
  preferredBaseUrl?: string;
  frontendUrl?: string;
  nodeEnv?: string;
  vercel?: string | boolean;
}

function normalizeUrl(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

function firstConfiguredUrl(frontendUrl?: string): string | null {
  if (!frontendUrl) {
    return null;
  }

  const first = frontendUrl
    .split(",")
    .map((url) => normalizeUrl(url))
    .find((url) => url.length > 0);

  return first ?? null;
}

function readRequestOrigin(req: Request): string | null {
  const originHeader = req.get("origin") || req.headers.origin;

  if (typeof originHeader !== "string" || originHeader.trim().length === 0) {
    return null;
  }

  return normalizeUrl(originHeader);
}

export function resolveFrontendBaseUrl(
  req: Request,
  options: ResolveFrontendUrlOptions = {},
): string {
  const preferred = options.preferredBaseUrl?.trim();
  if (preferred) {
    return normalizeUrl(preferred);
  }

  const requestOrigin = readRequestOrigin(req);
  if (requestOrigin) {
    return requestOrigin;
  }

  const configuredFrontendUrl = firstConfiguredUrl(
    options.frontendUrl ?? process.env.FRONTEND_URL,
  );
  if (configuredFrontendUrl) {
    return configuredFrontendUrl;
  }

  const isProduction =
    (options.nodeEnv ?? process.env.NODE_ENV) === "production" ||
    Boolean(options.vercel ?? process.env.VERCEL);

  return isProduction
    ? DEFAULT_PRODUCTION_FRONTEND_URL
    : DEFAULT_LOCAL_FRONTEND_URL;
}
