import { requireClinic } from "@/lib/session";
import { db } from "@/lib/db";
import { AlertCircle, TrendingUp, ChevronRight, Heart } from "lucide-react";
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

// Average visit value for revenue estimate (₹500 per visit)
const AVG_VISIT_VALUE = 500;

export default async function DashboardPage() {
  const { clinic } = await requireClinic();

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    atRiskCount,
    criticalCount,
    totalActive,
    recoveredThisMonth,
    atRiskPatients,
  ] = await Promise.all([
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
    db.event.count({
      where: {
        journey: { clinicId: clinic.id },
        eventType: "patient_returned",
        eventTime: { gte: monthStart },
      },
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

  // Revenue at risk: at-risk patients × remaining visits × avg visit value
  const revenueAtRisk = atRiskPatients.reduce((sum, j) => {
    const remainingDays = Math.max(
      0,
      j.durationDays -
        Math.floor(
          (now.getTime() - new Date(j.startDate).getTime()) / 86400000
        )
    );
    const remainingVisits = Math.ceil(remainingDays / j.followupIntervalDays);
    return sum + remainingVisits * AVG_VISIT_VALUE;
  }, 0);

  const formatCurrency = (amount: number) => {
    if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
    if (amount >= 1000) return `₹${(amount / 1000).toFixed(0)}K`;
    return `₹${amount}`;
  };

  return (
    <div className="px-4 py-4">
      {/* Primary Stat */}
      <div className="mb-4 rounded-xl border border-border bg-surface p-4">
        <p className="text-3xl font-semibold tabular-nums text-risk-critical">
          {atRiskCount}
        </p>
        <p className="text-sm text-text-secondary">Patients at risk</p>
        {revenueAtRisk > 0 && (
          <p className="text-xs text-text-muted">
            {formatCurrency(revenueAtRisk)} revenue at risk
          </p>
        )}
      </div>

      {/* Secondary Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xl font-semibold tabular-nums text-risk-critical">
            {criticalCount}
          </p>
          <p className="text-xs text-text-secondary">Critical</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <p className="text-xl font-semibold tabular-nums text-brand-600">
            {totalActive}
          </p>
          <p className="text-xs text-text-secondary">Active</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <div className="flex items-baseline gap-1">
            <p className="text-xl font-semibold tabular-nums text-risk-stable">
              {recoveredThisMonth}
            </p>
            <Heart className="h-3 w-3 text-risk-stable" />
          </div>
          <p className="text-xs text-text-secondary">Recovered</p>
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
                    {journey.riskReason ||
                      `${label} — ${journey.missedVisits} missed visits`}
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
