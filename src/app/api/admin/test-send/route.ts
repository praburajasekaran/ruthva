import { NextRequest, NextResponse } from "next/server";

/**
 * GET: Debug token permissions
 * POST: Send a test WhatsApp message
 * Both secured with CRON_SECRET.
 */
export async function GET(request: NextRequest) {
  const secret = request.headers.get("x-cron-secret");
  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;

  const results: Record<string, unknown> = {
    phoneNumberId,
    tokenPrefix: accessToken ? accessToken.substring(0, 20) + "..." : "NOT SET",
  };

  try {
    // 1. Check token identity
    const meRes = await fetch(`https://graph.facebook.com/v21.0/me?access_token=${accessToken}`);
    results.me = await meRes.json();

    // 2. Check token debug info
    const debugRes = await fetch(
      `https://graph.facebook.com/v21.0/debug_token?input_token=${accessToken}&access_token=${accessToken}`
    );
    results.tokenDebug = await debugRes.json();

    // 3. Check WABA assignment
    const meId = (results.me as { id?: string })?.id;
    if (meId) {
      const wabaRes = await fetch(
        `https://graph.facebook.com/v21.0/${meId}/assigned_whatsapp_business_accounts?access_token=${accessToken}`
      );
      results.assignedWabas = await wabaRes.json();
    }

    // 4. Check phone number details
    const phoneRes = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,platform_type&access_token=${accessToken}`
    );
    results.phoneNumber = await phoneRes.json();

  } catch (err) {
    results.error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(results);
}

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
