"use client";

import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Compass, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { COURSES } from "@/lib/courses";
import { getProfile, saveProfile, setEnrolledCourses } from "@/lib/storage";
import type { CourseYear, UserProfile } from "@/lib/types";

type Step = "identity" | "courses" | "goals" | "concerns" | "review";
const STEPS: Step[] = ["identity", "courses", "goals", "concerns", "review"];

export default function OnboardingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[var(--background)]" />}>
      <OnboardingInner />
    </Suspense>
  );
}

function OnboardingInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redo = params.get("redo") === "1";

  const [step, setStep] = useState<Step>("identity");
  const [name, setName] = useState("");
  const [year, setYear] = useState<CourseYear>("sophomore");
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [enrolled, setEnrolled] = useState<Set<string>>(new Set());
  const [goals, setGoals] = useState("");
  const [concerns, setConcerns] = useState("");
  const [saving, setSaving] = useState(false);

  // Pre-fill if returning user
  useEffect(() => {
    const existing = getProfile();
    if (existing) {
      setName(existing.name);
      setYear(existing.year);
      setCompleted(new Set(existing.completedCourseIds));
      setEnrolled(new Set(existing.enrolledCourseIds));
      setGoals(existing.goals);
      setConcerns(existing.concerns);
    } else if (!redo) {
      // Fresh user starts at step 0 — fine
    }
  }, [redo]);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  const canContinue =
    step === "identity" ? name.trim().length > 1 :
    step === "courses" ? true :
    step === "goals" ? goals.trim().length > 4 :
    step === "concerns" ? concerns.trim().length > 4 :
    true;

  const handleNext = async () => {
    if (step === "review") {
      await finish();
      return;
    }
    setStep(STEPS[stepIndex + 1]);
    window.scrollTo(0, 0);
  };

  const handleBack = () => {
    if (stepIndex === 0) return;
    setStep(STEPS[stepIndex - 1]);
    window.scrollTo(0, 0);
  };

  const finish = async () => {
    setSaving(true);
    const initials = name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("");
    const profile: UserProfile = {
      name: name.trim(),
      initials: initials || name.trim().slice(0, 2).toUpperCase(),
      university: "Case Western Reserve University",
      major: "Mechanical & Aerospace Engineering",
      year,
      completedCourseIds: [...completed],
      enrolledCourseIds: [...enrolled],
      goals: goals.trim(),
      concerns: concerns.trim(),
      createdAt: new Date().toISOString(),
    };
    saveProfile(profile);
    setEnrolledCourses(profile.name, [...enrolled]);

    // Kick off roadmap generation in the background
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.roadmap) {
          const { saveRoadmap } = await import("@/lib/storage");
          saveRoadmap(data.roadmap);
        }
      }
    } catch {
      // Non-fatal — user can retry on the roadmap page
    }
    router.push("/roadmap");
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Progress bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-[3px] bg-[var(--border)]">
        <motion.div
          className="h-full bg-[var(--accent)]"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>

      {/* Top bar */}
      <div className="mx-auto flex max-w-2xl items-center justify-between px-5 pt-8 sm:px-8">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--foreground)] text-[var(--background)]">
            <Compass size={14} strokeWidth={2.5} />
          </div>
          <span className="text-[14px] font-semibold tracking-tight">Compass</span>
        </div>
        <button
          type="button"
          onClick={handleBack}
          disabled={stepIndex === 0}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)] disabled:opacity-40"
        >
          <ArrowLeft size={13} /> Back
        </button>
      </div>

      <main className="mx-auto max-w-2xl px-5 pb-32 pt-10 sm:px-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
          >
            {step === "identity" && (
              <Identity name={name} setName={setName} year={year} setYear={setYear} />
            )}
            {step === "courses" && (
              <Courses
                completed={completed}
                setCompleted={setCompleted}
                enrolled={enrolled}
                setEnrolled={setEnrolled}
              />
            )}
            {step === "goals" && <Goals value={goals} onChange={setGoals} />}
            {step === "concerns" && <Concerns value={concerns} onChange={setConcerns} />}
            {step === "review" && (
              <Review
                name={name}
                year={year}
                completed={completed}
                enrolled={enrolled}
                goals={goals}
                concerns={concerns}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <p className="text-[11px] font-medium text-[var(--muted)]">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
          <button
            type="button"
            onClick={handleNext}
            disabled={!canContinue || saving}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--foreground)] px-5 py-2.5 text-[13px] font-semibold text-[var(--background)] transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            {saving ? (
              <>
                <Loader2 size={13} className="animate-spin" /> Building your plan…
              </>
            ) : step === "review" ? (
              <>
                Generate roadmap <ArrowRight size={13} />
              </>
            ) : (
              <>
                Continue <ArrowRight size={13} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Step: identity ─────────────────────────────── */

function Identity({
  name,
  setName,
  year,
  setYear,
}: {
  name: string;
  setName: (n: string) => void;
  year: CourseYear;
  setYear: (y: CourseYear) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
        Welcome
      </p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-[var(--foreground)]">
        Let&apos;s build your plan.
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]">
        You&apos;re at <span className="font-medium text-[var(--foreground)]">Case Western Reserve University</span>{" "}
        studying <span className="font-medium text-[var(--foreground)]">Mechanical & Aerospace Engineering</span>.
      </p>

      <div className="mt-8 space-y-5">
        <Field label="Your full name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Giorgi Malania"
            className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-[14px] outline-none transition-colors focus:border-[var(--foreground)]"
            autoFocus
          />
        </Field>

        <Field label="What year are you?">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(["freshman", "sophomore", "junior", "senior"] as CourseYear[]).map((y) => (
              <button
                key={y}
                type="button"
                onClick={() => setYear(y)}
                className={`rounded-xl border px-3 py-2.5 text-[12.5px] font-medium capitalize transition-colors ${
                  year === y
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--border-hover)]"
                }`}
              >
                {y}
              </button>
            ))}
          </div>
        </Field>
      </div>
    </div>
  );
}

