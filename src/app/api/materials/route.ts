import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { randomUUID } from "crypto";

function chunkText(text: string, maxWords = 750): string[] {
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
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
  return chunks.length > 0 ? chunks : [text.trim()];
}

function computeExpiry(examId: string | null, examDate: string | null): string {
  if (examId && examDate) {
    const d = new Date(examDate);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }
  const d = new Date();
  d.setDate(d.getDate() + 7);
  return d.toISOString().split("T")[0];
}

export async function GET() {
  try {
    const db = getDb();
    await initDb();
    const result = await db.execute(`
      SELECT m.*, c.name as course_name, c.color as course_color,
        (SELECT COUNT(*) FROM material_chunks WHERE material_id = m.id) as chunk_count
      FROM materials m
      LEFT JOIN courses c ON m.course_id = c.id
      ORDER BY m.created_at DESC
    `);
    return NextResponse.json(result.rows);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "DB error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { title, content, source_type, source_url, course_id, exam_id, exam_date } = await req.json();
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Title and content are required" }, { status: 400 });
  }

  const db = getDb();
  await initDb();
  const id = randomUUID();
  const expires_at = computeExpiry(exam_id ?? null, exam_date ?? null);

  await db.execute({
    sql: "INSERT INTO materials (id, course_id, exam_id, title, source_type, source_url, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [id, course_id ?? null, exam_id ?? null, title.trim(), source_type ?? "note", source_url ?? null, expires_at],
  });

  const chunks = chunkText(content);
  for (let i = 0; i < chunks.length; i++) {
    const res = await db.execute({
      sql: "INSERT INTO material_chunks (material_id, chunk_index, content) VALUES (?, ?, ?)",
      args: [id, i, chunks[i]],
    });
    try {
      await db.execute({
        sql: "INSERT INTO material_chunks_fts(rowid, content) VALUES (?, ?)",
        args: [res.lastInsertRowid, chunks[i]],
      });
    } catch {
      // FTS5 not available, search will fall back to LIKE
    }
  }

  return NextResponse.json({ id, chunk_count: chunks.length, expires_at });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  const db = getDb();
  await initDb();

  const chunkIds = await db.execute({ sql: "SELECT id FROM material_chunks WHERE material_id = ?", args: [id] });
  for (const row of chunkIds.rows) {
    try {
      await db.execute({ sql: "DELETE FROM material_chunks_fts WHERE rowid = ?", args: [(row as unknown as { id: number }).id] });
    } catch { /* FTS5 not available */ }
  }

  await db.execute({ sql: "DELETE FROM material_chunks WHERE material_id = ?", args: [id] });
  await db.execute({ sql: "DELETE FROM materials WHERE id = ?", args: [id] });
  return NextResponse.json({ ok: true });
}
