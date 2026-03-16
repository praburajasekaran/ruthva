import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSsoToken } from "@/lib/sso";

/**
 * GET /api/sso/redirect
 *
 * Generates an SSO token for the current user and performs an HTTP redirect
 * to clinic-os with `Referrer-Policy: no-referrer` so the token in the URL
 * is never leaked via the Referer header to third-party resources.
 */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL));
  }

  // Verify the user actually has a clinic before redirecting
  const clinic = await db.clinic.findUnique({
    where: { userId: session.user.id },
  });

  if (!clinic) {
    return NextResponse.redirect(
      new URL("/onboarding", process.env.NEXTAUTH_URL)
    );
  }

  const { redirectUrl } = await createSsoToken(session.user.id);

  const response = NextResponse.redirect(redirectUrl, 302);
  response.headers.set("Referrer-Policy", "no-referrer");

  return response;
}
