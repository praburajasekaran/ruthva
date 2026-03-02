import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { db } from "@/lib/db";
import { createEvent } from "@/lib/events";
import { z } from "zod";

const webhookPayloadSchema = z.object({
  type: z.string(),
  payload: z.object({
    id: z.string().optional(),
    source: z.string().optional(),
    destination: z.string().optional(),
    type: z.string().optional(),
    payload: z
      .object({
        text: z.string().optional(),
        type: z.string().optional(),
        id: z.string().optional(),
        title: z.string().optional(),
      })
      .optional(),
    context: z
      .object({
        gsId: z.string().optional(),
        id: z.string().optional(),
      })
      .optional(),
  }),
  timestamp: z.union([z.string(), z.number()]).optional(),
});

function validateSignature(
  body: string,
  signature: string | null
): boolean {
  const secret = process.env.GUPSHUP_WEBHOOK_SECRET;
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(body).digest("hex");

  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

function isReplayAttack(timestamp: string | number | undefined): boolean {
  if (!timestamp) return false;
  const ts =
    typeof timestamp === "string" ? parseInt(timestamp, 10) : timestamp;
  const fiveMinutes = 5 * 60 * 1000;
  return Math.abs(Date.now() - ts) > fiveMinutes;
}

export async function POST(request: Request) {
  const rawBody = await request.text();

  // Validate HMAC signature
  const signature = request.headers.get("x-hub-signature-256") ||
    request.headers.get("gupshup-signature");

  if (process.env.GUPSHUP_WEBHOOK_SECRET) {
    if (!validateSignature(rawBody, signature)) {
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 401 }
      );
    }
  }

  let payload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = webhookPayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ status: "ok" });
  }

  // Reject replay attacks
  if (isReplayAttack(parsed.data.timestamp)) {
    return NextResponse.json({ status: "ok" });
  }

  // Respond 200 immediately — process async
  const data = parsed.data;

  // Handle incoming message (patient reply)
  if (data.type === "message" || data.type === "message-event") {
    const senderPhone = data.payload.source;
    const messageText =
      data.payload.payload?.title || data.payload.payload?.text || "";

    if (senderPhone) {
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

      if (patient && patient.journeys[0]) {
        const journey = patient.journeys[0];

        // Parse quick-reply response
        let response: string;
        const lower = messageText.toLowerCase();
        if (lower.includes("yes") || lower.includes("✅")) {
          response = "yes";
        } else if (lower.includes("missed") || lower.includes("⚠")) {
          response = "missed";
        } else if (lower.includes("help") || lower.includes("❓")) {
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
            message_id: data.payload.id || null,
            source_context: data.payload.context?.gsId || null,
          },
          createdBy: "patient",
        });

        // Update journey activity timestamp
        await db.journey.update({
          where: { id: journey.id },
          data: { lastActivityAt: new Date() },
        });
      }
    }
  }

  return NextResponse.json({ status: "ok" });
}
