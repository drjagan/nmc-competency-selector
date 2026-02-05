"use client";

import { useReducer, useCallback, useEffect } from "react";
import type {
  TreeNode,
  TreeState,
  TreeAction,
  TreeSubjectData,
  TreeTopicData,
} from "@/types/tree";
import type { CompetencyWithDetails, CompetencyTag } from "@/types";

const initialState: TreeState = {
  root: null,
  expandedNodes: new Set(),
  loadingNodes: new Set(),
  transform: { x: 100, y: 300, k: 1 },
};

function findNode(root: TreeNode, nodeId: string): TreeNode | null {
  if (root.id === nodeId) return root;
  if (root.children) {
    for (const child of root.children) {
      const found = findNode(child, nodeId);
      if (found) return found;
    }
  }
  return null;
}

function updateNode(
  root: TreeNode,
  nodeId: string,
  updater: (node: TreeNode) => TreeNode
): TreeNode {
  if (root.id === nodeId) {
    return updater(root);
  }
  if (root.children) {
    return {
      ...root,
      children: root.children.map((child) => updateNode(child, nodeId, updater)),
    };
  }
  return root;
}

function treeReducer(state: TreeState, action: TreeAction): TreeState {
  switch (action.type) {
    case "SET_ROOT":
      return { ...state, root: action.root };

    case "EXPAND_NODE": {
      const newExpanded = new Set(state.expandedNodes);
      newExpanded.add(action.nodeId);
      if (state.root) {
        const newRoot = updateNode(state.root, action.nodeId, (node) => ({
          ...node,
          expanded: true,
        }));
        return { ...state, root: newRoot, expandedNodes: newExpanded };
      }
      return { ...state, expandedNodes: newExpanded };
    }

    case "COLLAPSE_NODE": {
      const newExpanded = new Set(state.expandedNodes);
      newExpanded.delete(action.nodeId);
      if (state.root) {
        const newRoot = updateNode(state.root, action.nodeId, (node) => ({
          ...node,
          expanded: false,
        }));
        return { ...state, root: newRoot, expandedNodes: newExpanded };
      }
      return { ...state, expandedNodes: newExpanded };
    }

    case "SET_LOADING": {
      const newLoading = new Set(state.loadingNodes);
      if (action.loading) {
        newLoading.add(action.nodeId);
      } else {
        newLoading.delete(action.nodeId);
      }
      if (state.root) {
        const newRoot = updateNode(state.root, action.nodeId, (node) => ({
          ...node,
          loading: action.loading,
        }));
        return { ...state, root: newRoot, loadingNodes: newLoading };
      }
      return { ...state, loadingNodes: newLoading };
    }

    case "SET_CHILDREN": {
      if (state.root) {
        const newRoot = updateNode(state.root, action.nodeId, (node) => ({
          ...node,
          children: action.children,
          loading: false,
        }));
        const newLoading = new Set(state.loadingNodes);
        newLoading.delete(action.nodeId);
        return { ...state, root: newRoot, loadingNodes: newLoading };
      }
      return state;
    }

    case "SET_TRANSFORM":
      return { ...state, transform: action.transform };

    case "RESET":
      return initialState;

    default:
      return state;
  }
}

interface UseTreeGraphOptions {
  selectedCodes?: string[];
  onSelect?: (tag: CompetencyTag) => void;
  version?: string;
}

