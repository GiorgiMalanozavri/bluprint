"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X, Send, Minimize2, Check, Calendar, BookOpen, Plus } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { userStorage } from "@/lib/user-storage";

type Message = { role: "user" | "assistant"; content: string; actions?: AIAction[] };
type AIAction = { type: string; data: Record<string, any>; confirm: string };

export type PageContext = {
  page: string;
  data?: Record<string, unknown>;
};

const SUGGESTIONS: Record<string, { label: string; msg: string }[]> = {
  planner: [
    { label: "Add an event", msg: "I need to add something to my calendar" },
    { label: "Optimize my week", msg: "Look at my calendar and suggest how to optimize my schedule this week." },
    { label: "Study plan", msg: "Create a study plan for my upcoming exams." },
  ],
  "cv-analyzer": [
    { label: "Improve my CV", msg: "What are the most impactful improvements I can make to my resume right now?" },
    { label: "Write a bullet", msg: "Help me write a stronger bullet point for my most recent experience." },
    { label: "Cover letter", msg: "Draft a cover letter based on my profile." },
  ],
  roadmap: [
    { label: "What's next?", msg: "What should I focus on next in my career roadmap?" },
    { label: "Am I on track?", msg: "Review my roadmap progress and tell me if I'm on track." },
  ],
  month: [
    { label: "Prioritize tasks", msg: "Help me prioritize my tasks for this month." },
    { label: "What matters most?", msg: "Which of my monthly tasks will have the biggest impact?" },
  ],
  overview: [
    { label: "Warm intro help", msg: "Help me polish a short LinkedIn DM to ask an alum for a 10-minute coffee chat." },
    { label: "Today's micro-skill", msg: "What's one 15-minute skill I can learn today that matches my dream role?" },
    { label: "Weekly sync", msg: "What should my Friday portfolio push be this week based on my profile?" },
  ],
  default: [
    { label: "Review my plan", msg: "Review my roadmap and give me feedback." },
    { label: "Career advice", msg: "What should I focus on this semester for my career?" },
    { label: "Interview prep", msg: "Help me prepare for interviews." },
  ],
};

function getPageKey(pathname: string, tab: string | null): string {
  if (pathname === "/planner") return "planner";
  if (pathname === "/cv-analyzer") return "cv-analyzer";
  if (pathname === "/dashboard") {
    if (tab === "roadmap") return "roadmap";
    if (tab === "month") return "month";
    if (tab === "assistant") return "default";
    return "overview";
  }
  return "default";
}

function getPageLabel(key: string): string {
  const labels: Record<string, string> = {
    planner: "Planner",
    "cv-analyzer": "CV Analyzer",
    roadmap: "Roadmap",
    month: "This Month",
    overview: "Overview",
    default: "bluprint",
  };
  return labels[key] || "bluprint";
}

function getActionIcon(type: string) {
  if (type === "create_event") return Calendar;
  if (type === "create_course") return BookOpen;
  if (type === "add_coursework_item") return Plus;
  return Check;
}

