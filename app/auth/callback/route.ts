import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Get user info from Google
      const { data: { user } } = await supabase.auth.getUser();

      if (user && prisma) {
        const meta = user.user_metadata || {};
        const fullName = meta.full_name || meta.name || "";
        const email = user.email || `${user.id}@placeholder.local`;
        const avatarUrl = meta.avatar_url || meta.picture || "";

        // Upsert user with Google profile data
        await prisma.user.upsert({
          where: { email },
          update: {
            name: fullName,
            image: avatarUrl,
          },
          create: {
            id: user.id,
            email,
            name: fullName,
            image: avatarUrl,
          },
        });
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      const base = isLocalEnv ? origin : forwardedHost ? `https://${forwardedHost}` : origin;

      // Redirect to onboarding for new users, dashboard for returning
      return NextResponse.redirect(`${base}/dashboard`);
    }
  }

  return NextResponse.redirect(`${origin}/sign-in`);
}
