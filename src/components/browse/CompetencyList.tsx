"use client";

import { Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
                      <span className="font-mono text-sm font-medium text-primary">
                        {competency.competency_code}
                      </span>
                      {competency.is_core && (
                        <Badge variant="secondary" className="text-xs">
                          Core
                        </Badge>
                      )}
                      {competency.domain && (
                        <Badge variant="outline" className="text-xs">
                          {competency.domain}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {competency.competency_text}
                    </p>
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
