import { NextResponse } from "next/server";
import { getCompetencyService } from "@/services/competencyService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const version = searchParams.get("version") || undefined;

    const service = getCompetencyService(version);
    const subjects = service.getAllSubjects();
    return NextResponse.json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json(
      { error: "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}
