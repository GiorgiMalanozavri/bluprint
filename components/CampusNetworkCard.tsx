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
};

export default function CampusNetworkCard({
  universityName = "Case Western Reserve University",
  logoText,
  extraPeerCount = 124,
  exploreHref = "/planner",
  ctaLabel = "Explore Campus Network",
}: CampusNetworkCardProps) {
  const mark = logoText ?? abbreviateCampusLogo(universityName);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)] sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="flex min-w-0 flex-1 items-start gap-3.5 sm:items-center sm:gap-4">
          <div
            className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--background-secondary)] to-[var(--accent-light)] ring-1 ring-[var(--border)]"
            aria-hidden
          >
            <span className="max-w-[3.25rem] text-center text-[10px] font-semibold leading-tight tracking-tight text-[var(--foreground)] sm:text-[11px]">
              {mark}
            </span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-snug tracking-tight text-[var(--foreground)]">
              {universityName}
            </p>
            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <div className="flex items-center" role="presentation">
                {AVATAR_PLACEHOLDERS.map((gradient, i) => (
                  <div
                    key={i}
                    className={`relative h-8 w-8 shrink-0 rounded-full border-2 border-white bg-gradient-to-br ${gradient} shadow-sm dark:border-[var(--surface)]`}
                    style={{ marginLeft: i === 0 ? 0 : -10, zIndex: AVATAR_PLACEHOLDERS.length - i }}
                    aria-hidden
                  />
                ))}
              </div>
              <p className="text-[12px] leading-snug text-[var(--muted)]">
                <span className="font-medium text-[var(--muted-foreground)]">+{extraPeerCount}</span> other students from
                your campus
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full shrink-0 sm:w-auto sm:justify-end">
          <Link
            href={exploreHref}
            className="group inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-[var(--border)] bg-transparent px-4 py-2.5 text-[13px] font-medium text-[var(--foreground)] transition-all hover:border-[var(--border-hover)] hover:bg-[var(--surface-secondary)] active:scale-[0.99] sm:inline-flex sm:w-auto sm:min-w-[11rem]"
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
