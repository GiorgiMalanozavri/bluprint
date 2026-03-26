"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Check, ChevronRight, Loader2, Save, User as UserIcon, Bell, Shield, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AppShell from "@/components/AppShell";

export default function SettingsPage() {
  const [tab, setTab] = useState<"profile" | "notifications" | "account">("profile");
  const [profile, setProfile] = useState<any>(null);
  const [status, setStatus] = useState("");
  const searchParams = useSearchParams();

  useEffect(() => {
    const requestedTab = searchParams.get("tab");
    if (requestedTab === "profile" || requestedTab === "notifications" || requestedTab === "account") {
      setTab(requestedTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const load = async () => {
      const response = await fetch("/api/profile");
      const result = await response.json();
      if (response.ok) setProfile(result.profile);
    };
    load();
  }, []);

  const saveProfile = async () => {
    setStatus("Saving...");
    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    });
    const result = await response.json();
    setStatus(response.ok ? "Saved." : result.error || "Failed to save.");
    setTimeout(() => setStatus(""), 3000);
  };

  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--background)]">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--accent)]" />
      </div>
    );
  }

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto animate-fade-up">
        <header className="mb-10">
          <h1 className="text-[2rem] font-semibold tracking-tight">Settings</h1>
          <p className="mt-2 text-[var(--muted)]">Update your profile, goal settings, and account controls.</p>
        </header>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-[var(--background-secondary)] p-1 rounded-xl w-fit mb-10">
          {[
            { id: "profile", label: "Profile", icon: UserIcon },
            { id: "notifications", label: "Notifications", icon: Bell },
            { id: "account", label: "Account", icon: Shield }
          ].map((item: any) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-[13px] font-medium transition-all ${
                tab === item.id
                  ? "bg-[var(--surface)] text-[var(--accent)] shadow-sm"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <item.icon size={14} />
              {item.label}
            </button>
          ))}
        </div>

        <section className="grid gap-10">
          {tab === "profile" && (
            <div className="space-y-10">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
                <div className="flex items-center gap-4 mb-8">
                  <div className="h-11 w-11 rounded-xl bg-[var(--accent-light)] flex items-center justify-center text-[var(--accent)]">
                     <UserIcon size={22} />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold">Personal Information</h3>
                    <p className="text-xs text-[var(--muted)]">Basic details about your academic journey.</p>
                  </div>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Field label="Full name" value={profile.name || ""} onChange={(v) => setProfile((c: any) => ({ ...c, name: v }))} />
                  <Field label="University" value={profile.university || ""} onChange={(v) => setProfile((c: any) => ({ ...c, university: v }))} />
                  <Field label="Degree" value={profile.degree || ""} onChange={(v) => setProfile((c: any) => ({ ...c, degree: v }))} />
                  <Field label="Year of study" value={profile.yearOfStudy || ""} onChange={(v) => setProfile((c: any) => ({ ...c, yearOfStudy: v }))} />
                  <Field label="Graduation year" value={profile.graduating || ""} onChange={(v) => setProfile((c: any) => ({ ...c, graduating: v }))} />
                  <Field label="Dream role" value={profile.dreamRole || ""} onChange={(v) => setProfile((c: any) => ({ ...c, dreamRole: v }))} />
                  <Field label="Target industry" value={profile.targetIndustries || ""} onChange={(v) => setProfile((c: any) => ({ ...c, targetIndustries: v }))} />
                  <Field label="Student type" value={profile.studentType || ""} onChange={(v) => setProfile((c: any) => ({ ...c, studentType: v }))} />
                </div>

                <div className="mt-10 pt-8 border-t border-[var(--border)] flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <button onClick={saveProfile} className="btn-primary h-10 px-8">
                       Save Changes <Save size={15} />
                    </button>
                    {status && (
                      <span className={`text-sm font-medium ${status.includes("Failed") ? "text-red-500" : "text-emerald-600"}`}>
                        {status}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[var(--muted)] max-w-xs leading-relaxed">
                    Update these settings to let bluprint automatically adjust your roadmap and AI suggestions.
                  </p>
                </div>
              </div>
            </div>
          )}

          {tab === "notifications" && (
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm divide-y divide-[var(--border)]">
              {[
                { title: "Weekly action reminder", desc: "A summary of your focus tasks every Sunday." },
                { title: "Monthly check-in",      desc: "Detailed roadmap progress report." },
                { title: "Internship alerts",      desc: "Deadline reminders for your target roles." },
                { title: "AI updates",             desc: "New drafting and analysis feature alerts." },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-6 first:pt-0 last:pb-0">
                  <div className="pr-10">
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-1 text-sm text-[var(--muted)]">{item.desc}</p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent bg-[var(--accent)] transition-colors duration-200">
                    <span className="translate-x-5 pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {tab === "account" && (
            <div className="space-y-6">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-xl bg-[var(--background-secondary)] flex items-center justify-center">
                       <CreditCard size={22} className="text-[var(--muted)]" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold">Billing & Plan</h3>
                      <p className="text-xs text-[var(--muted)]">Manage your subscription and billing details.</p>
                    </div>
                  </div>
                  <span className="inline-flex items-center rounded-full bg-[var(--background-secondary)] px-3 py-1 text-xs font-medium uppercase tracking-wider text-[var(--muted)]">Free Plan</span>
                </div>
                <div className="mt-8 pt-8 border-t border-[var(--border)]">
                   <button className="btn-secondary h-10 px-8">Upgrade to bluprint Pro</button>
                </div>
              </div>

              <div className="rounded-2xl border border-red-100 bg-red-50/30 p-8 shadow-sm border-dashed">
                 <h3 className="text-sm font-semibold text-red-700">Danger Zone</h3>
                 <p className="text-xs text-red-600/70 mt-1">Permanently delete your account and all associated data.</p>
                 <button className="mt-4 px-4 py-2 rounded-xl text-xs font-medium text-red-600 bg-white border border-red-200 hover:bg-red-50 transition-all">
                    Delete Account
                 </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-2">
      <label className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted)]">{label}</label>
      <input
        className="w-full h-11 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 text-sm font-medium outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
