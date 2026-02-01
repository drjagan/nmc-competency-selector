import { NextResponse } from "next/server";
import { competencyService } from "@/services/competencyService";

// GET /api/competencies - Get competency by code
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get("code");
    const codes = searchParams.get("codes");

    if (codes) {
      // Get multiple by codes
      const codeList = codes.split(",").map((c) => c.trim());
      const competencies = competencyService.getByCodes(codeList);
      return NextResponse.json(competencies);
    }

    if (code) {
      // Get single by code
      const competency = competencyService.getByCode(code);
      if (!competency) {
        return NextResponse.json(
          { error: "Competency not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(competency);
    }

    return NextResponse.json(
      { error: "Missing code or codes parameter" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Error fetching competency:", error);
    return NextResponse.json(
      { error: "Failed to fetch competency" },
      { status: 500 }
    );
  }
}
