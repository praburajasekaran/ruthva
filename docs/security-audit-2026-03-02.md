# Security Audit Report: Ruthva V1 Treatment Continuity Platform

**Date:** 2026-03-02
**Auditor:** Application Security Review (Pre-Implementation)
**Scope:** Architecture plan review against OWASP Top 10, DPDP Act 2023, and healthcare data handling standards
**Document Reviewed:** `docs/plans/2026-03-01-feat-ruthva-v1-treatment-continuity-platform-plan.md`

---

## Executive Summary

Ruthva V1 is a healthcare-adjacent SaaS platform storing patient PII (names, phone numbers) and treatment behavioral data for Indian Ayurveda clinics. The plan demonstrates awareness of key compliance requirements (DPDP Act, data localization) but has **15 security gaps** that must be addressed before production deployment. Of these, **4 are Critical**, **5 are High**, **4 are Medium**, and **2 are Low** severity.

The most urgent concerns are: absence of phone number encryption at rest, missing Gupshup webhook signature validation details, lack of rate limiting on OTP endpoints, and incomplete multi-tenant isolation enforcement.

---

## Risk Matrix Summary

| Severity | Count | Findings |
|----------|-------|----------|
| **CRITICAL** | 4 | C1-C4 |
| **HIGH** | 5 | H1-H5 |
| **MEDIUM** | 4 | M1-M4 |
| **LOW** | 2 | L1-L2 |

---

## CRITICAL Findings

### C1: Patient Phone Numbers Stored in Plaintext

**Location:** Prisma schema — `Patient.phone` field (plan line ~182-193)

**Issue:** The schema defines `phone String` with no encryption. Phone numbers are Indian mobile numbers (+91), which are classified as **personal data** under DPDP Act 2023 Section 2(t). Storing them in plaintext means:
- Any database breach exposes all patient phone numbers
- Database backups contain plaintext PII
- Neon support staff with database access can read patient phones
- SQL injection (if any) yields immediate PII exfiltration

**DPDP Act Impact:** Section 8(4) requires "reasonable security safeguards" for personal data. Plaintext storage of phone numbers does not meet this standard.

**Remediation:**
```prisma
model Patient {
  // ...
  phoneEncrypted  Bytes    // AES-256-GCM encrypted phone
  phoneHash       String   // SHA-256 hash for lookup by phone (with clinic_id salt)
  // ...
  @@unique([clinicId, phoneHash])
}
```

Implementation approach:
1. Use application-level encryption (AES-256-GCM) with a key stored in environment variables (not in the database)
2. Store a salted hash (`SHA-256(clinic_id + phone)`) for unique constraint lookups and search
3. Decrypt only when needed for Gupshup API calls (sending messages)
4. Consider using Neon's column-level encryption if available, or a library like `@47ng/cloak` for Prisma field encryption
5. Rotate encryption keys periodically; implement key versioning from the start

**Priority:** Must fix before first patient is added.

---

### C2: OTP Brute Force Protection Missing

**Location:** Authentication section (plan lines ~347-374)

**Issue:** The plan specifies "6-digit OTP, 10-minute expiry, stored as VerificationToken" but does not mention:
- Rate limiting on OTP verification attempts
- Account lockout after failed attempts
- Rate limiting on OTP generation (requesting new codes)

A 6-digit OTP has 1,000,000 possible combinations. At 10 requests/second (easily achievable), an attacker can exhaust the entire space in ~28 hours. With the 10-minute window, a targeted attack needs only ~6,000 attempts (10 req/s * 600 seconds) to cover a meaningful fraction.

**Attack scenario:** Attacker knows a doctor's email, requests OTP, then brute-forces the 6-digit code within the 10-minute window.

**Remediation:**
```typescript
// In the OTP verification API route:

// 1. Rate limit OTP verification: max 5 attempts per token
// Track attempts in the verification_tokens table or a separate counter
// After 5 failed attempts, invalidate the token entirely

// 2. Rate limit OTP requests: max 3 OTPs per email per 15 minutes
// Prevents attacker from requesting fresh codes continuously

// 3. Progressive delay: add exponential backoff after 3 failed attempts
// Attempt 1-3: instant
// Attempt 4: 5 second delay
// Attempt 5: 15 second delay (then lockout)

// 4. IP-based rate limiting on /api/auth endpoints
// Use upstash/ratelimit or similar:
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "10m"),
  analytics: true,
});

// In the verify endpoint:
const { success } = await ratelimit.limit(`otp-verify:${email}`);
if (!success) {
  return Response.json({ error: "Too many attempts" }, { status: 429 });
}
```

