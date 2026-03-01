import test from "node:test";
import assert from "node:assert/strict";
import { createCorsOptions, getAllowedOrigins } from "../src/config/cors";

type OriginCallback = (err: Error | null, allow?: boolean) => void;
type OriginHandler = (
  origin: string | undefined,
  callback: OriginCallback,
) => void;

test("getAllowedOrigins includes production and localhost defaults", () => {
  const origins = getAllowedOrigins(undefined);

  assert.equal(origins.includes("https://app.nos-limites.com"), true);
  assert.equal(origins.includes("http://localhost:5173"), true);
});

test("getAllowedOrigins supports comma-separated FRONTEND_URL values", () => {
  const origins = getAllowedOrigins(
    "https://preview-a.vercel.app, https://preview-b.vercel.app/",
  );

  assert.equal(origins.includes("https://preview-a.vercel.app"), true);
  assert.equal(origins.includes("https://preview-b.vercel.app"), true);
});

test("createCorsOptions accepts known origin and rejects unknown origin", async () => {
  const corsOptions = createCorsOptions("https://allowed.example.com");
  const originHandler = corsOptions.origin;

  assert.equal(typeof originHandler, "function");
  if (typeof originHandler !== "function") {
    throw new Error("Expected CORS origin handler to be a function");
  }

  const handleOrigin = originHandler as OriginHandler;

  await new Promise<void>((resolve, reject) => {
    handleOrigin("https://allowed.example.com", (err, allowed) => {
      if (err) {
        reject(err);
        return;
      }
      try {
        assert.equal(allowed, true);
        resolve();
      } catch (assertErr) {
        reject(assertErr);
      }
    });
  });

  await new Promise<void>((resolve, reject) => {
    handleOrigin("https://denied.example.com", (err) => {
      try {
        assert.equal(err instanceof Error, true);
        resolve();
      } catch (assertErr) {
        reject(assertErr);
      }
    });
  });
});
