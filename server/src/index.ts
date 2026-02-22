import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { db, testConnection } from "./db/connection";
import { ensureDatabaseInitialized } from "./db/init";
import healthRouter from "./routes/health";
import limitsRouter from "./routes/limits";
import authRouter from "./routes/auth";
import profileRouter from "./routes/profile";
import relationshipsRouter from "./routes/relationships";
import notificationsRouter from "./routes/notifications";

ensureDatabaseInitialized();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());

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

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    const connected = testConnection();
    console.log(`Server running on port ${PORT}`);
    console.log(`Database status: ${connected ? "connected" : "disconnected"}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);
    console.log(
      `Limits categories: http://localhost:${PORT}/api/limits/categories`,
    );
  });
}

export default app;
