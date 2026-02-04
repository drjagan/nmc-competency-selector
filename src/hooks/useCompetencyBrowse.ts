"use client";

import { useState, useCallback, useEffect } from "react";
import type { Subject, Topic, CompetencyWithDetails } from "@/types";

interface UseCompetencyBrowseOptions {
  version?: string;
}

interface UseCompetencyBrowseReturn {
  subjects: Subject[];
  topics: Topic[];
  competencies: CompetencyWithDetails[];
  selectedSubject: number | null;
  selectedTopic: number | null;
  selectSubject: (subjectId: number | null) => void;
  selectTopic: (topicId: number | null) => void;
  isLoadingSubjects: boolean;
  isLoadingTopics: boolean;
  isLoadingCompetencies: boolean;
  error: Error | null;
}

export function useCompetencyBrowse(
  options: UseCompetencyBrowseOptions = {}
): UseCompetencyBrowseReturn {
  const { version } = options;

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [competencies, setCompetencies] = useState<CompetencyWithDetails[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<number | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isLoadingCompetencies, setIsLoadingCompetencies] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Build URL with optional version parameter
  const buildUrl = useCallback(
    (baseUrl: string) => {
      if (!version) return baseUrl;
      const separator = baseUrl.includes("?") ? "&" : "?";
      return `${baseUrl}${separator}version=${version}`;
    },
    [version]
  );

  // Load subjects on mount or when version changes
  useEffect(() => {
    const loadSubjects = async () => {
      setIsLoadingSubjects(true);
      try {
        const response = await fetch(buildUrl("/api/subjects"));
        if (!response.ok) throw new Error("Failed to load subjects");
        const data = await response.json();
        setSubjects(data);
        // Reset selections when version changes
        setSelectedSubject(null);
        setSelectedTopic(null);
        setTopics([]);
        setCompetencies([]);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load subjects"));
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    loadSubjects();
  }, [buildUrl]);

  // Load topics when subject changes
  useEffect(() => {
    if (!selectedSubject) {
      setTopics([]);
      setCompetencies([]);
      setSelectedTopic(null);
      return;
    }

    const loadTopics = async () => {
      setIsLoadingTopics(true);
      try {
        const response = await fetch(
          buildUrl(`/api/subjects/${selectedSubject}/topics`)
        );
        if (!response.ok) throw new Error("Failed to load topics");
        const data = await response.json();
        setTopics(data);
        setCompetencies([]);
        setSelectedTopic(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load topics"));
      } finally {
        setIsLoadingTopics(false);
      }
    };

    loadTopics();
  }, [selectedSubject, buildUrl]);

  // Load competencies when topic changes
  useEffect(() => {
    if (!selectedTopic) {
      setCompetencies([]);
      return;
    }

    const loadCompetencies = async () => {
      setIsLoadingCompetencies(true);
      try {
        const response = await fetch(
          buildUrl(`/api/topics/${selectedTopic}/competencies`)
        );
        if (!response.ok) throw new Error("Failed to load competencies");
        const data = await response.json();
        setCompetencies(data);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to load competencies"));
      } finally {
        setIsLoadingCompetencies(false);
      }
    };

    loadCompetencies();
  }, [selectedTopic, buildUrl]);

  const selectSubject = useCallback((subjectId: number | null) => {
    setSelectedSubject(subjectId);
    setError(null);
  }, []);

  const selectTopic = useCallback((topicId: number | null) => {
    setSelectedTopic(topicId);
    setError(null);
  }, []);

  return {
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
  };
}
