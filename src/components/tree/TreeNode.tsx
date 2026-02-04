"use client";

import { Plus, Minus, Loader2, Check } from "lucide-react";
import type { TreeNode as TreeNodeType } from "@/types/tree";
import { cn } from "@/lib/utils";

interface TreeNodeProps {
  node: TreeNodeType;
  x: number;
  y: number;
  isSelected?: boolean;
  onClick: () => void;
  onSelect?: () => void;
}

const nodeStyles = {
  root: { fill: "hsl(var(--primary))", radius: 24, textColor: "hsl(var(--primary-foreground))" },
  subject: { fill: "hsl(var(--primary))", radius: 18, textColor: "hsl(var(--primary-foreground))" },
  topic: { fill: "hsl(var(--secondary))", radius: 14, textColor: "hsl(var(--secondary-foreground))" },
  competency: { fill: "hsl(var(--muted))", radius: 10, textColor: "hsl(var(--muted-foreground))" },
};

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}

export function TreeNode({
  node,
  x,
  y,
  isSelected = false,
  onClick,
  onSelect,
}: TreeNodeProps) {
  const style = nodeStyles[node.type];
  const isLeaf = node.type === "competency";
  const hasChildren = node.children && node.children.length > 0;
  const canExpand = !isLeaf && (hasChildren || node.childCount && node.childCount > 0);

  // Determine fill color for competency nodes
  const fillColor = node.type === "competency" && isSelected
    ? "hsl(var(--primary))"
    : style.fill;

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLeaf && onSelect) {
      onSelect();
    } else {
      onClick();
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSelect) {
      onSelect();
    }
  };

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={cn(
        "tree-node cursor-pointer",
        node.loading && "opacity-70"
      )}
      onClick={handleClick}
    >
      {/* Node circle */}
      <circle
        r={style.radius}
        fill={fillColor}
        stroke={isSelected ? "hsl(var(--primary))" : "hsl(var(--border))"}
        strokeWidth={isSelected ? 3 : 1.5}
        className="transition-all duration-200"
      />

      {/* Loading spinner */}
      {node.loading && (
        <g className="animate-spin origin-center">
          <circle
            r={style.radius + 4}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth={2}
            strokeDasharray="10 5"
          />
        </g>
      )}

      {/* Expand/collapse icon for non-leaf nodes */}
      {canExpand && !node.loading && (
        <g>
          {node.expanded ? (
            <Minus
              x={-6}
              y={-6}
              width={12}
              height={12}
              className="text-primary-foreground"
              style={{ color: style.textColor }}
            />
          ) : (
            <Plus
              x={-6}
              y={-6}
              width={12}
              height={12}
              className="text-primary-foreground"
              style={{ color: style.textColor }}
            />
          )}
        </g>
      )}

      {/* Selected check for competency nodes */}
      {isLeaf && isSelected && (
        <Check
          x={-5}
          y={-5}
          width={10}
          height={10}
          strokeWidth={3}
          className="text-primary-foreground"
        />
      )}

      {/* Checkbox for competency nodes */}
      {isLeaf && onSelect && (
        <g
          transform={`translate(${style.radius + 5}, -8)`}
          onClick={handleCheckboxClick}
          className="cursor-pointer"
        >
          <rect
            x={0}
            y={0}
            width={16}
            height={16}
            rx={3}
            fill={isSelected ? "hsl(var(--primary))" : "hsl(var(--background))"}
            stroke="hsl(var(--border))"
            strokeWidth={1.5}
            className="transition-colors duration-200"
          />
          {isSelected && (
            <Check
              x={2}
              y={2}
              width={12}
              height={12}
              strokeWidth={2.5}
              className="text-primary-foreground"
            />
          )}
        </g>
      )}

      {/* Node label */}
      <text
        x={style.radius + (isLeaf ? 28 : 10)}
        y={0}
        dominantBaseline="central"
        fontSize={node.type === "competency" ? 11 : node.type === "topic" ? 12 : 13}
        fontWeight={node.type === "subject" || node.type === "root" ? 600 : 400}
        fill="hsl(var(--foreground))"
        className="pointer-events-none select-none"
      >
        {truncateText(node.name, node.type === "competency" ? 60 : 35)}
        {node.childCount !== undefined && !isLeaf && (
          <tspan
            fill="hsl(var(--muted-foreground))"
            fontSize={10}
            dx={4}
          >
            ({node.childCount})
          </tspan>
        )}
      </text>
    </g>
  );
}