// Execute an AI action by modifying localStorage
function executeAction(action: AIAction): boolean {
  try {
    const { type, data } = action;

    if (type === "create_event") {
      const raw = userStorage.getItem("bluprint_planner_entries_v2");
      const entries = raw ? JSON.parse(raw) : [];
      const newEntry = {
        id: `ai_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        title: data.title || "New Event",
        date: data.date || new Date().toISOString().slice(0, 10),
        start: data.start ?? 9,
        end: data.end ?? 10,
        type: data.type || "Class",
        location: data.location || "",
        notes: data.notes || "",
        allDay: false,
        repeat: "none",
        alert: "none",
      };
      entries.push(newEntry);
      userStorage.setItem("bluprint_planner_entries_v2", JSON.stringify(entries));
      return true;
    }

    if (type === "create_course") {
      const raw = userStorage.getItem("bluprint_coursework_v1");
      const courses = raw ? JSON.parse(raw) : [];
      // Check if course already exists
      if (courses.some((c: any) => c.name.toLowerCase() === (data.name || "").toLowerCase())) return true;
      courses.push({
        id: `course_${Date.now()}`,
        name: data.name || "New Course",
        color: data.color || "#4F46E5",
        items: [],
      });
      userStorage.setItem("bluprint_coursework_v1", JSON.stringify(courses));
      return true;
    }

    if (type === "add_coursework_item") {
      const raw = userStorage.getItem("bluprint_coursework_v1");
      const courses = raw ? JSON.parse(raw) : [];
      const course = courses.find((c: any) => c.name.toLowerCase() === (data.courseName || "").toLowerCase());
      if (!course) return false;
      course.items.push({
        id: `item_${Date.now()}`,
        title: data.title || "New Item",
        type: data.type || "Homework",
        dueDate: data.dueDate || "",
        done: false,
        weight: data.weight || 0,
        score: null,
      });
      userStorage.setItem("bluprint_coursework_v1", JSON.stringify(courses));
      return true;
    }

    if (type === "complete_task") {
      const raw = userStorage.getItem("bluprint_completed_tasks");
      const completed = raw ? JSON.parse(raw) : [];
      if (!completed.includes(data.taskId)) {
        completed.push(data.taskId);
        userStorage.setItem("bluprint_completed_tasks", JSON.stringify(completed));
      }
      return true;
    }

    return false;
  } catch {
    return false;
  }
}

export default function AISidebar() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [executedActions, setExecutedActions] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = searchParams.get("tab");
  const pageKey = getPageKey(pathname, tab);
  const [minimized, setMinimized] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ role: string; content: string }[]>([]);

  const getPageContext = useCallback((): PageContext => {
    const ctx: PageContext = { page: pageKey, data: {} };
    try {
      const coursework = userStorage.getItem("bluprint_coursework_v1");
      if (coursework) {
        const courses = JSON.parse(coursework);
        ctx.data!.coursework = courses.map((c: any) => ({
          name: c.name,
          items: c.items?.map((i: any) => ({
            title: i.title, type: i.type, dueDate: i.dueDate,
            done: i.done, weight: i.weight, score: i.score,
          })) || [],
        }));
      }
      const planner = userStorage.getItem("bluprint_planner_entries_v2");
      if (planner) {
        const entries = JSON.parse(planner);
        const now = new Date();
        const day = now.getDay();
        const mon = new Date(now);
        mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        const sun = new Date(mon);
        sun.setDate(mon.getDate() + 6);
        const monISO = mon.toISOString().slice(0, 10);
        const sunISO = sun.toISOString().slice(0, 10);
        ctx.data!.thisWeekSchedule = entries
          .filter((e: any) => e.date >= monISO && e.date <= sunISO)
          .map((e: any) => ({ title: e.title, date: e.date, start: e.start, end: e.end, type: e.type }));
      }
    } catch { /* ignore */ }
    return ctx;
  }, [pageKey]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages, pending]);
  useEffect(() => {
    if (open && textareaRef.current) textareaRef.current.focus();
  }, [open]);

  const handleAction = (action: AIAction, msgIndex: number, actionIndex: number) => {
    const key = `${msgIndex}_${actionIndex}`;
    if (executedActions.has(key)) return;
    const success = executeAction(action);
    if (success) {
      setExecutedActions(prev => new Set(prev).add(key));
      // Trigger page refresh to show changes
      window.dispatchEvent(new Event("bluprint-data-changed"));
    }
  };

  const sendMessage = async () => {
    const msg = input.trim();
    if (!msg || pending) return;

    setInput("");
    setMessages(prev => [...prev, { role: "user", content: msg }]);
    const newHistory = [...chatHistory, { role: "user", content: msg }];
    setChatHistory(newHistory);
    setPending(true);

    try {
      const pageContext = getPageContext();
      const profile = userStorage.getItem("bluprint_profile_review");
      const roadmap = userStorage.getItem("bluprint_ai_roadmap");

      const res = await fetch("/api/assistant-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          pageContext,
          profile: profile ? JSON.parse(profile) : null,
          roadmap: roadmap ? JSON.parse(roadmap) : null,
          history: newHistory.slice(-10),
        }),
      });
      const data = await res.json();
      if (data.reply) {
        const assistantMsg: Message = {
          role: "assistant",
          content: data.reply,
          actions: data.actions || [],
        };
        setMessages(prev => [...prev, assistantMsg]);
        setChatHistory(prev => [...prev, { role: "assistant", content: data.reply }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Something went wrong. Try again." }]);
    } finally {
      setPending(false);
    }
  };

  const suggestions = SUGGESTIONS[pageKey] || SUGGESTIONS.default;

  // Don't show on the AI tab (it has its own chat)
  if (pathname === "/dashboard" && tab === "assistant") return null;
  if (pathname === "/" || pathname === "/sign-in" || pathname === "/sign-up" || pathname === "/pricing" || pathname === "/onboarding") return null;

  return (
    <>
      {/* Floating button */}
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => { setOpen(true); setMinimized(false); }}
            className="fixed z-50 h-12 w-12 rounded-full bg-[var(--foreground)] text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center bottom-20 right-6 sm:bottom-6"
          >
            <Sparkles size={20} />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sidebar panel */}
      <AnimatePresence>
        {open && !minimized && (
          <motion.div
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-50 w-[380px] max-w-[calc(100vw-16px)] flex flex-col bg-[var(--background)] border-l border-[var(--border)] shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-[var(--accent)] flex items-center justify-center">
                  <Sparkles size={13} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">AI Assistant</p>
                  <p className="text-[10px] text-[var(--muted)] flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    {getPageLabel(pageKey)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => { setMessages([]); setChatHistory([]); setExecutedActions(new Set()); }}
                  className="rounded-lg px-2 py-1 text-[10px] font-medium text-[var(--muted)] hover:bg-[var(--background-secondary)] transition-colors">
                  Clear
                </button>
                <button onClick={() => setMinimized(true)}
                  className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--background-secondary)] transition-colors">
                  <Minimize2 size={14} />
                </button>
                <button onClick={() => setOpen(false)}
                  className="rounded-lg p-1.5 text-[var(--muted)] hover:bg-[var(--background-secondary)] transition-colors">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
              {/* Empty state */}
              {messages.length === 0 && (
                <div className="pt-6">
                  <div className="text-center mb-6">
                    <div className="h-10 w-10 rounded-xl bg-[var(--accent)]/10 flex items-center justify-center mx-auto mb-3">
                      <Sparkles size={18} className="text-[var(--accent)]" />
                    </div>
                    <p className="text-sm font-medium text-[var(--foreground)]">How can I help?</p>
                    <p className="text-[11px] text-[var(--muted)] mt-1">I can add events, courses, and help with your work.</p>
                  </div>
                  <div className="space-y-1.5">
                    {suggestions.map(s => (
                      <button key={s.label} onClick={() => { setInput(s.msg); textareaRef.current?.focus(); }}
                        className="w-full text-left rounded-xl border border-[var(--border)] px-3 py-2.5 hover:bg-[var(--surface)] hover:border-[var(--accent)]/20 transition-all group">
                        <p className="text-[12px] font-medium text-[var(--foreground)] group-hover:text-[var(--accent)] transition-colors">{s.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Chat messages */}
              {messages.map((m, i) => (
                <div key={i}>
                  <div className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : ""}`}>
                    {m.role === "assistant" && (
                      <div className="h-6 w-6 shrink-0 rounded-full bg-[var(--accent)] flex items-center justify-center mt-0.5">
                        <Sparkles size={10} className="text-white" />
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

                  {/* Action buttons */}
                  {m.actions && m.actions.length > 0 && (
                    <div className="ml-8 mt-2 space-y-1.5">
                      {m.actions.map((action, j) => {
                        const key = `${i}_${j}`;
                        const done = executedActions.has(key);
                        const Icon = getActionIcon(action.type);
                        return (
                          <button
                            key={j}
                            onClick={() => handleAction(action, i, j)}
                            disabled={done}
                            className={`w-full text-left flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-medium transition-all ${
                              done
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-[var(--accent)]/5 text-[var(--accent)] border border-[var(--accent)]/20 hover:bg-[var(--accent)]/10 hover:border-[var(--accent)]/40"
                            }`}
                          >
                            {done ? <Check size={13} /> : <Icon size={13} />}
                            {done ? `Done: ${action.confirm}` : action.confirm}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}

              {/* Typing */}
              {pending && (
                <div className="flex gap-2.5">
                  <div className="h-6 w-6 shrink-0 rounded-full bg-[var(--accent)] flex items-center justify-center mt-0.5">
                    <Sparkles size={10} className="text-white" />
                  </div>
                  <div className="flex items-center gap-1 pt-2">
                    <span className="h-1.5 w-1.5 bg-[var(--muted)] rounded-full animate-bounce" />
                    <span className="h-1.5 w-1.5 bg-[var(--muted)] rounded-full animate-bounce [animation-delay:0.15s]" />
                    <span className="h-1.5 w-1.5 bg-[var(--muted)] rounded-full animate-bounce [animation-delay:0.3s]" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="shrink-0 px-4 pb-4 pt-2 border-t border-[var(--border)]">
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                  placeholder="Ask anything or tell me to add an event..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 pr-12 text-[13px] outline-none transition-all focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/10 min-h-[44px] max-h-28 resize-none"
                  rows={1}
                />
                <button onClick={sendMessage} disabled={pending || !input.trim()}
                  className="absolute right-2 bottom-2 h-7 w-7 flex items-center justify-center rounded-lg bg-[var(--foreground)] text-white disabled:opacity-20 hover:bg-[#333] transition-all">
                  <Send size={12} />
                </button>
              </div>
              <p className="mt-1.5 text-center text-[9px] text-[var(--muted)]">Try: &quot;Add my Calculus exam on Friday at 2pm&quot;</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Minimized bar */}
      <AnimatePresence>
        {open && minimized && (
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 20, opacity: 0 }}
            onClick={() => setMinimized(false)}
            className="fixed z-50 flex items-center gap-2 rounded-full bg-[var(--foreground)] text-white pl-3 pr-4 py-2.5 shadow-lg hover:shadow-xl transition-all bottom-20 right-6 sm:bottom-6"
          >
            <Sparkles size={14} />
            <span className="text-xs font-medium">AI</span>
            {messages.length > 0 && (
              <span className="text-[10px] opacity-60">{messages.length}</span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Backdrop on mobile */}
      <AnimatePresence>
        {open && !minimized && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMinimized(true)}
            className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[2px] sm:hidden"
          />
        )}
      </AnimatePresence>
    </>
  );
}
