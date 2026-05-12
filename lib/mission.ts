// The Semester Mission engine.
// Each (phase × role) maps to ONE big strategic objective for the semester,
// a "why it matters" rationale, and 3 weekly tasks derived from that mission.
//
// All pure functions. Completion state lives in localStorage.

import { detectRole, getArcState, type Phase, type RoleKey } from "@/lib/arc";

export type WeeklyTask = {
  id: string; // deterministic, e.g. "soph_sw_apply"
  title: string;
  effort: string; // "~30 min", "~2 hours"
  why: string; // why this task ties to the mission
  cta?: { label: string; href?: string; ai?: string }; // optional action button
};

export type SemesterMission = {
  phase: Phase;
  role: RoleKey;
  title: string;
  why: string;
  /** 2–3 measurable lead indicators for the mission */
  metrics: { label: string; target: number; unit: string }[];
  weeklyTasks: WeeklyTask[];
};

/* ─── Mission archetype by phase × role ──────────── */

type RoleSpecifics = {
  /** noun for "internship" vs "research role" vs "clinical hours" */
  experienceNoun: string;
  /** plural form, e.g. "internships", "clinical hours" */
  experiencePlural: string;
  /** companies/orgs to mention for sophomore-tier applications */
  earlyTargets: string;
  /** companies to mention for junior-tier applications */
  topTargets: string;
  /** the "polish your X" artifact for portfolio task */
  portfolioArtifact: string;
};

const ROLE_SPECIFICS: Record<RoleKey, RoleSpecifics> = {
  software: {
    experienceNoun: "internship",
    experiencePlural: "internships",
    earlyTargets: "Microsoft Explore, Google STEP, Goldman Engineering",
    topTargets: "Google, Stripe, Meta, top startups",
    portfolioArtifact: "top GitHub repo (README + screenshots)",
  },
  finance: {
    experienceNoun: "Sophomore Spring program",
    experiencePlural: "early-insight programs",
    earlyTargets: "JPM Sophomore Diversity, MS Spring Insight, Goldman Possibilities",
    topTargets: "GS / MS / JPM Summer Analyst, top boutiques",
    portfolioArtifact: "modeling test prep + 1 stock pitch",
  },
  consulting: {
    experienceNoun: "case competition or sophomore-track program",
    experiencePlural: "consulting touchpoints",
    earlyTargets: "Deloitte/Accenture sophomore programs, MBB diversity events",
    topTargets: "MBB Summer Associate, Tier-2 SA",
    portfolioArtifact: "1 case write-up + 2 practice cases per week",
  },
  mechAero: {
    experienceNoun: "co-op or research role",
    experiencePlural: "engineering roles",
    earlyTargets: "campus design teams, faculty labs, smaller engineering firms",
    topTargets: "Lockheed, Boeing, SpaceX, Tesla, GE Aviation",
    portfolioArtifact: "SolidWorks portfolio piece or design-team contribution",
  },
  data: {
    experienceNoun: "analytics or research role",
    experiencePlural: "analytics roles",
    earlyTargets: "campus research labs, university analytics offices, smaller startups",
    topTargets: "Google, Meta, Stripe data teams, top quant firms",
    portfolioArtifact: "one end-to-end Kaggle / portfolio notebook",
  },
  marketing: {
    experienceNoun: "marketing internship",
    experiencePlural: "marketing roles",
    earlyTargets: "campus marketing offices, local agencies, startup growth roles",
    topTargets: "P&G, Google Marketing, agency rotations",
    portfolioArtifact: "1 campaign write-up or growth case study",
  },
  preMed: {
    experienceNoun: "clinical hours",
    experiencePlural: "clinical/research hours",
    earlyTargets: "campus health center, shadowing local physicians",
    topTargets: "research lab, scribe role, clinical volunteering",
    portfolioArtifact: "research abstract or scribe-shift log",
  },
  default: {
    experienceNoun: "internship",
    experiencePlural: "internships",
    earlyTargets: "sophomore-track programs in your field",
    topTargets: "industry-leading firms in your field",
    portfolioArtifact: "your best project (uploaded + polished)",
  },
};

