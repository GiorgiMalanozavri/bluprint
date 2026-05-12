"use client";

import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowRight, Check, RefreshCcw, ClipboardList, BookOpen, Flame, Target,
  Zap, MessageSquare, GraduationCap, School, ExternalLink, Users,
  ChevronRight, Calendar, Briefcase,
} from "lucide-react";
import { motion } from "framer-motion";
import AppShell from "@/components/AppShell";
import CampusNetworkCard from "@/components/CampusNetworkCard";
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
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
  const pathway = useMemo(() => buildPathwayContent(data?.profile), [data?.profile]);
  const roadmap = data?.roadmap;
  const monthlyTasks = useMemo(() => roadmap?.monthlyTasks || [], [roadmap]);
  const semesters = useMemo(() => roadmap?.semesters || [], [roadmap]);
  const weeklyTask = useMemo(() => monthlyTasks.find((t: any) => !completed.includes(t.id)) ?? null, [monthlyTasks, completed]);

  const toggleTask = (taskId: string) => {
    const next = completed.includes(taskId)
      ? completed.filter((id) => id !== taskId)
      : [...completed, taskId];
    setCompleted(next);
    userStorage.setItem("bluprint_completed_tasks", JSON.stringify(next));
    // Completing a task also counts as activity for the streak
    if (!completed.includes(taskId)) {
      bumpStreak();
      window.dispatchEvent(new Event("bluprint:streak"));
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      bumpStreak();
      window.dispatchEvent(new Event("bluprint:streak"));
    } catch {
      /* ignore */
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
                Three high-leverage moves today. Five minutes.
              </p>
            </header>

            {/* The Pathway — horizontal timeline */}
            <PathwayTimeline profile={data.profile} />

            {/* Daily Feed — 3 cards */}
            <section className="mt-10">
              <div className="mb-4 flex items-baseline gap-2.5">
                <Zap size={16} className="text-[var(--accent)]" />
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Today</h2>
                <span className="text-[11px] font-medium text-[var(--muted)]">3 moves · ~5 min</span>
              </div>

              <div className="space-y-3">
                {/* Card 1: Warm intro */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
                      <MessageSquare size={14} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Warm intro</span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[var(--foreground)]">{pathway.warmIntro.body}</p>
                  <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-3 font-mono text-[11.5px] leading-relaxed text-[var(--muted-foreground)]">
                    {pathway.warmIntro.dmDraft}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <CopyButton
                      onClick={() => handleCopy("warm", pathway.warmIntro.dmDraft)}
                      copied={copiedId === "warm"}
                    />
                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent("bluprint:openAI", { detail: { message: "Refine this LinkedIn DM to be a touch less formal" } }))}
                      className="rounded-lg border border-[var(--border)] px-3.5 py-2 text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--background-secondary)]"
                    >
                      Refine with AI
                    </button>
                  </div>
                </div>

                {/* Card 2: Micro-skill drop */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500/10 text-orange-500">
                      <Flame size={14} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Micro-skill drop</span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[var(--foreground)]">{pathway.microSkill.body}</p>
                  <div className="mt-4">
                    <a
                      href={pathway.microSkill.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => { bumpStreak(); window.dispatchEvent(new Event("bluprint:streak")); }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                    >
                      {pathway.microSkill.cta}
                      <ExternalLink size={12} />
                    </a>
                  </div>
                </div>

                {/* Card 3: Campus serendipity */}
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                      <School size={14} />
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">On campus</span>
                  </div>
                  <p className="text-[13px] leading-relaxed text-[var(--foreground)]">{pathway.campus.body}</p>
                </div>
              </div>
            </section>

            {/* Campus Network widget */}
            <section className="mt-8">
              <div className="mb-4 flex items-baseline gap-2.5">
                <Users size={16} className="text-[var(--accent)]" />
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Campus Network</h2>
              </div>
              <CampusNetworkCard universityName={data.profile?.university} />
            </section>

            {/* Weekly + Monthly tactical layer */}
            <section className="mt-10 grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
                <div className="mb-3 flex items-center gap-2">
                  <Calendar size={14} className="text-[var(--accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">This week</span>
                </div>
                <p className="text-[13.5px] font-semibold leading-snug text-[var(--foreground)]">
                  {weeklyTask?.title || "Friday portfolio push"}
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]">
                  {weeklyTask?.why || pathway.weeklyPortfolio}
                </p>
                {weeklyTask && (
                  <button
                    type="button"
                    onClick={() => toggleTask(weeklyTask.id)}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11.5px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--background-secondary)]"
                  >
                    <Check size={12} /> Mark done
                  </button>
                )}
              </div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
                <div className="mb-3 flex items-center gap-2">
                  <GraduationCap size={14} className="text-[var(--accent)]" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">This month</span>
                </div>
                <p className="text-[13.5px] font-semibold leading-snug text-[var(--foreground)]">
                  Course correction check
                </p>
                <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]">
                  {pathway.courseCorrection}
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/dashboard?tab=roadmap")}
                  className="mt-4 inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--accent)] hover:underline"
                >
                  Open the 4-Year Vault <ArrowRight size={12} />
                </button>
              </div>
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

