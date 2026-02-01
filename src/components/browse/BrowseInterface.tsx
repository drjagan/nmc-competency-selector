"use client";

import { Loader2 } from "lucide-react";
import { useCompetencyBrowse } from "@/hooks/useCompetencyBrowse";
import { SubjectDropdown } from "./SubjectDropdown";
import { TopicDropdown } from "./TopicDropdown";
import { CompetencyList } from "./CompetencyList";
import type { CompetencyFilters, CompetencyTag, CompetencyWithDetails } from "@/types";

interface BrowseInterfaceProps {
  filters?: CompetencyFilters;
  onSelect: (tag: CompetencyTag) => void;
  selectedCodes?: string[];
  maxHeight?: number;
}

export function BrowseInterface({
  filters,
  onSelect,
  selectedCodes = [],
  maxHeight = 400,
}: BrowseInterfaceProps) {
  const {
    subjects,
    topics,
    competencies,
    selectedSubject,
    selectedTopic,
    selectSubject,
    selectTopic,
    isLoadingSubjects,
    isLoadingTopics,
    isLoadingCompetencies,
    error,
  } = useCompetencyBrowse();

  // Filter subjects if filterBySubject is provided
  const filteredSubjects = filters?.subject
    ? subjects.filter((s) =>
        Array.isArray(filters.subject)
          ? filters.subject.includes(s.code)
          : s.code === filters.subject
      )
    : subjects;

  const handleCompetencySelect = (comp: CompetencyWithDetails) => {
    const tag: CompetencyTag = {
      value: comp.competency_code,
      code: comp.competency_code,
      text: comp.competency_text,
      subjectCode: comp.subject_code,
      subjectName: comp.subject_name,
      topicName: comp.topic_name,
      domain: comp.domain || undefined,
      level: comp.competency_level || undefined,
      isCore: Boolean(comp.is_core),
      teachingMethods: comp.teaching_methods || undefined,
      assessmentMethods: comp.assessment_methods || undefined,
      integrations: comp.integrations || undefined,
    };
    onSelect(tag);
  };

  if (error) {
    return (
      <div className="rounded-md border border-destructive p-4 text-sm text-destructive">
        {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Subject Dropdown */}
      <SubjectDropdown
        subjects={filteredSubjects}
        selectedSubject={selectedSubject}
        onSelect={selectSubject}
        disabled={isLoadingSubjects}
        isLoading={isLoadingSubjects}
      />

      {/* Topic Dropdown */}
      {selectedSubject && (
        <TopicDropdown
          topics={topics}
          selectedTopic={selectedTopic}
          onSelect={selectTopic}
          disabled={isLoadingTopics}
          isLoading={isLoadingTopics}
        />
      )}

      {/* Loading State */}
      {isLoadingCompetencies && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Competency List */}
      {!isLoadingCompetencies && selectedTopic && competencies.length > 0 && (
        <CompetencyList
          competencies={competencies}
          selectedCodes={selectedCodes}
          onSelect={handleCompetencySelect}
          maxHeight={maxHeight}
        />
      )}

      {/* Empty State */}
      {!isLoadingCompetencies && selectedTopic && competencies.length === 0 && (
        <div className="rounded-md border p-8 text-center text-sm text-muted-foreground">
          No competencies found for this topic
        </div>
      )}
    </div>
  );
}
