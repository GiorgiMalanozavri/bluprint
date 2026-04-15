"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check, ChevronLeft, ChevronRight, Loader2, Plus, X,
  Upload, Globe, Briefcase, GraduationCap, BookOpen, ClipboardPaste,
  Sparkles, Search,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { userStorage, setCurrentUserId } from "@/lib/user-storage";

/* ─── Types ─────────────────────────────────────── */

type SubStep = "academic" | "international" | "career" | "courses" | "review";
type Experience = { title: string; company: string; duration: string; bullets: string[] };
type Education = { degree: string; institution: string; years: string; grade: string };
type ParsedCourse = { name: string; completed: boolean };
type ParsedSemester = { label: string; courses: ParsedCourse[] };

type Profile = {
  name: string;
  university: string;
  degree: string;
  yearOfStudy: string;
  graduating: string;
  studentType: string;
  dreamRole: string;
  targetIndustries: string;
  minor: string;
  gpa: string;
  countryOfOrigin: string;
  visaStatus: string;
  sponsorshipNeeded: string;
  targetCompanies: string;
  preferredLocations: string;
  willingToRelocate: string;
  linkedinUrl: string;
  portfolioUrl: string;
  certifications: string[];
  experiences: Experience[];
  education: Education[];
  skills: string[];
  extracurriculars: string[];
  languages: string[];
  flaggedFields?: string[];
  courseScheduleRaw: string;
  courseSchedule: ParsedSemester[];
};

const emptyProfile: Profile = {
  name: "", university: "", degree: "", yearOfStudy: "", graduating: "",
  studentType: "Domestic", dreamRole: "", targetIndustries: "", minor: "", gpa: "",
  countryOfOrigin: "", visaStatus: "", sponsorshipNeeded: "",
  targetCompanies: "", preferredLocations: "", willingToRelocate: "",
  linkedinUrl: "", portfolioUrl: "", certifications: [],
  experiences: [], education: [], skills: [], extracurriculars: [],
  languages: [], flaggedFields: [], courseScheduleRaw: "", courseSchedule: [],
};

const loadingMessages = [
  "Reading your CV...", "Extracting your experience...",
  "Identifying career strengths...", "Building your profile...",
];
const roadmapMessages = [
  "Mapping your semesters...", "Identifying career gaps...",
  "Building your action plan...", "Your bluprint is ready.",
];

/* ─── Suggestion Data ───────────────────────────── */

const YEAR_OPTIONS = ["Freshman", "Sophomore", "Junior", "Senior", "Graduate (Masters)", "Graduate (PhD)"];

const GRAD_OPTIONS = (() => {
  const now = new Date();
  const options: string[] = [];
  for (let y = now.getFullYear(); y <= now.getFullYear() + 6; y++) {
    options.push(`May ${y}`, `December ${y}`);
  }
  return options;
})();

const INDUSTRY_OPTIONS = [
  "Technology", "Finance", "Consulting", "Healthcare", "Education",
  "Marketing", "Engineering", "Law", "Media", "Government",
  "Nonprofit", "Real Estate", "Energy", "Retail", "Pharma",
];

const ROLE_SUGGESTIONS: Record<string, string[]> = {
  "Computer Science": ["Software Engineer", "Data Scientist", "Product Manager", "ML Engineer", "DevOps Engineer"],
  "Business": ["Management Consultant", "Investment Banker", "Product Manager", "Business Analyst", "Marketing Manager"],
  "Finance": ["Investment Banker", "Financial Analyst", "Quantitative Analyst", "Portfolio Manager", "Risk Analyst"],
  "Engineering": ["Mechanical Engineer", "Civil Engineer", "Systems Engineer", "Project Manager", "R&D Engineer"],
  "Economics": ["Economic Analyst", "Management Consultant", "Data Analyst", "Policy Analyst", "Investment Banker"],
  "Biology": ["Research Scientist", "Biotech Analyst", "Medical Writer", "Lab Manager", "Clinical Research Associate"],
  "Psychology": ["UX Researcher", "HR Specialist", "Clinical Psychologist", "Data Analyst", "Product Manager"],
  "Mathematics": ["Quantitative Analyst", "Data Scientist", "Actuary", "Software Engineer", "Research Scientist"],
  "default": ["Software Engineer", "Management Consultant", "Data Analyst", "Product Manager", "Financial Analyst"],
};

