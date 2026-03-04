import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createClinicSchema, updateClinicSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if clinic already exists
  const existing = await db.clinic.findUnique({
    where: { userId: session.user.id },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Clinic already created" },
      { status: 409 }
    );
  }

  const body = await request.json();
  const parsed = createClinicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const clinic = await db.clinic.create({
    data: {
      name: parsed.data.name,
      doctorName: parsed.data.doctorName,
      whatsappNumber: parsed.data.whatsappNumber,
      email: session.user.email,
      userId: session.user.id,
    },
  });

  return NextResponse.json({ clinic }, { status: 201 });
}

export async function PATCH(request: Request) {
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
  const parsed = updateClinicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // Check for WhatsApp number conflict with another clinic
  if (
    parsed.data.whatsappNumber &&
    parsed.data.whatsappNumber !== clinic.whatsappNumber
  ) {
    const conflict = await db.clinic.findUnique({
      where: { whatsappNumber: parsed.data.whatsappNumber },
    });
    if (conflict) {
      return NextResponse.json(
        { error: "That WhatsApp number is already registered" },
        { status: 409 }
      );
    }
  }

  const updated = await db.clinic.update({
    where: { id: clinic.id },
    data: parsed.data,
  });

  return NextResponse.json({ clinic: updated });
}
