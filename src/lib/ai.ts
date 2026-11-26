import OpenAI from "openai";
import { getDb, initDb } from "@/lib/db";
import { STUDY_RULES } from "@/lib/study-rules";

interface AiSettingsRow { provider: string; base_url: string; api_key: string | null; model: string }

const GROQ_FALLBACK = {
  baseURL: "https://api.groq.com/openai/v1",
  model: "openai/gpt-oss-120b",
};

async function getAiConfig() {
  await initDb();
  const db = getDb();
  const res = await db.execute("SELECT provider, base_url, api_key, model FROM ai_settings WHERE id = 1");
  const row = res.rows[0] as unknown as AiSettingsRow | undefined;

  if (row?.provider === "groq") {
    const key = process.env.GROQ_API_KEY || process.env.AI_API_KEY || row.api_key || "";
    return { baseURL: row.base_url || GROQ_FALLBACK.baseURL, apiKey: key, model: row.model || GROQ_FALLBACK.model };
  }

  if (row?.api_key && row.base_url) {
    return { baseURL: row.base_url, apiKey: row.api_key, model: row.model };
  }

  return {
    baseURL: process.env.AI_BASE_URL ?? GROQ_FALLBACK.baseURL,
    apiKey: process.env.AI_API_KEY ?? process.env.GROQ_API_KEY ?? "",
    model: process.env.AI_MODEL ?? GROQ_FALLBACK.model,
  };
}

export async function getAiClient() {
  const cfg = await getAiConfig();
  if (!cfg.apiKey) {
    throw new Error("No AI provider configured. Go to Settings and add your API key (Groq is free!).");
  }
  return {
    client: new OpenAI({ baseURL: cfg.baseURL, apiKey: cfg.apiKey }),
    model: cfg.model,
  };
}

export function getGroqFallbackClient(): { client: OpenAI; model: string } | null {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  return {
    client: new OpenAI({ baseURL: GROQ_FALLBACK.baseURL, apiKey: key }),
    model: GROQ_FALLBACK.model,
  };
}

export function getGroqVisionClient(): { client: OpenAI; model: string } | null {
  const key = process.env.GROQ_API_KEY;
  if (!key) return null;
  return {
    client: new OpenAI({ baseURL: GROQ_FALLBACK.baseURL, apiKey: key }),
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
  };
}

export async function quizFromNotes(notes: string): Promise<string> {
  const { client, model: MODEL } = await getAiClient();
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          STUDY_RULES + "\n\n" + "You are a study assistant. Generate 5 quiz questions (mix of multiple choice and short answer) from the provided notes. Format each question clearly with numbers. For multiple choice, include 4 options (A-D) and mark the correct answer at the end.",
      },
      { role: "user", content: `Generate quiz questions from these notes:\n\n${notes}` },
    ],
    max_tokens: 2000,
  });
  return res.choices[0]?.message?.content ?? "Could not generate quiz.";
}

export async function explainTopic(topic: string, context?: string): Promise<string> {
  const { client, model: MODEL } = await getAiClient();
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          STUDY_RULES + "\n\n" + "You are a patient tutor. Explain topics simply and clearly. Use examples and memory tricks. Keep it concise.",
      },
      {
        role: "user",
        content: context
          ? `Explain this topic using these notes as context:\n\nTopic: ${topic}\n\nNotes: ${context}`
          : `Explain this topic simply: ${topic}`,
      },
    ],
    max_tokens: 1500,
  });
  return res.choices[0]?.message?.content ?? "Could not generate explanation.";
}

export async function summarizeMaterial(content: string): Promise<string> {
  const { client, model: MODEL } = await getAiClient();
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          STUDY_RULES + "\n\n" + "You are a study assistant. Summarize the provided material into key points. Use bullet points, highlight important terms in **bold**, and keep it concise. Focus on what a student would need for an exam.",
      },
      { role: "user", content: `Summarize this material:\n\n${content}` },
    ],
    max_tokens: 1500,
  });
  return res.choices[0]?.message?.content ?? "Could not generate summary.";
}

