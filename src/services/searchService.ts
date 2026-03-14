import { getDatabase } from "./database";
import type { CompetencyWithDetails, CompetencyFilters, GroupedSearchResults, Subject } from "@/types";

export class SearchService {
  private version?: string;

  constructor(version?: string) {
    this.version = version;
  }

  private get db() {
    return getDatabase(this.version);
  }

  /**
   * Search competencies using FTS5
   */
  search(query: string, filters?: CompetencyFilters, limit = 50): GroupedSearchResults {
    // Sanitize query
    const sanitized = this.sanitizeQuery(query);

    if (sanitized.length < 2) {
      return { total: 0, query, groups: [] };
    }

    // Build and execute search query
    const results = this.executeSearch(sanitized, filters, limit);

    // Group results by subject
    return this.groupBySubject(results, query);
  }

  /**
   * Execute FTS5 search
   */
  private executeSearch(
    query: string,
    filters?: CompetencyFilters,
    limit = 50
  ): CompetencyWithDetails[] {
    const params: (string | number)[] = [];

    // Build FTS5 match query with prefix matching
    const ftsQuery = query
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `${term}*`)
      .join(" ");

    let sql = `
      SELECT
        c.id,
        c.competency_code,
        c.topic_id,
        c.competency_text,
        c.domain,
        c.competency_level,
        c.is_core,
        c.teaching_methods,
        c.assessment_methods,
        c.integrations,
        c.created_at,
        c.updated_at,
        c.deleted_at,
        t.name AS topic_name,
        s.code AS subject_code,
        s.name AS subject_name
      FROM competencies_fts fts
      JOIN competencies c ON fts.rowid = c.id
      JOIN topics t ON c.topic_id = t.id
      JOIN subjects s ON t.subject_id = s.id
      WHERE competencies_fts MATCH ?
        AND c.deleted_at IS NULL
    `;

    params.push(ftsQuery);

    // Apply filters
    if (filters?.subject) {
      if (Array.isArray(filters.subject)) {
        sql += ` AND s.code IN (${filters.subject.map(() => "?").join(",")})`;
        params.push(...filters.subject);
      } else {
        sql += ` AND s.code = ?`;
        params.push(filters.subject);
      }
    }

    // Domain: use LIKE to match multi-domain values (K/S, K/S/A, etc.)
    if (filters?.domain) {
      const domains = Array.isArray(filters.domain) ? filters.domain : [filters.domain];
      if (domains.length > 0) {
        const domainClauses = domains.map(() => "c.domain LIKE ?");
        sql += ` AND (${domainClauses.join(" OR ")})`;
        for (const d of domains) {
          params.push(`%${d}%`);
        }
      }
    }

    // Level: OR logic
    if (filters?.level && filters.level.length > 0) {
      const levelClauses = filters.level.map(() => "c.competency_level LIKE ?");
      sql += ` AND (${levelClauses.join(" OR ")})`;
      for (const l of filters.level) {
        params.push(`%${l}%`);
      }
    }

    if (filters?.coreOnly) {
      sql += ` AND c.is_core = 1`;
    }

    // Teaching method: AND logic
    if (filters?.teachingMethod && filters.teachingMethod.length > 0) {
      for (const method of filters.teachingMethod) {
        sql += ` AND c.teaching_methods LIKE ?`;
        params.push(`%${method}%`);
      }
    }

    // Assessment method: AND logic
    if (filters?.assessmentMethod && filters.assessmentMethod.length > 0) {
      for (const method of filters.assessmentMethod) {
        sql += ` AND c.assessment_methods LIKE ?`;
        params.push(`%${method}%`);
      }
    }

    // Order by relevance (FTS5 rank)
    sql += ` ORDER BY rank LIMIT ?`;
    params.push(limit);

    return this.db.prepare(sql).all(...params) as CompetencyWithDetails[];
  }

  /**
   * Group search results by subject
   */
  private groupBySubject(
    results: CompetencyWithDetails[],
    query: string
  ): GroupedSearchResults {
    const groups = new Map<
      string,
      { subject: Subject; competencies: CompetencyWithDetails[] }
    >();

    for (const result of results) {
      const key = result.subject_code;

      if (!groups.has(key)) {
        groups.set(key, {
          subject: {
            id: 0, // We don't have the ID in this query
            code: result.subject_code,
            name: result.subject_name,
            display_order: 0,
          },
          competencies: [],
        });
      }

      groups.get(key)!.competencies.push(result);
    }

    return {
      query,
      total: results.length,
      groups: Array.from(groups.values()),
    };
  }

  /**
   * Sanitize search query for FTS5
   */
  private sanitizeQuery(query: string): string {
    return query
      .trim()
      .replace(/[^\w\s]/g, " ") // Remove special chars except alphanumeric and spaces
      .replace(/\s+/g, " "); // Normalize whitespace
  }

  /**
   * Get autocomplete suggestions
   */
  getSuggestions(query: string, limit = 10): string[] {
    if (query.length < 2) return [];

    const sanitized = this.sanitizeQuery(query);
    const ftsQuery = `${sanitized}*`;

    const sql = `
      SELECT DISTINCT competency_code
      FROM competencies_fts
      WHERE competencies_fts MATCH ?
      LIMIT ?
    `;

    const results = this.db.prepare(sql).all(ftsQuery, limit) as {
      competency_code: string;
    }[];

    return results.map((r) => r.competency_code);
  }
}

/**
 * Factory function to get a version-aware search service
 * @param version - Curriculum version (e.g., "2019", "2024")
 */
export function getSearchService(version?: string): SearchService {
  return new SearchService(version);
}

// Default singleton for backward compatibility
export const searchService = new SearchService();
