import { NextRequest, NextResponse } from "next/server";
import { quizFromNotes, explainTopic, summarizeMaterial, generateSchedule } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action } = body;

  try {
    switch (action) {
      case "quiz":
        return NextResponse.json({ result: await quizFromNotes(body.content) });
      case "explain":
        return NextResponse.json({ result: await explainTopic(body.topic, body.context) });
      case "summarize":
        return NextResponse.json({ result: await summarizeMaterial(body.content) });
      case "schedule":
        return NextResponse.json({ blocks: await generateSchedule(body.input) });
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
