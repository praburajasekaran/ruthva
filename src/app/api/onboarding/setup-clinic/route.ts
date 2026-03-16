import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { setupClinicSchema } from "@/lib/validations";

/**
 * New onboarding: create clinic in Django first, then Prisma, then SSO redirect.
 * Replaces the old 5-step onboarding flow.
 */
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existingClinic = await db.clinic.findUnique({
    where: { userId: session.user.id },
  });
  if (existingClinic) {
    // Recovery path: clinic was created in a prior attempt but the user
    // didn't complete the redirect. Point them to the SSO redirect route
    // which handles token creation and sets Referrer-Policy: no-referrer.
    return NextResponse.json(
      { clinic: existingClinic, redirectUrl: "/api/sso/redirect" },
      { status: 200 }
    );
  }

  const body = await request.json();
  const parsed = setupClinicSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  const { doctorName, registrationNumber, clinicName, clinicAddress, whatsappNumber, practiceType } = parsed.data;

  // Step 1: Provision in Django first (external dependency — more likely to fail)
  const clinicOsApiUrl = process.env.CLINIC_OS_API_URL;
  if (!clinicOsApiUrl) {
    return NextResponse.json(
      { error: "Clinic OS API is not configured" },
      { status: 500 }
    );
  }

  let djangoResult: {
    id: number;
    subdomain: string;
    clinic_id: number;
    user_id: number;
  };

  try {
    const djangoRes = await fetch(
      `${clinicOsApiUrl}/api/v1/auth/sso/provision/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Ruthva-Secret": process.env.RUTHVA_INTEGRATION_SECRET ?? "",
        },
        body: JSON.stringify({
          email: session.user.email,
          doctor_name: doctorName,
          registration_number: registrationNumber,
          clinic_name: clinicName,
          clinic_address: clinicAddress,
          whatsapp_number: whatsappNumber,
          discipline: practiceType,
          ruthva_user_id: session.user.id,
        }),
      }
    );

    if (!djangoRes.ok) {
      const errBody = await djangoRes.text();
      console.error("Django provision failed:", djangoRes.status, errBody);
      return NextResponse.json(
        { error: "Failed to create clinic. Please try again." },
        { status: 502 }
      );
    }

    djangoResult = await djangoRes.json();
  } catch (err) {
    console.error("Django provision network error:", err);
    return NextResponse.json(
      { error: "Could not reach clinic service. Please try again." },
      { status: 502 }
    );
  }

  // Step 2: Create clinic in Prisma
  let clinic;
  try {
    clinic = await db.clinic.create({
      data: {
        userId: session.user.id,
        name: clinicName,
        doctorName,
        whatsappNumber,
        externalSubdomain: djangoResult.subdomain,
      },
    });
  } catch (err) {
    // Rollback Django provision
    console.error("Prisma clinic creation failed, rolling back Django:", err);
    try {
      await fetch(
        `${clinicOsApiUrl}/api/v1/auth/sso/provision/${djangoResult.clinic_id}/`,
        {
          method: "DELETE",
          headers: {
            "X-Ruthva-Secret": process.env.RUTHVA_INTEGRATION_SECRET ?? "",
          },
        }
      );
    } catch (rollbackErr) {
      console.error("Django rollback also failed:", rollbackErr);
    }
    return NextResponse.json(
      { error: "Failed to create clinic. Please try again." },
      { status: 500 }
    );
  }

  // Step 3: Redirect via the SSO redirect route which sets
  // Referrer-Policy: no-referrer to prevent the token leaking
  // in the Referer header to third-party resources on clinic-os.
  return NextResponse.json(
    { clinic, redirectUrl: "/api/sso/redirect" },
    { status: 201 }
  );
}