const SKILL_SUGGESTIONS: Record<string, string[]> = {
  "Software Engineer": ["Python", "JavaScript", "React", "Node.js", "SQL", "Git", "AWS", "Docker", "System Design"],
  "Data Scientist": ["Python", "R", "SQL", "TensorFlow", "Pandas", "Statistics", "Machine Learning", "Tableau"],
  "Product Manager": ["User Research", "Agile/Scrum", "SQL", "Wireframing", "A/B Testing", "Roadmapping", "Analytics"],
  "Investment Banker": ["Financial Modeling", "Excel", "PowerPoint", "Valuation", "DCF Analysis", "M&A", "Bloomberg"],
  "Management Consultant": ["PowerPoint", "Excel", "Case Studies", "Data Analysis", "Strategy", "Market Research"],
  "default": ["Excel", "PowerPoint", "Communication", "Leadership", "Teamwork", "Problem Solving", "Data Analysis"],
};

const COUNTRY_OPTIONS = [
  "India", "China", "South Korea", "Nigeria", "Brazil", "Turkey",
  "Vietnam", "Japan", "Saudi Arabia", "Mexico", "Canada", "UK",
  "Germany", "France", "Pakistan", "Bangladesh", "Nepal", "Iran",
  "Taiwan", "Indonesia", "Georgia", "Colombia", "Egypt", "Kenya",
  "Other",
];

/* ─── Course Schedule Parser ────────────────────── */

function parseCourseSchedule(raw: string): ParsedSemester[] {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  const semesters: ParsedSemester[] = [];
  let current: ParsedSemester | null = null;

  const semesterPattern = /^(semester|year|fall|spring|summer|winter|freshman|sophomore|junior|senior|1st|2nd|3rd|4th|first|second|third|fourth)/i;

  // Lines to skip: credit counts, totals, requirements text, short labels
  const skipPatterns = [
    /^\d+\s*(credits?|hrs?|hours?|cr\.?|units?)\s*$/i,
    /^\d+$/,
    /^total/i,
    /^(minimum|maximum|required|elective|prerequisite|corequisite|co-requisite|requirement|completion|program|curriculum|catalog|note|students? (must|should|are|may|can|will|need)|gpa|grade|advisor|advising|minor|major|concentration|track|option|pathway|emphasis|all students|select|choose|complete|maintain|earn|satisfy|fulfill|submit|apply|consult|contact|check|see|refer|visit|upon|subject|pending|with a|at least|or higher|or above|no later|prior to|in addition|such as|including|department|college|school|office|approval|permission|written|hours from|credit hours|total hours|hours of)/i,
    /^[\-\*\u2022]\s*(minimum|students|gpa|must|all|complete|maintain|select|choose|earn|at least)/i,
    /^(https?:\/\/|www\.)/i,
    /^\(?\d+[-–]\d+\s*(credits?|hrs?)\)?$/i,
    /^[A-Z]{2,5}\s*\d{3,4}\s*$/i, // bare course codes without names
  ];

  for (const line of lines) {
    // Check semester header
    if (semesterPattern.test(line) || /^(year\s*\d|sem\s*\d)/i.test(line)) {
      current = { label: line, courses: [] };
      semesters.push(current);
      continue;
    }

    // Should we skip this line?
    if (skipPatterns.some(p => p.test(line))) continue;
    if (line.length < 4) continue;
    // Skip lines that are mostly numbers/punctuation
    if (line.replace(/[^a-zA-Z]/g, "").length < 3) continue;
    // Skip lines with too many commas (likely a list of requirements)
    if ((line.match(/,/g) || []).length > 3) continue;

    if (current) {
      current.courses.push({ name: line, completed: false });
    } else {
      current = { label: "Courses", courses: [] };
      semesters.push(current);
      current.courses.push({ name: line, completed: false });
    }
  }

  return semesters.filter(s => s.courses.length > 0);
}

/* ─── Main Component ────────────────────────────── */

