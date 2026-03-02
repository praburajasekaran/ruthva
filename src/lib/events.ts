import { db } from "./db";
import { EventType, Prisma } from "@/generated/prisma/client";

type EventMetadata = Prisma.InputJsonValue;

interface CreateEventInput {
  journeyId: string;
  eventType: EventType;
  eventDate: Date;
  metadata?: EventMetadata;
  createdBy: "system" | "staff" | "patient";
}

export async function createEvent({
  journeyId,
  eventType,
  eventDate,
  metadata = {},
  createdBy,
}: CreateEventInput) {
  return db.event.upsert({
    where: {
      journeyId_eventType_eventDate: {
        journeyId,
        eventType,
        eventDate,
      },
    },
    update: {
      metadata,
    },
    create: {
      journeyId,
      eventType,
      eventDate,
      eventTime: new Date(),
      metadata,
      createdBy,
    },
  });
}

export async function createJourneyWithEvents({
  patientId,
  clinicId,
  startDate,
  durationDays,
  followupIntervalDays,
}: {
  patientId: string;
  clinicId: string;
  startDate: Date;
  durationDays: number;
  followupIntervalDays: number;
}) {
  // Calculate expected visit dates
  const visitDates: Date[] = [];
  const start = new Date(startDate);
  let currentDate = new Date(start);
  currentDate.setDate(currentDate.getDate() + followupIntervalDays);

  const endDate = new Date(start);
  endDate.setDate(endDate.getDate() + durationDays);

  while (currentDate <= endDate) {
    visitDates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + followupIntervalDays);
  }

  // First visit date is the next expected visit
  const nextVisitDate = visitDates.length > 0 ? visitDates[0] : null;

  return db.$transaction(async (tx) => {
    const journey = await tx.journey.create({
      data: {
        patientId,
        clinicId,
        startDate,
        durationDays,
        followupIntervalDays,
        status: "active",
        riskLevel: "stable",
        nextVisitDate,
        lastVisitDate: startDate,
      },
    });

    // Create journey_started event
    await tx.event.create({
      data: {
        journeyId: journey.id,
        eventType: "journey_started",
        eventDate: startDate,
        eventTime: new Date(),
        metadata: { duration: durationDays, interval: followupIntervalDays },
        createdBy: "staff",
      },
    });

    // Create visit_expected events for all scheduled visits
    for (let i = 0; i < visitDates.length; i++) {
      await tx.event.create({
        data: {
          journeyId: journey.id,
          eventType: "visit_expected",
          eventDate: visitDates[i],
          eventTime: new Date(),
          metadata: {
            visit_number: i + 1,
            expected_date: visitDates[i].toISOString().split("T")[0],
          },
          createdBy: "system",
        },
      });
    }

    return journey;
  });
}
