"use client";

import { ZoomIn, ZoomOut, RotateCcw, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface TreeControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onReset: () => void;
  onFitToScreen?: () => void;
  onFullscreenToggle?: () => void;
  isFullscreen?: boolean;
}

export function TreeControls({
  onZoomIn,
  onZoomOut,
  onReset,
  onFitToScreen,
  onFullscreenToggle,
  isFullscreen,
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
      {onFullscreenToggle && (
        <Button
          size="icon"
          variant="outline"
          onClick={onFullscreenToggle}
          title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          className="bg-background/80 backdrop-blur-sm"
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
