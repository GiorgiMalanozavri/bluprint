"use client";

import { Check } from "lucide-react";
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
      <div className="mb-4 flex items-baseline justify-between">
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">This week</h2>
        <p className="text-[11px] text-[var(--muted)]">
          {doneCount} of {mission.weeklyTasks.length} done
        </p>
      </div>

      <ul className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        {mission.weeklyTasks.map((task) => {
          const done = doneIds.has(task.id);
          return (
            <li key={task.id} className={`flex items-start gap-3 px-5 py-4 ${done ? "opacity-60" : ""}`}>
              <button
                type="button"
                onClick={() => onToggle(task)}
                aria-pressed={done}
                className={`mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border-[1.5px] transition-colors ${
                  done
                    ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                    : "border-[var(--border-hover)] hover:border-[var(--foreground)]"
                }`}
              >
                {done && <Check size={11} strokeWidth={3} />}
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className={`text-[13.5px] font-medium ${done ? "text-[var(--muted)] line-through" : "text-[var(--foreground)]"}`}>
                    {task.title}
                  </p>
                  <span className="text-[11px] text-[var(--muted)]">{task.effort}</span>
                </div>
                <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]">{task.why}</p>
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
                    className="mt-2.5 text-[12px] font-medium text-[var(--foreground)] hover:underline"
                  >
                    {task.cta.label}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
