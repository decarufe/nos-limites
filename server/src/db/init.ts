import { migrate } from "./migrate";
import { seed } from "./seed";

let initialized = false;

/**
 * Ensure database schema and baseline data are present.
 * Safe to call multiple times.
 */
export function ensureDatabaseInitialized() {
  if (initialized) {
    return;
  }

  console.log("Initializing database (migrations + seed)...");
  migrate();
  seed();
  initialized = true;
  console.log("Database initialization complete.");
}
