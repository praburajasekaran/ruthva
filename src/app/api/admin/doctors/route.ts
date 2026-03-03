import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
    await requireAdmin();

    const users = await db.user.findMany({
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
            deactivatedAt: true,
            clinic: {
                select: {
                    id: true,
                    name: true,
                    doctorName: true,
                    whatsappNumber: true,
                    email: true,
                    _count: {
                        select: { patients: true },
                    },
                    journeys: {
                        select: { status: true },
                    },
                },
            },
        },
    });

    const doctors = users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        isActive: !u.deactivatedAt,
        deactivatedAt: u.deactivatedAt,
        clinic: u.clinic
            ? {
                id: u.clinic.id,
                name: u.clinic.name,
                doctorName: u.clinic.doctorName,
                whatsappNumber: u.clinic.whatsappNumber,
                email: u.clinic.email,
                patientCount: u.clinic._count.patients,
                activeJourneys: u.clinic.journeys.filter(
                    (j) => j.status === "active"
                ).length,
                completedJourneys: u.clinic.journeys.filter(
                    (j) => j.status === "completed"
                ).length,
                droppedJourneys: u.clinic.journeys.filter(
                    (j) => j.status === "dropped"
                ).length,
            }
            : null,
    }));

    return NextResponse.json({ doctors });
}
