import { requireClinic } from "@/lib/session";
import { db } from "@/lib/db";
import { AlertCircle, TrendingUp, ChevronRight } from "lucide-react";
import Link from "next/link";

const riskColors: Record<string, string> = {
  stable: "text-risk-stable bg-risk-stable/10",
  watch: "text-risk-watch bg-risk-watch/10",
  at_risk: "text-risk-at-risk bg-risk-at-risk/10",
  critical: "text-risk-critical bg-risk-critical/10",
};

const riskLabels: Record<string, string> = {
  stable: "Stable",
  watch: "Watch",
  at_risk: "At Risk",
  critical: "Critical",
};

export default async function DashboardPage() {
  const { clinic } = await requireClinic();

  const [atRiskCount, criticalCount, totalActive, atRiskPatients] =
    await Promise.all([
      db.journey.count({
        where: {
          clinicId: clinic.id,
          status: "active",
          riskLevel: { in: ["at_risk", "critical"] },
        },
      }),
      db.journey.count({
        where: {
          clinicId: clinic.id,
          status: "active",
          riskLevel: "critical",
        },
      }),
      db.journey.count({
        where: { clinicId: clinic.id, status: "active" },
      }),
      db.journey.findMany({
        where: {
          clinicId: clinic.id,
          status: "active",
          riskLevel: { in: ["at_risk", "critical"] },
        },
        include: { patient: { select: { name: true } } },
        orderBy: [{ riskLevel: "desc" }, { riskUpdatedAt: "asc" }],
        take: 20,
      }),
    ]);

  return (
    <div className="px-4 py-4">
      {/* Stat Cards */}
      <div className="mb-4 rounded-xl border border-border bg-surface p-4">
        <p className="text-3xl font-semibold tabular-nums text-risk-critical">
          {atRiskCount}
        </p>
        <p className="text-sm text-text-secondary">Patients at risk</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-2xl font-semibold tabular-nums text-risk-critical">
            {criticalCount}
          </p>
          <p className="text-xs text-text-secondary">Critical</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-2xl font-semibold tabular-nums text-brand-600">
            {totalActive}
          </p>
          <p className="text-xs text-text-secondary">Active journeys</p>
        </div>
      </div>

      {/* At-Risk Patient List */}
      <div className="mb-2 flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-text-muted" />
        <h2 className="text-sm font-semibold text-text-primary">
          Needs Attention
        </h2>
      </div>

      {atRiskPatients.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised p-6 text-center">
          <p className="text-sm text-text-secondary">
            No patients at risk right now.
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Add patients to start monitoring their treatment continuity.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-border rounded-xl border border-border bg-surface">
          {atRiskPatients.map((journey) => {
            const colors = riskColors[journey.riskLevel] || riskColors.stable;
            const label = riskLabels[journey.riskLevel] || "Unknown";

            return (
              <Link
                key={journey.id}
                href={`/patients/${journey.patientId}`}
                className="flex items-center gap-3 px-4 py-3 min-h-[72px] active:bg-surface-sunken transition-colors"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${colors}`}
                >
                  <AlertCircle className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {journey.patient.name}
                  </p>
                  <p className="text-xs text-text-muted">
                    {journey.riskReason || `${label} — ${journey.missedVisits} missed visits`}
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
