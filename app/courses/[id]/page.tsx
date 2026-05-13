"use client";

import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowUp,
  BookOpen,
  Briefcase,
  ExternalLink,
  Flag,
  Github,
  Loader2,
  Plus,
  Users,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { COURSES, COURSE_BY_ID, SEED_COMMENTS, SEED_ENROLLMENT_COUNTS } from "@/lib/courses";
import {
  addComment,
  getCommentsForCourse,
  getEnrollees,
  getProfile,
  upvoteComment,
} from "@/lib/storage";
import type { Comment, Course, CourseResource, GradeDistribution, UserProfile } from "@/lib/types";

export default function CourseDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const courseId = decodeURIComponent(params.id);
  const course = COURSE_BY_ID[courseId];

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [enrollees, setEnrollees] = useState<string[]>([]);
  const [showAddComment, setShowAddComment] = useState(false);

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      router.replace("/onboarding");
      return;
    }
    setProfile(p);
    refresh(courseId);
  }, [router, courseId]);

  const refresh = (id: string) => {
    const local = getCommentsForCourse(id);
    const seeded = SEED_COMMENTS.filter((c) => c.courseId === id);
    // Local first (most recent), then seed (sorted by upvotes desc)
    const merged = [...local, ...seeded].sort((a, b) => b.upvotes - a.upvotes);
    setComments(merged);
    setEnrollees(getEnrollees(id));
  };

  const enrollmentCount = useMemo(() => {
    if (!course) return 0;
    return (SEED_ENROLLMENT_COUNTS[course.id] ?? 0) + enrollees.length;
  }, [course, enrollees]);

  if (!course) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <p className="text-[14px] text-[var(--muted)]">Course not found.</p>
        <Link href="/dashboard" className="mt-4 inline-block text-[12.5px] font-medium text-[var(--foreground)] underline">
          Back to courses
        </Link>
      </main>
    );
  }

  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
      </main>
    );
  }

  const taken = profile.completedCourseIds.includes(course.id);
  const taking = profile.enrolledCourseIds.includes(course.id);

  const handleAddComment = (body: string, tag: Comment["tag"]) => {
    const c: Comment = {
      id: `c_${Date.now()}`,
      courseId: course.id,
      authorName: profile.name,
      authorInitials: profile.initials,
      body,
      tag,
      upvotes: 0,
      createdAt: new Date().toISOString(),
    };
    addComment(c);
    refresh(course.id);
    setShowAddComment(false);
  };

  const handleUpvote = (id: string) => {
    upvoteComment(id);
    refresh(course.id);
  };

  return (
    <main className="mx-auto max-w-4xl px-5 pb-20 pt-6 sm:px-8">
      {/* Back */}
      <Link
        href="/dashboard"
        className="mb-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
      >
        <ArrowLeft size={13} /> All courses
      </Link>

      {/* Header */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[12.5px] font-medium text-[var(--muted)]">{course.code}</p>
          <h1 className="mt-1.5 text-[28px] font-semibold leading-tight tracking-tight text-[var(--foreground)]">
            {course.title}
          </h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-[var(--muted-foreground)]">
            {course.description}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {taken && (
            <span className="rounded-md border border-[var(--foreground)] bg-[var(--foreground)] px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--background)]">
              Completed
            </span>
          )}
          {taking && (
            <span className="rounded-md border border-[var(--accent)] px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--accent)]">
              Enrolled
            </span>
          )}
        </div>
      </header>

      {/* Stat strip */}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Credits" value={`${course.credits}`} />
        <Stat label="Year / term" value={`${cap(course.year)} · ${cap(course.term)}`} />
        <Stat label="Difficulty" value={course.difficulty ? `${"●".repeat(course.difficulty)}${"○".repeat(5 - course.difficulty)}` : "—"} />
        <Stat label="Workload" value={course.workload ? `${course.workload} hr/wk` : "—"} />
      </div>

      {/* Two-column body */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left col: grades + comments */}
        <div className="space-y-6 lg:col-span-2">
          {/* Grade distribution */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-[14px] font-semibold text-[var(--foreground)]">Grade distribution</h2>
              <p className="text-[11px] text-[var(--muted)]">Past students</p>
            </div>
            <GradeChart distribution={course.gradeDistribution} />
          </section>

          {/* Comments */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="text-[14px] font-semibold text-[var(--foreground)]">
                Tips & comments
                <span className="ml-2 text-[11px] font-normal text-[var(--muted)]">{comments.length}</span>
              </h2>
              <button
                type="button"
                onClick={() => setShowAddComment(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--foreground)] px-3 py-1.5 text-[11.5px] font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
              >
                <Plus size={11} /> Add a tip
              </button>
            </div>

            {comments.length === 0 ? (
              <p className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--background)] p-6 text-center text-[12.5px] text-[var(--muted)]">
                No tips yet. Be the first to share advice.
              </p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c) => (
                  <CommentItem key={c.id} comment={c} onUpvote={() => handleUpvote(c.id)} />
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Right col: resources + enrollees + professors */}
        <aside className="space-y-6">
          {/* Resources */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">Resources</h2>
            {course.resources.length === 0 ? (
              <p className="text-[12px] text-[var(--muted)]">Nothing pinned yet.</p>
            ) : (
              <ul className="space-y-2">
                {course.resources.map((r) => (
                  <ResourceRow key={r.url} resource={r} />
                ))}
              </ul>
            )}
          </section>

          {/* Currently enrolled */}
          <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
            <div className="mb-2.5 flex items-baseline justify-between">
              <h2 className="text-[14px] font-semibold text-[var(--foreground)]">Currently enrolled</h2>
              <Users size={13} className="text-[var(--muted)]" />
            </div>
            <p className="text-[24px] font-semibold tabular-nums tracking-tight text-[var(--foreground)]">
              {enrollmentCount}
            </p>
            <p className="text-[11.5px] text-[var(--muted)]">students on Compass</p>
            {enrollees.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {enrollees.slice(0, 6).map((n) => (
                  <span
                    key={n}
                    className="rounded-md bg-[var(--background-secondary)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--muted-foreground)]"
                  >
                    {n.split(" ")[0]}
                  </span>
                ))}
                {enrollees.length > 6 && (
                  <span className="text-[10.5px] text-[var(--muted)]">+{enrollees.length - 6} more</span>
                )}
              </div>
            )}
          </section>

          {/* Professors */}
          {course.professors && course.professors.length > 0 && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">Common instructors</h2>
              <ul className="space-y-1.5">
                {course.professors.map((p) => (
                  <li key={p} className="text-[12.5px] text-[var(--foreground)]">
                    {p}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Prereqs */}
          {course.prereqs && course.prereqs.length > 0 && (
            <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5">
              <h2 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">Prerequisites</h2>
              <div className="flex flex-wrap gap-1.5">
                {course.prereqs.map((pid) => {
                  const pc = COURSE_BY_ID[pid];
                  return (
                    <Link
                      key={pid}
                      href={`/courses/${pid}`}
                      className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 font-mono text-[11px] font-medium text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]"
                    >
                      {pc?.code ?? pid}
                    </Link>
                  );
                })}
              </div>
            </section>
          )}
        </aside>
      </div>

      {/* Add comment modal */}
      {showAddComment && (
        <AddCommentModal
          courseCode={course.code}
          onClose={() => setShowAddComment(false)}
          onSubmit={handleAddComment}
        />
      )}
    </main>
  );
}

/* ─── Stat ───────────────────────────────────────── */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3.5 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">{label}</p>
      <p className="mt-1 text-[13.5px] font-medium text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function cap(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}

/* ─── Grade chart ────────────────────────────────── */

const GRADE_KEYS: Array<keyof GradeDistribution> = ["A", "AMinus", "BPlus", "B", "BMinus", "CPlus", "C", "D", "F"];
const GRADE_LABELS: Record<keyof GradeDistribution, string> = {
  A: "A",
  AMinus: "A−",
  BPlus: "B+",
  B: "B",
  BMinus: "B−",
  CPlus: "C+",
  C: "C",
  D: "D",
  F: "F",
};

function GradeChart({ distribution }: { distribution: GradeDistribution }) {
  const max = Math.max(...GRADE_KEYS.map((k) => distribution[k]));
  return (
    <div className="space-y-2">
      {GRADE_KEYS.map((k) => {
        const v = distribution[k];
        const pct = max > 0 ? (v / max) * 100 : 0;
        return (
          <div key={k} className="flex items-center gap-3">
            <span className="w-7 font-mono text-[11.5px] font-medium tabular-nums text-[var(--muted)]">{GRADE_LABELS[k]}</span>
            <div className="relative h-5 flex-1 overflow-hidden rounded-md bg-[var(--background-secondary)]">
              <motion.div
                className="h-full bg-[var(--foreground)]"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              />
            </div>
            <span className="w-9 text-right text-[11.5px] font-medium tabular-nums text-[var(--muted)]">{v}%</span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Comment ────────────────────────────────────── */

const TAG_META: Record<NonNullable<Comment["tag"]>, { label: string; icon: typeof Flag }> = {
  tip: { label: "Tip", icon: BookOpen },
  warning: { label: "Watch out", icon: Flag },
  resource: { label: "Resource", icon: ExternalLink },
  professor: { label: "Professor", icon: Briefcase },
  exam: { label: "Exam", icon: Flag },
};

function CommentItem({ comment, onUpvote }: { comment: Comment; onUpvote: () => void }) {
  const meta = comment.tag ? TAG_META[comment.tag] : null;
  const Icon = meta?.icon;
  return (
    <li className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--background)] p-3.5">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--foreground)] text-[10.5px] font-semibold text-[var(--background)]">
        {comment.authorInitials}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <p className="text-[12.5px] font-semibold text-[var(--foreground)]">{comment.authorName}</p>
          {meta && Icon && (
            <span className="inline-flex items-center gap-1 rounded-md bg-[var(--background-secondary)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--muted-foreground)]">
              <Icon size={9} />
              {meta.label}
            </span>
          )}
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--foreground)]">{comment.body}</p>
      </div>
      <button
        type="button"
        onClick={onUpvote}
        className="flex shrink-0 flex-col items-center gap-0.5 rounded-md px-2 py-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
      >
        <ArrowUp size={13} />
        <span className="text-[11px] font-medium tabular-nums">{comment.upvotes}</span>
      </button>
    </li>
  );
}

/* ─── Resource ────────────────────────────────────── */

function ResourceRow({ resource }: { resource: CourseResource }) {
  const Icon =
    resource.kind === "textbook" ? BookOpen :
    resource.kind === "github" ? Github :
    resource.kind === "video" ? Video :
    ExternalLink;
  return (
    <li>
      <a
        href={resource.url}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-start gap-2 rounded-lg px-2 py-1.5 text-[12.5px] text-[var(--foreground)] transition-colors hover:bg-[var(--background-secondary)]"
      >
        <Icon size={13} className="mt-0.5 shrink-0 text-[var(--muted)] group-hover:text-[var(--foreground)]" />
        <span className="flex-1 leading-snug">{resource.label}</span>
        <ExternalLink size={11} className="mt-0.5 shrink-0 text-[var(--muted)] opacity-0 group-hover:opacity-100" />
      </a>
    </li>
  );
}

/* ─── Add comment modal ──────────────────────────── */

function AddCommentModal({
  courseCode,
  onClose,
  onSubmit,
}: {
  courseCode: string;
  onClose: () => void;
  onSubmit: (body: string, tag: Comment["tag"]) => void;
}) {
  const [body, setBody] = useState("");
  const [tag, setTag] = useState<NonNullable<Comment["tag"]>>("tip");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3.5">
          <div>
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--muted)]">Add a tip</p>
            <p className="text-[13.5px] font-semibold text-[var(--foreground)]">{courseCode}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--muted)] transition-colors hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)]"
          >
            <X size={15} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--muted)]">Type</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(TAG_META) as Array<NonNullable<Comment["tag"]>>).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTag(t)}
                  className={`rounded-md border px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                    tag === t
                      ? "border-[var(--foreground)] bg-[var(--foreground)] text-[var(--background)]"
                      : "border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {TAG_META[t].label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-wider text-[var(--muted)]">Your tip</p>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Share something useful — what to study, who to email, what to skip…"
              rows={5}
              autoFocus
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-3.5 py-3 text-[13px] leading-relaxed outline-none transition-colors focus:border-[var(--foreground)]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-5 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3 py-2 text-[12.5px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              if (body.trim().length < 5) return;
              onSubmit(body.trim(), tag);
            }}
            disabled={body.trim().length < 5}
            className="rounded-lg bg-[var(--foreground)] px-3.5 py-2 text-[12.5px] font-semibold text-[var(--background)] transition-opacity hover:opacity-90 disabled:opacity-30"
          >
            Post tip
          </button>
        </div>
      </motion.div>
    </div>
  );
}
