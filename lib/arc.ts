// The Arc + Trajectory engine.
// Pure functions — no React, no DOM, no storage access.
// Given a profile, produces:
//  - phase (freshman/sophomore/junior/senior) + semester progress
//  - role-based benchmarks for "what good looks like" at each phase
//  - trajectory scores: coursework, experiences, network, skills

export type Phase = "freshman" | "sophomore" | "junior" | "senior" | "grad";

export const PHASE_LABELS: Record<Phase, string> = {
  freshman: "Freshman",
  sophomore: "Sophomore",
  junior: "Junior",
  senior: "Senior",
  grad: "Grad",
};

export type ArcState = {
  phase: Phase;
  semesterNumber: number; // 1..8
  totalSemesters: number; // 8 for undergrad
  semestersLeft: number;
  semesterLabel: string; // e.g. "Fall 2026"
  blurb: string;
};

export type RoleKey =
  | "software"
  | "finance"
  | "consulting"
  | "mechAero"
  | "data"
  | "marketing"
  | "preMed"
  | "default";

export type Benchmark = {
  coursework: string[]; // must-have / strongly-recommended classes by senior year
  // Phase-indexed "by end of this phase, you should have…" targets
  byPhase: Record<Phase, PhaseTarget>;
  skills: string[]; // portfolio-ready skill keywords
};

export type PhaseTarget = {
  experiences: number; // cumulative: internships + research + serious projects
  network: number; // cumulative meaningful alumni / mentor contacts
  /** human-readable summary of what good looks like at the END of this phase */
  archetype: string;
};

export type TrajectoryRow = {
  key: "coursework" | "experiences" | "network" | "skills";
  label: string;
  score: number; // achieved
  target: number; // expected by end of current phase
  status: "ahead" | "on_track" | "behind";
  advice: string;
};

export type Trajectory = {
  rows: TrajectoryRow[];
  overall: number; // 0..100
};

/* ─── Phase detection ─────────────────────────────── */

const YEAR_TO_PHASE: Record<string, Phase> = {
  freshman: "freshman",
  sophomore: "sophomore",
  junior: "junior",
  senior: "senior",
  "graduate (masters)": "grad",
  "graduate (phd)": "grad",
};

export function getArcState(profile: any | null | undefined): ArcState {
  const rawYear: string = (profile?.yearOfStudy || "Sophomore").toString().toLowerCase().trim();
  const phase: Phase = YEAR_TO_PHASE[rawYear] || "sophomore";

  // Best-effort semester number (1..8) based on phase and current month
  const month = new Date().getMonth(); // 0=Jan
  const inSpring = month >= 0 && month <= 5;
  const phaseBaseSemester: Record<Phase, number> = {
    freshman: 1,
    sophomore: 3,
    junior: 5,
    senior: 7,
    grad: 8,
  };
  const semesterNumber = Math.min(8, phaseBaseSemester[phase] + (inSpring ? 1 : 0));
  const totalSemesters = 8;
  const semestersLeft = Math.max(0, totalSemesters - semesterNumber + 1);

  const now = new Date();
  const year = now.getFullYear();
  const semesterLabel = inSpring ? `Spring ${year}` : `Fall ${year}`;

  const blurbs: Record<Phase, string> = {
    freshman: "Year 1. Build the habits and grades you'll lean on later.",
    sophomore: "First internship season is coming up. Start early.",
    junior: "The summer internship you land this year usually becomes your full time offer.",
    senior: "Lock in the offer and line up backups.",
    grad: "Pick a specialty and ship something public this year.",
  };

  return {
    phase,
    semesterNumber,
    totalSemesters,
    semestersLeft,
    semesterLabel,
    blurb: blurbs[phase],
  };
}

/* ─── Role benchmarks ─────────────────────────────── */

