import { db } from "./db";

/**
 * Webhook event types sent from Ruthva to Sivanethram.
 *
 * V1 keeps it simple — two categories:
 * 1. journey_status_changed: risk level changed, visit missed, any state update
 * 2. journey_completed / journey_dropped: terminal lifecycle events
 */

export type WebhookEventType =
  | "risk_level_changed"
  | "visit_missed"
  | "journey_completed"
  | "journey_dropped";

export interface WebhookPayload {
  event_type: WebhookEventType;
  journey_id: string;
  event_id: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Fire-and-forget webhook sender.
 * Sends a POST to the configured Sivanethram webhook URL with X-Ruthva-Secret.
 * Logs failures but never throws — cron must not halt on webhook errors.
 */
export async function sendWebhook(payload: WebhookPayload): Promise<boolean> {
  const webhookUrl = process.env.SIVANETHRAM_WEBHOOK_URL;
  const secret = process.env.RUTHVA_INTEGRATION_SECRET;

  if (!webhookUrl) {
    // Webhook not configured — skip silently (single-tenant Ruthva installs)
    return false;
  }

  if (!secret) {
    console.error("[webhook] RUTHVA_INTEGRATION_SECRET not set, skipping");
    return false;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Ruthva-Secret": secret,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    if (!response.ok) {
      console.error(
        `[webhook] ${payload.event_type} for journey ${payload.journey_id}: HTTP ${response.status}`
      );
      return false;
    }

    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(
      `[webhook] ${payload.event_type} for journey ${payload.journey_id}: ${message}`
    );
    return false;
  }
}

/**
 * Build and send a webhook for a journey state change.
 * Fetches current journey state from DB and dispatches the appropriate event.
 */
export async function notifyJourneyChange(
  journeyId: string,
  eventType: WebhookEventType
): Promise<boolean> {
  const journey = await db.journey.findUnique({
    where: { id: journeyId },
    select: {
      id: true,
      status: true,
      riskLevel: true,
      riskReason: true,
      nextVisitDate: true,
      lastVisitDate: true,
      missedVisits: true,
      lastActivityAt: true,
    },
  });

  if (!journey) return false;

  return sendWebhook({
    event_type: eventType,
    journey_id: journey.id,
    event_id: `${eventType}_${journey.id}_${Date.now()}`,
    timestamp: new Date().toISOString(),
    data: {
      status: journey.status,
      riskLevel: journey.riskLevel,
      riskReason: journey.riskReason,
      nextVisitDate: journey.nextVisitDate,
      lastVisitDate: journey.lastVisitDate,
      missedVisits: journey.missedVisits,
      lastActivityAt: journey.lastActivityAt,
    },
  });
}
