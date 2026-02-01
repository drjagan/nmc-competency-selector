"use client";

import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CompetencyTooltip } from "./CompetencyTooltip";
import type { CompetencyTag } from "@/types";
import { cn } from "@/lib/utils";

interface TagDisplayProps {
  tags: CompetencyTag[];
  onRemove?: (code: string) => void;
  onClear?: () => void;
  readOnly?: boolean;
  className?: string;
}

export function TagDisplay({
  tags,
  onRemove,
  onClear,
  readOnly = false,
  className,
}: TagDisplayProps) {
  if (tags.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">
          Selected Competencies ({tags.length})
        </span>
        {!readOnly && onClear && tags.length > 1 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClear}
            className="h-auto py-1 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear all
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <CompetencyTooltip key={tag.code} tag={tag}>
            <Badge
              variant="secondary"
              className={cn(
                "py-1.5 px-3 text-sm font-mono cursor-default",
                tag.isCore && "border-primary/50 bg-primary/10",
                !readOnly && "pr-1.5"
              )}
            >
              <span>{tag.code}</span>
              {!readOnly && onRemove && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(tag.code);
                  }}
                  className="ml-2 rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
                  aria-label={`Remove ${tag.code}`}
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </Badge>
          </CompetencyTooltip>
        ))}
      </div>
    </div>
  );
}
