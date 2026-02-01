import { NextResponse } from "next/server";
import { competencyService } from "@/services/competencyService";

export async function GET() {
  try {
    const subjects = competencyService.getAllSubjects();
    return NextResponse.json(subjects);
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return NextResponse.json(
      { error: "Failed to fetch subjects" },
      { status: 500 }
    );
  }
}
