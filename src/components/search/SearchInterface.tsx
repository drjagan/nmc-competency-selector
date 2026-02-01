"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { SearchResults } from "./SearchResults";
import { useCompetencySearch } from "@/hooks/useCompetencySearch";
import type { CompetencyFilters, CompetencyTag } from "@/types";
import { cn } from "@/lib/utils";

interface SearchInterfaceProps {
  filters?: CompetencyFilters;
  onSelect: (tag: CompetencyTag) => void;
  selectedCodes?: string[];
  className?: string;
  placeholder?: string;
}

export function SearchInterface({
  filters,
  onSelect,
  selectedCodes = [],
  className,
  placeholder = "Search competencies...",
}: SearchInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { results, groupedResults, isLoading, error, search, clear } = useCompetencySearch({
    filters,
  });

  const handleInputChange = (value: string) => {
    setInputValue(value);
    search(value);
    setShowResults(value.length >= 2);
  };

  const handleSelect = (tag: CompetencyTag) => {
    onSelect(tag);
    setInputValue("");
    clear();
    setShowResults(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => inputValue.length >= 2 && setShowResults(true)}
          placeholder={placeholder}
          className="pl-9 pr-9"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}
      </div>

      {showResults && (
        <SearchResults
          groupedResults={groupedResults}
          isLoading={isLoading}
          error={error}
          query={inputValue}
          selectedCodes={selectedCodes}
          onSelect={handleSelect}
        />
      )}
    </div>
  );
}
