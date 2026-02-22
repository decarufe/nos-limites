import Database, { type Database as DatabaseType } from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

function resolveDatabasePath(): string {
  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim();
  }

  if (process.env.VERCEL) {
    return path.join("/tmp", "noslimites.db");
  }

  const dataDir = path.join(__dirname, "../../data");
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  return path.join(dataDir, "noslimites.db");
}

const dbPath = resolveDatabasePath();

console.log(`Connecting to database at: ${dbPath}`);

const sqlite: DatabaseType = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

export function testConnection(): boolean {
  try {
    sqlite.prepare("SELECT 1").get();
    console.log("Database connection established successfully.");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}

export { sqlite };
