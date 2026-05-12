"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import SkillTreeView from "@/components/dashboard/SkillTreeView";
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
      {tab === "roadmap" ? (
        <div className="relative w-full h-[calc(100vh-var(--topbar-height))] overflow-hidden">
          {/* Centered title */}
          <div className="text-center pt-3 pb-1">
            <h1 className="text-[1.25rem] font-semibold tracking-tight text-[var(--foreground)]">Skill Tree</h1>
          </div>

          {semesters.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[60%]">
              <p className="text-sm font-medium text-[var(--foreground)]">No skill tree yet.</p>
              <p className="mt-1.5 text-xs text-[var(--muted)]">Generate your roadmap to build your tree.</p>
              <button type="button" onClick={() => router.push("/onboarding")}
                className="mt-5 btn-primary h-10 px-6 text-[13px]">
                Build my tree
              </button>
            </div>
          ) : (
            <SkillTreeView semesters={semesters} dreamRole={data?.profile?.dreamRole} />
          )}
        </div>
      ) : (
        <div className="mx-auto w-full max-w-5xl">
          {tab === "overview" && (
            <div className="animate-fade-up">
              <header className="pb-8 pt-2">
                <h1 className="text-[2rem] font-semibold tracking-tight">
                  {greeting()}, {firstName}.
                </h1>
              </header>

              <div className="grid gap-5 lg:grid-cols-5">
                <div className="lg:col-span-3">
                  <Arc profile={data.profile} />
                </div>
                <div className="lg:col-span-2">
                  <TrajectoryChart profile={data.profile} />
                </div>
              </div>

              <div className="mt-8">
                <SemesterMission
                  profile={data.profile}
                  doneTick={doneTick}
                  onOpenPlan={() => router.push("/dashboard?tab=roadmap")}
                />
              </div>

              <div className="mt-10">
                <WeeklyMoves
                  profile={data.profile}
                  onChange={() => {
                    setDoneTick((t) => t + 1);
                    bumpStreak();
                    window.dispatchEvent(new Event("bluprint:streak"));
                  }}
                />
              </div>

              <section className="mt-10">
                <h2 className="mb-3 text-[12px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  Peers on the same path
                </h2>
                <CampusNetworkCard universityName={data.profile?.university} />
              </section>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}

/* ────────────────────────────────────────────────── */

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