function CopyButton({ onClick, copied }: { onClick: () => void; copied: boolean }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      animate={copied ? { scale: [1, 1.04, 1] } : { scale: 1 }}
      transition={{ duration: 0.25 }}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[12px] font-semibold transition-colors ${
        copied
          ? "bg-emerald-500 text-white"
          : "bg-[var(--foreground)] text-white hover:opacity-90"
      }`}
    >
      {copied ? (
        <>
          <Check size={12} strokeWidth={3} /> Copied
        </>
      ) : (
        "Copy DM"
      )}
    </motion.button>
  );
}

function PathwayTimeline({ profile }: { profile: any }) {
  const year = profile?.yearOfStudy?.trim() || "Sophomore";
  const uni = profile?.university?.trim() || "Your campus";
  const dream = profile?.dreamRole?.trim() || "Your dream role";
  const major = profile?.degree?.trim() || "your major";
  const graduating = profile?.graduating?.trim() || "May 2028";
  const internshipLabel = `Summer ${getInternshipYear(graduating)} internship`;

  const steps = [
    { label: year, sub: uni, status: "current" as const, icon: <School size={14} /> },
    { label: internshipLabel, sub: "Reverse-engineered target", status: "next" as const, icon: <Briefcase size={14} /> },
    { label: dream, sub: short(major), status: "goal" as const, icon: <Target size={14} /> },
  ];

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)]">
      <div className="mb-4 flex items-center gap-2">
        <Target size={14} className="text-[var(--accent)]" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">The Pathway</span>
      </div>
      <div className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr]">
        {steps.map((step, idx) => (
          <div key={idx} className="contents">
            <div
              className={`flex items-start gap-3 rounded-xl border p-3 ${
                step.status === "current"
                  ? "border-[var(--accent)]/30 bg-[var(--accent-light)]"
                  : step.status === "goal"
                  ? "border-[var(--border)] bg-[var(--surface-secondary)]"
                  : "border-[var(--border)] bg-[var(--surface)]"
              }`}
            >
              <div
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                  step.status === "current"
                    ? "bg-[var(--accent)] text-white"
                    : step.status === "goal"
                    ? "bg-[var(--foreground)] text-[var(--background)]"
                    : "bg-[var(--background-secondary)] text-[var(--muted-foreground)]"
                }`}
              >
                {step.icon}
              </div>
              <div className="min-w-0">
                <p className="text-[12.5px] font-semibold leading-snug text-[var(--foreground)]">{step.label}</p>
                <p className="mt-0.5 truncate text-[11px] text-[var(--muted)]">{step.sub}</p>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <div className="hidden items-center justify-center md:flex">
                <ChevronRight size={14} className="text-[var(--muted)]" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function getInternshipYear(graduating: string): string {
  const match = graduating.match(/(\d{4})/);
  if (!match) return new Date().getFullYear() + 1 + "";
  const gradYear = parseInt(match[1], 10);
  return `${gradYear - 1}`;
}

function short(s: string, n = 38) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
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

