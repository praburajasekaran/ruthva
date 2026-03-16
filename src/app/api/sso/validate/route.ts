import { NextResponse } from "next/server";
import { secretsEqual } from "@/lib/secrets";
import { consumeSsoToken } from "@/lib/sso";

export async function POST(request: Request) {
  const secret = request.headers.get("x-ruthva-secret");
  if (!secretsEqual(secret, process.env.RUTHVA_INTEGRATION_SECRET)) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid or missing X-Ruthva-Secret header" },
      { status: 401 }
    );
  }

  const body = await request.json();
  const { token } = body;

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { error: "Bad Request", message: "Missing token" },
      { status: 400 }
    );
  }

  const result = await consumeSsoToken(token);

  if (!result) {
    return NextResponse.json(
      { error: "Unauthorized", message: "Invalid, expired, or already-used token" },
      { status: 401 }
    );
  }

  return NextResponse.json({
    userId: result.user.id,
    email: result.user.email,
    name: result.user.name,
    clinicId: result.clinic?.id ?? null,
    clinicName: result.clinic?.name ?? null,
    doctorName: result.clinic?.doctorName ?? null,
    externalSubdomain: result.clinic?.externalSubdomain ?? null,
  });
}
