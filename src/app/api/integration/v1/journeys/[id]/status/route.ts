import { NextResponse } from "next/server";
import { validateIntegrationRequest } from "@/lib/integration-auth";
import { db } from "@/lib/db";

/**
 * GET /api/integration/v1/journeys/[id]/status
 *
 * Called by Sivanethram to poll journey status.
 * Returns journey details including risk level, events, and visit info.
 *
 * Headers:
 *   X-Ruthva-Secret: shared integration secret
 *   X-Ruthva-Subdomain: clinic subdomain in Sivanethram
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await validateIntegrationRequest(request);
  if (!authResult.ok) return authResult.response;

  const { id: journeyId } = await params;

  const journey = await db.journey.findUnique({
    where: { id: journeyId },
    include: {
      patient: {
        select: { id: true, name: true },
      },
      events: {
        orderBy: { eventTime: "desc" },
        take: 20,
        select: {
          id: true,
          eventType: true,
          eventDate: true,
          eventTime: true,
          metadata: true,
          createdBy: true,
        },
      },
    },
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

  return NextResponse.json({
    journeyId: journey.id,
    patientId: journey.patientId,
    patientName: journey.patient.name,
    status: journey.status,
    riskLevel: journey.riskLevel,
    riskReason: journey.riskReason,
    startDate: journey.startDate,
    durationDays: journey.durationDays,
    followupIntervalDays: journey.followupIntervalDays,
    lastVisitDate: journey.lastVisitDate,
    nextVisitDate: journey.nextVisitDate,
    missedVisits: journey.missedVisits,
    lastActivityAt: journey.lastActivityAt,
    recentEvents: journey.events,
  });
}
