import { NextResponse } from "next/server";
import { auth, signOut } from "@/lib/auth";
import { db } from "@/lib/db";

const CLINIC_OS_API_URL = process.env.CLINIC_OS_API_URL ?? "";
const RUTHVA_INTEGRATION_SECRET = process.env.RUTHVA_INTEGRATION_SECRET ?? "";

/**
 * Notify Django (clinic-os) that this user has been deactivated.
 * Best-effort: logs errors but does not block account closure.
 */
async function notifyDjangoDeactivation(userId: string): Promise<void> {
  if (!CLINIC_OS_API_URL || !RUTHVA_INTEGRATION_SECRET) {
    console.warn(
      "[account/close] CLINIC_OS_API_URL or RUTHVA_INTEGRATION_SECRET not set, skipping Django deactivation"
    );
    return;
  }

  try {
    const res = await fetch(
      `${CLINIC_OS_API_URL}/api/v1/auth/sso/deactivate/`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Ruthva-Secret": RUTHVA_INTEGRATION_SECRET,
        },
        body: JSON.stringify({ ruthva_user_id: userId }),
      }
    );

    if (!res.ok) {
      console.error(
        `[account/close] Django deactivation returned ${res.status}: ${await res.text()}`
      );
    }
  } catch (err) {
    console.error("[account/close] Failed to reach Django for deactivation:", err);
  }
}

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  // Deactivate user in Prisma
  await db.user.update({
    where: { id: userId },
    data: { deactivatedAt: new Date() },
  });

  // Invalidate any unused SSO tokens so they cannot be exchanged for Django JWTs
  await db.ssoToken.deleteMany({
    where: { userId, usedAt: null },
  });

  // Notify Django (best-effort — failure here does not block account closure)
  await notifyDjangoDeactivation(userId);

  // Sign out the user (destroy NextAuth session)
  try {
    await signOut({ redirect: false });
  } catch {
    // signOut may throw in API routes — session is still destroyed in DB
  }

  return NextResponse.json({ message: "Account closed." });
}
