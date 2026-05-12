"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight, ChevronDown, Compass, Minus } from "lucide-react";
import { getTrajectory, getArcState, roleLabel, type TrajectoryRow } from "@/lib/arc";

export default function TrajectoryChart({ profile }: { profile: any | null | undefined }) {
  const traj = getTrajectory(profile);
  const arc = getArcState(profile);
  const role = roleLabel(profile);
  const [openKey, setOpenKey] = useState<TrajectoryRow["key"] | null>(null);

  const statusMeta = {
    ahead: { label: "Ahead", icon: ArrowUpRight, tone: "text-emerald-500", bar: "bg-emerald-500" },
    on_track: { label: "On track", icon: Minus, tone: "text-[var(--accent)]", bar: "bg-[var(--accent)]" },
    behind: { label: "Behind", icon: ArrowDownRight, tone: "text-amber-500", bar: "bg-amber-500" },
  } as const;

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-card)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-2">
          <Compass size={14} className="text-[var(--accent)]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">Trajectory vs Target</span>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-[26px] font-semibold tabular-nums tracking-tight text-[var(--foreground)]">{traj.overall}</span>
          <span className="text-[11px] font-medium text-[var(--muted)]">/ 100 for {role}</span>
        </div>
      </div>

      <p className="mb-5 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]">
        Where you stand against what peers landing this role have by end of {arc.semesterLabel}.
      </p>

      <div className="divide-y divide-[var(--border)]">
        {traj.rows.map((row) => {
          const meta = statusMeta[row.status];
          const Icon = meta.icon;
          const pct = row.target > 0 ? Math.min(100, Math.round((row.score / row.target) * 100)) : 100;
          const open = openKey === row.key;
          return (
            <div key={row.key} className="py-3 first:pt-0 last:pb-0">
              <button
                type="button"
                onClick={() => setOpenKey(open ? null : row.key)}
                className="group flex w-full items-center gap-4 text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex items-center gap-2">
                    <p className="text-[13px] font-medium text-[var(--foreground)]">{row.label}</p>
                    <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${meta.tone}`}>
                      <Icon size={11} strokeWidth={2.5} />
                      {meta.label}
                    </span>
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-[var(--background-secondary)]">
                    <motion.div
                      className={`h-full rounded-full ${meta.bar}`}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-[11.5px] font-medium tabular-nums text-[var(--muted)]">
                    {row.score}<span className="text-[var(--muted)]/50"> / {row.target}</span>
                  </span>
                  <ChevronDown
                    size={14}
                    className={`text-[var(--muted)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <p className="mt-3 rounded-lg bg-[var(--surface-secondary)] p-3 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
                      {row.advice}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </section>
  );
}
