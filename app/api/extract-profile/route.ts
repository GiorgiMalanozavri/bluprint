import { NextResponse } from "next/server";
import { aiService } from "@/lib/ai-service";
import { requireAppUser } from "@/lib/app-user";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { appUser } = await requireAppUser();
    const body = await request.json();
    const rawText = String(body?.rawText || "").trim();
    const fileName = String(body?.fileName || "resume.pdf");
    const fileSize = typeof body?.fileSize === "number" ? body.fileSize : null;

    if (rawText.length < 80) {
      return NextResponse.json({ error: "Resume text is too short to analyze." }, { status: 400 });
    }

    const extracted = await aiService.extractProfileFromCV(rawText);

    if (prisma) {
      await prisma.cVUpload.create({
        data: {
          userId: appUser.id,
          fileName,
          fileSize,
          rawText,
          extractedJson: JSON.stringify(extracted),
        },
      });

      await prisma.studentProfile.upsert({
        where: { userId: appUser.id },
        update: {
          fullName: extracted.name,
          university: extracted.university,
          degree: extracted.degree,
          yearOfStudy: extracted.yearOfStudy,
          graduating: extracted.graduating,
          studentType: extracted.studentType,
          dreamRole: extracted.dreamRole,
          targetIndustries: extracted.targetIndustries,
          profileJson: JSON.stringify(extracted),
        },
        create: {
          userId: appUser.id,
          fullName: extracted.name,
          university: extracted.university,
          degree: extracted.degree,
          yearOfStudy: extracted.yearOfStudy,
          graduating: extracted.graduating,
          studentType: extracted.studentType,
          dreamRole: extracted.dreamRole,
          targetIndustries: extracted.targetIndustries,
          profileJson: JSON.stringify(extracted),
        },
      });
    }

    return NextResponse.json({ profile: extracted });
  } catch (error) {
    console.error("extract-profile error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