export function detectRole(profile: any | null | undefined): RoleKey {
  const dream = (profile?.dreamRole || "").toLowerCase();
  const degree = (profile?.degree || "").toLowerCase();
  const haystack = `${dream} ${degree}`;

  if (/(soft|web|backend|frontend|developer|swe|engineer.*comput)/.test(haystack)) return "software";
  if (/(invest|banker|finance|equity|hedge|quant|trading|portfolio)/.test(haystack)) return "finance";
  if (/(consult|strategy|mck|bcg|bain)/.test(haystack)) return "consulting";
  if (/(mech|aero|automotive|robot|hardware)/.test(haystack)) return "mechAero";
  if (/(data|analy|scien|ml engineer)/.test(haystack)) return "data";
  if (/(market|growth|brand|product manager|pm |digital)/.test(haystack)) return "marketing";
  if (/(pre-?med|nurs|biology|md|physician|health)/.test(haystack)) return "preMed";
  return "default";
}

export const BENCHMARKS: Record<RoleKey, Benchmark> = {
  software: {
    coursework: ["data structures", "algorithms", "operating systems", "databases", "computer networks", "software engineering"],
    skills: ["python", "javascript", "react", "sql", "git", "aws", "system design", "typescript"],
    byPhase: {
      freshman: { experiences: 1, network: 2, archetype: "Strong intro CS grades. One project on GitHub. In a coding club." },
      sophomore: { experiences: 2, network: 6, archetype: "First internship or research role lined up. A couple of GitHub projects." },
      junior: { experiences: 3, network: 12, archetype: "Did a brand name internship. Has a portfolio site and a mentor in the industry." },
      senior: { experiences: 4, network: 20, archetype: "Return offer in hand. References ready." },
      grad: { experiences: 5, network: 25, archetype: "A paper or a senior engineering internship." },
    },
  },
  finance: {
    coursework: ["financial accounting", "corporate finance", "statistics", "economics", "valuation", "financial modeling"],
    skills: ["excel", "powerpoint", "financial modeling", "valuation", "bloomberg", "dcf", "m&a", "capital markets"],
    byPhase: {
      freshman: { experiences: 1, network: 3, archetype: "In a finance club. Solid grades in econ and accounting. One coffee chat done." },
      sophomore: { experiences: 2, network: 10, archetype: "In a Sophomore Diversity or Spring Insight program. A few alumni chats a month." },
      junior: { experiences: 3, network: 20, archetype: "Summer Analyst offer at a top bank. Modeling tests ready. Two mentors." },
      senior: { experiences: 4, network: 30, archetype: "Full time offer signed. Still networking for buy-side moves." },
      grad: { experiences: 5, network: 35, archetype: "MBA track or PE/HF specialty." },
    },
  },
  consulting: {
    coursework: ["statistics", "economics", "business strategy", "marketing", "behavioral economics", "operations"],
    skills: ["powerpoint", "excel", "case interviews", "structured thinking", "market sizing", "data analysis", "presentation"],
    byPhase: {
      freshman: { experiences: 1, network: 3, archetype: "In a consulting club. A few practice cases done. Reached out to one consultant." },
      sophomore: { experiences: 2, network: 10, archetype: "A summer experience that ties to consulting. Practicing cases weekly." },
      junior: { experiences: 3, network: 20, archetype: "MBB or Tier 2 Summer Associate offer. Case partner network in place." },
      senior: { experiences: 4, network: 25, archetype: "Full time offer in hand. Final round prep for backups." },
      grad: { experiences: 5, network: 30, archetype: "MBA candidate or industry expert track." },
    },
  },
  mechAero: {
    coursework: ["statics", "dynamics", "thermodynamics", "fluid mechanics", "materials science", "cad", "control systems", "manufacturing"],
    skills: ["solidworks", "matlab", "ansys", "cad tolerancing", "finite element analysis", "python", "manufacturing processes"],
    byPhase: {
      freshman: { experiences: 1, network: 2, archetype: "On a design team. One CAD model from class. Found a lab to email." },
      sophomore: { experiences: 2, network: 6, archetype: "First lab assistant role or co-op. Contributing to a design team." },
      junior: { experiences: 3, network: 12, archetype: "Internship at a known firm. Strong with SolidWorks and MATLAB." },
      senior: { experiences: 4, network: 18, archetype: "Return offer or grad school admit. Senior design project ready to show." },
      grad: { experiences: 5, network: 22, archetype: "Thesis underway. Paper or patent in progress." },
    },
  },
  data: {
    coursework: ["statistics", "linear algebra", "probability", "machine learning", "databases", "data structures", "regression"],
    skills: ["python", "sql", "pandas", "tableau", "statistics", "machine learning", "r", "spark"],
    byPhase: {
      freshman: { experiences: 1, network: 2, archetype: "Finished stats. One public Kaggle notebook. In a data club." },
      sophomore: { experiences: 2, network: 6, archetype: "First analytics internship or research role. Comfortable with SQL." },
      junior: { experiences: 3, network: 12, archetype: "Data or ML internship done. Two end to end projects in a portfolio." },
      senior: { experiences: 4, network: 18, archetype: "Return offer or grad school path. Capstone done." },
      grad: { experiences: 5, network: 22, archetype: "Specialty picked. Co-authored paper underway." },
    },
  },
  marketing: {
    coursework: ["marketing", "consumer behavior", "statistics", "communications", "psychology", "digital marketing", "analytics"],
    skills: ["google analytics", "seo", "copywriting", "content strategy", "hubspot", "a/b testing", "figma"],
    byPhase: {
      freshman: { experiences: 1, network: 2, archetype: "Ran a club social account. Started a small blog or newsletter." },
      sophomore: { experiences: 2, network: 6, archetype: "Marketing internship or agency role lined up. Google Analytics certified." },
      junior: { experiences: 3, network: 12, archetype: "Did a brand name internship. Has a portfolio of campaigns." },
      senior: { experiences: 4, network: 18, archetype: "Return offer or rotation program track." },
      grad: { experiences: 5, network: 22, archetype: "Brand or growth specialty." },
    },
  },
  preMed: {
    coursework: ["biology", "general chemistry", "organic chemistry", "physics", "biochemistry", "psychology", "sociology", "statistics"],
    skills: ["clinical exposure", "research methods", "patient interaction", "lab techniques", "mcat prep", "scientific writing"],
    byPhase: {
      freshman: { experiences: 1, network: 3, archetype: "Shadowed once. Started volunteering. Met with the pre-med advisor." },
      sophomore: { experiences: 2, network: 8, archetype: "In a research lab. 100+ clinical hours logged." },
      junior: { experiences: 3, network: 14, archetype: "200+ clinical hours. MCAT prep underway. Three rec letter relationships." },
      senior: { experiences: 4, network: 20, archetype: "MCAT done. AMCAS submitted. Rec letters secured." },
      grad: { experiences: 5, network: 25, archetype: "Med school and residency planning." },
    },
  },
  default: {
    coursework: ["college writing", "statistics", "intro to your major", "calculus"],
    skills: ["communication", "leadership", "writing", "data literacy", "presentation"],
    byPhase: {
      freshman: { experiences: 1, network: 2, archetype: "In a club. Solid first year GPA. Met one mentor." },
      sophomore: { experiences: 2, network: 6, archetype: "First internship or research role. A handful of alumni chats." },
      junior: { experiences: 3, network: 12, archetype: "A strong internship. A real mentor. A leadership role somewhere." },
      senior: { experiences: 4, network: 18, archetype: "Offer in hand. References lined up." },
      grad: { experiences: 5, network: 22, archetype: "Specialty clear. Thesis or capstone underway." },
    },
  },
};

