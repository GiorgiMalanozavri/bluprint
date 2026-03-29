import { NextResponse } from "next/server";
import { aiService } from "@/lib/ai-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const message = String(body?.message || "").trim();
    const pageContext = body?.pageContext || null;
    const history = body?.history || [];

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    const result = await aiService.chat(message, {
      profile: body?.profile || null,
      roadmap: body?.roadmap || null,
      history,
      pageContext,
    });

    return NextResponse.json({ reply: result.reply, actions: result.actions });
  } catch (error) {
    console.error("assistant-chat error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
