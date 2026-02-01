import { NextResponse } from "next/server";
import { competencyService } from "@/services/competencyService";
import type { CompetencyInput } from "@/types";

// Check admin access
function isAdminEnabled(): boolean {
  return process.env.ADMIN_ENABLED === "true";
}

// GET /api/admin/competencies - List competencies with pagination
export async function GET(request: Request) {
  if (!isAdminEnabled()) {
    return NextResponse.json(
      { error: "Admin access is disabled" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const subject = searchParams.get("subject") || undefined;
    const search = searchParams.get("search") || undefined;

    const result = competencyService.getPaginated(page, pageSize, {
      subject,
      searchQuery: search,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error listing competencies:", error);
    return NextResponse.json(
      { error: "Failed to list competencies" },
      { status: 500 }
    );
  }
}

// POST /api/admin/competencies - Create new competency
export async function POST(request: Request) {
  if (!isAdminEnabled()) {
    return NextResponse.json(
      { error: "Admin access is disabled" },
      { status: 403 }
    );
  }

  try {
    const body: CompetencyInput = await request.json();

    // Validate required fields
    if (!body.competency_code || !body.competency_text || !body.topic_id) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existing = competencyService.getByCode(body.competency_code);
    if (existing) {
      return NextResponse.json(
        { error: "Competency code already exists" },
        { status: 409 }
      );
    }

    const id = competencyService.create(body);
    const created = competencyService.getById(id);

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error creating competency:", error);
    return NextResponse.json(
      { error: "Failed to create competency" },
      { status: 500 }
    );
  }
}
