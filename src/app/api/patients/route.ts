import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createPatientSchema } from "@/lib/validations";
import { hashPhone } from "@/lib/crypto";
import { createJourneyWithEvents } from "@/lib/events";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clinic = await db.clinic.findUnique({
    where: { userId: session.user.id },
  });
  if (!clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = createPatientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const phoneHash = hashPhone(parsed.data.phone);

  // Check for existing patient (same phone in same clinic)
  const existing = await db.patient.findUnique({
    where: { clinicId_phoneHash: { clinicId: clinic.id, phoneHash } },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Patient with this phone number already exists" },
      { status: 409 }
    );
  }

  // Check one active journey per patient won't be violated
  // (new patient, so no existing journeys — safe to proceed)

  const patient = await db.patient.create({
    data: {
      clinicId: clinic.id,
      name: parsed.data.name,
      phone: parsed.data.phone,
      phoneHash,
      consentGiven: parsed.data.consentGiven,
      consentGivenAt: new Date(),
    },
  });

  // Create journey + events in a transaction
  const journey = await createJourneyWithEvents({
    patientId: patient.id,
    clinicId: clinic.id,
    startDate: new Date(),
    durationDays: parsed.data.durationDays,
    followupIntervalDays: parsed.data.followupIntervalDays,
  });

  return NextResponse.json({ patient, journey }, { status: 201 });
}
