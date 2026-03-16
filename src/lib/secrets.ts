import { timingSafeEqual } from "crypto";

/**
 * Constant-time comparison of two secret strings.
 * Returns false if either value is empty/undefined.
 *
 * V1: single shared RUTHVA_INTEGRATION_SECRET for both directions
 * (Sivanethram->Ruthva API auth AND Ruthva->Sivanethram webhook signing).
 * Split into separate API_KEY + WEBHOOK_SIGNING_KEY when adding per-clinic keys (V2).
 */
export function secretsEqual(
  a: string | null | undefined,
  b: string | null | undefined
): boolean {
  if (!a || !b) return false;
  try {
    const bufA = Buffer.from(a);
    const bufB = Buffer.from(b);
    if (bufA.length !== bufB.length) return false;
    return timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}