interface ScheduleInput {
  exams: { title: string; date: string; course: string; topics?: string; difficulty?: string }[];
  assignments: { title: string; dueDate: string; course: string }[];
  hoursPerDay: number;
  style: "balanced" | "intensive" | "spaced" | "deadline";
  startDate: string;
}

export interface ScheduleBlock {
  title: string;
  date: string;
  start_time: string;
  duration_minutes: number;
  course: string;
  type: string;
  exam_title?: string;
}

export async function generateSchedule(input: ScheduleInput): Promise<ScheduleBlock[]> {
  const today = input.startDate;
  const { client, model: MODEL } = await getAiClient();
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a study schedule generator. Given exams, assignments, available hours per day, and a study style, generate a JSON array of study blocks.

Study styles:
- balanced: equal time for each subject
- intensive: more time on difficult/upcoming exams
- spaced: shorter sessions spread across more days with review
- deadline: prioritize by closest deadline

Rules:
- Work backwards from each exam/deadline
- Include review sessions before exams
- Add breaks (type: "break") every 90 minutes
- Keep sessions between 25-60 minutes
- Start times from 09:00, use 24h format
- Don't exceed ${input.hoursPerDay} hours of study per day
- Today is ${today}

Return ONLY a JSON array, no markdown, no explanation. Each object:
{"title": "string", "date": "YYYY-MM-DD", "start_time": "HH:MM", "duration_minutes": number, "course": "string", "type": "study|review|practice|break", "exam_title": "optional"}`,
      },
      {
        role: "user",
        content: `Generate a study schedule:\n\nExams: ${JSON.stringify(input.exams)}\n\nAssignments: ${JSON.stringify(input.assignments)}\n\nHours per day: ${input.hoursPerDay}\nStyle: ${input.style}\nStart date: ${today}`,
      },
    ],
    max_tokens: 4000,
  });

  const raw = res.choices[0]?.message?.content ?? "[]";
  try {
    const match = raw.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  } catch {
    return [];
  }
}

/** Turn study material into a structured Word document (Luis's colour system). */
export async function wordFromMaterial(title: string, content: string, instructions?: string): Promise<import("@/lib/word").WordDoc> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content:
          STUDY_RULES + "\n\n" +
          `You turn class material into study notes ("apunts") for a Word document. Write in the SAME language as the material.
Follow the 80/20 rule: only what matters for the exam. Clear headings, short explanations, bullet points, a concrete example for each idea when useful ("**Exemple:** ..."), and a table whenever two or more things are compared.
Inline markup you MUST use (no other markdown):
- **text** = bold
- [[text]] = important concept (shown red)
- {{text}} = key idea (shown green)
- ==text== = keyword (yellow highlight)
Use all four, often, but never on whole sentences. Copy names and terms exactly as written in the material (check spelling). Do not invent facts that are not in the material.
Return ONLY JSON, no code fences:
{"title": "string", "blocks": [
  {"type":"heading","text":"..."},
  {"type":"paragraph","text":"..."},
  {"type":"bullets","items":["...", {"text":"...","sub":["..."]}]},
  {"type":"table","headers":["Aspecte","A","B"],"rows":[["...","...","..."]]}
]}`,
      },
      {
        role: "user",
        content: `Material title: ${title}\n${instructions ? `Extra instructions: ${instructions}\n` : ""}\nMaterial:\n${content}`,
      },
  ];
  let raw = "";
  try {
    const { client, model } = await getAiClient();
    const res = await client.chat.completions.create({ model, messages, max_tokens: 6000 });
    raw = res.choices[0]?.message?.content ?? "";
  } catch (e) {
    // If the configured provider fails (bad key, quota), fall back to the free Groq key.
    const fb = getGroqFallbackClient();
    if (!fb) throw e;
    const res = await fb.client.chat.completions.create({ model: fb.model, messages, max_tokens: 6000 });
    raw = res.choices[0]?.message?.content ?? "";
  }
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("The AI didn't return a document. Try again.");
  const doc = JSON.parse(match[0]);
  if (!Array.isArray(doc.blocks) || doc.blocks.length === 0) throw new Error("The AI returned an empty document. Try again.");
  return { title: String(doc.title || title), blocks: doc.blocks };
}
