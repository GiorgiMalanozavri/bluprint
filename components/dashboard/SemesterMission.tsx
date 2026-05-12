"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { getSemesterMission, getMissionProgress } from "@/lib/mission";
import { getArcState } from "@/lib/arc";

export default function SemesterMission({
  profile,
  doneTick,
  onOpenPlan,
}: {
  profile: any | null | undefined;
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
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
        {arc.semesterLabel}
      </p>

      <h2 className="mt-2 text-[22px] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
        {mission.title}
      </h2>
      <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-[var(--muted-foreground)]">
        {mission.why}
      </p>

      {/* Progress */}
      <div className="mt-5">
        <div className="mb-2 flex items-baseline justify-between">
          <p className="text-[12px] font-medium text-[var(--muted)]">Progress this semester</p>
          <p className="text-[12px] tabular-nums text-[var(--muted-foreground)]">
            <span className="font-medium text-[var(--foreground)]">{progress.done}</span>
            <span className="text-[var(--muted)]"> / {progress.target}</span>
          </p>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--background-secondary)]">
          <motion.div
            className="h-full rounded-full bg-[var(--foreground)]"
            initial={{ width: 0 }}
            animate={{ width: `${progress.percent}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>
      </div>

      {/* Targets — simple list */}
      <div className="mt-5 grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3">
        {mission.metrics.map((m) => (
          <div key={m.label} className="flex items-baseline gap-2">
            <span className="text-[14px] font-medium tabular-nums text-[var(--foreground)]">{m.target}</span>
            <span className="text-[12px] text-[var(--muted)]">{m.label.toLowerCase()}</span>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-[var(--border)] pt-4">
        <button
          type="button"
          onClick={onOpenPlan}
          className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--foreground)] hover:underline"
        >
          See your 4 year plan <ArrowRight size={12} />
        </button>
      </div>
    </section>
  );
}
