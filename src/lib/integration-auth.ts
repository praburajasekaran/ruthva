import { NextResponse } from "next/server";
import { secretsEqual } from "./secrets";
import { db } from "./db";

/**
 * Validates the X-Ruthva-Secret header and resolves the clinic by subdomain.
 * Returns the clinic if valid, or a NextResponse error if not.
 */
export async function validateIntegrationRequest(request: Request): Promise<
  | { ok: true; clinic: { id: string; name: string } }
  | { ok: false; response: NextResponse }
> {
  const secret = request.headers.get("x-ruthva-secret");

  if (!secretsEqual(secret, process.env.RUTHVA_INTEGRATION_SECRET)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Unauthorized", message: "Invalid or missing X-Ruthva-Secret header" },
        { status: 401 }
      ),
    };
  }

  const subdomain = request.headers.get("x-ruthva-subdomain");
  if (!subdomain) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Bad Request", message: "Missing X-Ruthva-Subdomain header" },
        { status: 400 }
      ),
    };
  }

  const clinic = await db.clinic.findUnique({
    where: { externalSubdomain: subdomain },
    select: { id: true, name: true },
  });

  if (!clinic) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Not Found", message: `No clinic linked to subdomain: ${subdomain}` },
        { status: 404 }
      ),
    };
  }

  return { ok: true, clinic };
}
