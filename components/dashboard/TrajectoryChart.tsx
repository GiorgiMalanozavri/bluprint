"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { getTrajectory, type TrajectoryRow } from "@/lib/arc";

export default function TrajectoryChart({ profile }: { profile: any | null | undefined }) {
  const traj = getTrajectory(profile);
  const [openKey, setOpenKey] = useState<TrajectoryRow["key"] | null>(null);

  const statusLabel = {
    ahead: "Ahead",
    on_track: "On track",
    behind: "Behind",
  } as const;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-[var(--shadow-card)]">
      <div className="mb-5 flex items-baseline justify-between">
        <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">Where you stand</p>
        <p className="text-[11px] tabular-nums text-[var(--muted-foreground)]">
          <span className="font-medium text-[var(--foreground)]">{traj.overall}</span>
          <span className="text-[var(--muted)]"> / 100</span>
        </p>
      </div>

      <div className="space-y-3">
        {traj.rows.map((row) => {
          const pct = row.target > 0 ? Math.min(100, Math.round((row.score / row.target) * 100)) : 100;
          const open = openKey === row.key;
          return (
            <div key={row.key}>
              <button
                type="button"
                onClick={() => setOpenKey(open ? null : row.key)}
                className="group flex w-full items-center gap-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-1.5 flex items-baseline justify-between gap-2">
                    <p className="text-[12.5px] font-medium text-[var(--foreground)]">{row.label}</p>
                    <span className="text-[11px] text-[var(--muted)]">{statusLabel[row.status]}</span>
                  </div>
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-[var(--background-secondary)]">
                    <motion.div
                      className="h-full rounded-full bg-[var(--foreground)]"
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
                <ChevronDown
                  size={13}
                  className={`shrink-0 text-[var(--muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                />
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.p
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    className="overflow-hidden text-[12px] leading-relaxed text-[var(--muted-foreground)]"
                  >
                    <span className="mt-2 block">{row.advice}</span>
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
