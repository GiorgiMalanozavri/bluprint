import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI         = (process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || "http://localhost:3000") + "/api/calendar/google/callback";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ error: "No code" }, { status: 400 });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();
  if (!tokenRes.ok) return NextResponse.json({ error: tokens }, { status: 500 });

  // Store tokens in a secure HTTP-only cookie (good for session use)
  const cookieStore = await cookies();
  cookieStore.set("gcal_access_token",  tokens.access_token,  { httpOnly: true, path: "/", maxAge: 3600 });
  if (tokens.refresh_token)
    cookieStore.set("gcal_refresh_token", tokens.refresh_token, { httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 30 });

  return NextResponse.redirect(new URL("/planner", request.nextUrl.origin));
}
