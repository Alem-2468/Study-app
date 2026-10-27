import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(req: NextRequest) {
  const db = getDb();
  await initDb();
  const courseId = req.nextUrl.searchParams.get("courseId");
  const result = courseId
    ? await db.execute({ sql: "SELECT a.*, c.name as course_name, c.color as course_color FROM assignments a JOIN courses c ON a.course_id = c.id WHERE a.course_id = ? ORDER BY a.due_date ASC", args: [courseId] })
    : await db.execute("SELECT a.*, c.name as course_name, c.color as course_color FROM assignments a JOIN courses c ON a.course_id = c.id ORDER BY a.due_date ASC");
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const { course_id, title, description, type, due_date, due_time, priority } = await req.json();
  if (!course_id || !title?.trim()) {
    return NextResponse.json({ error: "course_id and title required" }, { status: 400 });
  }
  const db = getDb();
  await initDb();
  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO assignments (id, course_id, title, description, type, due_date, due_time, priority) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    args: [id, course_id, title.trim(), description?.trim() ?? null, type ?? "homework", due_date ?? null, due_time ?? null, priority ?? "medium"],
  });
  return NextResponse.json({ id });
}

export async function PUT(req: NextRequest) {
  const { id, status } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getDb();
  await initDb();
  await db.execute({ sql: "UPDATE assignments SET status = ? WHERE id = ?", args: [status, id] });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getDb();
  await initDb();
  await db.execute({ sql: "DELETE FROM assignments WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
