import { createHmac } from "crypto";

export function hashPhone(phone: string): string {
  const key = process.env.PHONE_HASH_KEY;
  if (!key) throw new Error("PHONE_HASH_KEY not configured");
  return createHmac("sha256", key).update(phone.trim()).digest("hex");
}
