// localStorage helpers. Typed, SSR-safe, single source of truth for keys.

import type { Comment, GeneratedRoadmap, UserProfile } from "./types";

const KEYS = {
  profile: "compass.profile.v1",
  comments: "compass.comments.v1",
  enrollments: "compass.enrollments.v1", // map courseId -> [userName, ...] (anon-ish counts)
  roadmap: "compass.roadmap.v1",
} as const;

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* ignore quota */ }
}

/* ─── Profile ───────────────────────────────────── */

export function getProfile(): UserProfile | null {
  return read<UserProfile>(KEYS.profile);
}

export function saveProfile(profile: UserProfile): void {
  write(KEYS.profile, profile);
}

export function clearProfile(): void {
  if (typeof window !== "undefined") localStorage.removeItem(KEYS.profile);
}

/* ─── Roadmap ───────────────────────────────────── */

export function getRoadmap(): GeneratedRoadmap | null {
  return read<GeneratedRoadmap>(KEYS.roadmap);
}

export function saveRoadmap(roadmap: GeneratedRoadmap): void {
  write(KEYS.roadmap, roadmap);
}

/* ─── Comments ──────────────────────────────────── */

export function getAllComments(): Comment[] {
  return read<Comment[]>(KEYS.comments) ?? [];
}

export function getCommentsForCourse(courseId: string): Comment[] {
  return getAllComments().filter((c) => c.courseId === courseId);
}

export function addComment(comment: Comment): void {
  const all = getAllComments();
  write(KEYS.comments, [comment, ...all]);
}

export function upvoteComment(commentId: string): void {
  const all = getAllComments();
  const next = all.map((c) => (c.id === commentId ? { ...c, upvotes: c.upvotes + 1 } : c));
  write(KEYS.comments, next);
}

/* ─── Enrollments ───────────────────────────────── */

export function getEnrollmentsMap(): Record<string, string[]> {
  return read<Record<string, string[]>>(KEYS.enrollments) ?? {};
}

export function getEnrollees(courseId: string): string[] {
  return getEnrollmentsMap()[courseId] ?? [];
}

export function setEnrolledCourses(userName: string, courseIds: string[]): void {
  const map = getEnrollmentsMap();
  // Remove user from all courses first
  for (const id of Object.keys(map)) {
    map[id] = (map[id] ?? []).filter((n) => n !== userName);
  }
  // Add to the new set
  for (const id of courseIds) {
    if (!map[id]) map[id] = [];
    if (!map[id].includes(userName)) map[id].push(userName);
  }
  write(KEYS.enrollments, map);
}
