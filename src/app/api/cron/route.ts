import { NextRequest, NextResponse } from "next/server";
import { sendAdherenceChecks } from "@/lib/cron/send-adherence-checks";
import { sendReminders } from "@/lib/cron/send-reminders";
import { detectMissedVisits } from "@/lib/cron/detect-missed-visits";
import { computeRiskLevels } from "@/lib/cron/compute-risk-levels";
import { triggerRecoveryMessages } from "@/lib/cron/trigger-recovery-messages";
import { completeExpiredJourneys } from "@/lib/cron/complete-expired-journeys";

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
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startTime = Date.now();
  const results: Record<string, unknown> = {};
  const errors: string[] = [];

  // Run jobs in dependency order
  const jobs = [
    { name: "detectMissedVisits", fn: detectMissedVisits },
    { name: "computeRiskLevels", fn: computeRiskLevels },
    { name: "triggerRecoveryMessages", fn: triggerRecoveryMessages },
    { name: "completeExpiredJourneys", fn: completeExpiredJourneys },
    { name: "sendReminders", fn: sendReminders },
    { name: "sendAdherenceChecks", fn: sendAdherenceChecks },
  ];

  for (const job of jobs) {
    try {
      results[job.name] = await job.fn();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      errors.push(`${job.name}: ${message}`);
      results[job.name] = { error: message };
    }
  }

  const duration = Date.now() - startTime;

  return NextResponse.json({
    ok: errors.length === 0,
    duration: `${duration}ms`,
    results,
    ...(errors.length > 0 && { errors }),
  });
}
