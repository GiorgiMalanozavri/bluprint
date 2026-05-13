"use client";

import { Check, Compass, Loader2, Search, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { COURSES, SEED_ENROLLMENT_COUNTS, filterCourses } from "@/lib/courses";
import { getEnrollmentsMap, getProfile } from "@/lib/storage";
import type { CourseYear, UserProfile } from "@/lib/types";

const YEAR_FILTERS: ({ value: "all" | CourseYear; label: string })[] = [
  { value: "all", label: "All years" },
  { value: "freshman", label: "Freshman" },
  { value: "sophomore", label: "Sophomore" },
  { value: "junior", label: "Junior" },
  { value: "senior", label: "Senior" },
];

const TERM_FILTERS: ({ value: "all" | "fall" | "spring"; label: string })[] = [
  { value: "all", label: "All terms" },
  { value: "fall", label: "Fall" },
  { value: "spring", label: "Spring" },
];

export default function DashboardPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [year, setYear] = useState<"all" | CourseYear>("all");
  const [term, setTerm] = useState<"all" | "fall" | "spring">("all");
  const [query, setQuery] = useState("");
  const [enrollments, setEnrollments] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      router.replace("/onboarding");
      return;
    }
    setProfile(p);
    setEnrollments(getEnrollmentsMap());
  }, [router]);

  const filtered = useMemo(() => filterCourses(COURSES, { year, term, query }), [year, term, query]);

  if (!profile) {
    return (
      <main className="mx-auto max-w-6xl px-5 py-16 sm:px-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
      </main>
    );
  }

  const enrollmentCount = (courseId: string): number => {
    const local = enrollments[courseId]?.length ?? 0;
    const seed = SEED_ENROLLMENT_COUNTS[courseId] ?? 0;
    return seed + local;
  };

  const completedSet = new Set(profile.completedCourseIds);
  const enrolledSet = new Set(profile.enrolledCourseIds);

  return (
    <main className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">CWRU MAE catalog</p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight text-[var(--foreground)]">Courses</h1>
        </div>
        <Link
          href="/roadmap"
          className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-3.5 py-2 text-[12.5px] font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
        >
          <Compass size={13} /> Open my roadmap
        </Link>
      </header>

      {/* Filters */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses…"
            className="h-10 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] pl-9 pr-3 text-[13px] outline-none transition-colors focus:border-[var(--foreground)]"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          {YEAR_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setYear(f.value)}
              className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                year === f.value
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TERM_FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setTerm(f.value)}
              className={`rounded-lg border px-2.5 py-1.5 text-[12px] font-medium transition-colors ${
                term === f.value
                  ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                  : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Course grid */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-16 text-center">
          <p className="text-[14px] font-medium text-[var(--foreground)]">No courses match.</p>
          <p className="mt-1 text-[12px] text-[var(--muted)]">Adjust the filters or clear the search.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => {
            const taken = completedSet.has(c.id);
            const taking = enrolledSet.has(c.id);
            return (
              <Link
                key={c.id}
                href={`/courses/${c.id}`}
                className="group flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 transition-colors hover:border-[var(--foreground)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-mono text-[11.5px] font-medium text-[var(--muted)]">{c.code}</p>
                    <h3 className="mt-1 text-[14.5px] font-semibold leading-snug text-[var(--foreground)]">
                      {c.title}
                    </h3>
                  </div>
                  {taken && (
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-[var(--background)]">
                      <Check size={11} strokeWidth={3} />
                    </span>
                  )}
                  {taking && !taken && (
                    <span className="shrink-0 rounded-md border border-[var(--accent)] px-1.5 py-0.5 text-[9.5px] font-semibold text-[var(--accent)]">
                      ENROLLED
                    </span>
                  )}
                </div>

                <p className="mt-2.5 line-clamp-2 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]">
                  {c.description}
                </p>

                <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-3 text-[11px] text-[var(--muted)]">
                  <div className="flex items-center gap-3">
                    <span className="capitalize">{c.year}</span>
                    <span className="text-[var(--border-hover)]">·</span>
                    <span className="capitalize">{c.term === "both" ? "Fall/Spring" : c.term}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users size={11} />
                    <span className="font-medium">{enrollmentCount(c.id)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </main>
  );
}
