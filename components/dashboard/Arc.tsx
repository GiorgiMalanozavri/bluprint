"use client";

import { motion } from "framer-motion";
import { Maximize2 } from "lucide-react";
import { useState } from "react";
import { archetypeFor, getArcState, roleLabel, type Phase, PHASE_LABELS } from "@/lib/arc";
import TimelineModal from "@/components/dashboard/TimelineModal";

const PHASES: Phase[] = ["freshman", "sophomore", "junior", "senior"];

export default function Arc({ profile }: { profile: any | null | undefined }) {
  const arc = getArcState(profile);
  const role = roleLabel(profile);
  const [selected, setSelected] = useState<Phase>(arc.phase === "grad" ? "senior" : arc.phase);
  const [expanded, setExpanded] = useState(false);

  const currentIdx = PHASES.indexOf(arc.phase === "grad" ? "senior" : arc.phase);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="mb-5 flex items-baseline justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">Your timeline</p>
        <div className="flex items-center gap-3">
          <p className="text-[11px] text-[var(--muted)]">
            Semester {arc.semesterNumber} of {arc.totalSemesters}
          </p>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--muted)] transition-colors hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)]"
            title="Expand timeline"
            aria-label="Expand timeline"
          >
            <Maximize2 size={13} />
          </button>
        </div>
      </div>

      {/* Horizontal progression — minimal */}
      <div className="relative">
        <div className="absolute left-[6%] right-[6%] top-[7px] hidden h-px sm:block" aria-hidden>
          <div className="h-full w-full bg-[var(--border)]" />
          <div
            className="absolute left-0 top-0 h-full bg-[var(--foreground)] transition-all duration-700"
            style={{ width: `${(currentIdx / (PHASES.length - 1)) * 100}%` }}
          />
        </div>

        <div className="relative grid grid-cols-4 gap-2">
          {PHASES.map((p, idx) => {
            const isCurrent = idx === currentIdx;
            const isDone = idx < currentIdx;
            const isSelected = selected === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setSelected(p)}
                className="group relative flex flex-col items-center text-center transition-colors"
              >
                <span
                  className={`relative z-10 mb-2.5 h-3.5 w-3.5 rounded-full border transition-colors ${
                    isDone || isCurrent
                      ? "border-[var(--foreground)] bg-[var(--foreground)]"
                      : "border-[var(--border-hover)] bg-[var(--surface)]"
                  } ${isCurrent ? "ring-2 ring-[var(--border)] ring-offset-2 ring-offset-[var(--surface)]" : ""}`}
                />
                <p
                  className={`text-[12px] leading-tight ${
                    isSelected || isCurrent ? "font-medium text-[var(--foreground)]" : "text-[var(--muted)]"
                  }`}
                >
                  {PHASE_LABELS[p]}
                </p>
                {isCurrent && (
                  <p className="mt-0.5 text-[10px] text-[var(--muted)]">you are here</p>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected phase detail */}
      <motion.div
        key={selected}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mt-6 border-t border-[var(--border)] pt-5"
      >
        <p className="text-[11px] font-medium text-[var(--muted)]">
          {PHASE_LABELS[selected]} year — {role}
        </p>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--foreground)]">
          {archetypeFor(profile, selected)}
        </p>
        {selected === arc.phase && (
          <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]">
            {arc.blurb}
          </p>
        )}
      </motion.div>

      <TimelineModal profile={profile} open={expanded} onClose={() => setExpanded(false)} />
    </section>
  );
}
