"use client";

import { useState } from "react";
import { AlertCircle, Check, ChevronDown, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CompetencyBadges } from "@/components/competency/CompetencyBadges";
import { CompetencyDetails } from "@/components/competency/CompetencyDetails";
import type { CompetencyWithDetails, CompetencyTag, GroupedSearchResults } from "@/types";
import { cn, truncate } from "@/lib/utils";

interface SearchResultsProps {
  groupedResults: GroupedSearchResults | null;
  isLoading: boolean;
  error: Error | null;
  query: string;
  selectedCodes?: string[];
  onSelect: (tag: CompetencyTag) => void;
  persistent?: boolean;
}

export function SearchResults({
  groupedResults,
  isLoading,
  error,
  query,
  selectedCodes = [],
  onSelect,
  persistent = false,
}: SearchResultsProps) {
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

  const handleSelect = (comp: CompetencyWithDetails) => {
    const tag: CompetencyTag = {
      value: comp.competency_code,
      code: comp.competency_code,
      text: comp.competency_text,
      subjectCode: comp.subject_code,
      subjectName: comp.subject_name,
      topicName: comp.topic_name,
      domain: comp.domain || undefined,
      level: comp.competency_level || undefined,
      isCore: Boolean(comp.is_core),
      teachingMethods: comp.teaching_methods || undefined,
      assessmentMethods: comp.assessment_methods || undefined,
      integrations: comp.integrations || undefined,
    };
    onSelect(tag);
  };

  const containerClass = persistent
    ? "mt-4 w-full max-w-full rounded-md border bg-popover shadow-md overflow-hidden"
    : "absolute left-0 right-0 z-50 mt-1 rounded-md border bg-popover shadow-md overflow-hidden";

  if (error) {
    return (
      <div className={containerClass}>
        <div className="p-4 text-sm">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4" />
            <span>{error.message}</span>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={containerClass}>
        <div className="p-4 text-sm">
          <p className="text-muted-foreground">Searching...</p>
        </div>
      </div>
    );
  }

  if (query.length < 2) {
    return (
      <div className={containerClass}>
        <div className="p-4 text-sm">
          <p className="text-muted-foreground">Type at least 2 characters to search</p>
        </div>
      </div>
    );
  }

  if (!groupedResults || groupedResults.total === 0) {
    return (
      <div className={containerClass}>
        <div className="p-4 text-sm">
          <p className="text-muted-foreground">No competencies found for &quot;{query}&quot;</p>
        </div>
      </div>
    );
  }

  return (
    <div className={containerClass}>
      <ScrollArea className="h-[400px]">
        <div>
          {groupedResults.groups.map((group) => (
            <div key={group.subject.code} className="border-b last:border-b-0">
              <div className="sticky top-0 z-10 bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide">
                {group.subject.name} ({group.competencies.length})
              </div>
              <div className="divide-y">
                {group.competencies.map((comp) => {
                  const isSelected = selectedCodes.includes(comp.competency_code);
                  const isExpanded = expandedIds.has(comp.id);
                  return (
                    <div
                      key={comp.id}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm transition-colors overflow-hidden",
                        "hover:bg-accent hover:text-accent-foreground",
                        isSelected && "opacity-50"
                      )}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={(e) => toggleExpand(comp.id, e)}
                          className="p-0.5 rounded hover:bg-muted-foreground/10 shrink-0 mt-0.5"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <button
                              onClick={() => !isSelected && handleSelect(comp)}
                              disabled={isSelected}
                              className={cn(
                                "font-mono text-xs font-semibold text-primary",
                                !isSelected && "hover:underline cursor-pointer",
                                isSelected && "cursor-not-allowed"
                              )}
                            >
                              {comp.competency_code}
                            </button>
                            <CompetencyBadges
                              domain={comp.domain}
                              level={comp.competency_level}
                              isCore={Boolean(comp.is_core)}
                              compact
                            />
                            {isSelected && (
                              <Check className="h-3 w-3 text-primary" />
                            )}
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">
                            {truncate(comp.competency_text, 150)}
                          </p>
                          {isExpanded && (
                            <CompetencyDetails
                              teachingMethods={comp.teaching_methods}
                              assessmentMethods={comp.assessment_methods}
                              topicName={comp.topic_name}
                            />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
            {groupedResults.total} result{groupedResults.total !== 1 && "s"}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
