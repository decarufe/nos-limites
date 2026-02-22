import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const vercelConfigPath = resolve(process.cwd(), "vercel.json");

test("Vercel config includes SPA fallback rewrite for client routes", () => {
  assert.equal(
    existsSync(vercelConfigPath),
    true,
    "client/vercel.json is missing. Add a Vercel rewrite so BrowserRouter routes do not 404.",
  );

  const config = JSON.parse(readFileSync(vercelConfigPath, "utf8"));
  const rewrites = Array.isArray(config.rewrites)
    ? config.rewrites
    : Array.isArray(config.routes)
      ? config.routes
      : [];

  const hasSpaRewrite = rewrites.some((entry) => {
    const source = entry.source ?? entry.src;
    const destination = entry.destination ?? entry.dest;

    return (
      typeof source === "string" &&
      typeof destination === "string" &&
      (source === "/(.*)" || source === "/*" || source === "/:path*") &&
      destination === "/index.html"
    );
  });

  assert.equal(
    hasSpaRewrite,
    true,
    "No catch-all rewrite to /index.html found. Direct route navigation will 404 in production.",
  );
});
