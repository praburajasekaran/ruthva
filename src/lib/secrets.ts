import { timingSafeEqual } from "crypto";

/**
 * Constant-time comparison of two secret strings.
 * Returns false if either value is empty/undefined.
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