/* ─── Trajectory scoring ─────────────────────────── */

function countMatches(haystack: string[], needles: string[]): number {
  const hay = haystack.map((s) => (s || "").toLowerCase());
  let n = 0;
  for (const needle of needles) {
    const term = needle.toLowerCase();
    if (hay.some((h) => h.includes(term))) n++;
  }
  return n;
}

function status(score: number, target: number): "ahead" | "on_track" | "behind" {
  if (target === 0) return "on_track";
  const ratio = score / target;
  if (ratio >= 1) return "ahead";
  if (ratio >= 0.7) return "on_track";
  return "behind";
}

export function getTrajectory(profile: any | null | undefined): Trajectory {
  const arc = getArcState(profile);
  const role = detectRole(profile);
  const bench = BENCHMARKS[role];
  const phaseTarget = bench.byPhase[arc.phase];

  // Coursework: pull completed course names from courseSchedule, count matches against role coursework
  const completedCourses: string[] = (profile?.courseSchedule || [])
    .flatMap((sem: any) => sem.courses || [])
    .filter((c: any) => c.completed)
    .map((c: any) => c.name || "");
  const courseScore = countMatches(completedCourses, bench.coursework);
  const courseTarget = Math.max(2, Math.floor(bench.coursework.length * 0.5)); // expect half of required coursework by end of current phase

  // Experiences: count of work/research/extracurricular leadership
  const expCount = Array.isArray(profile?.experiences) ? profile.experiences.length : 0;
  const expTarget = phaseTarget.experiences;

  // Network density: count of logged alumni contacts (future feature). For MVP fall back to estimating from extracurriculars.
  const networkScore = Array.isArray(profile?.extracurriculars)
    ? profile.extracurriculars.length
    : 0;
  const networkTarget = phaseTarget.network;

  // Skills: count of profile.skills that match role's portfolio-ready skill list
  const profileSkills: string[] = Array.isArray(profile?.skills) ? profile.skills : [];
  const skillScore = countMatches(profileSkills, bench.skills);
  const skillTarget = Math.max(3, Math.floor(bench.skills.length * 0.5));

  const rows: TrajectoryRow[] = [
    {
      key: "coursework",
      label: "Classes",
      score: courseScore,
      target: courseTarget,
      status: status(courseScore, courseTarget),
      advice:
        courseScore >= courseTarget
          ? `You have the basics covered. Use electives to go deeper.`
          : `Plan these in: ${bench.coursework
              .filter((c) => !completedCourses.some((cc) => cc.toLowerCase().includes(c.toLowerCase())))
              .slice(0, 2)
              .join(", ")}.`,
    },
    {
      key: "experiences",
      label: "Experience",
      score: expCount,
      target: expTarget,
      status: status(expCount, expTarget),
      advice:
        expCount >= expTarget
          ? `On track. Each year, aim for something harder than the last.`
          : `By the end of ${PHASE_LABELS[arc.phase]} year, students in your lane usually have ${expTarget}. You have ${expCount}.`,
    },
    {
      key: "network",
      label: "Network",
      score: networkScore,
      target: networkTarget,
      status: status(networkScore, networkTarget),
      advice:
        networkScore >= networkTarget
          ? `Plenty of contacts. Turn a few into real mentor relationships.`
          : `Most students who land this role have around ${networkTarget} contacts by now. You have ${networkScore}.`,
    },
    {
      key: "skills",
      label: "Skills",
      score: skillScore,
      target: skillTarget,
      status: status(skillScore, skillTarget),
      advice:
        skillScore >= skillTarget
          ? `Good stack. Pick one to go deep on this term.`
          : `Add: ${bench.skills
              .filter((s) => !profileSkills.some((ps) => ps.toLowerCase().includes(s.toLowerCase())))
              .slice(0, 3)
              .join(", ")}.`,
    },
  ];

  // Overall 0..100 = average completion ratio capped at 1 per row
  const overall = Math.round(
    (rows.reduce((sum, r) => sum + Math.min(1, r.target > 0 ? r.score / r.target : 1), 0) / rows.length) * 100
  );

  return { rows, overall };
}

