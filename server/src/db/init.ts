import { migrate } from "./migrate";
import { cleanupDuplicateSeeds } from "./cleanup-duplicates";
import { seed } from "./seed";

let initialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Ensure database schema and baseline data are present.
 * Safe to call multiple times — concurrent calls share the same promise.
 */
export function ensureDatabaseInitialized(): Promise<void> {
  if (initialized) {
    return Promise.resolve();
  }

  if (!initPromise) {
    initPromise = (async () => {
      console.log("Initializing database (migrations + seed)...");
      await migrate();
      await cleanupDuplicateSeeds();
      await seed();
      initialized = true;
      console.log("Database initialization complete.");
    })();
  }

  return initPromise;
}
