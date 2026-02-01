"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import type { CompetencyTag } from "@/types";

interface CompetencyTooltipProps {
  tag: CompetencyTag;
  children: React.ReactNode;
}

export function CompetencyTooltip({ tag, children }: CompetencyTooltipProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side="top"
          align="start"
          className="max-w-sm p-4 space-y-3"
        >
          {/* Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-mono font-bold text-primary">
                {tag.code}
              </span>
              {tag.isCore && (
                <Badge variant="default" className="text-xs">
                  Core
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground">
              {tag.subjectName} • {tag.topicName}
            </div>
          </div>

          {/* Competency Text */}
          <p className="text-sm leading-relaxed">{tag.text}</p>

          {/* Metadata */}
          <div className="flex flex-wrap gap-2 pt-1">
            {tag.domain && (
              <Badge variant="outline" className="text-xs">
                {tag.domain}
              </Badge>
            )}
            {tag.level && (
              <Badge variant="outline" className="text-xs">
                Level {tag.level}
              </Badge>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
