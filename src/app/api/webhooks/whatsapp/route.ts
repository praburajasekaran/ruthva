import { NextResponse } from "next/server";
// import { createHmac, timingSafeEqual } from "crypto"; // Meta HMAC — not used with Gupshup
import { db } from "@/lib/db";
import { createEvent } from "@/lib/events";
import { z } from "zod";

// ──────────────────────────────────────────────────────────────────────────────
// Meta webhook verification & signature (commented out — using Gupshup)
// ──────────────────────────────────────────────────────────────────────────────
// Meta webhook payload schema
// const metaMessageSchema = z.object({
//   from: z.string(),
//   id: z.string(),
//   type: z.string(),
//   text: z.object({ body: z.string() }).optional(),
//   button: z
//     .object({
//       text: z.string().optional(),
//       payload: z.string().optional(),
//     })
//     .optional(),
//   interactive: z
//     .object({
//       type: z.string().optional(),
//       button_reply: z
//         .object({ id: z.string().optional(), title: z.string().optional() })
//         .optional(),
//     })
//     .optional(),
//   context: z
//     .object({
//       message_id: z.string().optional(),
//     })
//     .optional(),
// });
//
// function validateSignature(
//   body: string,
//   signature: string | null
// ): boolean {
//   const appSecret = process.env.WHATSAPP_APP_SECRET;
//   if (!appSecret || !signature) return false;
//
//   // Meta sends "sha256=<hex>"
//   const expectedHash = createHmac("sha256", appSecret)
//     .update(body)
//     .digest("hex");
//   const expectedSignature = `sha256=${expectedHash}`;
//
//   try {
//     return timingSafeEqual(
//       Buffer.from(signature),
//       Buffer.from(expectedSignature)
//     );
//   } catch {
//     return false;
//   }
// }
//
// /**
//  * GET — Meta webhook verification handshake.
//  * Meta sends hub.mode, hub.verify_token, hub.challenge as query params.
//  */
// export async function GET(request: Request) {
//   const { searchParams } = new URL(request.url);
//   const mode = searchParams.get("hub.mode");
//   const token = searchParams.get("hub.verify_token");
//   const challenge = searchParams.get("hub.challenge");
//
//   const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
//
//   if (mode === "subscribe" && token === verifyToken) {
//     return new Response(challenge || "", { status: 200 });
//   }
//
//   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
// }

// ──────────────────────────────────────────────────────────────────────────────
// Gupshup WhatsApp Webhook — Meta format (v3)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * GET — Webhook URL validation.
 * Gupshup pings this endpoint when adding the callback URL to verify it's reachable.
 */
export async function GET() {
  return NextResponse.json({ status: "ok" });
}

/**
 * Message schema — identical to Meta Cloud API format since Gupshup
 * is configured with "Meta format (v3)" payload.
 */
const messageSchema = z.object({
  from: z.string(),
  id: z.string(),
  type: z.string(),
  text: z.object({ body: z.string() }).optional(),
  button: z
    .object({
      text: z.string().optional(),
      payload: z.string().optional(),
    })
    .optional(),
  interactive: z
    .object({
      type: z.string().optional(),
      button_reply: z
        .object({ id: z.string().optional(), title: z.string().optional() })
        .optional(),
    })
    .optional(),
  context: z
    .object({
      message_id: z.string().optional(),
    })
    .optional(),
});

/**
 * POST — Handle incoming WhatsApp messages via Gupshup webhook.
 *
 * Gupshup sends Meta-format (v3) payloads when configured that way:
 *   { object: "whatsapp_business_account", entry: [{ changes: [{ value: { messages: [...] } }] }] }
 *
 * Signature validation is optional — if you've added a custom header
 * in Gupshup's webhook config, you can validate it here.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  // Optional: validate a shared secret header configured in Gupshup webhook settings
  if (process.env.GUPSHUP_WEBHOOK_SECRET) {
    const secret = request.headers.get("x-gupshup-secret");
    if (secret !== process.env.GUPSHUP_WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Invalid webhook secret" },
        { status: 401 }
      );
    }
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Meta format (v3): { object: "whatsapp_business_account", entry: [...] }
  if (body.object !== "whatsapp_business_account") {
    return NextResponse.json({ status: "ok" });
  }

  // Process each entry/change
  for (const entry of body.entry || []) {
    for (const change of entry.changes || []) {
      const value = change.value;
      if (!value?.messages) continue;

      for (const rawMessage of value.messages) {
        const parsed = messageSchema.safeParse(rawMessage);
        if (!parsed.success) continue;

        const message = parsed.data;
        await handleIncomingMessage(message);
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}

async function handleIncomingMessage(
  message: z.infer<typeof messageSchema>
) {
  const senderPhone = message.from;

  // Extract message text from different message types
  let messageText = "";
  if (message.type === "button" && message.button) {
    messageText = message.button.text || message.button.payload || "";
  } else if (message.type === "interactive" && message.interactive) {
    messageText =
      message.interactive.button_reply?.title ||
      message.interactive.button_reply?.id ||
      "";
  } else if (message.type === "text" && message.text) {
    messageText = message.text.body;
  }

  if (!senderPhone) return;

  // Find patient by phone
  const patient = await db.patient.findFirst({
    where: { phone: senderPhone },
    include: {
      journeys: {
        where: { status: "active" },
        take: 1,
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!patient || !patient.journeys[0]) return;

  const journey = patient.journeys[0];

  // Parse quick-reply response
  let response: string;
  const lower = messageText.toLowerCase();
  if (lower.includes("yes") || lower.includes("\u2705")) {
    response = "yes";
  } else if (lower.includes("missed") || lower.includes("\u26a0")) {
    response = "missed";
  } else if (lower.includes("help") || lower.includes("\u2753")) {
    response = "help_needed";
  } else {
    response = messageText.slice(0, 200);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await createEvent({
    journeyId: journey.id,
    eventType: "adherence_response",
    eventDate: today,
    metadata: {
      response,
      raw_text: messageText.slice(0, 500),
      message_id: message.id || null,
      source_context: message.context?.message_id || null,
    },
    createdBy: "patient",
  });

  // Update journey activity timestamp
  await db.journey.update({
    where: { id: journey.id },
    data: { lastActivityAt: new Date() },
  });
}