**Priority:** Must implement before auth goes live.

---

### C3: Gupshup Webhook Signature Validation — Specification Gap

**Location:** Webhook handler section (plan lines ~310-325), Quality Gates (line ~960)

**Issue:** The Quality Gates mention "Webhook endpoint validates Gupshup signature" but the implementation section (`POST /api/webhooks/gupshup`) provides zero detail on HOW this validation works. This is the most exposed endpoint in the entire system — it is:
- Publicly accessible (no auth)
- Receives external POST requests
- Directly creates events in the database (`adherence_response` events)
- Influences risk scoring and recovery message triggers

Without proper validation, an attacker can:
- Forge patient responses (fake "yes" replies to lower risk scores)
- Inject malicious event data via the `metadata` JSONB field
- Trigger or suppress recovery messages
- Manipulate the entire patient risk state

**Remediation:**
```typescript
// /api/webhooks/gupshup/route.ts

import { createHmac } from 'crypto';

export async function POST(request: Request) {
  // 1. Validate Gupshup signature header
  const signature = request.headers.get('x-gupshup-signature');
  const rawBody = await request.text();

  if (!signature) {
    return Response.json({ error: 'Missing signature' }, { status: 401 });
  }

  const expectedSignature = createHmac('sha256', process.env.GUPSHUP_WEBHOOK_SECRET!)
    .update(rawBody)
    .digest('hex');

  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    console.error('Webhook signature mismatch');
    return Response.json({ error: 'Invalid signature' }, { status: 403 });
  }

  // 2. Parse body only AFTER signature verification
  const payload = JSON.parse(rawBody);

  // 3. Validate payload structure with Zod
  const result = gupshupWebhookSchema.safeParse(payload);
  if (!result.success) {
    return Response.json({ error: 'Invalid payload' }, { status: 400 });
  }

  // 4. Verify the phone number in the webhook matches an existing patient
  // (prevents phantom event injection)

  // 5. Process the validated webhook...
}
```

Additional requirements:
- Use `crypto.timingSafeEqual` for signature comparison (prevents timing attacks)
- Implement replay protection: check for duplicate `message_id` values
- Add an IP allowlist for Gupshup's webhook source IPs if they publish them
- Log all rejected webhook attempts for security monitoring

**Priority:** Must implement correctly before enabling webhooks.

---

### C4: Multi-Tenant Data Isolation — No Enforcement Layer

**Location:** Quality Gates (line ~963), Database schema (lines ~106-223)

**Issue:** The plan states "Database queries scoped to clinic_id (no cross-tenant data leaks)" in Quality Gates, but the schema and architecture provide NO enforcement mechanism. The current design relies entirely on developer discipline — every single query must manually include `WHERE clinic_id = ?`.

Critical gaps:
1. **Journeys table has no `clinic_id` column** — it links to `patient_id`, requiring a JOIN to reach `clinic_id`. This makes tenant scoping on journey queries more complex and error-prone.
2. **Events table has no `clinic_id` column** — requires a double JOIN (events -> journeys -> patients) to reach `clinic_id`.
3. **No Row Level Security (RLS)** — Neon Postgres supports RLS, which would enforce tenant isolation at the database level.
4. **No middleware enforcement** — no mention of a data access layer that automatically injects `clinic_id` filtering.

**Attack scenario:** A bug in any API route or server action that forgets the clinic_id filter exposes ALL patients across ALL clinics.

**Remediation (choose one or both):**

**Option A — Denormalize `clinic_id` onto all tables (recommended for V1):**
```prisma
model Journey {
  // ... existing fields
  clinicId  String   // Denormalized for direct tenant scoping
  clinic    Clinic   @relation(fields: [clinicId], references: [id])
  // ...
  @@index([clinicId])
}

model Event {
  // ... existing fields
  clinicId  String   // Denormalized for direct tenant scoping
  clinic    Clinic   @relation(fields: [clinicId], references: [id])
  // ...
  @@index([clinicId])
}
```

