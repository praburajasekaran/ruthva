import { NextResponse } from "next/server";
import { validateIntegrationRequest } from "@/lib/integration-auth";
import { db } from "@/lib/db";

const MAX_EVENTS_PER_PAGE = 100;

/**
 * GET /api/integration/v1/journeys/events
 *
 * Reconciliation endpoint for Sivanethram to poll for missed webhook events.
 * Returns events created after the given timestamp, scoped to the authenticated clinic.
 *
 * Headers:
 *   X-Ruthva-Secret: shared integration secret
 *   X-Ruthva-Subdomain: clinic subdomain in Sivanethram
 *
 * Query params:
 *   since  (required) - ISO 8601 timestamp; only events created after this are returned
 *   cursor (optional) - event ID for cursor-based pagination (returned as `nextCursor`)
 *
 * Returns:
 *   200: { events: [...], nextCursor: string | null, hasMore: boolean }
 *   400: missing or invalid `since` param
 *   401: invalid secret
 *   404: clinic not found
 */
export async function GET(request: Request) {
  // 1. Validate secret + resolve clinic
  const authResult = await validateIntegrationRequest(request);
  if (!authResult.ok) return authResult.response;

  const { clinic } = authResult;

  // 2. Parse query params
  const { searchParams } = new URL(request.url);

  const sinceParam = searchParams.get("since");
  if (!sinceParam) {
    return NextResponse.json(
      { error: "Bad Request", message: "Missing required query param: since" },
      { status: 400 }
    );
  }

  const sinceDate = new Date(sinceParam);
  if (isNaN(sinceDate.getTime())) {
    return NextResponse.json(
      {
        error: "Bad Request",
        message: "Invalid ISO 8601 timestamp for 'since' param",
      },
      { status: 400 }
    );
  }

  const cursor = searchParams.get("cursor") ?? undefined;

  // 3. Query events for this clinic's journeys, created after `since`
  const events = await db.event.findMany({
    where: {
      createdAt: { gt: sinceDate },
      journey: { clinicId: clinic.id },
    },
    orderBy: { createdAt: "asc" },
    take: MAX_EVENTS_PER_PAGE + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: {
      id: true,
      journeyId: true,
      eventType: true,
      eventDate: true,
      eventTime: true,
      metadata: true,
      createdBy: true,
      createdAt: true,
      journey: {
        select: {
          id: true,
          patientId: true,
          status: true,
          riskLevel: true,
        },
      },
    },
  });

  // 4. Determine pagination
  const hasMore = events.length > MAX_EVENTS_PER_PAGE;
  const page = hasMore ? events.slice(0, MAX_EVENTS_PER_PAGE) : events;
  const nextCursor = hasMore ? page[page.length - 1].id : null;

  return NextResponse.json({
    events: page.map((e) => ({
      id: e.id,
      journeyId: e.journeyId,
      eventType: e.eventType,
      eventDate: e.eventDate,
      eventTime: e.eventTime,
      metadata: e.metadata,
      createdBy: e.createdBy,
      createdAt: e.createdAt,
      journey: e.journey,
    })),
    nextCursor,
    hasMore,
  });
}
