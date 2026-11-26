#!/usr/bin/env node
// MCP server that lets Claude read and write the AI Study Planner's live database (Turso).
// Credentials are read from a local file outside the repo (default: ~/.study-app-mcp/db.env)
// and are never returned by any tool.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "@libsql/client";
import { z } from "zod";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";

const HERE = dirname(fileURLToPath(import.meta.url));

// ---------- config ----------
function loadEnv(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let v = m[2];
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[m[1]] = v;
  }
  return out;
}

const envPath = process.env.STUDY_APP_DB_ENV || join(homedir(), ".study-app-mcp", "db.env");
let env = {};
try { env = loadEnv(envPath); } catch { /* handled below */ }
const url = process.env.TURSO_URL || env.TURSO_URL || env.TursoURL;
const authToken = process.env.TURSO_AUTH_TOKEN || env.TURSO_AUTH_TOKEN || env.turso_token;
const SETUP_MSG = `The study app database isn't connected yet. Open ${envPath} and set TursoURL=libsql://... and turso_token=... (from app.turso.tech → your database → Connect). Then restart Claude.`;
let _db = null;
const db = {
  execute(q) {
    if (!_db) {
      if (!url || !/^(libsql|https?|wss?|file):/.test(url)) throw new Error(SETUP_MSG);
      _db = createClient({ url, authToken });
    }
    return _db.execute(q);
  },
};

// ---------- helpers ----------
const today = () => new Date().toISOString().split("T")[0];
const text = (s) => ({ content: [{ type: "text", text: s }] });
const json = (o) => text(JSON.stringify(o, null, 2));
const rows = async (sql, args = []) => (await db.execute({ sql, args })).rows.map((r) => ({ ...r }));
const fail = (msg) => ({ content: [{ type: "text", text: msg }], isError: true });

async function findCourse(nameOrId) {
  const r = await rows("SELECT id, name FROM courses WHERE id = ? OR name = ? COLLATE NOCASE LIMIT 1", [nameOrId, nameOrId]);
  return r[0] ?? null;
}

