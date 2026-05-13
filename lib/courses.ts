// Seeded CWRU Mechanical & Aerospace Engineering catalog.
// Hand-curated for the first 15 courses students hit on the MAE track.
// Numbers (grade dist, difficulty, workload) are illustrative starting
// values — real distributions get layered on top as students contribute.

import type { Comment, Course } from "./types";

export const COURSES: Course[] = [
  {
    id: "EMAE-160",
    code: "EMAE 160",
    title: "Mechanical Manufacturing",
    description:
      "Introduction to manufacturing processes: casting, forming, machining, welding, and additive manufacturing. Hands-on lab time in the machine shop.",
    credits: 3,
    year: "freshman",
    term: "spring",
    professors: ["Prof. Yun"],
    difficulty: 2,
    workload: 5,
    gradeDistribution: { A: 38, AMinus: 22, BPlus: 14, B: 11, BMinus: 6, CPlus: 4, C: 3, D: 1, F: 1 },
    resources: [
      { label: "Sears Think[box] orientation", url: "https://case.edu/thinkbox/", kind: "other" },
    ],
  },
  {
    id: "EMAE-181",
    code: "EMAE 181",
    title: "Dynamics",
    description:
      "Kinematics and kinetics of particles and rigid bodies. Newton's laws, work-energy, impulse-momentum. The math-heavy gateway to upper-level MAE.",
    credits: 3,
    year: "sophomore",
    term: "fall",
    professors: ["Prof. Newman", "Prof. Cooperman"],
    prereqs: ["EMAE-160"],
    difficulty: 4,
    workload: 9,
    gradeDistribution: { A: 18, AMinus: 16, BPlus: 17, B: 18, BMinus: 12, CPlus: 8, C: 6, D: 3, F: 2 },
    resources: [
      { label: "Hibbeler Dynamics textbook PDF", url: "https://www.pearson.com/", kind: "textbook" },
      { label: "MIT OCW 2.003 Dynamics", url: "https://ocw.mit.edu/courses/2-003sc-engineering-dynamics-fall-2011/", kind: "video" },
    ],
  },
  {
    id: "EMAE-250",
    code: "EMAE 250",
    title: "Computer-Aided Engineering",
    description:
      "SolidWorks fundamentals, 3D modeling, assemblies, technical drawings, and an intro to finite element analysis. Project-based.",
    credits: 3,
    year: "sophomore",
    term: "spring",
    professors: ["Prof. Lewandowski"],
    difficulty: 3,
    workload: 7,
    gradeDistribution: { A: 32, AMinus: 24, BPlus: 18, B: 12, BMinus: 6, CPlus: 4, C: 2, D: 1, F: 1 },
    resources: [
      { label: "SolidWorks tutorials (CWRU)", url: "https://case.edu/", kind: "video" },
      { label: "Think[box] training schedule", url: "https://case.edu/thinkbox/", kind: "other" },
    ],
  },
  {
    id: "EMAE-251",
    code: "EMAE 251",
    title: "Thermodynamics",
    description:
      "First and second laws, state postulates, cycles, and refrigeration. Many problems, big property tables, learn to love them.",
    credits: 3,
    year: "sophomore",
    term: "spring",
    professors: ["Prof. Liu", "Prof. Mathur"],
    prereqs: ["EMAE-181"],
    difficulty: 4,
    workload: 9,
    gradeDistribution: { A: 16, AMinus: 17, BPlus: 18, B: 19, BMinus: 13, CPlus: 8, C: 5, D: 3, F: 1 },
    resources: [
      { label: "Cengel Thermodynamics", url: "https://www.mheducation.com/", kind: "textbook" },
      { label: "Thermo property tables (PDF)", url: "https://case.edu/", kind: "notes" },
    ],
  },
  {
    id: "EMAE-260",
    code: "EMAE 260",
    title: "Mechanics of Materials",
    description:
      "Stress, strain, axial loads, torsion, bending, transverse shear, and combined loading. Foundation for structural design.",
    credits: 3,
    year: "sophomore",
    term: "spring",
    professors: ["Prof. Lewandowski"],
    prereqs: ["EMAE-181"],
    difficulty: 4,
    workload: 8,
    gradeDistribution: { A: 20, AMinus: 18, BPlus: 17, B: 17, BMinus: 11, CPlus: 7, C: 5, D: 3, F: 2 },
    resources: [
      { label: "Hibbeler Mechanics of Materials", url: "https://www.pearson.com/", kind: "textbook" },
    ],
  },
  {
    id: "EMAE-281",
    code: "EMAE 281",
    title: "Mechanical Engineering Lab I",
    description:
      "Hands-on labs paired with the sophomore-year theory courses. Measurement, instrumentation, data analysis, and lab report writing.",
    credits: 2,
    year: "sophomore",
    term: "spring",
    professors: ["Prof. Akkus"],
    prereqs: ["EMAE-250"],
    difficulty: 3,
    workload: 6,
    gradeDistribution: { A: 30, AMinus: 23, BPlus: 17, B: 14, BMinus: 7, CPlus: 4, C: 3, D: 1, F: 1 },
    resources: [
      { label: "Lab report template", url: "https://case.edu/", kind: "drive" },
    ],
  },
  {
    id: "EMAE-311",
    code: "EMAE 311",
    title: "Engineering Materials",
    description:
      "Microstructure, mechanical and thermal properties of metals, polymers, and composites. Phase diagrams, failure modes, selection.",
    credits: 3,
    year: "junior",
    term: "fall",
    professors: ["Prof. Lewandowski"],
    prereqs: ["EMAE-260"],
    difficulty: 3,
    workload: 7,
    gradeDistribution: { A: 22, AMinus: 20, BPlus: 18, B: 16, BMinus: 10, CPlus: 7, C: 4, D: 2, F: 1 },
    resources: [
      { label: "Callister Materials Science", url: "https://www.wiley.com/", kind: "textbook" },
    ],
  },
  {
    id: "EMAE-350",
    code: "EMAE 350",
    title: "Mechanical Engineering Analysis",
    description:
      "Applied math for MAE: ODEs, PDEs, Fourier methods, numerical methods. The course that makes upper-level fluid and heat transfer possible.",
    credits: 3,
    year: "junior",
    term: "fall",
    professors: ["Prof. Mathur"],
    prereqs: ["EMAE-251", "EMAE-260"],
    difficulty: 5,
    workload: 11,
    gradeDistribution: { A: 12, AMinus: 14, BPlus: 18, B: 21, BMinus: 14, CPlus: 9, C: 7, D: 3, F: 2 },
    resources: [
      { label: "Kreyszig Advanced Engineering Math", url: "https://www.wiley.com/", kind: "textbook" },
    ],
  },
  {
    id: "EMAE-351",
    code: "EMAE 351",
    title: "Fluid and Thermal Engineering I",
    description:
      "Fluid statics, conservation laws, incompressible viscous flow, dimensional analysis. Practical pump and pipe sizing.",
    credits: 3,
    year: "junior",
    term: "spring",
    professors: ["Prof. Liu"],
    prereqs: ["EMAE-251", "EMAE-350"],
    difficulty: 4,
    workload: 9,
    gradeDistribution: { A: 17, AMinus: 17, BPlus: 18, B: 19, BMinus: 12, CPlus: 8, C: 5, D: 3, F: 1 },
    resources: [
      { label: "White Fluid Mechanics", url: "https://www.mheducation.com/", kind: "textbook" },
    ],
  },
  {
    id: "EMAE-354",
    code: "EMAE 354",
    title: "Fluid and Thermal Engineering II",
    description:
      "Heat transfer: conduction, convection, radiation, and heat exchangers. Continuation of EMAE 351.",
    credits: 3,
    year: "junior",
    term: "spring",
    professors: ["Prof. Liu"],
    prereqs: ["EMAE-351"],
    difficulty: 4,
    workload: 9,
    gradeDistribution: { A: 18, AMinus: 17, BPlus: 18, B: 18, BMinus: 12, CPlus: 7, C: 5, D: 3, F: 2 },
    resources: [
      { label: "Incropera Heat Transfer", url: "https://www.wiley.com/", kind: "textbook" },
    ],
  },
  {
    id: "EMAE-355",
    code: "EMAE 355",
    title: "Design of Fluid and Thermal Systems",
    description:
      "Systems-level design problem combining thermo, fluids, and heat transfer. Team project, real-world constraints.",
    credits: 3,
    year: "senior",
    term: "fall",
    professors: ["Prof. Mathur"],
    prereqs: ["EMAE-354"],
    difficulty: 4,
    workload: 10,
    gradeDistribution: { A: 26, AMinus: 22, BPlus: 17, B: 14, BMinus: 9, CPlus: 6, C: 3, D: 2, F: 1 },
    resources: [],
  },
  {
    id: "EMAE-372",
    code: "EMAE 372",
    title: "System Dynamics",
    description:
      "Modeling and analysis of dynamic systems: mechanical, electrical, fluid, thermal. Transfer functions, time and frequency response.",
    credits: 3,
    year: "junior",
    term: "spring",
    professors: ["Prof. Cooperman"],
    prereqs: ["EMAE-181", "EMAE-350"],
    difficulty: 4,
    workload: 9,
    gradeDistribution: { A: 19, AMinus: 18, BPlus: 18, B: 17, BMinus: 11, CPlus: 8, C: 5, D: 3, F: 1 },
    resources: [
      { label: "Ogata System Dynamics", url: "https://www.pearson.com/", kind: "textbook" },
    ],
  },
  {
    id: "EMAE-376",
    code: "EMAE 376",
    title: "Stress Analysis",
    description:
      "Advanced stress analysis: failure criteria, fatigue, fracture mechanics, FEA fundamentals. Companion to EMAE 311.",
    credits: 3,
    year: "junior",
    term: "fall",
    professors: ["Prof. Lewandowski"],
    prereqs: ["EMAE-260"],
    difficulty: 4,
    workload: 8,
    gradeDistribution: { A: 21, AMinus: 19, BPlus: 18, B: 16, BMinus: 10, CPlus: 7, C: 5, D: 3, F: 1 },
    resources: [],
  },
  {
    id: "EMAE-381",
    code: "EMAE 381",
    title: "Mechanical Engineering Lab II",
    description:
      "Continuation of MAE labs at the junior level: vibrations, controls, thermal-fluid systems, more autonomous experiments.",
    credits: 2,
    year: "junior",
    term: "fall",
    professors: ["Prof. Akkus"],
    prereqs: ["EMAE-281"],
    difficulty: 3,
    workload: 6,
    gradeDistribution: { A: 28, AMinus: 22, BPlus: 18, B: 14, BMinus: 8, CPlus: 5, C: 3, D: 1, F: 1 },
    resources: [],
  },
  {
    id: "EMAE-398",
    code: "EMAE 398",
    title: "Senior Design Project",
    description:
      "Two-semester capstone, often a sponsored project. Teams design, build, test. Connect with Veale Institute for entrepreneurial spins.",
    credits: 3,
    year: "senior",
    term: "fall",
    professors: ["Prof. Cooperman"],
    prereqs: ["EMAE-355", "EMAE-372"],
    difficulty: 4,
    workload: 12,
    gradeDistribution: { A: 32, AMinus: 24, BPlus: 18, B: 12, BMinus: 7, CPlus: 4, C: 2, D: 1, F: 0 },
    resources: [
      { label: "Veale Institute resources", url: "https://case.edu/veale/", kind: "other" },
      { label: "Think[box] capstone support", url: "https://case.edu/thinkbox/", kind: "other" },
    ],
  },
];

