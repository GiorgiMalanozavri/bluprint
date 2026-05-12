"use client";

import { motion } from "framer-motion";
import { Check, Lock, MapPin, Sparkles } from "lucide-react";
import { useState } from "react";
import { archetypeFor, getArcState, archetypeForPhase, roleLabel, type Phase, PHASE_LABELS } from "@/lib/arc";

const PHASES: Phase[] = ["freshman", "sophomore", "junior", "senior"];

export default function Arc({ profile }: { profile: any | null | undefined }) {
  const arc = getArcState(profile);
  const archetype = archetypeForPhase(profile);
  const role = roleLabel(profile);
  const [selected, setSelected] = useState<Phase>(arc.phase === "grad" ? "senior" : arc.phase);

  const currentIdx = PHASES.indexOf(arc.phase === "grad" ? "senior" : arc.phase);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="mb-5 flex items-center gap-2">
        <MapPin size={14} className="text-[var(--accent)]" />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">The Arc</span>
        <span className="ml-auto text-[11px] font-medium text-[var(--muted)]">
          Semester {arc.semesterNumber} of {arc.totalSemesters} · {arc.semestersLeft} left
        </span>
      </div>

      {/* Horizontal progression */}
      <div className="relative">
        {/* Connecting line */}
        <div className="absolute left-[6%] right-[6%] top-[18px] hidden h-[2px] sm:block" aria-hidden>
          <div className="h-full w-full rounded-full bg-[var(--border)]" />
          <div
            className="absolute left-0 top-0 h-full rounded-full bg-[var(--accent)] transition-all duration-700"
            style={{ width: `${(currentIdx / (PHASES.length - 1)) * 100}%` }}
          />
        </div>

        <div className="relative grid grid-cols-1 gap-3 sm:grid-cols-4 sm:gap-2">
          {PHASES.map((p, idx) => {
            const isCurrent = idx === currentIdx;
            const isDone = idx < currentIdx;
            const isLocked = idx > currentIdx;
            const isSelected = selected === p;
            return (
              <button
                key={p}
                type="button"
                onClick={() => setSelected(p)}
                className={`group relative flex flex-col items-center text-center transition-all ${
                  isSelected ? "scale-[1.02]" : ""
                }`}
              >
                <div
                  className={`relative z-10 mb-2 flex h-9 w-9 items-center justify-center rounded-full border-[2.5px] transition-all ${
                    isDone
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : isCurrent
                      ? "border-[var(--accent)] bg-[var(--surface)] text-[var(--accent)] ring-4 ring-[var(--accent-light)]"
                      : "border-[var(--border)] bg-[var(--surface)] text-[var(--muted)]"
                  }`}
                >
                  {isDone ? <Check size={14} strokeWidth={3} /> : isLocked ? <Lock size={12} /> : <Sparkles size={14} />}
                </div>
                <p
                  className={`text-[12px] font-semibold leading-tight ${
                    isSelected ? "text-[var(--foreground)]" : isCurrent ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                  }`}
                >
                  {PHASE_LABELS[p]}
                </p>
                <p
                  className={`mt-0.5 text-[10.5px] ${
                    isCurrent ? "font-medium text-[var(--accent)]" : "text-[var(--muted)]"
                  }`}
                >
                  {isCurrent ? "you are here" : isDone ? "complete" : "ahead"}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected-phase playbook */}
      <motion.div
        key={selected}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="mt-6 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"
      >
        <div className="mb-1.5 flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            {PHASE_LABELS[selected]} · {role}
          </span>
          {selected === arc.phase && (
            <span className="rounded-full bg-[var(--accent)] px-1.5 py-[1px] text-[8.5px] font-semibold uppercase tracking-wide text-white">Now</span>
          )}
        </div>
        <p className="text-[13px] font-semibold leading-snug text-[var(--foreground)]">
          What good looks like
        </p>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]">
          {archetypeFor(profile, selected) || archetype}
        </p>
        {selected === arc.phase && (
          <p className="mt-3 border-t border-[var(--border)] pt-3 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
            <span className="font-semibold text-[var(--foreground)]">{arc.semesterLabel}.</span> {arc.blurb}
          </p>
        )}
      </motion.div>
    </section>
  );
}

