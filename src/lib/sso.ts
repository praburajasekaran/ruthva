import { randomBytes } from "crypto";
import { db } from "./db";

const SSO_TOKEN_TTL_MS = 60 * 1000; // 60 seconds

/**
 * Creates a one-time SSO token for redirecting to clinic-os.
 * Returns the token string and the full redirect URL.
 */
export async function createSsoToken(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SSO_TOKEN_TTL_MS);

  await db.ssoToken.create({
    data: { token, userId, expiresAt },
  });

  const clinicOsUrl = process.env.CLINIC_OS_URL;
  if (!clinicOsUrl) throw new Error("CLINIC_OS_URL is not configured");

  return {
    token,
    redirectUrl: `${clinicOsUrl}/sso?token=${token}`,
  };
}

/**
 * Validates and consumes an SSO token atomically.
 * Returns the user/clinic info if valid, null otherwise.
 */
export async function consumeSsoToken(token: string) {
  // Atomic update: only succeeds if token exists, not expired, and not yet used
  const now = new Date();

  const records = await db.$queryRawUnsafe<
    Array<{ id: string; userId: string }>
  >(
    `UPDATE "SsoToken" SET "usedAt" = $1 WHERE "token" = $2 AND "expiresAt" > $1 AND "usedAt" IS NULL RETURNING "id", "userId"`,
    now,
    token
  );

  if (!records || records.length === 0) return null;

  const { userId } = records[0];

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true },
  });

  if (!user) return null;

  const clinic = await db.clinic.findUnique({
    where: { userId },
    select: { id: true, name: true, doctorName: true, externalSubdomain: true },
  });

  return { user, clinic };
}
