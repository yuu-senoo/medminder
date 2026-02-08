import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL || "file:local.db",
  authToken: process.env.TURSO_AUTH_TOKEN,
});

export const db = drizzle(client, { schema });

export async function initializeDatabase() {
  await client.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      line_user_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      schedule_type TEXT NOT NULL,
      schedule_times TEXT NOT NULL,
      schedule_days TEXT,
      schedule_interval INTEGER,
      start_date TEXT NOT NULL,
      end_date TEXT,
      note TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medication_logs (
      id TEXT PRIMARY KEY,
      medication_id TEXT NOT NULL REFERENCES medications(id),
      user_id TEXT NOT NULL REFERENCES users(id),
      scheduled_at TEXT NOT NULL,
      taken_at TEXT,
      status TEXT NOT NULL,
      source TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS family_members (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id),
      member_user_id TEXT NOT NULL REFERENCES users(id),
      role TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS family_invites (
      id TEXT PRIMARY KEY,
      owner_user_id TEXT NOT NULL REFERENCES users(id),
      invite_code TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used_by_user_id TEXT,
      created_at INTEGER NOT NULL
    );
  `);
}
