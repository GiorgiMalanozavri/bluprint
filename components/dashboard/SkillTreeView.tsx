"use client";

import { motion } from "framer-motion";
import { Check, Lock, Play, Trophy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  buildSkillTree,
  getCategoryColor,
  markNodeCompleted,
  markNodeInProgress,
  type SkillNode,
  type SkillTreeData,
} from "@/lib/skill-tree";
import VerifyChatModal from "./VerifyChatModal";

type SemesterData = {
  semester: string;
  status: "completed" | "current" | "upcoming";
  tasks: { id: string; title: string; category: string; effort: string; why: string }[];
};

const R = 20;

export default function SkillTreeView({ semesters, dreamRole }: { semesters: SemesterData[]; dreamRole?: string }) {
  const [tree, setTree] = useState<SkillTreeData | null>(null);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const rebuild = useCallback(() => {
    if (semesters.length > 0) setTree(buildSkillTree(semesters, dreamRole));
  }, [semesters, dreamRole]);

  useEffect(() => { rebuild(); }, [rebuild]);

  // Fit tree on mount
  useEffect(() => {
    if (!tree || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const maxX = Math.max(tree.goalNode.x + 80, ...tree.allNodes.map(n => n.x)) + 60;
    const maxY = Math.max(...tree.allNodes.map(n => n.y)) + 80;
    const s = Math.min(rect.width / maxX, rect.height / maxY, 1.2) * 0.88;
    const contentW = maxX * s;
    const contentH = maxY * s;
    setScale(s);
    setOffset({ x: Math.max(0, (rect.width - contentW) / 2), y: Math.max(10, (rect.height - contentH) / 2) });
  }, [tree]);

  // Wheel: pinch = zoom (ctrlKey), two-finger = pan
  const onWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Pinch-to-zoom
      const d = e.deltaY > 0 ? 0.96 : 1.04;
      setScale(s => Math.max(0.3, Math.min(2.5, s * d)));
    } else {
      // Two-finger pan
      setOffset(o => ({ x: o.x - e.deltaX, y: o.y - e.deltaY }));
    }
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [onWheel]);

  const handleClick = useCallback((node: SkillNode) => {
    if (node.status === "locked" || node.id === "__start__" || node.id === "__goal__") return;
    if (node.status === "completed") { setSelectedNode(node); return; }
    markNodeInProgress(node.id);
    setSelectedNode(node);
    setVerifyOpen(true);
    rebuild();
  }, [rebuild]);

  const handleVerified = useCallback((nodeId: string) => {
    markNodeCompleted(nodeId);
    setTimeout(() => { setVerifyOpen(false); setSelectedNode(null); rebuild(); }, 1500);
  }, [rebuild]);

  if (!tree || tree.allNodes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-16 text-center">
        <p className="text-sm font-medium text-[var(--foreground)]">No skill tree yet.</p>
        <p className="mt-1.5 text-xs text-[var(--muted)]">Generate your roadmap first.</p>
      </div>
    );
  }

  return (
    <>
      {/* Progress + legend row */}
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <span className="text-[13px] font-semibold text-[var(--foreground)] tabular-nums">
          {tree.completedCount}/{tree.totalCount}
        </span>
        <div className="w-28 h-1.5 rounded-full bg-[var(--border)] overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${(tree.completedCount / tree.totalCount) * 100}%`,
              background: "var(--accent)" }} />
        </div>
        <span className="text-[10px] text-[var(--muted)]">nodes unlocked</span>
        <div className="flex-1" />
        <div className="flex gap-1.5 flex-wrap">
          {tree.branches.map(b => (
            <span key={b.category} className="text-[9px] font-medium px-2 py-0.5 rounded-full"
              style={{ color: b.color, background: `${b.color}12`, border: `1px solid ${b.color}25` }}>
              {b.name}
            </span>
          ))}
        </div>
      </div>

      {/* Canvas — seamless, same background */}
      <div ref={containerRef}
        className="relative overflow-hidden rounded-2xl border border-[var(--border)]"
        style={{
          height: "calc(100vh - 200px)",
          background: "var(--background)",
          touchAction: "none",
          cursor: "grab",
        }}
      >
        <svg width="100%" height="100%" className="block">
          <g transform={`translate(${offset.x},${offset.y}) scale(${scale})`}>

            {/* Connections: start → first of each branch */}
            {tree.branches.map(branch => {
              const first = branch.nodes[0];
              if (!first) return null;
              const done = first.status === "completed";
              return <line key={`s-${first.id}`}
                x1={tree.startNode.x} y1={tree.startNode.y} x2={first.x} y2={first.y}
                stroke={done ? branch.color : "var(--border)"}
                strokeWidth={done ? 2 : 1.5} strokeDasharray={done ? "none" : "5 3"}
                opacity={first.status === "locked" ? 0.3 : 0.7} />;
            })}

            {/* Connections within branches */}
            {tree.branches.map(branch =>
              branch.nodes.map((node, i) => {
                if (i === 0) return null;
                const prev = branch.nodes[i - 1];
                const done = node.status === "completed" && prev.status === "completed";
                const active = node.status !== "locked";
                return <line key={`${prev.id}-${node.id}`}
                  x1={prev.x} y1={prev.y} x2={node.x} y2={node.y}
                  stroke={done ? branch.color : active ? `${branch.color}50` : "var(--border)"}
                  strokeWidth={done ? 2 : 1.5} strokeDasharray={done ? "none" : "5 3"}
                  opacity={active ? 0.7 : 0.25} />;
              })
            )}

            {/* Connections: last → goal */}
            {tree.branches.map(branch => {
              const last = branch.nodes[branch.nodes.length - 1];
              if (!last) return null;
              return <line key={`${last.id}-g`}
                x1={last.x} y1={last.y} x2={tree.goalNode.x} y2={tree.goalNode.y}
                stroke={last.status === "completed" ? `${branch.color}60` : "var(--border)"}
                strokeWidth={1.5} strokeDasharray="5 3" opacity={0.3} />;
            })}

            {/* Start node */}
            <SpecialNode node={tree.startNode} label="Start" />

            {/* Branch nodes */}
            {tree.branches.map(branch =>
              branch.nodes.map(node => (
                <NodeCircle key={node.id} node={node} color={branch.color}
                  hovered={hovered === node.id}
                  onHover={setHovered} onClick={handleClick} />
              ))
            )}

            {/* Goal node */}
            <SpecialNode node={tree.goalNode} label={tree.goalNode.title} isGoal />
          </g>
        </svg>

        {/* Tooltip */}
        {hovered && (() => {
          const node = tree.allNodes.find(n => n.id === hovered);
          if (!node) return null;
          const sx = node.x * scale + offset.x;
          const sy = node.y * scale + offset.y;
          return (
            <div className="absolute pointer-events-none z-20 px-3 py-2 rounded-xl max-w-[220px] shadow-[var(--shadow-md)]"
              style={{ left: sx - 90, top: sy - 70,
                background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-[11px] font-semibold text-[var(--foreground)] truncate">{node.title}</p>
              <p className="text-[9px] text-[var(--muted)] mt-0.5">{node.semester} · {node.effort}</p>
              {node.status === "locked" && <p className="text-[9px] text-[var(--muted)] mt-1">Complete previous node first</p>}
              {(node.status === "available" || node.status === "in_progress") && (
                <p className="text-[9px] mt-1" style={{ color: getCategoryColor(node.category) }}>Click to verify</p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Detail panel */}
      {selectedNode && !verifyOpen && selectedNode.id !== "__start__" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="mt-3 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-semibold text-[var(--foreground)]">{selectedNode.title}</p>
              <p className="text-[10px] text-[var(--muted)] mt-0.5">{selectedNode.semester} · {selectedNode.effort}</p>
            </div>
            <div className="flex gap-2">
              {selectedNode.status === "completed" ? (
                <span className="text-[10px] font-semibold text-emerald-600 px-2 py-1 rounded-full bg-emerald-500/10">Completed</span>
              ) : (
                <button onClick={() => { markNodeInProgress(selectedNode.id); setVerifyOpen(true); rebuild(); }}
                  className="btn-primary h-7 px-3 text-[11px]">Verify</button>
              )}
              <button onClick={() => setSelectedNode(null)}
                className="text-[11px] text-[var(--muted)] px-2 py-1 rounded-lg hover:bg-[var(--background-secondary)] transition-colors">
                Close
              </button>
            </div>
          </div>
          <p className="text-[11px] text-[var(--muted-foreground)] mt-2 leading-relaxed">{selectedNode.why}</p>
        </motion.div>
      )}

      <VerifyChatModal node={selectedNode} open={verifyOpen}
        onClose={() => setVerifyOpen(false)} onVerified={handleVerified} />
    </>
  );
}

/* ─── Node with label ────────────────────────────── */

function NodeCircle({ node, color, hovered, onHover, onClick }: {
  node: SkillNode; color: string; hovered: boolean;
  onHover: (id: string | null) => void; onClick: (n: SkillNode) => void;
}) {
  const done = node.status === "completed";
  const avail = node.status === "available";
  const ip = node.status === "in_progress";
  const locked = node.status === "locked";

  const fill = done ? `${color}20` : avail || ip ? "var(--surface)" : "var(--background-secondary)";
  const stroke = done ? color : avail || ip ? `${color}90` : "var(--border)";
  const sw = done ? 2.5 : avail || ip ? 2 : 1.5;
  const op = locked ? 0.4 : 1;

  // Truncate title to ~18 chars
  const label = node.title.length > 20 ? node.title.slice(0, 18) + "…" : node.title;

  return (
    <g data-node="true" opacity={op}
      onMouseEnter={() => onHover(node.id)} onMouseLeave={() => onHover(null)}
      onClick={() => onClick(node)}
      style={{ cursor: locked ? "not-allowed" : "pointer" }}>

      {/* Label above */}
      <text x={node.x} y={node.y - R - 6} textAnchor="middle"
        fontSize="8" fontWeight={500} fontFamily="Inter, system-ui, sans-serif"
        fill={done ? color : locked ? "var(--muted)" : "var(--foreground)"}
        opacity={locked ? 0.5 : 0.85}>
        {label}
      </text>

      {/* Pulse for available */}
      {(avail || ip) && (
        <circle cx={node.x} cy={node.y} r={R + 3}
          fill="none" stroke={color} strokeWidth={1} opacity={0.4}>
          <animate attributeName="r" from={String(R)} to={String(R + 12)} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Main circle */}
      <circle cx={node.x} cy={node.y} r={R}
        fill={fill} stroke={stroke} strokeWidth={sw} />

      {/* Hover ring */}
      {hovered && !locked && (
        <circle cx={node.x} cy={node.y} r={R + 2}
          fill="none" stroke={color} strokeWidth={1} opacity={0.5} />
      )}

      {/* Inner icon */}
      {done ? (
        <foreignObject x={node.x - 7} y={node.y - 7} width={14} height={14}>
          <Check size={12} style={{ color }} strokeWidth={3} />
        </foreignObject>
      ) : locked ? (
        <foreignObject x={node.x - 6} y={node.y - 6} width={12} height={12}>
          <Lock size={10} className="text-[var(--muted)]" />
        </foreignObject>
      ) : ip ? (
        <foreignObject x={node.x - 6} y={node.y - 6} width={12} height={12}>
          <Play size={10} style={{ color }} />
        </foreignObject>
      ) : (
        <circle cx={node.x} cy={node.y} r={3.5} fill={avail ? color : "var(--muted)"} opacity={0.7} />
      )}
    </g>
  );
}

/* ─── Start / Goal ───────────────────────────────── */

function SpecialNode({ node, label, isGoal }: { node: SkillNode; label: string; isGoal?: boolean }) {
  const r = 28;
  const done = node.status === "completed";
  return (
    <g>
      <text x={node.x} y={node.y - r - 8} textAnchor="middle"
        fontSize="9" fontWeight={600} fontFamily="Inter, system-ui, sans-serif"
        fill={isGoal ? "#d97706" : "var(--foreground)"}>
        {label}
      </text>
      <circle cx={node.x} cy={node.y} r={r}
        fill={isGoal && done ? "#fef3c7" : isGoal ? "var(--surface)" : "var(--accent-light)"}
        stroke={isGoal ? "#d97706" : "var(--accent)"}
        strokeWidth={isGoal ? 3 : 2.5} />
      <foreignObject x={node.x - 10} y={node.y - 10} width={20} height={20}>
        {isGoal ? <Trophy size={16} className="text-amber-600" /> :
          <div className="w-3 h-3 rounded-full mx-auto mt-0.5" style={{ background: "var(--accent)" }} />}
      </foreignObject>
    </g>
  );
}
