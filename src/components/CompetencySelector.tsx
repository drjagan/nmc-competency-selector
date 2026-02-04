"use client";

import { useState, useCallback, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SearchInterface } from "./search/SearchInterface";
import { BrowseInterface } from "./browse/BrowseInterface";
import { TreeGraphViewer } from "./tree/TreeGraphViewer";
import { TagDisplay } from "./tags/TagDisplay";
import { VersionSelector } from "./version/VersionSelector";
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
  version: initialVersion,
  onVersionChange,
}: CompetencySelectorProps) {
  const [activeTab, setActiveTab] = useState<"search" | "browse" | "tree">("search");
  const [version, setVersion] = useState<string>(initialVersion || "");

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

  // Handle version change - clear selections when version changes
  const handleVersionChange = useCallback(
    (newVersion: string) => {
      if (newVersion !== version) {
        setVersion(newVersion);
        clearTags(); // Clear selections when version changes
        onVersionChange?.(newVersion);
      }
    },
    [version, clearTags, onVersionChange]
  );

  // Sync with external version prop
  useEffect(() => {
    if (initialVersion && initialVersion !== version) {
      setVersion(initialVersion);
    }
  }, [initialVersion, version]);

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
      {/* Version Selector - automatically hidden when only one version active */}
      {!readOnly && (
        <VersionSelector
          value={version}
          onChange={handleVersionChange}
          disabled={readOnly}
        />
      )}

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
          onValueChange={(v) => setActiveTab(v as "search" | "browse" | "tree")}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="search">Search</TabsTrigger>
            <TabsTrigger value="browse">Browse</TabsTrigger>
            <TabsTrigger value="tree">Tree View</TabsTrigger>
          </TabsList>

          <TabsContent value="search" className="mt-4">
            <SearchInterface
              filters={filters}
              onSelect={handleTagSelect}
              selectedCodes={selectedCodes}
              placeholder={placeholder}
              version={version}
            />
          </TabsContent>

          <TabsContent value="browse" className="mt-4">
            <BrowseInterface
              filters={filters}
              onSelect={handleTagSelect}
              selectedCodes={selectedCodes}
              version={version}
            />
          </TabsContent>

          <TabsContent value="tree" className="mt-4">
            <TreeGraphViewer
              filters={filters}
              onSelect={handleTagSelect}
              selectedCodes={selectedCodes}
              height={500}
              version={version}
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
