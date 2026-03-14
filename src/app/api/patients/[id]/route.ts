import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPhone } from "@/lib/crypto";
import { updatePatientSchema } from "@/lib/validations";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

  const { id } = await params;
  const patient = await db.patient.findFirst({
    where: { id, clinicId: clinic.id },
    include: {
      journeys: {
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!patient) {
    return NextResponse.json({ error: "Patient not found" }, { status: 404 });
  }

  const body = await request.json();
  const parsed = updatePatientSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const phoneHash = hashPhone(parsed.data.phone);
  const existingPatient = await db.patient.findUnique({
    where: { clinicId_phoneHash: { clinicId: clinic.id, phoneHash } },
  });

  if (existingPatient && existingPatient.id !== patient.id) {
    return NextResponse.json(
      { error: "Patient with this phone number already exists" },
      { status: 409 }
    );
  }

  const activeJourney = patient.journeys[0];

  const updatedPatient = await db.$transaction(async (tx) => {
    const nextPatient = await tx.patient.update({
      where: { id: patient.id },
      data: {
        name: parsed.data.name,
        phone: parsed.data.phone,
        phoneHash,
        consentGiven: parsed.data.consentGiven,
        consentGivenAt: patient.consentGivenAt ?? new Date(),
      },
    });

    if (activeJourney) {
      await tx.journey.update({
        where: { id: activeJourney.id },
        data: {
          durationDays: parsed.data.durationDays,
          followupIntervalDays: parsed.data.followupIntervalDays,
        },
      });
    }

    return nextPatient;
  });

  return NextResponse.json({ patient: updatedPatient });
}