**Option B — Postgres Row Level Security:**
```sql
-- Enable RLS on all tables
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create policy using session variable
CREATE POLICY tenant_isolation ON patients
  USING (clinic_id = current_setting('app.current_clinic_id'));
```

**Option C — Prisma middleware (minimum viable):**
```typescript
// lib/db.ts — Prisma middleware that auto-injects clinic_id
prisma.$use(async (params, next) => {
  const clinicId = getCurrentClinicId(); // from auth session

  if (params.model === 'Patient' && ['findMany', 'findFirst', 'update', 'delete'].includes(params.action)) {
    params.args.where = { ...params.args.where, clinicId };
  }
  // Similar for Journey, Event with joins

  return next(params);
});
```

**Priority:** Must be architecturally decided before schema migration.

---

## HIGH Findings

### H1: DPDP Act Consent Implementation Gaps

**Location:** DPDP section (lines ~376-388), Patient schema (lines ~119-128)

**Issues identified:**
1. **Consent is verbal only** — "Patient has given verbal consent for treatment monitoring via WhatsApp." The DPDP Act 2023 Section 6 requires consent to be "free, specific, informed and unambiguous." Verbal consent checked by staff is weak evidence.

2. **No consent record versioning** — if the consent text changes, there is no record of WHICH version the patient consented to.

3. **No consent withdrawal mechanism** — DPDP Act Section 6(6) requires the ability to withdraw consent "at any time, with ease." The plan mentions a deletion endpoint but not consent withdrawal (which is different — withdrawal stops processing but may not delete data).

4. **No Data Processing Agreement (DPA) with Gupshup** — patient phone numbers are sent to Gupshup (a third-party data processor). DPDP Act Section 8(7) requires a valid contract with data processors.

**Remediation:**
```prisma
model PatientConsent {
  id              String   @id @default(cuid())
  patientId       String
  patient         Patient  @relation(fields: [patientId], references: [id])
  consentVersion  String   // e.g., "v1.0" — links to consent text version
  consentText     String   // The exact text consented to
  consentMethod   String   // "verbal_staff" | "whatsapp_opt_in" | "written"
  givenAt         DateTime
  withdrawnAt     DateTime?
  withdrawnMethod String?  // "patient_request" | "whatsapp_stop" | "staff_action"
  createdAt       DateTime @default(now())
}
```

Additionally:
- Implement WhatsApp STOP keyword handling — if patient sends "STOP" to the Gupshup number, automatically set `withdrawnAt` and pause all messaging
- Document a clear consent text template that meets DPDP "informed" requirement
- Establish a DPA with Gupshup before processing patient phone numbers

---

### H2: No API Route Authentication Middleware Pattern

**Location:** File structure (lines ~707-734), Architecture section

**Issue:** The plan shows API routes at `app/api/` but defines no authentication middleware pattern. In Next.js App Router:
- Server Components can check sessions easily
- API Routes and Server Actions require explicit auth checks
- There is no mention of `middleware.ts` for route protection

Without a systematic approach, individual routes may lack auth checks.

**Remediation:**
```typescript
// middleware.ts — protect all /app routes
import { auth } from "@/lib/auth";

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname.startsWith("/api/") &&
      !req.nextUrl.pathname.startsWith("/api/webhooks/") &&
      !req.nextUrl.pathname.startsWith("/api/auth/")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!req.auth && !req.nextUrl.pathname.startsWith("/login") &&
      !req.nextUrl.pathname.startsWith("/api/")) {
    return Response.redirect(new URL("/login", req.url));
  }
});

export const config = {
  matcher: ["/((?!_next|icon-|sw\\.js|manifest|offline).*)"],
};
```

Additionally:
- Every Server Action should verify `auth()` at the top
- The clinic_id should be derived from the session, NEVER from user input
- Webhook routes (`/api/webhooks/gupshup`) must be explicitly excluded from auth but must validate signatures (see C3)

---

### H3: JSONB Metadata Field — Injection and Schema Validation

**Location:** Events table schema (line ~216), Event types table (lines ~230-241)

**Issue:** The `metadata Json @default("{}")` field on the Events table accepts arbitrary JSON. This field is populated from:
1. System-generated events (controlled)
2. Gupshup webhook payloads (external input)
3. Staff actions (semi-controlled)

