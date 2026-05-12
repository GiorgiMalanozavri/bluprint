import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID || "";
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const access  = cookieStore.get("gcal_access_token")?.value;
  const refresh = cookieStore.get("gcal_refresh_token")?.value;
  if (access) return access;
  if (!refresh) return null;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
      refresh_token: refresh,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  cookieStore.set("gcal_access_token", data.access_token, { httpOnly: true, path: "/", maxAge: 3600 });
  return data.access_token;
}

export async function GET(request: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ connected: false, events: [] });

  // Fetch events for 4 weeks around current date
  const now = new Date();
  const day = now.getDay();
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon - 7); // 1 week before
  monday.setHours(0, 0, 0, 0);
  const endDate = new Date(monday);
  endDate.setDate(monday.getDate() + 28); // 4 weeks
  endDate.setHours(23, 59, 59, 999);

  const params = new URLSearchParams({
    timeMin: monday.toISOString(),
    timeMax: endDate.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "500",
  });

  const gcalRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!gcalRes.ok) return NextResponse.json({ connected: false, events: [] });
  const data = await gcalRes.json();

  const events = (data.items ?? []).filter((item: any) => item.status !== "cancelled");

  return NextResponse.json({ connected: true, events });
}

export async function POST(request: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });

  const entry = await request.json();

  // Use entry.date (ISO format) directly
  const targetDate = new Date(entry.date + "T00:00:00");

  if (entry.allDay) {
    const body = {
      summary: entry.title || "New Event",
      location: entry.location,
      description: entry.notes,
      start: { date: entry.date },
      end: { date: entry.date },
    };
    const res = await fetch(
      "https://www.googleapis.com/calendar/v3/calendars/primary/events",
      { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    return NextResponse.json(await res.json(), { status: res.status });
  }

  const body = {
    summary: entry.title || "New Event",
    location: entry.location,
    description: entry.notes,
    start: { dateTime: entry.clientStartTime, timeZone: entry.clientTimeZone },
    end:   { dateTime: entry.clientEndTime,   timeZone: entry.clientTimeZone },
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  return NextResponse.json(await res.json(), { status: res.status });
}

export async function DELETE(request: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });
  const { gcalId } = await request.json();
  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${gcalId}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
  );
  return NextResponse.json({ ok: true });
}
