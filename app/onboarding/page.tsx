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

const UNIVERSITY_OPTIONS = [
  "MIT", "Stanford University", "Harvard University", "Yale University", "Princeton University",
  "Columbia University", "University of Pennsylvania", "Cornell University", "Brown University",
  "Duke University", "Northwestern University", "University of Chicago", "Johns Hopkins University",
  "UC Berkeley", "UCLA", "UC San Diego", "UC Davis", "UC Irvine",
  "University of Michigan", "University of Virginia", "Georgia Tech", "Carnegie Mellon University",
  "University of Texas at Austin", "University of Florida", "Penn State", "Ohio State University",
  "University of Illinois Urbana-Champaign", "University of Wisconsin-Madison",
  "University of Washington", "University of North Carolina", "NYU", "Boston University",
  "University of Southern California", "Purdue University", "Indiana University",
  "Michigan State University", "Arizona State University", "University of Arizona",
  "University of Colorado Boulder", "University of Maryland", "Rutgers University",
  "University of Minnesota", "University of Pittsburgh", "Northeastern University",
  "George Washington University", "American University", "Emory University",
  "Vanderbilt University", "Rice University", "University of Notre Dame",
  "Tulane University", "University of Miami", "Florida State University",
  "Texas A&M University", "University of Georgia", "Clemson University",
  "Virginia Tech", "Wake Forest University", "Lehigh University",
  "Worcester Polytechnic Institute", "RPI", "Drexel University",
  "Illinois Institute of Technology", "Stevens Institute of Technology",
];

const DEGREE_OPTIONS = [
  "B.S. Computer Science", "B.A. Computer Science", "B.S. Data Science",
  "B.S. Information Technology", "B.S. Software Engineering", "B.S. Cybersecurity",
  "B.S. Electrical Engineering", "B.S. Mechanical Engineering", "B.S. Civil Engineering",
  "B.S. Chemical Engineering", "B.S. Biomedical Engineering", "B.S. Aerospace Engineering",
  "B.S. Industrial Engineering", "B.S. Environmental Engineering",
  "B.A. Business Administration", "B.S. Business Administration", "B.B.A. Finance",
  "B.B.A. Marketing", "B.B.A. Management", "B.B.A. Accounting",
  "B.S. Economics", "B.A. Economics", "B.S. Mathematics", "B.A. Mathematics",
  "B.S. Statistics", "B.S. Physics", "B.S. Chemistry", "B.S. Biology",
  "B.A. Psychology", "B.A. Political Science", "B.A. International Relations",
  "B.A. English", "B.A. History", "B.A. Communications", "B.A. Journalism",
  "B.A. Sociology", "B.A. Philosophy", "B.A. Art History",
  "B.F.A. Graphic Design", "B.F.A. Film", "B.A. Music",
  "B.S. Nursing", "B.S. Public Health", "B.A. Pre-Med",
  "M.S. Computer Science", "M.B.A.", "M.S. Data Science",
  "M.S. Finance", "M.A. Economics", "M.S. Engineering",
  "Ph.D. Computer Science", "Ph.D. Engineering", "Ph.D. Economics",
  "J.D. (Law)", "M.D. (Medicine)",
];

const INDUSTRY_OPTIONS = [
  "Technology", "Finance", "Consulting", "Healthcare", "Education",
  "Marketing", "Engineering", "Law", "Media", "Government",
  "Nonprofit", "Real Estate", "Energy", "Retail", "Pharma",
];

