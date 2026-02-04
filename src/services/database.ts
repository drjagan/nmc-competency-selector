import Database from "better-sqlite3";
import path from "path";
import { getDefaultVersion, getDbFile, isValidVersion } from "./versionService";

// Map of version -> database connection
const databases: Map<string, Database.Database> = new Map();

/**
 * Get a database connection for the specified curriculum version
 * @param version - Curriculum version ID (e.g., "2019", "2024"). Defaults to default version.
 * @returns SQLite database connection
 */
export function getDatabase(version?: string): Database.Database {
  const targetVersion = version || getDefaultVersion();

  // Validate version exists
  if (!isValidVersion(targetVersion)) {
    throw new Error(`Invalid curriculum version: ${targetVersion}`);
  }

  // Return existing connection if available
  if (databases.has(targetVersion)) {
    return databases.get(targetVersion)!;
  }

  // Get database filename for this version
  const dbFile = getDbFile(targetVersion);
  if (!dbFile) {
    throw new Error(`No database file configured for version: ${targetVersion}`);
  }

  // Create new connection
  const dbPath = path.join(process.cwd(), "src/data", dbFile);
  const db = new Database(dbPath);

  // Enable foreign keys
  db.pragma("foreign_keys = ON");

  // Performance optimizations
  db.pragma("journal_mode = WAL");
  db.pragma("synchronous = NORMAL");
  db.pragma("cache_size = 10000");
  db.pragma("temp_store = MEMORY");

  // Store in map
  databases.set(targetVersion, db);

  return db;
}

/**
 * Close a specific database connection
 * @param version - Version to close, or undefined to close all
 */
export function closeDatabase(version?: string): void {
  if (version) {
    const db = databases.get(version);
    if (db) {
      db.close();
      databases.delete(version);
    }
  } else {
    // Close all connections
    for (const [v, db] of databases.entries()) {
      db.close();
      databases.delete(v);
    }
  }
}

/**
 * Get list of currently open database versions
 */
export function getOpenDatabases(): string[] {
  return Array.from(databases.keys());
}

// Graceful shutdown - close all database connections
if (typeof process !== "undefined") {
  process.on("exit", () => closeDatabase());
  process.on("SIGINT", () => {
    closeDatabase();
    process.exit(0);
  });
  process.on("SIGTERM", () => {
    closeDatabase();
    process.exit(0);
  });
}
