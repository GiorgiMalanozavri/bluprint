// Track daily activity streaks. A "day" counts when the user completes at least
// one task or visits the dashboard. Stored in localStorage per user.

const KEY = "bluprint_streak_v1";

type StreakState = {
  count: number;
  lastDay: string; // YYYY-MM-DD
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export function getStreak(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return 0;
    const state: StreakState = JSON.parse(raw);
    const diff = daysBetween(state.lastDay, today());
    if (diff > 1) return 0;
    return state.count;
  } catch {
    return 0;
  }
}

export function bumpStreak(): number {
  if (typeof window === "undefined") return 0;
  try {
    const t = today();
    const raw = localStorage.getItem(KEY);
    const state: StreakState = raw ? JSON.parse(raw) : { count: 0, lastDay: t };

    if (state.lastDay === t) return state.count;

    const diff = daysBetween(state.lastDay, t);
    const next = diff === 1 ? state.count + 1 : 1;
    const newState: StreakState = { count: next, lastDay: t };
    localStorage.setItem(KEY, JSON.stringify(newState));
    return next;
  } catch {
    return 0;
  }
}
