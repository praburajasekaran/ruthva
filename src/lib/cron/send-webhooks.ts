import { notifyJourneyChange, type WebhookEventType } from "../webhook";

/**
 * Dispatch webhooks for all journey changes detected during the cron run.
 *
 * Receives aggregated journey IDs from prior cron jobs and sends
 * fire-and-forget webhooks to Sivanethram. Deduplicates journey IDs
 * so each journey only triggers one webhook per event type.
 *
 * Runs as the LAST job in the cron pipeline — all state changes
 * (risk levels, missed visits, completions) are finalized before dispatch.
 */
export async function sendWebhooks(changes: {
  riskChanged: string[];
  visitsMissed: string[];
  completed: string[];
  dropped: string[];
}) {
  let sent = 0;
  let failed = 0;

  // Deduplicate: a journey that had a risk change AND a missed visit
  // gets one risk_level_changed webhook (which carries all current state)
  const dispatched = new Set<string>();

  const dispatch = async (ids: string[], eventType: WebhookEventType) => {
    for (const journeyId of ids) {
      const key = `${journeyId}:${eventType}`;
      if (dispatched.has(key)) continue;
      dispatched.add(key);

      const ok = await notifyJourneyChange(journeyId, eventType);
      if (ok) {
        sent++;
      } else {
        failed++;
      }
    }
  };

  // Terminal events first (most important for Sivanethram state)
  await dispatch(changes.completed, "journey_completed");
  await dispatch(changes.dropped, "journey_dropped");

  // Risk changes (skip if journey already got a terminal event)
  const terminalIds = new Set([...changes.completed, ...changes.dropped]);
  const riskOnly = changes.riskChanged.filter((id) => !terminalIds.has(id));
  await dispatch(riskOnly, "risk_level_changed");

  // Missed visits (skip if already covered by risk change or terminal)
  const alreadyCovered = new Set([...riskOnly, ...changes.completed, ...changes.dropped]);
  const missedOnly = changes.visitsMissed.filter((id) => !alreadyCovered.has(id));
  await dispatch(missedOnly, "visit_missed");

  return { sent, failed, total: dispatched.size };
}