const ROLE_SUGGESTIONS: Record<string, string[]> = {
  "Computer Science": ["Software Engineer", "Data Scientist", "Product Manager", "ML Engineer", "DevOps Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer"],
  "Data Science": ["Data Scientist", "Data Analyst", "ML Engineer", "Data Engineer", "Business Intelligence Analyst"],
  "Business": ["Management Consultant", "Investment Banker", "Product Manager", "Business Analyst", "Marketing Manager", "Operations Manager"],
  "Finance": ["Investment Banker", "Financial Analyst", "Quantitative Analyst", "Portfolio Manager", "Risk Analyst", "Private Equity Analyst"],
  "Accounting": ["Auditor", "Tax Consultant", "Financial Controller", "Forensic Accountant", "CPA"],
  "Marketing": ["Marketing Manager", "Brand Strategist", "Digital Marketing Specialist", "Content Strategist", "Growth Marketing"],
  "Engineering": ["Mechanical Engineer", "Civil Engineer", "Systems Engineer", "Project Manager", "R&D Engineer"],
  "Electrical Engineering": ["Electrical Engineer", "Hardware Engineer", "Embedded Systems Engineer", "Controls Engineer"],
  "Economics": ["Economic Analyst", "Management Consultant", "Data Analyst", "Policy Analyst", "Investment Banker"],
  "Biology": ["Research Scientist", "Biotech Analyst", "Medical Writer", "Lab Manager", "Clinical Research Associate"],
  "Psychology": ["UX Researcher", "HR Specialist", "Clinical Psychologist", "Data Analyst", "Behavioral Scientist"],
  "Mathematics": ["Quantitative Analyst", "Data Scientist", "Actuary", "Software Engineer", "Research Scientist"],
  "Political Science": ["Policy Analyst", "Government Affairs", "Lobbyist", "Campaign Manager", "Foreign Service Officer"],
  "Communications": ["PR Specialist", "Social Media Manager", "Content Creator", "Journalist", "Communications Director"],
  "Nursing": ["Registered Nurse", "Nurse Practitioner", "Clinical Nurse Specialist", "Healthcare Administrator"],
  "Pre-Med": ["Physician", "Surgeon", "Medical Researcher", "Public Health Specialist"],
  "default": ["Software Engineer", "Management Consultant", "Data Analyst", "Product Manager", "Financial Analyst", "Marketing Manager"],
};

const SKILL_SUGGESTIONS: Record<string, string[]> = {
  "Software Engineer": ["Python", "JavaScript", "React", "Node.js", "SQL", "Git", "AWS", "Docker", "System Design", "TypeScript"],
  "Data Scientist": ["Python", "R", "SQL", "TensorFlow", "Pandas", "Statistics", "Machine Learning", "Tableau", "Jupyter"],
  "Product Manager": ["User Research", "Agile/Scrum", "SQL", "Wireframing", "A/B Testing", "Roadmapping", "Analytics", "Figma"],
  "Investment Banker": ["Financial Modeling", "Excel", "PowerPoint", "Valuation", "DCF Analysis", "M&A", "Bloomberg", "Capital Markets"],
  "Management Consultant": ["PowerPoint", "Excel", "Case Studies", "Data Analysis", "Strategy", "Market Research", "Stakeholder Management"],
  "Financial Analyst": ["Excel", "Financial Modeling", "SQL", "Bloomberg", "Valuation", "Forecasting", "VBA"],
  "Data Analyst": ["SQL", "Excel", "Python", "Tableau", "Power BI", "Statistics", "Data Visualization"],
  "Marketing Manager": ["Google Analytics", "SEO/SEM", "Social Media", "Content Strategy", "A/B Testing", "HubSpot", "Copywriting"],
  "UX Researcher": ["User Interviews", "Surveys", "Usability Testing", "Figma", "Affinity Mapping", "Journey Mapping"],
  "default": ["Excel", "PowerPoint", "Communication", "Leadership", "Teamwork", "Problem Solving", "Data Analysis", "Python"],
};

const COMPANY_SUGGESTIONS: Record<string, string[]> = {
  "Technology": ["Google", "Apple", "Microsoft", "Amazon", "Meta", "Netflix", "Uber", "Airbnb", "Stripe", "Salesforce"],
  "Finance": ["Goldman Sachs", "JPMorgan", "Morgan Stanley", "BlackRock", "Citadel", "Two Sigma", "Jane Street", "Bank of America"],
  "Consulting": ["McKinsey", "BCG", "Bain", "Deloitte", "Accenture", "EY-Parthenon", "PwC", "KPMG", "Oliver Wyman"],
  "Healthcare": ["Johnson & Johnson", "Pfizer", "UnitedHealth", "Mayo Clinic", "Kaiser", "Abbott", "Medtronic"],
  "default": ["Google", "Goldman Sachs", "McKinsey", "Amazon", "JPMorgan", "Deloitte", "Apple", "Microsoft"],
};

