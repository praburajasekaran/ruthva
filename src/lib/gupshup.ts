import { createEvent } from "./events";

const GUPSHUP_API_URL = "https://api.gupshup.io/wa/api/v1/template/msg";

interface SendTemplateParams {
  to: string;
  templateId: string;
  params: string[];
}

interface GupshupResponse {
  status: string;
  messageId?: string;
}

/**
 * Send a WhatsApp template message via Gupshup API.
 */
async function sendTemplate({
  to,
  templateId,
  params,
}: SendTemplateParams): Promise<GupshupResponse> {
  const apiKey = process.env.GUPSHUP_API_KEY;
  const appName = process.env.GUPSHUP_APP_NAME;

  if (!apiKey || !appName) {
    console.error("Gupshup credentials not configured");
    return { status: "error" };
  }

  // Normalize phone: ensure country code prefix
  const phone = to.startsWith("+") ? to.slice(1) : to;

  const body = new URLSearchParams({
    channel: "whatsapp",
    source: process.env.GUPSHUP_SOURCE_NUMBER || "",
    destination: phone,
    "template[id]": templateId,
    "template[params]": JSON.stringify(params),
  });

  try {
    const res = await fetch(GUPSHUP_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        apikey: apiKey,
      },
      body: body.toString(),
    });

    const data = await res.json();

    if (data.status === "submitted") {
      return { status: "sent", messageId: data.messageId };
    }

    console.error("Gupshup send failed:", data);
    return { status: "error" };
  } catch (err) {
    console.error("Gupshup API error:", err);
    return { status: "error" };
  }
}

/**
 * Send daily adherence check to a patient.
 */
export async function sendAdherenceCheck({
  journeyId,
  patientPhone,
  clinicName,
}: {
  journeyId: string;
  patientPhone: string;
  clinicName: string;
}) {
  const result = await sendTemplate({
    to: patientPhone,
    templateId: process.env.GUPSHUP_TEMPLATE_ADHERENCE || "adherence_check",
    params: [clinicName],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await createEvent({
    journeyId,
    eventType: "adherence_check_sent",
    eventDate: today,
    metadata: { message_id: result.messageId || null, status: result.status },
    createdBy: "system",
  });

  return result;
}

/**
 * Send pre-visit reminder (1 day before expected visit).
 */
export async function sendPreVisitReminder({
  journeyId,
  patientPhone,
  clinicName,
}: {
  journeyId: string;
  patientPhone: string;
  clinicName: string;
}) {
  const result = await sendTemplate({
    to: patientPhone,
    templateId: process.env.GUPSHUP_TEMPLATE_REMINDER || "pre_visit_reminder",
    params: [clinicName],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await createEvent({
    journeyId,
    eventType: "reminder_sent",
    eventDate: today,
    metadata: { message_id: result.messageId || null, status: result.status },
    createdBy: "system",
  });

  return result;
}

/**
 * Send recovery message to at-risk patient.
 */
export async function sendRecoveryMessage({
  journeyId,
  patientPhone,
  clinicName,
  attemptNumber,
}: {
  journeyId: string;
  patientPhone: string;
  clinicName: string;
  attemptNumber: number;
}) {
  const templateId =
    attemptNumber === 1
      ? process.env.GUPSHUP_TEMPLATE_RECOVERY_1 || "recovery_message_1"
      : process.env.GUPSHUP_TEMPLATE_RECOVERY_2 || "recovery_message_2";

  const result = await sendTemplate({
    to: patientPhone,
    templateId,
    params: [clinicName],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await createEvent({
    journeyId,
    eventType: "recovery_message_sent",
    eventDate: today,
    metadata: {
      attempt: attemptNumber,
      message_id: result.messageId || null,
      status: result.status,
    },
    createdBy: "system",
  });

  return result;
}
