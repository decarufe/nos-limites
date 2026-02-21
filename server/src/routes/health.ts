import { Router } from "express";
import { testConnection } from "../db/connection";

const router = Router();

router.get("/health", (req, res) => {
  const dbConnected = testConnection();

  res.status(dbConnected ? 200 : 503).json({
    status: dbConnected ? "ok" : "error",
    database: dbConnected ? "connected" : "disconnected",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

export default router;
