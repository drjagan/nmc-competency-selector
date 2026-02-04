"use client";

import { useState, useRef } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
  version?: string;
}

export function SearchInterface({
  filters,
  onSelect,
  selectedCodes = [],
  className,
  placeholder = "Search competencies...",
  version,
}: SearchInterfaceProps) {
  const [inputValue, setInputValue] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const { groupedResults, isLoading, error, search, clear } = useCompetencySearch({
    filters,
    version,
  });

  const handleInputChange = (value: string) => {
    setInputValue(value);
    // Auto-search as user types (debounced in hook)
    search(value);
    // Reset submitted state when user continues typing
    if (isSubmitted && value.length < 2) {
      setIsSubmitted(false);
    }
  };

  const handleSearch = () => {
    if (inputValue.length >= 2) {
      search(inputValue);
      setIsSubmitted(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSearch();
    }
  };

  const handleSelect = (tag: CompetencyTag) => {
    onSelect(tag);
    // Don't clear the search - keep results visible for multi-select
  };

  const handleClear = () => {
    setInputValue("");
    clear();
    setIsSubmitted(false);
  };

  // Show results when submitted OR when typing (with min 2 chars)
  const showResults = isSubmitted || inputValue.length >= 2;

  return (
    <div ref={containerRef} className={cn("w-full", className)}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="pl-9 pr-9"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button
          onClick={handleSearch}
          disabled={inputValue.length < 2 || isLoading}
          variant="default"
        >
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
        {isSubmitted && (
          <Button
            onClick={handleClear}
            variant="outline"
          >
            Clear
          </Button>
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
          persistent={isSubmitted}
        />
      )}
    </div>
  );
}
