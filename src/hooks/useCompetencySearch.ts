"use client";

import { useState, useCallback, useEffect } from "react";
import { useDebounce } from "./useDebounce";
import type { CompetencyWithDetails, CompetencyFilters, GroupedSearchResults } from "@/types";

interface UseCompetencySearchOptions {
  filters?: CompetencyFilters;
  debounceMs?: number;
  minQueryLength?: number;
  enabled?: boolean;
}

interface UseCompetencySearchReturn {
  results: CompetencyWithDetails[];
  groupedResults: GroupedSearchResults | null;
  isLoading: boolean;
  error: Error | null;
  search: (query: string) => void;
  clear: () => void;
  query: string;
}

export function useCompetencySearch(
  options: UseCompetencySearchOptions = {}
): UseCompetencySearchReturn {
  const {
    filters,
    debounceMs = 300,
    minQueryLength = 2,
    enabled = true,
  } = options;

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CompetencyWithDetails[]>([]);
  const [groupedResults, setGroupedResults] = useState<GroupedSearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const debouncedQuery = useDebounce(query, debounceMs);

  // Perform search
  useEffect(() => {
    if (!enabled) return;
    if (!debouncedQuery || debouncedQuery.length < minQueryLength) {
      setResults([]);
      setGroupedResults(null);
      setIsLoading(false);
      return;
    }

    const performSearch = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/competencies/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query: debouncedQuery,
            filters,
            limit: 50,
          }),
        });

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data: GroupedSearchResults = await response.json();
        // Extract flat results from grouped data
        const flatResults = data.groups.flatMap(g => g.competencies);
        setResults(flatResults);
        setGroupedResults(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Search failed"));
        setResults([]);
        setGroupedResults(null);
      } finally {
        setIsLoading(false);
      }
    };

    performSearch();
  }, [debouncedQuery, filters, minQueryLength, enabled]);

  const search = useCallback((newQuery: string) => {
    setQuery(newQuery);
  }, []);

  const clear = useCallback(() => {
    setQuery("");
    setResults([]);
    setGroupedResults(null);
    setError(null);
  }, []);

  return {
    results,
    groupedResults,
    isLoading,
    error,
    search,
    clear,
    query,
  };
}
