"use client";

import { useState, useCallback } from "react";
import type { CompetencyTag } from "@/types";

interface UseTagManagementOptions {
  value?: CompetencyTag[];
  defaultValue?: CompetencyTag[];
  onChange?: (tags: CompetencyTag[]) => void;
  multiple?: boolean;
  maxTags?: number;
}

interface UseTagManagementReturn {
  tags: CompetencyTag[];
  addTag: (tag: CompetencyTag) => void;
  removeTag: (code: string) => void;
  clearTags: () => void;
  hasTag: (code: string) => boolean;
  tagCount: number;
}

export function useTagManagement(
  options: UseTagManagementOptions = {}
): UseTagManagementReturn {
  const { value, defaultValue = [], onChange, multiple = true, maxTags } = options;

  // Controlled vs uncontrolled
  const isControlled = value !== undefined;
  const [internalTags, setInternalTags] = useState<CompetencyTag[]>(defaultValue);

  const tags = isControlled ? value : internalTags;

  const updateTags = useCallback(
    (newTags: CompetencyTag[]) => {
      if (!isControlled) {
        setInternalTags(newTags);
      }
      onChange?.(newTags);
    },
    [isControlled, onChange]
  );

  const addTag = useCallback(
    (tag: CompetencyTag) => {
      // Check if already exists
      if (tags.some((t) => t.code === tag.code)) {
        return;
      }

      // If not multiple, replace existing
      if (!multiple) {
        updateTags([tag]);
        return;
      }

      // Check max tags limit
      if (maxTags !== undefined && tags.length >= maxTags) {
        return;
      }

      // Add to array
      updateTags([...tags, tag]);
    },
    [tags, multiple, maxTags, updateTags]
  );

  const removeTag = useCallback(
    (code: string) => {
      updateTags(tags.filter((t) => t.code !== code));
    },
    [tags, updateTags]
  );

  const clearTags = useCallback(() => {
    updateTags([]);
  }, [updateTags]);

  const hasTag = useCallback(
    (code: string) => {
      return tags.some((t) => t.code === code);
    },
    [tags]
  );

  return {
    tags,
    addTag,
    removeTag,
    clearTags,
    hasTag,
    tagCount: tags.length,
  };
}
