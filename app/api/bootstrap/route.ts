import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/app-user";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { appUser, supabaseUser } = await requireAppUser();

    // Extract name from Google OAuth metadata
    const meta = supabaseUser.user_metadata || {};
    const name = meta.full_name || meta.name || appUser.name || "Student";
    const avatarUrl = meta.avatar_url || meta.picture || null;

    return NextResponse.json({
      profile: null,
      cvUpload: null,
      roadmap: null,
      chatThreads: [],
      user: {
        id: appUser.id,
        name,
        email: appUser.email,
        avatarUrl,
      },
    });
  } catch (error) {
    console.error("bootstrap error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Server error" }, { status: 500 });
  }
}