/* ─── Step: courses ──────────────────────────────── */

function Courses({
  completed,
  setCompleted,
  enrolled,
  setEnrolled,
}: {
  completed: Set<string>;
  setCompleted: (s: Set<string>) => void;
  enrolled: Set<string>;
  setEnrolled: (s: Set<string>) => void;
}) {
  const grouped = useMemo(() => {
    const buckets: Record<string, typeof COURSES> = {
      freshman: [],
      sophomore: [],
      junior: [],
      senior: [],
    };
    for (const c of COURSES) buckets[c.year].push(c);
    return buckets;
  }, []);

  const toggleCompleted = (id: string) => {
    const next = new Set(completed);
    if (next.has(id)) next.delete(id);
    else {
      next.add(id);
      // Completing implies un-enrolled
      const en = new Set(enrolled);
      en.delete(id);
      setEnrolled(en);
    }
    setCompleted(next);
  };

  const toggleEnrolled = (id: string) => {
    const next = new Set(enrolled);
    if (next.has(id)) next.delete(id);
    else {
      next.add(id);
      const c = new Set(completed);
      c.delete(id);
      setCompleted(c);
    }
    setEnrolled(next);
  };

  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
        Your courses
      </p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-[var(--foreground)]">
        What have you taken so far?
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]">
        Check off finished classes. Tag what you&apos;re taking now. We&apos;ll personalize your roadmap from here.
      </p>

      <div className="mt-8 space-y-7">
        {(["freshman", "sophomore", "junior", "senior"] as CourseYear[]).map((y) => (
          grouped[y].length === 0 ? null : (
            <section key={y}>
              <p className="mb-3 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                {y} year
              </p>
              <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
                {grouped[y].map((c, idx) => {
                  const isDone = completed.has(c.id);
                  const isEnrolled = enrolled.has(c.id);
                  return (
                    <div
                      key={c.id}
                      className={`flex items-start gap-3 px-4 py-3 ${
                        idx > 0 ? "border-t border-[var(--border)]" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleCompleted(c.id)}
                        className={`mt-0.5 flex h-[19px] w-[19px] shrink-0 items-center justify-center rounded-md border-[1.5px] transition-colors ${
                          isDone
                            ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                            : "border-[var(--border-hover)] hover:border-[var(--foreground)]"
                        }`}
                        aria-label={`Mark ${c.code} done`}
                      >
                        {isDone && <Check size={11} strokeWidth={3} />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                          <p className="text-[12.5px] font-mono font-medium text-[var(--muted)]">{c.code}</p>
                          <p
                            className={`text-[13.5px] font-medium ${
                              isDone ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"
                            }`}
                          >
                            {c.title}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleEnrolled(c.id)}
                        className={`shrink-0 rounded-md border px-2 py-1 text-[10.5px] font-semibold transition-colors ${
                          isEnrolled
                            ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                            : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)]"
                        }`}
                      >
                        {isEnrolled ? "Enrolled" : "Taking now"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          )
        ))}
      </div>
    </div>
  );
}

/* ─── Step: goals ────────────────────────────────── */

function Goals({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const suggestions = [
    "Land a summer internship at an aerospace firm",
    "Get into a top mech eng grad program",
    "Build hands-on experience for product design roles",
    "Co-op for two semesters before senior year",
  ];
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
        Goals
      </p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-[var(--foreground)]">
        What do you want to come away with?
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]">
        Be specific. The more concrete, the better the roadmap.
      </p>

      <div className="mt-8 space-y-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. land a summer internship in aerospace propulsion, then co-op my junior fall…"
          rows={5}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[14px] leading-relaxed outline-none transition-colors focus:border-[var(--foreground)]"
        />
        <div>
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Common starts
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange(s)}
                className="rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--muted)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step: concerns ─────────────────────────────── */

function Concerns({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const suggestions = [
    "EMAE 350 looks brutal, I'm nervous",
    "Not sure how to balance co-op with the degree timeline",
    "Worried about GPA dropping junior year",
    "Don't know how to start finding research labs",
  ];
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
        Concerns
      </p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-[var(--foreground)]">
        What&apos;s your biggest worry right now?
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]">
        Honest answer. We bake it into the plan.
      </p>

      <div className="mt-8 space-y-4">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="e.g. I'm scared the math in EMAE 350 will tank my GPA…"
          rows={5}
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-[14px] leading-relaxed outline-none transition-colors focus:border-[var(--foreground)]"
        />
        <div>
          <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Common worries
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onChange(s)}
                className="rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--muted)] transition-colors hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Step: review ───────────────────────────────── */

function Review({
  name,
  year,
  completed,
  enrolled,
  goals,
  concerns,
}: {
  name: string;
  year: CourseYear;
  completed: Set<string>;
  enrolled: Set<string>;
  goals: string;
  concerns: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
        Review
      </p>
      <h1 className="mt-2 text-[28px] font-semibold tracking-tight text-[var(--foreground)]">
        Looks right?
      </h1>
      <p className="mt-2 text-[14px] leading-relaxed text-[var(--muted-foreground)]">
        We&apos;ll send this to Compass and generate your personalized plan.
      </p>

      <div className="mt-8 space-y-3">
        <ReviewRow label="Name" value={name} />
        <ReviewRow label="Year" value={year[0].toUpperCase() + year.slice(1)} />
        <ReviewRow label="Major" value="MAE at CWRU" />
        <ReviewRow label="Courses done" value={`${completed.size} completed`} />
        <ReviewRow label="Taking now" value={`${enrolled.size} enrolled`} />
        <ReviewRow label="Goals" value={goals || "—"} />
        <ReviewRow label="Concerns" value={concerns || "—"} />
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-[13.5px] leading-snug text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</label>
      {children}
    </div>
  );
}