function freshmanMission(role: RoleKey, _profile: any): SemesterMission {
  const spec = ROLE_SPECIFICS[role];
  return {
    phase: "freshman",
    role,
    title: "Set foundations that compound for 3 more years",
    why: "Freshman year is the cheapest time to make a great GPA, find your crew, and explore. Every habit you set now repeats 6 more semesters.",
    metrics: [
      { label: "A/A- core grades", target: 4, unit: "courses" },
      { label: "Office hours visits", target: 6, unit: "visits" },
      { label: "Career-related clubs joined", target: 1, unit: "club" },
    ],
    weeklyTasks: [
      {
        id: `fresh_${role}_office_hours`,
        title: "Go to office hours once this week",
        effort: "~30 min",
        why: "Professors who know you = stronger letters of rec in 3 years. Cheap signal now.",
      },
      {
        id: `fresh_${role}_club`,
        title: `Show up to one ${roleClub(role)} meeting`,
        effort: "~1 hour",
        why: "Find the upperclassmen who already cracked the path you want.",
      },
      {
        id: `fresh_${role}_study`,
        title: "Pre-read next week's hardest class",
        effort: "~45 min",
        why: "Front-loading once a week is the cheapest GPA hack you'll get.",
      },
    ],
  };
}

function sophomoreMission(role: RoleKey, _profile: any): SemesterMission {
  const spec = ROLE_SPECIFICS[role];
  return {
    phase: "sophomore",
    role,
    title: `Land your first ${spec.experienceNoun} by April`,
    why: `Sophomores who get a relevant ${spec.experienceNoun} are roughly 3x more likely to convert to a senior-year offer. The next 12 weeks are when this is decided.`,
    metrics: [
      { label: "Applications submitted", target: 10, unit: "apps" },
      { label: "Alumni DMs sent", target: 8, unit: "DMs" },
      { label: "CV / portfolio updates", target: 4, unit: "passes" },
    ],
    weeklyTasks: [
      {
        id: `soph_${role}_apply`,
        title: `Apply to 2 ${spec.experienceNoun}s this week`,
        effort: "~2 hours",
        why: `Aim for sophomore-friendly programs: ${spec.earlyTargets}.`,
      },
      {
        id: `soph_${role}_dm`,
        title: "DM 2 alumni in your target role",
        effort: "~20 min",
        why: "Warm intros are the highest-ROI move you make all semester.",
        cta: { label: "Open Fox AI for a DM draft", ai: "Draft a LinkedIn DM to an alum in my target role" },
      },
      {
        id: `soph_${role}_portfolio`,
        title: `Polish your ${spec.portfolioArtifact}`,
        effort: "~1 hour",
        why: "Recruiters skim — your top artifact is doing most of the work for you.",
      },
    ],
  };
}

function juniorMission(role: RoleKey, _profile: any): SemesterMission {
  const spec = ROLE_SPECIFICS[role];
  return {
    phase: "junior",
    role,
    title: "Lock in the offer that becomes your senior FT job",
    why: `The junior summer ${spec.experienceNoun} is the single highest-leverage event of your degree — most return offers are extended here.`,
    metrics: [
      { label: "Top-target applications", target: 8, unit: "apps" },
      { label: "Mentor relationships active", target: 2, unit: "mentors" },
      { label: "Mock interviews done", target: 5, unit: "rounds" },
    ],
    weeklyTasks: [
      {
        id: `jun_${role}_top_apply`,
        title: `Apply to a top-tier ${spec.experiencePlural.slice(0, -1)} this week`,
        effort: "~2 hours",
        why: `Targets that matter: ${spec.topTargets}.`,
      },
      {
        id: `jun_${role}_mentor`,
        title: "Schedule a 20-min chat with a mentor",
        effort: "~25 min on the call",
        why: "Junior year mentor calls are where you get unwritten advice on offer negotiation.",
      },
      {
        id: `jun_${role}_mock`,
        title: "Do one mock interview (peer or AI)",
        effort: "~45 min",
        why: "The students who get offers practice ~10 mocks before their real round.",
        cta: { label: "Mock interview with Fox AI", ai: "Run a mock interview for my target role" },
      },
    ],
  };
}

function seniorMission(role: RoleKey, _profile: any): SemesterMission {
  return {
    phase: "senior",
    role,
    title: "Sign the offer; don't chase the GPA you already have",
    why: "Senior year is about conversion: lock down the offer, line up backups, and protect the trajectory you spent 3 years building.",
    metrics: [
      { label: "Backup applications", target: 5, unit: "apps" },
      { label: "Recommenders confirmed", target: 3, unit: "letters" },
      { label: "Offer comparisons run", target: 2, unit: "comparisons" },
    ],
    weeklyTasks: [
      {
        id: `sen_${role}_backup`,
        title: "Submit one backup full-time application",
        effort: "~2 hours",
        why: "Even with a return offer, optionality is leverage in any negotiation.",
      },
      {
        id: `sen_${role}_reference`,
        title: "Confirm one professional reference is ready",
        effort: "~15 min email",
        why: "Don't get caught at offer time without a recommender locked in.",
      },
      {
        id: `sen_${role}_negotiate`,
        title: "Research salary bands for your target role",
        effort: "~30 min",
        why: "Knowing the band before negotiating adds 5–15% to your starting comp.",
        cta: { label: "Talk negotiation strategy", ai: "What should I expect to negotiate on my offer?" },
      },
    ],
  };
}

