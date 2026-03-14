"use client";

import { useState, useCallback, useMemo } from "react";
import type { CompetencyFilters } from "@/types";

interface UseCompetencyFiltersReturn {
  filters: CompetencyFilters;
  setDomains: (domains: string[]) => void;
  setLevels: (levels: string[]) => void;
  setCoreOnly: (coreOnly: boolean) => void;
  setTeachingMethods: (methods: string[]) => void;
  setAssessmentMethods: (methods: string[]) => void;
  clearAll: () => void;
  activeFilterCount: number;
  hasActiveFilters: boolean;
}

export function useCompetencyFilters(): UseCompetencyFiltersReturn {
  const [domains, setDomains] = useState<string[]>([]);
  const [levels, setLevels] = useState<string[]>([]);
  const [coreOnly, setCoreOnly] = useState(false);
  const [teachingMethods, setTeachingMethods] = useState<string[]>([]);
  const [assessmentMethods, setAssessmentMethods] = useState<string[]>([]);

  const filters = useMemo<CompetencyFilters>(() => {
    const f: CompetencyFilters = {};
    if (domains.length > 0) f.domain = domains;
    if (levels.length > 0) f.level = levels;
    if (coreOnly) f.coreOnly = true;
    if (teachingMethods.length > 0) f.teachingMethod = teachingMethods;
    if (assessmentMethods.length > 0) f.assessmentMethod = assessmentMethods;
    return f;
  }, [domains, levels, coreOnly, teachingMethods, assessmentMethods]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (domains.length > 0) count++;
    if (levels.length > 0) count++;
    if (coreOnly) count++;
    if (teachingMethods.length > 0) count++;
    if (assessmentMethods.length > 0) count++;
    return count;
  }, [domains, levels, coreOnly, teachingMethods, assessmentMethods]);

  const clearAll = useCallback(() => {
    setDomains([]);
    setLevels([]);
    setCoreOnly(false);
    setTeachingMethods([]);
    setAssessmentMethods([]);
  }, []);

  return {
    filters,
    setDomains,
    setLevels,
    setCoreOnly,
    setTeachingMethods,
    setAssessmentMethods,
    clearAll,
    activeFilterCount,
    hasActiveFilters: activeFilterCount > 0,
  };
}
