"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  Trash2, X, MapPin, BookOpen, Briefcase, Dumbbell, GraduationCap,
  Repeat2, Bell, AlignLeft, ChevronLeft, ChevronRight, Calendar,
  Upload, Check, FileText, ChevronDown,
} from "lucide-react";
import { createPortal } from "react-dom";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import { CalendarIntegrationPanel } from "./CalendarIntegrationPanel";
import { userStorage } from "@/lib/user-storage";

// ─── Types ────────────────────────────────────────────────────────────────────
export type MonthlyTask = { id: string; title: string; category: string; effort: string; why: string };

export type PlannerEntry = {
  id:       string;
  title:    string;
  date:     string; // ISO "YYYY-MM-DD"
  /** kept for back-compat when loading old localStorage data - populated at load time */
  day?:     string;
  start:    number; // decimal hour; -1 = all-day
  end:      number;
  type:     "Class" | "Activity" | "Study" | "Work";
  location: string;
  notes:    string;
  allDay:   boolean;
  repeat:   "none" | "daily" | "weekly" | "biweekly" | "monthly";
  alert:    "none" | "5min" | "15min" | "30min" | "1hr";
  repeatId?: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const WEEKDAYS    = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const plannerHours = Array.from({ length: 15 }, (_, i) => 7 + i); // 7am–9pm
const HOUR_HEIGHT  = 72;
const FIRST_HOUR   = plannerHours[0];
const LAST_HOUR    = plannerHours[plannerHours.length - 1];

const TYPE_CONFIG = {
  Class:    { icon: GraduationCap, card: "bg-[#eaf2ff] border-[#cce0ff] text-[#0055cc]",    pill: "bg-[#007aff] text-white",    bar: "bg-[#007aff]",    ring: "ring-[#007aff]/50"    },
  Activity: { icon: Dumbbell,       card: "bg-[#ffeded] border-[#ffdbdc] text-[#cc0011]", pill: "bg-[#ff3b30] text-white",  bar: "bg-[#ff3b30]",  ring: "ring-[#ff3b30]/50"  },
  Study:    { icon: BookOpen,       card: "bg-[#f5eeff] border-[#e8daff] text-[#6600cc]", pill: "bg-[#af52de] text-white",  bar: "bg-[#af52de]",  ring: "ring-[#af52de]/50"  },
  Work:     { icon: Briefcase,      card: "bg-[#ebfbf3] border-[#c2f0d9] text-[#008844]", pill: "bg-[#34c759] text-white", bar: "bg-[#34c759]", ring: "ring-[#34c759]/50" },
} as const;

const REPEAT_LABELS: Record<PlannerEntry["repeat"], string> = {
  none: "Never", daily: "Every Day", weekly: "Every Week", biweekly: "Every 2 Weeks", monthly: "Every Month",
};
const ALERT_LABELS: Record<PlannerEntry["alert"], string> = {
  none: "None", "5min": "5 min before", "15min": "15 min before", "30min": "30 min before", "1hr": "1 hr before",
};

// ─── Date Helpers ─────────────────────────────────────────────────────────────
function toISO(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Monday of the ISO week containing `d` */
function weekMonday(d: Date): Date {
  const day = d.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const m = new Date(d);
  m.setDate(d.getDate() + diff);
  m.setHours(0, 0, 0, 0);
  return m;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(d.getDate() + n);
  return r;
}

/** "Mon 10", "Tue 11" etc. */
function fmtDayHeader(d: Date): { short: string; num: number } {
  return {
    short: d.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase(),
    num:   d.getDate(),
  };
}

/** "March 10 – 14, 2026" */
function fmtWeekRange(monday: Date): string {
  const friday = addDays(monday, 4);
  const sameMonth = monday.getMonth() === friday.getMonth();
  const sameYear  = monday.getFullYear() === friday.getFullYear();
  const opts: Intl.DateTimeFormatOptions = { month: "long", day: "numeric" };
  const start = monday.toLocaleDateString("en-US", opts);
  const end   = friday.toLocaleDateString("en-US", sameMonth ? { day: "numeric" } : opts);
  return `${start}–${end}, ${friday.getFullYear()}`;
}

function isToday(d: Date): boolean {
  return toISO(d) === toISO(new Date());
}

function currentDecimalHour() {
  const n = new Date(); return n.getHours() + n.getMinutes() / 60;
}

function snap(v: number) { return Math.round(v * 2) / 2; }

function fmtHour(v: number): string {
  const h = Math.floor(v);
  const m = v % 1 >= 0.5 ? ":30" : "";
  const s = h >= 12 ? "PM" : "AM";
  const n = h % 12 === 0 ? 12 : h % 12;
  return `${n}${m} ${s}`;
}

function parseTime(raw: string): number | null {
  const s = raw.trim().toLowerCase().replace(/\s+/g, "");
  const isPM = s.endsWith("pm"), isAM = s.endsWith("am");
  const c = s.replace(/am|pm/, "");
  let h = 0, m = 0;
  if (c.includes(":")) { const [hs, ms] = c.split(":"); h = +hs; m = +(ms || 0); }
  else if (c.length <= 2) h = +c;
  else if (c.length === 3) { h = +c[0]; m = +c.slice(1); }
  else if (c.length === 4) { h = +c.slice(0, 2); m = +c.slice(2); }
  else return null;
  if (isNaN(h) || isNaN(m)) return null;
  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;
  if (h < 0 || h > 23 || m < 0 || m >= 60) return null;
  return h + m / 60;
}

/** Migrate old `day`-based entries to `date`-based (pinned to current week) */
export function migrateEntries(raw: any[]): PlannerEntry[] {
  const mon = weekMonday(new Date());
  const dayToOffset: Record<string, number> = {
    Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4,
  };
  return raw.map((e) => {
    if (e.date) return { notes: "", allDay: false, repeat: "none", alert: "none", ...e };
    const offset = dayToOffset[e.day as string] ?? 0;
    const d = addDays(mon, offset);
    return {
      notes: "", allDay: false, repeat: "none", alert: "none",
      ...e,
      date: toISO(d),
    };
  });
}

// ─── Time Input ───────────────────────────────────────────────────────────────
function TimeInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [raw, setRaw] = useState(fmtHour(value));
  const [err, setErr] = useState(false);
  useEffect(() => { setRaw(fmtHour(value)); }, [value]);
  return (
    <input
      value={raw}
      onChange={(e) => { setRaw(e.target.value); setErr(false); }}
      onBlur={() => {
        const p = parseTime(raw);
        if (p !== null) { onChange(snap(p)); setRaw(fmtHour(snap(p))); setErr(false); }
        else { setErr(true); setRaw(fmtHour(value)); }
      }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { setRaw(fmtHour(value)); (e.target as HTMLElement).blur(); } }}
      className={`w-full rounded-lg border px-3 py-2 text-sm font-semibold outline-none transition-all ${err ? "border-red-400/50 bg-red-500/15 text-red-400" : "border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--foreground)] focus:border-[var(--accent)] focus:bg-[var(--surface)]"}`}
      placeholder="9:00 AM"
    />
  );
}

