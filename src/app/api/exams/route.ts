import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  const db = getDb();
  await initDb();
  const result = await db.execute("SELECT e.*, c.name as course_name, c.color as course_color FROM exams e JOIN courses c ON e.course_id = c.id ORDER BY e.date ASC");
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const { course_id, title, date, time, topics, difficulty } = await req.json();
  if (!course_id || !title?.trim() || !date) {
    return NextResponse.json({ error: "course_id, title, and date required" }, { status: 400 });
  }
  const db = getDb();
  await initDb();
  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO exams (id, course_id, title, date, time, topics, difficulty) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [id, course_id, title.trim(), date, time ?? null, topics?.trim() ?? null, difficulty ?? "medium"],
  });
  return NextResponse.json({ id });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getDb();
  await initDb();
  await db.execute({ sql: "DELETE FROM exams WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
