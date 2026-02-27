import { Router } from "express";
import { testConnection, client } from "../db/connection";

const router = Router();

router.get("/health", async (req, res) => {
  console.log("[DB Query] SELECT 1 (health check)");
  const dbConnected = await testConnection();

  // Also verify we can count tables to prove real DB access
  let tableCount = 0;
  try {
    const result = await client.execute(
      "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table'",
    );
    tableCount = Number(result.rows[0].count);
    console.log(
      `[DB Query] SELECT COUNT(*) FROM sqlite_master => ${tableCount} tables`,
    );
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
