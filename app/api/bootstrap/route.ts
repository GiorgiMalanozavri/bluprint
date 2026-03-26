import { NextResponse } from "next/server";
import { requireAppUser, safeJsonParse } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { appUser } = await requireAppUser();

    if (!prisma) {
      return NextResponse.json({
        profile: null,
        cvUpload: null,
        roadmap: null,
        chatThreads: [],
        user: {
          id: appUser.id,
          name: appUser.name,
          email: appUser.email,
        },
      });
    }

    const [profile, latestUpload, latestRoadmap, threads] = await Promise.all([
      prisma.studentProfile.findUnique({ where: { userId: appUser.id } }),
      prisma.cVUpload.findFirst({ where: { userId: appUser.id }, orderBy: { createdAt: "desc" } }),
      prisma.roadmap.findFirst({ where: { userId: appUser.id }, orderBy: { createdAt: "desc" } }),
      prisma.chatThread.findMany({
        where: { userId: appUser.id },
        orderBy: { updatedAt: "desc" },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 20 } },
        take: 20,
      }),
    ]);

    return NextResponse.json({
      profile: profile ? safeJsonParse(profile.profileJson, null) : null,
      cvUpload: latestUpload
        ? {
            id: latestUpload.id,
            fileName: latestUpload.fileName,
            fileSize: latestUpload.fileSize,
            createdAt: latestUpload.createdAt,
            extracted: safeJsonParse(latestUpload.extractedJson, null),
            analysis: safeJsonParse(latestUpload.analysisJson, null),
          }
        : null,
      roadmap: latestRoadmap
        ? {
            id: latestRoadmap.id,
            semesters: safeJsonParse(latestRoadmap.roadmapJson, []),
            monthlyTasks: safeJsonParse(latestRoadmap.monthlyTasksJson, []),
            cvAnalysis: safeJsonParse(latestRoadmap.cvAnalysisJson, null),
          }
        : null,
      chatThreads: threads.map((thread) => ({
        id: thread.id,
        title: thread.title,
        updatedAt: thread.updatedAt,
        messages: thread.messages,
      })),
      user: {
        id: appUser.id,
        name: appUser.name,
        email: appUser.email,
      },
    });
  } catch (error) {
    console.error("bootstrap error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
