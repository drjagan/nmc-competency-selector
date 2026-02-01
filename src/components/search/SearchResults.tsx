"use client";

import { AlertCircle, Check } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import type { CompetencyWithDetails, CompetencyTag, GroupedSearchResults } from "@/types";
import { cn, truncate } from "@/lib/utils";

interface SearchResultsProps {
  groupedResults: GroupedSearchResults | null;
  isLoading: boolean;
  error: Error | null;
  query: string;
  selectedCodes?: string[];
  onSelect: (tag: CompetencyTag) => void;
}

export function SearchResults({
  groupedResults,
  isLoading,
  error,
  query,
  selectedCodes = [],
  onSelect,
}: SearchResultsProps) {
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

  if (error) {
    return (
      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-4 text-sm shadow-md">
        <div className="flex items-center gap-2 text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>{error.message}</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-4 text-sm shadow-md">
        <p className="text-muted-foreground">Searching...</p>
      </div>
    );
  }

  if (query.length < 2) {
    return (
      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-4 text-sm shadow-md">
        <p className="text-muted-foreground">Type at least 2 characters to search</p>
      </div>
    );
  }

  if (!groupedResults || groupedResults.total === 0) {
    return (
      <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-4 text-sm shadow-md">
        <p className="text-muted-foreground">No competencies found for &quot;{query}&quot;</p>
      </div>
    );
  }

  return (
    <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md">
      <ScrollArea className="max-h-96">
        {groupedResults.groups.map((group) => (
          <div key={group.subject.code} className="border-b last:border-b-0">
            <div className="sticky top-0 bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide">
              {group.subject.name} ({group.competencies.length})
            </div>
            <div className="divide-y">
              {group.competencies.map((comp) => {
                const isSelected = selectedCodes.includes(comp.competency_code);
                return (
                  <button
                    key={comp.id}
                    onClick={() => handleSelect(comp)}
                    disabled={isSelected}
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground focus:outline-none",
                      isSelected && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {comp.competency_code}
                        </span>
                        {comp.is_core && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            Core
                          </Badge>
                        )}
                        {isSelected && (
                          <Check className="h-3 w-3 text-primary" />
                        )}
                      </div>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {truncate(comp.competency_text, 150)}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1 text-xs text-muted-foreground">
                      <span className="rounded bg-muted px-1.5 py-0.5">{comp.domain}</span>
                      <span className="rounded bg-muted px-1.5 py-0.5">{comp.topic_name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        <div className="bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
          {groupedResults.total} result{groupedResults.total !== 1 && "s"}
        </div>
      </ScrollArea>
    </div>
  );
}
