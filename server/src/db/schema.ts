import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

// Users table
export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").unique().notNull(),
  displayName: text("display_name").notNull(),
  avatarUrl: text("avatar_url"),
  authProvider: text("auth_provider"), // 'magic_link', 'google', 'facebook'
  authProviderId: text("auth_provider_id"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Sessions table
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  token: text("token").unique().notNull(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Magic links table
export const magicLinks = sqliteTable("magic_links", {
  id: text("id").primaryKey(),
  email: text("email").notNull(),
  token: text("token").unique().notNull(),
  expiresAt: text("expires_at").notNull(),
  used: integer("used", { mode: "boolean" }).default(false),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Relationships table
export const relationships = sqliteTable("relationships", {
  id: text("id").primaryKey(),
  inviterId: text("inviter_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  inviteeId: text("invitee_id").references(() => users.id, {
    onDelete: "cascade",
  }),
  invitationToken: text("invitation_token").unique().notNull(),
  status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'declined', 'blocked'
  name: text("name"), // Optional user-defined label for the invitation
  activeCategories: text("active_categories"), // JSON array of enabled category names
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Limit categories table
export const limitCategories = sqliteTable("limit_categories", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order"),
});

// Limit subcategories table
export const limitSubcategories = sqliteTable("limit_subcategories", {
  id: text("id").primaryKey(),
  categoryId: text("category_id")
    .notNull()
    .references(() => limitCategories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  sortOrder: integer("sort_order"),
});

// Limits table
export const limits = sqliteTable("limits", {
  id: text("id").primaryKey(),
  subcategoryId: text("subcategory_id")
    .notNull()
    .references(() => limitSubcategories.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  imageUrl: text("image_url"),
  sortOrder: integer("sort_order"),
});

// User limits table (which limits a user accepts for a relationship)
export const userLimits = sqliteTable("user_limits", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  relationshipId: text("relationship_id")
    .notNull()
    .references(() => relationships.id, { onDelete: "cascade" }),
  limitId: text("limit_id")
    .notNull()
    .references(() => limits.id, { onDelete: "cascade" }),
  isAccepted: integer("is_accepted", { mode: "boolean" }).default(false),
  note: text("note"),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  updatedAt: text("updated_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Notifications table
export const notifications = sqliteTable("notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'relation_request', 'relation_accepted', 'new_common_limit', 'limit_removed', 'relation_deleted'
  title: text("title").notNull(),
  message: text("message").notNull(),
  relatedUserId: text("related_user_id").references(() => users.id),
  relatedRelationshipId: text("related_relationship_id").references(
    () => relationships.id,
    { onDelete: "set null" },
  ),
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Devices table (long-lived refresh tokens per browser/device)
export const devices = sqliteTable("devices", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  deviceName: text("device_name"),
  refreshTokenHash: text("refresh_token_hash").notNull(),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  lastSeen: text("last_seen")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
  expiresAt: text("expires_at").notNull(),
  revoked: integer("revoked", { mode: "boolean" }).default(false),
});

// Relationship category change requests table
export const relationshipCategoryRequests = sqliteTable(
  "relationship_category_requests",
  {
    id: text("id").primaryKey(),
    relationshipId: text("relationship_id")
      .notNull()
      .references(() => relationships.id, { onDelete: "cascade" }),
    requesterId: text("requester_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    proposedCategories: text("proposed_categories").notNull(), // JSON array of category names
    status: text("status").notNull().default("pending"), // 'pending', 'accepted', 'declined'
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
);

// Notification email settings table
export const notificationEmailSettings = sqliteTable(
  "notification_email_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    // Digest settings (periodic summary)
    digestEnabled: integer("digest_enabled", { mode: "boolean" }).default(true),
    digestFrequency: text("digest_frequency").notNull().default("daily"), // 'daily', 'weekly'
    digestTime: text("digest_time").default("08:00"), // HH:MM for digest send time
    digestWeeklyDay: integer("digest_weekly_day").default(1), // 0-6, 0=Sunday (for weekly digest)
    lastDigestSentAt: text("last_digest_sent_at"),
    // Realtime notification settings
    realtimeEnabled: integer("realtime_enabled", { mode: "boolean" }).default(
      true,
    ),
    lastRealtimeSentAt: text("last_realtime_sent_at"),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
);

// Email notification log — tracks which notifications were included in which email
export const emailNotificationLog = sqliteTable("email_notification_log", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  notificationId: text("notification_id")
    .notNull()
    .references(() => notifications.id, { onDelete: "cascade" }),
  emailType: text("email_type").notNull(), // 'digest', 'realtime'
  sentAt: text("sent_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});

// Blocked users table
export const blockedUsers = sqliteTable("blocked_users", {
  id: text("id").primaryKey(),
  blockerId: text("blocker_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  blockedId: text("blocked_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  createdAt: text("created_at")
    .notNull()
    .$defaultFn(() => new Date().toISOString()),
});
