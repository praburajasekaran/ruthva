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

  // Clean up any existing unused tokens for this user to prevent unbounded growth
  await db.ssoToken.deleteMany({
    where: { userId, usedAt: null },
  });

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
  const now = new Date();

  // Atomic update: JOIN on User to reject deactivated users in the same query
  const records = await db.$queryRawUnsafe<
    Array<{ id: string; userId: string }>
  >(
    `UPDATE "SsoToken" AS st
     SET "usedAt" = $1
     FROM "User" AS u
     WHERE st."token" = $2
       AND st."expiresAt" > $1
       AND st."usedAt" IS NULL
       AND st."userId" = u."id"
       AND u."deactivatedAt" IS NULL
     RETURNING st."id", st."userId"`,
    now,
    token
  );

  // Inline cleanup: remove expired tokens to keep the table bounded
  await db.$queryRawUnsafe(
    `DELETE FROM "SsoToken" WHERE "expiresAt" < NOW()`
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
