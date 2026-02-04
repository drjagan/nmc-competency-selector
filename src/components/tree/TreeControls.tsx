"use client";

import { ZoomIn, ZoomOut, RotateCcw, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TreeControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFitToScreen?: () => void;
}

export function TreeControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onFitToScreen,
}: TreeControlsProps) {
  return (
    <div className="absolute top-4 right-4 flex flex-col gap-1 z-10">
      <Button
        size="icon"
        variant="outline"
        onClick={onZoomIn}
        title="Zoom In"
        className="bg-background/80 backdrop-blur-sm"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={onZoomOut}
        title="Zoom Out"
        className="bg-background/80 backdrop-blur-sm"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        onClick={onReset}
        title="Reset View"
        className="bg-background/80 backdrop-blur-sm"
      >
        <RotateCcw className="h-4 w-4" />
      </Button>
      {onFitToScreen && (
        <Button
          size="icon"
          variant="outline"
          onClick={onFitToScreen}
          title="Fit to Screen"
          className="bg-background/80 backdrop-blur-sm"
        >
          <Maximize2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
