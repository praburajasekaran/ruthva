import { NextRequest, NextResponse } from "next/server";
import { sendAdherenceChecks } from "@/lib/cron/send-adherence-checks";
import { sendReminders } from "@/lib/cron/send-reminders";
import { detectMissedVisits } from "@/lib/cron/detect-missed-visits";
import { computeRiskLevels } from "@/lib/cron/compute-risk-levels";
import { triggerRecoveryMessages } from "@/lib/cron/trigger-recovery-messages";
import { completeExpiredJourneys } from "@/lib/cron/complete-expired-journeys";
import { sendWebhooks } from "@/lib/cron/send-webhooks";
import { secretsEqual } from "@/lib/secrets";

/**
 * Nightly cron entry point.
 * Secured with CRON_SECRET header — call from Railway cron or external scheduler.
 *
 * Job order matters:
 * 1. Detect missed visits (updates missedVisits count)
 * 2. Compute risk levels (uses missedVisits + activity data)
 * 3. Trigger recovery messages (acts on at_risk/critical)
 * 4. Complete/drop expired journeys (lifecycle cleanup)
 * 5. Send pre-visit reminders (tomorrow's visits)
 * 6. Send adherence checks (daily engagement)
 * 7. Send webhooks to Sivanethram (aggregate all changes from above)
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");

  if (!secretsEqual(secret, process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  // Collect changed journey IDs for webhook dispatch
  let missedJourneyIds: string[] = [];
  let riskChangedIds: string[] = [];
  let completedJourneyIds: string[] = [];
  let droppedJourneyIds: string[] = [];

  // --- 1. Detect missed visits ---
  try {
    const missed = await detectMissedVisits();
    results.detectMissedVisits = missed;
    missedJourneyIds = missed.missedJourneyIds ?? [];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errors.push(`detectMissedVisits: ${message}`);
    results.detectMissedVisits = { error: message };
  }

  // --- 2. Compute risk levels ---
  try {
    const risk = await computeRiskLevels();
    results.computeRiskLevels = risk;
    riskChangedIds = risk.changedJourneyIds ?? [];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errors.push(`computeRiskLevels: ${message}`);
    results.computeRiskLevels = { error: message };
  }

  // --- 3. Trigger recovery messages ---
  try {
    results.triggerRecoveryMessages = await triggerRecoveryMessages();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errors.push(`triggerRecoveryMessages: ${message}`);
    results.triggerRecoveryMessages = { error: message };
  }

  // --- 4. Complete/drop expired journeys ---
  try {
    const lifecycle = await completeExpiredJourneys();
    results.completeExpiredJourneys = lifecycle;
    completedJourneyIds = lifecycle.completedJourneyIds ?? [];
    droppedJourneyIds = lifecycle.droppedJourneyIds ?? [];
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errors.push(`completeExpiredJourneys: ${message}`);
    results.completeExpiredJourneys = { error: message };
  }

  // --- 5. Send pre-visit reminders ---
  try {
    results.sendReminders = await sendReminders();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errors.push(`sendReminders: ${message}`);
    results.sendReminders = { error: message };
  }

  // --- 6. Send adherence checks ---
  try {
    results.sendAdherenceChecks = await sendAdherenceChecks();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errors.push(`sendAdherenceChecks: ${message}`);
    results.sendAdherenceChecks = { error: message };
  }

  // --- 7. Dispatch webhooks to Sivanethram ---
  try {
    results.sendWebhooks = await sendWebhooks({
      riskChanged: riskChangedIds,
      visitsMissed: missedJourneyIds,
      completed: completedJourneyIds,
      dropped: droppedJourneyIds,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    errors.push(`sendWebhooks: ${message}`);
    results.sendWebhooks = { error: message };
  }

  const duration = Date.now() - startTime;

  return NextResponse.json({
    ok: errors.length === 0,
    duration: `${duration}ms`,
    results,
    ...(errors.length > 0 && { errors }),
  });
}
