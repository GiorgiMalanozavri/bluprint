"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { PlannerBoard, type MonthlyTask, type PlannerEntry, migrateEntries } from "@/components/PlannerBoard";
import { userStorage } from "@/lib/user-storage";

type BootstrapData = {
  profile: {
    name?: string;
    degree?: string;
    university?: string;
    yearOfStudy?: string;
  } | null;
  roadmap: {
    monthlyTasks: MonthlyTask[];
  } | null;
  user: {
    name: string | null;
    email: string | null;
  };
};

const plannerStorageKey = "bluprint_planner_entries_v2";

function getThisWeekDate(offsetDays: number): string {
  const now = new Date();
  const day = now.getDay();
  const diffToMon = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diffToMon + offsetDays);
  return mon.toISOString().slice(0, 10);
}

const starterEntries: PlannerEntry[] = [
  { id: "starter-1", title: "Microeconomics", date: getThisWeekDate(0), start: 10, end: 11.5, type: "Class",    location: "Harper 130",     notes: "", allDay: false, repeat: "none", alert: "none" },
  { id: "starter-2", title: "Consulting club",  date: getThisWeekDate(1), start: 18, end: 19,   type: "Activity", location: "Student center", notes: "", allDay: false, repeat: "none", alert: "none" },
  { id: "starter-3", title: "Library deep work",date: getThisWeekDate(2), start: 14, end: 16,   type: "Study",    location: "Regenstein",     notes: "", allDay: false, repeat: "none", alert: "none" },
  { id: "starter-4", title: "Campus job",       date: getThisWeekDate(3), start: 12, end: 15,   type: "Work",     location: "Career office",  notes: "", allDay: false, repeat: "none", alert: "none" },
];

export default function PlannerPage() {
  const [data, setData] = useState<BootstrapData | null>(null);
  const [entries, setEntries] = useState<PlannerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/bootstrap");
      const result = await response.json();
      if (!response.ok) { setLoading(false); return; }
      setData(result);
      const savedV2 = userStorage.getItem(plannerStorageKey);
      const legacySavedV2 = userStorage.getItem("foundry_planner_entries_v2");
      const savedV1 = userStorage.getItem("bluprint_planner_entries");
      const legacySavedV1 = userStorage.getItem("foundry_planner_entries");
      if (savedV2) {
        setEntries(migrateEntries(JSON.parse(savedV2)));
      } else if (legacySavedV2) {
        setEntries(migrateEntries(JSON.parse(legacySavedV2)));
      } else if (savedV1) {
        setEntries(migrateEntries(JSON.parse(savedV1)));
      } else if (legacySavedV1) {
        setEntries(migrateEntries(JSON.parse(legacySavedV1)));
      } else {
        setEntries(starterEntries);
      }
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading) userStorage.setItem(plannerStorageKey, JSON.stringify(entries));
  }, [entries, loading]);

  // Listen for AI sidebar data changes
  useEffect(() => {
    const handler = () => {
      const raw = userStorage.getItem(plannerStorageKey);
      if (raw) setEntries(migrateEntries(JSON.parse(raw)));
    };
    window.addEventListener("bluprint-data-changed", handler);
    return () => window.removeEventListener("bluprint-data-changed", handler);
  }, []);

  if (loading || !data) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <AppShell>
      <PlannerBoard
        entries={entries}
        setEntries={setEntries}
        recommendations={data.roadmap?.monthlyTasks || []}
      />
    </AppShell>
  );
}
