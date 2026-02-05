"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { useTreeGraph } from "@/hooks/useTreeGraph";
import { TreeCanvas } from "./TreeCanvas";
import { TreeControls } from "./TreeControls";
import type { CompetencyTag, CompetencyFilters } from "@/types";
import { cn } from "@/lib/utils";

interface TreeGraphViewerProps {
  onSelect?: (tag: CompetencyTag) => void;
  selectedCodes?: string[];
  filters?: CompetencyFilters;
  height?: number;
  className?: string;
  version?: string;
}

export function TreeGraphViewer({
  onSelect,
  selectedCodes = [],
  filters,
  height = 500,
  className,
  version,
}: TreeGraphViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height });
  const [isFullscreen, setIsFullscreen] = useState(false);

  const {
    treeData,
    isLoading,
    transform,
    toggleNode,
    toggleSelection,
    setTransform,
    resetView,
  } = useTreeGraph({
    selectedCodes,
    onSelect,
    version,
  });

  // Responsive container sizing
  useEffect(() => {
    if (!containerRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        setDimensions({
          width: entry.contentRect.width,
          height: isFullscreen ? entry.contentRect.height : height,
        });
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [height, isFullscreen]);

  // Fullscreen toggle handler
  const handleFullscreenToggle = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await containerRef.current?.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Fullscreen error:", error);
    }
  }, []);

  // Listen for fullscreen changes (including ESC key exit)
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);

      // Update dimensions for fullscreen and re-center the tree
      if (isNowFullscreen && containerRef.current) {
        const newWidth = window.innerWidth;
        const newHeight = window.innerHeight;
        setDimensions({
          width: newWidth,
          height: newHeight,
        });
        // Re-center the tree with a small delay to ensure dimensions are applied
        setTimeout(() => {
          resetView(newWidth, newHeight);
        }, 50);
      } else if (!isNowFullscreen) {
        // Exiting fullscreen - reset to default centered position
        setTimeout(() => {
          resetView();
        }, 50);
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [resetView]);

  const handleZoomIn = () => {
    setTransform({
      ...transform,
      k: Math.min(transform.k * 1.3, 4),
    });
  };

  const handleZoomOut = () => {
    setTransform({
      ...transform,
      k: Math.max(transform.k / 1.3, 0.1),
    });
  };

  if (isLoading) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "relative flex items-center justify-center border rounded-lg bg-background",
          className
        )}
        style={{ height }}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span>Loading competency tree...</span>
        </div>
      </div>
    );
  }

  if (!treeData) {
    return (
      <div
        ref={containerRef}
        className={cn(
          "relative flex items-center justify-center border rounded-lg bg-background",
          className
        )}
        style={{ height }}
      >
        <div className="text-muted-foreground">
          Failed to load competency tree
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative overflow-hidden bg-background",
        isFullscreen ? "rounded-none border-none" : "border rounded-lg",
        className
      )}
      style={{ height: isFullscreen ? "100vh" : height }}
    >
      <TreeControls
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={resetView}
        onFullscreenToggle={handleFullscreenToggle}
        isFullscreen={isFullscreen}
      />

      <TreeCanvas
        data={treeData}
        width={dimensions.width}
        height={dimensions.height}
        transform={transform}
        onTransformChange={setTransform}
        onNodeClick={toggleNode}
        onCompetencySelect={toggleSelection}
        selectedCodes={selectedCodes}
      />

      {/* Legend */}
      <div className="absolute bottom-4 left-4 flex items-center gap-4 text-xs text-muted-foreground bg-background/80 backdrop-blur-sm rounded-md px-3 py-2 border">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-primary" />
          <span>Subject</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-secondary border" />
          <span>Topic</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-muted border" />
          <span>Competency</span>
        </div>
        <div className="border-l pl-4 ml-2">
          Click to expand • Scroll to zoom • Drag to pan
        </div>
      </div>
    </div>
  );
}
