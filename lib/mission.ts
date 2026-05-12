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
  return {
    phase: "freshman",
    role,
    title: "Build a strong foundation",
    why: "First year is the cheapest time to get a great GPA, meet professors, and try a few clubs. Habits you set now save you years later.",
    metrics: [
      { label: "Strong grades in core classes", target: 4, unit: "classes" },
      { label: "Office hours visits", target: 6, unit: "visits" },
      { label: "Career-related clubs", target: 1, unit: "club" },
    ],
    weeklyTasks: [
      {
        id: `fresh_${role}_office_hours`,
        title: "Visit office hours once",
        effort: "30 min",
        why: "Professors who know you write better letters in three years.",
      },
      {
        id: `fresh_${role}_club`,
        title: `Go to a ${roleClub(role)} meeting`,
        effort: "1 hour",
        why: "The upperclassmen who already did what you want to do are in the room.",
      },
      {
        id: `fresh_${role}_study`,
        title: "Pre-read next week's hardest class",
        effort: "45 min",
        why: "One hour of reading ahead is the simplest GPA boost there is.",
      },
    ],
  };
}

function sophomoreMission(role: RoleKey, _profile: any): SemesterMission {
  const spec = ROLE_SPECIFICS[role];
  return {
    phase: "sophomore",
    role,
    title: `Land your first ${spec.experienceNoun}`,
    why: `Students who get a sophomore ${spec.experienceNoun} are far more likely to land a full time offer later. The next few months are when this gets decided.`,
    metrics: [
      { label: "Applications sent", target: 10, unit: "apps" },
      { label: "Alumni messages", target: 8, unit: "DMs" },
      { label: "Resume updates", target: 4, unit: "passes" },
    ],
    weeklyTasks: [
      {
        id: `soph_${role}_apply`,
        title: `Apply to 2 ${spec.experienceNoun}s`,
        effort: "2 hours",
        why: `Start with sophomore friendly programs like ${spec.earlyTargets}.`,
      },
      {
        id: `soph_${role}_dm`,
        title: "Message 2 alumni in your target role",
        effort: "20 min",
        why: "A short polite message lands more coffee chats than people expect.",
        cta: { label: "Draft a DM with AI", ai: "Help me write a short polite LinkedIn message to an alum in my target role" },
      },
      {
        id: `soph_${role}_portfolio`,
        title: `Polish your ${spec.portfolioArtifact}`,
        effort: "1 hour",
        why: "Recruiters skim. One good artifact does most of the work.",
      },
    ],
  };
}

function juniorMission(role: RoleKey, _profile: any): SemesterMission {
  const spec = ROLE_SPECIFICS[role];
  return {
    phase: "junior",
    role,
    title: "Get the summer internship offer",
    why: `The junior summer ${spec.experienceNoun} usually becomes your senior year full time offer. Aim higher than last year.`,
    metrics: [
      { label: "Top target applications", target: 8, unit: "apps" },
      { label: "Mentor relationships", target: 2, unit: "mentors" },
      { label: "Mock interviews", target: 5, unit: "rounds" },
    ],
    weeklyTasks: [
      {
        id: `jun_${role}_top_apply`,
        title: `Apply to a top tier ${spec.experiencePlural.slice(0, -1)}`,
        effort: "2 hours",
        why: `Companies that matter for this role: ${spec.topTargets}.`,
      },
      {
        id: `jun_${role}_mentor`,
        title: "Schedule a 20 minute chat with a mentor",
        effort: "25 min",
        why: "Mentor calls are where the unwritten advice lives.",
      },
      {
        id: `jun_${role}_mock`,
        title: "Do one mock interview",
        effort: "45 min",
        why: "Students who get offers usually practice about 10 mocks before the real one.",
        cta: { label: "Run a mock interview", ai: "Run a mock interview for my target role" },
      },
    ],
  };
}

function seniorMission(role: RoleKey, _profile: any): SemesterMission {
  return {
    phase: "senior",
    role,
    title: "Sign the offer and line up backups",
    why: "Senior year is about closing. Pick the offer, secure references, and keep one or two backups in case anything changes.",
    metrics: [
      { label: "Backup applications", target: 5, unit: "apps" },
      { label: "References confirmed", target: 3, unit: "letters" },
      { label: "Offer comparisons", target: 2, unit: "side by side" },
    ],
    weeklyTasks: [
      {
        id: `sen_${role}_backup`,
        title: "Submit one backup application",
        effort: "2 hours",
        why: "Even with a return offer, options give you leverage.",
      },
      {
        id: `sen_${role}_reference`,
        title: "Confirm a reference is ready",
        effort: "15 min email",
        why: "Don't get caught at offer time without a recommender locked in.",
      },
      {
        id: `sen_${role}_negotiate`,
        title: "Look up salary ranges for your target role",
        effort: "30 min",
        why: "Knowing the range before you negotiate usually adds a real chunk to your offer.",
        cta: { label: "Plan a negotiation", ai: "What should I expect to negotiate on my offer?" },
      },
    ],
  };
}

function gradMission(role: RoleKey, _profile: any): SemesterMission {
  return {
    phase: "grad",
    role,
    title: "Specialize and ship something public",
    why: "Grad school pays off when you have something to show for it. A paper, a system, a portfolio piece.",
    metrics: [
      { label: "Drafts to advisor", target: 3, unit: "drafts" },
      { label: "Public artifacts", target: 1, unit: "piece" },
      { label: "Events attended", target: 2, unit: "events" },
    ],
    weeklyTasks: [
      {
        id: `grad_${role}_writing`,
        title: "Send 500 words to your advisor",
        effort: "1.5 hours",
        why: "Weekly writing prevents the panic sprint in your final term.",
      },
      {
        id: `grad_${role}_network`,
        title: "Reach out to one industry or academic contact",
        effort: "30 min",
        why: "Your committee and contacts matter more than transcript at this stage.",
      },
      {
        id: `grad_${role}_artifact`,
        title: "Push an update to your public artifact",
        effort: "1 hour",
        why: "One shipped repo or draft beats five half finished ones.",
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
