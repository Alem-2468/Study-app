import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q?.trim()) return NextResponse.json([]);

  const db = getDb();
  await initDb();

  try {
    const ftsResult = await db.execute({
      sql: `SELECT mc.content, mc.material_id, m.title as material_title
            FROM material_chunks_fts fts
            JOIN material_chunks mc ON mc.id = fts.rowid
            JOIN materials m ON m.id = mc.material_id
            WHERE material_chunks_fts MATCH ?
            ORDER BY rank LIMIT 5`,
      args: [q.trim()],
    });
    return NextResponse.json(ftsResult.rows);
  } catch {
    const likeResult = await db.execute({
      sql: `SELECT mc.content, mc.material_id, m.title as material_title
            FROM material_chunks mc
            JOIN materials m ON m.id = mc.material_id
            WHERE mc.content LIKE ?
            ORDER BY mc.chunk_index LIMIT 5`,
      args: [`%${q.trim()}%`],
    });
    return NextResponse.json(likeResult.rows);
  }
}
