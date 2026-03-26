import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser, safeJsonParse } from "@/lib/app-user";
import { aiService } from "@/lib/ai-service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { appUser } = await requireAppUser();
    const body = await request.json();
    const jobDescription = String(body?.jobDescription || "").trim();

    if (jobDescription.length < 80) {
      return NextResponse.json({ error: "Paste a full job description first." }, { status: 400 });
    }

    const profile = await prisma.studentProfile.findUnique({ where: { userId: appUser.id } });
    const analysis = await aiService.analyzeJobDescription(jobDescription, profile ? safeJsonParse(profile.profileJson, null) : null);

    return NextResponse.json(analysis);
  } catch (error) {
    console.error("job-analyzer error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
