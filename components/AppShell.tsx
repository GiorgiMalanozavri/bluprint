"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { CalendarDays, LayoutDashboard, Map, Settings } from "lucide-react";

const navItems = [
  { href: "/dashboard",               label: "Overview",   icon: LayoutDashboard, tab: "overview" },
  { href: "/planner",                 label: "Planner",    icon: CalendarDays },
  { href: "/dashboard?tab=roadmap",   label: "Roadmap",    icon: Map,       tab: "roadmap"   },
  { href: "/settings",                label: "Settings",   icon: Settings },
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
        <div className="grid grid-cols-4 gap-1 px-3 py-2">
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center gap-1 rounded-xl py-2 text-[11px] font-medium transition-colors duration-100 ${
                  active ? "text-[var(--accent)] bg-[var(--accent-light)]" : "text-[var(--muted)]"
                }`}
              >
                <item.icon size={20} />
                {item.label}
              </a>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
