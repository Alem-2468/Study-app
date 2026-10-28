import { NextRequest, NextResponse } from "next/server";
import { getAiClient } from "@/lib/ai";

const VISION_MODELS = [
  "gpt-4o", "gpt-4o-mini", "gpt-4-turbo",
  "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-flash",
  "claude-sonnet-4-20250514", "claude-haiku-4-20250414",
  "meta-llama/llama-4-scout-17b-16e-instruct",
];

function supportsVision(model: string): boolean {
  return VISION_MODELS.some(v => model.includes(v) || v.includes(model));
}

export async function POST(req: NextRequest) {
  const { image_base64, mime_type } = await req.json();
  if (!image_base64) {
    return NextResponse.json({ error: "image_base64 is required" }, { status: 400 });
  }

  try {
    const { client, model } = await getAiClient();

    if (!supportsVision(model)) {
      return NextResponse.json(
        { error: "Your current AI model doesn't support image analysis. Upload PDFs or DOCX files instead, or switch to a vision-capable model (like GPT-4o or Gemini) in Settings." },
        { status: 422 }
      );
    }

    const res = await client.chat.completions.create({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract ALL text from this image. If it's handwritten notes, transcribe everything you can read. If it's a textbook page, extract all the text content. If it's a diagram, describe it in detail. Preserve the structure (headings, bullet points, numbered lists) as much as possible. Output only the extracted content, no commentary.",
            },
            {
              type: "image_url",
              image_url: { url: `data:${mime_type ?? "image/jpeg"};base64,${image_base64}` },
            },
          ],
        },
      ],
      max_tokens: 4000,
    });

    const text = res.choices[0]?.message?.content ?? "";
    if (!text) {
      return NextResponse.json({ error: "Could not extract text from image" }, { status: 422 });
    }
    return NextResponse.json({ text });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Vision API failed";
    if (msg.includes("must be a string") || msg.includes("vision") || msg.includes("image")) {
      return NextResponse.json(
        { error: "Your current AI model doesn't support image analysis. Upload PDFs or DOCX files instead, or switch to a vision-capable model in Settings." },
        { status: 422 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
