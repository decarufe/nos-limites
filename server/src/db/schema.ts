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
    () => relationships.id
  ),
  isRead: integer("is_read", { mode: "boolean" }).default(false),
  createdAt: text("created_at")
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
