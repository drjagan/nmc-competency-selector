import * as XLSX from "xlsx";
import { getDatabase } from "./database";
import type { ImportResult, Subject } from "@/types";

// Subject code mapping from filename
const SUBJECT_MAP: { [key: string]: string } = {
  "human anatomy": "AN",
  anatomy: "AN",
  biochemistry: "BI",
  physiology: "PY",
  pathology: "PA",
  microbiology: "MI",
  pharmacology: "PH",
  "forensic medicine": "FM",
  "forensic medicine & toxicology": "FM",
  "community medicine": "CM",
  "community  medicine": "CM", // Handle double space
  "general medicine": "IM",
  medicine: "IM",
  "general surgery": "SU",
  surgery: "SU",
  "obstetrics & gynaecology": "OG",
  "obstetrics and gynaecology": "OG",
  pediatrics: "PE",
  paediatrics: "PE",
  orthopedics: "OR",
  orthopaedics: "OR",
  otorhinolaryngology: "EN",
  ent: "EN",
  ophthalmology: "OP",
  psychiatry: "PS",
  dermatology: "DR",
  "dermatology, venereology & leprosy": "DR",
  radiodiagnosis: "RD",
  radiology: "RD",
  anesthesiology: "AS",
  anaesthesiology: "AS",
  "respiratory medicine": "RM",
  radiotherapy: "RT",
  dentistry: "DT",
  "physical medicine & rehabilitation": "PM",
};

export class ImportService {
  private db = getDatabase();

  /**
   * Import competencies from Excel file
   */
  async importFromExcel(filePath: string): Promise<ImportResult> {
    const result: ImportResult = {
      success: false,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    try {
      // Read Excel file
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];

      // Convert to JSON
      const rawData: unknown[] = XLSX.utils.sheet_to_json(worksheet);

      if (rawData.length === 0) {
        result.errors.push({ row: 0, error: "No data found in Excel file" });
        return result;
      }

      // Extract subject code from filename
      const filename = filePath.split("/").pop() || "";
      const subjectName = filename.replace(/\.xlsx?$/i, "").toLowerCase();
      const subjectCode = this.getSubjectCode(subjectName);

      if (!subjectCode) {
        result.errors.push({
          row: 0,
          error: `Could not determine subject code from filename: ${filename}`,
        });
        return result;
      }

      // Get or create subject
      const subject = this.getOrCreateSubject(subjectCode);

      // Process rows in transaction
      const processRows = this.db.transaction((rows: unknown[]) => {
        rows.forEach((row, index) => {
          try {
            const processed = this.processRow(row as Record<string, unknown>, subject.id, index + 2);
            if (processed === "inserted") {
              result.inserted++;
            } else if (processed === "updated") {
              result.updated++;
            } else {
              result.skipped++;
            }
          } catch (error) {
            result.errors.push({
              row: index + 2,
              error: error instanceof Error ? error.message : "Unknown error",
            });
          }
        });
      });

      processRows(rawData);

      result.success = result.errors.length === 0;
      return result;
    } catch (error) {
      result.errors.push({
        row: 0,
        error: error instanceof Error ? error.message : "Failed to read Excel file",
      });
      return result;
    }
  }

  /**
   * Get subject code from filename
   */
  private getSubjectCode(filename: string): string | null {
    const normalized = filename.toLowerCase().trim();

    // Direct match
    if (SUBJECT_MAP[normalized]) {
      return SUBJECT_MAP[normalized];
    }

    // Partial match
    for (const [key, code] of Object.entries(SUBJECT_MAP)) {
      if (normalized.includes(key) || key.includes(normalized)) {
        return code;
      }
    }

    return null;
  }

  /**
   * Get subject or create if doesn't exist
   */
  private getOrCreateSubject(code: string): Subject {
    let subject = this.db
      .prepare("SELECT * FROM subjects WHERE code = ?")
      .get(code) as Subject | undefined;

    if (!subject) {
      const result = this.db
        .prepare("INSERT INTO subjects (code, name, display_order) VALUES (?, ?, ?)")
        .run(code, code, 99);

      subject = {
        id: Number(result.lastInsertRowid),
        code,
        name: code,
        display_order: 99,
      };
    }

    return subject;
  }