Without strict schema validation per event type, this field is vulnerable to:
- JSON injection (oversized payloads causing storage issues)
- Schema pollution (unexpected fields that break downstream processing)
- XSS payloads stored in metadata that render on the patient timeline UI

**Remediation:**
```typescript
// lib/events.ts — Type-safe event creation with Zod validation

import { z } from 'zod';

const eventMetadataSchemas = {
  journey_started: z.object({
    duration: z.number().int().min(1).max(365),
    interval: z.number().int().min(1).max(90),
  }),
  adherence_response: z.object({
    response: z.enum(["yes", "missed", "help_needed"]),
    // NO freetext field — only structured quick-reply values
  }),
  recovery_message_sent: z.object({
    attempt: z.number().int().min(1).max(2),
    message_id: z.string().max(100),
  }),
  // ... define for all 9 event types
} as const;

// Validate metadata BEFORE database insertion
function createEvent(type: EventType, metadata: unknown) {
  const schema = eventMetadataSchemas[type];
  const validated = schema.parse(metadata); // throws on invalid
  // ... insert with validated metadata only
}
```

Also enforce a maximum metadata size (e.g., 10KB) at the application level.

---

### H4: Cron Worker Authentication and Authorization

**Location:** Architecture (lines ~64-91), Phase 4 (lines ~800-832)

**Issue:** The cron worker is a separate Railway service that connects directly to the same Neon database. The plan does not address:
1. How the cron worker authenticates to the database (separate credentials?)
2. Whether the cron worker has write access to ALL tables (it should be limited)
3. Whether there is a "manual trigger endpoint" and how that endpoint is secured
4. The cron worker processes ALL clinics — a bug could corrupt data across every tenant

**Remediation:**
- Use a separate database role for the cron worker with limited permissions (INSERT on events, UPDATE on journeys, SELECT on patients/journeys/events)
- The "manual trigger endpoint" mentioned in the error handling table MUST require admin authentication
- Add per-clinic error isolation — if processing for one clinic fails, continue with others
- Log all cron actions with clinic_id for audit trail
- Consider a cron execution lock (advisory lock in Postgres) to prevent overlapping runs

---

### H5: No Security Headers Configuration

**Location:** Not mentioned anywhere in the plan

**Issue:** The plan makes no mention of HTTP security headers. For a PWA handling health-adjacent data, this is a significant gap.

**Remediation:** Add to `next.config.ts`:
```typescript
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '0' }, // Disabled in favor of CSP
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // needed for Next.js, tighten with nonces
      "style-src 'self' 'unsafe-inline'",  // needed for Tailwind
      "img-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self' https://*.neon.tech",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join('; ')
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  },
];
```

---

## MEDIUM Findings

### M1: Service Worker Cache Security

**Location:** PWA Configuration (lines ~390-395), Tech stack best practices doc

**Issue:** The Serwist service worker uses `defaultCache` which includes runtime caching. If patient data (names, risk levels, phone numbers) is returned in API responses that get cached by the service worker, this data persists in the browser's Cache Storage even after logout.

**Remediation:**
- Configure Serwist to NEVER cache API responses containing patient data (`/api/patients/*`, `/api/dashboard/*`)
- Clear all caches on logout: `caches.keys().then(keys => keys.forEach(key => caches.delete(key)))`
- Use `Cache-Control: no-store` headers on all API responses containing PII
- The offline fallback should show a generic page, not cached patient data

---

### M2: Session Management Gaps

**Location:** Authentication section (lines ~364-374)

**Issue:** The plan uses "database session strategy" where "sessions persist across device restarts." For a shared-device model (staff share a clinic tablet), this creates risks:
1. No session timeout specified — sessions could persist indefinitely
2. No concurrent session limit — doctor's account could be active on unlimited devices
3. Shared device model means anyone who picks up the tablet has access
4. No audit log of session creation/destruction

**Remediation:**
- Set session expiry: `maxAge: 30 * 24 * 60 * 60` (30 days) in Auth.js config, with `updateAge: 24 * 60 * 60` (refresh daily)
- Implement "active sessions" view in Settings (V1 or V2)
- Add inactivity timeout: after 15 minutes of no interaction, require re-authentication (PIN or OTP)
- Log session creation events for security audit

---

### M3: Input Validation on Patient Creation

