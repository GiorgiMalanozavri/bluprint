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

  // Map to PlannerEntry format with ISO date
  const events = (data.items ?? [])
    .filter((item: any) => item.status !== "cancelled")
    .map((item: any) => {
      const allDay = !!item.start.date;
      const startDate = allDay ? new Date(item.start.date) : new Date(item.start.dateTime);
      const endDate   = allDay ? new Date(item.end.date)   : new Date(item.end.dateTime);
      const startH = allDay ? -1 : startDate.getHours() + startDate.getMinutes() / 60;
      const endH   = allDay ? -1 : endDate.getHours()   + endDate.getMinutes()   / 60;

      // ISO date format YYYY-MM-DD
      const isoDate = startDate.toISOString().slice(0, 10);

      return {
        id:       `gcal_${item.id}`,
        title:    item.summary ?? "(No title)",
        date:     isoDate,
        start:    allDay ? -1 : Math.round(startH * 2) / 2,
        end:      allDay ? -1 : Math.round(endH * 2) / 2,
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

  const startDt = new Date(targetDate);
  startDt.setHours(Math.floor(entry.start), (entry.start % 1) >= 0.5 ? 30 : 0, 0, 0);
  const endDt = new Date(targetDate);
  endDt.setHours(Math.floor(entry.end), (entry.end % 1) >= 0.5 ? 30 : 0, 0, 0);

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const body = {
    summary: entry.title || "New Event",
    location: entry.location,
    description: entry.notes,
    start: { dateTime: startDt.toISOString(), timeZone: tz },
    end:   { dateTime: endDt.toISOString(),   timeZone: tz },
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
