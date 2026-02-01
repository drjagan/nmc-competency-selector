// Main component exports
export { CompetencySelector } from "./components/CompetencySelector";
export { default as CompetencySelectorDefault } from "./components/CompetencySelector";

// Sub-components for custom implementations
export { SearchInterface } from "./components/search/SearchInterface";
export { SearchResults } from "./components/search/SearchResults";
export { BrowseInterface } from "./components/browse/BrowseInterface";
export { SubjectDropdown } from "./components/browse/SubjectDropdown";
export { TopicDropdown } from "./components/browse/TopicDropdown";
export { CompetencyList } from "./components/browse/CompetencyList";
export { TagDisplay } from "./components/tags/TagDisplay";
export { CompetencyTooltip } from "./components/tags/CompetencyTooltip";

// Hooks
export { useDebounce } from "./hooks/useDebounce";
export { useCompetencySearch } from "./hooks/useCompetencySearch";
export { useCompetencyBrowse } from "./hooks/useCompetencyBrowse";
export { useTagManagement } from "./hooks/useTagManagement";

// Types
export type {
  Subject,
  Topic,
  Competency,
  CompetencyWithDetails,
  CompetencyTag,
  CompetencySelectorProps,
  CompetencyFilters,
  SearchResult,
  GroupedSearchResults,
  ImportResult,
  ImportRow,
  CompetencyInput,
  CompetencyUpdateInput,
  PaginatedResult,
  SelectOption,
  ApiResponse,
} from "./types";

// Services (for advanced usage)
export { competencyService } from "./services/competencyService";
export { searchService } from "./services/searchService";
export { importService } from "./services/importService";

// Database utilities
export { getDatabase, closeDatabase } from "./services/database";
export { initializeDatabase, rebuildFTS5Index } from "./services/migrations";

// Utilities
export { cn, truncate, formatCompetencyCode } from "./lib/utils";
