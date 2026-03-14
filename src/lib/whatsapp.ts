import { createEvent } from "./events";

// ──────────────────────────────────────────────────────────────────────────────
// Meta Cloud API
// ──────────────────────────────────────────────────────────────────────────────

const GRAPH_API_VERSION = "v21.0";

interface SendTemplateParams {
  to: string;
  templateName: string;
  params: string[];
}

interface WhatsAppResponse {
  status: string;
  messageId?: string;
}

/**
 * Send a WhatsApp template message via Meta Cloud API.
 */
async function sendTemplate({
  to,
  templateName,
  params,
}: SendTemplateParams): Promise<WhatsAppResponse> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    console.error("WhatsApp Cloud API credentials not configured");
    return { status: "error" };
  }

  // Normalize phone: remove leading +, ensure digits only
  const phone = to.replace(/\D/g, "");

  const body = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: "en" },
      components:
        params.length > 0
          ? [
            {
              type: "body",
              parameters: params.map((p) => ({ type: "text", text: p })),
            },
          ]
          : [],
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();

    if (data.messages?.[0]?.id) {
      return { status: "sent", messageId: data.messages[0].id };
    }

    console.error("WhatsApp send failed:", data);
    return { status: "error" };
  } catch (err) {
    console.error("WhatsApp Cloud API error:", err);
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
    templateName:
      process.env.WHATSAPP_TEMPLATE_ADHERENCE || "adherence_check_new",
    params: [clinicName],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await createEvent({
    journeyId,
    eventType: result.status === "sent" ? "adherence_check_sent" : "adherence_check_failed",
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
    templateName:
      process.env.WHATSAPP_TEMPLATE_REMINDER || "pre_visit_reminder_new",
    params: [clinicName],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await createEvent({
    journeyId,
    eventType: result.status === "sent" ? "reminder_sent" : "reminder_failed",
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
  const templateName =
    attemptNumber === 1
      ? process.env.WHATSAPP_TEMPLATE_RECOVERY_1 || "recovery_message_1_new"
      : process.env.WHATSAPP_TEMPLATE_RECOVERY_2 || "recovery_message_2_new";

  const result = await sendTemplate({
    to: patientPhone,
    templateName,
    params: [clinicName],
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await createEvent({
    journeyId,
    eventType: result.status === "sent" ? "recovery_message_sent" : "recovery_message_failed",
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
