import { NextResponse } from "next/server";
import { requireAppUser, safeJsonParse } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { appUser, supabaseUser } = await requireAppUser();

    // Extract name from Google OAuth metadata
    const meta = supabaseUser.user_metadata || {};
    const name = meta.full_name || meta.name || appUser.name || "Student";
    const avatarUrl = meta.avatar_url || meta.picture || null;

    let profile: any = null;
    let roadmap: any = null;
    let chatThreads: any[] = [];

    if (prisma) {
      // Load profile from database
      const dbProfile = await prisma.studentProfile.findUnique({
        where: { userId: appUser.id },
      });
      if (dbProfile) {
        profile = safeJsonParse(dbProfile.profileJson, null);
        // Merge in course schedule if stored separately
        if (dbProfile.courseScheduleJson && profile) {
          const courses = safeJsonParse(dbProfile.courseScheduleJson, []);
          if (courses.length > 0 && (!profile.courseSchedule || profile.courseSchedule.length === 0)) {
            profile.courseSchedule = courses;
          }
        }
      }

      // Load latest roadmap from database
      const dbRoadmap = await prisma.roadmap.findFirst({
        where: { userId: appUser.id },
        orderBy: { createdAt: "desc" },
      });
      if (dbRoadmap) {
        const semesters = safeJsonParse(dbRoadmap.roadmapJson, []);
        const monthlyTasks = safeJsonParse(dbRoadmap.monthlyTasksJson, []);
        const cvAnalysis = dbRoadmap.cvAnalysisJson
          ? safeJsonParse(dbRoadmap.cvAnalysisJson, null)
          : null;
        roadmap = { semesters, monthlyTasks, cvAnalysis };
      }

      // Load chat threads
      const dbThreads = await prisma.chatThread.findMany({
        where: { userId: appUser.id },
        orderBy: { updatedAt: "desc" },
        take: 5,
        include: {
          messages: { orderBy: { createdAt: "asc" }, take: 50 },
        },
      });
      chatThreads = dbThreads.map((t) => ({
        id: t.id,
        title: t.title,
        messages: t.messages.map((m) => ({ role: m.role, content: m.content })),
      }));
    }

    return NextResponse.json({
      profile,
      roadmap,
      chatThreads,
      user: {
        id: appUser.id,
        name,
        email: appUser.email,
        avatarUrl,
      },
    });
  } catch (error) {
    console.error("bootstrap error", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Server error" },
      { status: 500 }
    );
  }
}
