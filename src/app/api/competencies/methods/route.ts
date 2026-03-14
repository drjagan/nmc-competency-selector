import { NextResponse } from "next/server";
import { getCompetencyService } from "@/services/competencyService";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") as "teaching" | "assessment" | null;
    const version = searchParams.get("version") || undefined;

    if (type !== "teaching" && type !== "assessment") {
      return NextResponse.json(
        { error: "type must be 'teaching' or 'assessment'" },
        { status: 400 }
      );
    }

    const service = getCompetencyService(version);
    const methods = service.getDistinctMethods(type);
    return NextResponse.json({ methods });
  } catch (error) {
    console.error("Error fetching methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch methods" },
      { status: 500 }
    );
  }
}
