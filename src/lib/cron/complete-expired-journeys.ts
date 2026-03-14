import { db } from "../db";

/**
 * Auto-complete journeys past their duration date.
 * Auto-drop journeys with 14+ consecutive days at critical with no response.
 */
export async function completeExpiredJourneys() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let completed = 0;
  let dropped = 0;
  const completedJourneyIds: string[] = [];
  const droppedJourneyIds: string[] = [];

  // Auto-complete: today >= startDate + durationDays
  const expiredJourneys = await db.journey.findMany({
    where: { status: "active" },
  });

  for (const journey of expiredJourneys) {
    const endDate = new Date(journey.startDate);
    endDate.setDate(endDate.getDate() + journey.durationDays);

    if (today >= endDate) {
      await db.journey.update({
        where: { id: journey.id },
        data: { status: "completed" },
      });
      completedJourneyIds.push(journey.id);
      completed++;
      continue;
    }

    // Auto-drop: critical for 14+ days with no response
    if (
      journey.riskLevel === "critical" &&
      journey.riskUpdatedAt
    ) {
      const daysCritical = Math.floor(
        (today.getTime() - new Date(journey.riskUpdatedAt).getTime()) /
          86400000
      );
      if (daysCritical >= 14) {
        await db.journey.update({
          where: { id: journey.id },
          data: { status: "dropped" },
        });
        droppedJourneyIds.push(journey.id);
        dropped++;
      }
    }
  }

  return { completed, dropped, checked: expiredJourneys.length, completedJourneyIds, droppedJourneyIds };
}
