import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireClinic } from "@/lib/session";
import { EditPatientForm } from "./edit-patient-form";

export default async function EditPatientPage({
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

  if (!patient) {
    notFound();
  }

  const activeJourney = patient.journeys[0];

  return (
    <EditPatientForm
      patientId={patient.id}
      initialName={patient.name}
      initialPhone={patient.phone}
      initialDuration={activeJourney?.durationDays ?? 30}
      initialInterval={activeJourney?.followupIntervalDays ?? 7}
      initialConsent={patient.consentGiven}
    />
  );
}
