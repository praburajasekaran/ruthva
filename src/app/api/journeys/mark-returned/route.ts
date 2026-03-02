import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { markPatientReturned } from "@/lib/events";
import { z } from "zod";

const schema = z.object({
  journeyId: z.string().min(1),
});

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
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  // Verify journey belongs to this clinic and is at risk
  const journey = await db.journey.findFirst({
    where: {
      id: parsed.data.journeyId,
      clinicId: clinic.id,
      status: "active",
      riskLevel: { in: ["at_risk", "critical"] },
    },
  });
  if (!journey) {
    return NextResponse.json(
      { error: "Journey not found or not at risk" },
      { status: 404 }
    );
  }

  await markPatientReturned(journey.id);

  return NextResponse.json({ success: true });
}
