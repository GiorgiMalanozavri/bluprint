"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check, ChevronRight, FileText, GraduationCap, Loader2, Plus, Save, Trash2,
  Upload, User as UserIcon, BookOpen, Calendar, X, Globe, Briefcase,
  ClipboardPaste,
} from "lucide-react";
import AppShell from "@/components/AppShell";
import { userStorage } from "@/lib/user-storage";

type ParsedCourse = { name: string; completed: boolean };
type ParsedSemester = { label: string; courses: ParsedCourse[] };

type ProfileData = {
  name: string;
  email?: string;
  university: string;
  degree: string;
  minor: string;
  gpa: string;
  yearOfStudy: string;
  graduating: string;
  studentType: string;
  countryOfOrigin: string;
  visaStatus: string;
  sponsorshipNeeded: string;
  dreamRole: string;
  targetIndustries: string;
  targetCompanies: string;
  preferredLocations: string;
  willingToRelocate: string;
  linkedinUrl: string;
  portfolioUrl: string;
  certifications: string[];
  languages: string[];
  courseSchedule: ParsedSemester[];
  courseScheduleRaw: string;
};

type UploadedFile = {
  id: string;
  name: string;
  type: "cv" | "syllabus";
  className?: string;
  uploadedAt: string;
};

const emptyProfile: ProfileData = {
  name: "",
  university: "",
  degree: "",
  minor: "",
  gpa: "",
  yearOfStudy: "",
  graduating: "",
  studentType: "Domestic",
  countryOfOrigin: "",
  visaStatus: "",
  sponsorshipNeeded: "",
  dreamRole: "",
  targetIndustries: "",
  targetCompanies: "",
  preferredLocations: "",
  willingToRelocate: "",
  linkedinUrl: "",
  portfolioUrl: "",
  certifications: [],
  languages: [],
  courseSchedule: [],
  courseScheduleRaw: "",
};

