/**
 * One-time migration: Recompute all patient phoneHash values using HMAC-SHA256.
 *
 * Prerequisites:
 *   - PHONE_HASH_KEY env var must be set
 *   - DATABASE_URL env var must be set
 *
 * Usage:
 *   npx tsx scripts/migrate-phone-hashes.ts
 *
 * This script:
 *   1. Reads all patients with their plaintext phone numbers
 *   2. Recomputes phoneHash using the new HMAC-SHA256 function
 *   3. Updates each patient's phoneHash in a transaction
 *   4. Reports results
 */

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { createHmac } from "crypto";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL env var is required");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const db = new PrismaClient({ adapter });

function hashPhoneHmac(phone: string): string {
  const key = process.env.PHONE_HASH_KEY;
  if (!key) throw new Error("PHONE_HASH_KEY not configured");
  return createHmac("sha256", key).update(phone.trim()).digest("hex");
}

async function main() {
  if (!process.env.PHONE_HASH_KEY) {
    console.error("❌ PHONE_HASH_KEY env var is required");
    process.exit(1);
  }

  console.log("🔄 Migrating phone hashes to HMAC-SHA256...\n");

  const patients = await db.patient.findMany({
    select: { id: true, phone: true, phoneHash: true },
  });

  console.log(`Found ${patients.length} patients to migrate.\n`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const patient of patients) {
    try {
      const newHash = hashPhoneHmac(patient.phone);

      if (newHash === patient.phoneHash) {
        skipped++;
        continue;
      }

      await db.patient.update({
        where: { id: patient.id },
        data: { phoneHash: newHash },
      });
      updated++;
    } catch (err) {
      console.error(`❌ Failed to update patient ${patient.id}:`, err);
      errors++;
    }
  }

  console.log(`\n✅ Migration complete:`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped (already correct): ${skipped}`);
  console.log(`   Errors: ${errors}`);

  await db.$disconnect();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
