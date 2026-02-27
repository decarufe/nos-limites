import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { createCorsOptions } from "./config/cors";
import { db, testConnection } from "./db/connection";
import { ensureDatabaseInitialized } from "./db/init";
import healthRouter from "./routes/health";
import limitsRouter from "./routes/limits";
import authRouter from "./routes/auth";
import profileRouter from "./routes/profile";
import relationshipsRouter from "./routes/relationships";
import notificationsRouter from "./routes/notifications";
import devicesRouter from "./routes/devices";

const initPromise = ensureDatabaseInitialized();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors(createCorsOptions()));
app.use(express.json());

// Wait for DB init before handling requests
app.use(async (req, res, next) => {
  await initPromise;
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[API] ${req.method} ${req.path}`);
  next();
});

// Routes
app.use("/api", healthRouter);
app.use("/api", limitsRouter);
app.use("/api", authRouter);
app.use("/api", profileRouter);
app.use("/api", relationshipsRouter);
app.use("/api", notificationsRouter);
app.use("/api", devicesRouter);

if (!process.env.VERCEL) {
  app.listen(PORT, async () => {
    const connected = await testConnection();
    console.log(`Server running on port ${PORT}`);
    console.log(`Database status: ${connected ? "connected" : "disconnected"}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(
      `Limits categories: http://localhost:${PORT}/api/limits/categories`,
    );
    console.log(
      `Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? "configured" : "not configured"}`,
    );
  });
}

export default app;