export function useTreeGraph(options: UseTreeGraphOptions = {}) {
  const { selectedCodes = [], onSelect, version } = options;

  // Build URL with optional version parameter
  const buildUrl = useCallback(
    (baseUrl: string) => {
      if (!version) return baseUrl;
      const separator = baseUrl.includes("?") ? "&" : "?";
      return `${baseUrl}${separator}version=${version}`;
    },
    [version]
  );
  const [state, dispatch] = useReducer(treeReducer, initialState);

  // Load initial subjects on mount or when version changes
  useEffect(() => {
    async function loadSubjects() {
      try {
        const response = await fetch(buildUrl("/api/tree"));
        const data = await response.json();

        const subjectNodes: TreeNode[] = data.subjects.map(
          (subject: TreeSubjectData) => ({
            id: `s-${subject.id}`,
            name: subject.name,
            type: "subject" as const,
            expanded: false,
            loading: false,
            childCount: subject.competencyCount,
            data: subject,
            children: [],
          })
        );

        const root: TreeNode = {
          id: "root",
          name: "NMC Competencies",
          type: "root",
          expanded: true,
          loading: false,
          childCount: data.totalCompetencies,
          children: subjectNodes,
        };

        dispatch({ type: "SET_ROOT", root });
      } catch (error) {
        console.error("Failed to load subjects:", error);
      }
    }

    loadSubjects();
  }, [buildUrl]);

  const loadTopics = useCallback(async (subjectId: number, nodeId: string) => {
    dispatch({ type: "SET_LOADING", nodeId, loading: true });

    try {
      const response = await fetch(buildUrl(`/api/tree/subjects/${subjectId}`));
      const data = await response.json();

      const topicNodes: TreeNode[] = data.topics.map((topic: TreeTopicData) => ({
        id: `t-${topic.id}`,
        name: topic.name,
        type: "topic" as const,
        expanded: false,
        loading: false,
        childCount: topic.competencyCount,
        data: topic,
        children: [],
      }));

      dispatch({ type: "SET_CHILDREN", nodeId, children: topicNodes });
    } catch (error) {
      console.error("Failed to load topics:", error);
      dispatch({ type: "SET_LOADING", nodeId, loading: false });
    }
  }, [buildUrl]);

  const loadCompetencies = useCallback(async (topicId: number, nodeId: string) => {
    dispatch({ type: "SET_LOADING", nodeId, loading: true });

    try {
      const response = await fetch(buildUrl(`/api/topics/${topicId}/competencies`));
      const competencies: CompetencyWithDetails[] = await response.json();

      const competencyNodes: TreeNode[] = competencies.map((comp) => ({
        id: `c-${comp.competency_code}`,
        name: comp.competency_text,
        type: "competency" as const,
        expanded: false,
        loading: false,
        data: comp,
        children: undefined,
      }));

      dispatch({ type: "SET_CHILDREN", nodeId, children: competencyNodes });
    } catch (error) {
      console.error("Failed to load competencies:", error);
      dispatch({ type: "SET_LOADING", nodeId, loading: false });
    }
  }, [buildUrl]);

  const toggleNode = useCallback(
    async (nodeId: string) => {
      if (!state.root) return;

      const node = findNode(state.root, nodeId);
      if (!node) return;

      // If already expanded, collapse
      if (node.expanded) {
        dispatch({ type: "COLLAPSE_NODE", nodeId });
        return;
      }

      // If loading, ignore
      if (node.loading) return;

      // Expand the node
      dispatch({ type: "EXPAND_NODE", nodeId });

      // Load children if needed
      if (node.type === "subject" && node.children?.length === 0 && node.data) {
        const subjectData = node.data as unknown as TreeSubjectData;
        await loadTopics(subjectData.id, nodeId);
      } else if (node.type === "topic" && node.children?.length === 0 && node.data) {
        const topicData = node.data as unknown as TreeTopicData;
        await loadCompetencies(topicData.id, nodeId);
      }
    },
    [state.root, loadTopics, loadCompetencies]
  );

  const toggleSelection = useCallback(
    (code: string) => {
      if (!onSelect || !state.root) return;

      // Find the competency node
      const nodeId = `c-${code}`;
      const node = findNode(state.root, nodeId);
      if (!node || node.type !== "competency") return;

      const comp = node.data as CompetencyWithDetails;
      const tag: CompetencyTag = {
        value: comp.competency_code,
        code: comp.competency_code,
        text: comp.competency_text,
        subjectCode: comp.subject_code,
        subjectName: comp.subject_name,
        topicName: comp.topic_name,
        domain: comp.domain || undefined,
        level: comp.competency_level || undefined,
        isCore: Boolean(comp.is_core),
        teachingMethods: comp.teaching_methods || undefined,
        assessmentMethods: comp.assessment_methods || undefined,
        integrations: comp.integrations || undefined,
      };

      onSelect(tag);
    },
    [state.root, onSelect]
  );

  const isSelected = useCallback(
    (code: string) => {
      return selectedCodes.includes(code);
    },
    [selectedCodes]
  );

  const setTransform = useCallback(
    (transform: TreeState["transform"]) => {
      dispatch({ type: "SET_TRANSFORM", transform });
    },
    []
  );

  const resetView = useCallback((width?: number, height?: number) => {
    // Calculate center position dynamically based on viewport dimensions
    const centerX = width ? Math.round(width / 3) : 100;  // Start tree 1/3 from left
    const centerY = height ? Math.round(height / 2) : 300; // Vertically center
    dispatch({ type: "SET_TRANSFORM", transform: { x: centerX, y: centerY, k: 1 } });
  }, []);

  return {
    treeData: state.root,
    isLoading: !state.root,
    expandedNodes: state.expandedNodes,
    loadingNodes: state.loadingNodes,
    transform: state.transform,
    toggleNode,
    toggleSelection,
    isSelected,
    setTransform,
    resetView,
  };
}
