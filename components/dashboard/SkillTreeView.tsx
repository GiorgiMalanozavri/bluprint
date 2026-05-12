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

const R = 24;

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

  // Start zoomed in, centered on the start node
  useEffect(() => {
    if (!tree || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    
    const initialScale = 1.6; // zoomed in
    setScale(initialScale);
    
    // Position start node at the left side, vertically centered
    setOffset({
      x: 120, // 120px from left edge
      y: rect.height / 2 - (tree.startNode.y * initialScale)
    });
  }, [tree]);

  // Capture ALL wheel events — prevent browser zoom entirely
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handler = (e: WheelEvent) => {
      // Always prevent default to stop browser zoom
      e.preventDefault();
      e.stopPropagation();

      if (e.ctrlKey || e.metaKey) {
        // Pinch gesture → zoom the tree
        const factor = e.deltaY > 0 ? 0.95 : 1.05;
        setScale(s => Math.max(0.3, Math.min(3, s * factor)));
      } else {
        // Two-finger swipe → pan the tree
        setOffset(o => ({ x: o.x - e.deltaX, y: o.y - e.deltaY }));
      }
    };

    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

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
      <div className="py-16 text-center">
        <p className="text-sm font-medium text-[var(--foreground)]">No skill tree yet.</p>
        <p className="mt-1.5 text-xs text-[var(--muted)]">Generate your roadmap first.</p>
      </div>
    );
  }

  return (
    <>
      {/* Full-page canvas — no border, no container look */}
      <div ref={containerRef}
        className="absolute inset-0 top-[48px] overflow-hidden"
        style={{ touchAction: "none", cursor: "grab" }}
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
                stroke={done ? branch.color : "var(--border-hover)"}
                strokeWidth={done ? 2.5 : 1.5} strokeDasharray={done ? "none" : "6 4"}
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
                  stroke={done ? branch.color : active ? `${branch.color}60` : "var(--border)"}
                  strokeWidth={done ? 2.5 : 1.5} strokeDasharray={done ? "none" : "6 4"}
                  opacity={active ? 0.7 : 0.3} />;
              })
            )}

            {/* Connections: last → goal */}
            {tree.branches.map(branch => {
              const last = branch.nodes[branch.nodes.length - 1];
              if (!last) return null;
              return <line key={`${last.id}-g`}
                x1={last.x} y1={last.y} x2={tree.goalNode.x} y2={tree.goalNode.y}
                stroke={last.status === "completed" ? `${branch.color}70` : "var(--border)"}
                strokeWidth={1.5} strokeDasharray="6 4" opacity={0.3} />;
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
            <div className="absolute pointer-events-none z-20 px-3.5 py-2.5 rounded-xl max-w-[240px] shadow-[var(--shadow-lg)]"
              style={{ left: sx - 100, top: sy - 80,
                background: "var(--surface)", border: "1px solid var(--border)" }}>
              <p className="text-[12px] font-semibold text-[var(--foreground)]">{node.title}</p>
              <p className="text-[10px] text-[var(--muted)] mt-0.5">{node.semester} · {node.effort}</p>
              {node.status === "locked" && <p className="text-[9px] text-[var(--muted)] mt-1">Complete previous node first</p>}
              {(node.status === "available" || node.status === "in_progress") && (
                <p className="text-[10px] font-medium mt-1" style={{ color: getCategoryColor(node.category) }}>Click to verify</p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Detail panel */}
      {selectedNode && !verifyOpen && selectedNode.id !== "__start__" && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg z-30 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[14px] font-semibold text-[var(--foreground)]">{selectedNode.title}</p>
              <p className="text-[11px] text-[var(--muted)] mt-0.5">{selectedNode.semester} · {selectedNode.effort}</p>
            </div>
            <div className="flex gap-2">
              {selectedNode.status === "completed" ? (
                <span className="text-[10px] font-semibold text-emerald-600 px-2 py-1 rounded-full bg-emerald-500/10">Completed</span>
              ) : (
                <button onClick={() => { markNodeInProgress(selectedNode.id); setVerifyOpen(true); rebuild(); }}
                  className="btn-primary h-8 px-4 text-[12px]">Verify</button>
              )}
              <button onClick={() => setSelectedNode(null)}
                className="text-[11px] text-[var(--muted)] px-2 py-1.5 rounded-lg hover:bg-[var(--background-secondary)] transition-colors">
                Close
              </button>
            </div>
          </div>
          <p className="text-[12px] text-[var(--muted-foreground)] mt-2.5 leading-relaxed">{selectedNode.why}</p>
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

  const fill = done ? `${color}18` : avail || ip ? "var(--surface)" : "var(--background-secondary)";
  const stroke = done ? color : avail || ip ? `${color}` : "var(--border)";
  const sw = done ? 3 : avail || ip ? 2.5 : 1.5;
  const op = locked ? 0.35 : 1;

  const label = node.title.length > 22 ? node.title.slice(0, 20) + "…" : node.title;

  return (
    <g data-node="true" opacity={op}
      onMouseEnter={() => onHover(node.id)} onMouseLeave={() => onHover(null)}
      onClick={() => onClick(node)}
      style={{ cursor: locked ? "not-allowed" : "pointer" }}>

      {/* Label above */}
      <text x={node.x} y={node.y - R - 8} textAnchor="middle"
        fontSize="9.5" fontWeight={done ? 600 : 500} fontFamily="Inter, system-ui, sans-serif"
        fill={done ? color : locked ? "var(--muted)" : "var(--foreground)"}
        opacity={locked ? 0.45 : 0.9}>
        {label}
      </text>

      {/* Pulse for available */}
      {(avail || ip) && (
        <circle cx={node.x} cy={node.y} r={R + 3}
          fill="none" stroke={color} strokeWidth={1.5} opacity={0.4}>
          <animate attributeName="r" from={String(R)} to={String(R + 14)} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.4" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Main circle */}
      <circle cx={node.x} cy={node.y} r={R} fill={fill} stroke={stroke} strokeWidth={sw} />

      {/* Hover ring */}
      {hovered && !locked && (
        <circle cx={node.x} cy={node.y} r={R + 3}
          fill="none" stroke={color} strokeWidth={1.5} opacity={0.5} />
      )}

      {/* Inner icon */}
      {done ? (
        <foreignObject x={node.x - 8} y={node.y - 8} width={16} height={16}>
          <Check size={14} style={{ color }} strokeWidth={3} />
        </foreignObject>
      ) : locked ? (
        <foreignObject x={node.x - 7} y={node.y - 7} width={14} height={14}>
          <Lock size={12} className="text-[var(--muted)]" />
        </foreignObject>
      ) : ip ? (
        <foreignObject x={node.x - 7} y={node.y - 7} width={14} height={14}>
          <Play size={12} style={{ color }} />
        </foreignObject>
      ) : (
        <circle cx={node.x} cy={node.y} r={4} fill={avail ? color : "var(--muted)"} opacity={0.6} />
      )}
    </g>
  );
}

/* ─── Start / Goal ───────────────────────────────── */

function SpecialNode({ node, label, isGoal }: { node: SkillNode; label: string; isGoal?: boolean }) {
  const r = 32;
  const done = node.status === "completed";
  return (
    <g>
      <text x={node.x} y={node.y - r - 10} textAnchor="middle"
        fontSize="11" fontWeight={700} fontFamily="Inter, system-ui, sans-serif"
        fill={isGoal ? "#b45309" : "var(--foreground)"}>
        {label}
      </text>
      <circle cx={node.x} cy={node.y} r={r}
        fill={isGoal && done ? "#fef3c7" : isGoal ? "var(--surface)" : "var(--accent-light)"}
        stroke={isGoal ? "#d97706" : "var(--accent)"}
        strokeWidth={3} />
      <foreignObject x={node.x - 11} y={node.y - 11} width={22} height={22}>
        {isGoal ? <Trophy size={18} className="text-amber-600 mx-auto" /> :
          <div className="w-4 h-4 rounded-full mx-auto" style={{ background: "var(--accent)" }} />}
      </foreignObject>
    </g>
  );
}
