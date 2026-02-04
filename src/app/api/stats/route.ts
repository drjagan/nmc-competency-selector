import { NextResponse } from "next/server";
import { getCompetencyService } from "@/services/competencyService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const version = searchParams.get("version") || undefined;

    const service = getCompetencyService(version);
    const stats = service.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
