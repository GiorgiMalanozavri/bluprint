import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser, safeJsonParse } from "@/lib/app-user";
import { aiService } from "@/lib/ai-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { appUser } = await requireAppUser();
    const body = await request.json();
    const message = String(body?.message || "").trim();
    let threadId = String(body?.threadId || "").trim();
    const pageContext = body?.pageContext || null;

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    if (!prisma) {
      const reply = await aiService.chat(message, {
        profile: null,
        roadmap: null,
        history: [],
        pageContext,
      });
      return NextResponse.json({ threadId: "no-db", reply });
    }

    const [profile, roadmap] = await Promise.all([
      prisma.studentProfile.findUnique({ where: { userId: appUser.id } }),
      prisma.roadmap.findFirst({ where: { userId: appUser.id }, orderBy: { createdAt: "desc" } }),
    ]);

    let thread = threadId
      ? await prisma.chatThread.findFirst({ where: { id: threadId, userId: appUser.id }, include: { messages: { orderBy: { createdAt: "asc" } } } })
      : null;

    if (!thread) {
      thread = await prisma.chatThread.create({
        data: {
          userId: appUser.id,
          title: message.split(" ").slice(0, 6).join(" "),
        },
        include: { messages: true },
      });
      threadId = thread.id;
    }

    await prisma.chatMessage.create({
      data: {
        threadId,
        role: "user",
        content: message,
      },
    });

    const reply = await aiService.chat(message, {
      profile: profile ? safeJsonParse(profile.profileJson, null) : null,
      roadmap: roadmap
        ? {
            semesters: safeJsonParse(roadmap.roadmapJson, []),
            monthlyTasks: safeJsonParse(roadmap.monthlyTasksJson, []),
            cvAnalysis: safeJsonParse(roadmap.cvAnalysisJson, null),
          }
        : null,
      history: thread.messages.slice(-10).map((item) => ({ role: item.role, content: item.content })),
      pageContext,
    });

    await prisma.chatMessage.create({
      data: {
        threadId,
        role: "assistant",
        content: reply,
      },
    });

    return NextResponse.json({ threadId, reply });
  } catch (error) {
    console.error("assistant-chat error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
