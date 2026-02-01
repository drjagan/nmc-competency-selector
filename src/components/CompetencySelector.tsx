"use client";

import { useState, useCallback } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchInterface } from "./search/SearchInterface";
import { BrowseInterface } from "./browse/BrowseInterface";
import { TagDisplay } from "./tags/TagDisplay";
import { useTagManagement } from "@/hooks/useTagManagement";
import type {
  CompetencySelectorProps,
  CompetencyTag,
} from "@/types";
import { cn } from "@/lib/utils";

export function CompetencySelector({
  value,
  onChange,
  multiple = true,
  filters,
  placeholder = "Search or browse competencies...",
  maxTags,
  readOnly = false,
  className,
}: CompetencySelectorProps) {
  const [activeTab, setActiveTab] = useState<"search" | "browse">("search");

  const {
    tags,
    addTag,
    removeTag,
    clearTags,
  } = useTagManagement({
    value,
    onChange,
    multiple,
    maxTags,
  });

  const selectedCodes = tags.map((tag) => tag.code);

  const handleTagSelect = useCallback(
    (tag: CompetencyTag) => {
      addTag(tag);
    },
    [addTag]
  );

  const handleTagRemove = useCallback(
    (code: string) => {
      removeTag(code);
    },
    [removeTag]
  );

  return (
    <div className={cn("space-y-4", className)}>
      {/* Tag Display */}
      {tags.length > 0 && (
        <TagDisplay
          tags={tags}
          onRemove={readOnly ? undefined : handleTagRemove}
          onClear={readOnly ? undefined : clearTags}
          readOnly={readOnly}
        />
      )}

      {/* Selection Interface */}
      {!readOnly && (
        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as "search" | "browse")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="browse">Browse</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-4">
            <SearchInterface
              filters={filters}
              onSelect={handleTagSelect}
              selectedCodes={selectedCodes}
              placeholder={placeholder}
            />
          </TabsContent>

          <TabsContent value="browse" className="mt-4">
            <BrowseInterface
              filters={filters}
              onSelect={handleTagSelect}
              selectedCodes={selectedCodes}
            />
          </TabsContent>
        </Tabs>
      )}

      {/* Empty State */}
      {tags.length === 0 && readOnly && (
        <div className="text-center py-8 text-muted-foreground">
          No competencies selected
        </div>
      )}
    </div>
  );
}

export default CompetencySelector;
