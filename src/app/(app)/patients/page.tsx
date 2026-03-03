import { requireClinic } from "@/lib/session";
import { db } from "@/lib/db";
import { ChevronRight, Sparkles } from "lucide-react";
import Link from "next/link";
import { SearchInput } from "@/components/patients/SearchInput";
import { Prisma } from "@/generated/prisma/client";

const riskColors: Record<string, string> = {
  stable: "bg-risk-stable",
  watch: "bg-risk-watch",
  at_risk: "bg-risk-at-risk",
  critical: "bg-risk-critical",
};

interface PatientsPageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function PatientsPage({ searchParams }: PatientsPageProps) {
  const { clinic } = await requireClinic();
  const { q } = await searchParams;

  const where: Prisma.PatientWhereInput = {
    clinicId: clinic.id,
  };

  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { phone: { contains: q, mode: "insensitive" } },
    ];
  }

  const patients = await db.patient.findMany({
    where,
    include: {
      journeys: {
        where: { status: "active" },
        select: { riskLevel: true, status: true },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="app-page px-4 py-5 lg:px-8 lg:py-8">
      <SearchInput placeholder="Search patients by name or phone..." />

      {patients.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised p-8 text-center">
          <p className="text-base text-text-secondary">
            {q ? `No patients found matching "${q}"` : "No patients yet."}
          </p>
          {!q && (
            <div className="mt-4 flex flex-col items-center gap-3">
              <Link
                href="/patients/new"
                className="inline-block rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
              >
                Add your first patient
              </Link>
              <Link
                href="/patients/activate"
                className="text-sm font-medium text-brand-600 hover:text-brand-700"
              >
                Onboard existing patients
              </Link>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-sm font-medium text-text-muted">
              {patients.length} patient{patients.length !== 1 ? "s" : ""}
              {q && <span className="ml-1">found</span>}
            </p>
            <Link
              href="/patients/activate"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Activate existing
            </Link>
          </div>
          <div className="divide-y divide-border rounded-xl border border-border bg-surface">
            {patients.map((patient) => {
              const activeJourney = patient.journeys[0];
              const riskDot = activeJourney
                ? riskColors[activeJourney.riskLevel]
                : "bg-text-muted";

              return (
                <Link
                  key={patient.id}
                  href={`/patients/${patient.id}`}
                  className="flex items-center gap-3 px-4 py-3 min-h-[60px] active:bg-surface-sunken transition-colors"
                >
                  <div
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${riskDot}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-base font-semibold text-text-primary">
                      {patient.name}
                    </p>
                    <p className="text-sm text-text-muted">
                      {activeJourney ? "Active treatment" : "No active treatment"}
                    </p>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-text-muted" />
                </Link>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
