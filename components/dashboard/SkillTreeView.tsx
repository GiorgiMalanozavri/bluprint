"use client";

import { motion } from "framer-motion";
import { Check, Crown, Lock, Play, Zap } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildSkillTree,
  getCategoryColor,
  getCategoryIcon,
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

/* ─── Constants ──────────────────────────────────── */

const NODE_W = 160;
const NODE_H = 72;
const GAP_X = 200;
const GAP_Y = 120;
const TRUNK_PAD_TOP = 60;

/* ─── Main Component ─────────────────────────────── */

export default function SkillTreeView({
  semesters,
  dreamRole,
}: {
  semesters: SemesterData[];
  dreamRole?: string;
}) {
  const [tree, setTree] = useState<SkillTreeData | null>(null);
  const [selectedNode, setSelectedNode] = useState<SkillNode | null>(null);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const rebuild = useCallback(() => {
    if (semesters.length === 0) return;
    setTree(buildSkillTree(semesters, dreamRole));
  }, [semesters, dreamRole]);

  useEffect(() => { rebuild(); }, [rebuild]);

  const handleNodeClick = useCallback((node: SkillNode) => {
    if (node.status === "locked") return;
    if (node.status === "completed") {
      setSelectedNode(node);
      return;
    }
    // Available or in_progress → open verify chat
    markNodeInProgress(node.id);
    setSelectedNode(node);
    setVerifyOpen(true);
    rebuild();
  }, [rebuild]);

  const handleVerified = useCallback((nodeId: string) => {
    markNodeCompleted(nodeId);
    setTimeout(() => {
      setVerifyOpen(false);
      setSelectedNode(null);
      rebuild();
    }, 1800);
  }, [rebuild]);

  if (!tree || tree.allNodes.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--surface)] py-16 text-center">
        <p className="text-sm font-medium text-[var(--foreground)]">No skill tree yet.</p>
        <p className="mt-1.5 text-xs text-[var(--muted)]">Generate your roadmap first.</p>
      </div>
    );
  }

  const maxRows = Math.max(...tree.branches.map((b) => b.nodes.length));
  const cols = tree.branches.length;
  const svgW = cols * GAP_X + NODE_W;
  const svgH = (maxRows + 2) * GAP_Y + TRUNK_PAD_TOP + NODE_H;

  // Node position helpers
  const nx = (col: number) => col * GAP_X + GAP_X / 2;
  const ny = (row: number) => (maxRows - row) * GAP_Y + TRUNK_PAD_TOP;
  const goalX = nx(Math.floor(cols / 2));
  const goalY = ny(maxRows + 1);

  return (
    <div className="animate-fade-up">
      {/* Header stats */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-[var(--accent)]/10 flex items-center justify-center">
            <Zap size={16} className="text-[var(--accent)]" />
          </div>
          <div>
            <p className="text-[22px] font-bold tracking-tight text-[var(--foreground)] leading-none">
              {tree.completedCount}/{tree.totalCount}
            </p>
            <p className="text-[10px] text-[var(--muted)] mt-0.5">skills unlocked</p>
          </div>
        </div>
        <div className="flex-1 h-2 rounded-full bg-[var(--border)] overflow-hidden min-w-[120px]">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[var(--accent)] to-[#8b5cf6]"
            initial={{ width: 0 }}
            animate={{ width: `${(tree.completedCount / tree.totalCount) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        {/* Branch legend */}
        <div className="flex flex-wrap gap-2">
          {tree.branches.map((b) => (
            <span key={b.category}
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium border"
              style={{
                color: b.color,
                borderColor: `${b.color}30`,
                background: `${b.color}08`,
              }}>
              {getCategoryIcon(b.category)} {b.name}
            </span>
          ))}
        </div>
      </div>

      {/* Tree canvas */}
      <div ref={containerRef}
        className="relative overflow-x-auto overflow-y-visible rounded-2xl border border-[var(--border)] bg-[var(--surface)]"
        style={{ minHeight: Math.min(svgH + 40, 700) }}>

        <svg ref={svgRef} width={svgW} height={svgH}
          className="mx-auto block" style={{ minWidth: svgW }}>
          <defs>
            {/* Glow filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-strong">
              <feGaussianBlur stdDeviation="8" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Connection lines */}
          {tree.branches.map((branch) =>
            branch.nodes.map((node, idx) => {
              if (idx === 0) return null;
              const prev = branch.nodes[idx - 1];
              const x1 = nx(node.column);
              const y1 = ny(node.row) + NODE_H / 2;
              const x2 = nx(prev.column);
              const y2 = ny(prev.row) + NODE_H / 2;
              const bothDone = node.status === "completed" && prev.status === "completed";
              const oneAvail = node.status !== "locked" || prev.status !== "locked";
              return (
                <motion.path
                  key={`${prev.id}-${node.id}`}
                  d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
                  fill="none"
                  stroke={bothDone ? branch.color : oneAvail ? `${branch.color}60` : "var(--border)"}
                  strokeWidth={bothDone ? 3 : 2}
                  strokeDasharray={bothDone ? "none" : "6 4"}
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.6, delay: idx * 0.08 }}
                />
              );
            })
          )}

          {/* Lines from last node of each branch to goal */}
          {tree.branches.map((branch) => {
            const last = branch.nodes[branch.nodes.length - 1];
            if (!last) return null;
            const x1 = nx(last.column);
            const y1 = ny(last.row) + NODE_H / 2;
            const x2 = goalX;
            const y2 = goalY + NODE_H / 2;
            const done = last.status === "completed";
            return (
              <motion.path
                key={`${last.id}-goal`}
                d={`M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`}
                fill="none"
                stroke={done ? `${branch.color}80` : "var(--border)"}
                strokeWidth={2}
                strokeDasharray="6 4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              />
            );
          })}

          {/* Nodes */}
          {tree.branches.map((branch) =>
            branch.nodes.map((node, idx) => (
              <TreeNode
                key={node.id}
                node={node}
                x={nx(node.column) - NODE_W / 2}
                y={ny(node.row)}
                color={branch.color}
                hovered={hoveredNode === node.id}
                onHover={setHoveredNode}
                onClick={handleNodeClick}
                delay={idx * 0.06}
              />
            ))
          )}

          {/* Goal node */}
          <GoalNode
            x={goalX - NODE_W / 2 - 10}
            y={goalY}
            title={tree.goalNode.title}
            completed={tree.goalNode.status === "completed"}
          />
        </svg>
      </div>

      {/* Selected node detail panel */}
      {selectedNode && !verifyOpen && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{getCategoryIcon(selectedNode.category)}</span>
              <div>
                <p className="text-[14px] font-semibold text-[var(--foreground)]">{selectedNode.title}</p>
                <p className="text-[11px] text-[var(--muted)] mt-0.5">{selectedNode.semester} · {selectedNode.effort}</p>
              </div>
            </div>
            {selectedNode.status === "completed" ? (
              <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-600">
                ✓ Completed
              </span>
            ) : (
              <button
                onClick={() => { markNodeInProgress(selectedNode.id); setVerifyOpen(true); rebuild(); }}
                className="btn-primary h-8 px-4 text-[12px]"
              >
                Verify Completion
              </button>
            )}
          </div>
          <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--muted-foreground)]">
            {selectedNode.why}
          </p>
        </motion.div>
      )}

      {/* Verify Chat Modal */}
      <VerifyChatModal
        node={selectedNode}
        open={verifyOpen}
        onClose={() => { setVerifyOpen(false); }}
        onVerified={handleVerified}
      />
    </div>
  );
}

/* ─── Tree Node (SVG foreignObject) ───────────── */

function TreeNode({
  node, x, y, color, hovered, onHover, onClick, delay,
}: {
  node: SkillNode;
  x: number; y: number;
  color: string;
  hovered: boolean;
  onHover: (id: string | null) => void;
  onClick: (n: SkillNode) => void;
  delay: number;
}) {
  const isLocked = node.status === "locked";
  const isDone = node.status === "completed";
  const isAvail = node.status === "available";
  const isInProg = node.status === "in_progress";

  return (
    <motion.g
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
    >
      <foreignObject x={x} y={y} width={NODE_W} height={NODE_H}>
        <div
          onClick={() => onClick(node)}
          onMouseEnter={() => onHover(node.id)}
          onMouseLeave={() => onHover(null)}
          className="h-full w-full rounded-xl border-2 px-3 py-2 flex flex-col justify-center transition-all duration-200"
          style={{
            cursor: isLocked ? "not-allowed" : "pointer",
            borderColor: isDone ? color : isAvail || isInProg ? `${color}80` : "var(--border)",
            background: isDone
              ? `${color}15`
              : isAvail
              ? "var(--surface)"
              : isInProg
              ? `${color}08`
              : "var(--background-secondary)",
            opacity: isLocked ? 0.45 : 1,
            transform: hovered && !isLocked ? "scale(1.06)" : "scale(1)",
            boxShadow: isDone
              ? `0 0 20px ${color}25`
              : hovered && !isLocked
              ? `0 4px 20px ${color}20`
              : "none",
          }}
        >
          <div className="flex items-center gap-1.5">
            {isDone ? (
              <Check size={12} style={{ color }} strokeWidth={3} />
            ) : isLocked ? (
              <Lock size={11} className="text-[var(--muted)]" />
            ) : isInProg ? (
              <Play size={11} style={{ color }} />
            ) : (
              <span className="text-[11px]">{getCategoryIcon(node.category)}</span>
            )}
            <span
              className="text-[10.5px] font-semibold truncate leading-tight"
              style={{ color: isDone || isAvail || isInProg ? "var(--foreground)" : "var(--muted)" }}
            >
              {node.title}
            </span>
          </div>
          <p className="text-[9px] mt-0.5 truncate"
            style={{ color: isDone ? color : "var(--muted)" }}>
            {isDone ? "Verified ✓" : isLocked ? "Complete previous first" : node.effort}
          </p>
        </div>
      </foreignObject>
    </motion.g>
  );
}

/* ─── Goal Node ──────────────────────────────────── */

function GoalNode({ x, y, title, completed }: { x: number; y: number; title: string; completed: boolean }) {
  return (
    <motion.g
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.8 }}
    >
      <foreignObject x={x} y={y} width={NODE_W + 20} height={NODE_H + 10}>
        <div className="h-full w-full rounded-2xl border-2 px-4 py-3 flex items-center gap-3"
          style={{
            borderColor: completed ? "#f59e0b" : "var(--border)",
            background: completed
              ? "linear-gradient(135deg, #fef3c7, #fde68a)"
              : "linear-gradient(135deg, var(--surface), var(--background-secondary))",
            boxShadow: completed ? "0 0 30px rgba(245,158,11,0.3)" : "var(--shadow-card)",
          }}>
          <Crown size={20} className={completed ? "text-amber-600" : "text-[var(--muted)]"} />
          <div>
            <p className="text-[12px] font-bold" style={{ color: completed ? "#92400e" : "var(--foreground)" }}>
              {title}
            </p>
            <p className="text-[9px]" style={{ color: completed ? "#b45309" : "var(--muted)" }}>
              {completed ? "🏆 Goal reached!" : "Complete all branches"}
            </p>
          </div>
        </div>
      </foreignObject>
    </motion.g>
  );
}
