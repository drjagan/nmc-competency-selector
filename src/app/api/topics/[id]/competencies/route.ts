import { NextResponse } from "next/server";
import { getCompetencyService } from "@/services/competencyService";

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

    const service = getCompetencyService(version);
    const competencies = service.getCompetenciesByTopic(topicId);
    return NextResponse.json(competencies);
  } catch (error) {
    console.error("Error fetching competencies:", error);
    return NextResponse.json(
      { error: "Failed to fetch competencies" },
      { status: 500 }
    );
  }
}
