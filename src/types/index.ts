// Core entity types

export interface Subject {
  id: number;
  code: string;
  name: string;
  display_order: number;
}

export interface Topic {
  id: number;
  subject_id: number;
  name: string;
  display_order: number;
}

export interface Competency {
  id: number;
  competency_code: string;
  topic_id: number;
  competency_text: string;
  domain: string;
  competency_level: string;
  is_core: boolean;
  teaching_methods?: string;
  assessment_methods?: string;
  integrations?: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
}

// Joined type for display
export interface CompetencyWithDetails extends Competency {
  subject_code: string;
  subject_name: string;
  topic_name: string;
}

// Tag format for Tagify
export interface CompetencyTag {
  value?: string; // Competency code (optional, for Tagify compatibility)
  code: string; // Competency code
  text: string; // Full competency text
  subjectCode?: string; // Subject code
  subjectName: string; // Subject full name
  topicName: string; // Topic name
  domain?: string; // K/S/A or combinations
  level?: string; // Bloom's level
  isCore: boolean;
  teachingMethods?: string;
  assessmentMethods?: string;
  integrations?: string;
}

// Component props
export interface CompetencySelectorProps {
  value?: CompetencyTag[];
  defaultValue?: CompetencyTag[];
  onChange?: (value: CompetencyTag[]) => void;
  multiple?: boolean;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  filters?: CompetencyFilters;
  maxTags?: number;
  className?: string;
  maxHeight?: number;
  // Version support
  version?: string;
  showVersionSelector?: boolean;
  onVersionChange?: (version: string) => void;
}

// Search result
export interface SearchResult {
  results: CompetencyWithDetails[];
  total: number;
  query: string;
}

// Search grouped by subject
export interface GroupedSearchResults {
  query: string;
  total: number;
  groups: {
    subject: Subject;
    competencies: CompetencyWithDetails[];
  }[];
}

// Database query filters
export interface CompetencyFilters {
  subject?: string | string[];
  topic?: string;
  domain?: string | string[];
  coreOnly?: boolean;
  searchQuery?: string;
}

// Excel import types
export interface ImportRow {
  competency_code: string;
  topic: string;
  competency: string;
  domain: string;
  level: string;
  core: string | boolean;
  teaching_methods?: string;
  assessment_methods?: string;
  integrations?: string;
}

export interface ImportResult {
  success: boolean;
  inserted: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; error: string }>;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Admin CRUD types
export interface CompetencyInput {
  competency_code: string;
  topic_id: number;
  competency_text: string;
  domain: string;
  competency_level: string;
  is_core: boolean;
  teaching_methods?: string;
  assessment_methods?: string;
  integrations?: string;
}

export interface CompetencyUpdateInput extends Partial<CompetencyInput> {
  id: number;
}

// Pagination
export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Dropdown option for UI
export interface SelectOption {
  value: string;
  label: string;
}

// Curriculum version types
export interface CurriculumVersion {
  id: string;
  name: string;
  dbFile: string;
  isDefault: boolean;
  isActive: boolean;
  releasedAt: string;
  competencyCount: number | null;
  description: string;
}

export interface VersionsConfig {
  versions: CurriculumVersion[];
  defaultVersion: string;
}
