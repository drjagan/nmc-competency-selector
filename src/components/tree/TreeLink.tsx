"use client";

import { linkHorizontal } from "d3-shape";

interface TreeLinkProps {
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
}

export function TreeLink({ sourceX, sourceY, targetX, targetY }: TreeLinkProps) {
  const linkGenerator = linkHorizontal<{ source: [number, number]; target: [number, number] }, [number, number]>()
    .source((d) => d.source)
    .target((d) => d.target)
    .x((d) => d[0])
    .y((d) => d[1]);

  const pathData = linkGenerator({
    source: [sourceX, sourceY],
    target: [targetX, targetY],
  });

  return (
    <path
      d={pathData || ""}
      fill="none"
      stroke="hsl(var(--border))"
      strokeWidth={1.5}
      strokeOpacity={0.6}
      className="tree-link transition-opacity duration-300"
    />
  );
}
