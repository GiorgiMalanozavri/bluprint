"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Check, ChevronLeft, ChevronRight, Loader2, Pencil, Plus, X,
  Upload, Globe, Briefcase, GraduationCap, BookOpen, MapPin, ClipboardPaste,
} from "lucide-react";
import { motion } from "framer-motion";
import { userStorage, setCurrentUserId } from "@/lib/user-storage";

/* ─── Types ─────────────────────────────────────── */

type Step = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type SubStep = "academic" | "international" | "career" | "courses" | "review";

type Experience = { title: string; company: string; duration: string; bullets: string[] };
type Education = { degree: string; institution: string; years: string; grade: string };

type ParsedCourse = { name: string; completed: boolean };
type ParsedSemester = { label: string; courses: ParsedCourse[] };

type Profile = {
  // Mandatory
  name: string;
  university: string;
  degree: string;
  yearOfStudy: string;
  graduating: string;
  studentType: string;
  dreamRole: string;
  targetIndustries: string;
  // Optional - academic
  minor: string;
  gpa: string;
  // Optional - international
  countryOfOrigin: string;
  visaStatus: string;
  sponsorshipNeeded: string;
  // Optional - career
  targetCompanies: string;
  preferredLocations: string;
  willingToRelocate: string;
  linkedinUrl: string;
  portfolioUrl: string;
  certifications: string[];
  // Extracted from CV
  experiences: Experience[];
  education: Education[];
  skills: string[];
  extracurriculars: string[];
  languages: string[];
  flaggedFields?: string[];
  // Course schedule
  courseScheduleRaw: string;
  courseSchedule: ParsedSemester[];
};

const emptyProfile: Profile = {
  name: "",
  university: "",
  degree: "",
  yearOfStudy: "",
  graduating: "",
  studentType: "Domestic",
  dreamRole: "",
  targetIndustries: "",
  minor: "",
  gpa: "",
  countryOfOrigin: "",
  visaStatus: "",
  sponsorshipNeeded: "",
  targetCompanies: "",
  preferredLocations: "",
  willingToRelocate: "",
  linkedinUrl: "",
  portfolioUrl: "",
  certifications: [],
  experiences: [],
  education: [],
  skills: [],
  extracurriculars: [],
  languages: [],
  flaggedFields: [],
  courseScheduleRaw: "",
  courseSchedule: [],
};

const loadingMessages = [
  "Reading your CV Intelligence...",
  "Extracting your experience...",
  "Identifying your career strengths...",
  "Mapping your background...",
  "Building your profile...",
];

const roadmapMessages = [
  "Mapping your semesters...",
  "Identifying your career gaps...",
  "Building your action plan...",
  "Your bluprint roadmap is ready.",
];

/* ─── Course Schedule Parser ────────────────────── */

function parseCourseSchedule(raw: string): ParsedSemester[] {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  const semesters: ParsedSemester[] = [];
  let current: ParsedSemester | null = null;

  // Common semester header patterns
  const semesterPattern = /^(semester|year|fall|spring|summer|winter|freshman|sophomore|junior|senior|1st|2nd|3rd|4th|first|second|third|fourth)/i;
  const creditPattern = /^\d+\s*(credits?|hrs?|hours?|cr\.?)\s*$/i;

  for (const line of lines) {
    // Check if this line looks like a semester header
    if (semesterPattern.test(line) || /^(year\s*\d|sem\s*\d)/i.test(line)) {
      current = { label: line, courses: [] };
      semesters.push(current);
    } else if (current) {
      // Skip lines that are just credit counts or very short
      if (creditPattern.test(line) || line.length < 3) continue;
      // Skip lines that are just numbers
      if (/^\d+$/.test(line)) continue;
      // Skip total/credit summary lines
      if (/^total/i.test(line)) continue;
      current.courses.push({ name: line, completed: false });
    } else {
      // No semester header yet, create a default one
      if (!current) {
        current = { label: "Courses", courses: [] };
        semesters.push(current);
      }
      if (!creditPattern.test(line) && line.length >= 3 && !/^\d+$/.test(line) && !/^total/i.test(line)) {
        current.courses.push({ name: line, completed: false });
      }
    }
  }

  // Filter out empty semesters
  return semesters.filter(s => s.courses.length > 0);
}

