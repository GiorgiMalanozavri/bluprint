import { NextResponse } from "next/server";
import { aiService } from "@/lib/ai-service";
import { requireAppUser, safeJsonParse } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const { appUser } = await requireAppUser();
    const body = await req.json().catch(() => ({}));
    const message = String(body?.message || "").trim();
    let resumeText = String(body?.resumeText || "").trim();
    let userData = body?.userData || null;

    if (!message) {
      return NextResponse.json({ error: "Missing message" }, { status: 400 });
    }

    let latestUpload = null;
    let profile = null;

    if (prisma) {
      latestUpload = await prisma.cVUpload.findFirst({
        where: { userId: appUser.id },
        orderBy: { createdAt: "desc" },
      });
      profile = await prisma.studentProfile.findUnique({ where: { userId: appUser.id } });
    }

    if (!resumeText) {
      resumeText = latestUpload?.rawText || "";
    }
    if (!userData && profile) {
      userData = safeJsonParse(profile.profileJson, null);
    }
    if (!resumeText || resumeText.replace(/\s/g, "").length < 80) {
      return NextResponse.json({ error: "Resume text too short/unavailable" }, { status: 400 });
    }

    const result = await aiService.analyzeResume(resumeText, userData);

    if (prisma) {
      if (latestUpload) {
        await prisma.cVUpload.update({
          where: { id: latestUpload.id },
          data: { analysisJson: JSON.stringify(result) },
        });
      }

      const latestRoadmap = await prisma.roadmap.findFirst({
        where: { userId: appUser.id },
        orderBy: { createdAt: "desc" },
      });

      if (latestRoadmap) {
        await prisma.roadmap.update({
          where: { id: latestRoadmap.id },
          data: { cvAnalysisJson: JSON.stringify(result) },
        });
      }
    }

    return NextResponse.json({
      reply: "I've analyzed your resume against your profile. Here's a breakdown of what I found.",
      scoreBreakdown: {
        score: result.score,
        strengths: result.strengths,
        issues: result.improvements,
        fixes: result.rewrites.map((s: any) => ({ issue: s.section, how: s.reason, example: s.suggested })),
        ats_keywords: { missing: result.missing, present: [], suggestions: [] },
        sections: {
          contact: { ok: true, notes: [] },
          experience: { ok: result.strengths.some((s: string) => s.toLowerCase().includes("exp")), notes: [] },
          projects: { ok: true, notes: [] },
          education: { ok: true, notes: [] },
          skills: { ok: result.missing.length === 0, notes: [] },
          formatting: { ok: true, notes: [] }
        },
        quick_wins: result.strengths.slice(0, 2)
      },
      suggestions: result.rewrites.map((s: any, i: number) => ({
        id: `gen_${i}`,
        title: `Improve ${s.section}`,
        reason: s.reason,
        before: s.original,
        after: s.suggested
      }))
    });
  } catch (e: any) {
    console.error("AI Error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
