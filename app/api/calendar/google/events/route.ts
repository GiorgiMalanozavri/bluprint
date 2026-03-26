import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

const GOOGLE_CLIENT_ID     = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const access  = cookieStore.get("gcal_access_token")?.value;
  const refresh = cookieStore.get("gcal_refresh_token")?.value;
  if (access) return access;
  if (!refresh) return null;

  // Refresh the access token
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

  // Fetch events for the current week (Mon – Fri)
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diffToMon = (day === 0 ? -6 : 1 - day);
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  friday.setHours(23, 59, 59, 999);

  const params = new URLSearchParams({
    timeMin: monday.toISOString(),
    timeMax: friday.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });

  const gcalRes = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params}`,
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (!gcalRes.ok) return NextResponse.json({ connected: false, events: [] });
  const data = await gcalRes.json();

  // Map to PlannerEntry format
  const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const events = (data.items ?? []).map((item: any) => {
    const allDay = !!item.start.date;
    const startDate = allDay ? new Date(item.start.date) : new Date(item.start.dateTime);
    const endDate   = allDay ? new Date(item.end.date)   : new Date(item.end.dateTime);
    const day = weekdays[startDate.getDay()];
    const startH = allDay ? 0 : startDate.getHours() + startDate.getMinutes() / 60;
    const endH   = allDay ? 0 : endDate.getHours()   + endDate.getMinutes()   / 60;

    return {
      id:       item.id,
      title:    item.summary ?? "",
      day,
      start:    Math.round(startH * 2) / 2,
      end:      Math.round(endH   * 2) / 2,
      type:     "Class" as const,
      location: item.location ?? "",
      notes:    item.description ?? "",
      allDay,
      repeat:   "none" as const,
      alert:    "none" as const,
      gcalId:   item.id,
    };
  });

  return NextResponse.json({ connected: true, events });
}

export async function POST(request: NextRequest) {
  const token = await getAccessToken();
  if (!token) return NextResponse.json({ error: "Not connected" }, { status: 401 });

  const entry = await request.json();
  const dayMap: Record<string, number> = {
    Monday: 1, Tuesday: 2, Wednesday: 3, Thursday: 4, Friday: 5,
  };
  const now = new Date();
  const diffToMon = (now.getDay() === 0 ? -6 : 1 - now.getDay());
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMon);
  monday.setHours(0, 0, 0, 0);
  const targetDate = new Date(monday);
  targetDate.setDate(monday.getDate() + (dayMap[entry.day] ?? 0) - 1);

  const startDt = new Date(targetDate);
  startDt.setHours(Math.floor(entry.start), entry.start % 1 >= 0.5 ? 30 : 0, 0, 0);
  const endDt = new Date(targetDate);
  endDt.setHours(Math.floor(entry.end), entry.end % 1 >= 0.5 ? 30 : 0, 0, 0);

  const body = {
    summary: entry.title || "New Event",
    location: entry.location,
    description: entry.notes,
    start: { dateTime: startDt.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end:   { dateTime: endDt.toISOString(),   timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  };

  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events",
    { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, body: JSON.stringify(body) }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
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
