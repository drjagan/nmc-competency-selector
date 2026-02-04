"use client";

import { useRef, useEffect, useMemo } from "react";
import { hierarchy, tree } from "d3-hierarchy";
import { zoom, zoomIdentity } from "d3-zoom";
import { select } from "d3-selection";
import type { TreeNode as TreeNodeType } from "@/types/tree";
import { TreeNode } from "./TreeNode";
import { TreeLink } from "./TreeLink";

interface TreeCanvasProps {
  data: TreeNodeType;
  width: number;
  height: number;
  transform: { x: number; y: number; k: number };
  onTransformChange: (transform: { x: number; y: number; k: number }) => void;
  onNodeClick: (nodeId: string) => void;
  onCompetencySelect?: (code: string) => void;
  selectedCodes: string[];
}

interface LayoutNode {
  x: number;
  y: number;
  data: TreeNodeType;
  parent: LayoutNode | null;
  children?: LayoutNode[];
}

// Filter to only include expanded nodes in the layout
function filterExpandedNodes(node: TreeNodeType): TreeNodeType {
  if (!node.children || !node.expanded) {
    return { ...node, children: undefined };
  }
  return {
    ...node,
    children: node.children.map(filterExpandedNodes),
  };
}

export function TreeCanvas({
  data,
  width,
  height,
  transform,
  onTransformChange,
  onNodeClick,
  onCompetencySelect,
  selectedCodes,
}: TreeCanvasProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);

  // Filter data to only show expanded nodes
  const filteredData = useMemo(() => filterExpandedNodes(data), [data]);

  // Calculate tree layout
  const { nodes, links } = useMemo(() => {
    const treeLayout = tree<TreeNodeType>()
      .nodeSize([50, 280])
      .separation((a, b) => (a.parent === b.parent ? 1 : 1.2));

    const root = hierarchy(filteredData, (d) => d.children);
    treeLayout(root);

    const nodes: LayoutNode[] = [];
    const links: { source: LayoutNode; target: LayoutNode }[] = [];

    root.each((node) => {
      // Swap x and y for horizontal layout
      // D3 assigns x and y after layout computation, provide defaults for TypeScript
      const layoutNode: LayoutNode = {
        x: node.y ?? 0,
        y: node.x ?? 0,
        data: node.data,
        parent: null,
        children: undefined,
      };
      nodes.push(layoutNode);

      if (node.parent) {
        const parentNode = nodes.find(
          (n) => n.data.id === node.parent!.data.id
        );
        if (parentNode) {
          layoutNode.parent = parentNode;
          links.push({
            source: parentNode,
            target: layoutNode,
          });
        }
      }
    });

    return { nodes, links };
  }, [filteredData]);

  // Set up zoom behavior
  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;

    const svg = select(svgRef.current);
    const g = select(gRef.current);

    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on("zoom", (event) => {
        const { x, y, k } = event.transform;
        onTransformChange({ x, y, k });
      });

    svg.call(zoomBehavior);

    // Set initial transform
    svg.call(
      zoomBehavior.transform,
      zoomIdentity.translate(transform.x, transform.y).scale(transform.k)
    );

    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  // Update transform when it changes externally
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);
    const zoomBehavior = zoom<SVGSVGElement, unknown>().scaleExtent([0.1, 4]);

    svg.call(
      zoomBehavior.transform,
      zoomIdentity.translate(transform.x, transform.y).scale(transform.k)
    );
  }, [transform.x, transform.y, transform.k]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="cursor-grab active:cursor-grabbing"
      style={{ background: "hsl(var(--background))" }}
    >
      <g
        ref={gRef}
        transform={`translate(${transform.x}, ${transform.y}) scale(${transform.k})`}
      >
        {/* Links layer */}
        <g className="links">
          {links.map((link, i) => (
            <TreeLink
              key={`link-${link.source.data.id}-${link.target.data.id}`}
              sourceX={link.source.x}
              sourceY={link.source.y}
              targetX={link.target.x}
              targetY={link.target.y}
            />
          ))}
        </g>

        {/* Nodes layer */}
        <g className="nodes">
          {nodes.map((node) => {
            const code = node.data.type === "competency"
              ? node.data.id.replace("c-", "")
              : undefined;

            return (
              <TreeNode
                key={node.data.id}
                node={node.data}
                x={node.x}
                y={node.y}
                isSelected={code ? selectedCodes.includes(code) : false}
                onClick={() => onNodeClick(node.data.id)}
                onSelect={
                  node.data.type === "competency" && onCompetencySelect
                    ? () => onCompetencySelect(code!)
                    : undefined
                }
              />
            );
          })}
        </g>
      </g>
    </svg>
  );
}
