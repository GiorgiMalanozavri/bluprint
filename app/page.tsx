import Link from "next/link";
import { ArrowRight, FileText, Map, Calendar, Sparkles, CheckCircle2, BarChart3, Clock } from "lucide-react";

export default function HomePage() {
  return (
    <div className="bg-[var(--background)] pt-14 text-[var(--foreground)]">
      {/* Hero */}
      <section className="flex min-h-[calc(100vh-56px)] flex-col items-center justify-center px-6 text-center">
        <div className="animate-fade-up max-w-2xl">
          <h1 className="text-[2.75rem] font-semibold leading-[1.08] tracking-tight text-balance sm:text-[3.5rem] md:text-[4.25rem]">
            Your career,<br />planned clearly.
          </h1>
          <p className="mt-6 mx-auto max-w-md text-lg leading-relaxed text-[var(--muted)]">
            bluprint helps international students plan internships, CVs, and applications, semester by semester.
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

      {/* App preview mockup */}
      <section className="page-frame pb-20">
        <div className="mx-auto max-w-4xl">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] overflow-hidden">
            {/* Fake browser bar */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-secondary)]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--border-hover)]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--border-hover)]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[var(--border-hover)]" />
              </div>
              <div className="flex-1 mx-8 h-6 rounded-lg bg-[var(--background)] flex items-center justify-center">
                <span className="text-[10px] text-[var(--muted)] font-medium">bluprint.app/dashboard</span>
              </div>
            </div>
            {/* Dashboard mockup content */}
            <div className="p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-8 w-8 rounded-full bg-[var(--accent)] flex items-center justify-center">
                  <span className="text-white text-xs font-bold">J</span>
                </div>
                <div>
                  <p className="text-sm font-semibold">Good morning, Jordan.</p>
                  <p className="text-[11px] text-[var(--muted)]">3 tasks due this week</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
                  <Calendar size={16} className="text-[var(--accent)] mb-2" />
                  <p className="text-xs font-semibold">Planner</p>
                  <p className="text-[10px] text-[var(--muted)]">Weekly schedule</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
                  <BarChart3 size={16} className="text-[var(--accent)] mb-2" />
                  <p className="text-xs font-semibold">CV Score</p>
                  <p className="text-[10px] text-[var(--muted)]">78 / 100</p>
                </div>
                <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] p-4">
                  <Sparkles size={16} className="text-[var(--accent)] mb-2" />
                  <p className="text-xs font-semibold">AI Assist</p>
                  <p className="text-[10px] text-[var(--muted)]">Ask anything</p>
                </div>
              </div>
              <div className="space-y-2">
                {["Apply to 3 summer internships", "Update CV with new project", "Prepare for mock interview"].map((task, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg px-3 py-2.5 bg-[var(--background)]/60">
                    <div className={`w-4 h-4 rounded border-[1.5px] flex items-center justify-center shrink-0 ${i === 0 ? "bg-[var(--accent)] border-[var(--accent)]" : "border-[var(--border-hover)]"}`}>
                      {i === 0 && <CheckCircle2 size={10} className="text-white" />}
                    </div>
                    <span className={`text-xs font-medium ${i === 0 ? "line-through text-[var(--muted)]" : ""}`}>{task}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="page-frame pb-20">
        <div className="mx-auto max-w-3xl text-center mb-12">
          <h2 className="text-[2rem] font-semibold tracking-tight">How it works</h2>
          <p className="mt-3 text-[var(--muted)]">Three steps to your personalized career plan.</p>
        </div>

        <div className="mx-auto max-w-4xl grid gap-10 md:grid-cols-3">
          {/* Step 1 */}
          <div className="text-center">
            <div className="mx-auto mb-6 w-full max-w-[240px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] overflow-hidden">
              <div className="p-6 flex flex-col items-center">
                <div className="w-16 h-16 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center mb-4">
                  <FileText size={28} className="text-[var(--accent)]" />
                </div>
                <div className="w-full space-y-2">
                  <div className="h-2 rounded-full bg-[var(--background-secondary)] w-full" />
                  <div className="h-2 rounded-full bg-[var(--background-secondary)] w-3/4 mx-auto" />
                  <div className="h-2 rounded-full bg-[var(--accent-mid)] w-1/2 mx-auto" />
                </div>
                <div className="mt-4 flex items-center gap-2 text-[10px] text-emerald-600 font-medium">
                  <CheckCircle2 size={12} /> CV parsed
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-medium text-[var(--accent)]">01</span>
            <h3 className="mt-1 text-[15px] font-semibold">Upload your CV</h3>
            <p className="mt-1.5 text-sm text-[var(--muted)] leading-relaxed">bluprint extracts your experience and asks you to confirm the details.</p>
          </div>

          {/* Step 2 */}
          <div className="text-center">
            <div className="mx-auto mb-6 w-full max-w-[240px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Map size={16} className="text-[var(--accent)]" />
                  <span className="text-xs font-semibold">Roadmap</span>
                </div>
                <div className="space-y-3">
                  {["Semester 1", "Semester 2", "Semester 3"].map((sem, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className={`w-2 h-2 rounded-full shrink-0 ${i === 0 ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`} />
                      <span className="text-[11px] font-medium">{sem}</span>
                      {i === 0 && <span className="ml-auto rounded-full bg-[var(--accent)] px-1.5 py-[1px] text-[8px] font-bold text-white">NOW</span>}
                    </div>
                  ))}
                </div>
                <div className="mt-4 h-1.5 rounded-full bg-[var(--background-secondary)]">
                  <div className="h-full rounded-full bg-[var(--accent)] w-1/3" />
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-medium text-[var(--accent)]">02</span>
            <h3 className="mt-1 text-[15px] font-semibold">Get your roadmap</h3>
            <p className="mt-1.5 text-sm text-[var(--muted)] leading-relaxed">See what to do now, what can wait, and why each step matters.</p>
          </div>

          {/* Step 3 */}
          <div className="text-center">
            <div className="mx-auto mb-6 w-full max-w-[240px] rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] overflow-hidden">
              <div className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Clock size={16} className="text-[var(--accent)]" />
                  <span className="text-xs font-semibold">This Month</span>
                  <span className="ml-auto text-[10px] text-[var(--muted)]">2/4 done</span>
                </div>
                <div className="space-y-2">
                  {[
                    { label: "Apply to internships", done: true },
                    { label: "Update LinkedIn", done: true },
                    { label: "Mock interview prep", done: false },
                    { label: "Network with alumni", done: false },
                  ].map((t, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className={`w-3.5 h-3.5 rounded border-[1.5px] flex items-center justify-center shrink-0 ${t.done ? "bg-[var(--accent)] border-[var(--accent)]" : "border-[var(--border-hover)]"}`}>
                        {t.done && <CheckCircle2 size={8} className="text-white" />}
                      </div>
                      <span className={`text-[11px] font-medium ${t.done ? "line-through text-[var(--muted)]" : ""}`}>{t.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <span className="text-xs font-mono font-medium text-[var(--accent)]">03</span>
            <h3 className="mt-1 text-[15px] font-semibold">Track your progress</h3>
            <p className="mt-1.5 text-sm text-[var(--muted)] leading-relaxed">Your dashboard turns the big plan into a monthly action list.</p>
          </div>
        </div>
      </section>

      {/* Features row */}
      <section className="page-frame pb-32">
        <div className="mx-auto max-w-4xl grid gap-4 md:grid-cols-2">
          {/* AI sidebar feature */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-[var(--accent)] flex items-center justify-center">
                <Sparkles size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">AI assistant on every page</h3>
                <p className="text-[11px] text-[var(--muted)]">Ask questions, get career advice, add events</p>
              </div>
            </div>
            <div className="rounded-xl bg-[var(--background)] border border-[var(--border)] p-4 space-y-3">
              <div className="flex gap-2.5 justify-end">
                <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-xs max-w-[180px]">
                  Help me prepare for my Goldman Sachs interview
                </div>
              </div>
              <div className="flex gap-2.5">
                <div className="h-6 w-6 rounded-full bg-[var(--accent)] flex items-center justify-center shrink-0">
                  <Sparkles size={10} className="text-white" />
                </div>
                <div className="rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-xs text-[var(--muted)] max-w-[200px]">
                  Here are the top 5 behavioral questions Goldman asks...
                </div>
              </div>
            </div>
          </div>

          {/* CV analyzer feature */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-7 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-9 w-9 rounded-xl bg-emerald-500 flex items-center justify-center">
                <BarChart3 size={16} className="text-white" />
              </div>
              <div>
                <h3 className="text-[15px] font-semibold">Smart CV analysis</h3>
                <p className="text-[11px] text-[var(--muted)]">Get a recruiter's perspective on your resume</p>
              </div>
            </div>
            <div className="rounded-xl bg-[var(--background)] border border-[var(--border)] p-4">
              <div className="flex items-center gap-4 mb-3">
                <div className="relative h-14 w-14 shrink-0">
                  <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 100 100">
                    <circle className="text-[var(--background-secondary)]" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                    <circle className="text-emerald-500" strokeWidth="8" strokeDasharray={251} strokeDashoffset={251 - (251 * 78) / 100} strokeLinecap="round" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold">78</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-500 uppercase">Strong</p>
                  <p className="text-[11px] text-[var(--muted)]">Your CV is competitive for most roles</p>
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[11px]">
                  <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                  <span className="text-[var(--muted)]">Clear quantified impact</span>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                  <span className="text-[var(--muted)]">Strong action verbs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
