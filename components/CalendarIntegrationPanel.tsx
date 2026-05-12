"use client";

import { useCallback, useEffect, useState } from "react";
import { parseICS, exportToICS } from "@/lib/icsUtils";
import type { PlannerEntry } from "./PlannerBoard";

interface Props {
  entries: PlannerEntry[];
  setEntries: (e: PlannerEntry[]) => void;
}

export function CalendarIntegrationPanel({ entries, setEntries }: Props) {
  const [gcalStatus, setGcalStatus] = useState<"idle" | "loading" | "connected" | "error">("idle");
  const [syncCount, setSyncCount] = useState(0);

  const fetchGoogleEvents = useCallback(async () => {
    setGcalStatus("loading");
    try {
      const r = await fetch("/api/calendar/google/events");
      const data = await r.json();
      if (data.connected) {
        setGcalStatus("connected");
        const existingIds = new Set(entries.map((e) => e.id));
        const mappedEvents: PlannerEntry[] = (data.events as any[]).map((item: any) => {
          const allDay = !!item.start.date;
          const startDate = allDay ? new Date(item.start.date + "T00:00:00") : new Date(item.start.dateTime);
          const endDate   = allDay ? new Date(item.end.date + "T00:00:00")   : new Date(item.end.dateTime);
          const startH = allDay ? -1 : startDate.getHours() + startDate.getMinutes() / 60;
          const endH   = allDay ? -1 : endDate.getHours()   + endDate.getMinutes()   / 60;
          
          const y = startDate.getFullYear();
          const m = String(startDate.getMonth() + 1).padStart(2, '0');
          const d = String(startDate.getDate()).padStart(2, '0');
          const isoDate = `${y}-${m}-${d}`;

          return {
            id:       `gcal_${item.id}`,
            title:    item.summary ?? "(No title)",
            date:     isoDate,
            start:    allDay ? -1 : Math.round(startH * 2) / 2,
            end:      allDay ? -1 : Math.round(endH * 2) / 2,
            type:     "Class",
            location: item.location ?? "",
            notes:    item.description ?? "",
            allDay,
            repeat:   "none",
            alert:    "none",
            gcalId:   item.id,
          };
        });
        const newEvents = mappedEvents.filter((e) => !existingIds.has(e.id));
        if (newEvents.length) {
          setEntries([...entries, ...newEvents]);
          setSyncCount(newEvents.length);
        } else {
          setSyncCount(0);
        }
      } else {
        setGcalStatus("idle");
      }
    } catch {
      setGcalStatus("error");
    }
  }, [entries, setEntries]);

  useEffect(() => {
    fetchGoogleEvents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const syncToGoogle = useCallback(async () => {
    let synced = 0;
    for (const entry of entries) {
      if ((entry as any).gcalId || entry.id.startsWith("gcal_")) continue;
      try {
        const startHStr = String(Math.floor(entry.start)).padStart(2, '0');
        const startMStr = (entry.start % 1) >= 0.5 ? "30" : "00";
        const clientStartTime = `${entry.date}T${startHStr}:${startMStr}:00`;

        const endHStr = String(Math.floor(entry.end)).padStart(2, '0');
        const endMStr = (entry.end % 1) >= 0.5 ? "30" : "00";
        const clientEndTime = `${entry.date}T${endHStr}:${endMStr}:00`;

        const res = await fetch("/api/calendar/google/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...entry,
            clientStartTime,
            clientEndTime,
            clientTimeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          }),
        });
        if (res.ok) synced++;
      } catch { /* skip failed */ }
    }
    setSyncCount(synced);
    if (synced > 0) {
      alert(`Synced ${synced} event(s) to Google Calendar`);
    } else {
      alert("All events already synced");
    }
  }, [entries]);

  const handleICSImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const imported = parseICS(text);
      const existingIds = new Set(entries.map((ev) => ev.id));
      const fresh = imported.filter((ev) => !existingIds.has(ev.id));
      setEntries([...entries, ...fresh]);
      alert(`Imported ${fresh.length} event(s)`);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleICSExport = () => {
    const ics = exportToICS(entries);
    const blob = new Blob([ics], { type: "text/calendar" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "bluprint-schedule.ics";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-lg space-y-4">
      <p className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">Sync Calendar</p>

      {/* Google Calendar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shadow-sm shrink-0">
            <svg viewBox="0 0 24 24" className="w-4 h-4">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">Google Calendar</p>
            <p className={`text-[10px] ${gcalStatus === "connected" ? "text-emerald-600" : gcalStatus === "error" ? "text-red-500" : "text-[var(--muted)]"}`}>
              {gcalStatus === "loading" ? "Syncing..." : gcalStatus === "connected" ? "Connected" : gcalStatus === "error" ? "Connection failed" : "Not connected"}
            </p>
          </div>
          {gcalStatus === "idle" || gcalStatus === "error" ? (
            <a href="/api/calendar/google" className="rounded-xl bg-[var(--accent)] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[var(--accent-hover)] transition-colors shrink-0">
              Connect
            </a>
          ) : gcalStatus === "connected" ? (
            <div className="flex gap-1.5">
              <button onClick={fetchGoogleEvents} className="rounded-xl bg-[var(--accent)] px-3 py-1.5 text-[11px] font-medium text-white hover:bg-[var(--accent-hover)] transition-colors shrink-0">
                Pull
              </button>
              <button onClick={syncToGoogle} className="rounded-xl bg-emerald-500 px-3 py-1.5 text-[11px] font-medium text-white hover:bg-emerald-500 transition-colors shrink-0">
                Push
              </button>
            </div>
          ) : null}
        </div>
        {gcalStatus === "connected" && syncCount > 0 && (
          <p className="text-[10px] text-emerald-600 pl-9">{syncCount} event(s) synced</p>
        )}
      </div>

      <div className="h-px bg-[var(--border)]" />

      {/* ICS / Apple Calendar */}
      <div className="space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center shadow-sm shrink-0">
            <span className="text-sm">📅</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium">Apple / iCal</p>
            <p className="text-[10px] text-[var(--muted)]">Import or export .ics</p>
          </div>
        </div>
        <div className="flex gap-2">
          <label className="flex-1 cursor-pointer rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-[11px] font-medium text-[var(--muted-foreground)] hover:bg-[var(--background-secondary)] transition-colors text-center">
            Import .ics
            <input type="file" accept=".ics" className="hidden" onChange={handleICSImport} />
          </label>
          <button onClick={handleICSExport} className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-3 py-2 text-[11px] font-medium text-[var(--muted-foreground)] hover:bg-[var(--background-secondary)] transition-colors">
            Export .ics
          </button>
        </div>
      </div>
    </div>
  );
}
