import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser, safeJsonParse } from "@/lib/app-user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { appUser } = await requireAppUser();
    if (!prisma) {
      // Return profile from localStorage-synced onboarding if available
      return NextResponse.json({ profile: { name: appUser.name, email: appUser.email } });
    }
    const dbProfile = await prisma.studentProfile.findUnique({ where: { userId: appUser.id } });
    if (!dbProfile) return NextResponse.json({ profile: null });
    const profile = safeJsonParse(dbProfile.profileJson, {}) as any;
    // Ensure array fields always have defaults
    profile.skills = profile.skills || [];
    profile.experiences = profile.experiences || [];
    profile.education = profile.education || [];
    profile.languages = profile.languages || [];
    profile.certifications = profile.certifications || [];
    profile.extracurriculars = profile.extracurriculars || [];
    profile.courseSchedule = profile.courseSchedule || [];
    if (dbProfile.courseScheduleJson) {
      const courses = safeJsonParse(dbProfile.courseScheduleJson, []);
      if (courses.length > 0 && profile.courseSchedule.length === 0) {
        profile.courseSchedule = courses;
      }
    }
    return NextResponse.json({ profile });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { appUser } = await requireAppUser();
    const body = await request.json();
    if (!prisma) {
      return NextResponse.json({ profile: body });
    }
    const existing = await prisma.studentProfile.findUnique({ where: { userId: appUser.id } });
    const current = existing ? safeJsonParse(existing.profileJson, {}) : {};
    const next = { ...current, ...body };

    const profileData = {
      fullName: next.name || "",
      university: next.university || "",
      degree: next.degree || "",
      minor: next.minor || "",
      gpa: next.gpa || "",
      yearOfStudy: next.yearOfStudy || "",
      graduating: next.graduating || "",
      studentType: next.studentType || "",
      countryOfOrigin: next.countryOfOrigin || "",
      visaStatus: next.visaStatus || "",
      sponsorshipNeeded: next.sponsorshipNeeded || "",
      dreamRole: next.dreamRole || "",
      targetIndustries: next.targetIndustries || "",
      targetCompanies: next.targetCompanies || "",
      preferredLocations: next.preferredLocations || "",
      willingToRelocate: next.willingToRelocate || "",
      linkedinUrl: next.linkedinUrl || "",
      portfolioUrl: next.portfolioUrl || "",
      courseScheduleJson: next.courseSchedule ? JSON.stringify(next.courseSchedule) : "",
      profileJson: JSON.stringify(next),
    };

    const profile = await prisma.studentProfile.upsert({
      where: { userId: appUser.id },
      update: profileData,
      create: { userId: appUser.id, ...profileData },
    });

    return NextResponse.json({ profile: safeJsonParse(profile.profileJson, null) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
