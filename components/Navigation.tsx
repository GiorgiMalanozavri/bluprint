"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";
import { Bell, ChevronDown, Loader2, LogOut, Moon, Settings, Sun, User as UserIcon } from "lucide-react";
import { signout } from "@/actions/auth";
import { motion, AnimatePresence } from "framer-motion";
import BrandWordmark from "./BrandWordmark";
import { useTheme } from "@/lib/theme";

const appNavItems = [
  { href: "/dashboard",               label: "Overview",   tab: "overview" },
  { href: "/planner",                 label: "Planner" },
  { href: "/dashboard?tab=roadmap",   label: "Roadmap",    tab: "roadmap"   },
  { href: "/dashboard?tab=month",     label: "This Month", tab: "month"     },
  { href: "/cv-analyzer",             label: "CV" },
  { href: "/dashboard?tab=assistant", label: "AI",         tab: "assistant" },
];

export default function Navigation({ initialUser }: { initialUser?: User | null }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [user, setUser] = useState<User | null>(initialUser ?? null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notiOpen, setNotiOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const { theme, setTheme, resolved } = useTheme();
  const dropRef = useRef<HTMLDivElement>(null);
  const notiRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setUser(initialUser ?? null); }, [initialUser]);

  useEffect(() => {
    const supabase = createClient();
    const check = async () => { const { data: { user: u } } = await supabase.auth.getUser(); setUser(u); };
    check();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") router.refresh();
    });
    return () => subscription.unsubscribe();
  }, [router, pathname]);

  useEffect(() => {
    const fn = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setDropdownOpen(false);
      if (notiRef.current && !notiRef.current.contains(e.target as Node)) setNotiOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const handleSignOut = async () => {
    setDropdownOpen(false);
    setLoggingOut(true);
    await new Promise((r) => setTimeout(r, 200));
    setUser(null);
    await signout();
    setLoggingOut(false);
  };

  if (pathname.startsWith("/onboarding")) return null;

  const isApp  = pathname.startsWith("/dashboard") || pathname.startsWith("/planner") || pathname.startsWith("/cv-analyzer") || pathname.startsWith("/settings");
  const isAuth = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");

  const currentTab = searchParams.get("tab") || "overview";

  const isNavActive = (item: (typeof appNavItems)[0]) => {
    const isDash = item.href.startsWith("/dashboard");
    if (isDash) return pathname === "/dashboard" && item.tab === currentTab;
    return pathname === item.href.split("?")[0];
  };

  const marketingLinks = [
    { href: "/#how-it-works", label: "Method" },
    { href: "/pricing",        label: "Pricing" },
  ];

  const notifications: { id: string; title: string; body: string }[] = [];

  const initials = (user?.user_metadata?.full_name?.[0] || user?.email?.[0] || "U").toUpperCase();
  const avatarUrl = user?.user_metadata?.avatar_url || user?.user_metadata?.picture || "";

  return (
    <>
      <AnimatePresence>
        {loggingOut && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background)]/90 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
              <p className="text-sm font-medium text-[var(--muted)]">Signing out...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav className="fixed left-0 right-0 top-0 z-50 h-14 border-b border-[var(--border)] bg-[var(--surface)]/90 backdrop-blur-xl">
        <div className="page-frame flex h-full items-center justify-between gap-4">
          <BrandWordmark href={user ? "/dashboard" : "/"} />

          {/* Center: segment switcher for app pages, marketing links for public */}
          {isApp && user ? (
            <div className="hidden sm:flex items-center">
              <div className="segment-switcher !gap-[1px]">
                {appNavItems.map((item) => {
                  const active = isNavActive(item);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`segment-tab ${active ? "segment-tab-active" : ""}`}
                    >
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ) : !isAuth && !isApp ? (
            <div className="hidden items-center gap-8 md:flex">
              {marketingLinks.map((l) => (
                <Link key={l.href} href={l.href}
                  className="text-[13px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors duration-150">
                  {l.label}
                </Link>
              ))}
            </div>
          ) : null}

          {/* Right actions */}
          <div className="flex items-center gap-2">
            {isApp && user && (
              <button
                onClick={() => setTheme(resolved === "dark" ? "light" : "dark")}
                className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-secondary)] transition-all duration-150"
                title={`Theme: ${theme}`}
              >
                {resolved === "dark" ? <Sun size={16} /> : <Moon size={16} />}
              </button>
            )}
            {isApp && user && (
              <div className="relative" ref={notiRef}>
                <button onClick={() => setNotiOpen((o) => !o)}
                  className="grid h-8 w-8 place-items-center rounded-lg text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-secondary)] transition-all duration-150">
                  <Bell size={16} />
                  {notifications.length > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[var(--accent)]" />
                  )}
                </button>
                <AnimatePresence>
                  {notiOpen && (
                    <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-2 w-72 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg">
                      <p className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">Notifications</p>
                      {notifications.length === 0 ? (
                        <div className="px-3 py-6 text-center">
                          <p className="text-xs text-[var(--muted)]">You&apos;re all caught up</p>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          {notifications.map((n) => (
                            <div key={n.id} className="rounded-xl px-3 py-2.5 hover:bg-[var(--surface-secondary)] cursor-pointer transition-colors">
                              <p className="text-sm font-medium text-[var(--foreground)]">{n.title}</p>
                              <p className="mt-0.5 text-xs text-[var(--muted)]">{n.body}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            {user ? (
              <div className="relative" ref={dropRef}>
                <button onClick={() => setDropdownOpen((o) => !o)}
                  className="flex items-center gap-1.5 rounded-lg px-1.5 py-1 hover:bg-[var(--background-secondary)] transition-all duration-150">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="grid h-7 w-7 place-items-center rounded-full bg-[var(--accent-light)] text-xs font-semibold text-[var(--accent)]">{initials}</div>
                  )}
                  <ChevronDown size={12} className="hidden text-[var(--muted)] sm:block" />
                </button>
                <AnimatePresence>
                  {dropdownOpen && (
                    <motion.div initial={{ opacity: 0, y: -4, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -4, scale: 0.97 }} transition={{ duration: 0.12 }}
                      className="absolute right-0 mt-2 w-48 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5 shadow-lg">
                      <Link href="/settings?tab=profile" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors">
                        <UserIcon size={14} className="text-[var(--muted)]" /> Profile
                      </Link>
                      <Link href="/settings?tab=account" onClick={() => setDropdownOpen(false)}
                        className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--surface-secondary)] transition-colors">
                        <Settings size={14} className="text-[var(--muted)]" /> Settings
                      </Link>
                      <div className="my-1 h-px bg-[var(--border)]" />
                      <button onClick={handleSignOut}
                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors">
                        <LogOut size={14} /> Sign out
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              !isAuth && !isApp && (
                <div className="flex items-center gap-3">
                  <Link href="/sign-in" className="text-[13px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">Log in</Link>
                  <Link href="/sign-up" className="btn-primary h-9 px-4 text-[13px]">Get started</Link>
                </div>
              )
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
