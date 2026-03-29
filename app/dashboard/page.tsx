"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Check, ChevronDown, Loader2, RefreshCcw, Sparkles, Send, Bot, User as UserIcon, Calendar, ClipboardList, Map as MapIcon, ThumbsUp, X as XIcon, Star, BookOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/AppShell";
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

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/bootstrap");
      const result = await response.json();
      if (!response.ok) {
        router.push("/sign-in");
        return;
      }

      setCurrentUserId(result.user?.id || "");

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
      <div className="grid min-h-screen place-items-center bg-[var(--background)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        {tab === "overview" && (
          <div className="max-w-2xl mx-auto animate-fade-up">
            {/* Welcome Header */}
            <header className="pt-2 pb-8">
              <h1 className="text-[2rem] font-semibold tracking-tight">
                Good morning, {(data.profile?.name || data.user.name || "Student").split(" ")[0]}.
              </h1>
              <p className="mt-2 text-sm text-[var(--muted)]">
                {cvAnalysis?.summary || "Focus on the next few moves, not everything at once."}
              </p>
            </header>

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
                        <span className="text-[10px] font-medium text-amber-600 bg-amber-50 rounded-md px-1.5 py-0.5">
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
                            className="opacity-0 group-hover:opacity-100 rounded-md p-1 text-[var(--muted)] hover:text-red-500 hover:bg-red-50 transition-all"
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
                      { label: "Review my roadmap", desc: "Get feedback on your plan" },
                      { label: "Draft a cover letter", desc: "Tailored to your profile" },
                      { label: "Interview prep", desc: "Practice common questions" },
                      { label: "Weekly focus goals", desc: "What to prioritize now" },
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

function categoryColor(cat: string) {
  const colors: Record<string, string> = {
    INTERNSHIP: "bg-blue-50 text-blue-600 border-blue-100",
    CV: "bg-sky-50 text-sky-600 border-sky-100",
    NETWORKING: "bg-purple-50 text-purple-600 border-purple-100",
    ACADEMICS: "bg-emerald-50 text-emerald-600 border-emerald-100",
    VISA: "bg-amber-50 text-amber-600 border-amber-100",
    SKILLS: "bg-slate-50 text-slate-600 border-slate-100",
    COURSEWORK: "bg-pink-50 text-pink-600 border-pink-100",
  };
  return colors[cat] || "bg-gray-50 text-gray-500 border-gray-100";
}

function CategoryPill({ category }: { category: string }) {
  return (
    <span className={`inline-flex items-center rounded-lg border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${categoryColor(category)}`}>
      {category}
    </span>
  );
}

function AccordionRow({ title, tone, items }: { title: string; tone: "green" | "orange" | "red"; items: string[] }) {
  const [open, setOpen] = useState(false);
  const color = tone === "green" ? "text-emerald-600 bg-emerald-50" : tone === "orange" ? "text-sky-600 bg-sky-50" : "text-red-600 bg-red-50";

  return (
    <div className="rounded-xl border border-[var(--border)] overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <span className="text-sm font-medium">{title}</span>
        <ChevronDown size={14} className={`text-[var(--muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 pt-0 space-y-2">
              {items.map((item, idx) => (
                <div key={idx} className={`rounded-lg px-3 py-2 text-xs font-medium ${color}`}>
                  {item}
                </div>
              ))}
              {items.length === 0 && <p className="text-[10px] text-[var(--muted)] italic">No data available.</p>}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
