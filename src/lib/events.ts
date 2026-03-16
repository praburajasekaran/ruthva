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

export async function createJourneyWithEvents(
  {
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
  },
  options?: {
    metadata?: Record<string, unknown>;
    createdBy?: "system" | "staff" | "patient";
  },
) {
  const metadata = options?.metadata;
  const createdBy = options?.createdBy ?? "staff";

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

    const now = new Date();
    await tx.event.createMany({
      data: [
        {
          journeyId: journey.id,
          eventType: "journey_started",
          eventDate: startDate,
          eventTime: now,
          metadata: { duration: durationDays, interval: followupIntervalDays, ...metadata },
          createdBy,
        },
        ...visitDates.map((date, i) => ({
          journeyId: journey.id,
          eventType: "visit_expected" as const,
          eventDate: date,
          eventTime: now,
          metadata: {
            visit_number: i + 1,
            expected_date: date.toISOString().split("T")[0],
          },
          createdBy: "system",
        })),
      ],
    });

    return journey;
  });
}

/**
 * Staff confirms a patient visited. Updates journey state and creates event.
 */
export async function confirmVisit(journeyId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const journey = await db.journey.findUniqueOrThrow({
    where: { id: journeyId },
  });

  // Find next expected visit date after today
  const nextExpected = await db.event.findFirst({
    where: {
      journeyId,
      eventType: "visit_expected",
      eventDate: { gte: today },
    },
    orderBy: { eventDate: "asc" },
  });

  const nextVisitDate = nextExpected
    ? new Date(
      new Date(nextExpected.eventDate).getTime() +
      journey.followupIntervalDays * 86400000
    )
    : null;

  await db.$transaction(async (tx) => {
    await tx.event.upsert({
      where: {
        journeyId_eventType_eventDate: {
          journeyId,
          eventType: "visit_confirmed",
          eventDate: today,
        },
      },
      update: { metadata: { confirmed_by: "staff" } },
      create: {
        journeyId,
        eventType: "visit_confirmed",
        eventDate: today,
        eventTime: new Date(),
        metadata: { confirmed_by: "staff" },
        createdBy: "staff",
      },
    });

    await tx.journey.update({
      where: { id: journeyId },
      data: {
        lastVisitDate: today,
        nextVisitDate,
        lastActivityAt: new Date(),
        missedVisits: 0,
        riskLevel: "stable",
        riskReason: null,
        riskUpdatedAt: new Date(),
      },
    });
  });
}

/**
 * Staff marks a patient as returned after being at-risk.
 */
export async function markPatientReturned(journeyId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const journey = await db.journey.findUniqueOrThrow({
    where: { id: journeyId },
  });

  const daysAbsent = journey.lastVisitDate
    ? Math.floor(
      (today.getTime() - new Date(journey.lastVisitDate).getTime()) / 86400000
    )
    : 0;

  await db.$transaction(async (tx) => {
    await tx.event.upsert({
      where: {
        journeyId_eventType_eventDate: {
          journeyId,
          eventType: "patient_returned",
          eventDate: today,
        },
      },
      update: { metadata: { days_absent: daysAbsent } },
      create: {
        journeyId,
        eventType: "patient_returned",
        eventDate: today,
        eventTime: new Date(),
        metadata: { days_absent: daysAbsent },
        createdBy: "staff",
      },
    });

    await tx.journey.update({
      where: { id: journeyId },
      data: {
        riskLevel: "stable",
        riskReason: null,
        riskUpdatedAt: new Date(),
        lastVisitDate: today,
        lastActivityAt: new Date(),
        missedVisits: 0,
        recoveryAttempts: 0,
      },
    });
  });
}

/**
 * Creates a journey for a patient who is already mid-treatment.
 * Backdates the journey start and generates events accordingly.
 */
export async function createActivatedJourney({
  patientId,
  clinicId,
  durationDays,
  followupIntervalDays,
  treatmentStartedAgo,
  customStartDate,
  lastVisitStatus,
}: {
  patientId: string;
  clinicId: string;
  durationDays: number;
  followupIntervalDays: number;
  treatmentStartedAgo: "today" | "7days" | "14days" | "21days" | "custom";
  customStartDate?: string;
  lastVisitStatus: "recent" | "unsure" | "overdue";
}) {
  let startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  if (treatmentStartedAgo === "7days") {
    startDate.setDate(startDate.getDate() - 7);
  } else if (treatmentStartedAgo === "14days") {
    startDate.setDate(startDate.getDate() - 14);
  } else if (treatmentStartedAgo === "21days") {
    startDate.setDate(startDate.getDate() - 21);
  } else if (treatmentStartedAgo === "custom" && customStartDate) {
    startDate = new Date(customStartDate);
    startDate.setHours(0, 0, 0, 0);
  }

  const journey = await createJourneyWithEvents({
    patientId,
    clinicId,
    startDate,
    durationDays,
    followupIntervalDays,
  });

  const baseUpdate: Prisma.JourneyUpdateInput = {
    trustWindowActive: true,
    trustWindowStartDate: new Date(),
  };

  // If patient is reported as overdue, boost their risk level immediately
  if (lastVisitStatus === "overdue") {
    await db.journey.update({
      where: { id: journey.id },
      data: {
        ...baseUpdate,
        riskLevel: "at_risk",
        riskReason: "Patient reported as overdue during activation",
        riskUpdatedAt: new Date(),
        missedVisits: 1,
        lastActivityAt: startDate, // Set to start date as a fallback
      },
    });
  } else if (lastVisitStatus === "unsure") {
    await db.journey.update({
      where: { id: journey.id },
      data: {
        ...baseUpdate,
        riskLevel: "watch",
        riskReason: "Recent visit status unsure during activation",
        riskUpdatedAt: new Date(),
      },
    });
  } else {
    await db.journey.update({
      where: { id: journey.id },
      data: baseUpdate,
    });
  }

  return journey;
}
