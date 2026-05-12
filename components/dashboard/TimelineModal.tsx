"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Lock, X } from "lucide-react";
import { useEffect } from "react";
import {
  archetypeFor,
  getArcState,
  getCurrentSemesterMonths,
  getCurrentSemesterWeeks,
  getSemesterTimeline,
  PHASE_LABELS,
  roleLabel,
} from "@/lib/arc";
import { getSemesterMission } from "@/lib/mission";

export default function TimelineModal({
  profile,
  open,
  onClose,
}: {
  profile: any | null | undefined;
  open: boolean;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const arc = getArcState(profile);
  const role = roleLabel(profile);
  const semesters = getSemesterTimeline(profile);
  const months = getCurrentSemesterMonths();
  const weeks = getCurrentSemesterWeeks();
  const mission = getSemesterMission(profile);

  const phases = ["freshman", "sophomore", "junior", "senior"] as const;
  const currentPhaseIdx = phases.indexOf(arc.phase === "grad" ? "senior" : arc.phase);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[80] flex flex-col bg-[var(--background)]/95 backdrop-blur-xl"
      >
        {/* Top bar — always visible, sits above all scroll */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/80 px-5 py-3.5 backdrop-blur-xl sm:px-8">
          <div className="flex items-baseline gap-2.5">
            <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Your timeline</h2>
            <span className="text-[12px] text-[var(--muted)]">{role}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)]"
            aria-label="Close timeline"
          >
            <X size={17} />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
            {/* Header text */}
            <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
              4 year path
            </p>
            <h3 className="mt-1.5 text-[24px] font-semibold tracking-tight text-[var(--foreground)] sm:text-[28px]">
              {arc.semesterLabel} · {PHASE_LABELS[arc.phase === "grad" ? "senior" : arc.phase]} year
            </h3>
            <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[var(--muted-foreground)]">
              {arc.blurb}
            </p>

            {/* PHASES — the level map */}
            <div className="mt-10 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <p className="mb-5 text-[10.5px] font-medium uppercase tracking-wider text-[var(--muted)]">
                Phases
              </p>
              <div className="relative">
                <div className="absolute left-[6%] right-[6%] top-[19px] h-[2px]" aria-hidden>
                  <div className="h-full w-full rounded-full bg-[var(--border)]" />
                  <div
                    className="absolute left-0 top-0 h-full rounded-full bg-[var(--foreground)] transition-all"
                    style={{ width: `${(currentPhaseIdx / (phases.length - 1)) * 100}%` }}
                  />
                </div>
                <div className="relative grid grid-cols-4 gap-3">
                  {phases.map((p, idx) => {
                    const isCurrent = idx === currentPhaseIdx;
                    const isDone = idx < currentPhaseIdx;
                    return (
                      <div key={p} className="flex flex-col items-center text-center">
                        <div
                          className={`relative z-10 mb-2.5 flex h-10 w-10 items-center justify-center rounded-full border-[2.5px] transition-colors ${
                            isDone
                              ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                              : isCurrent
                              ? "border-[var(--foreground)] bg-[var(--surface)] text-[var(--foreground)] ring-4 ring-[var(--border)]"
                              : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                          }`}
                        >
                          {isDone ? (
                            <Check size={16} strokeWidth={3} />
                          ) : isCurrent ? (
                            <span className="h-2.5 w-2.5 rounded-full bg-[var(--foreground)]" />
                          ) : (
                            <Lock size={13} />
                          )}
                        </div>
                        <p className="text-[12.5px] font-medium leading-tight text-[var(--foreground)]">
                          {PHASE_LABELS[p]}
                        </p>
                        <p className="mt-0.5 text-[10.5px] text-[var(--muted)]">
                          {isDone ? "complete" : isCurrent ? "you are here" : "ahead"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SEMESTERS — horizontal scrolling track */}
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <p className="mb-5 text-[10.5px] font-medium uppercase tracking-wider text-[var(--muted)]">
                Semesters
              </p>
              <div className="-mx-2 overflow-x-auto pb-2">
                <div className="flex min-w-fit items-center gap-1 px-2">
                  {semesters.map((s, idx) => (
                    <div key={s.index} className="flex shrink-0 items-center">
                      <div
                        className={`flex w-[120px] flex-col items-center rounded-xl border px-3 py-3 text-center ${
                          s.status === "current"
                            ? "border-[var(--foreground)] bg-[var(--surface)] shadow-md ring-2 ring-[var(--border)] ring-offset-2 ring-offset-[var(--surface)]"
                            : s.status === "past"
                            ? "border-[var(--border)] bg-[var(--background-secondary)]"
                            : "border-[var(--border)] bg-[var(--surface)]"
                        }`}
                      >
                        <span
                          className={`mb-2 h-2.5 w-2.5 rounded-full ${
                            s.status === "future" ? "bg-[var(--border-hover)]" : "bg-[var(--foreground)]"
                          }`}
                        />
                        <p
                          className={`text-[12px] font-semibold leading-tight ${
                            s.status === "future" ? "text-[var(--muted)]" : "text-[var(--foreground)]"
                          }`}
                        >
                          {s.label}
                        </p>
                        <p className="mt-0.5 text-[10px] capitalize text-[var(--muted)]">{s.phase}</p>
                      </div>
                      {idx < semesters.length - 1 && (
                        <div
                          className={`h-px w-6 ${
                            semesters[idx + 1].status === "past" || semesters[idx + 1].status === "current"
                              ? "bg-[var(--foreground)]"
                              : "bg-[var(--border)]"
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* MONTHS + WEEKS in two columns */}
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <p className="mb-5 text-[10.5px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  Months
                </p>
                <div className="flex flex-wrap gap-2">
                  {months.map((m) => (
                    <div
                      key={m.label}
                      className={`rounded-lg border px-3.5 py-2 text-[12.5px] font-medium ${
                        m.status === "current"
                          ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                          : m.status === "past"
                          ? "border-[var(--border)] bg-[var(--background-secondary)] text-[var(--muted)]"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                      }`}
                    >
                      {m.label}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <div className="mb-5 flex items-baseline justify-between">
                  <p className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--muted)]">Weeks</p>
                  <p className="text-[10.5px] text-[var(--muted)]">15 total</p>
                </div>
                <div className="grid grid-cols-8 gap-1.5">
                  {weeks.map((w) => (
                    <div
                      key={w.index}
                      className={`flex h-9 items-center justify-center rounded-md text-[11px] font-medium tabular-nums ${
                        w.status === "current"
                          ? "bg-[var(--foreground)] text-[var(--background)] ring-2 ring-[var(--border)] ring-offset-2 ring-offset-[var(--surface)]"
                          : w.status === "past"
                          ? "bg-[var(--background-secondary)] text-[var(--muted)]"
                          : "border border-[var(--border)] text-[var(--muted)]"
                      }`}
                      title={`Week ${w.index}`}
                    >
                      {w.index}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Mission summary */}
            <div className="mt-6 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--muted)]">
                Mission this semester
              </p>
              <p className="mt-2 text-[18px] font-semibold leading-snug text-[var(--foreground)]">
                {mission.title}
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                {mission.why}
              </p>
              <p className="mt-3 border-t border-[var(--border)] pt-3 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]">
                <span className="font-medium text-[var(--foreground)]">What good looks like.</span>{" "}
                {archetypeFor(profile, arc.phase === "grad" ? "senior" : arc.phase)}
              </p>
            </div>

            {/* Footer breathing room */}
            <div className="h-8" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