/* ─── Pathway content (no emojis) ───────────────── */

type PathwayCopy = {
  warmIntro: { body: string; dmDraft: string };
  microSkill: { body: string; cta: string; href: string };
  campus: { body: string };
  weeklyPortfolio: string;
  courseCorrection: string;
};

function buildPathwayContent(profile: any | null | undefined): PathwayCopy {
  const major = profile?.degree?.trim() || "your program";
  const dream = profile?.dreamRole?.trim() || "your dream role";
  const uni = profile?.university?.trim() || "campus";
  const year = profile?.yearOfStudy?.trim() || "this year";

  const warmIntro = {
    body: `An alum from ${major} just posted they joined a strong team in your field. A polite 10-minute coffee chat on LinkedIn is one of the highest-ROI moves you can make today.`,
    dmDraft: `Hi [Name] — I'm a ${year} student in ${major} at ${uni} and really admire the path you took into [their company]. I'm not asking for a referral — would you have 10 minutes for a quick virtual coffee so I could learn how you broke in? Either way, thank you for considering.`,
  };

  const dreamLower = dream.toLowerCase();
  let microBody =
    "Pick one concrete skill gap between you and entry-level postings for your goal — then close it in under 20 minutes today.";
  let microCta = "Open free Google Career Certificates";
  let microHref = "https://grow.google/certificates/";
  if (dreamLower.includes("market") || dreamLower.includes("growth") || dreamLower.includes("brand")) {
    microBody =
      "A big share of entry-level marketing roles expect Google Analytics. Knock out a short free module between classes — it goes straight on your resume.";
    microCta = "Open Google Analytics Skillshop";
    microHref = "https://skillshop.withgoogle.com/";
  } else if (dreamLower.includes("data") || dreamLower.includes("analyst") || dreamLower.includes("scientist")) {
    microBody =
      "SQL shows up on almost every data job description. Spend 15 minutes on a free interactive lesson — small daily reps beat cramming before applications.";
    microCta = "Try a free SQL micro-lesson";
    microHref = "https://www.sqlbolt.com/lesson/select_basics";
  } else if (dreamLower.includes("software") || dreamLower.includes("engineer") || dreamLower.includes("developer")) {
    microBody =
      "Ship one tiny improvement to a class project on GitHub today — README, tests, or a refactor. Recruiters skim repos; momentum beats a perfect capstone.";
    microCta = "Open GitHub get-started docs";
    microHref = "https://docs.github.com/en/get-started";
  } else if (dreamLower.includes("mech") || dreamLower.includes("aero")) {
    microBody =
      "Spend 15 minutes brushing up on CAD tolerances — it's the kind of micro-skill that pays off in your next design class and on a co-op resume.";
    microCta = "Read a 3-min CAD tolerances primer";
    microHref = "https://www.engineeringtoolbox.com/iso-tolerances-d_2202.html";
  }

  const campus = {
    body: `The ${guessClub(major)} at ${uni} is meeting later today. You have a gap in your schedule — showing up is serendipity you can't buy.`,
  };

  const weeklyPortfolio = `Take 30 minutes before Sunday: upload or polish the best artifact from a recent ${major} project (screenshots, README, demo link). One push and your resume just got stronger without rewriting a page.`;

  const courseCorrection = `Registration is around the corner. Based on your goal (${dream}), double-check you're not missing a prerequisite before seats fill — drop any class that doesn't move you forward.`;

  return {
    warmIntro,
    microSkill: { body: microBody, cta: microCta, href: microHref },
    campus,
    weeklyPortfolio,
    courseCorrection,
  };
}

function guessClub(major: string): string {
  const m = major.toLowerCase();
  if (m.includes("comp") || m.includes("software")) return "Computer Science club";
  if (m.includes("mech") || m.includes("aero")) return "Engineering Society";
  if (m.includes("econ") || m.includes("finan") || m.includes("business")) return "Economics club";
  if (m.includes("bio") || m.includes("pre-med") || m.includes("nurs")) return "Pre-Health Society";
  if (m.includes("data") || m.includes("stat")) return "Data Science club";
  return "career club for your major";
}
