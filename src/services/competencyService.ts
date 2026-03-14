import { getDatabase } from "./database";
import type {
  Subject,
  Topic,
  Competency,
  CompetencyWithDetails,
  CompetencyTag,
  CompetencyFilters,
  CompetencyInput,
  PaginatedResult,
} from "@/types";
import type { TreeSubjectData, TreeTopicData } from "@/types/tree";

export class CompetencyService {
  private version?: string;

  constructor(version?: string) {
    this.version = version;
  }

  private get db() {
    return getDatabase(this.version);
  }

  /**
   * Get all subjects
   */
  getAllSubjects(): Subject[] {
    return this.db
      .prepare("SELECT * FROM subjects ORDER BY display_order, name")
      .all() as Subject[];
  }

  /**
   * Get subject by code
   */
  getSubjectByCode(code: string): Subject | null {
    const result = this.db
      .prepare("SELECT * FROM subjects WHERE code = ?")
      .get(code) as Subject | undefined;
    return result || null;
  }

  /**
   * Get topics by subject ID
   */
  getTopicsBySubject(subjectId: number): Topic[] {
    return this.db
      .prepare(
        "SELECT * FROM topics WHERE subject_id = ? ORDER BY display_order, name"
      )
      .all(subjectId) as Topic[];
  }

  /**
   * Get topics by subject code
   */
  getTopicsBySubjectCode(subjectCode: string): Topic[] {
    return this.db
      .prepare(
        `
        SELECT t.* FROM topics t
        JOIN subjects s ON t.subject_id = s.id
        WHERE s.code = ?
        ORDER BY t.display_order, t.name
      `
      )
      .all(subjectCode) as Topic[];
  }

  /**
   * Get competencies by topic ID, optionally filtered
   */
  getCompetenciesByTopic(topicId: number, filters?: CompetencyFilters): CompetencyWithDetails[] {
    let sql = `
      SELECT
        c.*,
        t.name AS topic_name,
        s.code AS subject_code,
        s.name AS subject_name
      FROM competencies c
      JOIN topics t ON c.topic_id = t.id
      JOIN subjects s ON t.subject_id = s.id
      WHERE c.topic_id = ?
        AND c.deleted_at IS NULL
    `;
    const params: (string | number)[] = [topicId];

    if (filters) {
      sql += this.buildFilterClauses(filters, params);
    }

    sql += ` ORDER BY c.competency_code`;
    return this.db.prepare(sql).all(...params) as CompetencyWithDetails[];
  }

  /**
   * Get competency by code
   */
  getByCode(code: string): CompetencyWithDetails | null {
    const result = this.db
      .prepare(
        `
        SELECT
          c.*,
          t.name AS topic_name,
          s.code AS subject_code,
          s.name AS subject_name
        FROM competencies c
        JOIN topics t ON c.topic_id = t.id
        JOIN subjects s ON t.subject_id = s.id
        WHERE c.competency_code = ?
          AND c.deleted_at IS NULL
      `
      )
      .get(code) as CompetencyWithDetails | undefined;

    return result || null;
  }

  /**
   * Get multiple competencies by codes
   */
  getByCodes(codes: string[]): CompetencyWithDetails[] {
    if (codes.length === 0) return [];

    const placeholders = codes.map(() => "?").join(",");

    return this.db
      .prepare(
        `
        SELECT
          c.*,
          t.name AS topic_name,
          s.code AS subject_code,
          s.name AS subject_name
        FROM competencies c
        JOIN topics t ON c.topic_id = t.id
        JOIN subjects s ON t.subject_id = s.id
        WHERE c.competency_code IN (${placeholders})
          AND c.deleted_at IS NULL
        ORDER BY c.competency_code
      `
      )
      .all(...codes) as CompetencyWithDetails[];
  }

