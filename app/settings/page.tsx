"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Check, ChevronRight, FileText, GraduationCap, Loader2, Plus, Save, Trash2,
  Upload, User as UserIcon, BookOpen, Calendar, X,
} from "lucide-react";
import AppShell from "@/components/AppShell";

type ProfileData = {
  name: string;
  email?: string;
  university: string;
  degree: string;
  yearOfStudy: string;
  graduating: string;
  studentType: string;
  dreamRole: string;
  targetIndustries: string;
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
  yearOfStudy: "",
  graduating: "",
  studentType: "Domestic",
  dreamRole: "",
  targetIndustries: "",
};

export default function SettingsPage() {
  const [tab, setTab] = useState<"profile" | "documents">("profile");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const searchParams = useSearchParams();

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "documents") setTab("documents");
  }, [searchParams]);

  // Load profile
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/profile");
        const data = await res.json();
        setProfile(data.profile || emptyProfile);
      } catch {
        setProfile(emptyProfile);
      } finally {
        setLoading(false);
      }
    };
    load();

    // Load uploaded files from localStorage
    const stored = localStorage.getItem("bluprint_uploaded_files");
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
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* ignore */ }
    setSaving(false);
  };

  const addFile = (file: UploadedFile) => {
    const next = [...files, file];
    setFiles(next);
    localStorage.setItem("bluprint_uploaded_files", JSON.stringify(next));
  };

  const removeFile = (id: string) => {
    const next = files.filter(f => f.id !== id);
    setFiles(next);
    localStorage.setItem("bluprint_uploaded_files", JSON.stringify(next));
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
          <button onClick={() => setTab("profile")}
            className={`segment-tab ${tab === "profile" ? "segment-tab-active" : ""}`}>
            <UserIcon size={13} className="mr-1.5 inline" />Profile
          </button>
          <button onClick={() => setTab("documents")}
            className={`segment-tab ${tab === "documents" ? "segment-tab-active" : ""}`}>
            <FileText size={13} className="mr-1.5 inline" />Documents
          </button>
        </div>

        {/* Profile Tab */}
        {tab === "profile" && profile && (
          <div className="space-y-6">
            <Section title="Personal">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Full name" value={profile.name}
                  onChange={v => setProfile({ ...profile, name: v })} />
                <Field label="University" value={profile.university}
                  onChange={v => setProfile({ ...profile, university: v })} />
                <Field label="Degree / Major" value={profile.degree}
                  onChange={v => setProfile({ ...profile, degree: v })} />
                <Field label="Year of study" value={profile.yearOfStudy}
                  onChange={v => setProfile({ ...profile, yearOfStudy: v })} />
                <Field label="Graduation" value={profile.graduating}
                  onChange={v => setProfile({ ...profile, graduating: v })} />
                <div className="space-y-1.5">
                  <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">Student type</label>
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

            <Section title="Career goal">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Dream role" value={profile.dreamRole}
                  onChange={v => setProfile({ ...profile, dreamRole: v })}
                  placeholder="e.g. Software Engineer, Analyst..." />
                <Field label="Target industries" value={profile.targetIndustries}
                  onChange={v => setProfile({ ...profile, targetIndustries: v })}
                  placeholder="e.g. Tech, Finance, Consulting..." />
              </div>
            </Section>

            <div className="flex items-center gap-3 pt-2">
              <button onClick={saveProfile} disabled={saving}
                className="btn-primary h-10 px-6 text-sm flex items-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> :
                  saved ? <><Check size={14} /> Saved</> : <><Save size={14} /> Save changes</>}
              </button>
            </div>
          </div>
        )}

        {/* Documents Tab */}
        {tab === "documents" && (
          <div className="space-y-6">
            {/* CVs */}
            <Section title="Resumes / CVs" icon={<FileText size={15} />}>
              <div className="space-y-2">
                {files.filter(f => f.type === "cv").map(f => (
                  <FileRow key={f.id} file={f} onRemove={() => removeFile(f.id)} />
                ))}
              </div>
              <UploadButton
                label="Upload CV"
                accept=".pdf,.doc,.docx"
                onUpload={(file) => {
                  addFile({
                    id: crypto.randomUUID(),
                    name: file.name,
                    type: "cv",
                    uploadedAt: new Date().toISOString(),
                  });
                }}
              />
            </Section>

            {/* Syllabuses */}
            <Section title="Class Syllabuses" icon={<BookOpen size={15} />}>
              <div className="space-y-2">
                {files.filter(f => f.type === "syllabus").map(f => (
                  <FileRow key={f.id} file={f} onRemove={() => removeFile(f.id)} />
                ))}
              </div>
              <UploadButton
                label="Upload Syllabus"
                accept=".pdf,.doc,.docx"
                onUpload={(file) => {
                  const className = prompt("Which class is this for? (e.g. Microeconomics)");
                  addFile({
                    id: crypto.randomUUID(),
                    name: file.name,
                    type: "syllabus",
                    className: className || undefined,
                    uploadedAt: new Date().toISOString(),
                  });
                }}
              />
            </Section>
          </div>
        )}
      </div>
    </AppShell>
  );
}

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

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">{label}</label>
      <input
        className="w-full h-10 rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
        value={value || ""}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
      />
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
