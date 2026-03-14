import { db } from "../db";
import { createEvent } from "../events";

/**
 * Detect missed visits: expected visit date + 3 grace days passed, no confirmation.
 */
export async function detectMissedVisits() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Grace period: 3 days after expected visit
  const graceCutoff = new Date(today);
  graceCutoff.setDate(graceCutoff.getDate() - 3);

  // Find visit_expected events where date is past grace period
  const expectedVisits = await db.event.findMany({
    where: {
      eventType: "visit_expected",
      eventDate: { lte: graceCutoff },
      journey: { status: "active" },
    },
    include: {
      journey: {
        select: { id: true, clinicId: true },
      },
    },
  });

  let detected = 0;
  const missedJourneyIds: string[] = [];

  for (const expected of expectedVisits) {
    // Check if already confirmed for this date
    const confirmed = await db.event.findFirst({
      where: {
        journeyId: expected.journeyId,
        eventType: "visit_confirmed",
        eventDate: expected.eventDate,
      },
    });

    if (confirmed) continue;

    // Check if already marked as missed for this date
    const alreadyMissed = await db.event.findFirst({
      where: {
        journeyId: expected.journeyId,
        eventType: "visit_missed",
        eventDate: expected.eventDate,
      },
    });

    if (alreadyMissed) continue;

    const daysOverdue = Math.floor(
      (today.getTime() - new Date(expected.eventDate).getTime()) / 86400000
    );

    await createEvent({
      journeyId: expected.journeyId,
      eventType: "visit_missed",
      eventDate: expected.eventDate,
      metadata: { days_overdue: daysOverdue },
      createdBy: "system",
    });

    // Increment missed visits on journey
    await db.journey.update({
      where: { id: expected.journeyId },
      data: {
        missedVisits: { increment: 1 },
      },
    });

    missedJourneyIds.push(expected.journeyId);
    detected++;
  }

  return { detected, checked: expectedVisits.length, missedJourneyIds };
}
