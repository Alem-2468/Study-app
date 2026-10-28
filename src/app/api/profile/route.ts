import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    await initDb();
    const result = await db.execute("SELECT * FROM student_profile WHERE id = 1");
    return NextResponse.json(result.rows[0] ?? null);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "DB error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const db = getDb();
  await initDb();
  const existing = await db.execute("SELECT id FROM student_profile WHERE id = 1");

  if (existing.rows.length > 0) {
    await db.execute({
      sql: `UPDATE student_profile SET
        name = ?, grade_level = ?, school = ?, study_goals = ?,
        strong_subjects = ?, weak_subjects = ?, preferred_style = ?,
        daily_hours = ?, notes = ?, updated_at = datetime('now')
      WHERE id = 1`,
      args: [
        body.name, body.grade_level ?? null, body.school ?? null,
        body.study_goals ?? null, body.strong_subjects ?? null,
        body.weak_subjects ?? null, body.preferred_style ?? "balanced",
        body.daily_hours ?? "2-3", body.notes ?? null,
      ],
    });
  } else {
    await db.execute({
      sql: `INSERT INTO student_profile (id, name, grade_level, school, study_goals, strong_subjects, weak_subjects, preferred_style, daily_hours, notes)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        body.name, body.grade_level ?? null, body.school ?? null,
        body.study_goals ?? null, body.strong_subjects ?? null,
        body.weak_subjects ?? null, body.preferred_style ?? "balanced",
        body.daily_hours ?? "2-3", body.notes ?? null,
      ],
    });
  }

  return NextResponse.json({ ok: true });
}
