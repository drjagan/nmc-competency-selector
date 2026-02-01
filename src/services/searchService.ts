import { getDatabase } from "./database";
import type { CompetencyWithDetails, CompetencyFilters, GroupedSearchResults, Subject } from "@/types";

export class SearchService {
  private db = getDatabase();

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

    if (filters?.domain) {
      if (Array.isArray(filters.domain)) {
        sql += ` AND c.domain IN (${filters.domain.map(() => "?").join(",")})`;
        params.push(...filters.domain);
      } else {
        sql += ` AND c.domain = ?`;
        params.push(filters.domain);
      }
    }

    if (filters?.coreOnly) {
      sql += ` AND c.is_core = 1`;
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

// Export singleton
export const searchService = new SearchService();
