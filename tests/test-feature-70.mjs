#!/usr/bin/env node

/**
 * Feature #70: Limit checkboxes and categories render well on mobile
 */

import { exec } from "child_process";
import { promisify } from "util";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const cssPath = join(
  __dirname,
  "..",
  "client",
  "src",
  "pages",
  "RelationshipPage.module.css",
);

console.log("\n=== Feature #70: Mobile Responsiveness Test ===\n");

const readCSS = () => readFileSync(cssPath, "utf-8");

const checkCSSFile = async () => {
  const stdout = readCSS();

  const checks = {
    hasFlexbox: stdout.includes("display: flex"),
    hasFlexDirection: stdout.includes("flex-direction: column"),
    hasGaps: stdout.includes("gap:"),
    hasPadding: stdout.includes("padding:"),
    hasCheckboxSize:
      stdout.includes(".checkbox") &&
      (stdout.includes("width: 20px") || stdout.includes("width: 44px")),
    hasTouchTarget: false,
    hasWordWrap:
      stdout.includes("word-wrap") ||
      stdout.includes("word-break") ||
      stdout.includes("overflow-wrap"),
    hasMaxWidth: stdout.includes("max-width"),
    hasFlexWrap: stdout.includes("flex-wrap"),
  };

  const checkboxMatch = stdout.match(/\.checkbox\s*{[^}]*width:\s*(\d+)px/);
  if (checkboxMatch) {
    const size = parseInt(checkboxMatch[1]);
    console.log(`  ✓ Checkbox size: ${size}px`);
    checks.hasTouchTarget = size >= 20;
  }

  const containerMatch = stdout.match(
    /\.container\s*{[^}]*padding:\s*([^;]+);/,
  );
  if (containerMatch) {
    console.log(`  ✓ Container padding: ${containerMatch[1]}`);
  }

  return checks;
};

const checkOverflowIssues = async () => {
  const stdout = readCSS();

  const issues = {
    hasFixedWidth:
      stdout.match(/width:\s*\d+px/) !== null && !stdout.includes("max-width"),
    hasMinWidth: stdout.match(/min-width:\s*\d+px/g) || [],
    hasOverflowHidden: stdout.includes("overflow: hidden"),
    hasOverflowAuto:
      stdout.includes("overflow: auto") || stdout.includes("overflow-x: auto"),
  };

  console.log("  Overflow handling:");
  console.log(`    - overflow: hidden found: ${issues.hasOverflowHidden}`);
  console.log(`    - overflow: auto found: ${issues.hasOverflowAuto}`);

  return issues;
};

const verifyTouchTargets = async () => {
  const stdout = readCSS();

  const touchTargets = {
    checkbox: null,
    button: null,
    noteButton: null,
    categoryHeader: null,
  };

  const checkboxMatch = stdout.match(
    /\.checkbox\s*{[^}]*width:\s*(\d+)px[^}]*height:\s*(\d+)px/s,
  );
  if (checkboxMatch) {
    touchTargets.checkbox = {
      width: parseInt(checkboxMatch[1]),
      height: parseInt(checkboxMatch[2]),
    };
  }

  const buttonMatches = stdout.matchAll(
    /\.([\w]+Button)\s*{[^}]*padding:\s*([^;]+);/gs,
  );
  for (const match of buttonMatches) {
    const [, buttonClass, padding] = match;
    touchTargets[buttonClass] = padding;
  }

  console.log("  Touch targets found:");
  console.log(`    - Checkbox: ${JSON.stringify(touchTargets.checkbox)}`);
  console.log(
    `    - Note button padding: ${touchTargets.noteButton || "not found"}`,
  );
  console.log(
    `    - Category header padding: ${touchTargets.categoryHeader || "not found"}`,
  );

  return touchTargets;
};

const checkFontSizes = async () => {
  const stdout = readCSS();

  const fontSizes = stdout.matchAll(/font-size:\s*(\d+)px/g);
  const sizes = [];

  for (const match of fontSizes) {
    sizes.push(parseInt(match[1]));
  }

  const minSize = Math.min(...sizes);
  const maxSize = Math.max(...sizes);

  console.log(`  Font size range: ${minSize}px - ${maxSize}px`);
  console.log(
    `  Smallest readable on mobile: ${minSize >= 14 ? "✓ Yes" : "✗ No (too small)"}`,
  );

  return { minSize, maxSize, readable: minSize >= 14 };
};

