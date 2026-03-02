import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createClinicSchema } from "@/lib/validations";

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
