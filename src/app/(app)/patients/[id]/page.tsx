import { requireClinic } from "@/lib/session";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle, AlertCircle, Clock, MessageSquare, Activity } from "lucide-react";
import Link from "next/link";
import { VisitButton } from "./visit-button";
import { ReturnedButton } from "./returned-button";

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

const eventIcons: Record<string, typeof Activity> = {
  journey_started: Activity,
  visit_expected: Clock,
  visit_confirmed: CheckCircle,
  visit_missed: AlertCircle,
  adherence_check_sent: MessageSquare,
  adherence_response: MessageSquare,
  reminder_sent: MessageSquare,
  recovery_message_sent: AlertCircle,
  patient_returned: CheckCircle,
};

const eventLabels: Record<string, string> = {
  journey_started: "Journey started",
  visit_expected: "Visit expected",
  visit_confirmed: "Visit confirmed",
  visit_missed: "Visit missed",
  adherence_check_sent: "Check-in sent",
  adherence_response: "Patient responded",
  reminder_sent: "Reminder sent",
  recovery_message_sent: "Recovery message sent",
  patient_returned: "Patient returned",
};

const eventColors: Record<string, string> = {
  journey_started: "text-brand-600",
  visit_expected: "text-text-muted",
  visit_confirmed: "text-risk-stable",
  visit_missed: "text-risk-critical",
  adherence_check_sent: "text-text-secondary",
  adherence_response: "text-brand-600",
  reminder_sent: "text-risk-watch",
  recovery_message_sent: "text-risk-at-risk",
  patient_returned: "text-risk-stable",
};

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { clinic } = await requireClinic();

  const patient = await db.patient.findFirst({
    where: { id, clinicId: clinic.id },
    include: {
      journeys: {
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!patient) notFound();

  const activeJourney = patient.journeys[0];

  // Get events for the active journey
  const events = activeJourney
    ? await db.event.findMany({
        where: { journeyId: activeJourney.id },
        orderBy: { eventTime: "desc" },
        take: 50,
      })
    : [];

  const riskColor = activeJourney
    ? riskColors[activeJourney.riskLevel]
    : riskColors.stable;
  const riskLabel = activeJourney
    ? riskLabels[activeJourney.riskLevel]
    : "No active treatment";

  const isAtRisk =
    activeJourney &&
    (activeJourney.riskLevel === "at_risk" ||
      activeJourney.riskLevel === "critical");

  return (
    <div className="px-4 py-4">
      <Link
        href="/patients"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-text-secondary"
      >
        <ArrowLeft className="h-4 w-4" />
        Patients
      </Link>

      {/* Patient Header */}
      <div className="mb-4 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-text-primary">
              {patient.name}
            </h1>
            <p className="text-xs text-text-muted">{patient.phone}</p>
          </div>
          {activeJourney && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${riskColor}`}
            >
              {riskLabel}
            </span>
          )}
        </div>

        {activeJourney && (
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-border pt-3">
            <div>
              <p className="text-xs text-text-muted">Duration</p>
              <p className="text-sm font-medium tabular-nums">
                {activeJourney.durationDays}d
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Follow-up</p>
              <p className="text-sm font-medium tabular-nums">
                {activeJourney.followupIntervalDays}d
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Missed</p>
              <p className="text-sm font-medium tabular-nums">
                {activeJourney.missedVisits}
              </p>
            </div>
          </div>
        )}

        {activeJourney && activeJourney.riskReason && (
          <p className="mt-2 text-xs text-text-secondary">
            {activeJourney.riskReason}
          </p>
        )}
      </div>

      {/* Action Buttons */}
      {activeJourney && (
        <div className="mb-6 flex gap-2">
          <VisitButton journeyId={activeJourney.id} />
          {isAtRisk && <ReturnedButton journeyId={activeJourney.id} />}
        </div>
      )}

      {/* Timeline */}
      <div className="mb-2 flex items-center gap-2">
        <Activity className="h-4 w-4 text-text-muted" />
        <h2 className="text-sm font-semibold text-text-primary">Timeline</h2>
      </div>

      {events.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface-raised p-6 text-center">
          <p className="text-sm text-text-secondary">No events yet.</p>
        </div>
      ) : (
        <div className="space-y-0">
          {events.map((event, index) => {
            const Icon = eventIcons[event.eventType] || Activity;
            const label = eventLabels[event.eventType] || event.eventType;
            const color = eventColors[event.eventType] || "text-text-muted";
            const isLast = index === events.length - 1;

            return (
              <div key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised ${color}`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  {!isLast && (
                    <div className="w-px flex-1 bg-border" />
                  )}
                </div>
                <div className={`pb-4 ${isLast ? "" : ""}`}>
                  <p className="text-sm font-medium text-text-primary">
                    {label}
                  </p>
                  <p className="text-xs text-text-muted">
                    {new Date(event.eventTime).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
