import { db } from "../db";
import type { RiskLevel } from "@/generated/prisma/client";

/**
 * Compute risk levels for all active journeys.
 *
 * Risk criteria:
 * - Stable: All expected visits confirmed, recent adherence responses
 * - Watch: 1 adherence check ignored OR 1 day past expected visit
 * - At Risk: Visit overdue 3+ days OR 3+ consecutive adherence checks ignored
 * - Critical: Visit overdue 7+ days OR no response for 7+ days after recovery message
 */
export async function computeRiskLevels() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const journeys = await db.journey.findMany({
    where: { status: "active" },
  });

  let updated = 0;

  for (const journey of journeys) {
    const { riskLevel, riskReason } = computeRisk(journey, today);

    if (
      riskLevel !== journey.riskLevel ||
      riskReason !== journey.riskReason
    ) {
      await db.journey.update({
        where: { id: journey.id },
        data: {
          riskLevel,
          riskReason,
          riskUpdatedAt: new Date(),
        },
      });
      updated++;
    }
  }

  return { updated, total: journeys.length };
}

function computeRisk(
  journey: {
    nextVisitDate: Date | null;
    lastActivityAt: Date | null;
    missedVisits: number;
    recoveryAttempts: number;
    riskLevel: RiskLevel;
  },
  today: Date
): { riskLevel: RiskLevel; riskReason: string | null } {
  const nextVisit = journey.nextVisitDate
    ? new Date(journey.nextVisitDate)
    : null;
  const lastActivity = journey.lastActivityAt
    ? new Date(journey.lastActivityAt)
    : null;

  // Days since expected visit (if overdue)
  const daysOverdue = nextVisit
    ? Math.floor((today.getTime() - nextVisit.getTime()) / 86400000)
    : 0;

  // Days since last activity
  const daysSinceActivity = lastActivity
    ? Math.floor((today.getTime() - lastActivity.getTime()) / 86400000)
    : 999;

  // Critical: visit overdue 7+ days OR no response 7+ days after recovery message
  if (daysOverdue >= 7 || (journey.recoveryAttempts >= 2 && daysSinceActivity >= 7)) {
    return {
      riskLevel: "critical",
      riskReason:
        daysOverdue >= 7
          ? `Follow-up overdue by ${daysOverdue} days, no response`
          : `No response after ${journey.recoveryAttempts} recovery messages`,
    };
  }

  // At Risk: visit overdue 3+ days OR 3+ missed visits
  if (daysOverdue >= 3 || journey.missedVisits >= 3) {
    return {
      riskLevel: "at_risk",
      riskReason:
        daysOverdue >= 3
          ? `Follow-up overdue by ${daysOverdue} days`
          : `${journey.missedVisits} missed visits`,
    };
  }

  // Watch: 1 day past expected visit OR 1 missed visit
  if (daysOverdue >= 1 || journey.missedVisits >= 1) {
    return {
      riskLevel: "watch",
      riskReason:
        daysOverdue >= 1
          ? `Follow-up overdue by ${daysOverdue} day${daysOverdue > 1 ? "s" : ""}`
          : `${journey.missedVisits} missed visit${journey.missedVisits > 1 ? "s" : ""}`,
    };
  }

  // Stable
  return { riskLevel: "stable", riskReason: null };
}
