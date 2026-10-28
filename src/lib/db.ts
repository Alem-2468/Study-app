import { createClient, type Client } from "@libsql/client";

let _client: Client | null = null;
let _initDone = false;

export function getDb(): Client {
  if (!_client) {
    _client = createClient({
      url: process.env.TURSO_URL ?? process.env.TursoURL ?? "file:study-planner.db",
      authToken: process.env.TURSO_AUTH_TOKEN ?? process.env.turso_token,
    });
  }
  return _client;
}

export async function initDb() {
  if (_initDone) return;
  const db = getDb();
  await db.batch([
    "CREATE TABLE IF NOT EXISTS courses (id TEXT PRIMARY KEY, name TEXT NOT NULL, color TEXT DEFAULT '#8b5cf6', teacher_name TEXT, schedule TEXT, created_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS assignments (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, title TEXT NOT NULL, description TEXT, type TEXT DEFAULT 'homework', due_date TEXT, due_time TEXT, status TEXT DEFAULT 'pending', priority TEXT DEFAULT 'medium', created_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS exams (id TEXT PRIMARY KEY, course_id TEXT NOT NULL, title TEXT NOT NULL, date TEXT NOT NULL, time TEXT, topics TEXT, difficulty TEXT DEFAULT 'medium', status TEXT DEFAULT 'upcoming', created_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS study_sessions (id TEXT PRIMARY KEY, course_id TEXT, exam_id TEXT, title TEXT NOT NULL, date TEXT NOT NULL, start_time TEXT, duration_minutes INTEGER DEFAULT 30, type TEXT DEFAULT 'study', completed INTEGER DEFAULT 0, notes TEXT, created_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS materials (id TEXT PRIMARY KEY, course_id TEXT, title TEXT NOT NULL, content TEXT, type TEXT DEFAULT 'note', created_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS student_profile (id INTEGER PRIMARY KEY CHECK (id = 1), name TEXT NOT NULL, grade_level TEXT, school TEXT, study_goals TEXT, strong_subjects TEXT, weak_subjects TEXT, preferred_style TEXT DEFAULT 'balanced', daily_hours TEXT DEFAULT '2-3', notes TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS chat_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, role TEXT NOT NULL, content TEXT NOT NULL, actions_taken TEXT, created_at TEXT DEFAULT (datetime('now')))",
    "CREATE TABLE IF NOT EXISTS ai_settings (id INTEGER PRIMARY KEY CHECK (id = 1), provider TEXT DEFAULT 'groq', base_url TEXT DEFAULT 'https://api.groq.com/openai/v1', api_key TEXT, model TEXT DEFAULT 'llama-3.3-70b-versatile', updated_at TEXT DEFAULT (datetime('now')))",
  ], "write");
  _initDone = true;
}

export default getDb;
