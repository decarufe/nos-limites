import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

function createLibSqlClient(): Client {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

  if (url) {
    console.log(`Connecting to Turso database: ${url}`);
    return createClient({ url, authToken });
  }

  // Local development: use a local SQLite file via libSQL
  const localUrl = "file:./data/noslimites.db";
  console.log(`Connecting to local database: ${localUrl}`);
  return createClient({ url: localUrl });
}

export const client: Client = createLibSqlClient();

export const db = drizzle(client, { schema });

export async function testConnection(): Promise<boolean> {
  try {
    await client.execute("SELECT 1");
    console.log("Database connection established successfully.");
    return true;
  } catch (error) {
    console.error("Database connection failed:", error);
    return false;
  }
}
