// Compass core types. Pure data shapes — no React, no DOM.

export type CourseYear = "freshman" | "sophomore" | "junior" | "senior";
export type CourseTerm = "fall" | "spring";

export type GradeDistribution = {
  A: number;
  AMinus: number;
  BPlus: number;
  B: number;
  BMinus: number;
  CPlus: number;
  C: number;
  D: number;
  F: number;
};

export type CourseResource = {
  label: string;
  url: string;
  /** Optional kind tag for icon: textbook, notes, github, video, drive, other */
  kind?: "textbook" | "notes" | "github" | "video" | "drive" | "other";
};

export type Comment = {
  id: string;
  courseId: string;
  authorName: string;
  authorInitials: string;
  body: string;
  /** Tip category — keeps comments scannable. */
  tag?: "tip" | "warning" | "resource" | "professor" | "exam";
  upvotes: number;
  createdAt: string; // ISO date
};

export type Course = {
  id: string; // e.g. "EMAE-181"
  code: string; // "EMAE 181"
  title: string;
  description: string;
  credits: number;
  year: CourseYear;
  term: CourseTerm | "both";
  /** Common professors who teach this course. */
  professors?: string[];
  /** Pre-reqs as course IDs (used as links on detail page). */
  prereqs?: string[];
  /** Difficulty 1–5, surfaced from past students. */
  difficulty?: 1 | 2 | 3 | 4 | 5;
  /** Average workload in hours/week, surfaced from past students. */
  workload?: number;
  gradeDistribution: GradeDistribution;
  resources: CourseResource[];
};

export type UserProfile = {
  name: string;
  initials: string;
  university: "Case Western Reserve University";
  major: "Mechanical & Aerospace Engineering";
  year: CourseYear;
  completedCourseIds: string[]; // seeded from onboarding
  enrolledCourseIds: string[]; // currently taking
  goals: string;
  concerns: string;
  createdAt: string;
};

export type RoadmapSemester = {
  term: string; // "Fall 2026"
  year: CourseYear;
  focus: string; // one-liner mission
  whyItMatters: string;
  recommendedCourses: string[]; // course codes
  milestones: string[]; // 2–4 concrete things to do this term
};

export type GeneratedRoadmap = {
  generatedAt: string;
  summary: string;
  semesters: RoadmapSemester[];
};
