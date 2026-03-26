"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bot, Calendar, ClipboardList, FileText, LayoutDashboard, Map } from "lucide-react";

const navItems = [
  { href: "/dashboard",               label: "Overview",   icon: LayoutDashboard, tab: "overview" },
  { href: "/planner",                 label: "Planner",    icon: ClipboardList },
  { href: "/dashboard?tab=roadmap",   label: "Roadmap",    icon: Map,       tab: "roadmap"   },
  { href: "/dashboard?tab=month",     label: "This Month", icon: Calendar,  tab: "month"     },
  { href: "/cv-analyzer",             label: "CV",         icon: FileText },
  { href: "/dashboard?tab=assistant", label: "AI",         icon: Bot,       tab: "assistant" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";

  const isActive = (item: (typeof navItems)[0]) => {
    const isDash = item.href.startsWith("/dashboard");
    if (isDash) return pathname === "/dashboard" && item.tab === currentTab;
    return pathname === item.href.split("?")[0];
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Main content — offset for top nav only (56px) */}
      <main className="pt-[72px] pb-8">
        <div className="page-frame">
          {children}
        </div>
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/95 backdrop-blur-xl sm:hidden">
        <div className="grid grid-cols-6 gap-0.5 px-2 py-2">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-lg py-1.5 text-[9px] font-medium transition-colors duration-100 ${
                  active ? "text-[var(--accent)]" : "text-[var(--muted)]"
                }`}
              >
                <item.icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
