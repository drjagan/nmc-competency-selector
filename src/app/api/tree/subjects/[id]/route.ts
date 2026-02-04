import { NextRequest, NextResponse } from "next/server";
import { getCompetencyService } from "@/services/competencyService";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const version = searchParams.get("version") || undefined;

    const subjectId = parseInt(id, 10);

    if (isNaN(subjectId)) {
      return NextResponse.json(
        { error: "Invalid subject ID" },
        { status: 400 }
      );
    }

    const service = getCompetencyService(version);
    const topics = service.getTopicsWithCounts(subjectId);

    return NextResponse.json({
      subjectId,
      topics,
    });
  } catch (error) {
    console.error("Error fetching topics:", error);
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    );
  }
}
