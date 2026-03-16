import { NextResponse } from "next/server";
import { validateIntegrationRequest } from "@/lib/integration-auth";
import { integrationStartJourneySchema } from "@/lib/validations";
import { hashPhone } from "@/lib/crypto";
import { createJourneyWithEvents } from "@/lib/events";
import { db } from "@/lib/db";

// ──────────────────────────────────────────────────────────────────────────────
// Sivanethram Institutional Learnings Applied to This Integration
//
// These patterns come from documented solutions in the Sivanethram codebase
// (study-abroad-service/docs/solutions/). Future developers should review
// these before modifying integration code.
//
// 1. URL Pattern Shadowing (docs/solutions/logic-errors/django-duplicate-url-pattern-shadowing-405.md)
//    - All integration routes live under /api/integration/v1/ to avoid
//      shadowing the existing /api/journeys/ routes.
//    - Next.js App Router uses file-based routing which prevents same-path
//      conflicts, but the distinct prefix remains important for clarity and
//      for the Django (Sivanethram) side which IS vulnerable to shadowing.
//
// 2. SSRF Allowlist (docs/solutions/security-issues/weasyprint-logo-url-ssrf-allowlist-mitigation.md)
//    - Webhook URL uses env var SIVANETHRAM_WEBHOOK_URL (not DB-stored per-clinic URL).
//    - Fire-time SSRF validation added in src/lib/webhook.ts: blocks private IPs,
//      requires HTTPS in production. See isAllowedWebhookUrl().
//    - Per-clinic webhook URLs deferred to V2 with full SSRF validation.
//
// 3. Transaction Safety (docs/solutions/best-practices/treatment-block-workflow-best-practices.md)
//    - All state-changing operations (journey creation, visit confirmation,
//      patient return) use Prisma $transaction() for race-free state transitions.
//    - See src/lib/events.ts: createJourneyWithEvents(), confirmVisit(), markPatientReturned().
//
// 4. WhatsApp Webhook Pattern
//    - Inbound WhatsApp webhook (src/app/api/webhooks/whatsapp/route.ts) returns
//      200 immediately after lightweight processing, per Meta best practices and
//      Sivanethram institutional guidance.
// ──────────────────────────────────────────────────────────────────────────────

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
 * Body: { patientName, patientPhone, durationDays, followupIntervalDays, consentGiven, consentTimestamp, consentMethod, consentCapturedBy, externalConsultationId? }
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
    consentTimestamp,
    consentMethod,
    consentCapturedBy,
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
        consentGivenAt: consentTimestamp ? new Date(consentTimestamp) : new Date(),
        consentMethod,
        consentCapturedBy,
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

  const journey = await createJourneyWithEvents(
    {
      patientId: patient.id,
      clinicId: clinic.id,
      startDate,
      durationDays,
      followupIntervalDays,
    },
    {
      metadata: {
        source: "sivanethram",
        ...(externalConsultationId && { externalConsultationId }),
        consentAudit: {
          consentTimestamp,
          consentMethod,
          consentCapturedBy,
        },
      },
      createdBy: "system",
    },
  );

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
