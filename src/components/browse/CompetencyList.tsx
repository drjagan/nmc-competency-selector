"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CompetencyBadges } from "@/components/competency/CompetencyBadges";
import { CompetencyDetails } from "@/components/competency/CompetencyDetails";
import { cn } from "@/lib/utils";
import type { CompetencyWithDetails } from "@/types";

interface CompetencyListProps {
  competencies: CompetencyWithDetails[];
  selectedCodes: string[];
  onSelect: (competency: CompetencyWithDetails) => void;
  maxHeight?: number;
}

export function CompetencyList({
  competencies,
  selectedCodes,
  onSelect,
  maxHeight = 300,
}: CompetencyListProps) {
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());

  const toggleExpand = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium text-muted-foreground">
        Competencies ({competencies.length})
      </label>
      <ScrollArea
        className="border rounded-md"
        style={{ height: `${maxHeight}px` }}
      >
        <div className="p-2 space-y-1">
          {competencies.map((competency) => {
            const isSelected = selectedCodes.includes(competency.competency_code);
            const isExpanded = expandedIds.has(competency.id);
            return (
              <button
                key={competency.id}
                onClick={() => onSelect(competency)}
                className={cn(
                  "w-full text-left p-3 rounded-md transition-colors",
                  "hover:bg-accent hover:text-accent-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  isSelected && "bg-primary/10 border border-primary/20"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        role="button"
                        tabIndex={-1}
                        onClick={(e) => toggleExpand(competency.id, e)}
                        className="p-0.5 rounded hover:bg-muted-foreground/10 shrink-0"
                        aria-label={isExpanded ? "Collapse details" : "Expand details"}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </span>
                      <span className="font-mono text-sm font-medium text-primary">
                        {competency.competency_code}
                      </span>
                      <CompetencyBadges
                        domain={competency.domain}
                        level={competency.competency_level}
                        isCore={Boolean(competency.is_core)}
                      />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 ml-6">
                      {competency.competency_text}
                    </p>
                    {isExpanded && (
                      <div className="ml-6">
                        <CompetencyDetails
                          teachingMethods={competency.teaching_methods}
                          assessmentMethods={competency.assessment_methods}
                          topicName={competency.topic_name}
                        />
                      </div>
                    )}
                  </div>
                  {isSelected && (
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
