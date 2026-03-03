import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    await requireAdmin();
    const { id } = await params;

    const user = await db.user.findUnique({
        where: { id },
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
                    patients: { select: { id: true } },
                    journeys: {
                        select: { status: true, riskLevel: true },
                    },
                },
            },
        },
    });

    if (!user) {
        return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    // Recent activity timeline (last 20 events across all their journeys)
    const recentEvents = user.clinic
        ? await db.event.findMany({
            where: {
                journey: { clinicId: user.clinic.id },
            },
            orderBy: { createdAt: "desc" },
            take: 20,
            select: {
                id: true,
                eventType: true,
                eventDate: true,
                createdAt: true,
                metadata: true,
                journey: {
                    select: { patient: { select: { name: true } } },
                },
            },
        })
        : [];

    return NextResponse.json({
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
        isActive: !user.deactivatedAt,
        deactivatedAt: user.deactivatedAt,
        clinic: user.clinic
            ? {
                id: user.clinic.id,
                name: user.clinic.name,
                doctorName: user.clinic.doctorName,
                whatsappNumber: user.clinic.whatsappNumber,
                email: user.clinic.email,
                patientCount: user.clinic.patients.length,
                journeyStats: {
                    active: user.clinic.journeys.filter((j) => j.status === "active")
                        .length,
                    completed: user.clinic.journeys.filter(
                        (j) => j.status === "completed"
                    ).length,
                    dropped: user.clinic.journeys.filter((j) => j.status === "dropped")
                        .length,
                    riskLevels: {
                        stable: user.clinic.journeys.filter(
                            (j) => j.status === "active" && j.riskLevel === "stable"
                        ).length,
                        watch: user.clinic.journeys.filter(
                            (j) => j.status === "active" && j.riskLevel === "watch"
                        ).length,
                        at_risk: user.clinic.journeys.filter(
                            (j) => j.status === "active" && j.riskLevel === "at_risk"
                        ).length,
                        critical: user.clinic.journeys.filter(
                            (j) => j.status === "active" && j.riskLevel === "critical"
                        ).length,
                    },
                },
            }
            : null,
        recentEvents: recentEvents.map((e) => ({
            id: e.id,
            eventType: e.eventType,
            eventDate: e.eventDate,
            createdAt: e.createdAt,
            patientName: e.journey.patient.name,
        })),
    });
}

const deactivateSchema = z.object({
    action: z.enum(["deactivate", "reactivate"]),
});

const editSchema = z.object({
    clinicName: z.string().min(1).optional(),
    doctorName: z.string().min(1).optional(),
    email: z.string().email().optional().nullable(),
});

export async function PATCH(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    await requireAdmin();
    const { id } = await params;

    const user = await db.user.findUnique({
        where: { id },
        select: { id: true, clinic: { select: { id: true } } },
    });

    if (!user) {
        return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const body = await request.json();

    // Try deactivate/reactivate action
    const deactivateParsed = deactivateSchema.safeParse(body);
    if (deactivateParsed.success) {
        const { action } = deactivateParsed.data;
        const deactivatedAt = action === "deactivate" ? new Date() : null;

        await db.$transaction(async (tx) => {
            await tx.user.update({
                where: { id },
                data: { deactivatedAt },
            });

            // On deactivation, invalidate existing sessions immediately
            if (action === "deactivate") {
                await tx.session.deleteMany({ where: { userId: id } });
            }
        });

        return NextResponse.json({ success: true, action });
    }

    // Try field edits
    const editParsed = editSchema.safeParse(body);
    if (!editParsed.success) {
        return NextResponse.json(
            { error: editParsed.error.issues[0].message },
            { status: 400 }
        );
    }

    if (!user.clinic) {
        return NextResponse.json(
            { error: "No clinic associated with this doctor" },
            { status: 404 }
        );
    }

    const { clinicName, doctorName, email } = editParsed.data;

    await db.clinic.update({
        where: { id: user.clinic.id },
        data: {
            ...(clinicName !== undefined && { name: clinicName }),
            ...(doctorName !== undefined && { doctorName }),
            ...(email !== undefined && { email }),
        },
    });

    return NextResponse.json({ success: true });
}