export function archetypeForPhase(profile: any | null | undefined): string {
  const arc = getArcState(profile);
  const role = detectRole(profile);
  return BENCHMARKS[role].byPhase[arc.phase].archetype;
}

/** Archetype for any specific phase, given the user's detected role. */
export function archetypeFor(profile: any | null | undefined, phase: Phase): string {
  const role = detectRole(profile);
  return BENCHMARKS[role].byPhase[phase]?.archetype ?? "";
}

/* ─── Multi-zoom timeline layout ─────────────────── */

export type SemesterSlot = {
  index: number; // 1..8
  phase: Phase;
  label: string; // "Fall 2025"
  year: number;
  term: "Fall" | "Spring";
  status: "past" | "current" | "future";
};

export type WeekSlot = {
  index: number; // 1..15
  label: string; // "Week 1"
  status: "past" | "current" | "future";
};

/** Build all 8 undergrad semester slots from the profile's graduation date. */
export function getSemesterTimeline(profile: any | null | undefined): SemesterSlot[] {
  const arc = getArcState(profile);
  const graduating: string = (profile?.graduating || "").trim();
  // Try to parse graduating string for end year+term
  const gradMatch = graduating.match(/(May|December|Dec)\s*(\d{4})/i);
  const gradYear = gradMatch ? parseInt(gradMatch[2], 10) : new Date().getFullYear() + 2;
  const gradTerm: "Fall" | "Spring" = gradMatch && /dec/i.test(gradMatch[1]) ? "Fall" : "Spring";

  // Walk backward 8 semesters from graduation
  const slots: SemesterSlot[] = [];
  let year = gradYear;
  let term: "Fall" | "Spring" = gradTerm;
  const phases: Phase[] = ["senior", "senior", "junior", "junior", "sophomore", "sophomore", "freshman", "freshman"];
  for (let i = 0; i < 8; i++) {
    slots.unshift({
      index: 8 - i,
      phase: phases[i],
      label: `${term} ${year}`,
      year,
      term,
      status: "future",
    });
    // step backward
    if (term === "Spring") {
      term = "Fall";
      year = year - 1;
    } else {
      term = "Spring";
    }
  }

  // Mark current/past based on semesterNumber
  for (const s of slots) {
    if (s.index < arc.semesterNumber) s.status = "past";
    else if (s.index === arc.semesterNumber) s.status = "current";
    else s.status = "future";
  }
  return slots;
}

