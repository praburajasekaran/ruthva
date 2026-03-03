import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { activatePatientSchema } from "@/lib/validations";
import { hashPhone } from "@/lib/crypto";
import { createActivatedJourney } from "@/lib/events";

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

    try {
        const body = await request.json();
        const parsed = activatePatientSchema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json(
                { error: parsed.error.issues[0].message },
                { status: 400 }
            );
        }

        const phoneHash = hashPhone(parsed.data.phone);

        // Check for existing patient (same phone in same clinic)
        let patient = await db.patient.findUnique({
            where: { clinicId_phoneHash: { clinicId: clinic.id, phoneHash } },
        });

        if (patient) {
            // Check for active journeys
            const hasActive = await db.journey.findFirst({
                where: { patientId: patient.id, status: "active" },
            });
            if (hasActive) {
                return NextResponse.json(
                    { error: "Patient already has an active monitoring journey" },
                    { status: 409 }
                );
            }
        } else {
            // Create new patient if doesn't exist
            patient = await db.patient.create({
                data: {
                    clinicId: clinic.id,
                    name: parsed.data.name,
                    phone: parsed.data.phone,
                    phoneHash,
                    consentGiven: parsed.data.consentGiven,
                    consentGivenAt: new Date(),
                },
            });
        }

        // Create activated journey + events
        const journey = await createActivatedJourney({
            patientId: patient.id,
            clinicId: clinic.id,
            durationDays: parsed.data.durationDays,
            followupIntervalDays: parsed.data.followupIntervalDays,
            treatmentStartedAgo: parsed.data.treatmentStartedAgo,
            customStartDate: parsed.data.customStartDate,
            lastVisitStatus: parsed.data.lastVisitStatus,
        });

        return NextResponse.json({ patient, journey, atRisk: journey.riskLevel !== "stable" }, { status: 201 });
    } catch (err) {
        console.error("Activation error:", err);
        return NextResponse.json({ error: "Failed to activate patient" }, { status: 500 });
    }
}
