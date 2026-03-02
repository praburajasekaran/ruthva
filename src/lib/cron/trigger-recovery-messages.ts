import { db } from "../db";
import { sendRecoveryMessage } from "../whatsapp";

/**
 * Trigger recovery messages for at-risk patients.
 *
 * Escalation policy:
 * - 1st recovery: when patient first becomes at_risk
 * - 2nd recovery: 3 days after 1st was ignored
 * - After 2nd ignored: mark critical, stop messaging (notify doctor via dashboard only)
 * - Max 2 recovery messages per missed-visit cycle
 */
export async function triggerRecoveryMessages() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const journeys = await db.journey.findMany({
    where: {
      status: "active",
      riskLevel: { in: ["at_risk", "critical"] },
      recoveryAttempts: { lt: 2 },
    },
    include: {
      patient: {
        select: { phone: true, consentGiven: true },
      },
      clinic: {
        select: { name: true },
      },
    },
  });

  let sent = 0;
  let skipped = 0;

  for (const journey of journeys) {
    if (!journey.patient.consentGiven) {
      skipped++;
      continue;
    }

    // Check if any message already sent today
    const alreadySentToday = await db.event.findFirst({
      where: {
        journeyId: journey.id,
        eventDate: today,
        eventType: {
          in: [
            "adherence_check_sent",
            "reminder_sent",
            "recovery_message_sent",
          ],
        },
      },
    });

    if (alreadySentToday) {
      skipped++;
      continue;
    }

    // For 2nd attempt, check 3 days have passed since 1st
    if (journey.recoveryAttempts === 1) {
      const lastRecovery = await db.event.findFirst({
        where: {
          journeyId: journey.id,
          eventType: "recovery_message_sent",
        },
        orderBy: { eventTime: "desc" },
      });

      if (lastRecovery) {
        const daysSinceRecovery = Math.floor(
          (today.getTime() - new Date(lastRecovery.eventTime).getTime()) /
            86400000
        );
        if (daysSinceRecovery < 3) {
          skipped++;
          continue;
        }
      }
    }

    const attemptNumber = journey.recoveryAttempts + 1;

    await sendRecoveryMessage({
      journeyId: journey.id,
      patientPhone: journey.patient.phone,
      clinicName: journey.clinic.name,
      attemptNumber,
    });

    // Update recovery attempts
    await db.journey.update({
      where: { id: journey.id },
      data: { recoveryAttempts: attemptNumber },
    });

    sent++;
  }

  return { sent, skipped, total: journeys.length };
}
