import { initializeDatabase } from "../src/services/migrations";

console.log("Starting database initialization...\n");

try {
  initializeDatabase();
  console.log("\n🎉 Database is ready!");
} catch (error) {
  console.error("❌ Failed to initialize database:", error);
  process.exit(1);
}
