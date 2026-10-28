import { NextRequest, NextResponse } from "next/server";
import { getAiClient } from "@/lib/ai";

export async function POST(req: NextRequest) {
  const { image_base64, mime_type } = await req.json();
  if (!image_base64) {
    return NextResponse.json({ error: "image_base64 is required" }, { status: 400 });
  }

  try {
    const { client, model } = await getAiClient();
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
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Vision API failed" },
      { status: 500 }
    );
  }
}
