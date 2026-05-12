"use client";

import { motion } from "framer-motion";
import { Check, Sparkles, CalendarRange } from "lucide-react";
import { useEffect, useState } from "react";
import {
  getSemesterMission,
  isTaskDoneThisWeek,
  toggleTaskThisWeek,
  type WeeklyTask,
} from "@/lib/mission";

export default function WeeklyMoves({
  profile,
  onChange,
}: {
  profile: any | null | undefined;
  /** notify parent when a task is toggled (so mission progress can refresh) */
  onChange: () => void;
}) {
  const mission = getSemesterMission(profile);
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const next = new Set<string>();
    for (const t of mission.weeklyTasks) {
      if (isTaskDoneThisWeek(t.id)) next.add(t.id);
    }
    setDoneIds(next);
  }, [mission]);

  const onToggle = (task: WeeklyTask) => {
    const nowOn = toggleTaskThisWeek(task.id);
    setDoneIds((prev) => {
      const next = new Set(prev);
      if (nowOn) next.add(task.id);
      else next.delete(task.id);
      return next;
    });
    onChange();
  };

  const doneCount = doneIds.size;

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <CalendarRange size={16} className="text-[var(--accent)]" />
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">This week</h2>
        <span className="text-[11px] font-medium text-[var(--muted)]">
          {doneCount}/{mission.weeklyTasks.length} done · derived from your mission
        </span>
      </div>

      <div className="space-y-2.5">
        {mission.weeklyTasks.map((task, idx) => {
          const done = doneIds.has(task.id);
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18, delay: idx * 0.04 }}
              className={`group rounded-2xl border p-4 transition-all ${
                done
                  ? "border-[var(--border)] bg-[var(--surface-secondary)] opacity-70"
                  : "border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)]"
              }`}
            >
              <div className="flex items-start gap-3.5">
                <button
                  type="button"
                  onClick={() => onToggle(task)}
                  aria-pressed={done}
                  className={`mt-0.5 flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-md border-[1.5px] transition-all ${
                    done
                      ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                      : "border-[var(--border-hover)] bg-transparent hover:border-[var(--accent)]"
                  }`}
                >
                  {done && <Check size={12} strokeWidth={3} />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                    <p
                      className={`text-[13.5px] font-semibold leading-snug ${
                        done ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"
                      }`}
                    >
                      {task.title}
                    </p>
                    <span className="rounded-md bg-[var(--background-secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
                      {task.effort}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]">
                    {task.why}
                  </p>
                  {task.cta && !done && (
                    <button
                      type="button"
                      onClick={() => {
                        if (task.cta?.ai) {
                          window.dispatchEvent(new CustomEvent("bluprint:openAI", { detail: { message: task.cta.ai } }));
                        } else if (task.cta?.href) {
                          window.open(task.cta.href, "_blank", "noopener,noreferrer");
                        }
                      }}
                      className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11.5px] font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-secondary)]"
                    >
                      <Sparkles size={11} /> {task.cta.label}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
