import { Router } from "express";
import { testConnection, sqlite } from "../db/connection";

const router = Router();

router.get("/health", (req, res) => {
  console.log("[DB Query] SELECT 1 (health check)");
  const dbConnected = testConnection();

  // Also verify we can count tables to prove real DB access
  let tableCount = 0;
  try {
    const result = sqlite
      .prepare(
        "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'"
      )
      .get() as { count: number };
    tableCount = result.count;
    console.log(`[DB Query] SELECT COUNT(*) FROM sqlite_master => ${tableCount} tables`);
  } catch (error) {
    console.error("[DB Error] Failed to count tables:", error);
  }

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "ok" : "error",
    database: dbConnected ? "connected" : "disconnected",
    tables: tableCount,
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

export default router;