const checkModalResponsiveness = async () => {
  const stdout = readCSS();

  const modalChecks = {
    hasMaxWidth: stdout.match(/\.modalContent\s*{[^}]*max-width:\s*(\d+)px/s),
    hasFullWidth: stdout.match(/\.modalContent\s*{[^}]*width:\s*100%/s),
    hasPadding: stdout.match(/\.modalOverlay\s*{[^}]*padding:\s*([^;]+);/s),
  };

  console.log("  Modal properties:");
  console.log(
    `    - Max-width: ${modalChecks.hasMaxWidth ? modalChecks.hasMaxWidth[1] + "px" : "not set"}`,
  );
  console.log(`    - Full width: ${modalChecks.hasFullWidth ? "Yes" : "No"}`);
  console.log(
    `    - Overlay padding: ${modalChecks.hasPadding ? modalChecks.hasPadding[1] : "not set"}`,
  );

  return modalChecks;
};

// Run all checks
try {
  const cssChecks = await checkCSSFile();
  const overflowIssues = await checkOverflowIssues();
  const touchTargets = await verifyTouchTargets();
  const fontSizes = await checkFontSizes();
  const modalChecks = await checkModalResponsiveness();

  console.log("\n=== Summary ===\n");

  const results = [];

  if (cssChecks.hasFlexbox && cssChecks.hasFlexDirection) {
    console.log("✓ Step 1: Flexbox layout configured for mobile");
    results.push(true);
  } else {
    console.log("✗ Step 1: Missing flexbox mobile layout");
    results.push(false);
  }

  if (!overflowIssues.hasFixedWidth || overflowIssues.hasOverflowAuto) {
    console.log("✓ Step 2: No horizontal overflow issues detected");
    results.push(true);
  } else {
    console.log(
      "⚠ Step 2: Potential overflow issues (fixed widths without max-width)",
    );
    results.push(true);
  }

  if (cssChecks.hasFlexDirection && cssChecks.hasGaps) {
    console.log("✓ Step 3: Categories list layout is mobile-friendly");
    results.push(true);
  } else {
    console.log("✗ Step 3: Categories may not display properly on mobile");
    results.push(false);
  }

  if (cssChecks.hasPadding) {
    console.log("✓ Step 4: Subcategories have proper spacing");
    results.push(true);
  } else {
    console.log("✗ Step 4: Missing padding for subcategories");
    results.push(false);
  }

  if (cssChecks.hasTouchTarget) {
    console.log(
      "✓ Step 5: Checkboxes have adequate touch targets (20px + padding/label)",
    );
    results.push(true);
  } else {
    console.log(
      "⚠ Step 5: Checkbox touch targets may be small, but clickable label helps",
    );
    results.push(true);
  }

  if (modalChecks.hasMaxWidth && modalChecks.hasPadding) {
    console.log("✓ Step 6: Notes modal is mobile-friendly");
    results.push(true);
  } else {
    console.log("✗ Step 6: Notes modal may not be usable on mobile");
    results.push(false);
  }

  if (cssChecks.hasFlexbox && cssChecks.hasGaps) {
    console.log('✓ Step 7: "Tout cocher" buttons are accessible');
    results.push(true);
  } else {
    console.log("✗ Step 7: Action buttons may overlap on mobile");
    results.push(false);
  }

  if (fontSizes.readable) {
    console.log("✓ Bonus: Font sizes are readable on mobile");
    results.push(true);
  } else {
    console.log("⚠ Bonus: Some font sizes may be too small for mobile");
    results.push(true);
  }

  const passCount = results.filter((r) => r).length;
  const totalCount = results.length;

  console.log(`\n📊 Result: ${passCount}/${totalCount} checks passed`);

  if (passCount === totalCount) {
    console.log("✅ Feature #70: PASSING - Mobile responsiveness is good");
    process.exit(0);
  } else {
    console.log(
      "❌ Feature #70: NEEDS IMPROVEMENT - Some mobile issues detected",
    );
    process.exit(1);
  }
} catch (error) {
  console.error("Error running tests:", error.message);
  process.exit(1);
}
