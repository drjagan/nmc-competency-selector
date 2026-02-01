import fs from "fs";
import path from "path";
import { initializeDatabase, rebuildFTS5Index } from "../src/services/migrations";
import { importService } from "../src/services/importService";
import { getDatabase } from "../src/services/database";

async function main() {
  // Initialize database first
  initializeDatabase();

  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: npm run db:import <directory-path>");
    console.log('Example: npm run db:import "/Users/jagan/Documents/CBME UG CURRICULUM"');
    process.exit(1);
  }

  const directoryPath = args[0];

  // Check if path exists
  if (!fs.existsSync(directoryPath)) {
    console.error(`❌ Path not found: ${directoryPath}`);
    process.exit(1);
  }

  // Find all Excel files recursively
  const files = findExcelFiles(directoryPath);

  if (files.length === 0) {
    console.error("❌ No Excel files found in the specified directory");
    process.exit(1);
  }

  console.log(`\n📥 Found ${files.length} Excel files to import:\n`);
  files.forEach((f, i) => console.log(`  ${i + 1}. ${path.basename(f)}`));
  console.log("");

  let totalInserted = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const file of files) {
    const filename = path.basename(file);
    console.log(`\n📄 Processing: ${filename}`);

    try {
      const result = await importService.importFromExcel(file);

      console.log(`   ✅ Inserted: ${result.inserted}`);
      console.log(`   🔄 Updated: ${result.updated}`);
      console.log(`   ⏭️  Skipped: ${result.skipped}`);

      if (result.errors.length > 0) {
        console.log(`   ⚠️  Errors: ${result.errors.length}`);
        result.errors.slice(0, 3).forEach((err) => {
          console.log(`      Row ${err.row}: ${err.error}`);
        });
        if (result.errors.length > 3) {
          console.log(`      ... and ${result.errors.length - 3} more errors`);
        }
      }

      totalInserted += result.inserted;
      totalUpdated += result.updated;
      totalSkipped += result.skipped;
      totalErrors += result.errors.length;
    } catch (error) {
      console.error(`   ❌ Failed to import: ${error}`);
      totalErrors++;
    }
  }

  // Rebuild FTS5 index
  console.log("\n🔄 Rebuilding search index...");
  rebuildFTS5Index();

  // Print summary
  console.log("\n" + "=".repeat(50));
  console.log("📊 IMPORT SUMMARY");
  console.log("=".repeat(50));
  console.log(`   Files processed: ${files.length}`);
  console.log(`   Competencies inserted: ${totalInserted}`);
  console.log(`   Competencies updated: ${totalUpdated}`);
  console.log(`   Rows skipped: ${totalSkipped}`);
  console.log(`   Errors: ${totalErrors}`);

  // Print database stats
  const db = getDatabase();
  const subjectCount = (db.prepare("SELECT COUNT(*) as count FROM subjects").get() as { count: number }).count;
  const topicCount = (db.prepare("SELECT COUNT(*) as count FROM topics").get() as { count: number }).count;
  const compCount = (db.prepare("SELECT COUNT(*) as count FROM competencies WHERE deleted_at IS NULL").get() as { count: number }).count;

  console.log("\n📈 DATABASE STATS");
  console.log("=".repeat(50));
  console.log(`   Subjects: ${subjectCount}`);
  console.log(`   Topics: ${topicCount}`);
  console.log(`   Competencies: ${compCount}`);
  console.log("=".repeat(50));

  console.log("\n🎉 Import complete!");
}

function findExcelFiles(dir: string): string[] {
  const files: string[] = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      // Recurse into subdirectories
      files.push(...findExcelFiles(fullPath));
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".xlsx") || entry.name.endsWith(".xls")) &&
      !entry.name.startsWith("~$") // Ignore temp files
    ) {
      files.push(fullPath);
    }
  }

  return files;
}

// Run
main().catch((error) => {
  console.error("❌ Import failed:", error);
  process.exit(1);
});
