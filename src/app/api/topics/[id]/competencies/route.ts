import { NextResponse } from "next/server";
import { getCompetencyService } from "@/services/competencyService";
import type { CompetencyFilters } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get("version") || undefined;

    const topicId = parseInt(id);
    if (isNaN(topicId)) {
      return NextResponse.json(
        { error: "Invalid topic ID" },
        { status: 400 }
      );
    }

    // Parse optional filters
    const filters: CompetencyFilters = {};
    const domain = searchParams.get("domain");
    if (domain) filters.domain = domain.split(",");

    const level = searchParams.get("level");
    if (level) filters.level = level.split(",");

    const coreOnly = searchParams.get("coreOnly");
    if (coreOnly === "true") filters.coreOnly = true;

    const teachingMethod = searchParams.get("teachingMethod");
    if (teachingMethod) filters.teachingMethod = teachingMethod.split(",");

    const assessmentMethod = searchParams.get("assessmentMethod");
    if (assessmentMethod) filters.assessmentMethod = assessmentMethod.split(",");

    const hasFilters = Object.keys(filters).length > 0;

    const service = getCompetencyService(version);
    const competencies = service.getCompetenciesByTopic(
      topicId,
      hasFilters ? filters : undefined
    );
    return NextResponse.json(competencies);
  } catch (error) {
    console.error("Error fetching competencies:", error);
    return NextResponse.json(
      { error: "Failed to fetch competencies" },
      { status: 500 }
    );
  }
}