function gradMission(role: RoleKey, _profile: any): SemesterMission {
  return {
    phase: "grad",
    role,
    title: "Build deep specialization + a public artifact this term",
    why: "Grad-school ROI compounds when you ship something visible — a paper, a system, a portfolio — not just transcript credits.",
    metrics: [
      { label: "Drafts shipped to advisor", target: 3, unit: "drafts" },
      { label: "Public artifacts (talk/paper/repo)", target: 1, unit: "artifact" },
      { label: "Conference / industry events attended", target: 2, unit: "events" },
    ],
    weeklyTasks: [
      {
        id: `grad_${role}_writing`,
        title: "Ship 500 words to your advisor",
        effort: "~1.5 hours",
        why: "Weekly writing reps prevent the panic thesis sprint in your final term.",
      },
      {
        id: `grad_${role}_network`,
        title: "Connect with one industry/academic contact",
        effort: "~30 min",
        why: "Your committee matters more than your transcript at this point.",
      },
      {
        id: `grad_${role}_artifact`,
        title: "Push one update to your public artifact",
        effort: "~1 hour",
        why: "A single shipped repo or paper draft beats 5 unfinished ones.",
      },
    ],
  };
}

function roleClub(role: RoleKey): string {
  const m: Record<RoleKey, string> = {
    software: "CS / hackathon",
    finance: "Finance / IB",
    consulting: "Consulting / case",
    mechAero: "Engineering design team or AIAA",
    data: "Data science",
    marketing: "Marketing / growth",
    preMed: "Pre-Health Society",
    default: "career-focused",
  };
  return m[role];
}

/* ─── Public API ─────────────────────────────────── */

export function getSemesterMission(profile: any | null | undefined): SemesterMission {
  const arc = getArcState(profile);
  const role = detectRole(profile);
  switch (arc.phase) {
    case "freshman":
      return freshmanMission(role, profile);
    case "junior":
      return juniorMission(role, profile);
    case "senior":
      return seniorMission(role, profile);
    case "grad":
      return gradMission(role, profile);
    case "sophomore":
    default:
      return sophomoreMission(role, profile);
  }
}

/* ─── Weekly completion state ────────────────────── */

const DONE_KEY = "bluprint_weekly_done_v1";

type DoneState = Record<string, string[]>; // taskId -> array of YYYY-Www stamps

function isoWeekStamp(d = new Date()): string {
  // ISO 8601 year-week — good enough for "this week"
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export function getDoneState(): DoneState {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DONE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function isTaskDoneThisWeek(taskId: string): boolean {
  const state = getDoneState();
  const week = isoWeekStamp();
  return Boolean(state[taskId]?.includes(week));
}

export function toggleTaskThisWeek(taskId: string): boolean {
  if (typeof window === "undefined") return false;
  const state = getDoneState();
  const week = isoWeekStamp();
  const arr = state[taskId] || [];
  const isOn = arr.includes(week);
  state[taskId] = isOn ? arr.filter((w) => w !== week) : [...arr, week];
  try {
    localStorage.setItem(DONE_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
  return !isOn;
}

/** Count of weekly-task completions across the whole stored history. Used for mission progress. */
export function totalCompletions(taskIds: string[]): number {
  const state = getDoneState();
  let n = 0;
  for (const id of taskIds) n += state[id]?.length ?? 0;
  return n;
}

/**
 * Mission progress 0–100. We compute it as cumulative weekly-task completions
 * over the semester divided by a target of 3 tasks × 12 weeks = 36.
 */
export function getMissionProgress(mission: SemesterMission): {
  done: number;
  target: number;
  percent: number;
} {
  const ids = mission.weeklyTasks.map((t) => t.id);
  const done = totalCompletions(ids);
  const target = mission.weeklyTasks.length * 12;
  return { done, target, percent: Math.min(100, Math.round((done / target) * 100)) };
}
