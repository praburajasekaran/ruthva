import { db } from "../db";
import { sendPreVisitReminder } from "../gupshup";

/**
 * Send pre-visit reminders 1 day before expected visit date.
 */
export async function sendReminders() {
  const tomorrow = new Date();
  tomorrow.setHours(0, 0, 0, 0);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find active journeys with a visit expected tomorrow
  const journeys = await db.journey.findMany({
    where: {
      status: "active",
      nextVisitDate: tomorrow,
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

    await sendPreVisitReminder({
      journeyId: journey.id,
      patientPhone: journey.patient.phone,
      clinicName: journey.clinic.name,
    });

    sent++;
  }

  return { sent, skipped, total: journeys.length };
}
