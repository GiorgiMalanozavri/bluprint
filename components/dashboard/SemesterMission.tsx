"use client";

import { motion } from "framer-motion";
import { ArrowRight, Crosshair, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { getSemesterMission, getMissionProgress } from "@/lib/mission";
import { getArcState } from "@/lib/arc";

export default function SemesterMission({
  profile,
  doneTick,
  onOpenPlan,
}: {
  profile: any | null | undefined;
  /** caller bumps this when a weekly task is toggled to force a progress refresh */
  doneTick: number;
  onOpenPlan: () => void;
}) {
  const mission = getSemesterMission(profile);
  const arc = getArcState(profile);
  const [progress, setProgress] = useState({ done: 0, target: 0, percent: 0 });

  useEffect(() => {
    setProgress(getMissionProgress(mission));
  }, [mission, doneTick]);

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[var(--accent)]/15 bg-gradient-to-br from-[var(--accent-light)] via-[var(--surface)] to-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
      {/* Decorative blur */}
      <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[var(--accent)]/12 blur-3xl" aria-hidden />

      <div className="relative">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--accent)] text-white">
            <Crosshair size={14} />
          </div>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--accent)]">
            {arc.semesterLabel} mission
          </span>
          <span className="ml-auto text-[11px] font-medium text-[var(--muted)]">
            Semester {arc.semesterNumber} of {arc.totalSemesters}
          </span>
        </div>

        <h2 className="text-[20px] font-semibold leading-tight tracking-tight text-[var(--foreground)] sm:text-[22px]">
          {mission.title}
        </h2>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-[var(--muted-foreground)]">
          {mission.why}
        </p>

        {/* Progress bar */}
        <div className="mt-5">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Progress this semester</p>
            <p className="text-[12px] font-medium text-[var(--muted-foreground)]">
              <span className="font-semibold tabular-nums text-[var(--foreground)]">{progress.done}</span>
              <span className="text-[var(--muted)]"> / {progress.target} moves · {progress.percent}%</span>
            </p>
          </div>
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--background-secondary)]">
            <motion.div
              className="h-full rounded-full bg-[var(--accent)]"
              initial={{ width: 0 }}
              animate={{ width: `${progress.percent}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Lead metrics */}
        <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
          {mission.metrics.map((m) => (
            <div key={m.label} className="rounded-xl border border-[var(--border)] bg-[var(--surface)]/70 px-3 py-2.5">
              <p className="text-[10.5px] font-medium text-[var(--muted)]">{m.label}</p>
              <p className="mt-0.5 text-[14px] font-semibold tabular-nums text-[var(--foreground)]">
                <span className="text-[var(--muted)]/60 font-normal">target </span>
                {m.target} <span className="text-[11px] font-normal text-[var(--muted)]">{m.unit}</span>
              </p>
            </div>
          ))}
        </div>

        {/* Footer actions */}
        <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-4">
          <button
            type="button"
            onClick={onOpenPlan}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-3.5 py-2 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
          >
            Open the 4-Year Vault <ArrowRight size={12} />
          </button>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent("bluprint:openAI", { detail: { message: "Am I on track for my semester mission? What should I focus on this week?" } }))}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3.5 py-2 text-[12px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--surface-secondary)]"
          >
            <Sparkles size={12} /> Ask Fox AI
          </button>
        </div>
      </div>
    </section>
  );
}
