const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const SERVER_CMD = "node";
const SERVER_ARGS = ["server/dist/index.js"];
const HEALTH_URL = "http://localhost:3001/api/health";
const START_TIMEOUT = 10000; // ms

function waitForHealth(url, timeoutMs) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    (async function poll() {
      try {
        const res = await fetch(url);
        if (res.ok) return resolve();
      } catch (e) {
        // ignore
      }
      if (Date.now() - start > timeoutMs)
        return reject(new Error("Health check timeout"));
      setTimeout(poll, 200);
    })();
  });
}

async function main() {
  const testsDir = path.join(__dirname);
  const files = fs
    .readdirSync(testsDir)
    .filter((f) => f.match(/^test-.*\.m?js$/));
  let exitCode = 0;

  for (const f of files) {
    console.log("\nStarting server for test: %s", f);
    const server = spawn(SERVER_CMD, SERVER_ARGS, {
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "development" },
    });

    server.on("error", (err) => {
      console.error("Failed to start server process:", err);
      process.exit(1);
    });

    try {
      await waitForHealth(HEALTH_URL, START_TIMEOUT);
      console.log("Server healthy, running: " + f);
    } catch (err) {
      console.error("Server did not become healthy for test %s: %s", f, err);
      server.kill();
      process.exit(1);
    }

    console.log("\nRunning: " + f);
    try {
      execSync("node " + path.join("tests", f), {
        stdio: "inherit",
        env: { ...process.env, VERCEL: "1" },
      });
    } catch (err) {
      exitCode = err.status || 1;
      console.error("Test failed:", f);
      try {
        server.kill();
      } catch {}
      break;
    }

    console.log("\nShutting down server for: %s", f);
    try {
      server.kill();
    } catch (e) {
      /* ignore */
    }
  }

  process.exit(exitCode);
}

main();
