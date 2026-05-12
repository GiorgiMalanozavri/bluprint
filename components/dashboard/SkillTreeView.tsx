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

const R = 22; // node radius

export default function SkillTreeView({ semesters, dreamRole }: { semesters: SemesterData[]; dreamRole?: string }) {
  const [tree, setTree] = useState<SkillTreeData | null>(null);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  const rebuild = useCallback(() => {
    if (semesters.length > 0) setTree(buildSkillTree(semesters, dreamRole));
  }, [semesters, dreamRole]);

  useEffect(() => { rebuild(); }, [rebuild]);

  // Center the tree on mount
  useEffect(() => {
    if (!tree || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const maxX = Math.max(tree.goalNode.x + 60, ...tree.allNodes.map(n => n.x)) + 100;
    const maxY = Math.max(...tree.allNodes.map(n => n.y)) + 100;
    const scaleX = rect.width / maxX;
    const scaleY = rect.height / maxY;
    const s = Math.min(scaleX, scaleY, 1) * 0.85;
    setTransform({ x: 40, y: 20, scale: s });
  }, [tree]);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const d = e.deltaY > 0 ? 0.92 : 1.08;
    setTransform(p => ({ ...p, scale: Math.max(0.25, Math.min(2.5, p.scale * d)) }));
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-node]")) return;
    setDragging(true);
    dragStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y };
  }, [transform]);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setTransform(p => ({ ...p, x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y }));
  }, [dragging]);

  const onMouseUp = useCallback(() => setDragging(false), []);

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
    <div className="relative flex flex-col" style={{ height: "calc(100vh - 120px)" }}>
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 rounded-t-2xl"
        style={{ background: "#0d1117", borderBottom: "1px solid #1e293b" }}>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-bold text-white tracking-tight">
            {tree.completedCount} / {tree.totalCount}
          </span>
          <div className="w-32 h-1.5 rounded-full overflow-hidden" style={{ background: "#1e293b" }}>
            <div className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(tree.completedCount / tree.totalCount) * 100}%`,
                background: "linear-gradient(90deg, #a78bfa, #38bdf8)" }} />
          </div>
          <span className="text-[10px] text-gray-500">nodes unlocked</span>
        </div>
        <div className="flex gap-2">
          {tree.branches.map(b => (
            <span key={b.category} className="text-[9px] font-semibold px-2 py-0.5 rounded-full"
              style={{ color: b.color, background: `${b.color}18`, border: `1px solid ${b.color}30` }}>
              {b.name}
            </span>
          ))}
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef}
        className="flex-1 overflow-hidden rounded-b-2xl select-none"
        style={{
          background: "radial-gradient(ellipse at 30% 50%, #111827 0%, #0a0f1e 60%, #060a14 100%)",
          backgroundImage: `radial-gradient(ellipse at 30% 50%, #111827 0%, #0a0f1e 60%, #060a14 100%), radial-gradient(circle, rgba(255,255,255,0.04) 1px, transparent 1px)`,
          backgroundSize: "100% 100%, 24px 24px",
          cursor: dragging ? "grabbing" : "grab",
        }}
        onWheel={onWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      >
        <svg width="100%" height="100%" className="block">
          <defs>
            <filter id="glow-gold"><feGaussianBlur stdDeviation="6" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
            <filter id="glow-blue"><feGaussianBlur stdDeviation="4" result="b" />
              <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          </defs>

          <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
            {/* Connections: start → first of each branch */}
            {tree.branches.map(branch => {
              const first = branch.nodes[0];
              if (!first) return null;
              return <line key={`s-${first.id}`}
                x1={tree.startNode.x} y1={tree.startNode.y}
                x2={first.x} y2={first.y}
                stroke={first.status === "completed" ? branch.color : "#1e293b"}
                strokeWidth={first.status === "completed" ? 2.5 : 1.5}
                strokeDasharray={first.status !== "completed" ? "4 3" : "none"}
                opacity={first.status === "locked" ? 0.3 : 0.8} />;
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
                  stroke={done ? branch.color : active ? `${branch.color}60` : "#1e293b"}
                  strokeWidth={done ? 2.5 : 1.5}
                  strokeDasharray={done ? "none" : "4 3"}
                  opacity={active ? 0.8 : 0.25} />;
              })
            )}

            {/* Connections: last of each branch → goal */}
            {tree.branches.map(branch => {
              const last = branch.nodes[branch.nodes.length - 1];
              if (!last) return null;
              return <line key={`${last.id}-g`}
                x1={last.x} y1={last.y}
                x2={tree.goalNode.x} y2={tree.goalNode.y}
                stroke={last.status === "completed" ? `${branch.color}80` : "#1e293b"}
                strokeWidth={1.5} strokeDasharray="4 3"
                opacity={last.status === "completed" ? 0.6 : 0.2} />;
            })}

            {/* Start node */}
            <NodeCircle node={tree.startNode} color="#fbbf24" hovered={false}
              onHover={() => {}} onClick={() => {}} isSpecial />

            {/* Branch nodes */}
            {tree.branches.map(branch =>
              branch.nodes.map(node => (
                <NodeCircle key={node.id} node={node} color={branch.color}
                  hovered={hovered === node.id}
                  onHover={setHovered} onClick={handleClick} />
              ))
            )}

            {/* Goal node */}
            <NodeCircle node={tree.goalNode} color="#fbbf24" hovered={false}
              onHover={() => {}} onClick={() => {}} isSpecial />
          </g>
        </svg>

        {/* Tooltip */}
        {hovered && (() => {
          const node = tree.allNodes.find(n => n.id === hovered);
          if (!node) return null;
          const sx = node.x * transform.scale + transform.x;
          const sy = node.y * transform.scale + transform.y - 50;
          return (
            <div className="absolute pointer-events-none z-20 px-3 py-2 rounded-lg max-w-[200px]"
              style={{ left: sx - 80, top: sy - 30,
                background: "rgba(15,23,42,0.95)", border: "1px solid #334155",
                boxShadow: "0 8px 32px rgba(0,0,0,0.5)" }}>
              <p className="text-[11px] font-semibold text-white truncate">{node.title}</p>
              <p className="text-[9px] text-gray-400 mt-0.5">{node.semester} · {node.effort}</p>
              {node.status === "locked" && (
                <p className="text-[9px] text-gray-500 mt-1">Complete previous node first</p>
              )}
              {(node.status === "available" || node.status === "in_progress") && (
                <p className="text-[9px] mt-1" style={{ color: getCategoryColor(node.category) }}>
                  Click to verify completion
                </p>
              )}
            </div>
          );
        })()}
      </div>

      {/* Detail panel */}
      {selectedNode && !verifyOpen && selectedNode.id !== "__start__" && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-4 left-4 right-4 rounded-xl p-4 z-30"
          style={{ background: "rgba(15,23,42,0.95)", border: "1px solid #1e293b" }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[13px] font-semibold text-white">{selectedNode.title}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{selectedNode.semester} · {selectedNode.effort}</p>
            </div>
            <div className="flex gap-2">
              {selectedNode.status === "completed" ? (
                <span className="text-[10px] font-semibold text-emerald-400 px-2 py-1 rounded-full bg-emerald-400/10">
                  Completed
                </span>
              ) : (
                <button onClick={() => { markNodeInProgress(selectedNode.id); setVerifyOpen(true); rebuild(); }}
                  className="text-[11px] font-semibold px-3 py-1.5 rounded-lg bg-white text-black hover:bg-gray-200 transition-colors">
                  Verify
                </button>
              )}
              <button onClick={() => setSelectedNode(null)}
                className="text-[11px] text-gray-400 px-2 py-1.5 rounded-lg hover:bg-white/5 transition-colors">
                Close
              </button>
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-2 leading-relaxed">{selectedNode.why}</p>
        </motion.div>
      )}

      <VerifyChatModal node={selectedNode} open={verifyOpen}
        onClose={() => setVerifyOpen(false)} onVerified={handleVerified} />
    </div>
  );
}

