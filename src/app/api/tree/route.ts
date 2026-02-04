import { NextResponse } from "next/server";
import { competencyService } from "@/services/competencyService";

export async function GET() {
  try {
    const subjects = competencyService.getSubjectsWithCounts();
    const stats = competencyService.getStats();

    return NextResponse.json({
      subjects,
      totalCompetencies: stats.totalCompetencies,
    });
  } catch (error) {
    console.error("Error fetching tree data:", error);
    return NextResponse.json(
      { error: "Failed to fetch tree data" },
      { status: 500 }
    );
  }
}
