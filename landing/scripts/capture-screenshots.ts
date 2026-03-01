/**
 * Playwright script to capture app screenshots for the landing site.
 *
 * Usage:
 *   npx playwright test scripts/capture-screenshots.ts
 *
 * Or run directly:
 *   npx playwright install chromium
 *   npx tsx scripts/capture-screenshots.ts
 *
 * Screenshots are saved to public/images/screenshots/
 */

import { chromium } from "playwright";
import { mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCREENSHOTS_DIR = join(
  __dirname,
  "..",
  "public",
  "images",
  "screenshots",
);

// Target the live app or local dev
const APP_URL = process.env.APP_URL || "https://app.nos-limites.com";

const VIEWPORT = { width: 390, height: 844 }; // iPhone 14 viewport

interface Screenshot {
  name: string;
  path: string;
  /** Setup function to navigate and prepare the page state */
  setup: (page: import("playwright").Page) => Promise<void>;
}

const screenshots: Screenshot[] = [
  {
    name: "login",
    path: "login.png",
    setup: async (page) => {
      await page.goto(`${APP_URL}/login`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
    },
  },
  {
    name: "home",
    path: "home.png",
    setup: async (page) => {
      await page.goto(`${APP_URL}/`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
    },
  },
  {
    name: "profile",
    path: "profile.png",
    setup: async (page) => {
      await page.goto(`${APP_URL}/profile`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
    },
  },
  {
    name: "scan",
    path: "scan.png",
    setup: async (page) => {
      await page.goto(`${APP_URL}/scan`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
    },
  },
  {
    name: "notifications",
    path: "notifications.png",
    setup: async (page) => {
      await page.goto(`${APP_URL}/notifications`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1000);
    },
  },
];

async function captureScreenshots() {
  // Ensure output directory exists
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2, // Retina
    locale: "fr-FR",
  });

  const page = await context.newPage();

  console.log(
    `📸 Capturing ${screenshots.length} screenshots from ${APP_URL}...`,
  );

  for (const shot of screenshots) {
    try {
      console.log(`  → ${shot.name}...`);
      await shot.setup(page);
      const filepath = join(SCREENSHOTS_DIR, shot.path);
      await page.screenshot({ path: filepath, fullPage: false });
      console.log(`    ✓ Saved to ${shot.path}`);
    } catch (error) {
      console.error(`    ✗ Failed: ${shot.name}`, error);
    }
  }

  await browser.close();
  console.log("✅ Done!");
}

captureScreenshots();
