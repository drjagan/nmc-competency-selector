import type Database from "better-sqlite3";
import { getDatabase } from "./database";

export function runMigrations(): void {
  const db = getDatabase();

  // Create tables
  createTables(db);

  // Create indexes
  createIndexes(db);

  // Create FTS5 virtual table
  createFTS5Table(db);

  // Create triggers for FTS5 sync
  createTriggers(db);

  console.log("✅ Database migrations completed successfully");
}

function createTables(db: Database.Database): void {
  // Subjects table
  db.exec(`
    CREATE TABLE IF NOT EXISTS subjects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Topics table
  db.exec(`
    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subject_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      display_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (subject_id) REFERENCES subjects(id) ON DELETE CASCADE,
      UNIQUE(subject_id, name)
    );
  `);

  // Competencies table
  db.exec(`
    CREATE TABLE IF NOT EXISTS competencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competency_code TEXT NOT NULL UNIQUE,
      topic_id INTEGER NOT NULL,
      competency_text TEXT NOT NULL,
      domain TEXT NOT NULL,
      competency_level TEXT NOT NULL,
      is_core INTEGER NOT NULL DEFAULT 0,
      teaching_methods TEXT,
      assessment_methods TEXT,
      integrations TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      deleted_at TEXT,
      FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
    );
  `);
}

function createIndexes(db: Database.Database): void {
  db.exec(`
    -- Subjects indexes
    CREATE INDEX IF NOT EXISTS idx_subjects_code ON subjects(code);
    CREATE INDEX IF NOT EXISTS idx_subjects_display_order ON subjects(display_order);

    -- Topics indexes
    CREATE INDEX IF NOT EXISTS idx_topics_subject_id ON topics(subject_id);
    CREATE INDEX IF NOT EXISTS idx_topics_name ON topics(name);
    CREATE INDEX IF NOT EXISTS idx_topics_display_order ON topics(display_order);

    -- Competencies indexes
    CREATE INDEX IF NOT EXISTS idx_competencies_code ON competencies(competency_code);
    CREATE INDEX IF NOT EXISTS idx_competencies_topic_id ON competencies(topic_id);
    CREATE INDEX IF NOT EXISTS idx_competencies_domain ON competencies(domain);
    CREATE INDEX IF NOT EXISTS idx_competencies_is_core ON competencies(is_core);
    CREATE INDEX IF NOT EXISTS idx_competencies_deleted_at ON competencies(deleted_at);
    CREATE INDEX IF NOT EXISTS idx_competencies_updated_at ON competencies(updated_at);
  `);
}

function createFTS5Table(db: Database.Database): void {
  // Check if FTS5 table exists
  const existing = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='competencies_fts'"
    )
    .get();

  if (!existing) {
    // Create FTS5 table without content= option (external content is more complex)
    // We'll manually keep it in sync with triggers
    db.exec(`
      CREATE VIRTUAL TABLE competencies_fts USING fts5(
        competency_code,
        competency_text,
        topic_name,
        subject_name,
        tokenize='porter unicode61'
      );
    `);
  }
}

function createTriggers(db: Database.Database): void {
  // Drop existing triggers first to avoid duplicates
  db.exec(`
    DROP TRIGGER IF EXISTS competencies_ai;
    DROP TRIGGER IF EXISTS competencies_ad;
    DROP TRIGGER IF EXISTS competencies_au;
  `);

  // Trigger for INSERT
  db.exec(`
    CREATE TRIGGER competencies_ai AFTER INSERT ON competencies BEGIN
      INSERT INTO competencies_fts(
        rowid,
        competency_code,
        competency_text,
        topic_name,
        subject_name
      )
      SELECT
        NEW.id,
        NEW.competency_code,
        NEW.competency_text,
        t.name,
        s.name
      FROM topics t
      JOIN subjects s ON t.subject_id = s.id
      WHERE t.id = NEW.topic_id;
    END;
  `);

  // Trigger for UPDATE
  db.exec(`
    CREATE TRIGGER competencies_au AFTER UPDATE ON competencies BEGIN
      DELETE FROM competencies_fts WHERE rowid = OLD.id;
      INSERT INTO competencies_fts(
        rowid,
        competency_code,
        competency_text,
        topic_name,
        subject_name
      )
      SELECT
        NEW.id,
        NEW.competency_code,
        NEW.competency_text,
        t.name,
        s.name
      FROM topics t
      JOIN subjects s ON t.subject_id = s.id
      WHERE t.id = NEW.topic_id;
    END;
  `);

  // Trigger for DELETE
  db.exec(`
    CREATE TRIGGER competencies_ad AFTER DELETE ON competencies BEGIN
      DELETE FROM competencies_fts WHERE rowid = OLD.id;
    END;
  `);
}

// Seed initial data (19 subjects)
export function seedSubjects(): void {
  const db = getDatabase();

  const subjects = [
    { code: "AN", name: "Anatomy", order: 1 },
    { code: "BI", name: "Biochemistry", order: 2 },
    { code: "PY", name: "Physiology", order: 3 },
    { code: "PA", name: "Pathology", order: 4 },
    { code: "MI", name: "Microbiology", order: 5 },
    { code: "PH", name: "Pharmacology", order: 6 },
    { code: "FM", name: "Forensic Medicine", order: 7 },
    { code: "CM", name: "Community Medicine", order: 8 },
    { code: "IM", name: "General Medicine", order: 9 },
    { code: "SU", name: "General Surgery", order: 10 },
    { code: "OG", name: "Obstetrics and Gynaecology", order: 11 },
    { code: "PE", name: "Paediatrics", order: 12 },
    { code: "OR", name: "Orthopaedics", order: 13 },
    { code: "EN", name: "Otorhinolaryngology (ENT)", order: 14 },
    { code: "OP", name: "Ophthalmology", order: 15 },
    { code: "PS", name: "Psychiatry", order: 16 },
    { code: "DR", name: "Dermatology, Venereology & Leprosy", order: 17 },
    { code: "RD", name: "Radiodiagnosis", order: 18 },
    { code: "AS", name: "Anaesthesiology", order: 19 },
  ];

  const stmt = db.prepare(`
    INSERT OR IGNORE INTO subjects (code, name, display_order)
    VALUES (?, ?, ?)
  `);

  type SubjectData = { code: string; name: string; order: number };
  const insertMany = db.transaction((items: SubjectData[]) => {
    for (const item of items) {
      stmt.run(item.code, item.name, item.order);
    }
  });

  insertMany(subjects);
  console.log(`✅ Seeded ${subjects.length} subjects`);
}

// Initialize database
export function initializeDatabase(): void {
  console.log("🔧 Initializing database...");
  runMigrations();
  seedSubjects();
  console.log("✅ Database initialization complete");
}

// Rebuild FTS5 index from existing data
export function rebuildFTS5Index(): void {
  const db = getDatabase();

  console.log("🔄 Rebuilding FTS5 index...");

  // Clear existing FTS5 data
  db.exec("DELETE FROM competencies_fts");

  // Repopulate from competencies table using INSERT ... SELECT
  const insertStmt = db.prepare(`
    INSERT INTO competencies_fts(rowid, competency_code, competency_text, topic_name, subject_name)
    VALUES (?, ?, ?, ?, ?)
  `);

  const competencies = db.prepare(`
    SELECT
      c.id,
      c.competency_code,
      c.competency_text,
      t.name as topic_name,
      s.name as subject_name
    FROM competencies c
    JOIN topics t ON c.topic_id = t.id
    JOIN subjects s ON t.subject_id = s.id
    WHERE c.deleted_at IS NULL
  `).all() as { id: number; competency_code: string; competency_text: string; topic_name: string; subject_name: string }[];

  const insertAll = db.transaction((rows: typeof competencies) => {
    for (const row of rows) {
      insertStmt.run(row.id, row.competency_code, row.competency_text, row.topic_name, row.subject_name);
    }
  });

  insertAll(competencies);

  console.log(`✅ FTS5 index rebuilt with ${competencies.length} entries`);
}
