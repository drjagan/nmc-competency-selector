import type { Subject, Topic, CompetencyWithDetails } from "./index";

export type TreeNodeType = "root" | "subject" | "topic" | "competency";

export interface TreeNode {
  id: string; // "root", "s-{id}", "t-{id}", "c-{code}"
  name: string;
  type: TreeNodeType;
  expanded: boolean;
  loading: boolean;
  childCount?: number;
  data?: Subject | Topic | CompetencyWithDetails;
  children?: TreeNode[];
}

export interface TreeSubjectData {
  id: number;
  code: string;
  name: string;
  topicCount: number;
  competencyCount: number;
}

export interface TreeTopicData {
  id: number;
  name: string;
  competencyCount: number;
}

export interface TreeState {
  root: TreeNode | null;
  expandedNodes: Set<string>;
  loadingNodes: Set<string>;
  transform: {
    x: number;
    y: number;
    k: number; // zoom scale
  };
}

export type TreeAction =
  | { type: "SET_ROOT"; root: TreeNode }
  | { type: "EXPAND_NODE"; nodeId: string }
  | { type: "COLLAPSE_NODE"; nodeId: string }
  | { type: "SET_LOADING"; nodeId: string; loading: boolean }
  | { type: "SET_CHILDREN"; nodeId: string; children: TreeNode[] }
  | { type: "SET_TRANSFORM"; transform: TreeState["transform"] }
  | { type: "RESET" };

// D3 hierarchy types
export interface D3TreeNode {
  x: number;
  y: number;
  data: TreeNode;
  parent: D3TreeNode | null;
  children?: D3TreeNode[];
  depth: number;
  height: number;
}

export interface D3TreeLink {
  source: D3TreeNode;
  target: D3TreeNode;
}