export const COURSE_BY_ID = Object.fromEntries(COURSES.map((c) => [c.id, c]));

export function getCourse(id: string): Course | undefined {
  return COURSE_BY_ID[id];
}

/* ─── Seed comments ─────────────────────────────── */

const now = new Date();
function daysAgo(n: number): string {
  return new Date(now.getTime() - n * 86400000).toISOString();
}

export const SEED_COMMENTS: Comment[] = [
  {
    id: "seed-1",
    courseId: "EMAE-181",
    authorName: "Maya R.",
    authorInitials: "MR",
    body: "Don't skip recitation. The professor's lecture problems are gentler than the actual homework — recitation is where the real reps happen.",
    tag: "tip",
    upvotes: 24,
    createdAt: daysAgo(40),
  },
  {
    id: "seed-2",
    courseId: "EMAE-181",
    authorName: "Daniel K.",
    authorInitials: "DK",
    body: "Midterm 2 (rotational dynamics + work-energy) is the killer. Form a study group two weeks out.",
    tag: "warning",
    upvotes: 31,
    createdAt: daysAgo(25),
  },
  {
    id: "seed-3",
    courseId: "EMAE-181",
    authorName: "Priya S.",
    authorInitials: "PS",
    body: "MIT OCW 2.003 Walter Lewin lectures saved me. The CWRU course is paced similarly.",
    tag: "resource",
    upvotes: 19,
    createdAt: daysAgo(12),
  },
  {
    id: "seed-4",
    courseId: "EMAE-251",
    authorName: "Jordan L.",
    authorInitials: "JL",
    body: "Print the property tables and keep them tabbed. You can use them on every exam and homework — fluency matters.",
    tag: "tip",
    upvotes: 22,
    createdAt: daysAgo(50),
  },
  {
    id: "seed-5",
    courseId: "EMAE-251",
    authorName: "Sam T.",
    authorInitials: "ST",
    body: "Second law / entropy is where most people get tripped up. Don't memorize — draw the cycles.",
    tag: "tip",
    upvotes: 16,
    createdAt: daysAgo(18),
  },
  {
    id: "seed-6",
    courseId: "EMAE-260",
    authorName: "Alex P.",
    authorInitials: "AP",
    body: "Hibbeler chapter problems are exactly the level of the exams. Do them all in order.",
    tag: "tip",
    upvotes: 27,
    createdAt: daysAgo(30),
  },
  {
    id: "seed-7",
    courseId: "EMAE-250",
    authorName: "Riya M.",
    authorInitials: "RM",
    body: "Go to Think[box] training in week 1. You'll fly through the SolidWorks assemblies once you've done one in person.",
    tag: "resource",
    upvotes: 18,
    createdAt: daysAgo(28),
  },
  {
    id: "seed-8",
    courseId: "EMAE-250",
    authorName: "Owen B.",
    authorInitials: "OB",
    body: "The final assembly project takes 20+ hours. Start week 1 of the project window, not week 3.",
    tag: "warning",
    upvotes: 21,
    createdAt: daysAgo(15),
  },
  {
    id: "seed-9",
    courseId: "EMAE-350",
    authorName: "Nadia F.",
    authorInitials: "NF",
    body: "Brutal pace. Office hours are gold — Prof. Mathur walks through every example. Show up weekly.",
    tag: "professor",
    upvotes: 29,
    createdAt: daysAgo(35),
  },
  {
    id: "seed-10",
    courseId: "EMAE-350",
    authorName: "Kevin H.",
    authorInitials: "KH",
    body: "Don't try to memorize PDE solution forms. Build a one-page cheat sheet of methods and when to use them.",
    tag: "tip",
    upvotes: 17,
    createdAt: daysAgo(8),
  },
  {
    id: "seed-11",
    courseId: "EMAE-351",
    authorName: "Tom V.",
    authorInitials: "TV",
    body: "Dimensional analysis problems look hard but they're the easiest points on the exam. Practice 5 from each chapter.",
    tag: "tip",
    upvotes: 14,
    createdAt: daysAgo(22),
  },
  {
    id: "seed-12",
    courseId: "EMAE-354",
    authorName: "Ana C.",
    authorInitials: "AC",
    body: "Final exam leans heavily on heat exchangers. Don't skip the textbook examples in chapter 11.",
    tag: "exam",
    upvotes: 20,
    createdAt: daysAgo(10),
  },
  {
    id: "seed-13",
    courseId: "EMAE-372",
    authorName: "Felix W.",
    authorInitials: "FW",
    body: "MATLAB Control Systems Toolbox is your friend. Half the homework is faster if you sketch the Bode plot computationally first.",
    tag: "resource",
    upvotes: 13,
    createdAt: daysAgo(20),
  },
  {
    id: "seed-14",
    courseId: "EMAE-398",
    authorName: "Lina G.",
    authorInitials: "LG",
    body: "Pick a sponsor project that aligns with what you want to do post-grad. Capstone is your single best resume line.",
    tag: "tip",
    upvotes: 35,
    createdAt: daysAgo(60),
  },
  {
    id: "seed-15",
    courseId: "EMAE-398",
    authorName: "Hassan K.",
    authorInitials: "HK",
    body: "Lock in your team early. The first three weeks of project setup determine everything.",
    tag: "warning",
    upvotes: 23,
    createdAt: daysAgo(45),
  },
  {
    id: "seed-16",
    courseId: "EMAE-311",
    authorName: "Iris L.",
    authorInitials: "IL",
    body: "Phase diagrams show up on every exam. Memorize the iron-carbon diagram cold.",
    tag: "exam",
    upvotes: 18,
    createdAt: daysAgo(14),
  },
  {
    id: "seed-17",
    courseId: "EMAE-376",
    authorName: "Marco D.",
    authorInitials: "MD",
    body: "Fatigue and fracture mechanics is a different mode of thinking. Watch a couple of YouTube primers before the unit starts.",
    tag: "resource",
    upvotes: 11,
    createdAt: daysAgo(7),
  },
  {
    id: "seed-18",
    courseId: "EMAE-160",
    authorName: "Eli J.",
    authorInitials: "EJ",
    body: "Lowkey easiest A of sophomore year if you show up and do the shop hours. Don't ghost lab.",
    tag: "tip",
    upvotes: 26,
    createdAt: daysAgo(33),
  },
];

