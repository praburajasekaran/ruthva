import { NextResponse } from "next/server";
import { validateIntegrationRequest } from "@/lib/integration-auth";
import { integrationStartJourneySchema } from "@/lib/validations";
import { hashPhone } from "@/lib/crypto";
import { createJourneyWithEvents } from "@/lib/events";
import { db } from "@/lib/db";

/**
 * POST /api/integration/v1/journeys/start
 *
 * Called by Sivanethram to start a treatment journey in Ruthva.
 * Creates patient (if not exists) and journey in a single request.
 *
 * Headers:
 *   X-Ruthva-Secret: shared integration secret
 *   X-Ruthva-Subdomain: clinic subdomain in Sivanethram
 *
 * Body: { patientName, patientPhone, durationDays, followupIntervalDays, consentGiven, externalConsultationId? }
 *
 * Returns:
 *   201: { journeyId, patientId, status, startDate, nextVisitDate }
 *   400: validation error
 *   401: invalid secret
 *   404: clinic not found
 *   409: patient already has active journey
 */
export async function POST(request: Request) {
  // 1. Validate secret + resolve clinic
  const authResult = await validateIntegrationRequest(request);
  if (!authResult.ok) return authResult.response;

  const { clinic } = authResult;

  // 2. Parse and validate body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Bad Request", message: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const parsed = integrationStartJourneySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation Error",
        issues: parsed.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      },
      { status: 400 }
    );
  }

  const {
    patientName,
    patientPhone,
    durationDays,
    followupIntervalDays,
    externalConsultationId,
  } = parsed.data;

  // 3. Resolve or create patient
  const phoneHash = hashPhone(patientPhone);

  let patient = await db.patient.findUnique({
    where: {
      clinicId_phoneHash: {
        clinicId: clinic.id,
        phoneHash,
      },
    },
    include: {
      journeys: {
        where: { status: "active" },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // 4. Check for active journey (409 conflict)
  if (patient && patient.journeys.length > 0) {
    const activeJourney = patient.journeys[0];
    return NextResponse.json(
      {
        error: "Conflict",
        message: "Patient already has an active treatment journey",
        existingJourney: {
          journeyId: activeJourney.id,
          status: activeJourney.status,
          startDate: activeJourney.startDate,
          riskLevel: activeJourney.riskLevel,
        },
      },
      { status: 409 }
    );
  }

  // 5. Create patient if not exists
  if (!patient) {
    patient = await db.patient.create({
      data: {
        clinicId: clinic.id,
        name: patientName,
        phone: patientPhone,
        phoneHash,
        consentGiven: true,
        consentGivenAt: new Date(),
      },
      include: {
        journeys: {
          where: { status: "active" },
          take: 1,
          orderBy: { createdAt: "desc" },
        },
      },
    });
  }

  // 6. Create journey with events
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  const journey = await createJourneyWithEvents({
    patientId: patient.id,
    clinicId: clinic.id,
    startDate,
    durationDays,
    followupIntervalDays,
    metadata: externalConsultationId
      ? { externalConsultationId, source: "sivanethram" }
      : { source: "sivanethram" },
  });

  return NextResponse.json(
    {
      journeyId: journey.id,
      patientId: patient.id,
      status: journey.status,
      startDate: journey.startDate,
      nextVisitDate: journey.nextVisitDate,
    },
    { status: 201 }
  );
}
