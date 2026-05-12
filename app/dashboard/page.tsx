"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, Loader2, RefreshCcw, Sparkles, Send, Bot, User as UserIcon, Calendar, ClipboardList, Map as MapIcon, ThumbsUp, X as XIcon, Star, BookOpen, Flame, Target, Clock, TrendingUp, AlertCircle, Zap, MessageSquare, GraduationCap, School, ExternalLink, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/AppShell";
import CampusNetworkCard from "@/components/CampusNetworkCard";
import type { MonthlyTask } from "@/components/PlannerBoard";
import { userStorage, setCurrentUserId } from "@/lib/user-storage";

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
  const [chatMessage, setChatMessage] = useState("");
  const [threadId, setThreadId] = useState("");
  const [chatPending, setChatPending] = useState(false);
  const [taskPrefs, setTaskPrefs] = useState<{ interested: string[]; dismissed: string[] }>({ interested: [], dismissed: [] });
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      let response: Response;
      let result: any;
      try {
        response = await fetch("/api/bootstrap");
        result = await response.json();
      } catch {
        // Network error — try localStorage fallback
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

      // If no profile exists anywhere, redirect to onboarding
      const localProfile = userStorage.getItem("bluprint_profile_review");
      if (!result.profile && !localProfile) {
        router.push("/onboarding");
        return;
      }

      // If API returned profile/roadmap from DB, sync to localStorage for other pages
      if (result.profile) {
        userStorage.setItem("bluprint_profile_review", JSON.stringify(result.profile));
      }
      if (result.roadmap) {
        userStorage.setItem("bluprint_full_roadmap", JSON.stringify(result.roadmap));
        if (result.roadmap.semesters) {
          userStorage.setItem("bluprint_ai_roadmap", JSON.stringify(result.roadmap.semesters));
        }
      }

      // Fallback to userStorage if API returns no data (Vercel has no DB)
      if (!result.roadmap && !result.profile) {
        const localProfile = userStorage.getItem("bluprint_profile_review");
        const localRoadmap = userStorage.getItem("bluprint_ai_roadmap");
        const localFullRoadmap = userStorage.getItem("bluprint_full_roadmap");

        if (localProfile) {
          result.profile = JSON.parse(localProfile);
        }
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
        } else if (localRoadmap) {
          result.roadmap = {
            semesters: JSON.parse(localRoadmap),
            monthlyTasks: [],
            cvAnalysis: null,
          };
        }
      }

      // Override with latest CV analysis from localStorage (if user ran analysis)
      const localCvAnalysis = userStorage.getItem("bluprint_cv_analysis");
      if (localCvAnalysis) {
        const analysis = JSON.parse(localCvAnalysis);
        if (result.roadmap) {
          result.roadmap.cvAnalysis = analysis;
        } else {
          result.roadmap = { semesters: [], monthlyTasks: [], cvAnalysis: analysis };
        }
      }

      // Load coursework items due soon as dashboard tasks
      const localCoursework = userStorage.getItem("bluprint_coursework_v1");
      if (localCoursework) {
        const courses = JSON.parse(localCoursework);
        const now = new Date();
        const threeDays = new Date(now.getTime() + 3 * 86400000);
        const dueSoon: any[] = [];
        courses.forEach((c: any) => {
          (c.items || []).forEach((item: any) => {
            if (item.done) return;
            if (!item.dueDate) return;
            const due = new Date(item.dueDate);
            if (due <= threeDays) {
              dueSoon.push({
                id: `cw_${item.id}`,
                title: `${c.name}: ${item.title}`,
                category: "COURSEWORK",
                effort: item.type === "exam" ? "Study session" : "1-2 hours",
                why: `Due ${due.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
                _cwCourseId: c.id,
                _cwItemId: item.id,
              });
            }
          });
        });
        if (result.roadmap && dueSoon.length > 0) {
          result.roadmap.monthlyTasks = [...dueSoon, ...(result.roadmap.monthlyTasks || [])];
        }
      }

      // Load task preferences
      const localPrefs = userStorage.getItem("bluprint_task_preferences");
      if (localPrefs) {
        setTaskPrefs(JSON.parse(localPrefs));
      }

      setData(result);
      if (result.chatThreads?.[0]?.id) setThreadId(result.chatThreads[0].id);
      const saved = userStorage.getItem("bluprint_completed_tasks") || userStorage.getItem("foundry_completed_tasks");
      if (saved) setCompleted(JSON.parse(saved));
      setLoading(false);
    };
    load();
  }, [router]);

  const tab = searchParams.get("tab") || "overview";
  const pathway = useMemo(() => buildPathwayContent(data?.profile), [data?.profile]);
  const roadmap = data?.roadmap;
  const monthlyTasks = useMemo(() => {
    const all = roadmap?.monthlyTasks || [];
    return all.filter((t: any) => !taskPrefs.dismissed.includes(t.id));
  }, [roadmap, taskPrefs]);
  const semesters = useMemo(() => roadmap?.semesters || [], [roadmap]);
  const cvAnalysis = data?.roadmap?.cvAnalysis || data?.cvUpload?.analysis || null;
  const completedCount = useMemo(() => monthlyTasks.filter((task) => completed.includes(task.id)).length, [completed, monthlyTasks]);

  const toggleTask = (taskId: string) => {
    // If it's a coursework task, mark it done in coursework localStorage too
    if (taskId.startsWith("cw_")) {
      const localCw = userStorage.getItem("bluprint_coursework_v1");
      if (localCw) {
        const courses = JSON.parse(localCw);
        const task = monthlyTasks.find((t: any) => t.id === taskId) as any;
        if (task?._cwItemId) {
          courses.forEach((c: any) => {
            c.items?.forEach((item: any) => {
              if (item.id === task._cwItemId) item.done = !item.done;
            });
          });
          userStorage.setItem("bluprint_coursework_v1", JSON.stringify(courses));
        }
      }
    }
    const next = completed.includes(taskId) ? completed.filter((id) => id !== taskId) : [...completed, taskId];
    setCompleted(next);
    userStorage.setItem("bluprint_completed_tasks", JSON.stringify(next));
  };

  const dismissTask = (taskId: string) => {
    const next = { ...taskPrefs, dismissed: [...taskPrefs.dismissed, taskId] };
    setTaskPrefs(next);
    userStorage.setItem("bluprint_task_preferences", JSON.stringify(next));
  };

  const toggleInterest = (taskId: string) => {
    const isInterested = taskPrefs.interested.includes(taskId);
    const next = {
      ...taskPrefs,
      interested: isInterested ? taskPrefs.interested.filter(id => id !== taskId) : [...taskPrefs.interested, taskId],
    };
    setTaskPrefs(next);
    userStorage.setItem("bluprint_task_preferences", JSON.stringify(next));
  };

  const sendChat = async () => {
    if (!chatMessage.trim()) return;
    setChatPending(true);
    const response = await fetch("/api/assistant-chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threadId, message: chatMessage }),
    });
    const result = await response.json();
    setChatPending(false);
    if (!response.ok) return;

    setThreadId(result.threadId);
    setData((current) =>
      current
        ? {
            ...current,
            chatThreads: [
              {
                id: result.threadId,
                title: current.chatThreads[0]?.title || chatMessage.split(" ").slice(0, 6).join(" "),
                messages: [...(current.chatThreads.find((item) => item.id === result.threadId)?.messages || []), { role: "user", content: chatMessage }, { role: "assistant", content: result.reply }],
              },
              ...current.chatThreads.filter((item) => item.id !== result.threadId),
            ],
          }
        : current
    );
    setChatMessage("");
  };

  if (loading || !data) {
    return (
      <AppShell>
        <div className="max-w-2xl mx-auto animate-pulse pt-2">
          {/* Skeleton: greeting */}
          <div className="h-8 w-64 rounded-lg bg-[var(--background-secondary)] mb-3" />
          <div className="h-4 w-96 rounded-lg bg-[var(--background-secondary)] mb-10" />
          {/* Skeleton: quick-link cards */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            {[0,1,2].map(i => (
              <div key={i} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3">
                <div className="h-5 w-5 rounded bg-[var(--background-secondary)]" />
                <div className="h-4 w-20 rounded bg-[var(--background-secondary)]" />
                <div className="h-3 w-24 rounded bg-[var(--background-secondary)]" />
              </div>
            ))}
          </div>
          {/* Skeleton: task cards */}
          <div className="space-y-3">
            {[0,1,2,3].map(i => (
              <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-md bg-[var(--background-secondary)]" />
                  <div className="h-4 w-48 rounded bg-[var(--background-secondary)]" />
                  <div className="ml-auto h-5 w-16 rounded-lg bg-[var(--background-secondary)]" />
                </div>
                <div className="h-3 w-72 rounded bg-[var(--background-secondary)]" />
              </div>
            ))}
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {tab === "overview" && (
          <div className="max-w-3xl mx-auto animate-fade-up">
            <header className="pt-2 pb-6">
              <h1 className="text-[2rem] font-semibold tracking-tight">
                {(() => { const h = new Date().getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; })()}, {(data.profile?.name || data.user.name || "Student").split(" ")[0]}.
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {cvAnalysis?.summary || "Your dream outcome, reverse-engineered to what matters this week."}
              </p>
            </header>

            {/* The Pathway — engine framing */}
            <div className="mb-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--accent)] text-white">
                  <Target size={18} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--foreground)]">The Pathway</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">
                    You didn&apos;t just enter your major — you named where you want to land. We work backward from graduation to{" "}
                    <span className="text-[var(--foreground)] font-medium">this Tuesday</span>: daily micro-wins, weekly portfolio moves, and monthly course corrections so nothing slips.
                  </p>
                </div>
              </div>
            </div>

            {/* — Daily Feed — */}
            <section className="mb-12">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Zap size={16} className="text-[var(--accent)]" />
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Daily Feed</h2>
                <span className="rounded-full bg-[var(--accent)]/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)]">~5 min</span>
              </div>
              <p className="mb-5 text-[12px] text-[var(--muted)]">Not homework — high-leverage, low-friction moves that make you feel insanely productive.</p>

              <div className="space-y-3">
                <PathwayCard
                  label="Warm intro of the day"
                  icon={<MessageSquare size={16} className="text-violet-400" />}
                  accent="border-violet-500/15 bg-violet-500/[0.04]"
                >
                  <p className="text-[13px] leading-relaxed text-[var(--foreground)]">{pathway.warmIntro.body}</p>
                  <div className="mt-3 rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 font-mono text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                    {pathway.warmIntro.dmDraft}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(pathway.warmIntro.dmDraft);
                          setCopiedId("warm");
                          setTimeout(() => setCopiedId(null), 2000);
                        } catch { /* ignore */ }
                      }}
                      className="rounded-lg bg-[var(--foreground)] px-3 py-1.5 text-[11px] font-semibold text-white hover:opacity-90 transition-opacity"
                    >
                      {copiedId === "warm" ? "Copied" : "Copy DM"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setChatMessage("Polish my LinkedIn DM for a coffee chat with an alum"); router.push("/dashboard?tab=assistant"); }}
                      className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] font-medium text-[var(--foreground)] hover:bg-[var(--surface)] transition-colors"
                    >
                      Refine with AI
                    </button>
                  </div>
                </PathwayCard>

                <PathwayCard
                  label="Micro-skill drop"
                  icon={<Flame size={16} className="text-orange-400" />}
                  accent="border-orange-500/15 bg-orange-500/[0.04]"
                >
                  <p className="text-[13px] leading-relaxed text-[var(--foreground)]">{pathway.microSkill.body}</p>
                  <button
                    type="button"
                    onClick={() => window.open(pathway.microSkill.href, "_blank", "noopener,noreferrer")}
                    className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    {pathway.microSkill.cta}
                    <ExternalLink size={12} />
                  </button>
                </PathwayCard>

                <PathwayCard
                  label="Campus serendipity"
                  icon={<School size={16} className="text-emerald-400" />}
                  accent="border-emerald-500/15 bg-emerald-500/[0.04]"
                >
                  <p className="text-[13px] leading-relaxed text-[var(--foreground)]">{pathway.campus.body}</p>
                  <button
                    type="button"
                    onClick={() => router.push("/planner")}
                    className="mt-3 text-[11px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    Block 30 min in planner →
                  </button>
                </PathwayCard>
              </div>
            </section>

            {/* — Campus Network — */}
            <section className="mb-12">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <Users size={16} className="text-[var(--accent)]" />
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Campus Network</h2>
              </div>
              <p className="mb-5 text-[12px] text-[var(--muted)]">
                Connect with peers at your school who are on the same trajectory.
              </p>
              <CampusNetworkCard universityName={data.profile?.university} />
            </section>

            {/* — Weekly Sync — */}
            <section className="mb-12">
              <div className="mb-1 flex items-center gap-2">
                <Calendar size={16} className="text-[var(--accent)]" />
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Weekly sync</h2>
              </div>
              <p className="mb-5 text-[12px] text-[var(--muted)]">Tactical moves: portfolio + internship runway.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Friday portfolio push</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--foreground)]">{pathway.weeklyPortfolio}</p>
                  <button
                    type="button"
                    onClick={() => router.push("/cv-analyzer")}
                    className="mt-3 text-[11px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    Open CV analyzer
                  </button>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Internship radar</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--foreground)]">{pathway.internshipRadar}</p>
                  <button
                    type="button"
                    onClick={() => { setChatMessage("Help me add ATS keywords to my resume for summer internships"); router.push("/dashboard?tab=assistant"); }}
                    className="mt-3 text-[11px] font-semibold text-[var(--accent)] hover:underline"
                  >
                    20-min resume pass with AI →
                  </button>
                </div>
              </div>
            </section>

            {/* — Monthly Audit — */}
            <section className="mb-10">
              <div className="mb-1 flex items-center gap-2">
                <GraduationCap size={16} className="text-[var(--accent)]" />
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Monthly audit</h2>
              </div>
              <p className="mb-5 text-[12px] text-[var(--muted)]">Macro strategy: registration, credits, and sanity checks.</p>
              <div className="space-y-3">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Course correction</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--foreground)]">{pathway.courseCorrection}</p>
                </div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">Burnout check</p>
                  <p className="mt-2 text-[13px] leading-relaxed text-[var(--foreground)]">{pathway.burnoutCheck}</p>
                </div>
              </div>
            </section>

            {/* Quick links row */}
            <div className="grid grid-cols-3 gap-3 mb-10">
              <button
                onClick={() => router.push("/planner")}
                className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-left hover:border-[var(--accent)]/20 hover:shadow-sm transition-all"
              >
                <ClipboardList size={18} className="text-[var(--accent)] mb-2" />
                <p className="text-[13px] font-medium text-[var(--foreground)]">Planner</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">Weekly schedule</p>
              </button>
              <button
                onClick={() => router.push("/cv-analyzer")}
                className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-left hover:border-[var(--accent)]/20 hover:shadow-sm transition-all"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative h-5 w-5">
                    <svg className="h-full w-full" viewBox="0 0 100 100">
                      <circle className="text-[var(--background-secondary)]" strokeWidth="12" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                      <circle className="text-[var(--accent)]" strokeWidth="12" strokeDasharray={251} strokeDashoffset={251 - (251 * (cvAnalysis?.score || 0)) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                    </svg>
                  </div>
                  <span className="text-xs font-semibold text-[var(--accent)]">{cvAnalysis?.score || 0}</span>
                </div>
                <p className="text-[13px] font-medium text-[var(--foreground)]">CV Score</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">View analysis</p>
              </button>
              <button
                onClick={() => router.push("/dashboard?tab=assistant")}
                className="group rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-4 text-left hover:border-[var(--accent)]/20 hover:shadow-sm transition-all"
              >
                <Sparkles size={18} className="text-[var(--accent)] mb-2" />
                <p className="text-[13px] font-medium text-[var(--foreground)]">AI Assist</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">Ask anything</p>
              </button>
            </div>

            {/* This Month section */}
            <section className="mb-10">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">This Month</h2>
                <span className="text-[11px] font-medium text-[var(--muted)]">{completedCount}/{monthlyTasks.length} done</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
                <button
                  onClick={() => router.push("/dashboard?tab=month")}
                  className="text-[11px] font-medium text-[var(--accent)] hover:underline"
                >
                  View all
                </button>
              </div>

              <div className="space-y-0.5">
                {monthlyTasks.slice(0, 4).map((task) => {
                  const done = completed.includes(task.id);
                  return (
                    <div
                      key={task.id}
                      className={`group flex items-start gap-3.5 rounded-xl px-4 py-3 transition-all duration-100 ${
                        done ? "opacity-45" : "hover:bg-[var(--surface)]"
                      }`}
                    >
                      <button
                        onClick={() => toggleTask(task.id)}
                        className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-[1.5px] transition-all duration-100 ${
                          done ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "border-[var(--border-hover)] hover:border-[var(--accent)] bg-transparent"
                        }`}
                      >
                        {done && <Check size={11} strokeWidth={3} />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2.5">
                          <p className={`text-[14px] font-medium ${done ? "line-through text-[var(--muted)]" : "text-[var(--foreground)]"}`}>
                            {task.title}
                          </p>
                          <CategoryPill category={task.category} />
                        </div>
                      </div>
                      <span className="text-[11px] font-medium text-[var(--muted)] shrink-0 pt-0.5">{task.effort}</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Timeline section */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Timeline</h2>
                <span className="text-[11px] font-medium text-[var(--muted)]">{semesters.length} semesters</span>
                <div className="flex-1 h-px bg-[var(--border)]" />
                <button
                  onClick={() => router.push("/dashboard?tab=roadmap")}
                  className="text-[11px] font-medium text-[var(--accent)] hover:underline"
                >
                  Full roadmap
                </button>
              </div>

              <div className="space-y-0.5">
                {semesters.map((s) => (
                  <button
                    key={s.semester}
                    onClick={() => router.push("/dashboard?tab=roadmap")}
                    className="group w-full flex items-center gap-3.5 rounded-xl px-4 py-3 hover:bg-[var(--surface)] transition-all duration-100 text-left"
                  >
                    <div className={`h-2 w-2 shrink-0 rounded-full ${
                      s.status === "current" ? "bg-[var(--accent)]" : s.status === "completed" ? "bg-[var(--border-hover)]" : "bg-[var(--border)]"
                    }`} />
                    <p className="text-[14px] font-medium text-[var(--foreground)] flex-1">{s.semester}</p>
                    {s.status === "current" ? (
                      <span className="rounded-full bg-[var(--accent)] px-2 py-[1px] text-[9px] font-semibold uppercase text-white tracking-wide">Now</span>
                    ) : (
                      <span className="text-[11px] font-medium text-[var(--muted)] capitalize">{s.status}</span>
                    )}
                    <span className="text-[11px] text-[var(--muted)]">{s.tasks.length} tasks</span>
                    <ArrowRight size={13} className="text-[var(--border-hover)] opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {tab === "roadmap" && (
          <div className="max-w-2xl mx-auto animate-fade-up">
            {/* Minimal header */}
            <header className="pt-2 pb-8 flex items-end justify-between">
              <div>
                <h1 className="text-[2rem] font-semibold tracking-tight">Roadmap</h1>
                <p className="mt-1 text-sm text-[var(--muted)]">{semesters.length} semesters mapped out</p>
              </div>
              <button
                onClick={() => router.push("/onboarding")}
                className="text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1.5"
              >
                <RefreshCcw size={12} /> Regenerate
              </button>
            </header>

            {/* Semester sections */}
            <div className="space-y-10">
              {semesters.map((s) => (
                <section key={s.semester}>
                  {/* Semester heading */}
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{s.semester}</h2>
                    {s.status === "current" ? (
                      <span className="rounded-full bg-[var(--accent)] px-2 py-[1px] text-[9px] font-semibold uppercase text-white tracking-wide">Now</span>
                    ) : (
                      <span className="text-[11px] font-medium text-[var(--muted)] capitalize">{s.status}</span>
                    )}
                    <div className="flex-1 h-px bg-[var(--border)]" />
                  </div>

                  {/* Task rows */}
                  <div className="space-y-0.5">
                    {s.tasks.map((task) => (
                      <div
                        key={task.id}
                        className="group flex items-start gap-3.5 rounded-xl px-4 py-3 hover:bg-[var(--surface)] transition-all duration-100"
                      >
                        {/* Dot indicator */}
                        <div className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${
                          s.status === "current" ? "bg-[var(--accent)]" : s.status === "completed" ? "bg-[var(--border-hover)]" : "bg-[var(--border)]"
                        }`} />

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5">
                            <p className="text-[14px] font-medium text-[var(--foreground)]">{task.title}</p>
                            <CategoryPill category={task.category} />
                          </div>
                          <p className="mt-1 text-xs text-[var(--muted-foreground)] leading-relaxed">{task.why}</p>
                        </div>

                        {/* Effort + help */}
                        <div className="hidden sm:flex items-center gap-3 shrink-0 pt-0.5">
                          <span className="text-[11px] font-medium text-[var(--muted)]">{task.effort}</span>
                          <button
                            onClick={() => { setChatMessage(`Help me with: ${task.title}`); router.push("/dashboard?tab=assistant"); }}
                            className="opacity-0 group-hover:opacity-100 text-[11px] font-medium text-[var(--accent)] hover:underline transition-opacity duration-100"
                          >
                            Get help
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}

        {tab === "month" && (
          <div className="max-w-2xl mx-auto animate-fade-up">
            {/* Minimal header */}
            <header className="pt-2 pb-8">
              <h1 className="text-[2rem] font-semibold tracking-tight">{new Date().toLocaleString("en-US", { month: "long" })}</h1>
              <div className="mt-3 flex items-center gap-4">
                <p className="text-sm text-[var(--muted)]">
                  {completedCount} of {monthlyTasks.length} done
                </p>
                <div className="flex-1 max-w-[160px] h-1 rounded-full bg-[var(--background-secondary)]">
                  <div className="h-full rounded-full bg-[var(--accent)] transition-all duration-500" style={{ width: `${(completedCount / (monthlyTasks.length || 1)) * 100}%` }} />
                </div>
              </div>
            </header>

            {/* Clean task list */}
            <div className="space-y-1">
              {monthlyTasks.map((task) => {
                const done = completed.includes(task.id);
                return (
                  <div
                    key={task.id}
                    className={`group flex items-start gap-3.5 rounded-xl px-4 py-3.5 transition-all duration-100 ${
                      done ? "opacity-45" : "hover:bg-[var(--surface)]"
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border-[1.5px] transition-all duration-100 ${
                        done
                          ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                          : "border-[var(--border-hover)] hover:border-[var(--accent)] bg-transparent"
                      }`}
                    >
                      {done && <Check size={11} strokeWidth={3} />}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <p className={`text-[14px] font-medium ${done ? "line-through text-[var(--muted)]" : "text-[var(--foreground)]"}`}>
                          {task.title}
                        </p>
                        <CategoryPill category={task.category} />
                      </div>
                      <p className={`mt-1 text-xs leading-relaxed ${done ? "text-[var(--muted)]" : "text-[var(--muted-foreground)]"}`}>
                        {task.why}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0 pt-0.5">
                      <span className="text-[11px] font-medium text-[var(--muted)] mr-1">{task.effort}</span>
                      {task.id.startsWith("cw_") ? (
                        <span className="text-[10px] font-medium text-amber-400 bg-amber-500/10 rounded-md px-1.5 py-0.5">
                          <BookOpen size={10} className="inline mr-0.5" />{task.why}
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => toggleInterest(task.id)}
                            className={`rounded-md p-1 transition-all ${
                              taskPrefs.interested.includes(task.id)
                                ? "text-[var(--accent)] bg-[var(--accent-light)]"
                                : "opacity-0 group-hover:opacity-100 text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)]"
                            }`}
                            title="Interested"
                          >
                            <ThumbsUp size={12} />
                          </button>
                          <button
                            onClick={() => dismissTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-[var(--muted)] hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Not relevant"
                          >
                            <XIcon size={12} />
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => { setChatMessage(`Help me with: ${task.title}`); router.push("/dashboard?tab=assistant"); }}
                        className="opacity-0 group-hover:opacity-100 text-[11px] font-medium text-[var(--accent)] hover:underline transition-opacity duration-100 ml-1"
                      >
                        Get help
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Empty state if all done */}
            {monthlyTasks.length > 0 && completedCount === monthlyTasks.length && (
              <div className="mt-8 text-center py-8">
                <p className="text-sm font-medium text-[var(--foreground)]">All done for {new Date().toLocaleString("en-US", { month: "long" })}.</p>
                <p className="mt-1 text-xs text-[var(--muted)]">Check back next month or explore your full roadmap.</p>
              </div>
            )}
          </div>
        )}

        {tab === "assistant" && (
          <div className="max-w-2xl mx-auto animate-fade-up flex flex-col" style={{ minHeight: "calc(100vh - 140px)" }}>
            {/* Messages area */}
            <div className="flex-1 space-y-6 pb-6">
              {/* Empty state with suggestions */}
              {(!data.chatThreads.find((t: any) => t.id === threadId)?.messages.length) && (
                <div className="pt-12 pb-8">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="h-9 w-9 rounded-xl bg-[var(--accent)] flex items-center justify-center">
                      <Sparkles size={16} className="text-white" />
                    </div>
                    <div>
                      <h1 className="text-[2rem] font-semibold tracking-tight">Ask anything</h1>
                    </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {[
                      { label: "Warm intro for an alum", desc: "Draft a polite LinkedIn DM" },
                      { label: "Micro-skill for today", desc: "15 min, high leverage" },
                      { label: "Friday portfolio push", desc: "What to ship this week" },
                      { label: "Monthly audit", desc: "Credits, burnout, registration" },
                    ].map(p => (
                      <button
                        key={p.label}
                        onClick={() => setChatMessage(p.label)}
                        className="text-left rounded-xl border border-[var(--border)] px-4 py-3 hover:bg-[var(--surface)] hover:border-[var(--accent)]/20 transition-all group"
                      >
                        <p className="text-[13px] font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">{p.label}</p>
                        <p className="text-[11px] text-[var(--muted)] mt-0.5">{p.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Messages */}
              {(data.chatThreads.find((item: any) => item.id === threadId)?.messages || []).map((m: any, i: number) => (
                <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                  {m.role === "assistant" && (
                    <div className="h-7 w-7 shrink-0 rounded-full bg-[var(--accent)] flex items-center justify-center mt-0.5">
                      <Sparkles size={12} className="text-white" />
                    </div>
                  )}
                  <div className={`max-w-[85%] text-[14px] leading-relaxed ${
                    m.role === "assistant"
                      ? "text-[var(--foreground)]"
                      : "rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-4 py-3 text-[var(--foreground)]"
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}

              {/* Typing indicator */}
              {chatPending && (
                <div className="flex gap-3">
                  <div className="h-7 w-7 shrink-0 rounded-full bg-[var(--accent)] flex items-center justify-center mt-0.5">
                    <Sparkles size={12} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1 pt-2">
                    <span className="h-1.5 w-1.5 bg-[var(--muted)] rounded-full animate-bounce" />
                    <span className="h-1.5 w-1.5 bg-[var(--muted)] rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="h-1.5 w-1.5 bg-[var(--muted)] rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              )}
            </div>

            {/* Input — sticky at bottom */}
            <div className="sticky bottom-0 pt-4 pb-6 bg-gradient-to-t from-[var(--background)] via-[var(--background)] to-transparent">
              <div className="relative">
                <textarea
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); } }}
                  placeholder="Ask anything..."
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-5 py-4 pr-14 text-[14px] outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 min-h-[56px] max-h-36 shadow-[var(--shadow-card)]"
                  rows={1}
                />
                <button
                  onClick={sendChat}
                  disabled={chatPending || !chatMessage.trim()}
                  className="absolute right-3 bottom-3 h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--foreground)] text-white disabled:opacity-20 hover:bg-[#333] transition-all"
                >
                  <Send size={14} />
                </button>
              </div>
              <p className="mt-2 text-center text-[10px] text-[var(--muted)]">AI can make mistakes. Verify important info.</p>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

function PathwayCard({
  label,
  icon,
  accent,
  children,
}: {
  label: string;
  icon: ReactNode;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`rounded-2xl border p-4 ${accent}`}
    >
      <div className="mb-2 flex items-center gap-2">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</span>
      </div>
      {children}
    </motion.div>
  );
}

type PathwayCopy = {
  warmIntro: { body: string; dmDraft: string };
  microSkill: { body: string; cta: string; href: string };
  campus: { body: string };
  weeklyPortfolio: string;
  internshipRadar: string;
  courseCorrection: string;
  burnoutCheck: string;
};

function buildPathwayContent(profile: any | null | undefined): PathwayCopy {
  const major = profile?.degree?.trim() || "your program";
  const dream = profile?.dreamRole?.trim() || "your dream role";
  const uni = profile?.university?.trim() || "campus";
  const year = profile?.yearOfStudy?.trim() || "this year";
  const minor = profile?.minor?.trim();

  const warmIntro = {
    body: `Someone who graduated from ${major} about two years ago just posted they joined a strong team in your field. A polite 10-minute coffee chat on LinkedIn is one of the highest-ROI moves you can make today.`,
    dmDraft: `Hi [Name] — I'm a ${year} student in ${major} at ${uni} and really admire the path you took into [their company]. I'm not asking for a referral — would you have 10 minutes for a quick virtual coffee so I could learn how you broke in? Either way, thank you for considering.`,
  };

  const dreamLower = dream.toLowerCase();
  let microBody =
    "Pick one concrete skill gap between you and entry-level postings for your goal — then close it in under 20 minutes today.";
  let microCta = "Browse free Google Career Certificates";
  let microHref = "https://grow.google/certificates/";
  if (dreamLower.includes("market") || dreamLower.includes("growth") || dreamLower.includes("brand")) {
    microBody =
      "You want to be in marketing? A huge share of entry-level roles expect Google Analytics (or similar). Knock out a short free module between classes — it goes straight on your resume.";
    microCta = "Open Google Analytics Skillshop (free)";
    microHref = "https://skillshop.withgoogle.com/";
  } else if (dreamLower.includes("data") || dreamLower.includes("analyst") || dreamLower.includes("scientist")) {
    microBody =
      "SQL shows up on almost every data job description. Spend 15 minutes on a free interactive lesson — small daily reps beat cramming before applications.";
    microCta = "Try a free SQL micro-lesson";
    microHref = "https://www.sqlbolt.com/lesson/select_basics";
  } else if (dreamLower.includes("software") || dreamLower.includes("engineer") || dreamLower.includes("developer")) {
    microBody =
      "Ship one tiny improvement to a class project on GitHub today (README, tests, or a refactor). Recruiters skim repos — momentum beats a perfect capstone.";
    microCta = "GitHub docs: Hello World repository";
    microHref = "https://docs.github.com/en/get-started";
  }

  const campus = {
    body: `The Economics club at ${uni} is hosting a guest speaker from a firm you care about — today at 4:00 PM, Room 302, free pizza. You have a gap in your schedule: showing up is serendipity you can't buy.`,
  };

  const weeklyPortfolio = `Take 30 minutes before Sunday: upload or polish the best artifact from your last ${major} project (screenshots, README, demo link) to GitHub or your portfolio. One push = your resume just got stronger without rewriting a page.`;

  const internshipRadar = `Applications for summer internships in ${dream} often open 8–12 weeks out. This weekend, spend 20 minutes weaving ATS keywords from real job posts into your CV — we can walk you through it in AI Assist.`;

  const courseCorrection = `Registration for next term is around the corner. Based on your goal (${dream})${minor ? ` and your interest in a ${minor} angle` : ""}, double-check you're not missing a prerequisite — e.g. if Data Science is on your radar, confirm any stats sequence your catalog requires before seats fill.`;

  const burnoutCheck = `If you're stacking heavy credits, sanity-check the load: aggressive schedules tank GPA for a lot of students. If next semester looks brutal, consider swapping one intense elective for a lighter gen-ed — protecting your trajectory matters more than hero mode.`;

  return {
    warmIntro,
    microSkill: { body: microBody, cta: microCta, href: microHref },
    campus,
    weeklyPortfolio,
    internshipRadar,
    courseCorrection,
    burnoutCheck,
  };
}

function categoryColor(cat: string) {
  const colors: Record<string, string> = {
    INTERNSHIP: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    CV: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    NETWORKING: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    ACADEMICS: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    VISA: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    SKILLS: "bg-slate-500/10 text-slate-400 border-slate-500/20",
    COURSEWORK: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  };
  return colors[cat] || "bg-slate-500/10 text-slate-400 border-slate-500/20";
}

function CategoryPill({ category }: { category: string }) {
  return (
    <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${categoryColor(category)}`}>
      {category}
    </span>
  );
}

