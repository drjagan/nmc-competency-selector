import { NextResponse } from "next/server";
import { getSearchService } from "@/services/searchService";
import type { CompetencyFilters } from "@/types";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      query,
      filters,
      limit = 50,
      version,
    }: {
      query: string;
      filters?: CompetencyFilters;
      limit?: number;
      version?: string;
    } = body;

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const service = getSearchService(version);
    const results = service.search(query, filters, limit);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const subject = searchParams.get("subject");
    const domain = searchParams.get("domain");
    const coreOnly = searchParams.get("coreOnly") === "true";
    const limit = parseInt(searchParams.get("limit") || "50");
    const version = searchParams.get("version") || undefined;

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: "Query must be at least 2 characters" },
        { status: 400 }
      );
    }

    const filters: CompetencyFilters = {};
    if (subject) filters.subject = subject;
    if (domain) filters.domain = domain;
    if (coreOnly) filters.coreOnly = true;

    const service = getSearchService(version);
    const results = service.search(query, filters, limit);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
