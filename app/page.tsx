"use client";

import { ArrowRight, Compass } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getProfile } from "@/lib/storage";

export default function Landing() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const p = getProfile();
    if (p) {
      router.replace("/dashboard");
    } else {
      setChecked(true);
    }
  }, [router]);

  if (!checked) {
    return <div className="min-h-screen bg-[var(--background)]" />;
  }

  return (
    <main className="min-h-screen bg-[var(--background)]">
      <div className="mx-auto flex max-w-2xl flex-col items-center px-5 pb-16 pt-24 text-center sm:px-8 sm:pt-32">
        <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--foreground)] text-[var(--background)]">
          <Compass size={22} strokeWidth={2.5} />
        </div>

        <h1 className="text-[40px] font-semibold leading-[1.05] tracking-tight text-[var(--foreground)] sm:text-[52px]">
          Course planning,<br />done right.
        </h1>

        <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[var(--muted-foreground)]">
          Compass is the course companion for CWRU mechanical & aerospace engineering students.
          Real grade distributions, peer tips, and a roadmap built for you.
        </p>

        <Link
          href="/onboarding"
          className="mt-10 inline-flex items-center gap-2 rounded-xl bg-[var(--foreground)] px-6 py-3 text-[14px] font-semibold text-[var(--background)] transition-opacity hover:opacity-90"
        >
          Get started <ArrowRight size={14} />
        </Link>

        <div className="mt-16 grid w-full max-w-xl grid-cols-1 gap-3 text-left sm:grid-cols-3">
          <Feature title="Real grades" body="See past distributions on every MAE course." />
          <Feature title="Peer tips" body="What to study, who to email, what to skip." />
          <Feature title="Your roadmap" body="A semester plan tailored to your goals." />
        </div>
      </div>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="text-[13px] font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]">{body}</p>
    </div>
  );
}
