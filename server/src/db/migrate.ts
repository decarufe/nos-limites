import { client } from "./connection";

/**
 * Apply database migrations - creates all tables from the schema.
 * Uses IF NOT EXISTS to be idempotent.
 * Uses client.batch() to execute multiple statements in a single round-trip.
 */
export async function migrate() {
  console.log("Running database migrations...");

  await client.batch(
    [
      `CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      auth_provider TEXT,
      auth_provider_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

      `CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

      `CREATE TABLE IF NOT EXISTS magic_links (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

      `CREATE TABLE IF NOT EXISTS relationships (
      id TEXT PRIMARY KEY,
      inviter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      invitee_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      invitation_token TEXT UNIQUE NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      active_categories TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

      `CREATE TABLE IF NOT EXISTS limit_categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      image_url TEXT,
      sort_order INTEGER
    )`,

      `CREATE TABLE IF NOT EXISTS limit_subcategories (
      id TEXT PRIMARY KEY,
      category_id TEXT NOT NULL REFERENCES limit_categories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      sort_order INTEGER
    )`,

      `CREATE TABLE IF NOT EXISTS limits (
      id TEXT PRIMARY KEY,
      subcategory_id TEXT NOT NULL REFERENCES limit_subcategories(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      sort_order INTEGER
    )`,

      `CREATE TABLE IF NOT EXISTS user_limits (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      relationship_id TEXT NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
      limit_id TEXT NOT NULL REFERENCES limits(id) ON DELETE CASCADE,
      is_accepted INTEGER DEFAULT 0,
      note TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id, relationship_id, limit_id)
    )`,

      `CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      related_user_id TEXT REFERENCES users(id),
      related_relationship_id TEXT REFERENCES relationships(id),
      is_read INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

      `CREATE TABLE IF NOT EXISTS blocked_users (
      id TEXT PRIMARY KEY,
      blocker_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      blocked_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(blocker_id, blocked_id)
    )`,

      `CREATE TABLE IF NOT EXISTS devices (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      device_name TEXT,
      refresh_token_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_seen TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      revoked INTEGER DEFAULT 0
    )`,

      `CREATE TABLE IF NOT EXISTS relationship_category_requests (
      id TEXT PRIMARY KEY,
      relationship_id TEXT NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
      requester_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      proposed_categories TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

      `CREATE TABLE IF NOT EXISTS notification_email_settings (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      digest_enabled INTEGER DEFAULT 1,
      digest_frequency TEXT NOT NULL DEFAULT 'daily',
      digest_time TEXT DEFAULT '08:00',
      digest_weekly_day INTEGER DEFAULT 1,
      realtime_enabled INTEGER DEFAULT 1,
      last_digest_sent_at TEXT,
      last_realtime_sent_at TEXT,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(user_id)
    )`,

      `CREATE TABLE IF NOT EXISTS email_notification_log (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      notification_id TEXT NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
      email_type TEXT NOT NULL,
      sent_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,

      // Indexes
      `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)`,
      `CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token)`,
      `CREATE INDEX IF NOT EXISTS idx_magic_links_email ON magic_links(email)`,
      `CREATE INDEX IF NOT EXISTS idx_relationships_inviter ON relationships(inviter_id)`,
      `CREATE INDEX IF NOT EXISTS idx_relationships_invitee ON relationships(invitee_id)`,
      `CREATE INDEX IF NOT EXISTS idx_relationships_token ON relationships(invitation_token)`,
      `CREATE INDEX IF NOT EXISTS idx_limit_subcategories_category ON limit_subcategories(category_id)`,
      `CREATE INDEX IF NOT EXISTS idx_limits_subcategory ON limits(subcategory_id)`,
      `CREATE INDEX IF NOT EXISTS idx_user_limits_user ON user_limits(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_user_limits_relationship ON user_limits(relationship_id)`,
      `CREATE INDEX IF NOT EXISTS idx_user_limits_limit ON user_limits(limit_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)`,
      `CREATE INDEX IF NOT EXISTS idx_blocked_users_blocker ON blocked_users(blocker_id)`,
      `CREATE INDEX IF NOT EXISTS idx_blocked_users_blocked ON blocked_users(blocked_id)`,
      `CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_devices_refresh_token_hash ON devices(refresh_token_hash)`,
      `CREATE INDEX IF NOT EXISTS idx_category_requests_relationship ON relationship_category_requests(relationship_id)`,
      `CREATE INDEX IF NOT EXISTS idx_category_requests_requester ON relationship_category_requests(requester_id)`,
      `CREATE INDEX IF NOT EXISTS idx_notification_email_settings_user ON notification_email_settings(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_email_notification_log_user ON email_notification_log(user_id)`,
      `CREATE INDEX IF NOT EXISTS idx_email_notification_log_notification ON email_notification_log(notification_id)`,
      `CREATE INDEX IF NOT EXISTS idx_email_notification_log_sent_at ON email_notification_log(sent_at)`,
    ],
    "write",
  );

  // Add active_categories column to relationships table if it doesn't exist
  // (migration for existing databases)
  try {
    await client.execute(
      "ALTER TABLE relationships ADD COLUMN active_categories TEXT",
    );
    console.log("Added active_categories column to relationships table.");
  } catch {
    // Column already exists — safe to ignore
  }

  // Add name column to relationships table if it doesn't exist
  // (migration for existing databases)
  try {
    await client.execute(
      "ALTER TABLE relationships ADD COLUMN name TEXT",
    );
    console.log("Added name column to relationships table.");
  } catch {
    // Column already exists — safe to ignore
  }

  // ── Notification email settings migration (v2: digest + realtime) ──
  // Add new columns to notification_email_settings for existing databases.
  // Old columns (enabled, frequency, delay_hours, daily_time, weekly_days,
  // last_email_sent_at) are kept in the DB for backward compatibility but
  // are no longer referenced by the Drizzle schema or application code.
  const newSettingsColumns = [
    "ALTER TABLE notification_email_settings ADD COLUMN digest_enabled INTEGER DEFAULT 1",
    "ALTER TABLE notification_email_settings ADD COLUMN digest_frequency TEXT NOT NULL DEFAULT 'daily'",
    "ALTER TABLE notification_email_settings ADD COLUMN digest_time TEXT DEFAULT '08:00'",
    "ALTER TABLE notification_email_settings ADD COLUMN digest_weekly_day INTEGER DEFAULT 1",
    "ALTER TABLE notification_email_settings ADD COLUMN realtime_enabled INTEGER DEFAULT 1",
    "ALTER TABLE notification_email_settings ADD COLUMN last_digest_sent_at TEXT",
    "ALTER TABLE notification_email_settings ADD COLUMN last_realtime_sent_at TEXT",
  ];
  for (const stmt of newSettingsColumns) {
    try {
      await client.execute(stmt);
    } catch {
      // Column already exists — safe to ignore
    }
  }

  // Migrate existing settings data: copy old values into new columns
  try {
    await client.execute(`
      UPDATE notification_email_settings
      SET
        digest_frequency = CASE
          WHEN frequency = 'weekly' THEN 'weekly'
          ELSE 'daily'
        END,
        digest_time = COALESCE(daily_time, '08:00'),
        digest_enabled = COALESCE(enabled, 1),
        realtime_enabled = CASE
          WHEN frequency IN ('immediately', 'delayed') THEN 1
          ELSE 0
        END,
        last_digest_sent_at = last_email_sent_at
      WHERE digest_frequency = 'daily' AND last_digest_sent_at IS NULL AND frequency IS NOT NULL
    `);
  } catch {
    // Migration already applied or no rows to migrate
  }

  console.log("Database migrations completed successfully.");
}

if (require.main === module) {
  migrate().catch(console.error);
}
