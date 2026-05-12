// Skill Tree Engine
// Transforms semester roadmap data into an interactive game-like tree.
// Nodes are locked until prerequisites are completed.
// Completion is verified by the AI assistant.

import { userStorage } from "@/lib/user-storage";

export type NodeStatus = "locked" | "available" | "in_progress" | "completed";

export type SkillNode = {
  id: string;
  title: string;
  category: string;
  effort: string;
  why: string;
  semester: string;
  semesterIndex: number;
  status: NodeStatus;
  /** IDs of nodes that must be completed before this one unlocks */
  prerequisites: string[];
  /** Position in the visual tree (computed) */
  column: number;
  row: number;
  /** Branch index (0 = main trunk, 1+ = side branches) */
  branch: number;
};

export type TreeBranch = {
  name: string;
  category: string;
  nodes: SkillNode[];
  color: string;
};

export type SkillTreeData = {
  branches: TreeBranch[];
  allNodes: SkillNode[];
  goalNode: SkillNode;
  completedCount: number;
  totalCount: number;
};

// ─── Completion State (localStorage) ─────────────────────────

const TREE_COMPLETED_KEY = "bluprint_skill_tree_completed_v1";
const TREE_IN_PROGRESS_KEY = "bluprint_skill_tree_in_progress_v1";

export function getCompletedNodes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = userStorage.getItem(TREE_COMPLETED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getInProgressNodes(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = userStorage.getItem(TREE_IN_PROGRESS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markNodeCompleted(nodeId: string): void {
  const completed = getCompletedNodes();
  if (!completed.includes(nodeId)) {
    completed.push(nodeId);
    userStorage.setItem(TREE_COMPLETED_KEY, JSON.stringify(completed));
  }
  // Remove from in-progress
  const inProgress = getInProgressNodes().filter((id) => id !== nodeId);
  userStorage.setItem(TREE_IN_PROGRESS_KEY, JSON.stringify(inProgress));
}

export function markNodeInProgress(nodeId: string): void {
  const inProgress = getInProgressNodes();
  if (!inProgress.includes(nodeId)) {
    inProgress.push(nodeId);
    userStorage.setItem(TREE_IN_PROGRESS_KEY, JSON.stringify(inProgress));
  }
}

// ─── Category Colors ──────────────────────────────────────

const CATEGORY_COLORS: Record<string, string> = {
  INTERNSHIP: "#8b5cf6",    // violet
  CV: "#3b82f6",            // blue
  NETWORKING: "#06b6d4",    // cyan
  ACADEMICS: "#10b981",     // emerald
  VISA: "#f59e0b",          // amber
  SKILLS: "#ec4899",        // pink
  default: "#6366f1",       // indigo
};

export function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat?.toUpperCase()] || CATEGORY_COLORS.default;
}

const CATEGORY_ICONS: Record<string, string> = {
  INTERNSHIP: "💼",
  CV: "📄",
  NETWORKING: "🤝",
  ACADEMICS: "📚",
  VISA: "🛂",
  SKILLS: "⚡",
};

export function getCategoryIcon(cat: string): string {
  return CATEGORY_ICONS[cat?.toUpperCase()] || "🎯";
}

// ─── Build Tree from Roadmap Data ────────────────────────

type SemesterData = {
  semester: string;
  status: "completed" | "current" | "upcoming";
  tasks: {
    id: string;
    title: string;
    category: string;
    effort: string;
    why: string;
  }[];
};

export function buildSkillTree(semesters: SemesterData[], dreamRole?: string): SkillTreeData {
  const completed = getCompletedNodes();
  const inProgress = getInProgressNodes();

  // Group tasks by category across all semesters
  const categoryMap = new Map<string, { tasks: (SemesterData["tasks"][0] & { semester: string; semesterIndex: number })[] }>();

  semesters.forEach((sem, semIdx) => {
    sem.tasks.forEach((task) => {
      const cat = task.category?.toUpperCase() || "SKILLS";
      if (!categoryMap.has(cat)) {
        categoryMap.set(cat, { tasks: [] });
      }
      categoryMap.get(cat)!.tasks.push({
        ...task,
        semester: sem.semester,
        semesterIndex: semIdx,
      });
    });
  });

  const allNodes: SkillNode[] = [];
  const branches: TreeBranch[] = [];
  let branchIdx = 0;

  // Sort categories so the main ones appear first
  const categoryOrder = ["INTERNSHIP", "SKILLS", "CV", "NETWORKING", "ACADEMICS", "VISA"];
  const sortedCategories = [...categoryMap.keys()].sort((a, b) => {
    const ai = categoryOrder.indexOf(a);
    const bi = categoryOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  for (const cat of sortedCategories) {
    const { tasks } = categoryMap.get(cat)!;
    // Sort tasks by semester index
    tasks.sort((a, b) => a.semesterIndex - b.semesterIndex);

    const branchNodes: SkillNode[] = tasks.map((task, taskIdx) => {
      // Each task in a branch depends on the previous task in the same branch
      const prereqs: string[] = [];
      if (taskIdx > 0) {
        prereqs.push(tasks[taskIdx - 1].id);
      }

      const isCompleted = completed.includes(task.id);
      const isInProg = inProgress.includes(task.id);
      const prereqsMet = prereqs.every((p) => completed.includes(p));

      let status: NodeStatus = "locked";
      if (isCompleted) status = "completed";
      else if (isInProg && prereqsMet) status = "in_progress";
      else if (prereqsMet) status = "available";

      const node: SkillNode = {
        id: task.id,
        title: task.title,
        category: cat,
        effort: task.effort,
        why: task.why,
        semester: task.semester,
        semesterIndex: task.semesterIndex,
        status,
        prerequisites: prereqs,
        column: branchIdx,
        row: taskIdx,
        branch: branchIdx,
      };

      return node;
    });

    branches.push({
      name: cat.charAt(0) + cat.slice(1).toLowerCase(),
      category: cat,
      nodes: branchNodes,
      color: getCategoryColor(cat),
    });

    allNodes.push(...branchNodes);
    branchIdx++;
  }

  // Create the goal node at the top — depends on all final branch nodes
  const goalNode: SkillNode = {
    id: "__goal__",
    title: dreamRole || "Dream Role",
    category: "GOAL",
    effort: "",
    why: "Complete all branches to reach your goal!",
    semester: "",
    semesterIndex: 999,
    status: allNodes.every((n) => n.status === "completed") ? "completed" : "locked",
    prerequisites: branches.map((b) => b.nodes[b.nodes.length - 1]?.id).filter(Boolean),
    column: Math.floor(branches.length / 2),
    row: Math.max(...branches.map((b) => b.nodes.length)) + 1,
    branch: -1,
  };

  return {
    branches,
    allNodes,
    goalNode,
    completedCount: allNodes.filter((n) => n.status === "completed").length,
    totalCount: allNodes.length,
  };
}
