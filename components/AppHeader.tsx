"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Compass } from "lucide-react";
import { getProfile } from "@/lib/storage";

const NAV = [
  { href: "/dashboard", label: "Courses" },
  { href: "/roadmap", label: "Roadmap" },
];

export default function AppHeader() {
  const pathname = usePathname();
  const [initials, setInitials] = useState<string>("");

  useEffect(() => {
    const p = getProfile();
    setInitials(p?.initials ?? "");
  }, [pathname]);

  // Hide on onboarding + landing
  if (pathname === "/" || pathname.startsWith("/onboarding")) return null;

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:px-8">
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--foreground)] text-[var(--background)]">
            <Compass size={15} strokeWidth={2.5} />
          </div>
          <span className="text-[14.5px] font-semibold tracking-tight text-[var(--foreground)]">
            Compass
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-[var(--background-secondary)] text-[var(--foreground)]"
                    : "text-[var(--muted)] hover:bg-[var(--background-secondary)] hover:text-[var(--foreground)]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {initials && (
            <Link
              href="/onboarding?redo=1"
              title="Edit profile"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
            >
              {initials}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
