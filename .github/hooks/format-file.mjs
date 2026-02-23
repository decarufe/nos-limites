#!/usr/bin/env node

// PostToolUse hook: auto-format files touched by the agent.
// Reads hook input from stdin, runs Prettier on the affected file.

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { extname } from "node:path";

const FORMATTABLE = new Set([
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs",
    ".css", ".json", ".md", ".html", ".astro", ".yaml", ".yml",
]);

// Tools that produce a file path we can format
const FILE_TOOLS = new Set([
    "create_file",
    "replace_string_in_file",
    "multi_replace_string_in_file",
    "edit_notebook_file",
]);

let raw = "";
process.stdin.setEncoding("utf8");
for await (const chunk of process.stdin) raw += chunk;

try {
    const input = JSON.parse(raw);
    const toolName = input?.toolName ?? input?.tool_name ?? "";

    if (!FILE_TOOLS.has(toolName)) process.exit(0);

    // Extract file path from tool input
    const toolInput = input?.toolInput ?? input?.tool_input ?? {};
    const filePath = toolInput.filePath ?? toolInput.file_path ?? "";

    if (!filePath || !existsSync(filePath)) process.exit(0);

    const ext = extname(filePath).toLowerCase();
    if (!FORMATTABLE.has(ext)) process.exit(0);

    execFileSync("npx", ["prettier", "--write", filePath], {
        stdio: "ignore",
        timeout: 10_000,
        shell: true, // needed on Windows for npx
    });
} catch {
    // Non-blocking: formatting failure should never stop the agent
    process.exit(0);
}
