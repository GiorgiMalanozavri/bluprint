"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, Target, CheckCircle2, AlertCircle, XCircle, ChevronDown, RefreshCcw, ArrowRight, Sparkles, Upload, Eye, MessageSquare, TrendingUp, Star, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/AppShell";
import { userStorage, setCurrentUserId } from "@/lib/user-storage";

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
  const [activeTab, setActiveTab] = useState<"overview" | "recruiter" | "rewrite">("overview");

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/bootstrap");
      const result = await response.json();

      setCurrentUserId(result.user?.id || "");

      // Fallback to userStorage
      if (!result.roadmap && !result.profile) {
        const localProfile = userStorage.getItem("bluprint_profile_review");
        const localFullRoadmap = userStorage.getItem("bluprint_full_roadmap");

        if (localProfile) {
          result.profile = JSON.parse(localProfile);
        }
        if (localFullRoadmap) {
          const full = JSON.parse(localFullRoadmap);
          result.roadmap = {
            semesters: full.semesters || [],
            monthlyTasks: full.monthlyTasks || [],
            cvAnalysis: {
              score: full.cvScore || 0,
              strengths: full.strengths || [],
              improvements: full.improvements || [],
              missing: full.missing || [],
              summary: full.nudge || "",
            },
          };
        }
      }

      // Check localStorage for saved CV analysis
      const localAnalysis = userStorage.getItem("bluprint_cv_analysis");
      if (localAnalysis && !result.cvUpload?.analysis) {
        const analysis = JSON.parse(localAnalysis);
        if (!result.cvUpload) {
          result.cvUpload = { fileName: userStorage.getItem("bluprint_cv_filename") || "Your CV" };
        }
        result.cvUpload.analysis = analysis;
        if (result.roadmap) {
          result.roadmap.cvAnalysis = analysis;
        }
      }

      // Check if we have CV raw text saved
      const hasCV = userStorage.getItem("bluprint_cv_raw_text");
      if (hasCV && !result.cvUpload) {
        result.cvUpload = { fileName: userStorage.getItem("bluprint_cv_filename") || "Your CV" };
      }

      setData(result);
      setLoading(false);
    };
    load();
  }, []);

  const runAnalysis = async () => {
    setError("");
    setAnalyzing(true);

    // Get resume text from localStorage
    const resumeText = userStorage.getItem("bluprint_cv_raw_text") || "";
    const profile = userStorage.getItem("bluprint_profile_review");

    const response = await fetch("/api/resume-copilot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Analyze this resume against my target role.",
        resumeText,
        userData: profile ? JSON.parse(profile) : null,
      }),
    });
    const result = await response.json();
    setAnalyzing(false);
    if (!response.ok) {
      setError(result.error || "Failed to analyze CV");
      return;
    }

    const analysis = {
      score: result.scoreBreakdown.score,
      strengths: result.scoreBreakdown.strengths,
      improvements: result.scoreBreakdown.issues,
      missing: result.scoreBreakdown.ats_keywords.missing,
      rewrites: result.suggestions,
      summary: result.reply,
    };

    // Save to localStorage
    userStorage.setItem("bluprint_cv_analysis", JSON.stringify(analysis));

    setData((current: any) => ({
      ...current,
      cvUpload: {
        ...current?.cvUpload,
        analysis,
      },
      roadmap: {
        ...current?.roadmap,
        cvAnalysis: analysis,
      },
    }));
  };

  const analyzeJob = async () => {
    if (!jobDescription.trim()) return;
    setJobAnalyzing(true);
    setError("");
    const resumeText = userStorage.getItem("bluprint_cv_raw_text") || "";
    const profile = userStorage.getItem("bluprint_profile_review");
    const response = await fetch("/api/job-analyzer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jobDescription,
        resumeText,
        userData: profile ? JSON.parse(profile) : null,
      }),
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

  const cvAnalysis = data?.cvUpload?.analysis || data?.roadmap?.cvAnalysis;
  const score = cvAnalysis?.score || 0;
  const hasCV = !!userStorage.getItem("bluprint_cv_raw_text") || !!data?.cvUpload;
  const profile = data?.profile;

  const scoreColor = score >= 75 ? "text-emerald-500" : score >= 50 ? "text-amber-500" : "text-red-500";
  const scoreLabel = score >= 75 ? "Strong" : score >= 50 ? "Needs work" : "Weak";
  const scoreBg = score >= 75 ? "from-emerald-500" : score >= 50 ? "from-amber-500" : "from-red-500";

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto animate-fade-up pb-20">
        {/* Header */}
        <header className="pt-2 pb-6">
          <div className="flex items-end justify-between">
            <div>
              <h1 className="text-[2rem] font-semibold tracking-tight">CV Analysis</h1>
              <p className="mt-1 text-sm text-[var(--muted)]">
                {profile?.name ? `${profile.name} · ${profile.dreamRole || "No target role set"}` : "Upload your CV to get started"}
              </p>
            </div>
            {hasCV && (
              <div className="flex items-center gap-3">
                <button
                  onClick={() => router.push("/onboarding")}
                  className="text-[12px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors flex items-center gap-1.5"
                >
                  <Upload size={12} /> New CV
                </button>
                <button
                  onClick={runAnalysis}
                  disabled={analyzing}
                  className="text-[12px] font-medium text-[var(--accent)] hover:text-[var(--accent-hover)] transition-colors flex items-center gap-1.5"
                >
                  {analyzing ? <Loader2 size={12} className="animate-spin" /> : <RefreshCcw size={12} />}
                  {cvAnalysis ? "Re-analyze" : "Analyze"}
                </button>
              </div>
            )}
          </div>
        </header>

        {error && (
          <div className="mb-6 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {/* No CV state */}
        {!hasCV ? (
          <div className="py-16 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--surface)] border border-[var(--border)] flex items-center justify-center mb-6">
              <FileText size={28} className="text-[var(--muted)]" />
            </div>
            <p className="text-[15px] font-medium text-[var(--foreground)]">No CV uploaded yet</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Upload your resume to get AI-powered feedback.</p>
            <button onClick={() => router.push("/onboarding")} className="mt-6 btn-primary h-10 px-8">
              Upload CV
            </button>
          </div>
        ) : !cvAnalysis ? (
          /* CV uploaded but not analyzed */
          <div className="py-12 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-[var(--accent-light)] flex items-center justify-center mb-6">
              <Sparkles size={28} className="text-[var(--accent)]" />
            </div>
            <p className="text-[15px] font-medium text-[var(--foreground)]">Ready to analyze your CV</p>
            <p className="mt-1 text-sm text-[var(--muted)]">Get detailed feedback, a recruiter&apos;s perspective, and rewrite suggestions.</p>
            <button onClick={runAnalysis} disabled={analyzing} className="mt-6 btn-primary h-10 px-8">
              {analyzing ? (
                <span className="flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Analyzing...</span>
              ) : (
                <span className="flex items-center gap-2"><Zap size={14} /> Analyze my CV</span>
              )}
            </button>
          </div>
        ) : (
          <>
            {/* Score card */}
            <div className="relative overflow-hidden rounded-2xl bg-[var(--surface)] border border-[var(--border)] p-6 mb-6">
              <div className="absolute top-0 left-0 right-0 h-1 bg-[var(--border)]">
                <div className={`h-full bg-gradient-to-r ${scoreBg} to-transparent transition-all duration-1000`} style={{ width: `${score}%` }} />
              </div>
              <div className="flex items-center gap-6">
                <div className="relative h-20 w-20 shrink-0">
                  <svg className="h-full w-full rotate-[-90deg]" viewBox="0 0 100 100">
                    <circle className="text-[var(--background-secondary)]" strokeWidth="7" stroke="currentColor" fill="transparent" r="40" cx="50" cy="50" />
                    <circle
                      className={scoreColor}
                      strokeWidth="7"
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
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold">{score}</span>
                    <span className="text-[9px] font-medium text-[var(--muted)] uppercase">/100</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold uppercase tracking-wide ${scoreColor}`}>{scoreLabel}</span>
                  </div>
                  <p className="text-[14px] font-medium text-[var(--foreground)]">
                    {score >= 75 ? "Your CV is competitive for most roles." :
                     score >= 50 ? "Your CV has a solid base but needs key improvements." :
                     "Your CV needs significant work to be competitive."}
                  </p>
                  <p className="mt-1 text-xs text-[var(--muted)] leading-relaxed line-clamp-2">{cvAnalysis.summary}</p>
                </div>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="segment-switcher mb-6 w-full !flex">
              {[
                { key: "overview", label: "Overview", icon: Eye },
                { key: "recruiter", label: "Recruiter View", icon: MessageSquare },
                { key: "rewrite", label: "Rewrites", icon: TrendingUp },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key as any)}
                  className={`segment-tab flex-1 flex items-center justify-center gap-1.5 ${activeTab === t.key ? "segment-tab-active" : ""}`}
                >
                  <t.icon size={13} />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Overview tab */}
            {activeTab === "overview" && (
              <div className="animate-fade-up space-y-1">
                {/* Strengths */}
                {(cvAnalysis.strengths?.length > 0) && (
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 px-1 py-2">
                      <CheckCircle2 size={14} className="text-emerald-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">Strengths</span>
                      <span className="text-[10px] font-medium text-[var(--muted)]">{cvAnalysis.strengths.length}</span>
                    </div>
                    {cvAnalysis.strengths.map((item: string, i: number) => (
                      <div key={i} className="rounded-xl px-4 py-3 hover:bg-emerald-50/50 transition-all">
                        <p className="text-[13px] text-[var(--foreground)] leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Improvements */}
                {(cvAnalysis.improvements?.length > 0) && (
                  <div className="space-y-0.5 pt-4">
                    <div className="flex items-center gap-2 px-1 py-2">
                      <AlertCircle size={14} className="text-amber-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-amber-600">To Improve</span>
                      <span className="text-[10px] font-medium text-[var(--muted)]">{cvAnalysis.improvements.length}</span>
                    </div>
                    {cvAnalysis.improvements.map((item: string, i: number) => (
                      <div key={i} className="rounded-xl px-4 py-3 hover:bg-amber-50/50 transition-all">
                        <p className="text-[13px] text-[var(--foreground)] leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Missing */}
                {(cvAnalysis.missing?.length > 0) && (
                  <div className="space-y-0.5 pt-4">
                    <div className="flex items-center gap-2 px-1 py-2">
                      <XCircle size={14} className="text-red-500" />
                      <span className="text-xs font-bold uppercase tracking-wider text-red-600">Missing</span>
                      <span className="text-[10px] font-medium text-[var(--muted)]">{cvAnalysis.missing.length}</span>
                    </div>
                    {cvAnalysis.missing.map((item: string, i: number) => (
                      <div key={i} className="rounded-xl px-4 py-3 hover:bg-red-50/50 transition-all">
                        <p className="text-[13px] text-[var(--foreground)] leading-relaxed">{item}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Recruiter View tab */}
            {activeTab === "recruiter" && (
              <div className="animate-fade-up">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                  {/* Recruiter header */}
                  <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--surface-secondary)]/50">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-[var(--accent)] flex items-center justify-center">
                        <MessageSquare size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold">Recruiter&apos;s Take</p>
                        <p className="text-[10px] text-[var(--muted)]">What a hiring manager sees in 6 seconds</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-6">
                    {/* First impression */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">First Impression</p>
                      <p className="text-[14px] leading-relaxed text-[var(--foreground)]">
                        {score >= 75
                          ? `Strong candidate. ${profile?.dreamRole ? `Clear positioning for ${profile.dreamRole} roles.` : "Well-structured resume."} The experience section tells a clear story with quantified impact.`
                          : score >= 50
                          ? `Decent foundation but needs polish. ${profile?.dreamRole ? `Not immediately clear this person is targeting ${profile.dreamRole}.` : "Role targeting is vague."} I'd spend 3 more seconds scanning but might not call.`
                          : `Needs significant work. ${profile?.dreamRole ? `Hard to tell this person wants a ${profile.dreamRole} role.` : "No clear target role."} Would likely pass in first screening round.`
                        }
                      </p>
                    </div>

                    {/* What stands out */}
                    {(cvAnalysis.strengths?.length > 0) && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-2">What Stands Out</p>
                        <div className="space-y-2">
                          {cvAnalysis.strengths.slice(0, 3).map((s: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <Star size={12} className="text-emerald-500 mt-1 shrink-0" />
                              <p className="text-[13px] text-[var(--foreground)]">{s}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Red flags */}
                    {(cvAnalysis.improvements?.length > 0 || cvAnalysis.missing?.length > 0) && (
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-500 mb-2">Red Flags</p>
                        <div className="space-y-2">
                          {[...(cvAnalysis.improvements || []).slice(0, 2), ...(cvAnalysis.missing || []).slice(0, 2)].map((s: string, i: number) => (
                            <div key={i} className="flex items-start gap-2">
                              <AlertCircle size={12} className="text-red-400 mt-1 shrink-0" />
                              <p className="text-[13px] text-[var(--foreground)]">{s}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Verdict */}
                    <div className="rounded-xl bg-[var(--background)] border border-[var(--border)] p-4">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-1">Verdict</p>
                      <p className="text-[14px] font-medium text-[var(--foreground)]">
                        {score >= 75
                          ? "Would move to phone screen. ✅"
                          : score >= 50
                          ? "Maybe pile — depends on the applicant pool. 🤔"
                          : "Would pass. Needs a rewrite before applying. ❌"
                        }
                      </p>
                      <p className="mt-2 text-[12px] text-[var(--muted)] leading-relaxed">
                        {score >= 75
                          ? "This CV communicates value quickly. Minor tweaks could push it to the top of the stack."
                          : score >= 50
                          ? "The raw experience is there, but it's not packaged well. 30 minutes of targeted edits would make a big difference."
                          : "Start over with a clear target role, quantify every bullet, and cut anything that doesn't support your story."
                        }
                      </p>
                    </div>

                    {/* ATS check */}
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)] mb-2">ATS Compatibility</p>
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${score >= 60 ? "bg-emerald-500" : "bg-red-500"}`} />
                        <p className="text-[13px] text-[var(--foreground)]">
                          {score >= 60
                            ? "Likely to pass most ATS filters"
                            : "May get filtered out — missing key terms"
                          }
                        </p>
                      </div>
                      {cvAnalysis.missing?.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {cvAnalysis.missing.slice(0, 6).map((kw: string, i: number) => (
                            <span key={i} className="rounded-md bg-red-50 border border-red-100 px-2 py-1 text-[11px] font-medium text-red-600">
                              + {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Rewrites tab */}
            {activeTab === "rewrite" && (
              <div className="animate-fade-up space-y-4">
                {(!cvAnalysis.rewrites || cvAnalysis.rewrites.length === 0) ? (
                  <div className="py-12 text-center">
                    <p className="text-sm text-[var(--muted)]">No rewrite suggestions available. Run a fresh analysis to get them.</p>
                  </div>
                ) : (
                  cvAnalysis.rewrites.map((rw: any, i: number) => (
                    <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                      <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--surface-secondary)]/50 flex items-center justify-between">
                        <span className="text-xs font-semibold">{rw.title || rw.section || `Suggestion ${i + 1}`}</span>
                        <span className="text-[10px] text-[var(--muted)]">{rw.reason}</span>
                      </div>
                      <div className="p-5 space-y-3">
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1">Before</p>
                          <p className="text-[13px] text-[var(--muted)] leading-relaxed line-through decoration-red-300">{rw.before || rw.original}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1">After</p>
                          <p className="text-[13px] text-[var(--foreground)] leading-relaxed font-medium">{rw.after || rw.suggested}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Role Matcher */}
            <div className="mt-10 mb-4">
              <div className="flex items-center gap-3 mb-4">
                <Target size={15} className="text-[var(--accent)]" />
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
          </>
        )}
      </div>
    </AppShell>
  );
}
