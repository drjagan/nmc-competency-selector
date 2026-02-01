import { NextResponse } from "next/server";
import { importService } from "@/services/importService";
import { rebuildFTS5Index } from "@/services/migrations";
import type { ImportResult } from "@/types";
import path from "path";
import fs from "fs";
import os from "os";

// Check admin access
function checkAdminAccess(): boolean {
  return process.env.ADMIN_ENABLED === "true";
}

export async function POST(request: Request) {
  if (!checkAdminAccess()) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("files") as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: "No files provided" },
        { status: 400 }
      );
    }

    const totalResult: ImportResult = {
      success: true,
      inserted: 0,
      updated: 0,
      skipped: 0,
      errors: [],
    };

    // Create temp directory for uploaded files
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "nmc-import-"));

    try {
      for (const file of files) {
        // Save file to temp directory
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);
        const filePath = path.join(tempDir, file.name);
        fs.writeFileSync(filePath, buffer);

        try {
          // Import the file
          const result = await importService.importFromExcel(filePath);

          totalResult.inserted += result.inserted;
          totalResult.updated += result.updated;
          totalResult.skipped += result.skipped;

          if (result.errors && result.errors.length > 0) {
            totalResult.errors = [
              ...totalResult.errors,
              ...result.errors.map((e) => ({
                row: e.row,
                error: `${file.name}: ${e.error}`,
              })),
            ];
          }
        } catch (error) {
          totalResult.errors.push({
            row: 0,
            error: `${file.name}: ${error instanceof Error ? error.message : "Unknown error"}`,
          });
        }

        // Clean up temp file
        fs.unlinkSync(filePath);
      }

      // Rebuild FTS5 index after import
      rebuildFTS5Index();

      // Mark as failed if there were critical errors
      if (
        totalResult.inserted === 0 &&
        totalResult.updated === 0 &&
        totalResult.errors.length > 0
      ) {
        totalResult.success = false;
      }

      return NextResponse.json(totalResult);
    } finally {
      // Clean up temp directory
      try {
        fs.rmdirSync(tempDir);
      } catch {
        // Ignore cleanup errors
      }
    }
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json(
      {
        success: false,
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: [{ row: 0, error: error instanceof Error ? error.message : "Import failed" }],
      },
      { status: 500 }
    );
  }
}
