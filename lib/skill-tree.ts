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
  prerequisites: string[];
  x: number;
  y: number;
  branch: number;
  size?: "sm" | "md" | "lg";
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
  startNode: SkillNode;
  goalNode: SkillNode;
  completedCount: number;
  totalCount: number;
};

const TREE_COMPLETED_KEY = "bluprint_skill_tree_completed_v1";
const TREE_IN_PROGRESS_KEY = "bluprint_skill_tree_in_progress_v1";

export function getCompletedNodes(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(userStorage.getItem(TREE_COMPLETED_KEY) || "[]"); } catch { return []; }
}
export function getInProgressNodes(): string[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(userStorage.getItem(TREE_IN_PROGRESS_KEY) || "[]"); } catch { return []; }
}
export function markNodeCompleted(nodeId: string): void {
  const c = getCompletedNodes();
  if (!c.includes(nodeId)) { c.push(nodeId); userStorage.setItem(TREE_COMPLETED_KEY, JSON.stringify(c)); }
  const ip = getInProgressNodes().filter((id) => id !== nodeId);
  userStorage.setItem(TREE_IN_PROGRESS_KEY, JSON.stringify(ip));
}
export function markNodeInProgress(nodeId: string): void {
  const ip = getInProgressNodes();
  if (!ip.includes(nodeId)) { ip.push(nodeId); userStorage.setItem(TREE_IN_PROGRESS_KEY, JSON.stringify(ip)); }
}

const CATEGORY_COLORS: Record<string, string> = {
  INTERNSHIP: "#a78bfa", CV: "#60a5fa", NETWORKING: "#34d399",
  ACADEMICS: "#fbbf24", VISA: "#f472b6", SKILLS: "#38bdf8", default: "#818cf8",
};
export function getCategoryColor(cat: string): string {
  return CATEGORY_COLORS[cat?.toUpperCase()] || CATEGORY_COLORS.default;
}

// Sub-step templates per category
const SUB_STEPS: Record<string, { suffix: string; title: (t: string) => string; effort: string }[]> = {
  INTERNSHIP: [
    { suffix: "_research", title: (t) => `Research: ${t}`, effort: "30 min" },
    { suffix: "_prep", title: (t) => `Prepare: ${t}`, effort: "1 hr" },
    { suffix: "_exec", title: (t) => t, effort: "2 hrs" },
  ],
  CV: [
    { suffix: "_audit", title: (t) => `Review: ${t}`, effort: "20 min" },
    { suffix: "_exec", title: (t) => t, effort: "1 hr" },
    { suffix: "_polish", title: (t) => `Finalize: ${t}`, effort: "30 min" },
  ],
  NETWORKING: [
    { suffix: "_find", title: (t) => `Identify: ${t}`, effort: "20 min" },
    { suffix: "_exec", title: (t) => t, effort: "45 min" },
    { suffix: "_follow", title: (t) => `Follow up: ${t}`, effort: "15 min" },
  ],
  ACADEMICS: [
    { suffix: "_plan", title: (t) => `Plan: ${t}`, effort: "20 min" },
    { suffix: "_exec", title: (t) => t, effort: "2 hrs" },
  ],
  SKILLS: [
    { suffix: "_learn", title: (t) => `Learn: ${t}`, effort: "1 hr" },
    { suffix: "_exec", title: (t) => t, effort: "2 hrs" },
    { suffix: "_project", title: (t) => `Apply: ${t}`, effort: "3 hrs" },
  ],
  VISA: [
    { suffix: "_check", title: (t) => `Check: ${t}`, effort: "15 min" },
    { suffix: "_exec", title: (t) => t, effort: "1 hr" },
  ],
};

type SemesterData = {
  semester: string;
  status: "completed" | "current" | "upcoming";
  tasks: { id: string; title: string; category: string; effort: string; why: string }[];
};

const ROW_SPACING = 110;
const COL_SPACING = 120;

export function buildSkillTree(semesters: SemesterData[], dreamRole?: string): SkillTreeData {
  const completed = getCompletedNodes();
  const inProgress = getInProgressNodes();

  // Group and expand tasks by category
  const catMap = new Map<string, { id: string; title: string; effort: string; why: string; semester: string; semIdx: number }[]>();
  const catOrder = ["INTERNSHIP", "SKILLS", "CV", "NETWORKING", "ACADEMICS", "VISA"];

  semesters.forEach((sem, si) => {
    sem.tasks.forEach((task) => {
      const cat = task.category?.toUpperCase() || "SKILLS";
      if (!catMap.has(cat)) catMap.set(cat, []);
      // Expand into sub-steps
      const steps = SUB_STEPS[cat] || SUB_STEPS.SKILLS;
      steps.forEach((step) => {
        catMap.get(cat)!.push({
          id: task.id + step.suffix,
          title: step.title(task.title),
          effort: step.effort,
          why: task.why,
          semester: sem.semester,
          semIdx: si,
        });
      });
    });
  });

  const sortedCats = [...catMap.keys()].sort((a, b) => {
    const ai = catOrder.indexOf(a), bi = catOrder.indexOf(b);
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi);
  });

  const numBranches = sortedCats.length;
  const centerY = ((numBranches - 1) * ROW_SPACING) / 2 + 60;
  const allNodes: SkillNode[] = [];
  const branches: TreeBranch[] = [];

  // Start node
  const startNode: SkillNode = {
    id: "__start__", title: "Start", category: "START", effort: "", why: "Your journey begins here.",
    semester: "", semesterIndex: 0, status: "completed", prerequisites: [],
    x: 60, y: centerY, branch: -1, size: "lg",
  };

  sortedCats.forEach((cat, bIdx) => {
    const tasks = catMap.get(cat)!;
    tasks.sort((a, b) => a.semIdx - b.semIdx);
    const rowY = bIdx * ROW_SPACING + 60;

    const branchNodes: SkillNode[] = tasks.map((task, tIdx) => {
      const prereqs: string[] = tIdx === 0 ? ["__start__"] : [tasks[tIdx - 1].id];
      const isDone = completed.includes(task.id);
      const isIP = inProgress.includes(task.id);
      const prereqsMet = prereqs.every((p) => p === "__start__" || completed.includes(p));
      let status: NodeStatus = "locked";
      if (isDone) status = "completed";
      else if (isIP && prereqsMet) status = "in_progress";
      else if (prereqsMet) status = "available";

      return {
        id: task.id, title: task.title, category: cat, effort: task.effort,
        why: task.why, semester: task.semester, semesterIndex: task.semIdx,
        status, prerequisites: prereqs,
        x: 200 + tIdx * COL_SPACING, y: rowY,
        branch: bIdx, size: "md" as const,
      };
    });

    branches.push({ name: cat.charAt(0) + cat.slice(1).toLowerCase(), category: cat, nodes: branchNodes, color: getCategoryColor(cat) });
    allNodes.push(...branchNodes);
  });

  const maxX = Math.max(...allNodes.map((n) => n.x), 400);
  const goalNode: SkillNode = {
    id: "__goal__", title: dreamRole || "Dream Role", category: "GOAL", effort: "", why: "Complete all branches!",
    semester: "", semesterIndex: 999, status: allNodes.every((n) => n.status === "completed") ? "completed" : "locked",
    prerequisites: branches.map((b) => b.nodes[b.nodes.length - 1]?.id).filter(Boolean),
    x: maxX + 180, y: centerY, branch: -1, size: "lg",
  };

  return {
    branches, allNodes, startNode, goalNode,
    completedCount: allNodes.filter((n) => n.status === "completed").length,
    totalCount: allNodes.length,
  };
}