**Location:** Add Patient Form (lines ~620-665), Prisma schema

**Issue:** The plan mentions "All API routes have input validation (Zod schemas)" in Quality Gates but does not specify validation rules for critical fields:
- **Patient name**: No max length, no character restrictions. Could accept script tags, SQL, or extremely long strings.
- **Phone number**: No format validation specified beyond `inputmode="tel"` (client-side only).
- **Duration/interval**: Pill button UI constrains the frontend, but the API must independently validate.

**Remediation:**
```typescript
const createPatientSchema = z.object({
  name: z.string()
    .min(2, "Name too short")
    .max(100, "Name too long")
    .regex(/^[\p{L}\p{M}\s'.,-]+$/u, "Invalid characters in name"), // Unicode letters, marks, spaces, punctuation
  phone: z.string()
    .regex(/^\+91[6-9]\d{9}$/, "Must be valid Indian mobile number"),
  durationDays: z.enum(["15", "30", "45", "60"]).transform(Number),
  followupIntervalDays: z.enum(["7", "14"]).transform(Number),
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: "Patient consent is required" }),
  }),
});
```

---

### M4: Error Information Leakage

**Location:** Not addressed in plan

**Issue:** The plan does not mention error handling strategy for API routes. Default Next.js error pages and Prisma error messages can leak:
- Database schema details (Prisma unique constraint error messages include field names)
- Stack traces in non-production environments
- Internal server paths

**Remediation:**
- Implement a global error handler that maps internal errors to generic user-facing messages
- Never return Prisma errors directly to the client
- Use error codes (e.g., `PATIENT_DUPLICATE_PHONE`) instead of database error messages
- Ensure `NODE_ENV=production` in Railway deployment
- Configure Next.js error boundary pages (`error.tsx`, `not-found.tsx`)

---

## LOW Findings

### L1: Environment Variable Management

**Location:** Phase 5 tasks (line ~849), Quality Gates (line ~964)

