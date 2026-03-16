import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const CLINIC_OS_API_URL = process.env.CLINIC_OS_API_URL ?? "";
const RUTHVA_INTEGRATION_SECRET = process.env.RUTHVA_INTEGRATION_SECRET ?? "";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clinic = await db.clinic.findUnique({
    where: { userId: session.user.id },
  });

  if (!clinic) {
    return NextResponse.json({ error: "No clinic found" }, { status: 404 });
  }

  // Call clinic-os Django API to trigger export, scoped to authenticated user
  if (!CLINIC_OS_API_URL || !RUTHVA_INTEGRATION_SECRET) {
    return NextResponse.json(
      { error: "Export service is not configured." },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${CLINIC_OS_API_URL}/api/v1/export/all/`, {
      method: "POST",
      headers: {
        "X-Ruthva-Secret": RUTHVA_INTEGRATION_SECRET,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ruthva_user_id: session.user.id,
        clinic_id: clinic.id,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "Unknown error");
      console.error(
        `Export API failed: status=${res.status} detail=${detail}`
      );
      return NextResponse.json(
        { error: "Export service temporarily unavailable." },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error("Export API request failed:", err);
    return NextResponse.json(
      { error: "Unable to reach export service. Please try again later." },
      { status: 502 }
    );
  }

  return NextResponse.json({
    message: "Export started. You will receive a download link by email.",
  });
}
