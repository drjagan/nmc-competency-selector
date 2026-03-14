"use client";

import { MethodPills } from "./CompetencyBadges";
import { cn } from "@/lib/utils";

interface CompetencyDetailsProps {
  teachingMethods?: string;
  assessmentMethods?: string;
  topicName?: string;
  className?: string;
}

export function CompetencyDetails({
  teachingMethods,
  assessmentMethods,
  topicName,
  className,
}: CompetencyDetailsProps) {
  const hasContent = teachingMethods || assessmentMethods || topicName;
  if (!hasContent) return null;

  return (
    <div
      className={cn(
        "mt-2 pt-2 border-t border-dashed space-y-2 text-xs",
        className
      )}
    >
      {teachingMethods && (
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground font-medium shrink-0 w-20">Teaching:</span>
          <MethodPills methods={teachingMethods} type="teaching" />
        </div>
      )}
      {assessmentMethods && (
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground font-medium shrink-0 w-20">Assessment:</span>
          <MethodPills methods={assessmentMethods} type="assessment" />
        </div>
      )}
      {topicName && (
        <div className="flex items-start gap-2">
          <span className="text-muted-foreground font-medium shrink-0 w-20">Topic:</span>
          <span className="text-muted-foreground">{topicName}</span>
        </div>
      )}
    </div>
  );
}
