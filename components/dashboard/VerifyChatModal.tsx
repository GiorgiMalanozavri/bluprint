"use client";

import { AnimatePresence, motion } from "framer-motion";
import { X, Send, ShieldCheck, Sparkles } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { userStorage } from "@/lib/user-storage";
import type { SkillNode } from "@/lib/skill-tree";
import { getCategoryColor } from "@/lib/skill-tree";

type Msg = { role: "user" | "assistant"; content: string };

export default function VerifyChatModal({
  node,
  open,
  onClose,
  onVerified,
}: {
  node: SkillNode | null;
  open: boolean;
  onClose: () => void;
  onVerified: (nodeId: string) => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [confidence, setConfidence] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!open) return;
    setMessages([]);
    setInput("");
    setVerified(false);
    setConfidence(0);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    setTimeout(() => inputRef.current?.focus(), 200);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, pending]);

  if (!open || !mounted || !node) return null;

  const color = getCategoryColor(node.category);

  const send = async () => {
    const msg = input.trim();
    if (!msg || pending) return;
    setInput("");
    const newMsgs: Msg[] = [...messages, { role: "user", content: msg }];
    setMessages(newMsgs);
    setPending(true);

    try {
      const profileRaw = userStorage.getItem("bluprint_profile_review");
      const profile = profileRaw ? JSON.parse(profileRaw) : null;

      const res = await fetch("/api/verify-completion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskTitle: node.title,
          taskCategory: node.category,
          taskWhy: node.why,
          message: msg,
          history: newMsgs.slice(-10),
          profile,
        }),
      });
      const data = await res.json();
      if (data.reply) {
        setMessages((p) => [...p, { role: "assistant", content: data.reply }]);
      }
      if (data.confidence) setConfidence(data.confidence);
      if (data.verified) {
        setVerified(true);
        setTimeout(() => onVerified(node.id), 1500);
      }
    } catch {
      setMessages((p) => [...p, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setPending(false);
    }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 26, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-lg flex flex-col rounded-2xl border border-[var(--border)] bg-[var(--background)] shadow-2xl overflow-hidden"
          style={{ maxHeight: "85vh" }}
        >
          {/* Header */}
          <div className="shrink-0 border-b border-[var(--border)] px-5 py-4"
            style={{ background: `linear-gradient(135deg, ${color}08, ${color}15)` }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: `${color}20`, border: `2px solid ${color}40` }}>
                  <ShieldCheck size={18} style={{ color }} />
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-[var(--foreground)]">{node.title}</p>
                  <p className="mt-0.5 text-[10.5px] text-[var(--muted)]">
                    Convince the AI you completed this task
                  </p>
                </div>
              </div>
              <button onClick={onClose}
                className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--background-secondary)] transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Confidence bar */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: verified ? "#22c55e" : color }}
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-[10px] font-medium tabular-nums"
                style={{ color: verified ? "#22c55e" : "var(--muted)" }}>
                {verified ? "✓ Verified!" : `${confidence}%`}
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3" style={{ minHeight: 200 }}>
            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: `${color}15`, border: `2px solid ${color}30` }}>
                  <ShieldCheck size={22} style={{ color }} />
                </div>
                <p className="text-sm font-medium text-[var(--foreground)]">Ready to verify?</p>
                <p className="mt-1.5 text-[11.5px] text-[var(--muted)] max-w-xs mx-auto leading-relaxed">
                  Tell me what you did to complete this task. Be specific — the AI will ask follow-up questions.
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center mt-0.5"
                    style={{ background: `${color}20` }}>
                    <Sparkles size={10} style={{ color }} />
                  </div>
                )}
                <div className={`max-w-[85%] text-[13px] leading-relaxed ${
                  m.role === "assistant"
                    ? "text-[var(--foreground)]"
                    : "rounded-2xl bg-[var(--surface)] border border-[var(--border)] px-3 py-2 text-[var(--foreground)]"
                }`}>
                  {m.content}
                </div>
              </div>
            ))}

            {pending && (
              <div className="flex gap-2.5">
                <div className="h-6 w-6 shrink-0 rounded-full flex items-center justify-center mt-0.5"
                  style={{ background: `${color}20` }}>
                  <Sparkles size={10} style={{ color }} />
                </div>
                <div className="flex items-center gap-1 pt-2">
                  <span className="h-1.5 w-1.5 bg-[var(--muted)] rounded-full animate-bounce" />
                  <span className="h-1.5 w-1.5 bg-[var(--muted)] rounded-full animate-bounce [animation-delay:0.15s]" />
                  <span className="h-1.5 w-1.5 bg-[var(--muted)] rounded-full animate-bounce [animation-delay:0.3s]" />
                </div>
              </div>
            )}

            {verified && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3"
              >
                <ShieldCheck size={18} className="text-emerald-500" />
                <p className="text-[13px] font-medium text-emerald-600">
                  Task verified — node unlocked
                </p>
              </motion.div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          {!verified && (
            <div className="shrink-0 px-4 pb-4 pt-2 border-t border-[var(--border)]">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                  }}
                  placeholder="Describe what you did..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 pr-12 text-[13px] outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 min-h-[44px] max-h-28 resize-none"
                  rows={1}
                />
                <button onClick={send} disabled={pending || !input.trim()}
                  className="absolute right-2 bottom-2 h-7 w-7 flex items-center justify-center rounded-lg text-white disabled:opacity-20 transition-all"
                  style={{ background: color }}>
                  <Send size={12} />
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
