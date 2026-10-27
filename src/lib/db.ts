import { createClient, type Client } from "@libsql/client";

let _client: Client | null = null;

export function getDb(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_URL ?? "file:study-planner.db",
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }
  return _client;
}

export async function initDb() {
  const db = getDb();
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#8b5cf6',
      teacher_name TEXT,
      schedule TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      description TEXT,
      type TEXT DEFAULT 'homework',
      due_date TEXT,
      due_time TEXT,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS exams (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT,
      topics TEXT,
      difficulty TEXT DEFAULT 'medium',
      status TEXT DEFAULT 'upcoming',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS study_sessions (
      id TEXT PRIMARY KEY,
      course_id TEXT REFERENCES courses(id) ON DELETE SET NULL,
      exam_id TEXT REFERENCES exams(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      date TEXT NOT NULL,
      start_time TEXT,
      duration_minutes INTEGER DEFAULT 30,
      type TEXT DEFAULT 'study',
      completed INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS materials (
      id TEXT PRIMARY KEY,
      course_id TEXT REFERENCES courses(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      content TEXT,
      type TEXT DEFAULT 'note',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS student_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      grade_level TEXT,
      school TEXT,
      study_goals TEXT,
      strong_subjects TEXT,
      weak_subjects TEXT,
      preferred_style TEXT DEFAULT 'balanced',
      daily_hours TEXT DEFAULT '2-3',
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      actions_taken TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

export default getDb;
