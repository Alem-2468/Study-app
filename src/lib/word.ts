import {
  AlignmentType, BorderStyle, Document, HighlightColor, LevelFormat, Packer, Paragraph,
  ShadingType, Table, TableCell, TableRow, TextRun, WidthType,
} from "docx";

// Luis's Word colour system (see study-rules.ts):
// blue = main topic / each question, red = important concepts, green = key ideas, yellow = keywords.
const BLUE = "3C78D8";
const RED = "CC0000";
const GREEN = "38761D";
const FONT = "Arial";
const BODY = 20; // half-points: 10 pt
const TITLE = 22; // 11 pt

export type BulletItem = string | { text: string; sub?: BulletItem[] };
export type WordBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: BulletItem[] }
  | { type: "table"; headers: string[]; rows: string[][] };
export interface WordDoc { title: string; blocks: WordBlock[] }

/** Inline markup: **bold**, *italic*, [[red concept]], {{green key idea}}, ==yellow keyword==. */
export function runs(text: string, base: { bold?: boolean; color?: string; size?: number } = {}): TextRun[] {
  const out: TextRun[] = [];
  const re = /\*\*(.+?)\*\*|\[\[(.+?)\]\]|\{\{(.+?)\}\}|==(.+?)==|\*([^*\s][^*]*?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  const size = base.size ?? BODY;
  const push = (t: string, o: Record<string, unknown> = {}) => {
    if (t) out.push(new TextRun({ text: t, font: FONT, size, bold: base.bold, color: base.color, ...o }));
  };
  while ((m = re.exec(text))) {
    push(text.slice(last, m.index));
    if (m[1] !== undefined) push(m[1], { bold: true });
    else if (m[2] !== undefined) push(m[2], { bold: true, color: RED });
    else if (m[3] !== undefined) push(m[3], { bold: true, color: GREEN });
    else if (m[4] !== undefined) push(m[4], { highlight: HighlightColor.YELLOW });
    else if (m[5] !== undefined) push(m[5], { italics: true });
    last = re.lastIndex;
  }
  push(text.slice(last));
  return out;
}

function bulletParas(items: BulletItem[], level = 0): Paragraph[] {
  const out: Paragraph[] = [];
  for (const it of items.slice(0, 60)) {
    const text = typeof it === "string" ? it : String(it?.text ?? "");
    out.push(new Paragraph({ children: runs(text), numbering: { reference: "bullets", level: Math.min(level, 2) }, spacing: { after: 60 } }));
    if (typeof it !== "string" && Array.isArray(it?.sub)) out.push(...bulletParas(it.sub, level + 1));
  }
  return out;
}

function table(headers: string[], rows: string[][]): Table {
  const cols = Math.max(headers.length, ...rows.map(r => r.length), 1);
  const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
  const borders = { top: border, bottom: border, left: border, right: border };
  const cell = (t: string, header: boolean) => new TableCell({
    borders,
    shading: header ? { type: ShadingType.CLEAR, color: "auto", fill: "DCE6F7" } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({ children: runs(String(t ?? ""), { bold: header, color: header ? BLUE : undefined }) })],
  });
  const pad = (r: string[]) => Array.from({ length: cols }, (_, i) => r[i] ?? "");
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({ tableHeader: true, children: pad(headers).map(h => cell(h, true)) }),
      ...rows.slice(0, 40).map(r => new TableRow({ children: pad(r).map(c => cell(c, false)) })),
    ],
  });
}

export async function buildWord(doc: WordDoc): Promise<Buffer> {
  const children: (Paragraph | Table)[] = [
    new Paragraph({ children: runs(doc.title || "Apunts", { bold: true, color: BLUE, size: TITLE }), spacing: { after: 160 } }),
  ];
  for (const b of Array.isArray(doc.blocks) ? doc.blocks : []) {
    if (!b || typeof b !== "object") continue;
    if (b.type === "heading") {
      children.push(new Paragraph({ children: runs(String(b.text ?? ""), { bold: true, color: BLUE }), spacing: { before: 240, after: 80 }, keepNext: true }));
    } else if (b.type === "paragraph") {
      children.push(new Paragraph({ children: runs(String(b.text ?? "")), spacing: { after: 100 }, alignment: AlignmentType.JUSTIFIED }));
    } else if (b.type === "bullets" && Array.isArray(b.items)) {
      children.push(...bulletParas(b.items));
    } else if (b.type === "table" && Array.isArray(b.headers) && Array.isArray(b.rows)) {
      children.push(table(b.headers.map(String), b.rows.map(r => (Array.isArray(r) ? r.map(String) : [String(r)]))));
      children.push(new Paragraph({ children: [], spacing: { after: 100 } }));
    }
  }
  const d = new Document({
    styles: { default: { document: { run: { font: FONT, size: BODY } } } },
    numbering: {
      config: [{
        reference: "bullets",
        levels: ["●", "○", "■"].map((t, level) => ({
          level, format: LevelFormat.BULLET, text: t, alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720 * (level + 1), hanging: 360 } } },
        })),
      }],
    },
    sections: [{ properties: { page: { margin: { top: 1134, bottom: 1134, left: 1134, right: 1134 } } }, children }],
  });
  return Packer.toBuffer(d);
}
