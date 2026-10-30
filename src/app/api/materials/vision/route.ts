import { NextRequest, NextResponse } from "next/server";
import { getAiClient, getGroqVisionClient } from "@/lib/ai";

const VISION_MODELS = [
  "llama-4-scout", "llama-4-maverick",
  "gpt-4o", "gpt-4o-mini",
  "gemini-3.8-flash", "gemini-3.1-pro",
  "claude-sonnet-5-5", "claude-haiku-5-5", "claude-opus-5-5",
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
    let { client, model } = await getAiClient();

    if (!supportsVision(model)) {
      const groqVision = getGroqVisionClient();
      if (!groqVision) {
        return NextResponse.json(
          { error: "Your current AI model doesn't support image analysis. Upload PDFs or DOCX files instead, or switch to a vision-capable model (like GPT-4o or Gemini) in Settings." },
          { status: 422 }
        );
      }
      ({ client, model } = groqVision);
    }

    const makeReq = (c: typeof client, m: string) => c.chat.completions.create({
      model: m,
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

    let res;
    try {
      res = await makeReq(client, model);
    } catch (primaryErr) {
      const groqVision = getGroqVisionClient();
      if (!groqVision || model === groqVision.model) throw primaryErr;
      res = await makeReq(groqVision.client, groqVision.model);
    }

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
