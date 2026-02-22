import { sqlite } from "./connection";

/**
 * Verify all tables exist with the correct columns.
 * This script is used for infrastructure testing.
 */
function verifySchema() {
  console.log("Verifying database schema...\n");

  const expectedTables: Record<string, string[]> = {
    users: ["id", "email", "display_name", "avatar_url", "auth_provider", "auth_provider_id", "created_at", "updated_at"],
    sessions: ["id", "user_id", "token", "expires_at", "created_at"],
    magic_links: ["id", "email", "token", "expires_at", "used", "created_at"],
    relationships: ["id", "inviter_id", "invitee_id", "invitation_token", "status", "created_at", "updated_at"],
    limit_categories: ["id", "name", "description", "icon", "image_url", "sort_order"],
    limit_subcategories: ["id", "category_id", "name", "sort_order"],
    limits: ["id", "subcategory_id", "name", "description", "image_url", "sort_order"],
    user_limits: ["id", "user_id", "relationship_id", "limit_id", "is_accepted", "note", "created_at", "updated_at"],
    notifications: ["id", "user_id", "type", "title", "message", "related_user_id", "related_relationship_id", "is_read", "created_at"],
    blocked_users: ["id", "blocker_id", "blocked_id", "created_at"],
  };

  let allPassed = true;

  // Get all tables
  const tables = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
    .all() as { name: string }[];

  const tableNames = tables.map((t) => t.name);
  console.log(`Found tables: ${tableNames.join(", ")}\n`);

  for (const [tableName, expectedColumns] of Object.entries(expectedTables)) {
    if (!tableNames.includes(tableName)) {
      console.log(`❌ MISSING TABLE: ${tableName}`);
      allPassed = false;
      continue;
    }

    const columns = sqlite
      .prepare(`PRAGMA table_info(${tableName})`)
      .all() as { name: string }[];

    const columnNames = columns.map((c) => c.name);

    const missingColumns = expectedColumns.filter((col) => !columnNames.includes(col));
    const extraColumns = columnNames.filter((col) => !expectedColumns.includes(col));

    if (missingColumns.length === 0) {
      console.log(`✅ ${tableName}: All ${expectedColumns.length} columns present (${columnNames.join(", ")})`);
    } else {
      console.log(`❌ ${tableName}: Missing columns: ${missingColumns.join(", ")}`);
      allPassed = false;
    }

    if (extraColumns.length > 0) {
      console.log(`   ℹ️  Extra columns in ${tableName}: ${extraColumns.join(", ")}`);
    }
  }

  // Check for unexpected tables
  const expectedTableNames = Object.keys(expectedTables);
  const unexpectedTables = tableNames.filter((t) => !expectedTableNames.includes(t));
  if (unexpectedTables.length > 0) {
    console.log(`\nℹ️  Additional tables found: ${unexpectedTables.join(", ")}`);
  }

  console.log(`\n${allPassed ? "✅ ALL SCHEMA CHECKS PASSED" : "❌ SOME CHECKS FAILED"}`);
  process.exit(allPassed ? 0 : 1);
}

verifySchema();
