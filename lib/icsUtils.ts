import type { PlannerEntry } from "@/components/PlannerBoard";

const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function parseICSDate(raw: string): { date: Date; allDay: boolean } {
  if (raw.length === 8) {
    // DATE format: YYYYMMDD
    const y = +raw.slice(0, 4), m = +raw.slice(4, 6) - 1, d = +raw.slice(6, 8);
    return { date: new Date(y, m, d), allDay: true };
  }
  // DATETIME: YYYYMMDDTHHMMSSZ or with TZID
  const cleaned = raw.replace(/[TZ]/g, " ").trim();
  const y  = +cleaned.slice(0, 4), mo = +cleaned.slice(4, 6) - 1, d = +cleaned.slice(6, 8);
  const h  = +cleaned.slice(9, 11), min = +cleaned.slice(11, 13), s = +cleaned.slice(13, 15);
  return { date: new Date(y, mo, d, h, min, s), allDay: false };
}

/** Parse .ics file text → PlannerEntry[] (current week only) */
export function parseICS(icsText: string): PlannerEntry[] {
  const entries: PlannerEntry[] = [];
  const now = new Date();
  const diffToMon = now.getDay() === 0 ? -6 : 1 - now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMon);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 5);

  const events = icsText.split("BEGIN:VEVENT");
  events.shift(); // remove header

  for (const block of events) {
    const get = (key: string): string => {
      const match = block.match(new RegExp(`${key}(?:;[^:]*)?:([^\r\n]+)`));
      return match ? match[1].trim() : "";
    };

    const rawStart = get("DTSTART");
    const rawEnd   = get("DTEND") || get("DTSTART");
    if (!rawStart) continue;

    const { date: startDate, allDay } = parseICSDate(rawStart);
    const { date: endDate } = parseICSDate(rawEnd);

    // Filter to current week
    if (startDate < weekStart || startDate >= weekEnd) continue;

    const day = weekdays[startDate.getDay()];
    if (!weekdays.slice(1, 6).includes(day) && !allDay) continue;

    const startH = allDay ? 0 : startDate.getHours() + startDate.getMinutes() / 60;
    const endH   = allDay ? 0 : endDate.getHours() + endDate.getMinutes() / 60;

    entries.push({
      id: crypto.randomUUID(),
      title: get("SUMMARY"),
      date: startDate.toISOString().slice(0, 10),
      day,
      start: Math.round(startH * 2) / 2,
      end:   Math.max(Math.round(endH * 2) / 2, Math.round(startH * 2) / 2 + 0.5),
      type: "Class",
      location: get("LOCATION"),
      notes: get("DESCRIPTION"),
      allDay,
      repeat: "none",
      alert: "none",
    });
  }
  return entries;
}

/** Export PlannerEntry[] to .ics string */
export function exportToICS(entries: PlannerEntry[]): string {
  const now = new Date();
  const diffToMon = now.getDay() === 0 ? -6 : 1 - now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diffToMon);
  weekStart.setHours(0, 0, 0, 0);

  const dayOffset: Record<string, number> = {
    Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4,
  };

  function toICSDate(h: number, offset: number): string {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + offset);
    d.setHours(Math.floor(h), h % 1 >= 0.5 ? 30 : 0, 0, 0);
    return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  }

  function escape(s: string) { return s.replace(/,/g, "\\,").replace(/\n/g, "\\n"); }

  const veEvents = entries.map((e) => {
    const entryDay = e.day || (() => {
      const d = new Date(e.date + "T00:00:00");
      return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][d.getDay()];
    })();
    const offset = dayOffset[entryDay] ?? 0;
    const dtStart = e.allDay
      ? (() => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + offset); return d.toISOString().slice(0, 10).replace(/-/g, ""); })()
      : toICSDate(e.start, offset);
    const dtEnd = e.allDay
      ? (() => { const d = new Date(weekStart); d.setDate(weekStart.getDate() + offset + 1); return d.toISOString().slice(0, 10).replace(/-/g, ""); })()
      : toICSDate(e.end, offset);

    return [
      "BEGIN:VEVENT",
      `UID:${e.id}@bluprint`,
      `SUMMARY:${escape(e.title || "New Event")}`,
      e.allDay ? `DTSTART;VALUE=DATE:${dtStart}` : `DTSTART:${dtStart}`,
      e.allDay ? `DTEND;VALUE=DATE:${dtEnd}`   : `DTEND:${dtEnd}`,
      e.location  ? `LOCATION:${escape(e.location)}` : "",
      e.notes     ? `DESCRIPTION:${escape(e.notes)}` : "",
      "END:VEVENT",
    ].filter(Boolean).join("\r\n");
  });

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//bluprint//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...veEvents,
    "END:VCALENDAR",
  ].join("\r\n");
}
