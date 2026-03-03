import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/session";
import { db } from "@/lib/db";
import { z } from "zod";

export const dynamic = "force-dynamic";

const onboardSchema = z.object({
    email: z.string().email("Valid doctor email required"),
    clinicName: z.string().min(1, "Clinic name required"),
    doctorName: z.string().min(1, "Doctor name required"),
    whatsappNumber: z
        .string()
        .min(10, "WhatsApp number must be at least 10 digits"),
    clinicEmail: z.string().email().optional().nullable(),
});

export async function POST(request: Request) {
    await requireAdmin();

    const body = await request.json();
    const parsed = onboardSchema.safeParse(body);

    if (!parsed.success) {
        return NextResponse.json(
            { error: parsed.error.issues[0].message },
            { status: 400 }
        );
    }

    const { email, clinicName, doctorName, whatsappNumber, clinicEmail } =
        parsed.data;

    // Check if user already has a clinic
    const existingUser = await db.user.findUnique({
        where: { email },
        select: { id: true, clinic: { select: { id: true } } },
    });

    if (existingUser?.clinic) {
        return NextResponse.json(
            { error: "This email already has an active clinic registered" },
            { status: 409 }
        );
    }

    // Check WhatsApp number uniqueness
    const existingClinic = await db.clinic.findUnique({
        where: { whatsappNumber },
    });

    if (existingClinic) {
        return NextResponse.json(
            {
                error:
                    "A clinic with this WhatsApp number already exists",
            },
            { status: 409 }
        );
    }

    const result = await db.$transaction(async (tx) => {
        // Upsert user — create if not exists, leave existing users untouched
        const user = await tx.user.upsert({
            where: { email },
            update: {}, // don't overwrite anything if user already exists
            create: {
                email,
                name: doctorName,
            },
        });

        const clinic = await tx.clinic.create({
            data: {
                userId: user.id,
                name: clinicName,
                doctorName,
                whatsappNumber,
                ...(clinicEmail ? { email: clinicEmail } : {}),
            },
        });

        return { userId: user.id, clinicId: clinic.id };
    });

    return NextResponse.json(result, { status: 201 });
}