/* ─── Seed enrollment counts ────────────────────── */

// Initial enrollment counts so the dashboard doesn't look empty.
// These are fake current-cohort counts — overlaid when the user has not yet
// enrolled themselves anywhere.
export const SEED_ENROLLMENT_COUNTS: Record<string, number> = {
  "EMAE-160": 84,
  "EMAE-181": 76,
  "EMAE-250": 68,
  "EMAE-251": 71,
  "EMAE-260": 64,
  "EMAE-281": 58,
  "EMAE-311": 44,
  "EMAE-350": 51,
  "EMAE-351": 47,
  "EMAE-354": 39,
  "EMAE-355": 31,
  "EMAE-372": 42,
  "EMAE-376": 36,
  "EMAE-381": 33,
  "EMAE-398": 28,
};

/* ─── Filters ───────────────────────────────────── */

export function filterCourses(
  courses: Course[],
  opts: { year?: string; term?: string; query?: string }
): Course[] {
  return courses.filter((c) => {
    if (opts.year && opts.year !== "all" && c.year !== opts.year) return false;
    if (opts.term && opts.term !== "all" && c.term !== opts.term && c.term !== "both") return false;
    if (opts.query) {
      const q = opts.query.toLowerCase();
      if (!`${c.code} ${c.title} ${c.description}`.toLowerCase().includes(q)) return false;
    }
    return true;
  });
}