  /**
   * Get competency by ID
   */
  getById(id: number): CompetencyWithDetails | null {
    const result = this.db
      .prepare(
        `
        SELECT
          c.*,
          t.name AS topic_name,
          s.code AS subject_code,
          s.name AS subject_name
        FROM competencies c
        JOIN topics t ON c.topic_id = t.id
        JOIN subjects s ON t.subject_id = s.id
        WHERE c.id = ?
          AND c.deleted_at IS NULL
      `
      )
      .get(id) as CompetencyWithDetails | undefined;

    return result || null;
  }

  /**
   * Convert competency to tag format
   */
  toTag(competency: CompetencyWithDetails): CompetencyTag {
    return {
      value: competency.competency_code,
      code: competency.competency_code,
      text: competency.competency_text,
      subjectCode: competency.subject_code,
      subjectName: competency.subject_name,
      topicName: competency.topic_name,
      domain: competency.domain || undefined,
      level: competency.competency_level || undefined,
      isCore: Boolean(competency.is_core),
      teachingMethods: competency.teaching_methods || undefined,
      assessmentMethods: competency.assessment_methods || undefined,
      integrations: competency.integrations || undefined,
    };
  }

  /**
   * Convert array of competencies to tags
   */
  toTags(competencies: CompetencyWithDetails[]): CompetencyTag[] {
    return competencies.map((c) => this.toTag(c));
  }

  /**
   * Get competencies with filters
   */
  getFiltered(filters: CompetencyFilters): CompetencyWithDetails[] {
    let sql = `
      SELECT
        c.*,
        t.name AS topic_name,
        s.code AS subject_code,
        s.name AS subject_name
      FROM competencies c
      JOIN topics t ON c.topic_id = t.id
      JOIN subjects s ON t.subject_id = s.id
      WHERE c.deleted_at IS NULL
    `;
    const params: (string | number)[] = [];

    sql += this.buildFilterClauses(filters, params);
    sql += ` ORDER BY s.display_order, t.display_order, c.competency_code`;

    return this.db.prepare(sql).all(...params) as CompetencyWithDetails[];
  }

