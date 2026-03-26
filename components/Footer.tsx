"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import BrandWordmark from "./BrandWordmark";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const pathname = usePathname();

  if (pathname !== "/" && pathname !== "/pricing") {
    return null;
  }

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--background)]">
      <div className="page-frame flex flex-col gap-4 py-8 sm:flex-row sm:items-center sm:justify-between">
        <BrandWordmark />
        <p className="font-mono text-xs text-[var(--muted)]">&copy; {currentYear} bluprint</p>
      </div>
    </footer>
  );
}
