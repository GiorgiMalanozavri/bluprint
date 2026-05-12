"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Flag, Lock, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!open || !mounted) return null;

  const arc = getArcState(profile);
  const role = roleLabel(profile);
  const semesters = getSemesterTimeline(profile);
  const months = getCurrentSemesterMonths();
  const weeks = getCurrentSemesterWeeks();
  const mission = getSemesterMission(profile);

  const phases = ["freshman", "sophomore", "junior", "senior"] as const;
  const currentPhaseIdx = phases.indexOf(arc.phase === "grad" ? "senior" : arc.phase);
  const currentSemIdx = semesters.findIndex((s) => s.status === "current");
  const progressPercent = currentSemIdx >= 0 ? (currentSemIdx / (semesters.length - 1)) * 100 : 0;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 z-[80] flex flex-col bg-[var(--background)]/95 backdrop-blur-xl"
      >
        {/* Top bar */}
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] bg-[var(--surface)]/80 px-6 py-4 backdrop-blur-xl sm:px-10">
          <div className="flex items-baseline gap-3">
            <h2 className="text-[16px] font-semibold tracking-tight text-[var(--foreground)]">Your timeline</h2>
            <span className="text-[12px] text-[var(--muted)]">{role}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)]"
            aria-label="Close timeline"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable body — full width, edge to edge */}
        <div className="flex-1 overflow-y-auto">
          <div className="w-full px-6 py-10 sm:px-10 sm:py-12 lg:px-16">
            {/* Hero — current state */}
            <div className="mb-12">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                {arc.semesterLabel}
              </p>
              <h3 className="mt-1.5 text-[32px] font-semibold tracking-tight text-[var(--foreground)] sm:text-[40px]">
                {PHASE_LABELS[arc.phase === "grad" ? "senior" : arc.phase]} year · Semester {arc.semesterNumber} of 8
              </h3>
              <p className="mt-3 max-w-3xl text-[14.5px] leading-relaxed text-[var(--muted-foreground)]">
                {arc.blurb}
              </p>
            </div>

            {/* ─── Big semester timeline — full width, edge to edge ─── */}
            <section className="mb-14">
              <p className="mb-6 text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                8 semesters
              </p>

              {/* Phase bands underlay */}
              <div className="mb-5 grid grid-cols-4 gap-2">
                {phases.map((p, idx) => {
                  const isCurrent = idx === currentPhaseIdx;
                  const isDone = idx < currentPhaseIdx;
                  return (
                    <div
                      key={p}
                      className={`rounded-lg border px-3 py-2 text-center text-[12px] font-medium ${
                        isDone
                          ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                          : isCurrent
                          ? "border-[var(--foreground)] bg-[var(--surface)] text-[var(--foreground)]"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                      }`}
                    >
                      {PHASE_LABELS[p]}
                    </div>
                  );
                })}
              </div>

              {/* The road */}
              <div className="relative py-8">
                {/* Track */}
                <div className="absolute left-0 right-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[var(--border)]" aria-hidden />
                <motion.div
                  className="absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-[var(--foreground)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
                  aria-hidden
                />

                {/* Nodes spread evenly across full width */}
                <div className="relative grid grid-cols-8 gap-0">
                  {semesters.map((s) => {
                    const isCurrent = s.status === "current";
                    const isDone = s.status === "past";
                    return (
                      <div key={s.index} className="relative flex flex-col items-center">
                        {/* Label above */}
                        <p
                          className={`absolute bottom-full mb-3 whitespace-nowrap text-[11.5px] font-semibold ${
                            isCurrent
                              ? "text-[var(--foreground)]"
                              : isDone
                              ? "text-[var(--foreground)]"
                              : "text-[var(--muted)]"
                          }`}
                        >
                          {s.label}
                        </p>

                        {/* Node */}
                        <div
                          className={`relative z-10 flex h-12 w-12 items-center justify-center rounded-full border-[3px] transition-colors ${
                            isDone
                              ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                              : isCurrent
                              ? "border-[var(--foreground)] bg-[var(--surface)] text-[var(--foreground)] ring-4 ring-[var(--border)]"
                              : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                          }`}
                        >
                          {isDone ? (
                            <Check size={18} strokeWidth={3} />
                          ) : isCurrent ? (
                            <Flag size={16} strokeWidth={2.5} />
                          ) : (
                            <Lock size={14} />
                          )}
                          {isCurrent && (
                            <motion.div
                              className="absolute inset-0 rounded-full border-[3px] border-[var(--foreground)]"
                              initial={{ scale: 1, opacity: 0.5 }}
                              animate={{ scale: 1.6, opacity: 0 }}
                              transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
                              aria-hidden
                            />
                          )}
                        </div>

                        {/* Caption below */}
                        <p
                          className={`absolute top-full mt-3 text-[10.5px] capitalize ${
                            isCurrent ? "font-medium text-[var(--foreground)]" : "text-[var(--muted)]"
                          }`}
                        >
                          {isCurrent ? "you are here" : isDone ? "done" : "ahead"}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>

            {/* ─── Current semester detail — months + weeks side by side ─── */}
            <section className="mb-12 grid gap-6 lg:grid-cols-2">
              {/* Months */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <p className="mb-5 text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  Months — {arc.semesterLabel}
                </p>
                <div className={`grid gap-2 ${months.length === 5 ? "grid-cols-5" : "grid-cols-3"}`}>
                  {months.map((m) => (
                    <div
                      key={m.label}
                      className={`rounded-lg border px-2 py-3 text-center text-[12.5px] font-medium ${
                        m.status === "current"
                          ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                          : m.status === "past"
                          ? "border-[var(--border)] bg-[var(--background-secondary)] text-[var(--muted)]"
                          : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                      }`}
                    >
                      {m.label.slice(0, 3)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Weeks */}
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
                <div className="mb-5 flex items-baseline justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">Weeks</p>
                  <p className="text-[11px] text-[var(--muted)]">
                    {weeks.filter((w) => w.status === "past").length} of {weeks.length} done
                  </p>
                </div>
                <div className="grid grid-cols-15 gap-1.5" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
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
            </section>

            {/* Mission summary — full width */}
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 sm:p-8">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                Mission this semester
              </p>
              <p className="mt-2 text-[22px] font-semibold leading-snug tracking-tight text-[var(--foreground)] sm:text-[26px]">
                {mission.title}
              </p>
              <p className="mt-3 max-w-3xl text-[13.5px] leading-relaxed text-[var(--muted-foreground)]">
                {mission.why}
              </p>
              <div className="mt-5 border-t border-[var(--border)] pt-5">
                <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                  What good looks like
                </p>
                <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                  {archetypeFor(profile, arc.phase === "grad" ? "senior" : arc.phase)}
                </p>
              </div>
            </section>

            {/* Footer breathing room */}
            <div className="h-10" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
