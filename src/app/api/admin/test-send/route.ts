import { NextRequest, NextResponse } from "next/server";

/**
 * Quick test endpoint to send a WhatsApp template message.
 * POST /api/admin/test-send
 * Body: { "to": "919791090710", "template": "adherence_check" }
 * Secured with CRON_SECRET.
 */
export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { to, template } = await request.json();

  if (!to || !template) {
    return NextResponse.json({ error: "Missing 'to' or 'template'" }, { status: 400 });
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken || !phoneNumberId) {
    return NextResponse.json({ error: "WhatsApp credentials not configured" }, { status: 500 });
  }

  const phone = to.replace(/\D/g, "");

  const body = {
    messaging_product: "whatsapp",
    to: phone,
    type: "template",
    template: {
      name: template,
      language: { code: "en" },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: "Ruthva Test Clinic" }],
        },
      ],
    },
  };

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
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
    return NextResponse.json({
      httpStatus: res.status,
      whatsappResponse: data,
      sentTo: phone,
      template,
      phoneNumberId,
    });
  } catch (err) {
    return NextResponse.json({
      error: "Fetch failed",
      message: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
