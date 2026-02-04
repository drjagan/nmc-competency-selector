import { NextResponse } from "next/server";
import {
  getVersions,
  getActiveVersions,
  getDefaultVersion,
  shouldShowVersionSelector,
} from "@/services/versionService";

/**
 * GET /api/versions
 * Returns list of available curriculum versions
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("activeOnly") === "true";

    const versions = activeOnly ? getActiveVersions() : getVersions();
    const defaultVersion = getDefaultVersion();
    const showSelector = shouldShowVersionSelector();

    return NextResponse.json({
      versions,
      defaultVersion,
      showSelector,
    });
  } catch (error) {
    console.error("Error fetching versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch curriculum versions" },
      { status: 500 }
    );
  }
}
