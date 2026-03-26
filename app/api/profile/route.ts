import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAppUser, safeJsonParse } from "@/lib/app-user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { appUser } = await requireAppUser();
    if (!prisma) {
      return NextResponse.json({ profile: null });
    }
    const profile = await prisma.studentProfile.findUnique({ where: { userId: appUser.id } });
    return NextResponse.json({ profile: profile ? safeJsonParse(profile.profileJson, null) : null });
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

    const profile = await prisma.studentProfile.upsert({
      where: { userId: appUser.id },
      update: {
        fullName: next.name || "",
        university: next.university || "",
        degree: next.degree || "",
        yearOfStudy: next.yearOfStudy || "",
        graduating: next.graduating || "",
        studentType: next.studentType || "",
        dreamRole: next.dreamRole || "",
        targetIndustries: next.targetIndustries || "",
        profileJson: JSON.stringify(next),
      },
      create: {
        userId: appUser.id,
        fullName: next.name || "",
        university: next.university || "",
        degree: next.degree || "",
        yearOfStudy: next.yearOfStudy || "",
        graduating: next.graduating || "",
        studentType: next.studentType || "",
        dreamRole: next.dreamRole || "",
        targetIndustries: next.targetIndustries || "",
        profileJson: JSON.stringify(next),
      },
    });

    return NextResponse.json({ profile: safeJsonParse(profile.profileJson, null) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