// Same chunking as src/app/api/materials/route.ts so the app's search keeps working.
function chunkText(input, maxWords = 750) {
  const paragraphs = input.split(/\n\s*\n/);
  const chunks = [];
  let current = "";
  for (const para of paragraphs) {
    const combined = current ? `${current}\n\n${para}` : para;
    if (combined.split(/\s+/).length > maxWords && current) {
      chunks.push(current.trim());
      current = para;
    } else {
      current = combined;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [input.trim()];
}

function ftsQuery(q) {
  const words = q.toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? [];
  return [...new Set(words)].slice(0, 12).map((w) => `"${w}"`).join(" OR ");
}

function studyRules() {
  const src = readFileSync(join(HERE, "..", "src", "lib", "study-rules.ts"), "utf8");
  const m = src.match(/`([\s\S]*)`/);
  return m ? m[1].trim() : src;
}

// ---------- server ----------
const server = new McpServer({ name: "study-app", version: "1.0.0" });

server.registerTool(
  "get_study_rules",
  {
    title: "Get Luis's study rules",
    description: "Luis's rules for making apuntes, memory tricks, colour system and comentario de texto. Read and follow these before writing any study notes.",
    inputSchema: {},
  },
  async () => text(studyRules()),
);

server.registerTool(
  "get_overview",
  {
    title: "Study overview",
    description: "Student profile, courses, upcoming exams, pending assignments and material counts from the study app.",
    inputSchema: {},
  },
  async () => {
    const t = today();
    const [profile] = await rows("SELECT name, grade_level, school, study_goals, strong_subjects, weak_subjects, preferred_style, daily_hours, notes FROM student_profile WHERE id = 1");
    const courses = await rows("SELECT c.id, c.name, c.teacher_name, (SELECT COUNT(*) FROM materials m WHERE m.course_id = c.id) AS materials FROM courses c ORDER BY c.name");
    const exams = await rows("SELECT e.id, e.title, e.date, e.time, e.topics, e.difficulty, e.status, c.name AS course FROM exams e LEFT JOIN courses c ON c.id = e.course_id WHERE e.date >= ? ORDER BY e.date", [t]);
    const assignments = await rows("SELECT a.id, a.title, a.type, a.due_date, a.priority, a.status, c.name AS course FROM assignments a LEFT JOIN courses c ON c.id = a.course_id WHERE a.status != 'completed' ORDER BY a.due_date IS NULL, a.due_date", []);
    return json({ today: t, profile: profile ?? null, courses, upcoming_exams: exams, pending_assignments: assignments });
  },
);

server.registerTool(
  "list_materials",
  {
    title: "List study materials",
    description: "List uploaded materials (PDFs, notes, Classroom files). Optionally filter by course name/id or exam id.",
    inputSchema: {
      course: z.string().optional().describe("Course name or id"),
      exam_id: z.string().optional(),
    },
  },
  async ({ course, exam_id }) => {
    let sql = "SELECT m.id, m.title, m.source_type, m.source_url, m.exam_id, m.expires_at, m.created_at, c.name AS course, (SELECT COUNT(*) FROM material_chunks mc WHERE mc.material_id = m.id) AS chunks FROM materials m LEFT JOIN courses c ON c.id = m.course_id WHERE 1=1";
    const args = [];
    if (course) {
      const c = await findCourse(course);
      if (!c) return fail(`No course called "${course}".`);
      sql += " AND m.course_id = ?"; args.push(c.id);
    }
    if (exam_id) { sql += " AND m.exam_id = ?"; args.push(exam_id); }
    sql += " ORDER BY m.created_at DESC";
    return json(await rows(sql, args));
  },
);

server.registerTool(
  "read_material",
  {
    title: "Read a material",
    description: "Read the full text of one material, a few chunks at a time (each chunk is about 750 words).",
    inputSchema: {
      id: z.string(),
      start_chunk: z.number().int().min(0).default(0),
      max_chunks: z.number().int().min(1).max(20).default(8),
    },
  },
  async ({ id, start_chunk, max_chunks }) => {
    const [m] = await rows("SELECT m.title, c.name AS course FROM materials m LEFT JOIN courses c ON c.id = m.course_id WHERE m.id = ?", [id]);
    if (!m) return fail(`No material with id ${id}.`);
    const [{ n }] = await rows("SELECT COUNT(*) AS n FROM material_chunks WHERE material_id = ?", [id]);
    const chunks = await rows("SELECT chunk_index, content FROM material_chunks WHERE material_id = ? AND chunk_index >= ? ORDER BY chunk_index LIMIT ?", [id, start_chunk, max_chunks]);
    const end = start_chunk + chunks.length;
    const more = end < Number(n) ? `\n\n[More: chunks ${end}-${Number(n) - 1} left. Call again with start_chunk=${end}.]` : "";
    return text(`# ${m.title}${m.course ? ` (${m.course})` : ""}\nChunks ${start_chunk}-${end - 1} of ${n}\n\n` + chunks.map((c) => c.content).join("\n\n") + more);
  },
);

server.registerTool(
  "search_materials",
  {
    title: "Search materials",
    description: "Full-text search across all uploaded materials. Returns matching passages with their material id.",
    inputSchema: { query: z.string(), limit: z.number().int().min(1).max(20).default(6) },
  },
  async ({ query, limit }) => {
    const q = ftsQuery(query);
    let hits = [];
    if (q) {
      try {
        hits = await rows("SELECT mc.material_id, m.title, mc.chunk_index, snippet(material_chunks_fts, 0, '**', '**', ' … ', 40) AS snippet FROM material_chunks_fts fts JOIN material_chunks mc ON mc.id = fts.rowid JOIN materials m ON m.id = mc.material_id WHERE material_chunks_fts MATCH ? ORDER BY rank LIMIT ?", [q, limit]);
      } catch { /* fall back to LIKE */ }
    }
    if (hits.length === 0) {
      hits = await rows("SELECT mc.material_id, m.title, mc.chunk_index, substr(mc.content, max(1, instr(lower(mc.content), lower(?)) - 200), 500) AS snippet FROM material_chunks mc JOIN materials m ON m.id = mc.material_id WHERE mc.content LIKE ? LIMIT ?", [query, `%${query}%`, limit]);
    }
    return hits.length ? json(hits) : text("No matches.");
  },
);

server.registerTool(
  "get_schedule",
  {
    title: "Study schedule",
    description: "Planned study sessions from today for the next N days.",
    inputSchema: { days: z.number().int().min(1).max(60).default(14) },
  },
  async ({ days }) => {
    const end = new Date(); end.setDate(end.getDate() + days);
    return json(await rows("SELECT s.id, s.title, s.date, s.start_time, s.duration_minutes, s.type, s.completed, c.name AS course FROM study_sessions s LEFT JOIN courses c ON c.id = s.course_id WHERE s.date BETWEEN ? AND ? ORDER BY s.date, s.start_time", [today(), end.toISOString().split("T")[0]]));
  },
);

// ---------- write tools (no deletes; use the app for that) ----------
server.registerTool(
  "save_material",
  {
    title: "Save apuntes to the app",
    description: "Save notes/apuntes (Markdown) as a material in the app so Luis can see them there and the app's AI can search them. If linked to an exam it expires the day after the exam; otherwise it is kept.",
    inputSchema: {
      title: z.string().min(1),
      content: z.string().min(1),
      course: z.string().optional().describe("Course name or id"),
      exam_id: z.string().optional(),
      keep_forever: z.boolean().default(false).describe("Keep even after the linked exam"),
    },
  },
  async ({ title, content, course, exam_id, keep_forever }) => {
    let courseId = null;
    if (course) {
      const c = await findCourse(course);
      if (!c) return fail(`No course called "${course}". Create it first with create_course.`);
      courseId = c.id;
    }
    let expires = null;
    if (exam_id && !keep_forever) {
      const [e] = await rows("SELECT date, course_id FROM exams WHERE id = ?", [exam_id]);
      if (!e) return fail(`No exam with id ${exam_id}.`);
      const d = new Date(e.date); d.setDate(d.getDate() + 1);
      expires = d.toISOString().split("T")[0];
      courseId ??= e.course_id;
    }
    const id = randomUUID();
    await db.execute({ sql: "INSERT INTO materials (id, course_id, exam_id, title, source_type, source_url, expires_at) VALUES (?, ?, ?, ?, 'note', NULL, ?)", args: [id, courseId, exam_id ?? null, title.trim(), expires] });
    const chunks = chunkText(content);
    for (let i = 0; i < chunks.length; i++) {
      const r = await db.execute({ sql: "INSERT INTO material_chunks (material_id, chunk_index, content) VALUES (?, ?, ?)", args: [id, i, chunks[i]] });
      try { await db.execute({ sql: "INSERT INTO material_chunks_fts(rowid, content) VALUES (?, ?)", args: [Number(r.lastInsertRowid), chunks[i]] }); } catch { /* no FTS */ }
    }
    return json({ saved: title, id, chunks: chunks.length, expires_at: expires ?? "never" });
  },
);

server.registerTool(
  "create_course",
  {
    title: "Create course",
    description: "Add a course (subject) to the app.",
    inputSchema: { name: z.string().min(1), color: z.string().default("#7c3aed"), teacher_name: z.string().optional() },
  },
  async ({ name, color, teacher_name }) => {
    if (await findCourse(name)) return fail(`Course "${name}" already exists.`);
    const id = randomUUID();
    await db.execute({ sql: "INSERT INTO courses (id, name, color, teacher_name) VALUES (?, ?, ?, ?)", args: [id, name, color, teacher_name ?? null] });
    return json({ created: name, id });
  },
);

server.registerTool(
  "create_exam",
  {
    title: "Create exam",
    description: "Add an exam to the app.",
    inputSchema: {
      course: z.string().describe("Course name or id"),
      title: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      time: z.string().optional(),
      topics: z.string().optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),
    },
  },
  async ({ course, title, date, time, topics, difficulty }) => {
    const c = await findCourse(course);
    if (!c) return fail(`No course called "${course}".`);
    const id = randomUUID();
    await db.execute({ sql: "INSERT INTO exams (id, course_id, title, date, time, topics, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)", args: [id, c.id, title, date, time ?? null, topics ?? null, difficulty] });
    return json({ created: title, course: c.name, date, id });
  },
);

server.registerTool(
  "update_exam",
  {
    title: "Update exam",
    description: "Change an exam's date, time, topics or difficulty.",
    inputSchema: {
      id: z.string(),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      time: z.string().optional(),
      topics: z.string().optional(),
      difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    },
  },
  async ({ id, ...fields }) => {
    const sets = Object.entries(fields).filter(([, v]) => v !== undefined);
    if (!sets.length) return fail("Nothing to change.");
    const r = await db.execute({ sql: `UPDATE exams SET ${sets.map(([k]) => `${k} = ?`).join(", ")} WHERE id = ?`, args: [...sets.map(([, v]) => v), id] });
    return r.rowsAffected ? json({ updated: id, ...Object.fromEntries(sets) }) : fail(`No exam with id ${id}.`);
  },
);

server.registerTool(
  "create_assignment",
  {
    title: "Create assignment",
    description: "Add homework, a project, essay, presentation or lab.",
    inputSchema: {
      course: z.string(),
      title: z.string().min(1),
      type: z.enum(["homework", "project", "essay", "presentation", "lab"]).default("homework"),
      due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      priority: z.enum(["low", "medium", "high"]).default("medium"),
      description: z.string().optional(),
    },
  },
  async ({ course, title, type, due_date, priority, description }) => {
    const c = await findCourse(course);
    if (!c) return fail(`No course called "${course}".`);
    const id = randomUUID();
    await db.execute({ sql: "INSERT INTO assignments (id, course_id, title, description, type, due_date, priority) VALUES (?, ?, ?, ?, ?, ?, ?)", args: [id, c.id, title, description ?? null, type, due_date ?? null, priority] });
    return json({ created: title, course: c.name, due_date: due_date ?? null, id });
  },
);

server.registerTool(
  "complete_assignment",
  {
    title: "Mark assignment done",
    description: "Mark an assignment as completed.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) => {
    const r = await db.execute({ sql: "UPDATE assignments SET status = 'completed' WHERE id = ?", args: [id] });
    return r.rowsAffected ? json({ completed: id }) : fail(`No assignment with id ${id}.`);
  },
);

server.registerTool(
  "add_study_session",
  {
    title: "Add study session",
    description: "Put a study block in the app's schedule.",
    inputSchema: {
      title: z.string().min(1),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      start_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
      duration_minutes: z.number().int().min(5).max(300).default(45),
      course: z.string().optional(),
      exam_id: z.string().optional(),
      type: z.enum(["study", "review", "practice", "break"]).default("study"),
    },
  },
  async ({ title, date, start_time, duration_minutes, course, exam_id, type }) => {
    let courseId = null;
    if (course) {
      const c = await findCourse(course);
      if (!c) return fail(`No course called "${course}".`);
      courseId = c.id;
    }
    const id = randomUUID();
    await db.execute({ sql: "INSERT INTO study_sessions (id, course_id, exam_id, title, date, start_time, duration_minutes, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", args: [id, courseId, exam_id ?? null, title, date, start_time ?? null, duration_minutes, type] });
    return json({ created: title, date, id });
  },
);

await server.connect(new StdioServerTransport());
