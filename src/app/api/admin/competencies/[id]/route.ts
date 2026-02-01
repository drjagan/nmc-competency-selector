import { NextResponse } from "next/server";
import { competencyService } from "@/services/competencyService";
import type { CompetencyInput } from "@/types";

// Check admin access
function isAdminEnabled(): boolean {
  return process.env.ADMIN_ENABLED === "true";
}

// GET /api/admin/competencies/[id] - Get single competency
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminEnabled()) {
    return NextResponse.json(
      { error: "Admin access is disabled" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const competencyId = parseInt(id);

    if (isNaN(competencyId)) {
      return NextResponse.json(
        { error: "Invalid competency ID" },
        { status: 400 }
      );
    }

    const competency = competencyService.getById(competencyId);
    if (!competency) {
      return NextResponse.json(
        { error: "Competency not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(competency);
  } catch (error) {
    console.error("Error fetching competency:", error);
    return NextResponse.json(
      { error: "Failed to fetch competency" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/competencies/[id] - Update competency
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminEnabled()) {
    return NextResponse.json(
      { error: "Admin access is disabled" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const competencyId = parseInt(id);

    if (isNaN(competencyId)) {
      return NextResponse.json(
        { error: "Invalid competency ID" },
        { status: 400 }
      );
    }

    const existing = competencyService.getById(competencyId);
    if (!existing) {
      return NextResponse.json(
        { error: "Competency not found" },
        { status: 404 }
      );
    }

    const body: Partial<CompetencyInput> = await request.json();

    competencyService.update(competencyId, body);
    const updated = competencyService.getById(competencyId);

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating competency:", error);
    return NextResponse.json(
      { error: "Failed to update competency" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/competencies/[id] - Soft delete competency
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminEnabled()) {
    return NextResponse.json(
      { error: "Admin access is disabled" },
      { status: 403 }
    );
  }

  try {
    const { id } = await params;
    const competencyId = parseInt(id);

    if (isNaN(competencyId)) {
      return NextResponse.json(
        { error: "Invalid competency ID" },
        { status: 400 }
      );
    }

    const existing = competencyService.getById(competencyId);
    if (!existing) {
      return NextResponse.json(
        { error: "Competency not found" },
        { status: 404 }
      );
    }

    competencyService.delete(competencyId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting competency:", error);
    return NextResponse.json(
      { error: "Failed to delete competency" },
      { status: 500 }
    );
  }
}