/* ─── Circular Node ──────────────────────────────── */

function NodeCircle({ node, color, hovered, onHover, onClick, isSpecial }: {
  node: SkillNode; color: string; hovered: boolean;
  onHover: (id: string | null) => void; onClick: (n: SkillNode) => void;
  isSpecial?: boolean;
}) {
  const done = node.status === "completed";
  const avail = node.status === "available";
  const ip = node.status === "in_progress";
  const locked = node.status === "locked";
  const r = isSpecial ? 30 : R;

  const fillColor = done ? `${color}30` : avail || ip ? "rgba(255,255,255,0.05)" : "rgba(255,255,255,0.02)";
  const strokeColor = done ? color : avail ? `${color}cc` : ip ? color : "#1e293b";
  const strokeW = done ? 3 : avail || ip ? 2.5 : 1.5;
  const op = locked ? 0.35 : 1;

  return (
    <g data-node="true" opacity={op}
      onMouseEnter={() => onHover(node.id)} onMouseLeave={() => onHover(null)}
      onClick={() => onClick(node)}
      style={{ cursor: locked ? "not-allowed" : isSpecial ? "default" : "pointer" }}>

      {/* Outer glow for completed/available */}
      {(done || avail || ip) && (
        <circle cx={node.x} cy={node.y} r={r + 8}
          fill="none" stroke={color} strokeWidth={1}
          opacity={done ? 0.4 : 0.2}
          filter={done ? "url(#glow-gold)" : "url(#glow-blue)"} />
      )}

      {/* Pulse ring for available */}
      {(avail || ip) && (
        <circle cx={node.x} cy={node.y} r={r + 4}
          fill="none" stroke={color} strokeWidth={1.5} opacity={0.5}>
          <animate attributeName="r" from={String(r + 2)} to={String(r + 14)} dur="2s" repeatCount="indefinite" />
          <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite" />
        </circle>
      )}

      {/* Main circle */}
      <circle cx={node.x} cy={node.y} r={r}
        fill={fillColor} stroke={strokeColor} strokeWidth={strokeW}
        className="transition-all duration-200" />

      {/* Hover highlight */}
      {hovered && !locked && (
        <circle cx={node.x} cy={node.y} r={r + 2}
          fill="none" stroke="white" strokeWidth={1} opacity={0.6} />
      )}

      {/* Icon */}
      {isSpecial && node.id === "__goal__" ? (
        <foreignObject x={node.x - 10} y={node.y - 10} width={20} height={20}>
          <Trophy size={16} className="text-amber-400 mx-auto" />
        </foreignObject>
      ) : isSpecial ? (
        <circle cx={node.x} cy={node.y} r={6} fill={color} opacity={0.8} />
      ) : done ? (
        <foreignObject x={node.x - 7} y={node.y - 7} width={14} height={14}>
          <Check size={12} style={{ color }} strokeWidth={3} className="mx-auto" />
        </foreignObject>
      ) : locked ? (
        <foreignObject x={node.x - 6} y={node.y - 6} width={12} height={12}>
          <Lock size={10} className="text-gray-600 mx-auto" />
        </foreignObject>
      ) : ip ? (
        <foreignObject x={node.x - 6} y={node.y - 6} width={12} height={12}>
          <Play size={10} style={{ color }} className="mx-auto" />
        </foreignObject>
      ) : (
        <circle cx={node.x} cy={node.y} r={4}
          fill={avail ? color : "#475569"} opacity={0.8} />
      )}
    </g>
  );
}
