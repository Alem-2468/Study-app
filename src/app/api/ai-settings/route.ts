import { NextRequest, NextResponse } from "next/server";
import { getDb, initDb } from "@/lib/db";
import { getAiClient } from "@/lib/ai";

interface AiSettingsRow {
  id: number;
  provider: string;
  base_url: string;
  api_key: string | null;
  model: string;
  context_notes: string | null;
  updated_at: string;
}

const PRESETS: Record<string, { base_url: string; models: string[]; default_model: string }> = {
  groq: {
    base_url: "https://api.groq.com/openai/v1",
    models: ["openai/gpt-oss-120b", "openai/gpt-oss-20b", "llama-3.1-8b-instant"],
    default_model: "openai/gpt-oss-120b",
  },
  openai: {
    base_url: "https://api.openai.com/v1",
    models: ["gpt-4o", "gpt-4o-mini"],
    default_model: "gpt-4o-mini",
  },
  anthropic: {
    base_url: "https://api.anthropic.com/v1",
    models: ["claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5"],
    default_model: "claude-sonnet-5-5",
  },
  gemini: {
    base_url: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: ["gemini-3.8-flash", "gemini-3.1-pro-preview"],
    default_model: "gemini-3.8-flash",
  },
  custom: {
    base_url: "",
    models: [],
    default_model: "",
  },
};

export async function GET() {
  const db = getDb();
  await initDb();
  const result = await db.execute("SELECT * FROM ai_settings WHERE id = 1");
  const settings = result.rows[0] as unknown as AiSettingsRow | undefined;

  const hasEnvKey = !!process.env.GROQ_API_KEY;
  const isGroq = settings?.provider === "groq" || !settings;
  const effectiveKey = settings?.api_key || (isGroq && hasEnvKey);

  return NextResponse.json({
    settings: settings
      ? { provider: settings.provider, base_url: settings.base_url, api_key: settings.api_key ? "••••" + settings.api_key.slice(-4) : (isGroq && hasEnvKey ? "Server key" : null), model: settings.model, has_key: !!effectiveKey }
      : { provider: "groq", base_url: "https://api.groq.com/openai/v1", api_key: hasEnvKey ? "Server key" : null, model: "openai/gpt-oss-120b", has_key: hasEnvKey },
    presets: PRESETS,
    groq_server_key: hasEnvKey,
  });
}

async function generateHandoff(): Promise<string | null> {
  const db = getDb();
  const msgs = await db.execute("SELECT role, content FROM chat_messages ORDER BY created_at ASC LIMIT 200");
  if (msgs.rows.length < 3) return null;

  try {
    const { client, model: m } = await getAiClient();
    const chatLog = (msgs.rows as unknown as { role: string; content: string }[])
      .map(r => `${r.role}: ${r.content}`).join("\n");

    const res = await client.chat.completions.create({
      model: m,
      messages: [
        {
          role: "system",
          content: `You are handing off a student to a new AI tutor. Summarize ONLY the important things the new tutor needs to know. Be concise (under 300 words). Include:
- Student's personality, communication style, how they like to learn
- Subjects they struggle with or excel at (beyond what's in their profile)
- Any promises or ongoing plans you made with them
- Study strategies that worked or didn't work for them
- Anything else a new tutor would need to continue seamlessly`,
        },
        { role: "user", content: `Here is the full conversation history:\n\n${chatLog}` },
      ],
      max_tokens: 500,
    });
    return res.choices[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const { provider, base_url, api_key, model } = await req.json();
  if (!provider || !base_url || !model) {
    return NextResponse.json({ error: "Provider, base URL, and model are required" }, { status: 400 });
  }

  const db = getDb();
  await initDb();

  const existing = await db.execute("SELECT id, provider FROM ai_settings WHERE id = 1");
  const oldProvider = (existing.rows[0] as unknown as { provider: string } | undefined)?.provider;
  const isSwitch = oldProvider && oldProvider !== provider;

  let handoff: string | null = null;
  if (isSwitch) {
    handoff = await generateHandoff();
  }

  if (existing.rows.length > 0) {
    const setClauses = ["provider = ?", "base_url = ?", "model = ?", "updated_at = datetime('now')"];
    const args: (string | null)[] = [provider, base_url, model];
    if (api_key) { setClauses.push("api_key = ?"); args.push(api_key); }
    if (handoff) { setClauses.push("context_notes = ?"); args.push(handoff); }
    await db.execute({ sql: `UPDATE ai_settings SET ${setClauses.join(", ")} WHERE id = 1`, args });
  } else {
    await db.execute({
      sql: "INSERT INTO ai_settings (id, provider, base_url, api_key, model, context_notes) VALUES (1, ?, ?, ?, ?, ?)",
      args: [provider, base_url, api_key ?? null, model, handoff],
    });
  }

  return NextResponse.json({ ok: true, handoff: !!handoff });
}

export async function DELETE() {
  const db = getDb();
  await initDb();
  await db.execute("DELETE FROM ai_settings WHERE id = 1");
  return NextResponse.json({ ok: true });
}
