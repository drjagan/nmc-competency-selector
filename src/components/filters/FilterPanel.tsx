"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { MethodSelect } from "./MethodSelect";
import { cn } from "@/lib/utils";

const DOMAINS = [
  { value: "K", label: "K", description: "Knowledge" },
  { value: "S", label: "S", description: "Skill" },
  { value: "A", label: "A", description: "Attitude" },
];

const LEVELS = [
  { value: "K", label: "K", description: "Know" },
  { value: "KH", label: "KH", description: "Know How" },
  { value: "SH", label: "SH", description: "Show How" },
  { value: "P", label: "P", description: "Perform" },
];

interface FilterPanelProps {
  domains: string[];
  levels: string[];
  coreOnly: boolean;
  teachingMethods: string[];
  assessmentMethods: string[];
  onDomainsChange: (domains: string[]) => void;
  onLevelsChange: (levels: string[]) => void;
  onCoreOnlyChange: (coreOnly: boolean) => void;
  onTeachingMethodsChange: (methods: string[]) => void;
  onAssessmentMethodsChange: (methods: string[]) => void;
  onClearAll: () => void;
  activeFilterCount: number;
  version?: string;
  className?: string;
}

export function FilterPanel({
  domains,
  levels,
  coreOnly,
  teachingMethods,
  assessmentMethods,
  onDomainsChange,
  onLevelsChange,
  onCoreOnlyChange,
  onTeachingMethodsChange,
  onAssessmentMethodsChange,
  onClearAll,
  activeFilterCount,
  version,
  className,
}: FilterPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleDomain = (domain: string) => {
    if (domains.includes(domain)) {
      onDomainsChange(domains.filter((d) => d !== domain));
    } else {
      onDomainsChange([...domains, domain]);
    }
  };

  const toggleLevel = (level: string) => {
    if (levels.includes(level)) {
      onLevelsChange(levels.filter((l) => l !== level));
    } else {
      onLevelsChange([...levels, level]);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* Toggle bar */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="gap-2 text-xs h-8"
        >
          <Filter className="h-3.5 w-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <Badge
              variant="default"
              className="h-4 w-4 p-0 flex items-center justify-center text-[10px] rounded-full"
            >
              {activeFilterCount}
            </Badge>
          )}
        </Button>
        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="text-xs h-8 gap-1 text-muted-foreground"
          >
            <X className="h-3 w-3" />
            Clear
          </Button>
        )}
      </div>

      {/* Filter controls */}
      {isOpen && (
        <div className="rounded-md border p-3 space-y-3 bg-muted/30">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* Domain */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Domain
              </label>
              <div className="flex gap-3">
                {DOMAINS.map((d) => (
                  <label
                    key={d.value}
                    className="flex items-center gap-1.5 cursor-pointer text-xs"
                    title={d.description}
                  >
                    <Checkbox
                      checked={domains.includes(d.value)}
                      onCheckedChange={() => toggleDomain(d.value)}
                      className="h-3.5 w-3.5"
                    />
                    {d.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Level */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Level
              </label>
              <div className="flex gap-3">
                {LEVELS.map((l) => (
                  <label
                    key={l.value}
                    className="flex items-center gap-1.5 cursor-pointer text-xs"
                    title={l.description}
                  >
                    <Checkbox
                      checked={levels.includes(l.value)}
                      onCheckedChange={() => toggleLevel(l.value)}
                      className="h-3.5 w-3.5"
                    />
                    {l.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Core only */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Core
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                <Checkbox
                  checked={coreOnly}
                  onCheckedChange={(checked) => onCoreOnlyChange(checked === true)}
                  className="h-3.5 w-3.5"
                />
                Core competencies only
              </label>
            </div>
          </div>

          {/* Method selects */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Teaching Method
              </label>
              <MethodSelect
                type="teaching"
                selected={teachingMethods}
                onChange={onTeachingMethodsChange}
                version={version}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Assessment Method
              </label>
              <MethodSelect
                type="assessment"
                selected={assessmentMethods}
                onChange={onAssessmentMethodsChange}
                version={version}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