/** Roughly 15 weeks per semester. Mark current/past based on month of the year. */
export function getCurrentSemesterWeeks(): WeekSlot[] {
  const now = new Date();
  const m = now.getMonth(); // 0..11
  // Spring runs Jan..May (months 0..4) → ~Jan 15 start. Fall runs Aug..Dec (months 7..11).
  const inSpring = m >= 0 && m <= 5;
  const startMonth = inSpring ? 0 : 7;
  const startDay = 15; // approximate
  const semStart = new Date(now.getFullYear(), startMonth, startDay);
  const elapsedMs = now.getTime() - semStart.getTime();
  const elapsedWeeks = Math.max(0, Math.floor(elapsedMs / (7 * 86400000)));
  const total = 15;
  const slots: WeekSlot[] = [];
  for (let i = 1; i <= total; i++) {
    const status: WeekSlot["status"] =
      i < elapsedWeeks + 1 ? "past" : i === elapsedWeeks + 1 ? "current" : "future";
    slots.push({ index: i, label: `Wk ${i}`, status });
  }
  return slots;
}

/** Months covered by the current semester, with current month flagged. */
export function getCurrentSemesterMonths(): { label: string; status: "past" | "current" | "future" }[] {
  const now = new Date();
  const m = now.getMonth();
  const inSpring = m >= 0 && m <= 5;
  const months = inSpring
    ? ["January", "February", "March", "April", "May"]
    : ["August", "September", "October", "November", "December"];
  const startMonth = inSpring ? 0 : 7;
  return months.map((name, i) => {
    const monthIdx = startMonth + i;
    const status: "past" | "current" | "future" =
      monthIdx < m ? "past" : monthIdx === m ? "current" : "future";
    return { label: name, status };
  });
}

export function roleLabel(profile: any | null | undefined): string {
  const role = detectRole(profile);
  const map: Record<RoleKey, string> = {
    software: "Software Engineering",
    finance: "Finance / IB",
    consulting: "Consulting",
    mechAero: "Mechanical / Aerospace",
    data: "Data / Analytics",
    marketing: "Marketing / Growth",
    preMed: "Pre-Med",
    default: "your target role",
  };
  return map[role];
}
