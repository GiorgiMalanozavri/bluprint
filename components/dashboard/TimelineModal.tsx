"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Check, Lock, MapPin, X } from "lucide-react";
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
  // Lock body scroll while open + close on Escape
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
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

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-4 backdrop-blur-md"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          onClick={(e) => e.stopPropagation()}
          className="relative flex h-[min(92vh,820px)] w-[min(96vw,1280px)] flex-col overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-[var(--border)] px-6 py-4">
            <div className="flex items-center gap-2.5">
              <MapPin size={15} className="text-[var(--foreground)]" />
              <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Your timeline</h2>
              <span className="text-[11px] text-[var(--muted)]">·</span>
              <span className="text-[12px] text-[var(--muted)]">{role}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)]"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-10 sm:py-8">
            {/* LEVEL 1 — 4 phases */}
            <div className="mb-10">
              <p className="mb-4 text-[10.5px] font-medium uppercase tracking-wider text-[var(--muted)]">4 year path</p>
              <PhaseTrack profile={profile} />
            </div>

            {/* LEVEL 2 — 8 semesters */}
            <div className="mb-10">
              <p className="mb-4 text-[10.5px] font-medium uppercase tracking-wider text-[var(--muted)]">Semesters</p>
              <div className="overflow-x-auto">
                <div className="flex min-w-fit items-stretch gap-3">
                  {semesters.map((s, idx) => (
                    <SemesterStop key={s.index} slot={s} isFirst={idx === 0} isLast={idx === semesters.length - 1} />
                  ))}
                </div>
              </div>
            </div>

            {/* LEVEL 3 — months in current semester */}
            <div className="mb-10">
              <p className="mb-4 text-[10.5px] font-medium uppercase tracking-wider text-[var(--muted)]">
                {arc.semesterLabel} · months
              </p>
              <div className="flex flex-wrap gap-2">
                {months.map((m) => (
                  <div
                    key={m.label}
                    className={`rounded-lg border px-3 py-1.5 text-[12px] font-medium ${
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

            {/* LEVEL 4 — weeks in current semester */}
            <div className="mb-10">
              <div className="mb-4 flex items-baseline gap-2.5">
                <p className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--muted)]">This semester · weeks</p>
                <p className="text-[10.5px] text-[var(--muted)]">15 weeks total</p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {weeks.map((w) => (
                  <div
                    key={w.index}
                    className={`flex h-9 w-9 items-center justify-center rounded-md text-[11px] font-medium tabular-nums ${
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

            {/* Bottom — what's happening now */}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--background-secondary)] p-5">
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-[var(--muted)]">
                {arc.semesterLabel} mission
              </p>
              <p className="mt-1.5 text-[16px] font-semibold leading-snug text-[var(--foreground)]">
                {mission.title}
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]">
                {archetypeFor(profile, arc.phase === "grad" ? "senior" : arc.phase)}
              </p>
              <p className="mt-3 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                {arc.blurb}
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ─── Inner pieces ───────────────────────────────── */

function PhaseTrack({ profile }: { profile: any | null | undefined }) {
  const arc = getArcState(profile);
  const phases = ["freshman", "sophomore", "junior", "senior"] as const;
  const currentIdx = phases.indexOf(arc.phase === "grad" ? "senior" : arc.phase);

  return (
    <div className="relative">
      {/* Connecting line */}
      <div className="absolute left-[6%] right-[6%] top-[19px] h-[2px]" aria-hidden>
        <div className="h-full w-full rounded-full bg-[var(--border)]" />
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-[var(--foreground)] transition-all"
          style={{ width: `${(currentIdx / (phases.length - 1)) * 100}%` }}
        />
      </div>

      <div className="relative grid grid-cols-4 gap-3">
        {phases.map((p, idx) => {
          const isCurrent = idx === currentIdx;
          const isDone = idx < currentIdx;
          return (
            <div key={p} className="flex flex-col items-center text-center">
              <div
                className={`relative z-10 mb-3 flex h-10 w-10 items-center justify-center rounded-full border-[2.5px] transition-colors ${
                  isDone
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                    : isCurrent
                    ? "border-[var(--foreground)] bg-[var(--surface)] text-[var(--foreground)] ring-4 ring-[var(--border)]"
                    : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                }`}
              >
                {isDone ? <Check size={16} strokeWidth={3} /> : isCurrent ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-[var(--foreground)]" />
                ) : (
                  <Lock size={13} />
                )}
              </div>
              <p
                className={`text-[13px] font-semibold ${
                  isCurrent ? "text-[var(--foreground)]" : isDone ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                }`}
              >
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
  );
}

function SemesterStop({
  slot,
  isFirst,
  isLast,
}: {
  slot: ReturnType<typeof getSemesterTimeline>[number];
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <div className="flex shrink-0 items-center">
      {!isFirst && (
        <div
          className={`mx-2 h-px w-6 ${
            slot.status === "past" || slot.status === "current"
              ? "bg-[var(--foreground)]"
              : "bg-[var(--border)]"
          }`}
        />
      )}
      <div
        className={`flex w-[120px] flex-col items-center rounded-xl border px-3 py-3 text-center transition-colors ${
          slot.status === "current"
            ? "border-[var(--foreground)] bg-[var(--surface)] ring-2 ring-[var(--border)] ring-offset-2 ring-offset-[var(--surface)]"
            : slot.status === "past"
            ? "border-[var(--border)] bg-[var(--background-secondary)]"
            : "border-[var(--border)] bg-[var(--surface)]"
        }`}
      >
        <span
          className={`mb-2 h-2.5 w-2.5 rounded-full ${
            slot.status === "current"
              ? "bg-[var(--foreground)]"
              : slot.status === "past"
              ? "bg-[var(--foreground)]"
              : "bg-[var(--border-hover)]"
          }`}
        />
        <p
          className={`text-[11.5px] font-semibold ${
            slot.status === "future" ? "text-[var(--muted)]" : "text-[var(--foreground)]"
          }`}
        >
          {slot.label}
        </p>
        <p className="mt-0.5 text-[10px] capitalize text-[var(--muted)]">{slot.phase}</p>
      </div>
      {!isLast && null}
    </div>
  );
}
