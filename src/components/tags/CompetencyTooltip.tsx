"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CompetencyBadges, MethodPills } from "@/components/competency/CompetencyBadges";
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
              <CompetencyBadges
                domain={tag.domain}
                level={tag.level}
                isCore={tag.isCore}
                compact
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {tag.subjectName} &bull; {tag.topicName}
            </div>
          </div>

          {/* Competency Text */}
          <p className="text-sm leading-relaxed">{tag.text}</p>

          {/* Teaching Methods */}
          {tag.teachingMethods && (
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Teaching
              </span>
              <MethodPills methods={tag.teachingMethods} type="teaching" />
            </div>
          )}

          {/* Assessment Methods */}
          {tag.assessmentMethods && (
            <div className="space-y-1">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Assessment
              </span>
              <MethodPills methods={tag.assessmentMethods} type="assessment" />
            </div>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