// ─── Popover ──────────────────────────────────────────────────────────────────
function EventPopover({ entry, onClose, onUpdate, onDelete, onRepeatChange }: {
  entry: PlannerEntry; onClose: () => void;
  onUpdate: (u: Partial<PlannerEntry>) => void;
  onDelete: () => void;
  onRepeatChange: (e: PlannerEntry, r: PlannerEntry["repeat"]) => void;
}) {
  const cfg = TYPE_CONFIG[entry.type];
  const Icon = cfg.icon;
  const [title, setTitle] = useState(entry.title);
  const saveTitle = () => { if (title !== entry.title) onUpdate({ title }); };

  return (
    <div className="w-80 rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-lg)] overflow-hidden" onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()} data-popover>
      <div className={`h-1.5 ${cfg.bar}`} />
      <div className="p-5 space-y-4">
        {/* Title */}
        <div className="flex items-start gap-2">
          <div className={`mt-0.5 rounded-xl p-2 shrink-0 ${cfg.pill}`}><Icon size={14} /></div>
          <div className="flex-1 min-w-0">
            <textarea rows={1} value={title} onChange={(e) => setTitle(e.target.value)} onBlur={saveTitle}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveTitle(); onClose(); } if (e.key === "Escape") onClose(); }}
              placeholder="New Event" autoFocus
              className="w-full resize-none bg-transparent text-lg font-bold text-[var(--foreground)] outline-none placeholder:text-[var(--muted)] leading-tight" />
          </div>
          <button onClick={onClose} className="rounded-full p-1 text-[var(--muted)] hover:bg-[var(--background-secondary)] mt-0.5 shrink-0 transition-colors"><X size={15} /></button>
        </div>

        {/* Date + time */}
        <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[var(--surface-secondary)]/50">
            <Calendar size={13} className="text-[var(--muted)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--muted)] shrink-0">All-day</span>
            <button onClick={() => onUpdate({ allDay: !entry.allDay })}
              className={`ml-auto relative h-5 w-9 rounded-full transition-colors duration-200 ${entry.allDay ? "bg-[var(--accent)]" : "bg-[var(--border)]"}`}>
              <div className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-200 ${entry.allDay ? "left-[18px]" : "left-0.5"}`} />
            </button>
          </div>
          {/* Date picker */}
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[var(--surface)]">
            <div className="w-[13px] shrink-0" />
            <span className="text-xs font-semibold text-[var(--muted)] shrink-0">Date</span>
            <input type="date" value={entry.date} onChange={(e) => onUpdate({ date: e.target.value })}
              className="ml-auto bg-transparent text-xs font-semibold text-[var(--foreground)] outline-none" />
          </div>
          {!entry.allDay && (
            <>
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[var(--surface-secondary)]/30">
                <div className="w-[13px] shrink-0" />
                <span className="text-xs font-semibold text-[var(--muted)] shrink-0 w-12">From</span>
                <TimeInput value={entry.start} onChange={(v) => onUpdate({ start: v, end: Math.max(entry.end, v + 0.5) })} />
              </div>
              <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[var(--surface)]">
                <div className="w-[13px] shrink-0" />
                <span className="text-xs font-semibold text-[var(--muted)] shrink-0 w-12">To</span>
                <TimeInput value={entry.end} onChange={(v) => onUpdate({ end: Math.max(v, entry.start + 0.5) })} />
              </div>
            </>
          )}
        </div>

        {/* Type */}
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2">Calendar</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(TYPE_CONFIG) as PlannerEntry["type"][]).map((t) => {
              const c = TYPE_CONFIG[t]; const TI = c.icon; const active = entry.type === t;
              return (
                <button key={t} onClick={() => onUpdate({ type: t })}
                  className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold border-2 transition-all ${active ? `${c.card} border-current shadow-sm` : "border-transparent bg-[var(--surface-secondary)] text-[var(--muted)] hover:bg-[var(--background-secondary)]"}`}>
                  <TI size={12} />{t}
                </button>
              );
            })}
          </div>
        </div>

        {/* Meta */}
        <div className="divide-y divide-[var(--border)] rounded-xl border border-[var(--border)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[var(--surface-secondary)]/50">
            <Repeat2 size={13} className="text-[var(--muted)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--muted)] shrink-0">Repeat</span>
            <select value={entry.repeat} onChange={(e) => onRepeatChange(entry, e.target.value as PlannerEntry["repeat"])}
              className="ml-auto bg-transparent text-xs font-semibold text-[var(--foreground)] outline-none text-right">
              {(Object.entries(REPEAT_LABELS) as [PlannerEntry["repeat"], string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[var(--surface)]">
            <Bell size={13} className="text-[var(--muted)] shrink-0" />
            <span className="text-xs font-semibold text-[var(--muted)] shrink-0">Alert</span>
            <select value={entry.alert} onChange={(e) => onUpdate({ alert: e.target.value as PlannerEntry["alert"] })}
              className="ml-auto bg-transparent text-xs font-semibold text-[var(--foreground)] outline-none text-right">
              {(Object.entries(ALERT_LABELS) as [PlannerEntry["alert"], string][]).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[var(--surface-secondary)]/50">
            <MapPin size={13} className="text-[var(--muted)] shrink-0" />
            <input value={entry.location} onChange={(e) => onUpdate({ location: e.target.value })}
              placeholder="Location" className="flex-1 bg-transparent text-xs font-semibold text-[var(--foreground)] outline-none placeholder:text-[var(--muted)]" />
          </div>
          <div className="flex items-start gap-2.5 px-3 py-2.5 bg-[var(--surface)]">
            <AlignLeft size={13} className="text-[var(--muted)] shrink-0 mt-0.5" />
            <textarea value={entry.notes} onChange={(e) => onUpdate({ notes: e.target.value })}
              placeholder="Notes" rows={2}
              className="flex-1 resize-none bg-transparent text-xs text-[var(--foreground)] font-semibold outline-none placeholder:text-[var(--muted)] leading-relaxed" />
          </div>
        </div>

        <div className="flex gap-2">
          <button onClick={() => { saveTitle(); onClose(); }} className="flex-1 rounded-xl bg-[var(--accent)] py-2.5 text-xs font-bold text-white hover:bg-[var(--accent-hover)] active:scale-[0.98] transition-all">Done</button>
          <button onClick={onDelete} className="rounded-xl border border-[var(--border)] px-4 py-2.5 text-xs font-bold text-[var(--muted)] hover:border-red-500/30 hover:bg-red-500/15 hover:text-red-400 active:scale-[0.98] transition-all">Delete</button>
        </div>
      </div>
    </div>
  );
}

// ─── Event Card ───────────────────────────────────────────────────────────────
function EventCard({ entry, top, height, isEditing, setEditingId, onUpdate, onDelete, entries, setEntries, onRepeatChange, colEl }: {
  entry: PlannerEntry; top: number; height: number; isEditing: boolean;
  setEditingId: (id: string | null) => void;
  onUpdate: (id: string, u: Partial<PlannerEntry>) => void;
  onDelete: (id: string) => void;
  entries: PlannerEntry[]; setEntries: (e: PlannerEntry[]) => void;
  onRepeatChange: (e: PlannerEntry, r: PlannerEntry["repeat"]) => void;
  colEl: HTMLDivElement | null;
}) {
  const cfg = TYPE_CONFIG[entry.type];
  const cardRef = useRef<HTMLDivElement>(null);
  const isSmall = height < 44;
  const isTiny  = height < 26;

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    e.preventDefault(); e.stopPropagation();
    const sy = e.clientY, sx = e.clientX;
    const orig = { ...entry };
    let moved = false;

    const gridEl = colEl?.closest<HTMLElement>("[data-grid]");
    const allCols: { date: string; rect: DOMRect }[] = [];
    gridEl?.querySelectorAll<HTMLElement>("[data-day-col]").forEach((el) => {
      const d = el.dataset.dayCol;
      if (d) allCols.push({ date: d, rect: el.getBoundingClientRect() });
    });

    const onMove = (me: PointerEvent) => {
      const dy = me.clientY - sy, dx = me.clientX - sx;
      if (!moved && (Math.abs(dy) > 4 || Math.abs(dx) > 4)) moved = true;
      if (!moved || !cardRef.current) return;
      cardRef.current.style.transform = `translate(${dx}px,${dy}px)`;
      cardRef.current.style.opacity = "0.72";
      cardRef.current.style.zIndex = "800";
    };

    const onUp = (ue: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      if (cardRef.current) { cardRef.current.style.transform = ""; cardRef.current.style.opacity = ""; cardRef.current.style.zIndex = ""; }
      if (!moved) { setEditingId(entry.id); return; }

      const dy = ue.clientY - sy;
      let targetDate = entry.date;
      for (const { date, rect } of allCols) {
        if (ue.clientX >= rect.left && ue.clientX <= rect.right) { targetDate = date; break; }
      }
      const hourDelta = snap(dy / HOUR_HEIGHT);
      const newStart = snap(Math.max(FIRST_HOUR, Math.min(LAST_HOUR - (orig.end - orig.start), orig.start + hourDelta)));
      const newEnd   = snap(Math.min(LAST_HOUR + 1, newStart + (orig.end - orig.start)));
      setEntries(entries.map((ev) => ev.id === entry.id ? { ...ev, date: targetDate, start: newStart, end: newEnd } : ev));
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const handleResize = (e: React.PointerEvent) => {
    e.preventDefault(); e.stopPropagation();
    const sy = e.clientY, se = entry.end;
    const onMove = (me: PointerEvent) => {
      const ne = snap(Math.max(entry.start + 0.5, Math.min(LAST_HOUR + 1, se + (me.clientY - sy) / HOUR_HEIGHT)));
      setEntries(entries.map((ev) => ev.id === entry.id ? { ...ev, end: ne } : ev));
    };
    const onUp = () => { window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  if (isTiny) return (
    <div ref={cardRef} data-event-card={entry.id} className={`absolute left-0.5 right-0.5 rounded-md border overflow-hidden cursor-grab ${cfg.card} ${isEditing ? `ring-2 ${cfg.ring}` : ""}`}
      style={{ top, height: Math.max(height, 18), zIndex: isEditing ? 50 : 20 }} onPointerDown={handlePointerDown}>
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${cfg.bar}`} />
      <p className="pl-2 text-[9px] font-bold truncate pt-0.5">{entry.title || "New Event"}</p>
    </div>
  );

  return (
    <>
      <div ref={cardRef} data-event-card={entry.id}
        className={`absolute left-0.5 right-0.5 rounded-xl border overflow-hidden select-none cursor-grab transition-shadow ${cfg.card} ${isEditing ? `ring-2 ${cfg.ring} ring-offset-1 shadow-xl` : "hover:shadow-md"}`}
        style={{ top, height: Math.max(height, 24), zIndex: isEditing ? 50 : 20 }}
        onPointerDown={handlePointerDown}>
        <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${cfg.bar} rounded-l-xl`} />
        <div className={`h-full pl-3.5 pr-2 flex flex-col justify-between overflow-hidden ${isSmall ? "py-0.5" : "py-2"}`}>
          <div className="min-w-0">
            <p className={`font-bold leading-snug truncate ${isSmall ? "text-[10px]" : "text-xs"}`}>
              {entry.title || <span className="font-normal italic opacity-40">New Event</span>}
            </p>
            {!isSmall && <p className="text-[10px] opacity-55 mt-0.5 truncate">{fmtHour(entry.start)} – {fmtHour(entry.end)}{entry.location ? ` · ${entry.location}` : ""}</p>}
          </div>
          {!isSmall && (
            <div className="flex items-center gap-1 mt-1">
              <span className={`rounded-full px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide ${cfg.pill}`}>{entry.type}</span>
              {entry.repeat !== "none" && <Repeat2 size={9} className="opacity-40" />}
              {entry.alert !== "none" && <Bell size={9} className="opacity-40" />}
            </div>
          )}
        </div>
        <div data-no-drag className="absolute bottom-0 left-0 right-0 h-3 cursor-ns-resize flex items-center justify-center group" onPointerDown={handleResize}>
          <div className="w-5 h-0.5 rounded-full bg-current opacity-15 group-hover:opacity-50 transition-opacity" />
        </div>
        <button data-no-drag onClick={(e) => { e.stopPropagation(); onDelete(entry.id); }}
          className="absolute top-1 right-1 z-10 rounded-full p-0.5 opacity-0 hover:opacity-100 hover:bg-black/10 transition-all">
          <Trash2 size={9} />
        </button>
      </div>

      {isEditing && typeof document !== "undefined" && (() => {
        const cardRect = cardRef.current?.getBoundingClientRect();
        const gridRect = colEl?.closest<HTMLElement>("[data-grid]")?.getBoundingClientRect();
        if (!cardRect) return null;

        const isRightHalf = gridRect ? (cardRect.left - gridRect.left) > gridRect.width * 0.5 : false;
        const fixedTop = Math.max(80, Math.min(cardRect.top, window.innerHeight - 500));
        const fixedStyle: React.CSSProperties = {
          position: "fixed",
          top: fixedTop,
          ...(isRightHalf
            ? { right: window.innerWidth - cardRect.left + 14 }
            : { left: cardRect.right + 14 }),
          zIndex: 9999,
        };

        return createPortal(
          <motion.div initial={{ opacity: 0, scale: 0.93, y: -4 }} animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.93, y: -4 }} transition={{ duration: 0.13 }}
            style={fixedStyle}
            data-popover>
            <EventPopover entry={entry} onClose={() => setEditingId(null)}
              onUpdate={(u) => onUpdate(entry.id, u)} onDelete={() => { onDelete(entry.id); setEditingId(null); }}
              onRepeatChange={onRepeatChange} />
          </motion.div>,
          document.body
        );
      })()}
    </>
  );
}

// ─── Grid ─────────────────────────────────────────────────────────────────────
function WeeklyGrid({ weekDates, entries, setEntries, editingId, setEditingId, editable }: {
  weekDates: Date[]; entries: PlannerEntry[]; setEntries: (e: PlannerEntry[]) => void;
  editingId: string | null; setEditingId: (id: string | null) => void; editable: boolean;
}) {
  const colEls = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollRef = useRef<HTMLDivElement>(null);
  const [ghost, setGhost] = useState<{ date: string; start: number; end: number } | null>(null);
  const [hoverInfo, setHoverInfo] = useState<{ date: string; hour: number } | null>(null);
  const [nowHour, setNowHour] = useState(currentDecimalHour());
  const todayISO = toISO(new Date());

  useEffect(() => { const id = setInterval(() => setNowHour(currentDecimalHour()), 60_000); return () => clearInterval(id); }, []);

  useEffect(() => {
    // Scroll to current hour (or 8 AM if it's too early/late) on mount
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        let targetHour = Math.floor(currentDecimalHour()) - 1; 
        if (targetHour < FIRST_HOUR) targetHour = FIRST_HOUR;
        if (targetHour > LAST_HOUR - 4) targetHour = LAST_HOUR - 4;
        const topOffset = (targetHour - FIRST_HOUR) * HOUR_HEIGHT;
        scrollRef.current.scrollTo({ top: topOffset, behavior: "smooth" });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!editingId) return;
    const fn = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-event-card]") && !t.closest("[data-popover]") && !t.closest("[data-no-drag]")) setEditingId(null);
    };
    window.addEventListener("mousedown", fn, true);
    return () => window.removeEventListener("mousedown", fn, true);
  }, [editingId, setEditingId]);

  const onUpdate = useCallback((id: string, u: Partial<PlannerEntry>) => setEntries(entries.map((e) => e.id === id ? { ...e, ...u } : e)), [entries, setEntries]);
  const onDelete = useCallback((id: string) => { setEntries(entries.filter((e) => e.id !== id)); if (editingId === id) setEditingId(null); }, [entries, setEntries, editingId, setEditingId]);

  const onRepeatChange = useCallback((entry: PlannerEntry, repeat: PlannerEntry["repeat"]) => {
    const base = entries.filter((e) => entry.repeatId ? e.repeatId !== entry.repeatId : e.id !== entry.id);
    const clean = { ...entry, repeat, repeatId: undefined };
    if (repeat === "none") { setEntries([...base, clean]); return; }

    const repeatId = crypto.randomUUID();
    const extras: PlannerEntry[] = [];
    if (repeat === "weekly") {
      // duplicate to the same weekday for 8 weeks
      for (let w = 1; w <= 7; w++) {
        const d = new Date(entry.date);
        d.setDate(d.getDate() + w * 7);
        extras.push({ ...clean, id: crypto.randomUUID(), date: toISO(d), repeatId });
      }
    } else if (repeat === "daily") {
      for (let d = 1; d <= 4; d++) {
        const nd = new Date(entry.date); nd.setDate(nd.getDate() + d);
        extras.push({ ...clean, id: crypto.randomUUID(), date: toISO(nd), repeatId });
      }
    } else if (repeat === "biweekly") {
      for (let w = 1; w <= 12; w += 2) {
        const nd = new Date(entry.date); nd.setDate(nd.getDate() + w * 7);
        extras.push({ ...clean, id: crypto.randomUUID(), date: toISO(nd), repeatId });
      }
    } else if (repeat === "monthly") {
      for (let m = 1; m <= 3; m++) {
        const nd = new Date(entry.date); nd.setMonth(nd.getMonth() + m);
        extras.push({ ...clean, id: crypto.randomUUID(), date: toISO(nd), repeatId });
      }
    }
    setEntries([...base, { ...clean, repeatId }, ...extras]);
  }, [entries, setEntries]);

  const onColPointerDown = (e: React.PointerEvent, dateISO: string) => {
    if (!editable) return;
    const col = colEls.current[dateISO]; if (!col) return;
    const rect = col.getBoundingClientRect();
    const startH = snap(FIRST_HOUR + (e.clientY - rect.top) / HOUR_HEIGHT);
    let endH = snap(startH + 0.5);
    setGhost({ date: dateISO, start: startH, end: endH });
    const onMove = (me: PointerEvent) => {
      const h = snap(FIRST_HOUR + (me.clientY - rect.top) / HOUR_HEIGHT);
      if (h > startH) { endH = Math.min(LAST_HOUR + 1, h); setGhost({ date: dateISO, start: startH, end: endH }); }
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      setGhost(null);
      const id = crypto.randomUUID();
      setEntries([...entries, { id, title: "", date: dateISO, start: startH, end: Math.max(startH + 0.5, endH), type: "Class", location: "", notes: "", allDay: false, repeat: "none", alert: "none" }]);
      setEditingId(id);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  // All-day entries for visible week
  const allDayEntries = entries.filter((e) => e.allDay && weekDates.some((d) => toISO(d) === e.date));

  const cols = `60px repeat(${weekDates.length}, 1fr)`;

  return (
    <div className="flex flex-col min-h-0 flex-1 bg-[var(--surface)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-card)] overflow-hidden" data-grid>
      {/* Day headers */}
      <div className="grid border-b border-[var(--border)] bg-[var(--surface-secondary)] shrink-0" style={{ gridTemplateColumns: cols }}>
        <div className="border-r border-[var(--border)] py-3" />
        {weekDates.map((d) => {
          const { short, num } = fmtDayHeader(d);
          const today = isToday(d);
          return (
            <div key={toISO(d)} className={`border-r border-[var(--border)] last:border-r-0 px-2 py-3 ${today ? "bg-[var(--accent-light)]/50" : ""}`}>
              <p className={`text-[10px] font-bold tracking-widest ${today ? "text-[var(--accent)]" : "text-[var(--muted)]"}`}>{short}</p>
              <div className={`mt-1.5 w-8 h-8 rounded-full flex items-center justify-center ${today ? "bg-[var(--accent)]" : ""}`}>
                <span className={`text-sm font-bold ${today ? "text-white" : "text-[var(--foreground)]"}`}>{num}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* All-day strip */}
      {allDayEntries.length > 0 && (
        <div className="grid border-b border-[var(--border)] shrink-0" style={{ gridTemplateColumns: cols }}>
          <div className="border-r border-[var(--border)] flex items-center px-2 py-1">
            <span className="text-[9px] text-[var(--muted)] font-bold uppercase tracking-widest">all-day</span>
          </div>
          {weekDates.map((d) => {
            const iso = toISO(d);
            const de = allDayEntries.filter((e) => e.date === iso);
            return (
              <div key={iso} className="border-r border-[var(--border)] last:border-r-0 p-1 flex flex-wrap gap-1 min-h-[28px]">
                {de.map((e) => {
                  const c = TYPE_CONFIG[e.type];
                  return (
                    <div key={e.id} className={`rounded-md px-2 py-0.5 text-[10px] font-bold truncate cursor-pointer ${c.card} border`}
                      onClick={() => setEditingId(e.id)}>
                      {e.title || "New Event"}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Main grid — scrollable */}
      <div ref={scrollRef} className="overflow-x-auto overflow-y-auto flex-1 scroll-smooth">
        <div style={{ minWidth: 600 }}>
          <div className="grid" style={{ gridTemplateColumns: cols, height: plannerHours.length * HOUR_HEIGHT }}>
            {/* Time labels */}
            <div className="relative border-r border-[var(--border)] bg-[var(--surface-secondary)]/40 shrink-0">
              {plannerHours.map((h) => (
                <div key={h} className="absolute w-full flex justify-end pr-2" style={{ top: (h - FIRST_HOUR) * HOUR_HEIGHT - 7 }}>
                  <span className="text-[10px] font-medium text-[var(--muted)] tabular-nums leading-none whitespace-nowrap">{fmtHour(h)}</span>
                </div>
              ))}
            </div>

            {/* Day columns */}
            {weekDates.map((d) => {
              const iso = toISO(d);
              const isCurrentDay = iso === todayISO;
              const dayEntries = entries.filter((e) => e.date === iso && !e.allDay);
              const isGhost = ghost?.date === iso;

              return (
                <div key={iso}
                  ref={(el) => { colEls.current[iso] = el; }}
                  data-day-col={iso}
                  className={`relative border-r border-[var(--border)] last:border-r-0 select-none ${isCurrentDay ? "bg-[var(--accent-light)]/15" : ""}`}
                  style={{ height: plannerHours.length * HOUR_HEIGHT, cursor: editable ? "crosshair" : "default" }}
                  onPointerDown={(e) => {
                    if ((e.target as HTMLElement).closest("[data-event-card]") || (e.target as HTMLElement).closest("[data-no-drag]") || (e.target as HTMLElement).closest("[data-popover]")) return;
                    onColPointerDown(e, iso);
                  }}
                  onPointerMove={(e) => {
                    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
                    setHoverInfo({ date: iso, hour: snap(FIRST_HOUR + (e.clientY - rect.top) / HOUR_HEIGHT) });
                  }}
                  onPointerLeave={() => setHoverInfo(null)}
                >
                  {plannerHours.map((h) => (
                    <div key={h} className="absolute left-0 right-0 border-t border-[var(--border)]/50" style={{ top: (h - FIRST_HOUR) * HOUR_HEIGHT }} />
                  ))}
                  {plannerHours.slice(0, -1).map((h) => (
                    <div key={h + .5} className="absolute left-0 right-0 border-t border-dashed border-[var(--border)]/30" style={{ top: (h - FIRST_HOUR + 0.5) * HOUR_HEIGHT }} />
                  ))}

                  {/* Current time line */}
                  {isCurrentDay && nowHour >= FIRST_HOUR && nowHour <= LAST_HOUR + 1 && (
                    <div className="absolute left-0 right-0 z-30 pointer-events-none" style={{ top: (nowHour - FIRST_HOUR) * HOUR_HEIGHT }}>
                      <div className="relative flex items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0 shadow-sm" />
                        <div className="flex-1 h-0.5 bg-red-500 shadow-sm" />
                      </div>
                    </div>
                  )}

                  {/* Hover hairline */}
                  {hoverInfo?.date === iso && !ghost && editable && (
                    <div className="pointer-events-none absolute left-0 right-0 z-10" style={{ top: (hoverInfo.hour - FIRST_HOUR) * HOUR_HEIGHT }}>
                      <div className="w-full h-px bg-blue-400/40" />
                      <span className="absolute right-1 -top-3 text-[9px] font-semibold text-blue-400/80 whitespace-nowrap bg-white/80 rounded px-1">{fmtHour(hoverInfo.hour)}</span>
                    </div>
                  )}

                  {/* Ghost block */}
                  {isGhost && ghost && (
                    <div className="absolute left-0.5 right-0.5 rounded-xl bg-blue-100 border-2 border-blue-400 border-dashed flex items-center justify-center pointer-events-none z-20"
                      style={{ top: (ghost.start - FIRST_HOUR) * HOUR_HEIGHT, height: Math.max((ghost.end - ghost.start) * HOUR_HEIGHT, 24) }}>
                      <span className="text-[11px] font-bold text-blue-600 select-none whitespace-nowrap">{fmtHour(ghost.start)} – {fmtHour(ghost.end)}</span>
                    </div>
                  )}

                  {/* Events */}
                  {dayEntries.map((entry) => (
                    <EventCard key={entry.id} entry={entry}
                      top={(entry.start - FIRST_HOUR) * HOUR_HEIGHT}
                      height={(entry.end - entry.start) * HOUR_HEIGHT}
                      isEditing={editingId === entry.id}
                      setEditingId={setEditingId}
                      onUpdate={onUpdate} onDelete={onDelete}
                      entries={entries} setEntries={setEntries}
                      onRepeatChange={onRepeatChange}
                      colEl={colEls.current[iso]}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────────
export function PlannerBoard({ entries, setEntries, recommendations, editable = true }: {
  entries: PlannerEntry[]; setEntries: (e: PlannerEntry[]) => void;
  recommendations: MonthlyTask[]; editable?: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState<Date>(() => weekMonday(new Date()));
  const [showCalPanel, setShowCalPanel] = useState(false);
  const calPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showCalPanel) return;
    const handler = (e: MouseEvent) => {
      if (calPanelRef.current && !calPanelRef.current.contains(e.target as Node)) setShowCalPanel(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCalPanel]);

  const weekDates = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const goPrev  = () => setWeekStart((d) => addDays(d, -7));
  const goNext  = () => setWeekStart((d) => addDays(d, 7));
  const goToday = () => setWeekStart(weekMonday(new Date()));

  const isCurrentWeek = toISO(weekStart) === toISO(weekMonday(new Date()));

  const stats = useMemo(() => {
    const acc: Record<string, number> = { Class: 0, Activity: 0, Study: 0, Work: 0 };
    entries.filter((e) => !e.allDay).forEach((e) => { acc[e.type] = (acc[e.type] || 0) + (e.end - e.start); });
    return acc;
  }, [entries]);

  return (
    <div className="flex flex-col h-full space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-[2rem] font-semibold tracking-tight text-[var(--foreground)]">Planner</h1>
          {/* Week nav */}
          <div className="segment-switcher !rounded-lg !p-[2px] !gap-[2px]">
            <button onClick={goPrev} className="rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"><ChevronLeft size={14} /></button>
            <button onClick={goToday} className={`rounded-md px-3 py-1 text-xs font-medium transition-all ${isCurrentWeek ? "segment-tab-active !rounded-md" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}>Today</button>
            <button onClick={goNext} className="rounded-md p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"><ChevronRight size={14} /></button>
          </div>
          <p className="text-sm font-medium text-[var(--muted)] hidden sm:block">{fmtWeekRange(weekStart)}</p>
        </div>
        <div className="flex gap-4 flex-wrap items-center">
          {(Object.entries(TYPE_CONFIG) as [string, typeof TYPE_CONFIG.Class][]).map(([t, cfg]) => {
            const h = stats[t] || 0;
            return (
              <div key={t} className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${cfg.bar}`} />
                <span className="text-xs text-[var(--muted)] font-medium">{t} <span className="font-semibold text-[var(--foreground)]">{h}h</span></span>
              </div>
            );
          })}
          <div className="relative" ref={calPanelRef}>
            <button onClick={() => setShowCalPanel(o => !o)}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] px-3 py-1.5 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface)] transition-all">
              <Calendar size={13} /> Sync
            </button>
            <AnimatePresence>
              {showCalPanel && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.97 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-2 z-[100] w-72"
                >
                  <CalendarIntegrationPanel entries={entries} setEntries={setEntries} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Calendar — full width */}
      <div className="flex-1 min-h-0">
        <WeeklyGrid
          weekDates={weekDates} entries={entries} setEntries={setEntries}
          editingId={editingId} setEditingId={setEditingId} editable={editable}
        />
      </div>

      {/* Coursework section */}
      <CourseworkSection entries={entries} setEntries={setEntries} />
    </div>
  );
}

// ─── Coursework Types ────────────────────────────────────────────────────────
type CourseworkItem = {
  id: string;
  title: string;
  type: "homework" | "exam" | "quiz" | "project" | "reading";
  dueDate: string; // ISO
  done: boolean;
  weight: number; // % of final grade, 0 = unset
  score: number | null; // earned %, null = not graded yet
};

type CourseData = {
  id: string;
  name: string;
  color: string;
  items: CourseworkItem[];
  collapsed: boolean;
};

const COURSE_COLORS = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
const COURSE_COLORS_HEX = ["#3b82f6", "#8b5cf6", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4"];
const ITEM_TYPE_LABELS: Record<CourseworkItem["type"], string> = {
  homework: "HW", exam: "Exam", quiz: "Quiz", project: "Project", reading: "Reading",
};

const COURSEWORK_KEY = "bluprint_coursework_v1";

function CourseworkSection({ entries, setEntries }: { entries: PlannerEntry[]; setEntries: (e: PlannerEntry[]) => void }) {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [addingItemFor, setAddingItemFor] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ title: "", type: "homework" as CourseworkItem["type"], dueDate: "", weight: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [editingScore, setEditingScore] = useState<string | null>(null);

  useEffect(() => {
    const saved = userStorage.getItem(COURSEWORK_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migrate old items without weight/score
      setCourses(parsed.map((c: CourseData) => ({
        ...c,
        items: c.items.map((it: Partial<CourseworkItem> & { id: string; title: string; type: CourseworkItem["type"]; dueDate: string; done: boolean }) => ({
          ...it,
          weight: it.weight ?? 0,
          score: it.score ?? null,
        })),
      })));
    }
  }, []);

  useEffect(() => {
    if (courses.length > 0 || userStorage.getItem(COURSEWORK_KEY)) {
      userStorage.setItem(COURSEWORK_KEY, JSON.stringify(courses));
    }
  }, [courses]);

  const addCourse = () => {
    if (!newName.trim()) return;
    setCourses([...courses, {
      id: crypto.randomUUID(), name: newName.trim(),
      color: COURSE_COLORS[courses.length % COURSE_COLORS.length],
      items: [], collapsed: false,
    }]);
    setNewName(""); setAdding(false);
  };

  const removeCourse = (id: string) => setCourses(courses.filter(c => c.id !== id));
  const toggleCollapse = (id: string) => setCourses(courses.map(c => c.id === id ? { ...c, collapsed: !c.collapsed } : c));

  const toggleItem = (courseId: string, itemId: string) => {
    setCourses(courses.map(c => c.id === courseId ? {
      ...c, items: c.items.map(it => it.id === itemId ? { ...it, done: !it.done } : it),
    } : c));
  };

  const removeItem = (courseId: string, itemId: string) => {
    setCourses(courses.map(c => c.id === courseId ? {
      ...c, items: c.items.filter(it => it.id !== itemId),
    } : c));
  };

  const updateItemScore = (courseId: string, itemId: string, score: number | null) => {
    setCourses(courses.map(c => c.id === courseId ? {
      ...c, items: c.items.map(it => it.id === itemId ? { ...it, score, done: score !== null ? true : it.done } : it),
    } : c));
    setEditingScore(null);
  };

  const addItem = (courseId: string) => {
    if (!newItem.title.trim()) return;
    const item: CourseworkItem = {
      id: crypto.randomUUID(), title: newItem.title.trim(),
      type: newItem.type, dueDate: newItem.dueDate,
      done: false, weight: newItem.weight, score: null,
    };
    setCourses(courses.map(c => c.id === courseId ? { ...c, items: [...c.items, item] } : c));

    // Auto-schedule study blocks for exams
    if ((newItem.type === "exam" || newItem.type === "quiz") && newItem.dueDate) {
      scheduleStudyBlocks(courseId, item);
    }

    setNewItem({ title: "", type: "homework", dueDate: "", weight: 0 });
    setAddingItemFor(null);
  };

  // Create study blocks in the calendar leading up to an exam
  const scheduleStudyBlocks = (courseId: string, item: CourseworkItem) => {
    const course = courses.find(c => c.id === courseId);
    if (!course) return;
    const examDate = new Date(item.dueDate + "T00:00:00");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const daysUntil = Math.ceil((examDate.getTime() - today.getTime()) / 86400000);
    if (daysUntil < 1) return;

    const sessions = Math.min(daysUntil, item.type === "exam" ? 3 : 2);
    const newEntries: PlannerEntry[] = [];
    for (let i = 1; i <= sessions; i++) {
      const d = new Date(examDate);
      d.setDate(d.getDate() - i);
      if (d.getDay() === 0 || d.getDay() === 6) continue; // skip weekends
      newEntries.push({
        id: crypto.randomUUID(),
        title: `Study: ${course.name} ${item.type === "exam" ? "Exam" : "Quiz"}`,
        date: d.toISOString().slice(0, 10),
        start: 18, end: 20,
        type: "Study", location: "", notes: item.title,
        allDay: false, repeat: "none", alert: "15min",
      });
    }
    if (newEntries.length > 0) {
      setEntries([...entries, ...newEntries]);
    }
  };

  const handleSyllabusUpload = async (courseId: string, file: File) => {
    setUploadingFor(courseId);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("courseId", courseId);
      formData.append("courseName", courses.find(c => c.id === courseId)?.name || "");
      const res = await fetch("/api/parse-syllabus", { method: "POST", body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data.items?.length > 0) {
          setCourses(prev => prev.map(c => c.id === courseId ? {
            ...c,
            items: [...c.items, ...data.items.map((it: { title: string; type: CourseworkItem["type"]; dueDate: string; weight?: number }) => ({
              id: crypto.randomUUID(), title: it.title, type: it.type,
              dueDate: it.dueDate, done: false, weight: it.weight || 0, score: null,
            }))],
          } : c));
        }
      }
    } catch { /* user can add manually */ } finally { setUploadingFor(null); }
  };

  const sortedItems = (items: CourseworkItem[]) =>
    [...items].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1;
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });

  const formatDue = (d: string) => {
    if (!d) return "";
    const date = new Date(d + "T00:00:00");
    const diff = Math.ceil((date.getTime() - Date.now()) / 86400000);
    const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (diff < 0) return label;
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff <= 7) return `${label} · ${diff}d`;
    return label;
  };

  const isDueClose = (d: string) => {
    if (!d) return false;
    const diff = Math.ceil((new Date(d + "T00:00:00").getTime() - Date.now()) / 86400000);
    return diff >= 0 && diff <= 3;
  };

  const isOverdue = (d: string) => {
    if (!d) return false;
    return new Date(d + "T00:00:00").getTime() < new Date().setHours(0, 0, 0, 0);
  };

  // Calculate current grade for a course
  const calcGrade = (items: CourseworkItem[]) => {
    const graded = items.filter(i => i.score !== null && i.weight > 0);
    if (graded.length === 0) return null;
    const totalWeight = graded.reduce((s, i) => s + i.weight, 0);
    const weightedScore = graded.reduce((s, i) => s + (i.score! * i.weight), 0);
    return { current: weightedScore / totalWeight, weightGraded: totalWeight };
  };

  // What score needed on remaining to hit target
  const calcNeeded = (items: CourseworkItem[], target: number) => {
    const graded = items.filter(i => i.score !== null && i.weight > 0);
    const ungraded = items.filter(i => i.score === null && i.weight > 0);
    if (ungraded.length === 0) return null;
    const earnedPoints = graded.reduce((s, i) => s + (i.score! * i.weight / 100), 0);
    const remainingWeight = ungraded.reduce((s, i) => s + i.weight, 0);
    const needed = ((target - earnedPoints * 100 / (graded.reduce((s, i) => s + i.weight, 0) + remainingWeight)) * (graded.reduce((s, i) => s + i.weight, 0) + remainingWeight) - earnedPoints * 100) / remainingWeight;
    // Simpler: (target * totalWeight/100 - earnedPoints) / remainingWeight * 100
    const totalWeight = graded.reduce((s, i) => s + i.weight, 0) + remainingWeight;
    const neededScore = (target / 100 * totalWeight - earnedPoints) / remainingWeight * 100;
    return Math.max(0, Math.round(neededScore));
  };

  // Upcoming deadlines across all courses (next 7 days)
  const upcoming = courses.flatMap(c =>
    c.items.filter(i => !i.done && i.dueDate).map(i => ({ ...i, courseName: c.name, courseColor: c.color, courseId: c.id }))
  ).filter(i => {
    const diff = Math.ceil((new Date(i.dueDate + "T00:00:00").getTime() - Date.now()) / 86400000);
    return diff >= 0 && diff <= 7;
  }).sort((a, b) => a.dueDate.localeCompare(b.dueDate));

  return (
    <div className="shrink-0 space-y-4 pb-4">
      {/* Upcoming deadlines strip */}
      {upcoming.length > 0 && (
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-[var(--muted)] mb-2">Due This Week</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {upcoming.map(item => (
              <div key={item.id} className="flex items-center gap-2 shrink-0 rounded-lg bg-[var(--background-secondary)] px-3 py-2">
                <div className={`w-1.5 h-1.5 rounded-full ${item.courseColor} shrink-0`} />
                <div className="min-w-0">
                  <p className="text-[11px] font-medium text-[var(--foreground)] truncate max-w-[140px]">{item.title}</p>
                  <p className="text-[9px] text-[var(--muted)]">{item.courseName}</p>
                </div>
                <span className={`text-[10px] font-semibold tabular-nums shrink-0 ${
                  isOverdue(item.dueDate) ? "text-red-500" : isDueClose(item.dueDate) ? "text-amber-500" : "text-[var(--muted)]"
                }`}>{formatDue(item.dueDate)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-[var(--foreground)]">Coursework</h2>
        {!adding && (
          <button onClick={() => setAdding(true)} className="text-xs font-medium text-[var(--accent)] hover:underline">+ Add Class</button>
        )}
      </div>

      {adding && (
        <div className="flex items-center gap-2">
          <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addCourse()}
            placeholder="Class name (e.g. Microeconomics)"
            className="flex-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/30" />
          <button onClick={addCourse} className="rounded-lg bg-[var(--accent)] px-3 py-2 text-xs font-medium text-white">Add</button>
          <button onClick={() => { setAdding(false); setNewName(""); }} className="rounded-lg px-3 py-2 text-xs font-medium text-[var(--muted)]">Cancel</button>
        </div>
      )}

      {courses.length === 0 && !adding && (
        <p className="text-sm text-[var(--muted)] py-6 text-center">Add your classes to track homework, exams, and deadlines.</p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {courses.map((course, ci) => {
          const total = course.items.length;
          const done = course.items.filter(i => i.done).length;
          const items = sortedItems(course.items);
          const grade = calcGrade(course.items);
          const needed90 = calcNeeded(course.items, 90);

          return (
            <div key={course.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-card)] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 cursor-pointer" onClick={() => toggleCollapse(course.id)}>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${course.color} shrink-0`} />
                  <span className="text-sm font-semibold text-[var(--foreground)] truncate">{course.name}</span>
                  {total > 0 && <span className="text-[10px] font-medium text-[var(--muted)] tabular-nums shrink-0">{done}/{total}</span>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* Current grade badge */}
                  {grade && (
                    <span className={`text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded-md ${
                      grade.current >= 90 ? "bg-emerald-50 text-emerald-600" :
                      grade.current >= 80 ? "bg-blue-50 text-blue-600" :
                      grade.current >= 70 ? "bg-amber-50 text-amber-600" :
                      "bg-red-50 text-red-600"
                    }`}>{Math.round(grade.current)}%</span>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); setUploadingFor(course.id); fileInputRef.current?.click(); }}
                    className="rounded-md p-1 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--background-secondary)] transition-colors"
                    title="Upload syllabus">
                    <Upload size={13} />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); removeCourse(course.id); }}
                    className="rounded-md p-1 text-[var(--muted)] hover:text-red-500 hover:bg-red-50 transition-colors" title="Remove class">
                    <X size={13} />
                  </button>
                  <ChevronDown size={14} className={`text-[var(--muted)] transition-transform ${course.collapsed ? "-rotate-90" : ""}`} />
                </div>
              </div>

              {/* Progress bar */}
              {total > 0 && (
                <div className="px-4 pb-2">
                  <div className="h-1 w-full rounded-full bg-[var(--background-secondary)] overflow-hidden">
                    <div className={`h-full rounded-full ${course.color} transition-all duration-300`} style={{ width: `${(done / total) * 100}%` }} />
                  </div>
                </div>
              )}

              {/* Grade calculator hint */}
              {!course.collapsed && grade && needed90 !== null && (
                <div className="px-4 pb-2">
                  <p className="text-[10px] text-[var(--muted)]">
                    {needed90 <= 100
                      ? <>Need <span className="font-bold text-[var(--foreground)]">{needed90}%</span> avg on remaining for an A</>
                      : <span className="text-amber-500">An A requires &gt;100% on remaining items</span>
                    }
                  </p>
                </div>
              )}

              {/* Items */}
              {!course.collapsed && (
                <div className="border-t border-[var(--border)]">
                  {items.length === 0 && addingItemFor !== course.id && (
                    <p className="text-xs text-[var(--muted)] px-4 py-4 text-center">No items yet. Add manually or upload a syllabus</p>
                  )}
                  <div className="divide-y divide-[var(--border)]/60">
                    {items.map(item => (
                      <div key={item.id} className={`group flex items-center gap-2 px-4 py-2.5 ${item.done ? "opacity-50" : ""}`}>
                        <button onClick={() => toggleItem(course.id, item.id)}
                          className={`w-4 h-4 rounded border-[1.5px] shrink-0 flex items-center justify-center transition-colors ${item.done ? "bg-[var(--accent)] border-[var(--accent)]" : "border-[var(--border)] hover:border-[var(--accent)]"}`}>
                          {item.done && <Check size={10} className="text-white" strokeWidth={3} />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs font-medium truncate ${item.done ? "line-through text-[var(--muted)]" : "text-[var(--foreground)]"}`}>{item.title}</p>
                        </div>
                        {item.weight > 0 && (
                          <span className="text-[9px] text-[var(--muted)] tabular-nums shrink-0">{item.weight}%</span>
                        )}
                        <span className={`text-[9px] font-bold uppercase tracking-wide rounded-full px-1.5 py-0.5 shrink-0 ${
                          item.type === "exam" ? "bg-red-50 text-red-600" :
                          item.type === "quiz" ? "bg-amber-50 text-amber-600" :
                          item.type === "project" ? "bg-violet-50 text-violet-600" :
                          item.type === "reading" ? "bg-cyan-50 text-cyan-600" :
                          "bg-blue-50 text-blue-600"
                        }`}>{ITEM_TYPE_LABELS[item.type]}</span>
                        {/* Score input */}
                        {item.weight > 0 && editingScore === item.id ? (
                          <input autoFocus type="number" min={0} max={100} placeholder="Score"
                            className="w-14 rounded border border-[var(--border)] bg-[var(--background)] px-1.5 py-0.5 text-[10px] text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30"
                            onBlur={(e) => updateItemScore(course.id, item.id, e.target.value ? Number(e.target.value) : null)}
                            onKeyDown={(e) => { if (e.key === "Enter") updateItemScore(course.id, item.id, (e.target as HTMLInputElement).value ? Number((e.target as HTMLInputElement).value) : null); }} />
                        ) : item.score !== null ? (
                          <button onClick={() => setEditingScore(item.id)}
                            className={`text-[10px] font-bold tabular-nums shrink-0 ${item.score >= 90 ? "text-emerald-500" : item.score >= 80 ? "text-blue-500" : item.score >= 70 ? "text-amber-500" : "text-red-500"}`}>
                            {item.score}%
                          </button>
                        ) : item.weight > 0 ? (
                          <button onClick={() => setEditingScore(item.id)}
                            className="text-[10px] text-[var(--muted)] hover:text-[var(--accent)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            + score
                          </button>
                        ) : null}
                        {item.dueDate && !item.done && (
                          <span className={`text-[10px] font-medium tabular-nums shrink-0 ${
                            isOverdue(item.dueDate) ? "text-red-500" : isDueClose(item.dueDate) ? "text-amber-500" : "text-[var(--muted)]"
                          }`}>{formatDue(item.dueDate)}</span>
                        )}
                        <button onClick={() => removeItem(course.id, item.id)}
                          className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-[var(--muted)] hover:text-red-500 transition-all shrink-0">
                          <X size={11} />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Add item */}
                  {addingItemFor === course.id ? (
                    <div className="px-4 py-3 space-y-2 border-t border-[var(--border)]">
                      <input autoFocus value={newItem.title} onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                        onKeyDown={e => e.key === "Enter" && addItem(course.id)}
                        placeholder="e.g. Problem Set 3, Midterm Exam"
                        className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-1.5 text-xs text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)]/30" />
                      <div className="flex gap-2 flex-wrap">
                        <select value={newItem.type} onChange={e => setNewItem({ ...newItem, type: e.target.value as CourseworkItem["type"] })}
                          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[10px] text-[var(--foreground)] focus:outline-none">
                          <option value="homework">Homework</option>
                          <option value="exam">Exam</option>
                          <option value="quiz">Quiz</option>
                          <option value="project">Project</option>
                          <option value="reading">Reading</option>
                        </select>
                        <input type="date" value={newItem.dueDate} onChange={e => setNewItem({ ...newItem, dueDate: e.target.value })}
                          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[10px] text-[var(--foreground)] focus:outline-none" />
                        <div className="flex items-center gap-1">
                          <input type="number" min={0} max={100} value={newItem.weight || ""} placeholder="Weight %"
                            onChange={e => setNewItem({ ...newItem, weight: Number(e.target.value) || 0 })}
                            className="w-16 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[10px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none" />
                        </div>
                        <div className="flex-1" />
                        <button onClick={() => addItem(course.id)} className="rounded-md bg-[var(--accent)] px-2.5 py-1 text-[10px] font-medium text-white">Add</button>
                        <button onClick={() => setAddingItemFor(null)} className="text-[10px] text-[var(--muted)]">Cancel</button>
                      </div>
                      {(newItem.type === "exam" || newItem.type === "quiz") && newItem.dueDate && (
                        <p className="text-[9px] text-[var(--accent)] flex items-center gap-1">
                          <Calendar size={9} /> Study blocks will be auto-added to your calendar
                        </p>
                      )}
                    </div>
                  ) : (
                    <button onClick={() => { setAddingItemFor(course.id); setNewItem({ title: "", type: "homework", dueDate: "", weight: 0 }); }}
                      className="w-full text-left px-4 py-2 text-[11px] font-medium text-[var(--muted)] hover:text-[var(--accent)] hover:bg-[var(--background-secondary)]/50 transition-colors border-t border-[var(--border)]">
                      + Add item
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <input ref={fileInputRef} type="file" accept=".pdf,.docx,.doc,.txt" className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && uploadingFor) handleSyllabusUpload(uploadingFor, file);
          e.target.value = "";
        }} />
    </div>
  );
}

// ─── Mini Month Calendar ──────────────────────────────────────────────────────
function MiniMonth({ weekStart, onSelectWeek, entries }: {
  weekStart: Date; onSelectWeek: (d: Date) => void; entries: PlannerEntry[];
}) {
  const [viewDate, setViewDate] = useState(() => new Date(weekStart));
  useEffect(() => { setViewDate(new Date(weekStart)); }, [weekStart]);

  const year = viewDate.getFullYear(), month = viewDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const startOffset = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // 0=Mon
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const todayISO = toISO(new Date());
  const currentWeekISO = toISO(weekStart);

  const monthName = viewDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-bold text-[var(--foreground)]">{monthName}</p>
        <div className="flex gap-1">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--background-secondary)] transition-colors"><ChevronLeft size={13} /></button>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="rounded-lg p-1 text-[var(--muted)] hover:bg-[var(--background-secondary)] transition-colors"><ChevronRight size={13} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-y-0.5">
        {["M","T","W","T","F","S","S"].map((d, i) => (
          <div key={i} className="text-center text-[9px] font-bold text-[var(--muted)] pb-1">{d}</div>
        ))}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const iso = toISO(d);
          const isT = iso === todayISO;
          const thisWeekMon = toISO(weekMonday(d));
          const isWeek = thisWeekMon === currentWeekISO;
          const hasEvents = entries.some((e) => e.date === iso);
          return (
            <button key={i}
              onClick={() => onSelectWeek(weekMonday(d))}
              className={`relative flex flex-col items-center justify-center h-7 w-7 mx-auto rounded-full text-[11px] font-semibold transition-all ${isT ? "bg-[var(--accent)] text-white" : isWeek ? "bg-[var(--accent-light)] text-[var(--accent)]" : "text-[var(--muted-foreground)] hover:bg-[var(--background-secondary)]"}`}>
              {d.getDate()}
              {hasEvents && !isT && <div className="absolute bottom-0.5 w-1 h-1 rounded-full bg-[var(--accent)]" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// keep for compatibility
export { };
