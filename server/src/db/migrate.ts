import { sqlite } from "./connection";
import * as schema from "./schema";

/**
 * Apply database migrations - creates all tables from the schema.
 * Uses IF NOT EXISTS to be idempotent.
 */
export function migrate() {
  console.log("Running database migrations...");

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      auth_provider TEXT,
      auth_provider_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS magic_links (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invitee_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      invitation_token TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS limit_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      image_url TEXT,
      sort_order INTEGER
    );

    CREATE TABLE IF NOT EXISTS limit_subcategories (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES limit_categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER
    );

    CREATE TABLE IF NOT EXISTS limits (
      id TEXT PRIMARY KEY,
      subcategory_id TEXT NOT NULL REFERENCES limit_subcategories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      sort_order INTEGER
    );

    CREATE TABLE IF NOT EXISTS user_limits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      relationship_id TEXT NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
      limit_id TEXT NOT NULL REFERENCES limits(id) ON DELETE CASCADE,
      is_accepted INTEGER DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, relationship_id, limit_id)
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      related_user_id TEXT REFERENCES users(id),
      related_relationship_id TEXT REFERENCES relationships(id),
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS blocked_users (
      id TEXT PRIMARY KEY,
      blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(blocker_id, blocked_id)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
    CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
    CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email);
    CREATE INDEX IF NOT EXISTS idx_relationships_inviter ON relationships(inviter_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_invitee ON relationships(invitee_id);
    CREATE INDEX IF NOT EXISTS idx_relationships_token ON relationships(invitation_token);
    CREATE INDEX IF NOT EXISTS idx_limit_subcategories_category ON limit_subcategories(category_id);
    CREATE INDEX IF NOT EXISTS idx_limits_subcategory ON limits(subcategory_id);
    CREATE INDEX IF NOT EXISTS idx_user_limits_user ON user_limits(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_limits_relationship ON user_limits(relationship_id);
    CREATE INDEX IF NOT EXISTS idx_user_limits_limit ON user_limits(limit_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
    CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read);
    CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id);
    CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id);
  `);

  console.log("Database migrations completed successfully.");
}

if (require.main === module) {
  migrate();
}
