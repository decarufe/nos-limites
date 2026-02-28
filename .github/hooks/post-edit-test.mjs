#!/usr/bin/env node

// PostToolUse hook: run relevant tests after source code modifications.
// If tests fail, exits non-zero so the agent stops and can propose a fix.

import { execSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, extname, resolve, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..", "..");

const SOURCE_EXTS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]);

// Tools that modify files
const FILE_TOOLS = new Set([
  "create_file",
  "replace_string_in_file",
  "multi_replace_string_in_file",
]);

// ---------------------------------------------------------------------------
// Read hook input from stdin
// ---------------------------------------------------------------------------
let raw = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) raw += chunk;

let input;
try {
  input = JSON.parse(raw);
} catch {
  process.exit(0);
}

const toolName = input?.toolName ?? input?.tool_name ?? "";
if (!FILE_TOOLS.has(toolName)) process.exit(0);

// ---------------------------------------------------------------------------
// Extract all modified file paths
// ---------------------------------------------------------------------------
const toolInput = input?.toolInput ?? input?.tool_input ?? {};
let filePaths = [];

if (toolName === "multi_replace_string_in_file") {
  const replacements = toolInput.replacements ?? [];
  filePaths = replacements
    .map((r) => r.filePath ?? r.file_path ?? "")
    .filter(Boolean);
} else {
  const fp = toolInput.filePath ?? toolInput.file_path ?? "";
  if (fp) filePaths = [fp];
}

if (filePaths.length === 0) process.exit(0);

// ---------------------------------------------------------------------------
// Determine which project areas are affected
// ---------------------------------------------------------------------------
const areas = new Set(); // "server" | "client"

for (const fp of filePaths) {
  if (!existsSync(fp)) continue;
  const ext = extname(fp).toLowerCase();
  if (!SOURCE_EXTS.has(ext)) continue;

  const rel = relative(PROJECT_ROOT, resolve(fp)).split(sep).join("/");

  if (rel.startsWith("server/src/")) areas.add("server");
  else if (rel.startsWith("client/src/")) areas.add("client");
}

if (areas.size === 0) process.exit(0);

// ---------------------------------------------------------------------------
// Run tests for each affected area
// ---------------------------------------------------------------------------
const failures = [];

for (const area of areas) {
  let cmd, cwd;

  if (area === "server") {
    cmd = "npm test";
    cwd = resolve(PROJECT_ROOT, "server");
  } else if (area === "client") {
    cmd = "npx tsc --noEmit";
    cwd = resolve(PROJECT_ROOT, "client");
  }

  try {
    execSync(cmd, {
      cwd,
      stdio: "pipe",
      timeout: 60_000,
      shell: true,
    });
  } catch (err) {
    const stdout = err.stdout?.toString() ?? "";
    const stderr = err.stderr?.toString() ?? "";
    const output = (stdout + "\n" + stderr).trim();
    failures.push({ area, cmd, output });
  }
}

if (failures.length === 0) process.exit(0);

// ---------------------------------------------------------------------------
// Report failures — non-zero exit tells the agent to stop and fix
// ---------------------------------------------------------------------------
for (const f of failures) {
  console.error(`\n❌ Tests failed in ${f.area} (${f.cmd})`);
  if (f.output) {
    // Truncate to last 3000 chars to keep output manageable
    const tail = f.output.slice(-3000);
    console.error(`\n--- Output ---\n${tail}\n--------------`);
  }
}

process.exit(1);
