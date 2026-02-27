import { client } from "./connection";
import { v4 as uuid } from "uuid";

/**
 * Insert a test user for persistence verification.
 * Usage: tsx test-persistence.ts insert   - inserts the test user
 * Usage: tsx test-persistence.ts check    - checks if test user exists
 * Usage: tsx test-persistence.ts cleanup  - removes test data
 */
const action = process.argv[2] || "check";

const TEST_EMAIL = "RESTART_TEST_12345@test.com";
const TEST_NAME = "RESTART_TEST_USER";

async function run() {
  switch (action) {
    case "insert": {
      const existing = await client.execute({
        sql: "SELECT id FROM users WHERE email = ?",
        args: [TEST_EMAIL],
      });

      if (existing.rows.length > 0) {
        console.log(`Test user already exists with id: ${existing.rows[0].id}`);
      } else {
        const id = uuid();
        await client.execute({
          sql: "INSERT INTO users (id, email, display_name, auth_provider, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)",
          args: [
            id,
            TEST_EMAIL,
            TEST_NAME,
            "magic_link",
            new Date().toISOString(),
            new Date().toISOString(),
          ],
        });
        console.log(`Inserted test user with id: ${id}`);
      }
      break;
    }

    case "check": {
      const result = await client.execute({
        sql: "SELECT * FROM users WHERE email = ?",
        args: [TEST_EMAIL],
      });

      if (result.rows.length > 0) {
        console.log("✅ TEST USER FOUND - Data persists!");
        console.log(JSON.stringify(result.rows[0], null, 2));
      } else {
        console.log("❌ TEST USER NOT FOUND - Data did NOT persist!");
        process.exit(1);
      }
      break;
    }

    case "cleanup": {
      const result = await client.execute({
        sql: "DELETE FROM users WHERE email = ?",
        args: [TEST_EMAIL],
      });
      console.log(`Cleaned up ${result.rowsAffected} test user(s).`);
      break;
    }

    default:
      console.log("Usage: tsx test-persistence.ts [insert|check|cleanup]");
  }
}

run().catch(console.error);
