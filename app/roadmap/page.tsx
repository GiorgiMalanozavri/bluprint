"use client";

import { motion } from "framer-motion";
import { ArrowRight, Compass, Loader2, RefreshCcw } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getProfile, getRoadmap, saveRoadmap } from "@/lib/storage";
import type { GeneratedRoadmap, UserProfile } from "@/lib/types";

export default function RoadmapPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roadmap, setRoadmapState] = useState<GeneratedRoadmap | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const p = getProfile();
    if (!p) {
      router.replace("/onboarding");
      return;
    }
    setProfile(p);
    setRoadmapState(getRoadmap());
  }, [router]);

  const regenerate = async () => {
    if (!profile) return;
    setRegenerating(true);
    setError("");
    try {
      const res = await fetch("/api/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const data = await res.json();
      if (data.roadmap) {
        saveRoadmap(data.roadmap);
        setRoadmapState(data.roadmap);
      } else {
        setError("Could not generate. Try again in a moment.");
      }
    } catch {
      setError("Network blip. Try again.");
    } finally {
      setRegenerating(false);
    }
  };

  if (!profile) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
      </main>
    );
  }

  if (!roadmap) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-16 text-center">
          <Compass size={26} className="mb-4 text-[var(--muted)]" />
          <p className="text-[15px] font-semibold text-[var(--foreground)]">No roadmap yet.</p>
          <p className="mt-1.5 max-w-xs text-[12.5px] text-[var(--muted)]">
            Generate your first personalized plan from your profile.
          </p>
          <button
            type="button"
            onClick={regenerate}
            disabled={regenerating}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[var(--foreground)] px-5 py-2.5 text-[13px] font-semibold text-[var(--background)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {regenerating ? <Loader2 size={13} className="animate-spin" /> : <Compass size={13} />}
            {regenerating ? "Generating…" : "Generate roadmap"}
          </button>
          {error && <p className="mt-3 text-[11.5px] text-red-500">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-5 pb-16 pt-8 sm:px-8">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
            Your roadmap
          </p>
          <h1 className="mt-1.5 text-[28px] font-semibold tracking-tight text-[var(--foreground)]">
            Hey {profile.name.split(" ")[0]}.
          </h1>
        </div>
        <button
          type="button"
          onClick={regenerate}
          disabled={regenerating}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[12px] font-medium text-[var(--muted)] transition-colors hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)] disabled:opacity-50"
        >
          {regenerating ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
          Regenerate
        </button>
      </div>

      {/* Summary card */}
      {roadmap.summary && (
        <div className="mb-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">Overview</p>
          <p className="mt-2 text-[14.5px] leading-relaxed text-[var(--foreground)]">{roadmap.summary}</p>
        </div>
      )}

      {/* Semesters */}
      <div className="space-y-4">
        {roadmap.semesters.map((s, idx) => (
          <motion.section
            key={`${s.term}-${idx}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: idx * 0.04 }}
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                {s.term} · {s.year}
              </p>
              <p className="text-[11px] font-medium text-[var(--muted)]">
                Semester {idx + 1} of {roadmap.semesters.length}
              </p>
            </div>
            <h2 className="mt-2 text-[18px] font-semibold leading-snug tracking-tight text-[var(--foreground)]">
              {s.focus}
            </h2>
            {s.whyItMatters && (
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--muted-foreground)]">
                {s.whyItMatters}
              </p>
            )}

            {s.recommendedCourses.length > 0 && (
              <div className="mt-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Recommended courses
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {s.recommendedCourses.map((c) => {
                    const id = c.replace(/\s+/g, "-");
                    return (
                      <Link
                        key={c}
                        href={`/courses/${id}`}
                        className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 font-mono text-[11.5px] font-medium text-[var(--foreground)] transition-colors hover:border-[var(--foreground)]"
                      >
                        {c}
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {s.milestones.length > 0 && (
              <div className="mt-4">
                <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Milestones
                </p>
                <ul className="mt-2 space-y-2">
                  {s.milestones.map((m, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-[var(--foreground)]">
                      <ArrowRight size={13} className="mt-1 shrink-0 text-[var(--muted)]" />
                      <span>{m}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </motion.section>
        ))}
      </div>

      <p className="mt-8 text-center text-[10.5px] text-[var(--muted)]">
        Generated {new Date(roadmap.generatedAt).toLocaleDateString()}. AI can make mistakes — sanity check before acting.
      </p>
    </main>
  );
}
