"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const faq = [
  {
    question: "Is it really free to start?",
    answer: "Yes. You can start on the free plan permanently. No credit card required to get your first roadmap and CV score.",
  },
  {
    question: "What does the AI actually do?",
    answer: "It builds your semester-by-semester roadmap, analyzes your CV against target roles, drafts networking messages, and answers career questions tailored to your specific profile.",
  },
  {
    question: "I'm an international student. Is this for me?",
    answer: "Absolutely. bluprint was built with international students in mind. During setup, we ask about your visa status to ensure your roadmap includes crucial timing for internships and documentation.",
  },
];

export default function PricingPage() {
  return (
    <div className="bg-[var(--background)] min-h-screen pt-24 pb-20">
      <main className="page-frame max-w-4xl mx-auto animate-fade-up">
        {/* Header */}
        <div className="text-center mb-16 px-4">
          <h1 className="text-[2.5rem] md:text-[3rem] font-semibold tracking-tight">Simple, transparent pricing.</h1>
          <p className="mt-4 text-lg text-[var(--muted)] max-w-xl mx-auto">One plan for every student. bluprint adapts to your profile automatically during onboarding.</p>
        </div>

        {/* Pricing Card */}
        <div className="relative mb-20 px-4">
          <div className="absolute inset-0 bg-[var(--accent)]/5 blur-3xl rounded-full -z-10" />
          <div className="surface-card max-w-2xl mx-auto p-8 md:p-12 transition-all hover:shadow-md">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10 pb-10 border-b border-[var(--border)]">
              <div>
                <span className="inline-flex items-center rounded-full bg-[var(--accent-light)] px-3 py-1 text-xs font-medium uppercase tracking-wider text-[var(--accent)]">Student Plan</span>
                <p className="mt-4 text-[3rem] font-semibold">&pound;8<span className="text-base font-medium text-[var(--muted)] ml-1">/month</span></p>
              </div>
              <div className="flex flex-col gap-2">
                 <Link href="/sign-up" className="btn-primary h-12 px-10 text-[15px]">Get started free</Link>
                 <p className="text-[10px] text-center text-[var(--muted)] font-medium tracking-wide font-mono uppercase">Cancel anytime</p>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-4">
              {[
                "Full roadmap generation",
                "Monthly action dashboard",
                "CV analysis suggestions",
                "AI assistant & drafting",
                "Visa-aware planning",
                "Job description analysis",
                "Weekly profile-based guidance",
                "Priority support"
              ].map((label) => (
                <div key={label} className="flex items-center gap-3">
                  <CheckCircle2 size={17} className="text-[var(--accent)] shrink-0" />
                  <span className="text-sm font-medium text-[var(--muted-foreground)]">{label}</span>
                </div>
              ))}
            </div>

            <p className="mt-10 text-xs leading-relaxed text-[var(--muted)] text-center italic">
              bluprint adapts to your domestic or international status during setup to adjust your roadmap timing automatically.
            </p>
          </div>
        </div>

        {/* FAQ Section */}
        <section className="max-w-2xl mx-auto px-4">
          <h2 className="text-2xl font-semibold text-center mb-10">Frequently asked questions</h2>
          <div className="space-y-3">
            {faq.map((item) => (
              <FaqItem key={item.question} question={item.question} answer={item.answer} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={`rounded-2xl border transition-all ${open ? 'border-[var(--border)] bg-[var(--surface)] shadow-sm' : 'border-[var(--border)] bg-[var(--surface)] hover:border-[var(--border-hover)]'}`}>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between p-6 text-left">
        <span className="text-[15px] font-semibold">{question}</span>
        <ChevronDown size={16} className={`text-[var(--muted)] transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-6 pb-6 pt-0">
               <p className="text-sm leading-relaxed text-[var(--muted)] max-w-xl">{answer}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
