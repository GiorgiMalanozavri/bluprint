"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronLeft, Loader2, Pencil, Plus, X } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

type Step = 1 | 2 | 3 | 4;
type Experience = { title: string; company: string; duration: string; bullets: string[] };
type Education = { degree: string; institution: string; years: string; grade: string };
type Profile = {
  name: string;
  university: string;
  degree: string;
  yearOfStudy: string;
  graduating: string;
  studentType: string;
  dreamRole: string;
  targetIndustries: string;
  experiences: Experience[];
  education: Education[];
  skills: string[];
  extracurriculars: string[];
  languages: string[];
  flaggedFields?: string[];
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
  experiences: [],
  education: [],
  skills: [],
  extracurriculars: [],
  languages: [],
  flaggedFields: [],
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

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
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
        if (user?.user_metadata?.full_name) {
          setProfile(p => ({ ...p, name: user.user_metadata.full_name }));
        }
      } catch { /* ignore */ }
    };
    fetchUser();
  }, []);

  useEffect(() => {
    if (step !== 2 && step !== 4) return;
    const messages = step === 2 ? loadingMessages : roadmapMessages;
    const interval = window.setInterval(() => {
      setLoadingIndex((index) => (index + 1) % messages.length);
    }, 1300);
    return () => window.clearInterval(interval);
  }, [step]);

  const progress = useMemo(() => (step / 4) * 100, [step]);
  const currentMessages = step === 2 ? loadingMessages : roadmapMessages;

  const updateList = (key: "skills" | "extracurriculars" | "languages", nextItems: string[]) => {
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
      localStorage.setItem("bluprint_profile_review", JSON.stringify(mergedProfile));
      localStorage.setItem("bluprint_cv_raw_text", parsed.text);
      localStorage.setItem("bluprint_cv_filename", selectedFile.name);
      setStep(3);
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
    setStep(4);

    try {
      const response = await fetch("/api/generate-roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Failed to generate roadmap");

      localStorage.setItem("bluprint_onboarding_complete", "true");
      localStorage.setItem("bluprint_profile_review", JSON.stringify(profile));
      localStorage.setItem("bluprint_ai_roadmap", JSON.stringify(result.semesters || []));
      localStorage.setItem("bluprint_full_roadmap", JSON.stringify(result));
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build roadmap.");
      setStep(3);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="fixed left-0 right-0 top-0 z-50 h-1 bg-[var(--accent)]/10">
        <div className="h-full bg-[var(--accent)] transition-all duration-700 ease-out" style={{ width: `${progress}%` }} />
      </div>

      {step !== 2 && step !== 4 && (
        <div className="max-w-4xl mx-auto flex items-center justify-between pt-8 px-6 animate-fade-up">
          <button
            onClick={() => setStep((value) => Math.max(1, value - 1) as Step)}
            className="group inline-flex items-center gap-2 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            disabled={loading}
          >
            <ChevronLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
            Back
          </button>
          <p className="font-mono text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">Step {step} of 4</p>
        </div>
      )}

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
                  <div className="rounded-full bg-emerald-50 p-3 text-emerald-600">
                    <Check size={24} />
                  </div>
                  <p className="font-semibold">{selectedFile.name}</p>
                  <p className="text-xs text-[var(--muted)]">{Math.round(selectedFile.size / 1024)} KB</p>
                  <span className="text-xs font-medium text-[var(--accent)] underline mt-2">Change file</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--background-secondary)] text-[var(--muted)] group-hover:bg-[var(--accent-light)] group-hover:text-[var(--accent)] transition-colors">
                    <Plus size={28} />
                  </div>
                  <div>
                    <p className="text-xl font-semibold">Drop your CV here</p>
                    <p className="text-sm text-[var(--muted)] mt-1">PDF or Word document</p>
                  </div>
                </div>
              )}
              <input type="file" className="hidden" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
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

            <button onClick={() => setStep(3)} className="mt-12 text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] underline underline-offset-4 transition-colors">
              I don&apos;t have a CV yet &middot; Start manually
            </button>
          </div>
        </section>
      )}

      {(step === 2 || step === 4) && (
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

      {step === 3 && (
        <section className="max-w-2xl mx-auto pb-40 pt-10 px-6 animate-fade-up">
          <header className="mb-12">
            <h1 className="text-[2rem] font-semibold tracking-tight">Review your profile.</h1>
            <p className="mt-3 text-lg text-[var(--muted)]">We&apos;ve extracted these details from your CV. bluprint uses them to tailor your roadmap timing.</p>
          </header>

          {error && <p className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm font-medium text-red-600">{error}</p>}

          <div className="space-y-8">
            <div className="surface-card p-0 overflow-hidden divide-y divide-[var(--border)]">
              <section className="p-8">
                <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)] mb-8">Identity & Academic</h2>
                <div className="grid gap-8">
                  {[
                    ["name", "Full Name"],
                    ["university", "University"],
                    ["degree", "Program / Major"],
                    ["yearOfStudy", "Current Year"],
                    ["graduating", "Graduation Year"],
                  ].map(([key, label]) => (
                    <div key={key} className="relative group">
                      <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-1.5 block">{label}</label>
                      <div className="flex items-center justify-between">
                         <p className="text-[15px] font-semibold">{profile[key as keyof Profile] as string || "\u2014"}</p>
                         <button onClick={() => setEditingField(key as keyof Profile)} className="opacity-0 group-hover:opacity-100 p-2 rounded-lg hover:bg-[var(--surface-secondary)] text-[var(--muted)] transition-all">
                           <Pencil size={14} />
                         </button>
                      </div>
                      {profile.flaggedFields?.includes(key) && <p className="absolute -bottom-5 text-[10px] font-medium text-[var(--accent)]">Please verify this field</p>}
                    </div>
                  ))}

                  <div className="pt-4">
                    <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)] mb-4 block">Are you an international student?</label>
                    <div className="flex gap-3">
                      {["Domestic", "International"].map((option) => (
                        <button
                          key={option}
                          onClick={() => setProfile({ ...profile, studentType: option })}
                          className={`flex-1 rounded-xl py-3 text-sm font-medium transition-all ${
                            profile.studentType === option
                              ? "bg-[var(--foreground)] text-white shadow-md"
                              : "border border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:border-[var(--foreground)]"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)]">Work History</h2>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">{profile.experiences.length} identified</span>
                </div>
                <div className="space-y-4">
                  {profile.experiences.map((item, index) => (
                    <div key={index} className="rounded-xl border border-[var(--border)] p-5 bg-[var(--surface-secondary)]">
                      <p className="font-semibold text-sm">{item.title} at {item.company}</p>
                      <p className="text-[11px] font-medium text-[var(--muted)] mt-1">{item.duration}</p>
                      <ul className="mt-3 space-y-2">
                        {item.bullets.slice(0, 2).map((bullet, bi) => (
                          <li key={bi} className="text-xs text-[var(--muted)] leading-relaxed flex gap-2">
                            <span className="text-[var(--accent)]">&bull;</span> {bullet}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                  <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] py-4 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface)] hover:border-[var(--foreground)] hover:text-[var(--foreground)] transition-all">
                    <Plus size={14} /> Add Experience
                  </button>
                </div>
              </section>

              <TagSection title="Core Skills" items={profile.skills} onChange={(items) => updateList("skills", items)} />

              <section className="p-8 bg-[var(--accent-light)]/30">
                <div className="rounded-2xl bg-[var(--surface)] border border-[var(--accent)]/15 p-6 shadow-sm">
                  <h3 className="text-lg font-semibold">Your Career Goal</h3>
                  <p className="text-sm text-[var(--muted)] mt-1 mb-6">bluprint uses this to target your roadmap milestones.</p>
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-medium uppercase tracking-wider text-[var(--muted)]">What role do you want?</label>
                       <input
                         value={profile.dreamRole}
                         onChange={(event) => setProfile({ ...profile, dreamRole: event.target.value })}
                         placeholder="e.g. Investment Banker, Software Engineer..."
                         className="h-11 w-full rounded-xl border border-[var(--border)] px-4 text-sm font-medium outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all"
                       />
                    </div>
                  </div>
                </div>
              </section>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 border-t border-[var(--border)] bg-[var(--surface)]/80 backdrop-blur-xl z-40">
            <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6 py-5 px-6">
              <div className="flex flex-col">
                 <span className="text-sm font-semibold">Ready to proceed?</span>
                 <p className="text-xs text-[var(--muted)]">We&apos;ll generate your roadmap based on these details.</p>
              </div>
              <button
                onClick={handleBuildRoadmap}
                disabled={!profile.dreamRole.trim() || loading}
                className="btn-primary h-12 px-10 text-[15px] w-full sm:w-auto"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Generate my roadmap"}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Edit Modal */}
      {editingField && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
           <div className="bg-[var(--surface)] rounded-2xl shadow-lg p-8 w-full max-w-md animate-fade-up">
              <h3 className="text-xl font-semibold mb-6">Edit {editingField.replace(/([A-Z])/g, ' $1').toLowerCase()}</h3>
              <input
                autoFocus
                className="w-full h-11 rounded-xl border border-[var(--border)] px-4 text-sm font-medium outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 mb-6"
                value={profile[editingField] as string}
                onChange={(e) => setProfile({...profile, [editingField]: e.target.value})}
                onKeyDown={(e) => e.key === 'Enter' && setEditingField(null)}
              />
              <div className="flex gap-3">
                 <button onClick={() => setEditingField(null)} className="btn-primary flex-1 h-11">Save Changes</button>
                 <button onClick={() => setEditingField(null)} className="btn-secondary h-11">Cancel</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}

function TagSection({
  title,
  items,
  onChange,
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <section className="p-8">
      <h2 className="text-[11px] font-medium uppercase tracking-wider text-[var(--accent)] mb-6">{title}</h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => onChange(items.filter((value) => value !== item))}
            className="group inline-flex items-center gap-2 rounded-xl bg-[var(--background-secondary)] px-4 py-2.5 text-xs font-medium hover:bg-[var(--accent-light)] hover:text-[var(--accent)] transition-all"
          >
            {item}
            <X size={14} className="opacity-40 group-hover:opacity-100" />
          </button>
        ))}
      </div>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const value = draft.trim();
          if (!value) return;
          onChange([...items, value]);
          setDraft("");
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Add ${title.toLowerCase().slice(0, -1)}...`}
          className="h-11 w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-xs font-medium outline-none focus:border-[var(--accent)] transition-all"
        />
      </form>
    </section>
  );
}
