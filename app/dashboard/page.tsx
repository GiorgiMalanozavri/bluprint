"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, RefreshCcw, Users } from "lucide-react";
import AppShell from "@/components/AppShell";
import CampusNetworkCard from "@/components/CampusNetworkCard";
import Arc from "@/components/dashboard/Arc";
import TrajectoryChart from "@/components/dashboard/TrajectoryChart";
import SemesterMission from "@/components/dashboard/SemesterMission";
import WeeklyMoves from "@/components/dashboard/WeeklyMoves";
import type { MonthlyTask } from "@/components/PlannerBoard";
import { userStorage, setCurrentUserId } from "@/lib/user-storage";
import { bumpStreak } from "@/lib/streak";

type Semester = {
  semester: string;
  status: "completed" | "current" | "upcoming";
  tasks: MonthlyTask[];
};

type BootstrapData = {
  profile: any;
  cvUpload: any;
  roadmap: {
    semesters: Semester[];
    monthlyTasks: MonthlyTask[];
    cvAnalysis: any;
  } | null;
  chatThreads: Array<{ id: string; title: string; messages: Array<{ role: string; content: string }> }>;
  user: { id?: string; name: string | null; email: string | null };
};

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<BootstrapData | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [doneTick, setDoneTick] = useState(0);

  useEffect(() => {
    const load = async () => {
      let response: Response;
      let result: any;
      try {
        response = await fetch("/api/bootstrap");
        result = await response.json();
      } catch {
        const localProfile = userStorage.getItem("bluprint_profile_review");
        if (localProfile) {
          result = { profile: JSON.parse(localProfile), roadmap: null, chatThreads: [], user: { name: null, email: null } };
          const localRoadmap = userStorage.getItem("bluprint_full_roadmap");
          if (localRoadmap) result.roadmap = JSON.parse(localRoadmap);
          response = { ok: true } as Response;
        } else {
          router.push("/sign-in");
          return;
        }
      }
      if (!response!.ok) {
        router.push("/sign-in");
        return;
      }

      setCurrentUserId(result.user?.id || "");

      const localProfile = userStorage.getItem("bluprint_profile_review");
      if (!result.profile && !localProfile) {
        router.push("/onboarding");
        return;
      }

      if (result.profile) {
        userStorage.setItem("bluprint_profile_review", JSON.stringify(result.profile));
      }
      if (result.roadmap) {
        userStorage.setItem("bluprint_full_roadmap", JSON.stringify(result.roadmap));
        if (result.roadmap.semesters) {
          userStorage.setItem("bluprint_ai_roadmap", JSON.stringify(result.roadmap.semesters));
        }
      }

      if (!result.roadmap && !result.profile) {
        const lp = userStorage.getItem("bluprint_profile_review");
        const localFullRoadmap = userStorage.getItem("bluprint_full_roadmap");
        if (lp) result.profile = JSON.parse(lp);
        if (localFullRoadmap) {
          const full = JSON.parse(localFullRoadmap);
          result.roadmap = {
            semesters: full.semesters || [],
            monthlyTasks: full.monthlyTasks || [],
            cvAnalysis: {
              score: full.cvScore || 0,
              strengths: full.strengths || [],
              improvements: full.improvements || [],
              missing: full.missing || [],
              summary: full.nudge || "",
            },
          };
        }
      }

      const localCvAnalysis = userStorage.getItem("bluprint_cv_analysis");
      if (localCvAnalysis) {
        const analysis = JSON.parse(localCvAnalysis);
        if (result.roadmap) result.roadmap.cvAnalysis = analysis;
        else result.roadmap = { semesters: [], monthlyTasks: [], cvAnalysis: analysis };
      }

      setData(result);
      const saved = userStorage.getItem("bluprint_completed_tasks");
      if (saved) setCompleted(JSON.parse(saved));
      setLoading(false);

      // Bump streak: visiting today counts toward the streak
      bumpStreak();
      window.dispatchEvent(new Event("bluprint:streak"));
    };
    load();
  }, [router]);

  const tab = searchParams.get("tab") || "overview";
  const roadmap = data?.roadmap;
  const semesters = useMemo(() => roadmap?.semesters || [], [roadmap]);

  const toggleTask = (taskId: string) => {
    const next = completed.includes(taskId)
      ? completed.filter((id) => id !== taskId)
      : [...completed, taskId];
    setCompleted(next);
    userStorage.setItem("bluprint_completed_tasks", JSON.stringify(next));
    if (!completed.includes(taskId)) {
      bumpStreak();
      window.dispatchEvent(new Event("bluprint:streak"));
    }
  };

  if (loading || !data) {
    return (
      <AppShell>
        <div className="mx-auto w-full max-w-5xl animate-pulse pt-2">
          <div className="h-8 w-64 rounded-lg bg-[var(--background-secondary)] mb-3" />
          <div className="h-4 max-w-xl rounded-lg bg-[var(--background-secondary)] mb-8" />
          <div className="h-24 rounded-2xl border border-[var(--border)] bg-[var(--surface)] mb-8" />
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-32 rounded-2xl border border-[var(--border)] bg-[var(--surface)]" />
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  const firstName = (data.profile?.name || data.user.name || "Student").split(" ")[0];

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-5xl">
        {tab === "overview" && (
          <div className="animate-fade-up">
            {/* Greeting */}
            <header className="pb-6 pt-2">
              <h1 className="text-[2rem] font-semibold tracking-tight">
                {greeting()}, {firstName}.
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                Plan the next 4 years so you don&apos;t have to scramble.
              </p>
            </header>

            {/* The Arc + Trajectory */}
            <div className="grid gap-5 lg:grid-cols-5">
              <div className="lg:col-span-3">
                <Arc profile={data.profile} />
              </div>
              <div className="lg:col-span-2">
                <TrajectoryChart profile={data.profile} />
              </div>
            </div>

            {/* Semester Mission — the one big objective */}
            <div className="mt-6">
              <SemesterMission
                profile={data.profile}
                doneTick={doneTick}
                onOpenPlan={() => router.push("/dashboard?tab=roadmap")}
              />
            </div>

            {/* Weekly moves — derived directly from the mission */}
            <div className="mt-8">
              <WeeklyMoves
                profile={data.profile}
                onChange={() => {
                  setDoneTick((t) => t + 1);
                  bumpStreak();
                  window.dispatchEvent(new Event("bluprint:streak"));
                }}
              />
            </div>

            {/* Campus Network — repositioned as small widget at bottom */}
            <section className="mt-10">
              <div className="mb-3 flex items-baseline gap-2.5">
                <Users size={14} className="text-[var(--muted)]" />
                <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[var(--muted)]">Peers on the same arc</h2>
              </div>
              <CampusNetworkCard universityName={data.profile?.university} />
            </section>
          </div>
        )}

        {tab === "roadmap" && (
          <div className="animate-fade-up">
            <header className="flex flex-wrap items-end justify-between gap-4 pb-8 pt-2">
              <div>
                <h1 className="text-[2rem] font-semibold tracking-tight">4-Year Vault</h1>
                <p className="mt-1.5 text-sm text-[var(--muted)]">
                  {semesters.length} semesters mapped to your trajectory.
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push("/onboarding")}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
              >
                <RefreshCcw size={12} /> Regenerate
              </button>
            </header>

            {semesters.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-16 text-center">
                <p className="text-sm font-medium text-[var(--foreground)]">Your vault is empty.</p>
                <p className="mt-1.5 text-xs text-[var(--muted)]">Generate your roadmap from onboarding.</p>
                <button
                  type="button"
                  onClick={() => router.push("/onboarding")}
                  className="mt-5 btn-primary h-10 px-6 text-[13px]"
                >
                  Build my roadmap
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {semesters.map((s) => (
                  <SemesterCard
                    key={s.semester}
                    semester={s}
                    completed={completed}
                    onToggle={toggleTask}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* ────────────────────────────────────────────────── */

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function SemesterCard({
  semester,
  completed,
  onToggle,
}: {
  semester: Semester;
  completed: string[];
  onToggle: (id: string) => void;
}) {
  const done = semester.tasks.filter((t) => completed.includes(t.id)).length;
  const total = semester.tasks.length;
  return (
    <div className="flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[var(--foreground)]">{semester.semester}</p>
          <p className="mt-0.5 text-[10.5px] capitalize text-[var(--muted)]">{semester.status}</p>
        </div>
        {semester.status === "current" ? (
          <span className="shrink-0 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-white">Now</span>
        ) : (
          <span className="shrink-0 text-[10px] font-medium text-[var(--muted)]">{done}/{total}</span>
        )}
      </div>
      <div className="flex-1 space-y-1 px-2 py-2">
        {semester.tasks.length === 0 ? (
          <p className="px-3 py-4 text-center text-[11.5px] text-[var(--muted)]">Open block — add classes in Settings.</p>
        ) : (
          semester.tasks.map((task) => {
            const isDone = completed.includes(task.id);
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => onToggle(task.id)}
                className={`group flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  isDone ? "opacity-50" : "hover:bg-[var(--surface-secondary)]"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-[14px] w-[14px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-colors ${
                    isDone
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border-hover)] group-hover:border-[var(--accent)]"
                  }`}
                >
                  {isDone && <Check size={9} strokeWidth={3.5} />}
                </span>
                <span className={`text-[11.5px] leading-snug ${isDone ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"}`}>
                  {task.title}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

