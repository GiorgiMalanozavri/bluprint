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
    freshman: "Year 1 of 4. The compounding starts now — set foundations before life gets harder.",
    sophomore: "The most leveraged year of your degree. First internship season is months away.",
    junior: "Decision year. Internship offers convert to senior-year roles. Be visible.",
    senior: "Final stretch. Land the offer; don't chase the GPA you already have.",
    grad: "Specialize, publish, network up. Your committee matters more than your transcript.",
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
      freshman: {
        experiences: 1,
        network: 2,
        archetype: "Finished intro CS strong (A/A-). Built one personal project on GitHub. Joined a coding club.",
      },
      sophomore: {
        experiences: 2,
        network: 6,
        archetype: "First internship or research role lined up. 2+ projects on GitHub. DM'd 5+ alumni.",
      },
      junior: {
        experiences: 3,
        network: 12,
        archetype: "Brand-name internship done. Portfolio site live. Mentor in industry. Specialization picked.",
      },
      senior: {
        experiences: 4,
        network: 20,
        archetype: "Return offer in hand. Open-source contribution. Capstone published. References lined up.",
      },
      grad: { experiences: 5, network: 25, archetype: "Research publication or staff-eng-track internship." },
    },
  },
  finance: {
    coursework: ["financial accounting", "corporate finance", "statistics", "economics", "valuation", "financial modeling"],
    skills: ["excel", "powerpoint", "financial modeling", "valuation", "bloomberg", "dcf", "m&a", "capital markets"],
    byPhase: {
      freshman: { experiences: 1, network: 3, archetype: "Joined finance club. Strong intro econ/accounting grades. First coffee chat done." },
      sophomore: { experiences: 2, network: 10, archetype: "Sophomore Diversity / Spring Insight program lined up. 10+ alumni chats. WSO active." },
      junior: { experiences: 3, network: 20, archetype: "Bulge bracket SA offer done. Modeling test prep finished. 2+ active mentors." },
      senior: { experiences: 4, network: 30, archetype: "FT offer signed. Continuing to network for buy-side exits." },
      grad: { experiences: 5, network: 35, archetype: "MBA-pipeline or PE/HF specialization." },
    },
  },
  consulting: {
    coursework: ["statistics", "economics", "business strategy", "marketing", "behavioral economics", "operations"],
    skills: ["powerpoint", "excel", "case interviews", "structured thinking", "market sizing", "data analysis", "presentation"],
    byPhase: {
      freshman: { experiences: 1, network: 3, archetype: "Joined consulting club. Cracked a few practice cases. Reached out to one consultant." },
      sophomore: { experiences: 2, network: 10, archetype: "Sophomore summer experience (research/case comp/start-up). Casing 2x/week. 10+ chats." },
      junior: { experiences: 3, network: 20, archetype: "MBB or Tier-2 SA offer. Case partner network. Leadership in a club." },
      senior: { experiences: 4, network: 25, archetype: "FT offer in hand. Final-round practice for backups." },
      grad: { experiences: 5, network: 30, archetype: "MBA candidate or industry expert track." },
    },
  },
  mechAero: {
    coursework: ["statics", "dynamics", "thermodynamics", "fluid mechanics", "materials science", "cad", "control systems", "manufacturing"],
    skills: ["solidworks", "matlab", "ansys", "cad tolerancing", "finite element analysis", "python", "manufacturing processes"],
    byPhase: {
      freshman: { experiences: 1, network: 2, archetype: "Joined a design team (FSAE/AIAA). Built one CAD model in class. Found a research lab to email." },
      sophomore: { experiences: 2, network: 6, archetype: "Lab assistant or first co-op. Design team contribution. 5+ industry chats." },
      junior: { experiences: 3, network: 12, archetype: "Internship at known firm. Capstone topic chosen. SolidWorks/MATLAB strong." },
      senior: { experiences: 4, network: 18, archetype: "Return offer or grad-school admit. Senior design project on portfolio." },
      grad: { experiences: 5, network: 22, archetype: "Research thesis underway. Conference paper or patent in progress." },
    },
  },
  data: {
    coursework: ["statistics", "linear algebra", "probability", "machine learning", "databases", "data structures", "regression"],
    skills: ["python", "sql", "pandas", "tableau", "statistics", "machine learning", "r", "spark"],
    byPhase: {
      freshman: { experiences: 1, network: 2, archetype: "Finished stats sequence. One Kaggle notebook public. Joined a data club." },
      sophomore: { experiences: 2, network: 6, archetype: "First analytics internship or research assistantship. SQL fluent. 5+ chats." },
      junior: { experiences: 3, network: 12, archetype: "ML/DS internship done. Portfolio with 2+ end-to-end projects. Mentor in industry." },
      senior: { experiences: 4, network: 18, archetype: "Return offer or grad-school path. Capstone published. Open-source contrib." },
      grad: { experiences: 5, network: 22, archetype: "Specialization (NLP/CV/RL). Co-authored paper underway." },
    },
  },
  marketing: {
    coursework: ["marketing", "consumer behavior", "statistics", "communications", "psychology", "digital marketing", "analytics"],
    skills: ["google analytics", "seo", "copywriting", "content strategy", "hubspot", "a/b testing", "figma"],
    byPhase: {
      freshman: { experiences: 1, network: 2, archetype: "Ran a social account for a club. Started a side blog or newsletter." },
      sophomore: { experiences: 2, network: 6, archetype: "Marketing internship or agency role lined up. Google Analytics certified." },
      junior: { experiences: 3, network: 12, archetype: "Brand-name internship done. Portfolio of campaigns/copy. Leadership in a club." },
      senior: { experiences: 4, network: 18, archetype: "Return offer or APM/marketing-rotation track." },
      grad: { experiences: 5, network: 22, archetype: "Brand marketing or growth specialization." },
    },
  },
  preMed: {
    coursework: ["biology", "general chemistry", "organic chemistry", "physics", "biochemistry", "psychology", "sociology", "statistics"],
    skills: ["clinical exposure", "research methods", "patient interaction", "lab techniques", "mcat prep", "scientific writing"],
    byPhase: {
      freshman: { experiences: 1, network: 3, archetype: "Shadowed once. Started volunteering. Pre-med advisor on board." },
      sophomore: { experiences: 2, network: 8, archetype: "Research lab joined. 100+ clinical hours. Pre-med org membership." },
      junior: { experiences: 3, network: 14, archetype: "200+ clinical hours. MCAT prep underway. 3+ rec-letter relationships." },
      senior: { experiences: 4, network: 20, archetype: "MCAT done. AMCAS submitted. Strong rec letters secured." },
      grad: { experiences: 5, network: 25, archetype: "Med school + residency planning." },
    },
  },
  default: {
    coursework: ["college writing", "statistics", "intro to your major", "calculus"],
    skills: ["communication", "leadership", "writing", "data literacy", "presentation"],
    byPhase: {
      freshman: { experiences: 1, network: 2, archetype: "Joined a club. Strong first-year GPA. Met one mentor." },
      sophomore: { experiences: 2, network: 6, archetype: "First internship or research role. 5+ alumni chats." },
      junior: { experiences: 3, network: 12, archetype: "Strong internship. Mentor relationship. Leadership role." },
      senior: { experiences: 4, network: 18, archetype: "Offer in hand. References lined up." },
      grad: { experiences: 5, network: 22, archetype: "Specialization clear. Thesis or capstone underway." },
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
      label: "Coursework alignment",
      score: courseScore,
      target: courseTarget,
      status: status(courseScore, courseTarget),
      advice: courseScore >= courseTarget
        ? `You've covered the foundations for your target role. Pick electives that extend depth.`
        : `Missing key foundations: ${bench.coursework
            .filter((c) => !completedCourses.some((cc) => cc.toLowerCase().includes(c.toLowerCase())))
            .slice(0, 2)
            .join(", ")}. Plan them in.`,
    },
    {
      key: "experiences",
      label: "First-hand experiences",
      score: expCount,
      target: expTarget,
      status: status(expCount, expTarget),
      advice: expCount >= expTarget
        ? `On track. Aim for one role each year that's harder than the last.`
        : `By end of ${PHASE_LABELS[arc.phase]}, peers in your lane have ${expTarget}. The gap to close: ${expTarget - expCount}.`,
    },
    {
      key: "network",
      label: "Network density",
      score: networkScore,
      target: networkTarget,
      status: status(networkScore, networkTarget),
      advice: networkScore >= networkTarget
        ? `You're well-connected. Convert chats into mentor relationships.`
        : `Most students who land your target role have ${networkTarget} meaningful connections by now. You're at ${networkScore}.`,
    },
    {
      key: "skills",
      label: "Portfolio-ready skills",
      score: skillScore,
      target: skillTarget,
      status: status(skillScore, skillTarget),
      advice: skillScore >= skillTarget
        ? `Strong stack. Pick one to go deep on this semester.`
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
