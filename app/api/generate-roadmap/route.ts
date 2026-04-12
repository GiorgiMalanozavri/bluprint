import { NextResponse } from "next/server";
import { aiService } from "@/lib/ai-service";
import { requireAppUser } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
    try {
        const { appUser } = await requireAppUser();
        const body = await req.json().catch(() => ({}));
        const userData = body?.profile || body?.userData;

        if (!userData) {
            return NextResponse.json({ error: "Missing user data" }, { status: 400 });
        }

        const roadmap = await aiService.generateRoadmap(userData);

        if (prisma) {
          const profileData = {
            fullName: userData.name || "",
            university: userData.university || "",
            degree: userData.degree || "",
            minor: userData.minor || "",
            gpa: userData.gpa || "",
            yearOfStudy: userData.yearOfStudy || "",
            graduating: userData.graduating || "",
            studentType: userData.studentType || "",
            countryOfOrigin: userData.countryOfOrigin || "",
            visaStatus: userData.visaStatus || "",
            sponsorshipNeeded: userData.sponsorshipNeeded || "",
            dreamRole: userData.dreamRole || "",
            targetIndustries: userData.targetIndustries || "",
            targetCompanies: userData.targetCompanies || "",
            preferredLocations: userData.preferredLocations || "",
            willingToRelocate: userData.willingToRelocate || "",
            linkedinUrl: userData.linkedinUrl || "",
            portfolioUrl: userData.portfolioUrl || "",
            courseScheduleJson: userData.courseSchedule ? JSON.stringify(userData.courseSchedule) : "",
            profileJson: JSON.stringify(userData),
          };

          await prisma.studentProfile.upsert({
            where: { userId: appUser.id },
            update: profileData,
            create: { userId: appUser.id, ...profileData },
          });

          await prisma.roadmap.create({
            data: {
              userId: appUser.id,
              roadmapJson: JSON.stringify(roadmap.semesters),
              monthlyTasksJson: JSON.stringify(roadmap.monthlyTasks),
              cvAnalysisJson: JSON.stringify({
                score: roadmap.cvScore,
                strengths: roadmap.strengths,
                improvements: roadmap.improvements,
                missing: roadmap.missing,
                summary: roadmap.nudge,
              }),
            },
          });
        }

        return NextResponse.json(roadmap);
    } catch (e: any) {
        console.error("Roadmap Generation Error:", e);
        return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
    }
}
