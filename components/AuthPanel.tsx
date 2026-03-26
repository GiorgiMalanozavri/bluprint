"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { login, signup } from "@/actions/auth";
import { createBrowserClient } from "@supabase/ssr";

export default function AuthPanel({ initialMode = "signup" }: { initialMode?: "signup" | "login" }) {
  const router = useRouter();
  const [mode, setMode] = useState<"signup" | "login">(initialMode);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = mode === "signup" ? await signup(formData) : await login(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }

      if (mode === "signup") {
        router.push("/onboarding");
        return;
      }

      const onboardingDone = typeof window !== "undefined"
        ? localStorage.getItem("bluprint_onboarding_complete") === "true" || localStorage.getItem("foundry_onboarding_complete") === "true"
        : false;
      router.push(onboardingDone ? "/dashboard" : "/onboarding");
    });
  };

  return (
    <div className="min-h-screen bg-[var(--background)] px-4 pt-[120px]">
      <div className="mx-auto w-full max-w-[420px]">
        <div className="text-center">
          <Link href="/" className="inline-flex text-2xl font-semibold tracking-[-0.03em]">
            <span className="text-[var(--foreground)]">blu</span>
            <span className="text-[var(--accent)]">print</span>
          </Link>
        </div>

        <div className="surface-card mt-8 overflow-hidden">
          <div className="grid grid-cols-2 border-b border-[var(--border)] bg-[var(--surface-secondary)] p-1.5">
            {["signup", "login"].map((tab) => (
              <button
                key={tab}
                onClick={() => {
                  setMode(tab as "signup" | "login");
                  setError("");
                }}
                className={`rounded-xl px-4 py-2 text-sm font-medium app-transition ${
                  mode === tab ? "bg-[var(--surface)] text-[var(--foreground)] shadow-sm" : "text-[var(--muted)]"
                }`}
              >
                {tab === "signup" ? "Sign up" : "Log in"}
              </button>
            ))}
          </div>

          <div className="p-8">
            <h1 className="text-2xl font-semibold tracking-tight">{mode === "signup" ? "Create your account." : "Welcome back."}</h1>
            <p className="mt-3 text-sm text-[var(--muted)]">
              {mode === "signup" ? "Start with one account. Finish onboarding in under two minutes." : "Pick up where you left off."}
            </p>

            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              {mode === "signup" && (
                <div>
                  <label className="mb-2 block text-[13px] font-medium text-[var(--muted-foreground)]">Full name</label>
                  <input
                    name="name"
                    type="text"
                    placeholder="Sara Khan"
                    className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
                  />
                </div>
              )}

              <div>
                <label className="mb-2 block text-[13px] font-medium text-[var(--muted-foreground)]">Email</label>
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="your@university.edu"
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
                />
              </div>

              <div>
                <label className="mb-2 block text-[13px] font-medium text-[var(--muted-foreground)]">Password</label>
                <input
                  name="password"
                  type="password"
                  required
                  minLength={6}
                  placeholder="At least 6 characters"
                  className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
                />
                {mode === "login" && (
                  <div className="mt-2 text-right">
                    <Link href="/sign-in" className="text-xs text-[var(--muted)] hover:text-[var(--accent)]">
                      Forgot password?
                    </Link>
                  </div>
                )}
              </div>

              {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-[var(--danger)]">{error}</p>}

              <button
                type="submit"
                disabled={isPending}
                className="flex h-11 w-full items-center justify-center rounded-xl bg-[var(--accent)] text-sm font-medium text-white app-transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : mode === "signup" ? "Create account" : "Log in"}
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-[var(--border)]" />
              <span className="text-xs text-[var(--muted)]">or</span>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>

            <button
              type="button"
              onClick={async () => {
                const supabase = createBrowserClient(
                  process.env.NEXT_PUBLIC_SUPABASE_URL!,
                  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
                );
                await supabase.auth.signInWithOAuth({
                  provider: "google",
                  options: { redirectTo: `${window.location.origin}/auth/callback` },
                });
              }}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] text-sm font-medium text-[var(--foreground)] app-transition hover:bg-[var(--surface-secondary)]"
            >
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Continue with Google
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-sm text-[var(--muted)]">
          {mode === "signup" ? "Already have an account?" : "Need an account?"}{" "}
          <button onClick={() => setMode(mode === "signup" ? "login" : "signup")} className="text-[var(--accent)] font-medium">
            {mode === "signup" ? "Log in" : "Sign up"}
          </button>
        </p>
      </div>
    </div>
  );
}