/* ─── Main Component ────────────────────────────── */

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [subStep, setSubStep] = useState<SubStep>("academic");
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [editingField, setEditingField] = useState<keyof Profile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pre-fill name from Google auth
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { createBrowserClient } = await import("@supabase/ssr");
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );
        const { data: { user } } = await supabase.auth.getUser();
        if (user?.id) setCurrentUserId(user.id);
        if (user?.user_metadata?.full_name) {
          setProfile(p => ({ ...p, name: user.user_metadata.full_name }));
        }
      } catch { /* ignore */ }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (step !== 2 && step !== 7) return;
    const messages = step === 2 ? loadingMessages : roadmapMessages;
    const interval = window.setInterval(() => {
      setLoadingIndex((index) => (index + 1) % messages.length);
    }, 1300);
    return () => window.clearInterval(interval);
  }, [step]);

  // Total progress: steps 1-7
  const progress = useMemo(() => {
    if (step <= 2) return (step / 7) * 100;
    if (step === 3) {
      const subSteps: SubStep[] = ["academic", "international", "career", "courses", "review"];
      const subIdx = subSteps.indexOf(subStep);
      return ((3 + subIdx * 0.8) / 7) * 100;
    }
    return (step / 7) * 100;
  }, [step, subStep]);

  const currentMessages = step === 2 ? loadingMessages : roadmapMessages;

  const updateList = (key: "skills" | "extracurriculars" | "languages" | "certifications", nextItems: string[]) => {
    setProfile((current) => ({ ...current, [key]: nextItems }));
  };

  const handleAnalyzeCV = async () => {
    if (!selectedFile) return;
    setError("");
    setLoading(true);
    setStep(2);

    try {
      const parseForm = new FormData();
      parseForm.append("file", selectedFile);

      const parseResponse = await fetch("/api/parse-resume", {
        method: "POST",
        body: parseForm,
      });
      const parsed = await parseResponse.json();
      if (!parseResponse.ok) throw new Error(parsed.error || "Failed to parse resume");

      const extractResponse = await fetch("/api/extract-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: parsed.text,
          fileName: selectedFile.name,
          fileSize: selectedFile.size,
        }),
      });
      const extracted = await extractResponse.json();
      if (!extractResponse.ok) throw new Error(extracted.error || "Failed to extract profile");

      const mergedProfile = { ...emptyProfile, ...extracted.profile };
      setProfile(mergedProfile);
      userStorage.setItem("bluprint_profile_review", JSON.stringify(mergedProfile));
      userStorage.setItem("bluprint_cv_raw_text", parsed.text);
      userStorage.setItem("bluprint_cv_filename", selectedFile.name);
      setStep(3);
      setSubStep("academic");
      setLoadingIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setStep(1);
    } finally {
      setLoading(false);
    }
  };

  const handleBuildRoadmap = async () => {
    setError("");
    setLoading(true);
    setStep(7);

    try {
      const response = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to generate roadmap");

      userStorage.setItem("bluprint_onboarding_complete", "true");
      userStorage.setItem("bluprint_profile_review", JSON.stringify(profile));
      userStorage.setItem("bluprint_ai_roadmap", JSON.stringify(result.semesters || []));
      userStorage.setItem("bluprint_full_roadmap", JSON.stringify(result));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build roadmap.");
      setSubStep("review");
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  // Mandatory field validation
  const mandatoryValid = Boolean(
    profile.name.trim() &&
    profile.university.trim() &&
    profile.degree.trim() &&
    profile.yearOfStudy.trim() &&
    profile.graduating.trim()
  );

  const careerValid = Boolean(profile.dreamRole.trim());

  // Sub-step navigation
  const subSteps: SubStep[] = ["academic", "international", "career", "courses", "review"];
  const subStepIndex = subSteps.indexOf(subStep);

  const nextSubStep = () => {
    if (subStepIndex < subSteps.length - 1) {
      setSubStep(subSteps[subStepIndex + 1]);
      window.scrollTo(0, 0);
    }
  };

  const prevSubStep = () => {
    if (subStepIndex > 0) {
      setSubStep(subSteps[subStepIndex - 1]);
      window.scrollTo(0, 0);
    } else {
      setStep(1);
    }
  };

  const subStepLabels: Record<SubStep, string> = {
    academic: "Academic",
    international: "Background",
    career: "Career",
    courses: "Courses",
    review: "Review",
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Progress bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-[var(--accent)]/10">
        <div className="h-full bg-[var(--accent)] transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Top nav (not on loading screens) */}
      {step !== 2 && step !== 7 && (
        <div className="max-w-4xl mx-auto flex items-center justify-between pt-8 px-6 animate-fade-up">
          <button
            onClick={() => {
              if (step === 3) prevSubStep();
              else setStep((v) => Math.max(1, v - 1) as Step);
            }}
            className="group inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            disabled={loading}
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
          {step === 3 ? (
            <div className="flex items-center gap-1">
              {subSteps.map((ss, i) => (
                <button
                  key={ss}
                  onClick={() => setSubStep(ss)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider transition-all ${
                    ss === subStep
                      ? "bg-[var(--foreground)] text-white"
                      : i < subStepIndex
                      ? "text-[var(--accent)] hover:bg-[var(--accent-light)]"
                      : "text-[var(--muted)] hover:bg-[var(--background-secondary)]"
                  }`}
                >
                  {subStepLabels[ss]}
                </button>
              ))}
            </div>
          ) : (
            <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
              Step {step} of 7
            </p>
          )}
        </div>
      )}

      {/* ─── Step 1: Upload CV ─── */}
      {step === 1 && (
        <section className="flex min-h-screen items-center justify-center px-4 animate-fade-up">
          <div className="w-full max-w-2xl text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-light)] text-[var(--accent)] mb-8">
              <Plus size={24} />
            </div>
            <h1 className="text-[2.5rem] font-semibold tracking-tight">Let&apos;s build your roadmap.</h1>
            <p className="mt-4 text-lg text-[var(--muted)]">Upload your CV and bluprint will generate your career plan in seconds.</p>

            <label className="mt-10 block cursor-pointer rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)] p-12 transition-all hover:border-[var(--accent)] hover:shadow-md group">
              {selectedFile ? (
                <div className="flex flex-col items-center gap-3">
                  <div className="rounded-full bg-emerald-50 p-3 text-emerald-600"><Check size={24} /></div>
                  <p className="font-semibold">{selectedFile.name}</p>
                  <p className="text-xs text-[var(--muted)]">{Math.round(selectedFile.size / 1024)} KB</p>
                  <span className="text-xs font-medium text-[var(--accent)] underline mt-2">Change file</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--background-secondary)] text-[var(--muted)] group-hover:bg-[var(--accent-light)] group-hover:text-[var(--accent)] transition-colors">
                    <Upload size={28} />
                  </div>
                  <div>
                    <p className="text-xl font-semibold">Drop your CV here</p>
                    <p className="text-sm text-[var(--muted)] mt-1">PDF or Word document</p>
                  </div>
                </div>
              )}
              <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
            </label>

            <button
              onClick={handleAnalyzeCV}
              disabled={!selectedFile || loading}
              className="mt-10 btn-primary h-12 px-12 text-[15px] w-full sm:w-auto"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Analyze my background"}
            </button>

            {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}

            <div className="mt-12 flex flex-col items-center gap-6 text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] sm:flex-row sm:justify-center">
              <span className="flex items-center gap-2"><Check size={12} className="text-[var(--accent)]" /> Encrypted Data</span>
              <span className="flex items-center gap-2"><Check size={12} className="text-[var(--accent)]" /> Real-time AI</span>
              <span className="flex items-center gap-2"><Check size={12} className="text-[var(--accent)]" /> Direct Roadmap</span>
            </div>

            <button onClick={() => { setStep(3); setSubStep("academic"); }} className="mt-12 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] underline underline-offset-4 transition-colors">
              I don&apos;t have a CV yet &middot; Start manually
            </button>
          </div>
        </section>
      )}

      {/* ─── Step 2 / 7: Loading ─── */}
      {(step === 2 || step === 7) && (
        <section className="flex min-h-screen items-center justify-center px-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3">
              {[0, 1, 2].map((dot) => (
                <motion.span
                  key={dot}
                  animate={{ scale: loadingIndex % 3 === dot ? 1.2 : 0.8, opacity: loadingIndex % 3 === dot ? 1 : 0.3 }}
                  className="h-3 w-3 rounded-full bg-[var(--accent)]"
                />
              ))}
            </div>
            <p className="mt-8 text-lg font-semibold animate-pulse">{currentMessages[loadingIndex]}</p>
            {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}
          </div>
        </section>
      )}

      {/* ─── Step 3: Multi-section Profile Builder ─── */}
      {step === 3 && (
        <section className="max-w-2xl mx-auto pb-40 pt-10 px-6 animate-fade-up" key={subStep}>
          {/* ── Sub-step: Academic ── */}
          {subStep === "academic" && (
            <>
              <header className="mb-10">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)] mb-4">
                  <GraduationCap size={20} />
                </div>
                <h1 className="text-[2rem] font-semibold tracking-tight">Academic details</h1>
                <p className="mt-2 text-[var(--muted)]">Fields marked with * are required to build your roadmap.</p>
              </header>

              <div className="space-y-8">
                <div className="surface-card p-6 space-y-6">
                  <FormField label="Full name" required value={profile.name}
                    onChange={v => setProfile({ ...profile, name: v })} placeholder="Your full name" />
                  <FormField label="University" required value={profile.university}
                    onChange={v => setProfile({ ...profile, university: v })} placeholder="e.g. University of Michigan" />
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField label="Degree / Major" required value={profile.degree}
                      onChange={v => setProfile({ ...profile, degree: v })} placeholder="e.g. B.S. Computer Science" />
                    <FormField label="Minor(s)" value={profile.minor}
                      onChange={v => setProfile({ ...profile, minor: v })} placeholder="e.g. Mathematics" />
                  </div>
                  <div className="grid gap-6 sm:grid-cols-3">
                    <FormField label="Year of study" required value={profile.yearOfStudy}
                      onChange={v => setProfile({ ...profile, yearOfStudy: v })} placeholder="e.g. Junior" />
                    <FormField label="Expected graduation" required value={profile.graduating}
                      onChange={v => setProfile({ ...profile, graduating: v })} placeholder="e.g. May 2027" />
                    <FormField label="GPA" value={profile.gpa}
                      onChange={v => setProfile({ ...profile, gpa: v })} placeholder="e.g. 3.5" />
                  </div>

                  <div>
                    <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-3 block">
                      Student type <span className="text-red-400">*</span>
                    </label>
                    <div className="flex gap-3">
                      {["Domestic", "International"].map((opt) => (
                        <button key={opt} onClick={() => setProfile({ ...profile, studentType: opt })}
                          className={`flex-1 rounded-xl py-3 text-sm font-medium transition-all ${
                            profile.studentType === opt
                              ? "bg-[var(--foreground)] text-white shadow-md"
                              : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--foreground)]"
                          }`}>
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Education from CV */}
                {profile.education.length > 0 && (
                  <div className="surface-card p-6">
                    <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)] mb-4">
                      Education (from CV)
                    </h2>
                    <div className="space-y-3">
                      {profile.education.map((ed, i) => (
                        <div key={i} className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-secondary)]">
                          <p className="text-sm font-semibold">{ed.degree}</p>
                          <p className="text-xs text-[var(--muted)]">{ed.institution} &middot; {ed.years}</p>
                          {ed.grade && <p className="text-xs text-[var(--muted)] mt-1">Grade: {ed.grade}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <BottomBar
                canContinue={mandatoryValid}
                onContinue={nextSubStep}
                hint={!mandatoryValid ? "Fill in all required fields to continue" : undefined}
              />
            </>
          )}

          {/* ── Sub-step: International / Background ── */}
          {subStep === "international" && (
            <>
              <header className="mb-10">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)] mb-4">
                  <Globe size={20} />
                </div>
                <h1 className="text-[2rem] font-semibold tracking-tight">Your background</h1>
                <p className="mt-2 text-[var(--muted)]">
                  {profile.studentType === "International"
                    ? "This helps us tailor visa timelines, CPT/OPT guidance, and sponsorship info."
                    : "All fields here are optional. They help us personalize your roadmap."}
                </p>
              </header>

              <div className="space-y-8">
                <div className="surface-card p-6 space-y-6">
                  <FormField label="Country of origin"
                    required={profile.studentType === "International"}
                    value={profile.countryOfOrigin}
                    onChange={v => setProfile({ ...profile, countryOfOrigin: v })}
                    placeholder="e.g. India, South Korea, Georgia..." />

                  {profile.studentType === "International" && (
                    <>
                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-3 block">
                          Visa status
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {["F-1", "J-1", "H-1B", "OPT", "CPT", "Other", "Not sure"].map(opt => (
                            <button key={opt} onClick={() => setProfile({ ...profile, visaStatus: opt })}
                              className={`rounded-xl px-4 py-2.5 text-xs font-medium transition-all ${
                                profile.visaStatus === opt
                                  ? "bg-[var(--foreground)] text-white"
                                  : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]"
                              }`}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-3 block">
                          Will you need employer sponsorship?
                        </label>
                        <div className="flex gap-3">
                          {["Yes", "No", "Not sure"].map(opt => (
                            <button key={opt} onClick={() => setProfile({ ...profile, sponsorshipNeeded: opt })}
                              className={`flex-1 rounded-xl py-2.5 text-xs font-medium transition-all ${
                                profile.sponsorshipNeeded === opt
                                  ? "bg-[var(--foreground)] text-white"
                                  : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]"
                              }`}>
                              {opt}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <TagSection title="Languages spoken" items={profile.languages}
                    onChange={items => updateList("languages", items)} placeholder="Add language..." />
                </div>

                {/* Work Experience from CV */}
                {profile.experiences.length > 0 && (
                  <div className="surface-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)]">Work History (from CV)</h2>
                      <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">{profile.experiences.length} identified</span>
                    </div>
                    <div className="space-y-3">
                      {profile.experiences.map((item, index) => (
                        <div key={index} className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-secondary)]">
                          <p className="font-semibold text-sm">{item.title} at {item.company}</p>
                          <p className="text-[11px] font-medium text-[var(--muted)] mt-1">{item.duration}</p>
                          <ul className="mt-2 space-y-1">
                            {item.bullets.slice(0, 2).map((bullet, bi) => (
                              <li key={bi} className="text-xs text-[var(--muted)] leading-relaxed flex gap-2">
                                <span className="text-[var(--accent)]">&bull;</span> {bullet}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <BottomBar canContinue onContinue={nextSubStep} />
            </>
          )}

          {/* ── Sub-step: Career Goals ── */}
          {subStep === "career" && (
            <>
              <header className="mb-10">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)] mb-4">
                  <Briefcase size={20} />
                </div>
                <h1 className="text-[2rem] font-semibold tracking-tight">Career goals</h1>
                <p className="mt-2 text-[var(--muted)]">bluprint uses this to target your roadmap milestones and suggest actions.</p>
              </header>

              <div className="space-y-8">
                <div className="surface-card p-6 space-y-6">
                  <FormField label="Dream role" required value={profile.dreamRole}
                    onChange={v => setProfile({ ...profile, dreamRole: v })}
                    placeholder="e.g. Software Engineer, Investment Banker, Product Manager..." />
                  <FormField label="Target industries" value={profile.targetIndustries}
                    onChange={v => setProfile({ ...profile, targetIndustries: v })}
                    placeholder="e.g. Tech, Finance, Consulting, Healthcare..." />
                  <FormField label="Target companies" value={profile.targetCompanies}
                    onChange={v => setProfile({ ...profile, targetCompanies: v })}
                    placeholder="e.g. Google, Goldman Sachs, McKinsey..." />

                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField label="Preferred work locations" value={profile.preferredLocations}
                      onChange={v => setProfile({ ...profile, preferredLocations: v })}
                      placeholder="e.g. New York, San Francisco, Remote..." />
                    <div>
                      <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-3 block">
                        Willing to relocate?
                      </label>
                      <div className="flex gap-3">
                        {["Yes", "No", "Maybe"].map(opt => (
                          <button key={opt} onClick={() => setProfile({ ...profile, willingToRelocate: opt })}
                            className={`flex-1 rounded-xl py-2.5 text-xs font-medium transition-all ${
                              profile.willingToRelocate === opt
                                ? "bg-[var(--foreground)] text-white"
                                : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]"
                            }`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="surface-card p-6 space-y-6">
                  <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)]">Online presence</h2>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <FormField label="LinkedIn URL" value={profile.linkedinUrl}
                      onChange={v => setProfile({ ...profile, linkedinUrl: v })}
                      placeholder="linkedin.com/in/..." />
                    <FormField label="Portfolio / Website" value={profile.portfolioUrl}
                      onChange={v => setProfile({ ...profile, portfolioUrl: v })}
                      placeholder="yoursite.com" />
                  </div>
                </div>

                <div className="surface-card p-6">
                  <TagSection title="Skills" items={profile.skills}
                    onChange={items => updateList("skills", items)} placeholder="Add skill..." />
                  <div className="mt-6">
                    <TagSection title="Certifications" items={profile.certifications}
                      onChange={items => updateList("certifications", items)} placeholder="Add certification..." />
                  </div>
                  <div className="mt-6">
                    <TagSection title="Extracurriculars" items={profile.extracurriculars}
                      onChange={items => updateList("extracurriculars", items)} placeholder="Add activity..." />
                  </div>
                </div>
              </div>

              <BottomBar
                canContinue={careerValid}
                onContinue={nextSubStep}
                hint={!careerValid ? "Enter your dream role to continue" : undefined}
              />
            </>
          )}

          {/* ── Sub-step: Course Schedule ── */}
          {subStep === "courses" && (
            <CourseScheduleStep
              profile={profile}
              setProfile={setProfile}
              onContinue={nextSubStep}
            />
          )}

          {/* ── Sub-step: Review ── */}
          {subStep === "review" && (
            <>
              <header className="mb-10">
                <h1 className="text-[2rem] font-semibold tracking-tight">Review your profile</h1>
                <p className="mt-2 text-[var(--muted)]">Everything looks good? We&apos;ll generate your personalized career roadmap.</p>
              </header>

              {error && <p className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm font-medium text-red-600">{error}</p>}

              <div className="space-y-4">
                <ReviewSection title="Academic" icon={<GraduationCap size={14} />}
                  onEdit={() => setSubStep("academic")}
                  items={[
                    ["Name", profile.name],
                    ["University", profile.university],
                    ["Degree", profile.degree],
                    ...(profile.minor ? [["Minor", profile.minor]] : []),
                    ["Year", profile.yearOfStudy],
                    ["Graduating", profile.graduating],
                    ...(profile.gpa ? [["GPA", profile.gpa]] : []),
                    ["Type", profile.studentType],
                  ] as [string, string][]}
                />

                <ReviewSection title="Background" icon={<Globe size={14} />}
                  onEdit={() => setSubStep("international")}
                  items={[
                    ...(profile.countryOfOrigin ? [["Country", profile.countryOfOrigin]] : []),
                    ...(profile.visaStatus ? [["Visa", profile.visaStatus]] : []),
                    ...(profile.sponsorshipNeeded ? [["Sponsorship", profile.sponsorshipNeeded]] : []),
                    ...(profile.languages.length ? [["Languages", profile.languages.join(", ")]] : []),
                  ] as [string, string][]}
                />

                <ReviewSection title="Career" icon={<Briefcase size={14} />}
                  onEdit={() => setSubStep("career")}
                  items={[
                    ["Dream role", profile.dreamRole],
                    ...(profile.targetIndustries ? [["Industries", profile.targetIndustries]] : []),
                    ...(profile.targetCompanies ? [["Companies", profile.targetCompanies]] : []),
                    ...(profile.preferredLocations ? [["Locations", profile.preferredLocations]] : []),
                    ...(profile.willingToRelocate ? [["Relocate", profile.willingToRelocate]] : []),
                    ...(profile.skills.length ? [["Skills", profile.skills.join(", ")]] : []),
                  ] as [string, string][]}
                />

                {profile.courseSchedule.length > 0 && (
                  <ReviewSection title="Courses" icon={<BookOpen size={14} />}
                    onEdit={() => setSubStep("courses")}
                    items={profile.courseSchedule.map(sem => [
                      sem.label,
                      `${sem.courses.filter(c => c.completed).length}/${sem.courses.length} completed`,
                    ])}
                  />
                )}
              </div>

              <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl z-40">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 py-5 px-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Ready to proceed?</span>
                    <p className="text-xs text-[var(--muted)]">We&apos;ll generate your roadmap based on these details.</p>
                  </div>
                  <button
                    onClick={handleBuildRoadmap}
                    disabled={!mandatoryValid || !careerValid || loading}
                    className="btn-primary h-12 px-10 text-[15px] w-full sm:w-auto"
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Generate my roadmap"}
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}

      {/* Edit Modal */}
      {editingField && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
          <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-8 w-full max-w-md animate-fade-up">
            <h3 className="text-xl font-semibold mb-6">Edit {editingField.replace(/([A-Z])/g, " $1").toLowerCase()}</h3>
            <input
              autoFocus
              className="w-full h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-medium outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 mb-6"
              value={profile[editingField] as string}
              onChange={(e) => setProfile({ ...profile, [editingField]: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && setEditingField(null)}
            />
            <div className="flex gap-3">
              <button onClick={() => setEditingField(null)} className="btn-primary flex-1 h-11">Save</button>
              <button onClick={() => setEditingField(null)} className="btn-secondary h-11">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Course Schedule Step ──────────────────────── */

function CourseScheduleStep({
  profile,
  setProfile,
  onContinue,
}: {
  profile: Profile;
  setProfile: React.Dispatch<React.SetStateAction<Profile>>;
  onContinue: () => void;
}) {
  const [rawText, setRawText] = useState(profile.courseScheduleRaw);
  const [parsed, setParsed] = useState<ParsedSemester[]>(profile.courseSchedule);
  const [isParsed, setIsParsed] = useState(profile.courseSchedule.length > 0);

  const handleParse = () => {
    const result = parseCourseSchedule(rawText);
    setParsed(result);
    setIsParsed(true);
    setProfile(p => ({ ...p, courseScheduleRaw: rawText, courseSchedule: result }));
  };

  const toggleCourse = (semIdx: number, courseIdx: number) => {
    const next = parsed.map((sem, si) =>
      si === semIdx
        ? {
            ...sem,
            courses: sem.courses.map((c, ci) =>
              ci === courseIdx ? { ...c, completed: !c.completed } : c
            ),
          }
        : sem
    );
    setParsed(next);
    setProfile(p => ({ ...p, courseSchedule: next }));
  };

  const totalCourses = parsed.reduce((sum, s) => sum + s.courses.length, 0);
  const completedCourses = parsed.reduce((sum, s) => sum + s.courses.filter(c => c.completed).length, 0);

  return (
    <>
      <header className="mb-10">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)] mb-4">
          <BookOpen size={20} />
        </div>
        <h1 className="text-[2rem] font-semibold tracking-tight">Course schedule</h1>
        <p className="mt-2 text-[var(--muted)]">
          Paste your 4-year sample course schedule from your university website. This helps bluprint understand your academic timeline.
        </p>
      </header>

      {!isParsed ? (
        <div className="space-y-6">
          <div className="surface-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardPaste size={14} className="text-[var(--accent)]" />
              <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)]">
                Paste your course plan
              </h2>
            </div>
            <p className="text-xs text-[var(--muted)] mb-4">
              Go to your university&apos;s website, find the sample 4-year plan for your major, and copy-paste it below.
              Include semester headers (e.g. &quot;Semester 1&quot;, &quot;Fall Year 1&quot;) and course names.
            </p>
            <textarea
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              placeholder={`Example:\n\nFall Semester 1\nIntro to Computer Science\nCalculus I\nEnglish Composition\nGeneral Chemistry\n\nSpring Semester 1\nData Structures\nCalculus II\nPhysics I\nIntro to Psychology`}
              className="w-full h-64 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all resize-none font-mono"
            />
            <button
              onClick={handleParse}
              disabled={!rawText.trim()}
              className="mt-4 btn-primary h-11 px-8 text-sm w-full sm:w-auto"
            >
              Parse course schedule
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary */}
          <div className="surface-card p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{completedCourses} of {totalCourses} courses completed</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{parsed.length} semesters detected</p>
            </div>
            <div className="w-32 h-2 rounded-full bg-[var(--background-secondary)] overflow-hidden">
              <div
                className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                style={{ width: totalCourses ? `${(completedCourses / totalCourses) * 100}%` : "0%" }}
              />
            </div>
          </div>

          {/* Semesters */}
          {parsed.map((sem, si) => {
            const semCompleted = sem.courses.filter(c => c.completed).length;
            return (
              <div key={si} className="surface-card p-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-[var(--surface-secondary)] border-b border-[var(--border)]">
                  <h3 className="text-xs font-semibold uppercase tracking-wider">{sem.label}</h3>
                  <span className="text-[10px] font-medium text-[var(--muted)]">
                    {semCompleted}/{sem.courses.length}
                  </span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {sem.courses.map((course, ci) => (
                    <button
                      key={ci}
                      onClick={() => toggleCourse(si, ci)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                      <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        course.completed
                          ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                          : "border-[var(--border)]"
                      }`}>
                        {course.completed && <Check size={12} />}
                      </div>
                      <span className={`text-sm ${course.completed ? "line-through text-[var(--muted)]" : ""}`}>
                        {course.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          <button
            onClick={() => { setIsParsed(false); }}
            className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] underline underline-offset-4 transition-colors"
          >
            Re-paste schedule
          </button>
        </div>
      )}

      <BottomBar
        canContinue
        onContinue={onContinue}
        label={isParsed ? "Continue" : "Skip this step"}
      />
    </>
  );
}

/* ─── Reusable Components ───────────────────────── */

function FormField({
  label,
  required,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        className="w-full h-11 rounded-xl border border-[var(--border)] bg-transparent px-4 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function TagSection({
  title,
  items,
  onChange,
  placeholder,
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div>
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)] mb-4">{title}</h2>
      <div className="flex flex-wrap gap-2 mb-3">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => onChange(items.filter((v) => v !== item))}
            className="group inline-flex items-center gap-2 rounded-xl bg-[var(--background-secondary)] px-4 py-2.5 text-xs font-medium hover:bg-[var(--accent-light)] hover:text-[var(--accent)] transition-all"
          >
            {item}
            <X size={14} className="opacity-40 group-hover:opacity-100" />
          </button>
        ))}
      </div>
      <form onSubmit={(e) => { e.preventDefault(); const v = draft.trim(); if (!v) return; onChange([...items, v]); setDraft(""); }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder || `Add ${title.toLowerCase()}...`}
          className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-xs font-medium outline-none focus:border-[var(--accent)] transition-all"
        />
      </form>
    </div>
  );
}

function ReviewSection({
  title,
  icon,
  onEdit,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  onEdit: () => void;
  items: [string, string][];
}) {
  if (items.length === 0) return null;
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{title}</h3>
        </div>
        <button onClick={onEdit}
          className="text-[10px] font-medium text-[var(--accent)] hover:underline">
          Edit
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(([label, value], i) => (
          <div key={i}>
            <p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">{label}</p>
            <p className="text-sm font-medium mt-0.5">{value || "\u2014"}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BottomBar({
  canContinue,
  onContinue,
  hint,
  label,
}: {
  canContinue: boolean;
  onContinue: () => void;
  hint?: string;
  label?: string;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl z-40">
      <div className="max-w-4xl mx-auto flex items-center justify-between py-5 px-6">
        {hint ? (
          <p className="text-xs text-[var(--muted)]">{hint}</p>
        ) : (
          <div />
        )}
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className="btn-primary h-11 px-8 text-sm flex items-center gap-2"
        >
          {label || "Continue"} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
