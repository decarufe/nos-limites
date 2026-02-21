import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { db, testConnection } from "./db/connection";
import healthRouter from "./routes/health";

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  })
);
app.use(express.json());

// Routes
app.use("/api", healthRouter);

// TODO: Add routes as they are implemented
// app.use("/api/auth", authRouter);
// app.use("/api/profile", profileRouter);
// app.use("/api/relationships", relationshipsRouter);
// app.use("/api/limits", limitsRouter);
// app.use("/api/notifications", notificationsRouter);

// Start server
app.listen(PORT, () => {
  const connected = testConnection();
  console.log(`Server running on port ${PORT}`);
  console.log(`Database status: ${connected ? "connected" : "disconnected"}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

export default app;
