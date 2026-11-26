import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { wordFromMaterial } from "@/lib/ai";
import { buildWord } from "@/lib/word";

export const maxDuration = 120;

const MAX_WORDS = 12000;

export async function POST(req: NextRequest) {
  try {
    const { id, instructions } = await req.json();
    if (!id || typeof id !== "string") return NextResponse.json({ error: "Missing material id" }, { status: 400 });

    await initDb();
    const db = getDb();
    const mat = (await db.execute({ sql: "SELECT title FROM materials WHERE id = ?", args: [id] })).rows[0] as unknown as { title: string } | undefined;
    if (!mat) return NextResponse.json({ error: "Material not found" }, { status: 404 });

    const chunks = await db.execute({ sql: "SELECT content FROM material_chunks WHERE material_id = ? ORDER BY chunk_index", args: [id] });
    let content = chunks.rows.map(r => String((r as unknown as { content: string }).content)).join("\n\n");
    const words = content.split(/\s+/);
    if (words.length > MAX_WORDS) content = words.slice(0, MAX_WORDS).join(" ");
    if (!content.trim()) return NextResponse.json({ error: "This material has no text" }, { status: 400 });

    const doc = await wordFromMaterial(mat.title, content, typeof instructions === "string" ? instructions.slice(0, 500) : undefined);
    const buf = await buildWord(doc);
    const filename = `${doc.title.replace(/[\/:*?"<>|]+/g, "").slice(0, 80) || "Apunts"}.docx`;

    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="apunts.docx"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Could not make the Word document";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