const COUNTRY_OPTIONS = [
  "India", "China", "South Korea", "Nigeria", "Brazil", "Turkey",
  "Vietnam", "Japan", "Saudi Arabia", "Mexico", "Canada", "UK",
  "Germany", "France", "Pakistan", "Bangladesh", "Nepal", "Iran",
  "Taiwan", "Indonesia", "Georgia", "Colombia", "Egypt", "Kenya",
  "Thailand", "Philippines", "Malaysia", "Sri Lanka", "Ethiopia",
  "Ghana", "Morocco", "Argentina", "Chile", "Peru", "Russia",
  "Ukraine", "Poland", "Italy", "Spain", "Australia", "New Zealand",
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

  const companySuggestions = useMemo(() => {
    const industries = profile.targetIndustries ? profile.targetIndustries.split(", ").filter(Boolean) : [];
    const existing = profile.targetCompanies ? profile.targetCompanies.split(", ").filter(Boolean) : [];
    const companies = new Set<string>();
    for (const ind of industries) {
      for (const [key, list] of Object.entries(COMPANY_SUGGESTIONS)) {
        if (ind.toLowerCase().includes(key.toLowerCase())) list.forEach(c => companies.add(c));
      }
    }
    if (companies.size === 0) COMPANY_SUGGESTIONS.default.forEach(c => companies.add(c));
    return [...companies].filter(c => !existing.includes(c));
  }, [profile.targetIndustries, profile.targetCompanies]);

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
    <div className="relative min-h-screen overflow-hidden bg-[var(--background)]">
      <div
        className="pointer-events-none fixed inset-0 -z-0 bg-[radial-gradient(ellipse_100%_70%_at_50%_-15%,rgba(0,0,0,0.04),transparent_50%),radial-gradient(ellipse_60%_50%_at_100%_0%,rgba(37,99,235,0.06),transparent_45%)]"
        aria-hidden
      />

      {/* Progress */}
      <div className="fixed left-0 right-0 top-0 z-50 h-[3px] bg-[var(--border)]">
        <div
          className="h-full bg-[var(--accent)] transition-[width] duration-700 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Top nav */}
      {cvStep !== "loading" && !generating && (
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col gap-4 px-6 pt-8 sm:flex-row sm:items-center sm:justify-between animate-fade-up">
          <button
            onClick={() => { if (cvStep === "profile") prevSubStep(); }}
            className="group inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            disabled={loading || cvStep === "upload"}
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
          {cvStep === "profile" ? (
            <div className="flex max-w-full flex-wrap items-center justify-start gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface)]/85 p-1 shadow-[var(--shadow-sm)] backdrop-blur-md sm:justify-end">
              {subSteps.map((ss, i) => (
                <button key={ss} type="button" onClick={() => setSubStep(ss)}
                  className={`rounded-xl px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider transition-all ${
                    ss === subStep
                      ? "bg-[var(--accent)] text-white shadow-md shadow-blue-500/25"
                      : i < subStepIndex
                        ? "text-[var(--accent)] hover:bg-[var(--accent-light)]"
                        : "text-[var(--muted)] hover:bg-[var(--background-secondary)]"
                  }`}>{subStepLabels[ss]}</button>
              ))}
            </div>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)] shadow-[var(--shadow-sm)] backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent)]" /> Getting started
            </span>
          )}
        </div>
      )}

      {/* ─── CV Upload ─── */}
      {cvStep === "upload" && (
        <section className="relative z-10 flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-16 animate-fade-up">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-xl text-center"
          >
            <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[var(--surface)]/90 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)] shadow-[var(--shadow-sm)] backdrop-blur-sm">
              <Sparkles size={12} className="text-[var(--accent)]" /> Step 1 &middot; Your CV
            </p>
            <div className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-light)] to-[var(--accent-mid)] text-[var(--accent)] shadow-[var(--shadow-md)] ring-1 ring-[var(--accent)]/20">
              <Upload size={26} />
            </div>
            <h1 className="text-balance text-[2.25rem] font-semibold tracking-tight sm:text-[2.5rem]">
              Let&apos;s build your roadmap
            </h1>
            <p className="mx-auto mt-4 max-w-md text-pretty text-base leading-relaxed text-[var(--muted)]">
              Upload your CV and we&apos;ll extract your profile so you spend less time typing and more time planning.
            </p>

            <label className="group mt-10 block cursor-pointer">
              <div className="surface-card relative overflow-hidden rounded-2xl border-2 border-dashed border-[var(--border)] bg-[var(--surface)]/95 p-10 transition-all duration-300 hover:border-[var(--accent)]/50 hover:shadow-[var(--shadow-md)] sm:p-12">
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--accent-light)]/30 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                <div className="relative">
                  {selectedFile ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="rounded-full bg-emerald-500/10 p-3 text-emerald-600 ring-1 ring-emerald-500/20">
                        <Check size={24} />
                      </div>
                      <p className="font-semibold text-[var(--foreground)]">{selectedFile.name}</p>
                      <p className="text-xs text-[var(--muted)]">{Math.round(selectedFile.size / 1024)} KB</p>
                      <span className="mt-1 text-xs font-semibold text-[var(--accent)] underline decoration-[var(--accent)]/30 underline-offset-4">
                        Change file
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--muted)] shadow-inner transition-all duration-300 group-hover:border-[var(--accent)]/30 group-hover:bg-[var(--accent-light)] group-hover:text-[var(--accent)]">
                        <Upload size={28} />
                      </div>
                      <div>
                        <p className="text-lg font-semibold sm:text-xl">Drop your CV here</p>
                        <p className="mt-1.5 text-sm text-[var(--muted)]">PDF or Word &middot; Max ~10MB typical</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)} />
            </label>

            <button onClick={handleAnalyzeCV} disabled={!selectedFile || loading}
              className="mt-8 btn-primary h-12 min-w-[200px] px-10 text-[15px] disabled:opacity-50">
              {loading ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Analyze my background"}
            </button>

            {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

            <ul className="mx-auto mt-12 flex max-w-md flex-col gap-3 text-left text-xs text-[var(--muted)] sm:flex-row sm:justify-center sm:text-center">
              {[
                "Encrypted in transit",
                "AI-assisted extraction",
                "Edit everything after",
              ].map(text => (
                <li key={text} className="flex items-center justify-center gap-2 rounded-xl border border-[var(--border)]/80 bg-[var(--surface)]/60 px-3 py-2 backdrop-blur-sm sm:flex-1">
                  <Check size={12} className="shrink-0 text-[var(--accent)]" /> {text}
                </li>
              ))}
            </ul>

            <button type="button" onClick={() => { setCvStep("profile"); setSubStep("academic"); }}
              className="mt-10 text-sm font-medium text-[var(--muted)] transition-colors hover:text-[var(--accent)] underline underline-offset-4">
              I don&apos;t have a CV yet &middot; Start manually
            </button>
          </motion.div>
        </section>
      )}

      {/* ─── Loading screens ─── */}
      {(cvStep === "loading" || generating) && (
        <section className="relative z-10 flex min-h-screen items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="surface-card max-w-md px-10 py-12 text-center shadow-[var(--shadow-lg)]"
          >
            <div className="flex items-center justify-center gap-3">
              {[0, 1, 2].map(dot => (
                <motion.span key={dot}
                  animate={{ scale: loadingIndex % 3 === dot ? 1.25 : 0.85, opacity: loadingIndex % 3 === dot ? 1 : 0.28 }}
                  transition={{ type: "spring", stiffness: 400, damping: 24 }}
                  className="h-3 w-3 rounded-full bg-[var(--accent)] shadow-sm shadow-[var(--accent)]/25" />
              ))}
            </div>
            <p className="mt-8 text-lg font-semibold text-[var(--foreground)]">{currentMessages[loadingIndex]}</p>
            <p className="mt-2 text-xs text-[var(--muted)]">This usually takes a few seconds.</p>
            {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
          </motion.div>
        </section>
      )}

      {/* ─── Profile Builder ─── */}
      {cvStep === "profile" && !generating && (
        <section className="relative z-10 mx-auto max-w-2xl px-6 pb-40 pt-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={subStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.28, ease: [0.25, 0.46, 0.45, 0.94] }}
            >

          {/* ── Academic ── */}
          {subStep === "academic" && (
            <>
              <SectionHeader icon={<GraduationCap size={20} />} title="Academic details"
                subtitle="Fields marked with * are required." />

              <div className="space-y-6">
                <div className="surface-card p-6 space-y-5">
                  <FormField label="Full name" required value={profile.name}
                    onChange={v => setProfile({ ...profile, name: v })} placeholder="Your full name" />

                  <ChipSelect label="University" required options={UNIVERSITY_OPTIONS}
                    value={profile.university}
                    onChange={v => setProfile({ ...profile, university: v })} searchable />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <ChipSelect label="Degree / Major" required options={DEGREE_OPTIONS}
                      value={profile.degree}
                      onChange={v => setProfile({ ...profile, degree: v })} searchable />
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
                            <button key={opt} type="button" onClick={() => setProfile({ ...profile, visaStatus: opt })}
                              className={`rounded-xl px-4 py-2.5 text-xs font-medium transition-all ${
                                profile.visaStatus === opt
                                  ? "bg-[var(--accent)] text-white shadow-md shadow-blue-500/20"
                                  : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/40 hover:text-[var(--foreground)]"
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
                    <input className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
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

                  <TagInput label="Target companies"
                    items={profile.targetCompanies ? profile.targetCompanies.split(", ").filter(Boolean) : []}
                    onChange={items => setProfile({ ...profile, targetCompanies: items.join(", ") })}
                    suggestions={companySuggestions} placeholder="Add company..." />

                  <TagInput label="Preferred work locations"
                    items={profile.preferredLocations ? profile.preferredLocations.split(", ").filter(Boolean) : []}
                    onChange={items => setProfile({ ...profile, preferredLocations: items.join(", ") })}
                    suggestions={["New York", "San Francisco", "Seattle", "Austin", "Chicago", "Boston", "Los Angeles", "Washington DC", "Denver", "Atlanta", "Remote"]}
                    placeholder="Add location..." />

                  <ToggleRow label="Willing to relocate?" options={["Yes", "No", "Maybe"]}
                    value={profile.willingToRelocate}
                    onChange={v => setProfile({ ...profile, willingToRelocate: v })} />
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
                subtitle="Everything look good? We&apos;ll generate your personalized career roadmap." />

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

              <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/90 shadow-[0_-8px_30px_rgba(37,99,235,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--surface)]/75">
                <div className="mx-auto flex max-w-4xl flex-col items-center justify-between gap-6 px-6 py-5 sm:flex-row">
                  <div className="flex flex-col text-center sm:text-left">
                    <span className="text-sm font-semibold text-[var(--foreground)]">Ready to proceed?</span>
                    <p className="text-xs text-[var(--muted)]">We&apos;ll generate your roadmap from these details.</p>
                  </div>
                  <button type="button" onClick={handleBuildRoadmap}
                    disabled={!mandatoryValid || !careerValid || loading}
                    className="btn-primary flex h-12 w-full items-center justify-center gap-2 px-10 text-[15px] sm:w-auto disabled:opacity-45">
                    <Sparkles size={16} /> Generate my roadmap
                  </button>
                </div>
              </div>
            </>
          )}
            </motion.div>
          </AnimatePresence>
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
        subtitle="Paste your 4-year sample plan from your university website. Check off what you&apos;ve completed." />

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
      <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--accent-light)] to-[var(--accent-mid)]/80 text-[var(--accent)] shadow-[var(--shadow-sm)] ring-1 ring-[var(--accent)]/15">
        {icon}
      </div>
      <h1 className="text-[1.85rem] font-semibold tracking-tight sm:text-[2rem]">{title}</h1>
      <p className="mt-3 max-w-lg text-pretty text-[15px] leading-relaxed text-[var(--muted)]">{subtitle}</p>
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
      <input className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/15"
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
          <button key={opt} type="button" onClick={() => onChange(opt)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all ${
              value === opt
                ? "bg-[var(--accent)] text-white shadow-md shadow-blue-500/20"
                : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--accent)]/35 hover:text-[var(--foreground)]"
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
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-[var(--border)] bg-[var(--surface)]/90 shadow-[0_-8px_30px_rgba(37,99,235,0.06)] backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--surface)]/75">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-5">
        {hint ? <p className="max-w-[55%] text-xs leading-relaxed text-[var(--muted)]">{hint}</p> : <div />}
        <button type="button" onClick={onContinue} disabled={!canContinue}
          className="btn-primary ml-auto flex h-11 shrink-0 items-center gap-2 px-8 text-sm disabled:opacity-45">
          {label || "Continue"} <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
