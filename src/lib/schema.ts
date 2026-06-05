import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  lineUserId: text("line_user_id"),
  createdAt: integer("created_at").notNull(),
});

export const medications = sqliteTable("medications", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  dosage: text("dosage").notNull(),
  scheduleType: text("schedule_type").notNull(), // "daily" | "specific_days" | "interval"
  scheduleTimes: text("schedule_times").notNull(), // JSON: ["08:00","20:00"]
  scheduleDays: text("schedule_days"), // JSON: ["mon","wed","fri"]
  scheduleInterval: integer("schedule_interval"), // n日おき
  startDate: text("start_date").notNull(), // YYYY-MM-DD
  endDate: text("end_date"), // YYYY-MM-DD
  note: text("note"),
  isActive: integer("is_active").notNull().default(1),
  createdAt: integer("created_at").notNull(),
});

export const medicationLogs = sqliteTable("medication_logs", {
  id: text("id").primaryKey(),
  medicationId: text("medication_id")
    .notNull()
    .references(() => medications.id),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  scheduledAt: text("scheduled_at").notNull(), // ISO 8601
  takenAt: text("taken_at"), // ISO 8601
  status: text("status").notNull(), // "pending" | "taken" | "skipped" | "missed"
  source: text("source").notNull(), // "web" | "line"
  createdAt: integer("created_at").notNull(),
});

export const familyMembers = sqliteTable("family_members", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  memberUserId: text("member_user_id")
    .notNull()
    .references(() => users.id),
  role: text("role").notNull(), // "viewer" | "admin"
  createdAt: integer("created_at").notNull(),
});

export const lineLinkCodes = sqliteTable("line_link_codes", {
  code: text("code").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  expiresAt: integer("expires_at").notNull(), // epoch ms
  createdAt: integer("created_at").notNull(),
});

export const familyInvites = sqliteTable("family_invites", {
  id: text("id").primaryKey(),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  inviteCode: text("invite_code").notNull().unique(),
  role: text("role").notNull(), // "viewer" | "admin"
  expiresAt: integer("expires_at").notNull(),
  usedByUserId: text("used_by_user_id"),
  createdAt: integer("created_at").notNull(),
});
