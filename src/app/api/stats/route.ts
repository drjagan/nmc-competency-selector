import { NextResponse } from "next/server";
import { competencyService } from "@/services/competencyService";

export async function GET() {
  try {
    const stats = competencyService.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch statistics" },
      { status: 500 }
    );
  }
}