**Issue:** The plan mentions `.env.example` documentation but does not address:
- How secrets are managed in Railway (should use Railway's encrypted environment variables)
- Whether there is a process for secret rotation
- Multiple sensitive values: `GUPSHUP_API_KEY`, `GUPSHUP_WEBHOOK_SECRET`, `RESEND_API_KEY`, `DATABASE_URL`, `AUTH_SECRET`

**Remediation:**
- Document all required environment variables with descriptions
- Use Railway's native environment variable management (encrypted at rest)
- Plan for key rotation — the application should support hot-reloading of API keys
- Never log environment variable values; add a startup check that validates all required vars are present

---

### L2: Dependency Supply Chain

**Location:** Tech stack throughout plan

**Issue:** No mention of dependency security scanning. The stack includes several npm packages that should be monitored:
- `@auth/prisma-adapter`, `next-auth` (auth-critical)
- `@prisma/client` (database-critical)
- `@serwist/next` (controls service worker behavior)
- Gupshup SDK or HTTP client

**Remediation:**
- Enable GitHub Dependabot or Snyk for automated dependency vulnerability scanning
- Pin exact versions in `package.json` (not ranges)
- Run `npm audit` as part of CI/CD pipeline
- Review changelogs before updating auth and database packages

---

## OWASP Top 10 (2021) Compliance Assessment

| # | Category | Status | Notes |
|---|----------|--------|-------|
| A01 | Broken Access Control | **GAP** | No middleware enforcement, no RLS, clinic_id isolation relies on developer discipline (C4, H2) |
| A02 | Cryptographic Failures | **GAP** | Phone numbers stored plaintext (C1), no mention of TLS certificate pinning for Gupshup API calls |
| A03 | Injection | **PARTIAL** | Prisma ORM prevents SQL injection by default; JSONB metadata field needs schema validation (H3) |
| A04 | Insecure Design | **PARTIAL** | Auth flow lacks rate limiting (C2); shared device model lacks session controls (M2) |
| A05 | Security Misconfiguration | **GAP** | No security headers (H5); no CSP; error handling not specified (M4) |
| A06 | Vulnerable Components | **PARTIAL** | No dependency scanning process (L2); modern stack is a positive |
| A07 | Auth Failures | **GAP** | OTP brute force unprotected (C2); no session timeout (M2) |
| A08 | Data Integrity Failures | **GAP** | Webhook signature validation unspecified (C3); no code signing for cron worker |
| A09 | Logging & Monitoring | **GAP** | No security event logging, no intrusion detection, no alerting mentioned |
| A10 | SSRF | **OK** | No user-controlled URL fetching in V1 |

---

## DPDP Act 2023 Compliance Checklist

| Requirement | Section | Status | Gap |
|-------------|---------|--------|-----|
| Lawful purpose for processing | S4 | **OK** | Treatment continuity is a legitimate purpose |
| Free, specific, informed consent | S6 | **PARTIAL** | Verbal consent only; no consent versioning; no withdrawal mechanism (H1) |
| Consent withdrawal | S6(6) | **MISSING** | No mechanism for patients to withdraw consent (H1) |
| Data localization | S16/S17 | **OK** | Neon Mumbai; verify Railway region does not cache PII |
| Reasonable security safeguards | S8(4) | **GAP** | Phone numbers in plaintext (C1); no encryption at rest for PII |
| Data processor contract | S8(7) | **MISSING** | No DPA with Gupshup mentioned (H1) |
| Data retention limits | S8(8) | **MISSING** | No data retention policy; journeys/events stored indefinitely |
| Right to erasure | S12 | **PARTIAL** | Deletion API endpoint planned but no UI; must also delete from Gupshup logs |
| Breach notification | S8(6) | **MISSING** | No breach notification process; DPDP requires notification to DPB within 72 hours |
| Grievance officer | S8(10) | **MISSING** | Must designate a person/email for data protection grievances |
| Data Protection Impact Assessment | Rule 6 | **MISSING** | DPIA recommended for health-adjacent data processing |

---

## Remediation Roadmap (Priority Order)

### Before First Patient Data (Week 1-2)

1. **C1** — Implement phone number encryption at rest (AES-256-GCM + hash for lookups)
2. **C2** — Add OTP rate limiting (5 attempts per token, 3 requests per email per 15 min)
3. **C4** — Decide on tenant isolation strategy (denormalize clinic_id OR implement RLS)
4. **H2** — Create auth middleware.ts protecting all /app and /api routes
5. **H5** — Configure security headers in next.config.ts
6. **M3** — Define Zod validation schemas for all input endpoints

### Before WhatsApp Integration (Week 3)

7. **C3** — Implement Gupshup webhook signature validation with timing-safe comparison
8. **H3** — Create typed metadata schemas for all 9 event types
9. **H1** — Enhance consent model (versioning, withdrawal, STOP keyword handling)
10. **H1** — Execute DPA with Gupshup

### Before Production Launch (Week 5-6)

11. **H4** — Secure cron worker (separate DB role, execution locks, per-clinic error isolation)
12. **M1** — Configure service worker cache exclusions for PII-containing routes
13. **M2** — Implement session timeout and inactivity lockout
14. **M4** — Build global error handler, sanitize all client-facing error messages
15. **L1** — Document and validate all environment variables
16. **L2** — Enable dependency vulnerability scanning

### Post-Launch (Ongoing)

17. Implement security event logging and monitoring
18. Conduct penetration testing after V1 is stable
19. Complete DPDP compliance items: breach notification process, grievance officer, DPIA, data retention policy
20. Regular security review cadence (quarterly)

---

## Positive Security Observations

The plan gets several things right:

1. **Data localization awareness** — Choosing Neon Mumbai over Railway Postgres specifically for DPDP compliance shows good regulatory awareness.
2. **Separating auth from WhatsApp** — Using email OTP keeps the auth pathway independent from the patient messaging channel, reducing attack surface.
3. **Event-sourced design** — Immutable event log provides a natural audit trail for compliance.
4. **No medical content in messages** — Careful message template wording avoids medical data leakage via WhatsApp.
5. **Consent at creation** — Blocking patient creation without consent is the right architectural choice.
6. **Prisma ORM** — Parameterized queries by default eliminate most SQL injection vectors.
7. **Quality Gates awareness** — The plan explicitly lists Zod validation, webhook signature validation, and clinic_id scoping as quality gates.
8. **Idempotent cron design** — Prevents duplicate event creation from retry scenarios.

---

*This audit covers the architectural plan only. A follow-up code review should be conducted after implementation to verify these recommendations are correctly applied.*
