import { sqlite } from "./connection";
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

switch (action) {
  case "insert": {
    const existing = sqlite
      .prepare("SELECT id FROM users WHERE email = ?")
      .get(TEST_EMAIL) as { id: string } | undefined;

    if (existing) {
      console.log(`Test user already exists with id: ${existing.id}`);
    } else {
      const id = uuid();
      sqlite
        .prepare(
          "INSERT INTO users (id, email, display_name, auth_provider, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)"
        )
        .run(id, TEST_EMAIL, TEST_NAME, "magic_link", new Date().toISOString(), new Date().toISOString());
      console.log(`Inserted test user with id: ${id}`);
    }
    break;
  }

  case "check": {
    const user = sqlite
      .prepare("SELECT * FROM users WHERE email = ?")
      .get(TEST_EMAIL) as Record<string, unknown> | undefined;

    if (user) {
      console.log("✅ TEST USER FOUND - Data persists!");
      console.log(JSON.stringify(user, null, 2));
    } else {
      console.log("❌ TEST USER NOT FOUND - Data did NOT persist!");
      process.exit(1);
    }
    break;
  }

  case "cleanup": {
    const result = sqlite
      .prepare("DELETE FROM users WHERE email = ?")
      .run(TEST_EMAIL);
    console.log(`Cleaned up ${result.changes} test user(s).`);
    break;
  }

  default:
    console.log("Usage: tsx test-persistence.ts [insert|check|cleanup]");
}