  /**
   * Process a single row
   */
  private processRow(
    row: Record<string, unknown>,
    subjectId: number,
    rowNumber: number
  ): "inserted" | "updated" | "skipped" {
    // Parse row data - handle various column name formats
    const competencyCode = this.findValue(row, [
      "Competency Number",
      "competency_code",
      "Code",
      "Number",
      "Comp No",
      "Competency No",
      "S.No",
      "Sl.No",
    ]);

    const topic = this.findValue(row, [
      "Topic",
      "topic",
      "Topic/Module",
      "Module",
      "Unit",
    ]);

    const competencyText = this.findValue(row, [
      "Competency",
      "competency",
      "Competency Text",
      "Description",
      "Competency Statement",
      "The student should be able to",
    ]);

    const domain = this.findValue(row, [
      "Domain",
      "domain",
      "Domains",
      "K/S/A",
    ]);

    const level = this.findValue(row, [
      "Level",
      "level",
      "Competency Level",
      "Level of learning",
      "Level of competence",
      "Core",
    ]);

    const core = this.findValue(row, [
      "Core",
      "core",
      "Is Core",
      "Y/N",
      "Must Know",
    ]);

    const teachingMethods = this.findValue(row, [
      "Teaching Methods",
      "teaching_methods",
      "Suggested teaching-learning methods",
      "Teaching Learning Methods",
      "Teaching method",
    ]);

    const assessmentMethods = this.findValue(row, [
      "Assessment Methods",
      "assessment_methods",
      "Suggested assessment methods",
      "Assessment method",
      "Assessment",
    ]);

    const integrations = this.findValue(row, [
      "Integrations",
      "integrations",
      "Horizontal integration",
      "Integration",
      "Department integration",
    ]);

    // Skip if no competency code or text
    if (!competencyCode || !competencyText) {
      return "skipped";
    }

    // Validate domain if present
    const normalizedDomain = this.normalizeDomain(domain || "K");

    // Get or create topic
    const topicId = this.getOrCreateTopic(topic || "General", subjectId);

    // Check if competency already exists
    const existing = this.db
      .prepare("SELECT id FROM competencies WHERE competency_code = ?")
      .get(competencyCode);

    if (existing) {
      // Update
      this.db
        .prepare(
          `
        UPDATE competencies SET
          topic_id = ?,
          competency_text = ?,
          domain = ?,
          competency_level = ?,
          is_core = ?,
          teaching_methods = ?,
          assessment_methods = ?,
          integrations = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE competency_code = ?
      `
        )
        .run(
          topicId,
          competencyText,
          normalizedDomain,
          level || "",
          this.parseBoolean(core) ? 1 : 0,
          teachingMethods || null,
          assessmentMethods || null,
          integrations || null,
          competencyCode
        );
      return "updated";
    } else {
      // Insert
      this.db
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
          competencyCode,
          topicId,
          competencyText,
          normalizedDomain,
          level || "",
          this.parseBoolean(core) ? 1 : 0,
          teachingMethods || null,
          assessmentMethods || null,
          integrations || null
        );
      return "inserted";
    }
  }

  /**
   * Find value from row using multiple possible column names
   */
  private findValue(
    row: Record<string, unknown>,
    possibleKeys: string[]
  ): string | null {
    for (const key of possibleKeys) {
      // Exact match
      if (row[key] !== undefined && row[key] !== null) {
        return this.cleanString(row[key]);
      }
      // Case-insensitive match
      const foundKey = Object.keys(row).find(
        (k) => k.toLowerCase() === key.toLowerCase()
      );
      if (foundKey && row[foundKey] !== undefined && row[foundKey] !== null) {
        return this.cleanString(row[foundKey]);
      }
    }
    return null;
  }

  /**
   * Get or create topic
   */
  private getOrCreateTopic(name: string, subjectId: number): number {
    const cleanName = name.trim();

    const topic = this.db
      .prepare("SELECT id FROM topics WHERE subject_id = ? AND name = ?")
      .get(subjectId, cleanName) as { id: number } | undefined;

    if (topic) {
      return topic.id;
    }

    const result = this.db
      .prepare("INSERT INTO topics (subject_id, name, display_order) VALUES (?, ?, ?)")
      .run(subjectId, cleanName, 0);

    return Number(result.lastInsertRowid);
  }

  /**
   * Normalize domain value
   */
  private normalizeDomain(domain: string): string {
    const normalized = domain.toUpperCase().trim();

    // Handle common patterns
    if (normalized.includes("K") && normalized.includes("S") && normalized.includes("A")) {
      return "K/S/A";
    }
    if (normalized.includes("K") && normalized.includes("S")) {
      return "K/S";
    }
    if (normalized.includes("K") && normalized.includes("A")) {
      return "K/A";
    }
    if (normalized.includes("S") && normalized.includes("A")) {
      return "S/A";
    }
    if (normalized.includes("K")) {
      return "K";
    }
    if (normalized.includes("S")) {
      return "S";
    }
    if (normalized.includes("A")) {
      return "A";
    }

    // Default to K if unknown
    return "K";
  }

  /**
   * Clean string value
   */
  private cleanString(value: unknown): string {
    if (value === null || value === undefined) return "";
    return String(value).trim();
  }

  /**
   * Parse boolean value
   */
  private parseBoolean(value: unknown): boolean {
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    if (typeof value === "string") {
      const lower = value.toLowerCase().trim();
      return (
        lower === "yes" ||
        lower === "true" ||
        lower === "1" ||
        lower === "y" ||
        lower === "core" ||
        lower === "must know"
      );
    }
    return false;
  }

  /**
   * Preview Excel file structure
   */
  previewExcel(filePath: string): { headers: string[]; sampleRows: unknown[] } {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data: unknown[] = XLSX.utils.sheet_to_json(worksheet);
    const headers = data.length > 0 ? Object.keys(data[0] as Record<string, unknown>) : [];

    return {
      headers,
      sampleRows: data.slice(0, 5),
    };
  }
}

// Export singleton instance
export const importService = new ImportService();
