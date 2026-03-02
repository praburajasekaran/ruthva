import { db } from "./db";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Returns a clinic-scoped query helper that automatically filters by clinicId.
 * Prevents cross-tenant data leaks by design.
 */
export function scopedDb(clinicId: string) {
  return {
    patient: {
      findMany: (args?: Omit<Prisma.PatientFindManyArgs, "where">) =>
        db.patient.findMany({ ...args, where: { clinicId } }),
      count: () => db.patient.count({ where: { clinicId } }),
    },
    journey: {
      findMany: (
        extraWhere?: Prisma.JourneyWhereInput,
        args?: Omit<Prisma.JourneyFindManyArgs, "where">
      ) =>
        db.journey.findMany({
          ...args,
          where: { ...extraWhere, clinicId },
        }),
      count: (extraWhere?: Prisma.JourneyWhereInput) =>
        db.journey.count({ where: { ...extraWhere, clinicId } }),
    },
  };
}