  /**
   * Build SQL WHERE clauses for filter fields
   * Appends clauses to the provided params array and returns the SQL string
   */
  private buildFilterClauses(filters: CompetencyFilters, params: (string | number)[]): string {
    let sql = "";

    if (filters.subject) {
      if (Array.isArray(filters.subject)) {
        sql += ` AND s.code IN (${filters.subject.map(() => "?").join(",")})`;
        params.push(...filters.subject);
      } else {
        sql += ` AND s.code = ?`;
        params.push(filters.subject);
      }
    }

    if (filters.topic) {
      sql += ` AND t.name = ?`;
      params.push(filters.topic);
    }

    // Domain: use LIKE to match multi-domain values like K/S, K/S/A
    if (filters.domain) {
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
    if (filters.level && filters.level.length > 0) {
      const levelClauses = filters.level.map(() => "c.competency_level LIKE ?");
      sql += ` AND (${levelClauses.join(" OR ")})`;
      for (const l of filters.level) {
        params.push(`%${l}%`);
      }
    }

    if (filters.coreOnly) {
      sql += ` AND c.is_core = 1`;
    }

    // Teaching method: AND logic (all selected must be present)
    if (filters.teachingMethod && filters.teachingMethod.length > 0) {
      for (const method of filters.teachingMethod) {
        sql += ` AND c.teaching_methods LIKE ?`;
        params.push(`%${method}%`);
      }
    }

    // Assessment method: AND logic
    if (filters.assessmentMethod && filters.assessmentMethod.length > 0) {
      for (const method of filters.assessmentMethod) {
        sql += ` AND c.assessment_methods LIKE ?`;
        params.push(`%${method}%`);
      }
    }

    return sql;
  }

  /**
   * Get paginated competencies for admin
   */
  getPaginated(
    page: number = 1,
    pageSize: number = 50,
    filters?: CompetencyFilters
  ): PaginatedResult<CompetencyWithDetails> {
    const offset = (page - 1) * pageSize;
    const params: (string | number)[] = [];

    let countSql = `
      SELECT COUNT(*) as count
      FROM competencies c
      JOIN topics t ON c.topic_id = t.id
      JOIN subjects s ON t.subject_id = s.id
      WHERE c.deleted_at IS NULL
    `;

    let dataSql = `
      SELECT
        c.*,
        t.name AS topic_name,
        s.code AS subject_code,
        s.name AS subject_name
      FROM competencies c
      JOIN topics t ON c.topic_id = t.id
      JOIN subjects s ON t.subject_id = s.id
      WHERE c.deleted_at IS NULL
    `;

    // Apply filters
    let filterSql = "";
    if (filters?.subject) {
      if (Array.isArray(filters.subject)) {
        filterSql += ` AND s.code IN (${filters.subject.map(() => "?").join(",")})`;
        params.push(...filters.subject);
      } else {
        filterSql += ` AND s.code = ?`;
        params.push(filters.subject);
      }
    }

    if (filters?.searchQuery) {
      filterSql += ` AND (c.competency_code LIKE ? OR c.competency_text LIKE ?)`;
      const searchTerm = `%${filters.searchQuery}%`;
      params.push(searchTerm, searchTerm);
    }

    countSql += filterSql;
    dataSql += filterSql;

    // Get total count
    const countParams = [...params];
    const { count: total } = this.db.prepare(countSql).get(...countParams) as { count: number };

    // Get data with pagination
    dataSql += ` ORDER BY s.display_order, c.competency_code LIMIT ? OFFSET ?`;
    params.push(pageSize, offset);

    const data = this.db.prepare(dataSql).all(...params) as CompetencyWithDetails[];

    return {
      data,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Create new competency
   */
  create(data: CompetencyInput): number {
    const result = this.db
      .prepare(
        `
        INSERT INTO competencies (
          competency_code,
          topic_id,
          competency_text,
          domain,
          competency_level,
          is_core,
          teaching_methods,
          assessment_methods,
          integrations
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        data.competency_code,
        data.topic_id,
        data.competency_text,
        data.domain,
        data.competency_level,
        data.is_core ? 1 : 0,
        data.teaching_methods || null,
        data.assessment_methods || null,
        data.integrations || null
      );

    return Number(result.lastInsertRowid);
  }

  /**
   * Update competency
   */
  update(
    id: number,
    data: Partial<Omit<CompetencyInput, "competency_code">>
  ): void {
    const fields: string[] = [];
    const params: (string | number | null)[] = [];

    if (data.topic_id !== undefined) {
      fields.push("topic_id = ?");
      params.push(data.topic_id);
    }
    if (data.competency_text !== undefined) {
      fields.push("competency_text = ?");
      params.push(data.competency_text);
    }
    if (data.domain !== undefined) {
      fields.push("domain = ?");
      params.push(data.domain);
    }
    if (data.competency_level !== undefined) {
      fields.push("competency_level = ?");
      params.push(data.competency_level);
    }
    if (data.is_core !== undefined) {
      fields.push("is_core = ?");
      params.push(data.is_core ? 1 : 0);
    }
    if (data.teaching_methods !== undefined) {
      fields.push("teaching_methods = ?");
      params.push(data.teaching_methods || null);
    }
    if (data.assessment_methods !== undefined) {
      fields.push("assessment_methods = ?");
      params.push(data.assessment_methods || null);
    }
    if (data.integrations !== undefined) {
      fields.push("integrations = ?");
      params.push(data.integrations || null);
    }

    if (fields.length === 0) return;

    fields.push("updated_at = CURRENT_TIMESTAMP");
    params.push(id);

    this.db
      .prepare(`UPDATE competencies SET ${fields.join(", ")} WHERE id = ?`)
      .run(...params);
  }

  /**
   * Soft delete competency
   */
  delete(id: number): void {
    this.db
      .prepare(
        "UPDATE competencies SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(id);
  }

  /**
   * Restore deleted competency
   */
  restore(id: number): void {
    this.db
      .prepare("UPDATE competencies SET deleted_at = NULL WHERE id = ?")
      .run(id);
  }

  /**
   * Get count of competencies
   */
  getCount(filters?: CompetencyFilters): number {
    let sql = `
      SELECT COUNT(*) as count
      FROM competencies c
      JOIN topics t ON c.topic_id = t.id
      JOIN subjects s ON t.subject_id = s.id
      WHERE c.deleted_at IS NULL
    `;
    const params: (string | number)[] = [];

    if (filters?.subject) {
      if (Array.isArray(filters.subject)) {
        sql += ` AND s.code IN (${filters.subject.map(() => "?").join(",")})`;
        params.push(...filters.subject);
      } else {
        sql += ` AND s.code = ?`;
        params.push(filters.subject);
      }
    }

    if (filters?.coreOnly) {
      sql += ` AND c.is_core = 1`;
    }

    const result = this.db.prepare(sql).get(...params) as { count: number };
    return result.count;
  }

  /**
   * Get subjects with topic and competency counts for tree view
   */
  getSubjectsWithCounts(): TreeSubjectData[] {
    return this.db
      .prepare(
        `
        SELECT
          s.id,
          s.code,
          s.name,
          COUNT(DISTINCT t.id) as topicCount,
          COUNT(c.id) as competencyCount
        FROM subjects s
        LEFT JOIN topics t ON t.subject_id = s.id
        LEFT JOIN competencies c ON c.topic_id = t.id AND c.deleted_at IS NULL
        GROUP BY s.id
        ORDER BY s.display_order, s.name
      `
      )
      .all() as TreeSubjectData[];
  }

  /**
   * Get topics with competency counts for a subject
   */
  getTopicsWithCounts(subjectId: number): TreeTopicData[] {
    return this.db
      .prepare(
        `
        SELECT
          t.id,
          t.name,
          COUNT(c.id) as competencyCount
        FROM topics t
        LEFT JOIN competencies c ON c.topic_id = t.id AND c.deleted_at IS NULL
        WHERE t.subject_id = ?
        GROUP BY t.id
        ORDER BY t.display_order, t.name
      `
      )
      .all(subjectId) as TreeTopicData[];
  }

  /**
   * Get distinct canonical values for teaching or assessment methods
   */
  getDistinctMethods(type: "teaching" | "assessment"): string[] {
    const column = type === "teaching" ? "teaching_methods" : "assessment_methods";
    const rows = this.db
      .prepare(`SELECT DISTINCT ${column} as methods FROM competencies WHERE ${column} IS NOT NULL AND deleted_at IS NULL`)
      .all() as { methods: string }[];

    // Split comma-separated values, deduplicate, sort
    const allMethods = new Set<string>();
    for (const row of rows) {
      row.methods.split(",").forEach((m) => {
        const trimmed = m.trim();
        if (trimmed) allMethods.add(trimmed);
      });
    }

    return Array.from(allMethods).sort();
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalSubjects: number;
    totalTopics: number;
    totalCompetencies: number;
    coreCompetencies: number;
  } {
    const subjects = this.db
      .prepare("SELECT COUNT(*) as count FROM subjects")
      .get() as { count: number };
    const topics = this.db
      .prepare("SELECT COUNT(*) as count FROM topics")
      .get() as { count: number };
    const competencies = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM competencies WHERE deleted_at IS NULL"
      )
      .get() as { count: number };
    const core = this.db
      .prepare(
        "SELECT COUNT(*) as count FROM competencies WHERE deleted_at IS NULL AND is_core = 1"
      )
      .get() as { count: number };

    return {
      totalSubjects: subjects.count,
      totalTopics: topics.count,
      totalCompetencies: competencies.count,
      coreCompetencies: core.count,
    };
  }
}

/**
 * Factory function to get a version-aware competency service
 * @param version - Curriculum version (e.g., "2019", "2024")
 */
export function getCompetencyService(version?: string): CompetencyService {
  return new CompetencyService(version);
}

// Default singleton for backward compatibility
export const competencyService = new CompetencyService();
