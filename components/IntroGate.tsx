"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Search, Globe, ArrowRight, Sparkles, Calendar, FileText, Target } from "lucide-react";
import { COUNTRIES, type Country } from "@/lib/countries";

export default function IntroGate({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);

  const filteredCountries = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    localStorage.setItem("bluprint_user_country", country.name);
    setStep(1);
  };

  const handleGetStarted = () => {
    localStorage.setItem("bluprint_intro_seen", "true");
    onComplete();
    window.location.href = "/sign-in";
  };

  return (
    <div className="fixed inset-0 z-[100] bg-[var(--background)] overflow-y-auto">
      <div className="relative z-10 min-h-full flex flex-col items-center justify-center py-20 px-6">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-4xl text-center"
            >
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-light)] text-[var(--accent)] rounded-full text-sm font-medium border border-[var(--accent)]/10 mb-8"
              >
                <Globe className="w-4 h-4" />
                <span>Where are you from?</span>
              </motion.div>
              <h1 className="text-[2.75rem] md:text-[3.5rem] font-semibold tracking-tight mb-6">
                Tell us your country for{" "}
                <span className="text-[var(--accent)]">visa-aware guidance</span>
              </h1>
              <p className="text-lg text-[var(--muted)] mb-12 max-w-xl mx-auto">
                bluprint tailors your roadmap with OPT/CPT timelines and sponsorship data for your country.
              </p>

              <div className="bg-[var(--surface)] border border-[var(--border)] p-8 md:p-10 rounded-2xl shadow-sm">
                <div className="relative mb-8">
                  <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--muted)]" />
                  <input
                    type="text"
                    placeholder="Search your country..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-14 pr-6 py-4 bg-[var(--surface-secondary)] border border-[var(--border)] rounded-xl text-lg font-medium focus:ring-2 focus:ring-[var(--accent)]/15 focus:border-[var(--accent)] transition-all outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[380px] overflow-y-auto pr-2">
                  {filteredCountries.map((c) => (
                    <motion.button
                      key={c.code}
                      onClick={() => handleCountrySelect(c)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="group p-5 bg-[var(--surface)] border border-[var(--border)] rounded-xl flex flex-col items-center gap-2 hover:border-[var(--accent)]/30 hover:bg-[var(--accent-light)] transition-all duration-200 text-center"
                    >
                      <span className="text-2xl">{c.flag}</span>
                      <span className="font-medium text-[var(--muted-foreground)] group-hover:text-[var(--accent)] text-xs">
                        {c.name}
                      </span>
                    </motion.button>
                  ))}
                </div>
              </div>

              <button
                onClick={onComplete}
                className="mt-8 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
              >
                Skip for now
              </button>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35 }}
              className="w-full max-w-2xl"
            >
              <div className="text-center mb-12">
                <motion.div
                  initial={{ scale: 0.9 }}
                  animate={{ scale: 1 }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-light)] text-[var(--accent)] rounded-full text-sm font-medium border border-[var(--accent)]/10 mb-8"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>What is bluprint?</span>
                </motion.div>
                <h2 className="text-[2.5rem] md:text-[3rem] font-semibold tracking-tight mb-6">
                  Your semester-by-semester <br />
                  <span className="text-[var(--accent)]">career roadmap</span>
                </h2>
                <p className="text-lg text-[var(--muted)] mb-10 max-w-xl mx-auto">
                  Enter your dream career, major, and where you are in your degree. bluprint tells you exactly
                  which classes to take, clubs to join, when to apply for internships, and what your CV needs at every stage.
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 mb-12">
                {[
                  { icon: Calendar, text: "Monthly action list: 3\u20135 highest-impact things to do right now" },
                  { icon: FileText, text: "CV gap analyzer: where you are vs where you need to be" },
                  { icon: Target, text: "Visa-aware internships & OPT/CPT timelines", colSpan: true },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 * i }}
                    className={`p-5 bg-[var(--accent-light)] border border-[var(--accent)]/10 rounded-xl flex items-start gap-3 ${item.colSpan ? "sm:col-span-2" : ""}`}
                  >
                    <div className="w-10 h-10 bg-[var(--accent-mid)] rounded-xl flex items-center justify-center shrink-0">
                      <item.icon className="w-5 h-5 text-[var(--accent)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--muted-foreground)] leading-relaxed">{item.text}</p>
                  </motion.div>
                ))}
              </div>

              <div className="flex flex-col items-center gap-4">
                <button
                  onClick={handleGetStarted}
                  className="btn-primary h-12 px-12 text-[15px] w-full sm:w-auto"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setStep(0)}
                  className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
                >
                  &larr; Back to country
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="fixed bottom-0 left-0 w-full px-8 py-6 z-[110] flex items-center justify-center gap-2">
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${step === 0 ? "w-8 bg-[var(--accent)]" : "w-4 bg-[var(--border)]"}`}
        />
        <div
          className={`h-1.5 rounded-full transition-all duration-300 ${step === 1 ? "w-8 bg-[var(--accent)]" : "w-4 bg-[var(--border)]"}`}
        />
      </div>
    </div>
  );
}
