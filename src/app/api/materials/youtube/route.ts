import { NextRequest, NextResponse } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";

export async function POST(req: NextRequest) {
  const { url } = await req.json();
  if (!url?.trim()) {
    return NextResponse.json({ error: "YouTube URL is required" }, { status: 400 });
  }

  const videoIdMatch = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  if (!videoIdMatch) {
    return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
  }

  try {
    const transcript = await YoutubeTranscript.fetchTranscript(videoIdMatch[1]);
    const text = transcript.map((t) => t.text).join(" ");

    if (!text.trim()) {
      return NextResponse.json({ error: "No transcript available for this video" }, { status: 422 });
    }

    return NextResponse.json({ text, video_id: videoIdMatch[1] });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not fetch transcript" },
      { status: 500 }
    );
  }
}
