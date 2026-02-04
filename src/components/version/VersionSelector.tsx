"use client";

import { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { CurriculumVersion } from "@/types";

interface VersionSelectorProps {
  value: string;
  onChange: (version: string) => void;
  disabled?: boolean;
}

interface VersionsResponse {
  versions: CurriculumVersion[];
  defaultVersion: string;
  showSelector: boolean;
}

export function VersionSelector({
  value,
  onChange,
  disabled = false,
}: VersionSelectorProps) {
  const [versions, setVersions] = useState<CurriculumVersion[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadVersions() {
      try {
        const response = await fetch("/api/versions");
        const data: VersionsResponse = await response.json();
        setVersions(data.versions);
        setShowSelector(data.showSelector);

        // If no value provided, set to default
        if (!value && data.defaultVersion) {
          onChange(data.defaultVersion);
        }
      } catch (error) {
        console.error("Failed to load versions:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadVersions();
  }, [value, onChange]);

  // Don't render if loading, no versions, or only one active version
  if (isLoading || !showSelector || versions.length === 0) {
    return null;
  }

  const activeVersions = versions.filter((v) => v.isActive);

  return (
    <div className="flex items-center gap-4 py-2 px-1">
      <span className="text-sm font-medium text-muted-foreground">
        Curriculum Version:
      </span>
      <RadioGroup
        value={value}
        onValueChange={onChange}
        disabled={disabled}
        className="flex items-center gap-4"
      >
        {activeVersions.map((version) => (
          <div key={version.id} className="flex items-center space-x-2">
            <RadioGroupItem value={version.id} id={`version-${version.id}`} />
            <Label
              htmlFor={`version-${version.id}`}
              className="cursor-pointer text-sm font-normal"
            >
              {version.name}
              {version.isDefault && (
                <span className="ml-1 text-xs text-muted-foreground">
                  (Default)
                </span>
              )}
            </Label>
          </div>
        ))}
      </RadioGroup>
    </div>
  );
}
