import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET() {
  const db = getDb();
  await initDb();
  const result = await db.execute("SELECT * FROM courses ORDER BY name");
  return NextResponse.json(result.rows);
}

export async function POST(req: NextRequest) {
  const { name, color, teacher_name, schedule } = await req.json();
  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  const db = getDb();
  await initDb();
  const id = randomUUID();
  await db.execute({
    sql: "INSERT INTO courses (id, name, color, teacher_name, schedule) VALUES (?, ?, ?, ?, ?)",
    args: [id, name.trim(), color ?? "#8b5cf6", teacher_name?.trim() ?? null, schedule?.trim() ?? null],
  });
  return NextResponse.json({ id, name, color, teacher_name, schedule });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getDb();
  await initDb();
  await db.execute({ sql: "DELETE FROM courses WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
