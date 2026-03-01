import test from "node:test";
import assert from "node:assert/strict";
import type { Request } from "express";
import { resolveFrontendBaseUrl } from "../src/utils/frontend-url";

function createMockRequest(origin?: string): Request {
  return {
    get(header: string) {
      if (header.toLowerCase() === "origin") {
        return origin;
      }
      return undefined;
    },
    headers: {
      origin,
    },
  } as Request;
}

test("resolveFrontendBaseUrl uses explicit preferred URL when provided", () => {
  const req = createMockRequest("https://preview.nos-limites.app");
  const result = resolveFrontendBaseUrl(req, {
    preferredBaseUrl: "https://custom.example.com/",
  });

  assert.equal(result, "https://custom.example.com");
});

test("resolveFrontendBaseUrl uses request origin as current host", () => {
  const req = createMockRequest("https://nos-limites-app-git-pr-42.vercel.app");
  const result = resolveFrontendBaseUrl(req);

  assert.equal(result, "https://nos-limites-app-git-pr-42.vercel.app");
});

test("resolveFrontendBaseUrl falls back to configured FRONTEND_URL when origin missing", () => {
  const req = createMockRequest(undefined);
  const result = resolveFrontendBaseUrl(req, {
    frontendUrl:
      "https://configured.example.com, https://secondary.example.com",
  });

  assert.equal(result, "https://configured.example.com");
});

test("resolveFrontendBaseUrl uses production default instead of localhost in production", () => {
  const req = createMockRequest(undefined);
  const result = resolveFrontendBaseUrl(req, {
    nodeEnv: "production",
  });

  assert.equal(result, "https://app.nos-limites.com");
});

test("resolveFrontendBaseUrl keeps localhost fallback in development", () => {
  const req = createMockRequest(undefined);
  const result = resolveFrontendBaseUrl(req, {
    nodeEnv: "development",
  });

  assert.equal(result, "http://localhost:5173");
});
