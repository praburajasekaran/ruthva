import { db } from "../db";
import { sendAdherenceCheck } from "../whatsapp";

/**
 * Send daily adherence checks to active patients.
 * Cadence: Days 1-21 = daily, Days 22+ = every 2 days.
 * Skip if pre-visit reminder was sent same day.
 * Max 1 message per patient per day.
 */
export async function sendAdherenceChecks() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get all active journeys with consent
  const journeys = await db.journey.findMany({
    where: {
      status: "active",
      clinic: { user: { deactivatedAt: null } },
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

    // Calculate day number in treatment
    const dayNumber = Math.floor(
      (today.getTime() - new Date(journey.startDate).getTime()) / 86400000
    );

    // Cadence: daily for first 21 days, every 2 days after
    // bypassed completely if trustWindowActive is true
    if (!journey.trustWindowActive) {
      if (dayNumber < 1) {
        skipped++;
        continue;
      }

      if (dayNumber > 21 && dayNumber % 2 !== 0) {
        skipped++;
        continue;
      }
    }

    // Check if any message already sent today (adherence, reminder, recovery)
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

    await sendAdherenceCheck({
      journeyId: journey.id,
      patientPhone: journey.patient.phone,
      clinicName: journey.clinic.name,
    });

    sent++;
  }

  return { sent, skipped, total: journeys.length };
}
