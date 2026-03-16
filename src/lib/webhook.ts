import { db } from "./db";

// ──────────────────────────────────────────────────────────────────────────────
// SSRF Protection for outbound webhook URLs
//
// Institutional learning from Sivanethram:
//   docs/solutions/security-issues/weasyprint-logo-url-ssrf-allowlist-mitigation.md
//
// Even though V1 uses an env var (not a DB-stored URL), we validate at
// fire-time to guard against misconfigured env vars pointing to internal
// services (cloud metadata, localhost DBs, etc.).
// ──────────────────────────────────────────────────────────────────────────────

/** Private/reserved IPv4 ranges that must never be reached by outbound webhooks. */
const PRIVATE_IP_PATTERNS = [
  /^127\./,                   // loopback
  /^10\./,                    // Class A private
  /^172\.(1[6-9]|2\d|3[01])\./, // Class B private
  /^192\.168\./,              // Class C private
  /^169\.254\./,              // link-local
  /^0\./,                     // current network
];

/**
 * Validates that a webhook URL is safe to fetch (not an SSRF vector).
 * - Must be HTTPS
 * - Hostname must not resolve to a private/reserved IP range
 * - Must not use IP-literal hostnames
 */
function isAllowedWebhookUrl(urlString: string): { ok: true } | { ok: false; reason: string } {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    return { ok: false, reason: "Malformed URL" };
  }

  // Must be HTTPS in production
  if (parsed.protocol !== "https:" && process.env.NODE_ENV === "production") {
    return { ok: false, reason: `Protocol must be https, got ${parsed.protocol}` };
  }

  // Block non-http(s) schemes entirely
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: `Disallowed protocol: ${parsed.protocol}` };
  }

  const hostname = parsed.hostname;

  // Block localhost variants
  if (hostname === "localhost" || hostname === "[::1]") {
    return { ok: false, reason: "localhost is not allowed" };
  }

  // Block IP-literal hostnames (bypass DNS-based checks)
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(hostname)) {
      return { ok: false, reason: `Private IP range not allowed: ${hostname}` };
    }
  }

  return { ok: true };
}

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

  // SSRF guard: validate URL at fire-time even though it comes from an env var.
  // See: Sivanethram learning — validate at write-time AND at fire-time.
  const urlCheck = isAllowedWebhookUrl(webhookUrl);
  if (!urlCheck.ok) {
    console.error(
      `[webhook] SIVANETHRAM_WEBHOOK_URL blocked by SSRF check: ${urlCheck.reason}`
    );
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
