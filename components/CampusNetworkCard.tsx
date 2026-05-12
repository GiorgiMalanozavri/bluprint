"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

const AVATAR_PLACEHOLDERS = [
  "from-sky-200 to-blue-300",
  "from-violet-200 to-indigo-300",
  "from-amber-200 to-orange-300",
  "from-emerald-200 to-teal-300",
] as const;

function abbreviateCampusLogo(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("case western")) return "CWRU";
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "CWRU";
  if (parts.length === 1) return parts[0].replace(/[^a-zA-Z]/g, "").slice(0, 4).toUpperCase() || "CWRU";
  return parts
    .slice(0, 4)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export type CampusNetworkCardProps = {
  universityName?: string;
  logoText?: string;
  extraPeerCount?: number;
  exploreHref?: string;
  ctaLabel?: string;
  /** Nested in a parent panel — no outer card chrome */
  compact?: boolean;
};

export default function CampusNetworkCard({
  universityName = "Case Western Reserve University",
  logoText,
  extraPeerCount = 124,
  exploreHref = "/planner",
  ctaLabel = "Explore Campus Network",
  compact = false,
}: CampusNetworkCardProps) {
  const mark = logoText ?? abbreviateCampusLogo(universityName);

  const shell = compact
    ? "rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4"
    : "rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] sm:p-5";

  return (
    <div className={shell}>
      <div className={`flex flex-col gap-4 ${compact ? "" : "sm:flex-row sm:items-center sm:justify-between sm:gap-6"}`}>
        <div className={`flex min-w-0 flex-1 items-start gap-3 ${compact ? "flex-col sm:flex-row sm:items-center" : "gap-3.5 sm:items-center sm:gap-4"}`}>
          <div
            className={`flex shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--background-secondary)] to-[var(--accent-light)] ring-1 ring-[var(--border)] ${compact ? "h-11 w-11" : "h-[52px] w-[52px]"}`}
            aria-hidden
          >
            <span className={`max-w-[3.25rem] text-center font-semibold leading-tight tracking-tight text-[var(--foreground)] ${compact ? "text-[10px]" : "text-[10px] sm:text-[11px]"}`}>
              {mark}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className={`font-semibold leading-snug tracking-tight text-[var(--foreground)] ${compact ? "text-[13px]" : "text-[15px]"}`}>
              {universityName}
            </p>
            <div className={`flex flex-wrap items-center gap-x-3 gap-y-2 ${compact ? "mt-2" : "mt-2.5"}`}>
              <div className="flex items-center" role="presentation">
                {AVATAR_PLACEHOLDERS.map((gradient, i) => (
                  <div
                    key={i}
                    className={`relative shrink-0 rounded-full border-2 border-white bg-gradient-to-br ${gradient} shadow-sm dark:border-[var(--surface)] ${compact ? "h-7 w-7" : "h-8 w-8"}`}
                    style={{ marginLeft: i === 0 ? 0 : -10, zIndex: AVATAR_PLACEHOLDERS.length - i }}
                    aria-hidden
                  />
                ))}
              </div>
              <p className={`leading-snug text-[var(--muted)] ${compact ? "text-[11px]" : "text-[12px]"}`}>
                <span className="font-medium text-[var(--muted-foreground)]">+{extraPeerCount}</span> other students from
                your campus
              </p>
            </div>
          </div>
        </div>

        <div className={`flex w-full shrink-0 ${compact ? "" : "sm:w-auto sm:justify-end"}`}>
          <Link
            href={exploreHref}
            className={`group inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 font-medium text-[var(--foreground)] transition-all hover:border-[var(--accent)]/25 hover:bg-[var(--accent-light)]/50 active:scale-[0.99] ${compact ? "text-[12px]" : "text-[13px] sm:inline-flex sm:w-auto sm:min-w-[11rem]"}`}
          >
            {ctaLabel}
            <ArrowRight
              size={16}
              strokeWidth={2}
              className="text-[var(--muted)] transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-[var(--accent)]"
              aria-hidden
            />
          </Link>
        </div>
      </div>
    </div>
  );
}
