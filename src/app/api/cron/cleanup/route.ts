import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDb();
  await initDb();

  const today = new Date().toISOString().split("T")[0];

  const expired = await db.execute({
    sql: "SELECT id FROM materials WHERE expires_at <= ?",
    args: [today],
  });

  let deleted = 0;
  for (const row of expired.rows) {
    const id = (row as unknown as { id: string }).id;
    const chunkIds = await db.execute({ sql: "SELECT id FROM material_chunks WHERE material_id = ?", args: [id] });
    for (const chunk of chunkIds.rows) {
      try {
        await db.execute({ sql: "DELETE FROM material_chunks_fts WHERE rowid = ?", args: [(chunk as unknown as { id: number }).id] });
      } catch { /* FTS5 not available */ }
    }
    await db.execute({ sql: "DELETE FROM material_chunks WHERE material_id = ?", args: [id] });
    await db.execute({ sql: "DELETE FROM materials WHERE id = ?", args: [id] });
    deleted++;
  }

  return NextResponse.json({ ok: true, deleted, checked_date: today });
}
