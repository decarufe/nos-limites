import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";
import fs from "fs";

// Ensure data directory exists
const dataDir = path.join(__dirname, "../../data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "noslimites.db");

console.log(`Connecting to database at: ${dbPath}`);

const sqlite = new Database(dbPath);

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
