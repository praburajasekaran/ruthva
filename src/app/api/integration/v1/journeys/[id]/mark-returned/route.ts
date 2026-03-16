import { NextResponse } from "next/server";
import { validateIntegrationRequest } from "@/lib/integration-auth";
import { markPatientReturned } from "@/lib/events";
import { db } from "@/lib/db";

/**
 * POST /api/integration/v1/journeys/[id]/mark-returned
 *
 * Called by Sivanethram when a patient who was at-risk has returned.
 * Delegates to the existing markPatientReturned() function.
 *
 * Headers:
 *   X-Ruthva-Secret: shared integration secret
 *   X-Ruthva-Subdomain: clinic subdomain in Sivanethram
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await validateIntegrationRequest(request);
  if (!authResult.ok) return authResult.response;

  const { id: journeyId } = await params;

  // Verify journey exists and belongs to this clinic
  const journey = await db.journey.findUnique({
    where: { id: journeyId },
    select: { id: true, clinicId: true, status: true, riskLevel: true },
  });

  if (!journey) {
    return NextResponse.json(
      { error: "Not Found", message: "Journey not found" },
      { status: 404 }
    );
  }

  if (journey.clinicId !== authResult.clinic.id) {
    return NextResponse.json(
      { error: "Forbidden", message: "Journey does not belong to this clinic" },
      { status: 403 }
    );
  }

  if (journey.status !== "active") {
    return NextResponse.json(
      { error: "Conflict", message: `Journey is ${journey.status}, not active` },
      { status: 409 }
    );
  }

  await markPatientReturned(journeyId);

  // Return updated journey
  const updated = await db.journey.findUniqueOrThrow({
    where: { id: journeyId },
    select: {
      id: true,
      status: true,
      riskLevel: true,
      lastVisitDate: true,
      nextVisitDate: true,
      missedVisits: true,
    },
  });

  return NextResponse.json(updated);
}
