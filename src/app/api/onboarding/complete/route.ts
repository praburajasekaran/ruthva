import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createClinicSchema, createPatientSchema } from "@/lib/validations";
import { hashPhone } from "@/lib/crypto";
import { createJourneyWithEvents } from "@/lib/events";

/**
 * Combined onboarding: create clinic + first patient in one request.
 * Called at the end of the 5-step onboarding flow.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Ensure no clinic exists yet
  const existingClinic = await db.clinic.findUnique({
    where: { userId: session.user.id },
  });
  if (existingClinic) {
    return NextResponse.json(
      { error: "Clinic already exists" },
      { status: 409 }
    );
  }

  const body = await request.json();

  const clinicParsed = createClinicSchema.safeParse(body.clinic);
  if (!clinicParsed.success) {
    return NextResponse.json(
      { error: clinicParsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const patientParsed = createPatientSchema.safeParse(body.patient);
  if (!patientParsed.success) {
    return NextResponse.json(
      { error: patientParsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const phoneHash = hashPhone(patientParsed.data.phone);

  // Create clinic
  const clinic = await db.clinic.create({
    data: {
      userId: session.user.id,
      name: clinicParsed.data.name,
      doctorName: clinicParsed.data.doctorName,
      whatsappNumber: clinicParsed.data.whatsappNumber,
    },
  });

  // Create first patient
  const patient = await db.patient.create({
    data: {
      clinicId: clinic.id,
      name: patientParsed.data.name,
      phone: patientParsed.data.phone,
      phoneHash,
      consentGiven: patientParsed.data.consentGiven,
      consentGivenAt: new Date(),
    },
  });

  // Create journey + events
  const journey = await createJourneyWithEvents({
    patientId: patient.id,
    clinicId: clinic.id,
    startDate: new Date(),
    durationDays: patientParsed.data.durationDays,
    followupIntervalDays: patientParsed.data.followupIntervalDays,
  });

  return NextResponse.json({ clinic, patient, journey }, { status: 201 });
}
