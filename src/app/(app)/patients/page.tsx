import { requireClinic } from "@/lib/session";
import { db } from "@/lib/db";
import { ChevronRight, Search } from "lucide-react";
import Link from "next/link";

const riskColors: Record<string, string> = {
  stable: "bg-risk-stable",
  watch: "bg-risk-watch",
  at_risk: "bg-risk-at-risk",
  critical: "bg-risk-critical",
};

export default async function PatientsPage() {
  const { clinic } = await requireClinic();

  const patients = await db.patient.findMany({
    where: { clinicId: clinic.id },
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
    <div className="px-4 py-4">
      <div className="mb-4 flex items-center gap-2 rounded-lg border border-border bg-surface-raised px-3 py-2.5">
        <Search className="h-4 w-4 text-text-muted" />
        <span className="text-sm text-text-muted">
          Search patients... (coming soon)
        </span>
      </div>

      <p className="mb-3 text-xs text-text-muted">
        {patients.length} patient{patients.length !== 1 ? "s" : ""}
      </p>

      {patients.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised p-6 text-center">
          <p className="text-sm text-text-secondary">No patients yet.</p>
          <Link
            href="/patients/new"
            className="mt-3 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white"
          >
            Add your first patient
          </Link>
        </div>
      ) : (
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
                  <p className="truncate text-sm font-medium text-text-primary">
                    {patient.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {activeJourney ? "Active treatment" : "No active treatment"}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 shrink-0 text-text-muted" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
