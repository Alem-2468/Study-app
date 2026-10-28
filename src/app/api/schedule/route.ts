import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  try {
    const db = getDb();
    await initDb();
    const result = await db.execute(
      `SELECT s.*, c.name as course_name, c.color as course_color
       FROM study_sessions s
       LEFT JOIN courses c ON s.course_id = c.id
       ORDER BY s.date ASC, s.start_time ASC`
    );
    return NextResponse.json(result.rows);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "DB error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  await initDb();

  if (Array.isArray(body)) {
    for (const s of body) {
      await db.execute({
        sql: "INSERT INTO study_sessions (id, course_id, exam_id, title, date, start_time, duration_minutes, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [randomUUID(), s.course_id ?? null, s.exam_id ?? null, s.title, s.date, s.start_time ?? null, s.duration_minutes ?? 30, s.type ?? "study"],
      });
    }
    return NextResponse.json({ ok: true, count: body.length });
  }

  const { course_id, exam_id, title, date, start_time, duration_minutes, type } = body;
  if (!title?.trim() || !date) {
    return NextResponse.json({ error: "title and date required" }, { status: 400 });
  }
  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO study_sessions (id, course_id, exam_id, title, date, start_time, duration_minutes, type) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [id, course_id ?? null, exam_id ?? null, title.trim(), date, start_time ?? null, duration_minutes ?? 30, type ?? "study"],
  });
  return NextResponse.json({ id });
}

export async function PUT(req: NextRequest) {
  const { id, completed } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getDb();
  await initDb();
  await db.execute({ sql: "UPDATE study_sessions SET completed = ? WHERE id = ?", args: [completed ? 1 : 0, id] });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  const all = req.nextUrl.searchParams.get("all");
  const db = getDb();
  await initDb();
  if (all === "true") {
    await db.execute("DELETE FROM study_sessions");
  } else if (id) {
    await db.execute({ sql: "DELETE FROM study_sessions WHERE id = ?", args: [id] });
  }
  return NextResponse.json({ ok: true });
}