export default function OnboardingPage() {
  const router = useRouter();
  const [cvStep, setCvStep] = useState<"upload" | "loading" | "profile">("upload");
  const [subStep, setSubStep] = useState<SubStep>("academic");
  const [loadingIndex, setLoadingIndex] = useState(0);
  const [profile, setProfile] = useState<Profile>(emptyProfile);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [aiSuggesting, setAiSuggesting] = useState(false);

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
    if (cvStep !== "loading" && !generating) return;
    const messages = generating ? roadmapMessages : loadingMessages;
    const interval = window.setInterval(() => {
      setLoadingIndex(i => (i + 1) % messages.length);
    }, 1300);
    return () => window.clearInterval(interval);
  }, [cvStep, generating]);

  const progress = useMemo(() => {
    if (cvStep === "upload") return 5;
    if (cvStep === "loading") return 15;
    if (generating) return 90;
    const subSteps: SubStep[] = ["academic", "international", "career", "courses", "review"];
    const idx = subSteps.indexOf(subStep);
    return 25 + (idx / (subSteps.length - 1)) * 65;
  }, [cvStep, subStep, generating]);

  const currentMessages = generating ? roadmapMessages : loadingMessages;

  const handleAnalyzeCV = async () => {
    if (!selectedFile) return;
    setError("");
    setLoading(true);
    setCvStep("loading");

    try {
      const parseForm = new FormData();
      parseForm.append("file", selectedFile);
      const parseResponse = await fetch("/api/parse-resume", { method: "POST", body: parseForm });
      const parsed = await parseResponse.json();
      if (!parseResponse.ok) throw new Error(parsed.error || "Failed to parse resume");

      const extractResponse = await fetch("/api/extract-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rawText: parsed.text, fileName: selectedFile.name, fileSize: selectedFile.size }),
      });
      const extracted = await extractResponse.json();
      if (!extractResponse.ok) throw new Error(extracted.error || "Failed to extract profile");

      const mergedProfile = { ...emptyProfile, ...extracted.profile };
      setProfile(mergedProfile);
      userStorage.setItem("bluprint_profile_review", JSON.stringify(mergedProfile));
      userStorage.setItem("bluprint_cv_raw_text", parsed.text);
      userStorage.setItem("bluprint_cv_filename", selectedFile.name);
      setCvStep("profile");
      setSubStep("academic");
      setLoadingIndex(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setCvStep("upload");
    } finally {
      setLoading(false);
    }
  };

  const handleBuildRoadmap = async () => {
    setError("");
    setGenerating(true);

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

      // Also save profile to API for persistence
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      }).catch(() => {});

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build roadmap.");
      setGenerating(false);
      setSubStep("review");
    }
  };

  const mandatoryValid = Boolean(
    profile.name.trim() && profile.university.trim() && profile.degree.trim() &&
    profile.yearOfStudy.trim() && profile.graduating.trim()
  );
  const careerValid = Boolean(profile.dreamRole.trim());

  const subSteps: SubStep[] = ["academic", "international", "career", "courses", "review"];
  const subStepIndex = subSteps.indexOf(subStep);
  const nextSubStep = () => { if (subStepIndex < subSteps.length - 1) { setSubStep(subSteps[subStepIndex + 1]); window.scrollTo(0, 0); } };
  const prevSubStep = () => { if (subStepIndex > 0) { setSubStep(subSteps[subStepIndex - 1]); window.scrollTo(0, 0); } else setCvStep("upload"); };

  // Get role suggestions based on degree
  const roleSuggestions = useMemo(() => {
    const d = profile.degree.toLowerCase();
    for (const [key, roles] of Object.entries(ROLE_SUGGESTIONS)) {
      if (d.includes(key.toLowerCase())) return roles;
    }
    return ROLE_SUGGESTIONS.default;
  }, [profile.degree]);

  const skillSuggestions = useMemo(() => {
    const r = profile.dreamRole;
    for (const [key, skills] of Object.entries(SKILL_SUGGESTIONS)) {
      if (r.toLowerCase().includes(key.toLowerCase())) return skills.filter(s => !profile.skills.includes(s));
    }
    return SKILL_SUGGESTIONS.default.filter(s => !profile.skills.includes(s));
  }, [profile.dreamRole, profile.skills]);

  const subStepLabels: Record<SubStep, string> = {
    academic: "Academic", international: "Background", career: "Career", courses: "Courses", review: "Review",
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Progress bar */}
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-[var(--accent)]/10">
        <div className="h-full bg-[var(--accent)] transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {/* Top nav */}
      {cvStep !== "loading" && !generating && (
        <div className="max-w-4xl mx-auto flex items-center justify-between pt-8 px-6 animate-fade-up">
          <button
            onClick={() => { if (cvStep === "profile") prevSubStep(); }}
            className="group inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            disabled={loading || cvStep === "upload"}
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
          {cvStep === "profile" ? (
            <div className="flex items-center gap-1">
              {subSteps.map((ss, i) => (
                <button key={ss} onClick={() => setSubStep(ss)}
                  className={`px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wider transition-all ${
                    ss === subStep ? "bg-[var(--foreground)] text-white"
                      : i < subStepIndex ? "text-[var(--accent)] hover:bg-[var(--accent-light)]"
                      : "text-[var(--muted)] hover:bg-[var(--background-secondary)]"
                  }`}>{subStepLabels[ss]}</button>
              ))}
            </div>
          ) : (
            <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">Getting started</p>
          )}
        </div>
      )}

      {/* ─── CV Upload ─── */}
      {cvStep === "upload" && (
        <section className="flex min-h-screen items-center justify-center px-4 animate-fade-up">
          <div className="w-full max-w-2xl text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--accent-light)] text-[var(--accent)] mb-8">
              <Upload size={24} />
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
                  <div><p className="text-xl font-semibold">Drop your CV here</p><p className="text-sm text-[var(--muted)] mt-1">PDF or Word document</p></div>
                </div>
              )}
              <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
            </label>

            <button onClick={handleAnalyzeCV} disabled={!selectedFile || loading}
              className="mt-10 btn-primary h-12 px-12 text-[15px] w-full sm:w-auto">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Analyze my background"}
            </button>

            {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}

            <div className="mt-12 flex flex-col items-center gap-6 text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] sm:flex-row sm:justify-center">
              <span className="flex items-center gap-2"><Check size={12} className="text-[var(--accent)]" /> Encrypted Data</span>
              <span className="flex items-center gap-2"><Check size={12} className="text-[var(--accent)]" /> Real-time AI</span>
              <span className="flex items-center gap-2"><Check size={12} className="text-[var(--accent)]" /> Direct Roadmap</span>
            </div>

            <button onClick={() => { setCvStep("profile"); setSubStep("academic"); }}
              className="mt-12 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] underline underline-offset-4 transition-colors">
              I don&apos;t have a CV yet &middot; Start manually
            </button>
          </div>
        </section>
      )}

      {/* ─── Loading screens ─── */}
      {(cvStep === "loading" || generating) && (
        <section className="flex min-h-screen items-center justify-center px-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3">
              {[0, 1, 2].map(dot => (
                <motion.span key={dot}
                  animate={{ scale: loadingIndex % 3 === dot ? 1.2 : 0.8, opacity: loadingIndex % 3 === dot ? 1 : 0.3 }}
                  className="h-3 w-3 rounded-full bg-[var(--accent)]" />
              ))}
            </div>
            <p className="mt-8 text-lg font-semibold animate-pulse">{currentMessages[loadingIndex]}</p>
            {error && <p className="mt-4 text-sm font-medium text-red-500">{error}</p>}
          </div>
        </section>
      )}

      {/* ─── Profile Builder ─── */}
      {cvStep === "profile" && !generating && (
        <section className="max-w-2xl mx-auto pb-40 pt-10 px-6 animate-fade-up" key={subStep}>

          {/* ── Academic ── */}
          {subStep === "academic" && (
            <>
              <SectionHeader icon={<GraduationCap size={20} />} title="Academic details"
                subtitle="Fields marked with * are required." />

              <div className="space-y-6">
                <div className="surface-card p-6 space-y-5">
                  <FormField label="Full name" required value={profile.name}
                    onChange={v => setProfile({ ...profile, name: v })} placeholder="Your full name" />

                  <FormField label="University" required value={profile.university}
                    onChange={v => setProfile({ ...profile, university: v })} placeholder="e.g. University of Michigan" />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Degree / Major" required value={profile.degree}
                      onChange={v => setProfile({ ...profile, degree: v })} placeholder="e.g. B.S. Computer Science" />
                    <FormField label="Minor(s)" value={profile.minor}
                      onChange={v => setProfile({ ...profile, minor: v })} placeholder="e.g. Mathematics" />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-3">
                    <ChipSelect label="Year of study" required options={YEAR_OPTIONS}
                      value={profile.yearOfStudy}
                      onChange={v => setProfile({ ...profile, yearOfStudy: v })} />
                    <ChipSelect label="Graduating" required options={GRAD_OPTIONS.slice(0, 8)}
                      value={profile.graduating}
                      onChange={v => setProfile({ ...profile, graduating: v })} />
                    <FormField label="GPA" value={profile.gpa}
                      onChange={v => setProfile({ ...profile, gpa: v })} placeholder="e.g. 3.5" />
                  </div>

                  <ToggleRow label="Student type" required options={["Domestic", "International"]}
                    value={profile.studentType}
                    onChange={v => setProfile({ ...profile, studentType: v })} />
                </div>

                {profile.education.length > 0 && (
                  <div className="surface-card p-6">
                    <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)] mb-4">Education (from CV)</h2>
                    <div className="space-y-3">
                      {profile.education.map((ed, i) => (
                        <div key={i} className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-secondary)]">
                          <p className="text-sm font-semibold">{ed.degree}</p>
                          <p className="text-xs text-[var(--muted)]">{ed.institution} &middot; {ed.years}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <BottomBar canContinue={mandatoryValid} onContinue={nextSubStep}
                hint={!mandatoryValid ? "Fill in all required fields to continue" : undefined} />
            </>
          )}

          {/* ── International / Background ── */}
          {subStep === "international" && (
            <>
              <SectionHeader icon={<Globe size={20} />} title="Your background"
                subtitle={profile.studentType === "International"
                  ? "Helps us tailor visa timelines, CPT/OPT guidance, and sponsorship info."
                  : "All fields here are optional. They help personalize your roadmap."} />

              <div className="space-y-6">
                <div className="surface-card p-6 space-y-5">
                  {profile.studentType === "International" ? (
                    <>
                      <ChipSelect label="Country of origin" required
                        options={COUNTRY_OPTIONS} value={profile.countryOfOrigin}
                        onChange={v => setProfile({ ...profile, countryOfOrigin: v })}
                        searchable />

                      <div>
                        <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-3 block">Visa status</label>
                        <div className="flex flex-wrap gap-2">
                          {["F-1", "J-1", "H-1B", "OPT", "CPT", "Other", "Not sure"].map(opt => (
                            <button key={opt} onClick={() => setProfile({ ...profile, visaStatus: opt })}
                              className={`rounded-xl px-4 py-2.5 text-xs font-medium transition-all ${
                                profile.visaStatus === opt ? "bg-[var(--foreground)] text-white" : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]"
                              }`}>{opt}</button>
                          ))}
                        </div>
                      </div>

                      <ToggleRow label="Need employer sponsorship?" options={["Yes", "No", "Not sure"]}
                        value={profile.sponsorshipNeeded}
                        onChange={v => setProfile({ ...profile, sponsorshipNeeded: v })} />
                    </>
                  ) : (
                    <ChipSelect label="Country of origin" options={COUNTRY_OPTIONS}
                      value={profile.countryOfOrigin}
                      onChange={v => setProfile({ ...profile, countryOfOrigin: v })} searchable />
                  )}

                  <TagInput label="Languages spoken" items={profile.languages}
                    onChange={items => setProfile({ ...profile, languages: items })}
                    suggestions={["English", "Spanish", "Mandarin", "Hindi", "French", "Arabic", "Korean", "Japanese", "German", "Portuguese", "Georgian", "Russian"]}
                    placeholder="Add language..." />
                </div>

                {profile.experiences.length > 0 && (
                  <div className="surface-card p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)]">Work History (from CV)</h2>
                      <span className="text-[10px] font-medium text-[var(--muted)]">{profile.experiences.length} identified</span>
                    </div>
                    <div className="space-y-3">
                      {profile.experiences.map((item, i) => (
                        <div key={i} className="rounded-xl border border-[var(--border)] p-4 bg-[var(--surface-secondary)]">
                          <p className="font-semibold text-sm">{item.title} at {item.company}</p>
                          <p className="text-[11px] font-medium text-[var(--muted)] mt-1">{item.duration}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <BottomBar canContinue onContinue={nextSubStep} />
            </>
          )}

          {/* ── Career Goals ── */}
          {subStep === "career" && (
            <>
              <SectionHeader icon={<Briefcase size={20} />} title="Career goals"
                subtitle="bluprint uses this to target your roadmap milestones and suggest actions." />

              <div className="space-y-6">
                <div className="surface-card p-6 space-y-5">
                  {/* Dream role with AI suggestions */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
                      Dream role <span className="text-red-400">*</span>
                    </label>
                    <input className="w-full h-11 rounded-xl border border-[var(--border)] bg-transparent px-4 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
                      value={profile.dreamRole}
                      onChange={e => setProfile({ ...profile, dreamRole: e.target.value })}
                      placeholder="e.g. Software Engineer, Investment Banker..." />
                    {!profile.dreamRole && (
                      <div className="pt-1">
                        <p className="text-[10px] font-medium text-[var(--accent)] mb-2 flex items-center gap-1">
                          <Sparkles size={10} /> Suggestions based on your major
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {roleSuggestions.map(r => (
                            <button key={r} onClick={() => setProfile({ ...profile, dreamRole: r })}
                              className="rounded-lg bg-[var(--accent-light)] px-3 py-1.5 text-[11px] font-medium text-[var(--accent)] hover:bg-[var(--accent)] hover:text-white transition-all">
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <TagInput label="Target industries" items={profile.targetIndustries ? profile.targetIndustries.split(", ").filter(Boolean) : []}
                    onChange={items => setProfile({ ...profile, targetIndustries: items.join(", ") })}
                    suggestions={INDUSTRY_OPTIONS} placeholder="Add industry..." />

                  <FormField label="Target companies" value={profile.targetCompanies}
                    onChange={v => setProfile({ ...profile, targetCompanies: v })}
                    placeholder="e.g. Google, Goldman Sachs, McKinsey..." />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="Preferred work locations" value={profile.preferredLocations}
                      onChange={v => setProfile({ ...profile, preferredLocations: v })}
                      placeholder="e.g. New York, San Francisco..." />
                    <ToggleRow label="Willing to relocate?" options={["Yes", "No", "Maybe"]}
                      value={profile.willingToRelocate}
                      onChange={v => setProfile({ ...profile, willingToRelocate: v })} />
                  </div>
                </div>

                <div className="surface-card p-6 space-y-5">
                  <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)]">Online presence</h2>
                  <div className="grid gap-5 sm:grid-cols-2">
                    <FormField label="LinkedIn URL" value={profile.linkedinUrl}
                      onChange={v => setProfile({ ...profile, linkedinUrl: v })} placeholder="linkedin.com/in/..." />
                    <FormField label="Portfolio / Website" value={profile.portfolioUrl}
                      onChange={v => setProfile({ ...profile, portfolioUrl: v })} placeholder="yoursite.com" />
                  </div>
                </div>

                <div className="surface-card p-6 space-y-5">
                  {/* Skills with smart suggestions */}
                  <TagInput label="Skills" items={profile.skills}
                    onChange={items => setProfile({ ...profile, skills: items })}
                    suggestions={skillSuggestions} placeholder="Add skill..." />

                  <TagInput label="Certifications" items={profile.certifications}
                    onChange={items => setProfile({ ...profile, certifications: items })}
                    placeholder="Add certification..." />

                  <TagInput label="Extracurriculars" items={profile.extracurriculars}
                    onChange={items => setProfile({ ...profile, extracurriculars: items })}
                    placeholder="Add activity..." />
                </div>
              </div>

              <BottomBar canContinue={careerValid} onContinue={nextSubStep}
                hint={!careerValid ? "Enter your dream role to continue" : undefined} />
            </>
          )}

          {/* ── Course Schedule ── */}
          {subStep === "courses" && (
            <CourseScheduleStep profile={profile} setProfile={setProfile} onContinue={nextSubStep} />
          )}

          {/* ── Review ── */}
          {subStep === "review" && (
            <>
              <SectionHeader icon={<Check size={20} />} title="Review your profile"
                subtitle="Everything look good? We'll generate your personalized career roadmap." />

              {error && <p className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm font-medium text-red-600">{error}</p>}

              <div className="space-y-4">
                <ReviewSection title="Academic" icon={<GraduationCap size={14} />} onEdit={() => setSubStep("academic")}
                  items={[
                    ["Name", profile.name], ["University", profile.university],
                    ["Degree", profile.degree], ...(profile.minor ? [["Minor", profile.minor]] : []),
                    ["Year", profile.yearOfStudy], ["Graduating", profile.graduating],
                    ...(profile.gpa ? [["GPA", profile.gpa]] : []), ["Type", profile.studentType],
                  ] as [string, string][]} />

                <ReviewSection title="Background" icon={<Globe size={14} />} onEdit={() => setSubStep("international")}
                  items={[
                    ...(profile.countryOfOrigin ? [["Country", profile.countryOfOrigin]] : []),
                    ...(profile.visaStatus ? [["Visa", profile.visaStatus]] : []),
                    ...(profile.sponsorshipNeeded ? [["Sponsorship", profile.sponsorshipNeeded]] : []),
                    ...(profile.languages.length ? [["Languages", profile.languages.join(", ")]] : []),
                  ] as [string, string][]} />

                <ReviewSection title="Career" icon={<Briefcase size={14} />} onEdit={() => setSubStep("career")}
                  items={[
                    ["Dream role", profile.dreamRole],
                    ...(profile.targetIndustries ? [["Industries", profile.targetIndustries]] : []),
                    ...(profile.targetCompanies ? [["Companies", profile.targetCompanies]] : []),
                    ...(profile.preferredLocations ? [["Locations", profile.preferredLocations]] : []),
                    ...(profile.skills.length ? [["Skills", profile.skills.join(", ")]] : []),
                    ...(profile.certifications.length ? [["Certifications", profile.certifications.join(", ")]] : []),
                  ] as [string, string][]} />

                {profile.courseSchedule.length > 0 && (
                  <ReviewSection title="Courses" icon={<BookOpen size={14} />} onEdit={() => setSubStep("courses")}
                    items={profile.courseSchedule.map(sem => [
                      sem.label, `${sem.courses.filter(c => c.completed).length}/${sem.courses.length} completed`,
                    ])} />
                )}
              </div>

              <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl z-40">
                <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 py-5 px-6">
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold">Ready to proceed?</span>
                    <p className="text-xs text-[var(--muted)]">We&apos;ll generate your roadmap based on these details.</p>
                  </div>
                  <button onClick={handleBuildRoadmap}
                    disabled={!mandatoryValid || !careerValid || loading}
                    className="btn-primary h-12 px-10 text-[15px] w-full sm:w-auto flex items-center gap-2">
                    <Sparkles size={16} /> Generate my roadmap
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

/* ─── Course Schedule Step ──────────────────────── */

function CourseScheduleStep({ profile, setProfile, onContinue }: {
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
      si === semIdx ? { ...sem, courses: sem.courses.map((c, ci) => ci === courseIdx ? { ...c, completed: !c.completed } : c) } : sem
    );
    setParsed(next);
    setProfile(p => ({ ...p, courseSchedule: next }));
  };

  const removeCourse = (semIdx: number, courseIdx: number) => {
    const next = parsed.map((sem, si) =>
      si === semIdx ? { ...sem, courses: sem.courses.filter((_, ci) => ci !== courseIdx) } : sem
    ).filter(s => s.courses.length > 0);
    setParsed(next);
    setProfile(p => ({ ...p, courseSchedule: next }));
  };

  const totalCourses = parsed.reduce((sum, s) => sum + s.courses.length, 0);
  const completedCourses = parsed.reduce((sum, s) => sum + s.courses.filter(c => c.completed).length, 0);

  return (
    <>
      <SectionHeader icon={<BookOpen size={20} />} title="Course schedule"
        subtitle="Paste your 4-year sample plan from your university website. Check off what you've completed." />

      {!isParsed ? (
        <div className="space-y-6">
          <div className="surface-card p-6">
            <div className="flex items-center gap-2 mb-4">
              <ClipboardPaste size={14} className="text-[var(--accent)]" />
              <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)]">Paste your course plan</h2>
            </div>
            <p className="text-xs text-[var(--muted)] mb-4">
              Go to your university&apos;s website, find the sample 4-year plan for your major, select all, and paste below.
              Non-course items (requirements, credit totals, etc.) will be filtered out automatically.
            </p>
            <textarea value={rawText} onChange={e => setRawText(e.target.value)}
              placeholder={`Example:\n\nFall Semester 1\nIntro to Computer Science\nCalculus I\nEnglish Composition\nGeneral Chemistry\n\nSpring Semester 1\nData Structures\nCalculus II\nPhysics I`}
              className="w-full h-64 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all resize-none font-mono" />
            <button onClick={handleParse} disabled={!rawText.trim()}
              className="mt-4 btn-primary h-11 px-8 text-sm w-full sm:w-auto">
              Parse course schedule
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="surface-card p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{completedCourses} of {totalCourses} courses completed</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{parsed.length} semesters &middot; Click to check off, hover to remove non-courses</p>
            </div>
            <div className="w-32 h-2 rounded-full bg-[var(--background-secondary)] overflow-hidden">
              <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                style={{ width: totalCourses ? `${(completedCourses / totalCourses) * 100}%` : "0%" }} />
            </div>
          </div>

          {parsed.map((sem, si) => {
            const semCompleted = sem.courses.filter(c => c.completed).length;
            return (
              <div key={si} className="surface-card p-0 overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-[var(--surface-secondary)] border-b border-[var(--border)]">
                  <h3 className="text-xs font-semibold uppercase tracking-wider">{sem.label}</h3>
                  <span className="text-[10px] font-medium text-[var(--muted)]">{semCompleted}/{sem.courses.length}</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {sem.courses.map((course, ci) => (
                    <div key={ci} className="group flex items-center gap-3 px-5 py-3 hover:bg-[var(--surface-secondary)] transition-colors">
                      <button onClick={() => toggleCourse(si, ci)}
                        className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                          course.completed ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "border-[var(--border)]"
                        }`}>
                        {course.completed && <Check size={12} />}
                      </button>
                      <span className={`text-sm flex-1 ${course.completed ? "line-through text-[var(--muted)]" : ""}`}>{course.name}</span>
                      <button onClick={() => removeCourse(si, ci)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-md text-[var(--muted)] hover:text-red-500 hover:bg-red-50 transition-all"
                        title="Remove (not a course)">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <button onClick={() => setIsParsed(false)}
            className="text-xs font-medium text-[var(--muted)] hover:text-[var(--foreground)] underline underline-offset-4 transition-colors">
            Re-paste schedule
          </button>
        </div>
      )}

      <BottomBar canContinue onContinue={onContinue} label={isParsed ? "Continue" : "Skip this step"} />
    </>
  );
}

/* ─── Reusable Components ───────────────────────── */

function SectionHeader({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <header className="mb-10">
      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--accent-light)] text-[var(--accent)] mb-4">{icon}</div>
      <h1 className="text-[2rem] font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-[var(--muted)]">{subtitle}</p>
    </header>
  );
}

function FormField({ label, required, value, onChange, placeholder }: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input className="w-full h-11 rounded-xl border border-[var(--border)] bg-transparent px-4 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
        value={value || ""} onChange={e => onChange(e.target.value)} placeholder={placeholder} />
    </div>
  );
}

function ToggleRow({ label, required, options, value, onChange }: {
  label: string; required?: boolean; options: string[]; value: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-3 block">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <div className="flex gap-2">
        {options.map(opt => (
          <button key={opt} onClick={() => onChange(opt)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-medium transition-all ${
              value === opt ? "bg-[var(--foreground)] text-white shadow-md" : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]"
            }`}>{opt}</button>
        ))}
      </div>
    </div>
  );
}

function ChipSelect({ label, required, options, value, onChange, searchable }: {
  label: string; required?: boolean; options: string[]; value: string; onChange: (v: string) => void; searchable?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = searchable && search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <div className="space-y-1.5 relative">
      <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <button onClick={() => setOpen(!open)}
        className={`w-full h-11 rounded-xl border px-4 text-sm text-left outline-none transition-all flex items-center justify-between ${
          value ? "border-[var(--accent)] bg-[var(--accent-light)]/30 font-medium" : "border-[var(--border)] text-[var(--muted)]"
        }`}>
        <span>{value || "Select..."}</span>
        <ChevronRight size={14} className={`text-[var(--muted)] transition-transform ${open ? "rotate-90" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="absolute z-50 top-full left-0 right-0 mt-1 bg-[var(--surface)] border border-[var(--border)] rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {searchable && (
              <div className="p-2 border-b border-[var(--border)]">
                <div className="relative">
                  <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                  <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search..." className="w-full h-9 rounded-lg bg-[var(--surface-secondary)] pl-8 pr-3 text-xs outline-none" />
                </div>
              </div>
            )}
            {filtered.map(opt => (
              <button key={opt} onClick={() => { onChange(opt); setOpen(false); setSearch(""); }}
                className={`w-full text-left px-4 py-2.5 text-xs font-medium transition-colors hover:bg-[var(--surface-secondary)] ${
                  opt === value ? "text-[var(--accent)] bg-[var(--accent-light)]/30" : ""
                }`}>{opt}</button>
            ))}
            {searchable && filtered.length === 0 && search && (
              <button onClick={() => { onChange(search); setOpen(false); setSearch(""); }}
                className="w-full text-left px-4 py-2.5 text-xs font-medium text-[var(--accent)]">
                Use &quot;{search}&quot;
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TagInput({ label, items, onChange, suggestions, placeholder }: {
  label: string; items: string[]; onChange: (items: string[]) => void; suggestions?: string[]; placeholder?: string;
}) {
  const [draft, setDraft] = useState("");
  const unusedSuggestions = suggestions?.filter(s => !items.includes(s)).slice(0, 6) || [];

  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)] mb-3 block">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {items.map(item => (
          <button key={item} onClick={() => onChange(items.filter(v => v !== item))}
            className="group inline-flex items-center gap-1.5 rounded-xl bg-[var(--background-secondary)] px-3.5 py-2 text-xs font-medium hover:bg-red-50 hover:text-red-500 transition-all">
            {item} <X size={12} className="opacity-40 group-hover:opacity-100" />
          </button>
        ))}
      </div>
      {unusedSuggestions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {unusedSuggestions.map(s => (
            <button key={s} onClick={() => onChange([...items, s])}
              className="rounded-lg border border-dashed border-[var(--border)] px-3 py-1.5 text-[11px] font-medium text-[var(--muted)] hover:border-[var(--accent)] hover:text-[var(--accent)] hover:bg-[var(--accent-light)] transition-all flex items-center gap-1">
              <Plus size={10} /> {s}
            </button>
          ))}
        </div>
      )}
      <form onSubmit={e => { e.preventDefault(); const v = draft.trim(); if (!v || items.includes(v)) return; onChange([...items, v]); setDraft(""); }}>
        <input value={draft} onChange={e => setDraft(e.target.value)} placeholder={placeholder}
          className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-xs font-medium outline-none focus:border-[var(--accent)] transition-all" />
      </form>
    </div>
  );
}

function ReviewSection({ title, icon, onEdit, items }: {
  title: string; icon: React.ReactNode; onEdit: () => void; items: [string, string][];
}) {
  if (items.length === 0) return null;
  return (
    <div className="surface-card p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">{icon}
          <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{title}</h3>
        </div>
        <button onClick={onEdit} className="text-[10px] font-medium text-[var(--accent)] hover:underline">Edit</button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map(([label, value], i) => (
          <div key={i}><p className="text-[10px] uppercase tracking-wider text-[var(--muted)]">{label}</p>
            <p className="text-sm font-medium mt-0.5">{value || "\u2014"}</p></div>
        ))}
      </div>
    </div>
  );
}

function BottomBar({ canContinue, onContinue, hint, label }: {
  canContinue: boolean; onContinue: () => void; hint?: string; label?: string;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl z-40">
      <div className="max-w-4xl mx-auto flex items-center justify-between py-5 px-6">
        {hint ? <p className="text-xs text-[var(--muted)]">{hint}</p> : <div />}
        <button onClick={onContinue} disabled={!canContinue}
          className="btn-primary h-11 px-8 text-sm flex items-center gap-2">
          {label || "Continue"} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
