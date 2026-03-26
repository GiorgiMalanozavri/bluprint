import Link from "next/link";
import { ArrowRight } from "lucide-react";

export default function HomePage() {
  return (
    <div className="bg-[var(--background)] pt-14 text-[var(--foreground)]">
      {/* Hero — centered, minimal, Claude-style */}
      <section className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center px-6 text-center">
        <div className="animate-fade-up max-w-2xl">
          <h1 className="text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-balance sm:text-[3.5rem] md:text-[4.25rem]">
            Your career,<br />planned clearly.
          </h1>
          <p className="mt-6 mx-auto max-w-md text-lg leading-relaxed text-[var(--muted)]">
            bluprint helps international students plan internships, CVs, and applications — semester by semester.
          </p>
          <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/sign-up" className="btn-primary h-12 px-8 text-[15px]">
              Get started free <ArrowRight size={16} />
            </Link>
            <Link href="/sign-in" className="btn-ghost h-12 px-6 text-[15px]">
              Log in
            </Link>
          </div>
          <p className="mt-6 text-sm text-[var(--muted)]">Free to start &middot; No credit card</p>
        </div>
      </section>

      {/* Single feature strip */}
      <section id="how-it-works" className="page-frame pb-32">
        <div className="mx-auto max-w-3xl">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--border)]">
            {[
              { step: "01", title: "Upload your CV or answer a few questions", desc: "bluprint extracts the signal, then asks you to confirm." },
              { step: "02", title: "Get a semester-by-semester roadmap", desc: "See what to do now, what can wait, and why each step matters." },
              { step: "03", title: "Come back every week", desc: "Your dashboard turns the big plan into a monthly action list." },
            ].map((s) => (
              <div key={s.step} className="flex gap-5 bg-[var(--surface)] p-7">
                <span className="text-sm font-mono font-medium text-[var(--muted)] pt-0.5">{s.step}</span>
                <div>
                  <h3 className="text-[15px] font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-[var(--muted)] leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

    </div>
  );
}