function parseCourseSchedule(raw: string): ParsedSemester[] {
  const lines = raw.split("\n").map(l => l.trim()).filter(Boolean);
  const semesters: ParsedSemester[] = [];
  let current: ParsedSemester | null = null;
  const semesterPattern = /^(semester|year|fall|spring|summer|winter|freshman|sophomore|junior|senior|1st|2nd|3rd|4th|first|second|third|fourth)/i;
  const skipPatterns = [
    /^\d+\s*(credits?|hrs?|hours?|cr\.?|units?)\s*$/i,
    /^\d+$/,
    /^total/i,
    /^(minimum|maximum|required|elective|prerequisite|corequisite|co-requisite|requirement|completion|program|curriculum|catalog|note|students? (must|should|are|may|can|will|need)|gpa|grade|advisor|advising|minor|major|concentration|track|option|pathway|emphasis|all students|select|choose|complete|maintain|earn|satisfy|fulfill|submit|apply|consult|contact|check|see|refer|visit|upon|subject|pending|with a|at least|or higher|or above|no later|prior to|in addition|such as|including|department|college|school|office|approval|permission|written|hours from|credit hours|total hours|hours of)/i,
    /^[\-\*\u2022]\s*(minimum|students|gpa|must|all|complete|maintain|select|choose|earn|at least)/i,
    /^(https?:\/\/|www\.)/i,
    /^\(?\d+[-–]\d+\s*(credits?|hrs?)\)?$/i,
    /^[A-Z]{2,5}\s*\d{3,4}\s*$/i,
  ];

  for (const line of lines) {
    if (semesterPattern.test(line) || /^(year\s*\d|sem\s*\d)/i.test(line)) {
      current = { label: line, courses: [] };
      semesters.push(current);
      continue;
    }
    if (skipPatterns.some(p => p.test(line))) continue;
    if (line.length < 4) continue;
    if (line.replace(/[^a-zA-Z]/g, "").length < 3) continue;
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

export default function SettingsPage() {
  const [tab, setTab] = useState<"profile" | "career" | "courses" | "documents">("profile");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const searchParams = useSearchParams();

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "documents" || t === "career" || t === "courses") setTab(t);
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        const p = data.profile || emptyProfile;
        // Ensure arrays exist
        setProfile({
          ...emptyProfile,
          ...p,
          certifications: p.certifications || [],
          languages: p.languages || [],
          courseSchedule: p.courseSchedule || [],
          courseScheduleRaw: p.courseScheduleRaw || "",
        });
      } catch {
        setProfile(emptyProfile);
      } finally {
        setLoading(false);
      }
    };
    load();

    const stored = userStorage.getItem("bluprint_uploaded_files");
    if (stored) setFiles(JSON.parse(stored));
  }, []);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      // Sync to localStorage so dashboard and AI sidebar always have latest data
      userStorage.setItem("bluprint_profile_review", JSON.stringify(profile));
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const addFile = (file: UploadedFile) => {
    const next = [...files, file];
    setFiles(next);
    userStorage.setItem("bluprint_uploaded_files", JSON.stringify(next));
  };

  const removeFile = (id: string) => {
    const next = files.filter(f => f.id !== id);
    setFiles(next);
    userStorage.setItem("bluprint_uploaded_files", JSON.stringify(next));
  };

  if (loading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center py-32">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--muted)]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto animate-fade-up">
        <header className="mb-8">
          <h1 className="text-[2rem] font-semibold tracking-tight">Settings</h1>
        </header>

        {/* Tabs */}
        <div className="segment-switcher mb-8">
          {(["profile", "career", "courses", "documents"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`segment-tab ${tab === t ? "segment-tab-active" : ""}`}>
              {t === "profile" && <UserIcon size={13} className="mr-1.5 inline" />}
              {t === "career" && <Briefcase size={13} className="mr-1.5 inline" />}
              {t === "courses" && <BookOpen size={13} className="mr-1.5 inline" />}
              {t === "documents" && <FileText size={13} className="mr-1.5 inline" />}
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Profile Tab */}
        {tab === "profile" && profile && (
          <div className="space-y-6">
            <Section title="Personal & Academic">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" required value={profile.name}
                  onChange={v => setProfile({ ...profile, name: v })} />
                <Field label="University" required value={profile.university}
                  onChange={v => setProfile({ ...profile, university: v })} />
                <Field label="Degree / Major" required value={profile.degree}
                  onChange={v => setProfile({ ...profile, degree: v })} />
                <Field label="Minor(s)" value={profile.minor}
                  onChange={v => setProfile({ ...profile, minor: v })} />
                <Field label="Year of study" required value={profile.yearOfStudy}
                  onChange={v => setProfile({ ...profile, yearOfStudy: v })} />
                <Field label="Expected graduation" required value={profile.graduating}
                  onChange={v => setProfile({ ...profile, graduating: v })} />
                <Field label="GPA" value={profile.gpa}
                  onChange={v => setProfile({ ...profile, gpa: v })} />
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
                    Student type <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    {["Domestic", "International"].map(opt => (
                      <button key={opt} onClick={() => setProfile({ ...profile, studentType: opt })}
                        className={`flex-1 rounded-lg py-2.5 text-xs font-medium transition-all ${
                          profile.studentType === opt
                            ? "bg-[var(--foreground)] text-white"
                            : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]"
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Background" icon={<Globe size={15} />}>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Country of origin"
                  required={profile.studentType === "International"}
                  value={profile.countryOfOrigin}
                  onChange={v => setProfile({ ...profile, countryOfOrigin: v })}
                  placeholder="e.g. India, South Korea..." />
                {profile.studentType === "International" && (
                  <>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">Visa status</label>
                      <div className="flex flex-wrap gap-1.5">
                        {["F-1", "J-1", "H-1B", "OPT", "CPT", "Other"].map(opt => (
                          <button key={opt} onClick={() => setProfile({ ...profile, visaStatus: opt })}
                            className={`rounded-lg px-3 py-2 text-[11px] font-medium transition-all ${
                              profile.visaStatus === opt
                                ? "bg-[var(--foreground)] text-white"
                                : "border border-[var(--border)] text-[var(--muted)] hover:border-[var(--foreground)]"
                            }`}>
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">Need sponsorship?</label>
                      <div className="flex gap-2">
                        {["Yes", "No", "Not sure"].map(opt => (
                          <button key={opt} onClick={() => setProfile({ ...profile, sponsorshipNeeded: opt })}
                            className={`flex-1 rounded-lg py-2.5 text-xs font-medium transition-all ${
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
              </div>
              <div className="mt-5">
                <TagField label="Languages" items={profile.languages}
                  onChange={items => setProfile({ ...profile, languages: items })} />
              </div>
            </Section>

            <Section title="Online presence">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="LinkedIn URL" value={profile.linkedinUrl}
                  onChange={v => setProfile({ ...profile, linkedinUrl: v })}
                  placeholder="linkedin.com/in/..." />
                <Field label="Portfolio / Website" value={profile.portfolioUrl}
                  onChange={v => setProfile({ ...profile, portfolioUrl: v })}
                  placeholder="yoursite.com" />
              </div>
            </Section>

            <SaveButton saving={saving} saved={saved} onSave={saveProfile} />
          </div>
        )}

        {/* Career Tab */}
        {tab === "career" && profile && (
          <div className="space-y-6">
            <Section title="Career goals">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Dream role" required value={profile.dreamRole}
                  onChange={v => setProfile({ ...profile, dreamRole: v })}
                  placeholder="e.g. Software Engineer, Analyst..." />
                <Field label="Target industries" value={profile.targetIndustries}
                  onChange={v => setProfile({ ...profile, targetIndustries: v })}
                  placeholder="e.g. Tech, Finance, Consulting..." />
                <Field label="Target companies" value={profile.targetCompanies}
                  onChange={v => setProfile({ ...profile, targetCompanies: v })}
                  placeholder="e.g. Google, Goldman Sachs..." />
                <Field label="Preferred locations" value={profile.preferredLocations}
                  onChange={v => setProfile({ ...profile, preferredLocations: v })}
                  placeholder="e.g. New York, San Francisco..." />
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">Willing to relocate?</label>
                  <div className="flex gap-2">
                    {["Yes", "No", "Maybe"].map(opt => (
                      <button key={opt} onClick={() => setProfile({ ...profile, willingToRelocate: opt })}
                        className={`flex-1 rounded-lg py-2.5 text-xs font-medium transition-all ${
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
            </Section>

            <Section title="Skills & Certifications">
              <TagField label="Certifications" items={profile.certifications}
                onChange={items => setProfile({ ...profile, certifications: items })} />
            </Section>

            <SaveButton saving={saving} saved={saved} onSave={saveProfile} />
          </div>
        )}

        {/* Courses Tab */}
        {tab === "courses" && profile && (
          <CourseScheduleSettings profile={profile} setProfile={setProfile} onSave={saveProfile} saving={saving} saved={saved} />
        )}

        {/* Documents Tab */}
        {tab === "documents" && (
          <div className="space-y-6">
            <Section title="Resumes / CVs" icon={<FileText size={15} />}>
              <div className="space-y-2">
                {files.filter(f => f.type === "cv").map(f => (
                  <FileRow key={f.id} file={f} onRemove={() => removeFile(f.id)} />
                ))}
              </div>
              <UploadButton label="Upload CV" accept=".pdf,.doc,.docx"
                onUpload={(file) => {
                  addFile({ id: crypto.randomUUID(), name: file.name, type: "cv", uploadedAt: new Date().toISOString() });
                }} />
            </Section>

            <Section title="Class Syllabuses" icon={<BookOpen size={15} />}>
              <div className="space-y-2">
                {files.filter(f => f.type === "syllabus").map(f => (
                  <FileRow key={f.id} file={f} onRemove={() => removeFile(f.id)} />
                ))}
              </div>
              <UploadButton label="Upload Syllabus" accept=".pdf,.doc,.docx"
                onUpload={(file) => {
                  const className = prompt("Which class is this for? (e.g. Microeconomics)");
                  addFile({ id: crypto.randomUUID(), name: file.name, type: "syllabus", className: className || undefined, uploadedAt: new Date().toISOString() });
                }} />
            </Section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

/* ─── Course Schedule Settings ──────────────────── */

function CourseScheduleSettings({
  profile,
  setProfile,
  onSave,
  saving,
  saved,
}: {
  profile: ProfileData;
  setProfile: React.Dispatch<React.SetStateAction<ProfileData | null>>;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
}) {
  const [rawText, setRawText] = useState(profile.courseScheduleRaw || "");
  const hasCourses = profile.courseSchedule.length > 0;

  const handleParse = () => {
    const result = parseCourseSchedule(rawText);
    setProfile(p => p ? { ...p, courseScheduleRaw: rawText, courseSchedule: result } : p);
  };

  const toggleCourse = (semIdx: number, courseIdx: number) => {
    setProfile(p => {
      if (!p) return p;
      const next = p.courseSchedule.map((sem, si) =>
        si === semIdx
          ? { ...sem, courses: sem.courses.map((c, ci) => ci === courseIdx ? { ...c, completed: !c.completed } : c) }
          : sem
      );
      return { ...p, courseSchedule: next };
    });
  };

  const totalCourses = profile.courseSchedule.reduce((s, sem) => s + sem.courses.length, 0);
  const completedCourses = profile.courseSchedule.reduce((s, sem) => s + sem.courses.filter(c => c.completed).length, 0);

  return (
    <div className="space-y-6">
      <Section title="Course schedule" icon={<BookOpen size={15} />}>
        <p className="text-xs text-[var(--muted)] mb-4">
          Paste your 4-year sample course schedule from your university website, then check off completed courses.
        </p>
        <textarea
          value={rawText}
          onChange={e => setRawText(e.target.value)}
          placeholder={`Example:\n\nFall Semester 1\nIntro to Computer Science\nCalculus I\nEnglish Composition\n\nSpring Semester 1\nData Structures\nCalculus II`}
          className="w-full h-48 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 transition-all resize-none font-mono"
        />
        <button onClick={handleParse} disabled={!rawText.trim()}
          className="mt-3 btn-primary h-10 px-6 text-sm flex items-center gap-2">
          <ClipboardPaste size={14} /> Parse schedule
        </button>
      </Section>

      {hasCourses && (
        <>
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{completedCourses} of {totalCourses} courses completed</p>
              <p className="text-xs text-[var(--muted)] mt-0.5">{profile.courseSchedule.length} semesters</p>
            </div>
            <div className="w-32 h-2 rounded-full bg-[var(--background-secondary)] overflow-hidden">
              <div className="h-full bg-[var(--accent)] rounded-full transition-all duration-500"
                style={{ width: totalCourses ? `${(completedCourses / totalCourses) * 100}%` : "0%" }} />
            </div>
          </div>

          {profile.courseSchedule.map((sem, si) => {
            const semDone = sem.courses.filter(c => c.completed).length;
            return (
              <div key={si} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 bg-[var(--surface-secondary)] border-b border-[var(--border)]">
                  <h3 className="text-xs font-semibold uppercase tracking-wider">{sem.label}</h3>
                  <span className="text-[10px] font-medium text-[var(--muted)]">{semDone}/{sem.courses.length}</span>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {sem.courses.map((course, ci) => (
                    <button key={ci} onClick={() => toggleCourse(si, ci)}
                      className="w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-[var(--surface-secondary)] transition-colors">
                      <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all ${
                        course.completed ? "bg-[var(--accent)] border-[var(--accent)] text-white" : "border-[var(--border)]"
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
        </>
      )}

      <SaveButton saving={saving} saved={saved} onSave={onSave} />
    </div>
  );
}

/* ─── Reusable Components ───────────────────────── */

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex items-center gap-2 mb-5">
        {icon}
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      <input
        className="w-full h-10 rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function TagField({ label, items, onChange }: {
  label: string; items: string[]; onChange: (items: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">{label}</label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {items.map(item => (
          <button key={item} onClick={() => onChange(items.filter(v => v !== item))}
            className="group inline-flex items-center gap-1.5 rounded-lg bg-[var(--background-secondary)] px-3 py-1.5 text-xs font-medium hover:bg-red-50 hover:text-red-500 transition-all">
            {item} <X size={12} className="opacity-40 group-hover:opacity-100" />
          </button>
        ))}
      </div>
      <form onSubmit={e => { e.preventDefault(); const v = draft.trim(); if (!v) return; onChange([...items, v]); setDraft(""); }}>
        <input value={draft} onChange={e => setDraft(e.target.value)}
          placeholder={`Add ${label.toLowerCase()}...`}
          className="h-10 w-full rounded-lg border border-[var(--border)] bg-transparent px-3 text-xs font-medium outline-none focus:border-[var(--accent)] transition-all" />
      </form>
    </div>
  );
}

function SaveButton({ saving, saved, onSave }: { saving: boolean; saved: boolean; onSave: () => void }) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button onClick={onSave} disabled={saving}
        className="btn-primary h-10 px-6 text-sm flex items-center gap-2">
        {saving ? <Loader2 size={14} className="animate-spin" /> :
          saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save changes</>}
      </button>
    </div>
  );
}

function FileRow({ file, onRemove }: { file: UploadedFile; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-[var(--border)] px-4 py-3 group">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${
          file.type === "cv" ? "bg-blue-50 text-blue-500" : "bg-violet-50 text-violet-500"
        }`}>
          {file.type === "cv" ? <FileText size={14} /> : <BookOpen size={14} />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">{file.name}</p>
          <p className="text-[10px] text-[var(--muted)]">
            {file.className && <span className="mr-2">{file.className}</span>}
            {new Date(file.uploadedAt).toLocaleDateString()}
          </p>
        </div>
      </div>
      <button onClick={onRemove}
        className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-[var(--muted)] hover:text-red-500 hover:bg-red-50 transition-all">
        <Trash2 size={13} />
      </button>
    </div>
  );
}

function UploadButton({ label, accept, onUpload }: {
  label: string; accept: string; onUpload: (file: File) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <button onClick={() => ref.current?.click()}
        className="mt-3 w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--border)] py-3 text-xs font-medium text-[var(--muted)] hover:bg-[var(--surface-secondary)] hover:border-[var(--foreground)] hover:text-[var(--foreground)] transition-all">
        <Plus size={14} /> {label}
      </button>
      <input ref={ref} type="file" accept={accept} className="hidden"
        onChange={e => { if (e.target.files?.[0]) { onUpload(e.target.files[0]); e.target.value = ""; } }} />
    </>
  );
}
