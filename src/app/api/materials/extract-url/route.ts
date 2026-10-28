import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url?.trim()) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { Accept: "text/plain" },
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Failed to fetch URL (${res.status})` }, { status: 422 });
    }

    const text = await res.text();
    if (!text.trim()) {
      return NextResponse.json({ error: "No content found at URL" }, { status: 422 });
    }

    return NextResponse.json({ text: text.slice(0, 100000) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "URL fetch failed" },
      { status: 500 }
    );
  }
}
