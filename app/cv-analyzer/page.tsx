"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Target, CheckCircle2, AlertCircle, XCircle, ChevronDown, RefreshCcw, ArrowRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/AppShell";

export default function CVAnalyzerPage() {
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [jobAnalyzing, setJobAnalyzing] = useState(false);
  const [jobDescription, setJobDescription] = useState("");
  const [jobAnalysis, setJobAnalysis] = useState<any>(null);
  const [error, setError] = useState("");
  const [showRoleMatcher, setShowRoleMatcher] = useState(false);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/bootstrap");
      const result = await response.json();
      setData(result);
      setLoading(false);
    };
    load();
  }, []);

  const runAnalysis = async () => {
    setError("");
    setAnalyzing(true);
    const response = await fetch("/api/resume-copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Analyze this resume against my target role." }),
    });
    const result = await response.json();
    setAnalyzing(false);
    if (!response.ok) {
      setError(result.error || "Failed to analyze CV");
      return;
    }

    setData((current: any) => ({
      ...current,
      cvUpload: {
        ...current.cvUpload,
        analysis: {
          score: result.scoreBreakdown.score,
          strengths: result.scoreBreakdown.strengths,
          improvements: result.scoreBreakdown.issues,
          missing: result.scoreBreakdown.ats_keywords.missing,
          rewrites: result.suggestions,
          summary: result.reply,
        },
      },
      roadmap: {
        ...current.roadmap,
        cvAnalysis: {
          score: result.scoreBreakdown.score,
          strengths: result.scoreBreakdown.strengths,
          improvements: result.scoreBreakdown.issues,
          missing: result.scoreBreakdown.ats_keywords.missing,
          rewrites: result.suggestions,
          summary: result.reply,
        },
      },
    }));
  };

  const analyzeJob = async () => {
    if (!jobDescription.trim()) return;
    setJobAnalyzing(true);
    setError("");
    const response = await fetch("/api/job-analyzer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobDescription }),
    });
    const result = await response.json();
    setJobAnalyzing(false);
    if (!response.ok) {
      setError(result.error || "Failed to analyze role");
      return;
    }
    setJobAnalysis(result);
  };

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  const cvAnalysis = data?.roadmap?.cvAnalysis || data?.cvUpload?.analysis;
  const score = cvAnalysis?.score || 0;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto animate-fade-up">
        {/* Header */}
        <header className="pt-2 pb-8">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[2rem] font-semibold tracking-tight">CV Analysis</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {data?.cvUpload ? data.cvUpload.fileName : "Upload your CV to get started"}
              </p>
            </div>
            {data?.cvUpload && (
              <button
                onClick={runAnalysis}
                disabled={analyzing}
                className="text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1.5"
              >
                {analyzing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                Re-analyze
              </button>
            )}
          </div>
        </header>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {/* No CV state */}
        {!data?.cvUpload ? (
          <div className="py-16 text-center">
            <FileText size={32} className="mx-auto text-[var(--border-hover)] mb-4" />
            <p className="text-[15px] font-medium text-[var(--foreground)]">No CV uploaded yet</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Complete onboarding to unlock your score and analysis.</p>
            <button onClick={() => router.push("/onboarding")} className="mt-6 btn-primary h-10 px-8">
              Get started
            </button>
          </div>
        ) : (
          <>
            {/* Score header */}
            <div className="flex items-center gap-5 mb-10 px-4 py-5 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
              <div className="relative h-16 w-16 shrink-0">
                <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 100 100">
                  <circle className="text-[var(--background-secondary)]" strokeWidth="8" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                  <circle
                    className="text-[var(--accent)]"
                    strokeWidth="8"
                    strokeDasharray={251}
                    strokeDashoffset={251 - (251 * score) / 100}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="50"
                    cy="50"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-lg font-semibold">{score}</div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-[var(--foreground)]">Profile Strength</p>
                <p className="mt-0.5 text-xs text-[var(--muted)] leading-relaxed line-clamp-2">
                  {cvAnalysis?.summary || "Run a fresh analysis to see what to improve."}
                </p>
              </div>
            </div>

            {/* Strengths */}
            <AnalysisSection
              title="Strengths"
              icon={<CheckCircle2 size={15} className="text-emerald-500" />}
              items={cvAnalysis?.strengths || []}
              emptyText="No strengths data yet"
              itemStyle="text-emerald-700 bg-emerald-50"
            />

            {/* Improvements */}
            <AnalysisSection
              title="Improvements"
              icon={<AlertCircle size={15} className="text-[var(--accent)]" />}
              items={cvAnalysis?.improvements || []}
              emptyText="No improvement suggestions yet"
              itemStyle="text-[var(--accent)] bg-[var(--accent-light)]"
              rewrites={cvAnalysis?.rewrites}
            />

            {/* Missing */}
            <AnalysisSection
              title="Missing"
              icon={<XCircle size={15} className="text-red-500" />}
              items={cvAnalysis?.missing || []}
              emptyText="Nothing missing detected"
              itemStyle="text-red-600 bg-red-50"
            />

            {/* Role Matcher */}
            <div className="mt-10 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <h2 className="text-[15px] font-semibold text-[var(--foreground)]">Role Matcher</h2>
                <div className="flex-1 h-px bg-[var(--border)]" />
                <button
                  onClick={() => setShowRoleMatcher(!showRoleMatcher)}
                  className="text-[11px] font-medium text-[var(--accent)] hover:underline"
                >
                  {showRoleMatcher ? "Hide" : "Compare to a role"}
                </button>
              </div>

              <AnimatePresence>
                {showRoleMatcher && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      placeholder="Paste a job description here..."
                      className="w-full min-h-[120px] rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 mb-3"
                    />
                    <button
                      onClick={analyzeJob}
                      disabled={jobAnalyzing || !jobDescription.trim()}
                      className="btn-primary h-9 px-6 text-[13px] disabled:opacity-40"
                    >
                      {jobAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Check match"}
                    </button>

                    {jobAnalysis && (
                      <div className="mt-6 space-y-4">
                        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--surface)] border border-[var(--border)]">
                          <span className="text-2xl font-semibold">{jobAnalysis.matchScore}%</span>
                          <span className="text-xs font-medium text-[var(--muted)]">match score</span>
                        </div>

                        {jobAnalysis.metRequirements?.length > 0 && (
                          <div className="space-y-1">
                            {jobAnalysis.metRequirements.map((item: string, i: number) => (
                              <div key={i} className="flex items-start gap-3 rounded-xl px-4 py-2.5">
                                <CheckCircle2 size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                                <p className="text-[13px] text-[var(--foreground)]">{item}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {jobAnalysis.gaps?.length > 0 && (
                          <div className="space-y-1">
                            {jobAnalysis.gaps.map((item: string, i: number) => (
                              <div key={i} className="flex items-start gap-3 rounded-xl px-4 py-2.5">
                                <XCircle size={14} className="text-red-500 mt-0.5 shrink-0" />
                                <p className="text-[13px] text-[var(--foreground)]">{item}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {jobAnalysis.actionPlan?.length > 0 && (
                          <div className="space-y-1">
                            {jobAnalysis.actionPlan.map((item: string, i: number) => (
                              <div key={i} className="flex items-start gap-3 rounded-xl px-4 py-2.5">
                                <ArrowRight size={14} className="text-[var(--accent)] mt-0.5 shrink-0" />
                                <p className="text-[13px] text-[var(--foreground)]">{item}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Actions */}
            <div className="mt-8 flex gap-3">
              <button onClick={() => router.push("/onboarding")} className="text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors">
                Upload new CV
              </button>
              <span className="text-[var(--border)]">·</span>
              <button onClick={() => router.push("/dashboard?tab=assistant")} className="text-[12px] font-medium text-[var(--accent)] hover:underline flex items-center gap-1">
                <Sparkles size={11} /> Ask AI for help
              </button>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}

function AnalysisSection({ title, icon, items, emptyText, itemStyle, rewrites }: {
  title: string; icon: React.ReactNode; items: string[]; emptyText: string; itemStyle: string; rewrites?: any[];
}) {
  const [open, setOpen] = useState(true);

  return (
    <section className="mb-6">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 mb-2 group"
      >
        {icon}
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">{title}</h2>
        <span className="text-[11px] font-medium text-[var(--muted)]">{items.length}</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
        <ChevronDown size={14} className={`text-[var(--muted)] transition-transform duration-150 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.12 }}
            className="overflow-hidden"
          >
            {items.length === 0 ? (
              <p className="px-4 py-3 text-xs text-[var(--muted)] italic">{emptyText}</p>
            ) : (
              <div className="space-y-0.5">
                {items.map((item, i) => (
                  <div key={i} className="group rounded-xl px-4 py-3 hover:bg-[var(--surface)] transition-all duration-100">
                    <p className="text-[14px] text-[var(--foreground)]">{item}</p>
                    {rewrites?.[i] && (
                      <p className="mt-1.5 text-xs text-[var(--muted)] leading-relaxed">
                        💡 {rewrites[i].suggested || rewrites[i].reason || rewrites[i].after}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
