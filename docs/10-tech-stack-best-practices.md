# Ruthva Tech Stack Best Practices (March 2026)

Practical guidance for a solo builder shipping in 6 weeks. Current as of Q1 2026.

---

## 1. Next.js 15 PWA

### Library Choice: Serwist (recommended)
- **next-pwa (shadowwalker)**: DEPRECATED. Do not use.
- **@ducanh2912/next-pwa**: Maintained fork, works but less community.
- **Serwist**: Active successor to next-pwa. Built on Workbox. Full App Router support. Use this.
- **Zero-dependency**: Next.js 15 has built-in manifest support via `app/manifest.ts`. For minimal PWAs (installability + push), you may not need Serwist at all.

### Setup Steps

#### a. Install
```bash
npm install @serwist/next && npm install -D serwist
```

#### b. next.config.ts
```ts
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist({
  // your next config
});
```

#### c. app/sw.ts (Service Worker)
```ts
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [{ url: "/offline", matcher({ request }) { return request.destination === "document"; } }],
  },
});

serwist.addEventListeners();
```

#### d. app/manifest.ts
```ts
import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Ruthva - Patient Follow-up",
    short_name: "Ruthva",
    description: "Automated patient follow-up for Indian doctors",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#0066CC",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
```

#### e. tsconfig.json additions
```json
{
  "compilerOptions": {
    "lib": ["esnext", "webworker"],
    "types": ["@serwist/next/typings"]
  }
}
```

#### f. Offline page
Create `app/offline/page.tsx` for graceful offline fallback.

### Key Patterns
- **Middleware conflict**: Next.js middleware can block `/sw.js` and `/manifest.webmanifest`. Add matcher exclusions.
- **Cache strategies**: Use `StaleWhileRevalidate` for API data, `CacheFirst` for static assets.
- **Register manually** if needed: set `register: false` in config, then `window.serwist.register()` in useEffect.

---

## 2. Magic Link Authentication

### CRITICAL: Lucia Auth is DEPRECATED (March 2025). Do NOT use for new projects.

### Recommended: Auth.js v5 (NextAuth v5) or Better Auth

| Feature | Auth.js v5 | Better Auth |
|---------|-----------|-------------|
| Maturity | Battle-tested, large ecosystem | Newer, TypeScript-first |
| Magic links | Built-in Email provider | Built-in with Resend |
| App Router | Full support | Full support |
| Database | Adapters (Prisma, Drizzle) | Prisma, Drizzle |
| Edge runtime | Supported | Supported |
| JWT + DB sessions | Both | DB sessions |

### Recommendation for Ruthva: Auth.js v5
- More battle-tested for production
- Easier to find help/examples
- Magic link via Resend email provider

### Auth.js v5 Magic Link Setup
```ts
// auth.ts
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./lib/prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      from: "noreply@ruthva.in",
      // Resend API key via RESEND_API_KEY env var
    }),
  ],
});
```

### India-Specific: WhatsApp OTP > Email Magic Link
- **70% of Indian users prefer WhatsApp for verification** (Meta Business Report)
- **98% open rate** on WhatsApp vs 70% SMS vs ~20% email
- **Multi-channel flow**: WhatsApp OTP first -> SMS OTP fallback -> Email magic link last resort
- **Cost**: WhatsApp OTP ~Rs 0.25/msg vs SMS Rs 0.10-0.25/msg

#### Recommended Auth Flow for Indian Doctors:
1. Enter phone number
2. Send OTP via WhatsApp (Gupshup authentication template)
3. Fallback to SMS OTP (MSG91 or Gupshup) if WhatsApp fails
4. Store session in DB via Auth.js adapter
5. Keep email as optional profile field for receipts/exports

---

## 3. Gupshup WhatsApp Business API

### Pricing (India, effective July 2025)
- **Per-message pricing** (replacing per-conversation): effective July 1, 2025
- **Gupshup markup**: $0.001 (~Rs 0.08) per message + Meta fees
- **Utility templates in 24hr window**: FREE (from July 2025)
- **Service conversations**: FREE (unlimited, since Nov 2024)
- **Authentication templates**: Telescopic pricing based on volume
- **Marketing**: Highest cost category; avoid unless needed

### Template Categories
| Category | Use Case | Cost (India) |
|----------|----------|------|
| UTILITY | Appointment reminders, follow-up status | Free in 24hr window |
| AUTHENTICATION | OTP codes, login verification | ~Rs 0.15-0.25/msg |
| MARKETING | Promotions, offers | ~Rs 0.80-1.00/msg |

### Template Approval Process
1. Create template in Gupshup dashboard or via API
2. Submit for Meta review (usually 24-48 hours)
3. Keep templates under 550 characters, max 10 emojis
4. **WARNING**: Meta does daily reviews and auto-reclassifies utility->marketing if promotional. Write templates carefully.

### Webhook Pattern (Node.js/Express)
```ts
// app/api/webhooks/gupshup/route.ts (Next.js App Router)
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json();

  // Acknowledge IMMEDIATELY (Gupshup expects < 10s response)
  // Process async after response
  const messageId = body.payload?.id;

  // Deduplicate: check if messageId already processed
  // Store in Redis or DB

  // Handle message types
  switch (body.type) {
    case "message":
      // Incoming message from patient
      await processIncomingMessage(body.payload);
      break;
    case "message-event":
      // Delivery status: sent, delivered, read, failed
      await updateDeliveryStatus(body.payload);
      break;
    case "user-event":
      // Opt-in/out events
      await handleOptEvent(body.payload);
      break;
  }

  return NextResponse.json({ status: "ok" });
}
```

### Interactive Button Messages
```ts
// Sending interactive button message via Gupshup API
const sendFollowUpButton = async (phone: string, patientName: string) => {
  const message = {
    type: "quick_reply",
    content: {
      type: "text",
      text: `Hi ${patientName}, how are you feeling today after your treatment?`,
    },
    options: [
      { type: "text", title: "Better" },
      { type: "text", title: "Same" },
      { type: "text", title: "Worse" },
    ],
  };

  await fetch("https://api.gupshup.io/wa/api/v1/msg", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      apikey: process.env.GUPSHUP_API_KEY!,
    },
    body: new URLSearchParams({
      channel: "whatsapp",
      source: process.env.GUPSHUP_PHONE!,
      destination: phone,
      "src.name": process.env.GUPSHUP_APP_NAME!,
      message: JSON.stringify(message),
    }),
  });
};
```

### Delivery Status Tracking
Track these statuses for each message: `enqueued` -> `sent` -> `delivered` -> `read` -> `failed`
Store in events table with message_id as aggregate_id.

### Rate Limits
- New WhatsApp Business accounts: 250 business-initiated conversations/24hrs
- After verification: 1,000/24hrs, then 10,000, then 100,000
- Tier upgrades are automatic based on quality rating

---

## 4. Event-Sourced Architecture in PostgreSQL

### Core Schema
```sql
-- Events table (append-only log)
CREATE TABLE events (
  id            BIGSERIAL PRIMARY KEY,
  aggregate_type VARCHAR(50) NOT NULL,      -- 'patient', 'appointment', 'followup'
  aggregate_id  UUID NOT NULL,               -- patient_id, appointment_id, etc.
  event_type    VARCHAR(100) NOT NULL,       -- 'patient.registered', 'followup.sent'
  event_data    JSONB NOT NULL DEFAULT '{}', -- event payload
  metadata      JSONB NOT NULL DEFAULT '{}', -- actor_id, ip, source, correlation_id
  version       INTEGER NOT NULL,            -- per-aggregate sequence number
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Optimistic concurrency: prevents duplicate versions per aggregate
  CONSTRAINT unique_aggregate_version UNIQUE (aggregate_type, aggregate_id, version)
);

-- Essential indexes
CREATE INDEX idx_events_aggregate
  ON events (aggregate_type, aggregate_id, version);

CREATE INDEX idx_events_type
  ON events (event_type);

CREATE INDEX idx_events_created_at
  ON events (created_at);

-- GIN index for querying JSONB metadata (e.g., find by doctor_id)
CREATE INDEX idx_events_metadata_gin
  ON events USING GIN (metadata);

-- Partial GIN index for specific event types (more efficient)
CREATE INDEX idx_events_followup_data
  ON events USING GIN (event_data)
  WHERE event_type LIKE 'followup.%';
```

### Optimistic Concurrency
The `UNIQUE (aggregate_type, aggregate_id, version)` constraint automatically rejects concurrent writes with the same version. No explicit locking needed:

```ts
// Append event with version check
async function appendEvent(
  aggregateType: string,
  aggregateId: string,
  eventType: string,
  eventData: object,
  expectedVersion: number,
  metadata: object = {}
) {
  try {
    await db.query(
      `INSERT INTO events (aggregate_type, aggregate_id, event_type, event_data, metadata, version)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [aggregateType, aggregateId, eventType, eventData, metadata, expectedVersion + 1]
    );
  } catch (err: any) {
    if (err.code === "23505") {
      // Unique constraint violation = concurrent modification
      throw new ConcurrencyError(`Aggregate ${aggregateId} was modified concurrently`);
    }
    throw err;
  }
}
```

### Computing State from Events
```ts
// Rebuild patient state from event stream
async function getPatientState(patientId: string) {
  const events = await db.query(
    `SELECT event_type, event_data, version, created_at
     FROM events
     WHERE aggregate_type = 'patient' AND aggregate_id = $1
     ORDER BY version ASC`,
    [patientId]
  );

  return events.rows.reduce((state, event) => {
    switch (event.event_type) {
      case "patient.registered":
        return { ...state, ...event.event_data, status: "active" };
      case "patient.treatment_recorded":
        return {
          ...state,
          treatments: [...(state.treatments || []), event.event_data],
        };
      case "patient.followup_completed":
        return { ...state, lastFollowup: event.event_data };
      case "patient.consent_withdrawn":
        return { ...state, status: "consent_withdrawn", consentWithdrawnAt: event.created_at };
      default:
        return state;
    }
  }, {} as any);
}
```

### Partitioning (when events > 10M rows)
```sql
-- Partition by month
CREATE TABLE events (
  id            BIGSERIAL,
  aggregate_type VARCHAR(50) NOT NULL,
  aggregate_id  UUID NOT NULL,
  event_type    VARCHAR(100) NOT NULL,
  event_data    JSONB NOT NULL DEFAULT '{}',
  metadata      JSONB NOT NULL DEFAULT '{}',
  version       INTEGER NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions (automate this with pg_partman or cron)
CREATE TABLE events_2026_01 PARTITION OF events
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
CREATE TABLE events_2026_02 PARTITION OF events
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');
-- ... etc
```

### Practical Tips for Solo Builder
- **Start WITHOUT partitioning**. PostgreSQL handles millions of rows fine with proper indexes.
- **Add a `snapshots` table** for hot aggregates (patients with 100+ events):
  ```sql
  CREATE TABLE snapshots (
    aggregate_type VARCHAR(50) NOT NULL,
    aggregate_id   UUID NOT NULL,
    version        INTEGER NOT NULL,
    state          JSONB NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (aggregate_type, aggregate_id)
  );
  ```
- **Don't over-event**: Not everything needs to be an event. Use events for patient timeline, follow-ups, consent changes. Use regular CRUD for user settings, template content.
- **Projections**: Materialize read models for dashboards. A nightly cron (or on-write trigger) that builds a `patient_summary` view.

---

## 5. India DPDP Act 2023 Compliance

### What Ruthva Needs (Minimum Viable Compliance)

You are a **Data Fiduciary** under DPDP Act. Patient names, phone numbers, treatment data = personal data.

### Mandatory Requirements

#### a. Consent Collection
```
Before first use, show consent screen:
- What data you collect (name, phone, treatment notes)
- Why (follow-up reminders, treatment tracking)
- How long you keep it (specify retention period)
- Right to withdraw consent anytime
- Right to request deletion

Store consent as an EVENT in your event store:
  event_type: "patient.consent_granted"
  event_data: {
    purposes: ["treatment_followup", "whatsapp_reminders"],
    version: "1.0",
    language: "en",
    ip: "...",
    granted_at: "2026-03-01T10:00:00Z"
  }
```

#### b. Consent Withdrawal (must be as easy as granting)
- Provide a clear "Delete my data" or "Withdraw consent" button
- WhatsApp reply "STOP" should trigger opt-out
- Process within 72 hours
- Log as event: `patient.consent_withdrawn`

#### c. Data Minimization
- Collect ONLY: name, phone, treatment type, follow-up dates
- Do NOT collect: Aadhaar, full address, detailed medical records (unless essential)
- Treatment "notes" should be minimal — condition + treatment, not full clinical notes

#### d. Data Retention
- Define retention period upfront (e.g., "3 years after last treatment")
- After retention period: auto-anonymize or delete
- Healthcare records retention: align with state-specific medical records retention laws (typically 3 years minimum under Indian Medical Council guidelines)
- **Implementation**: Nightly cron job checks `last_active_at` and flags patients for deletion

#### e. Data Deletion
- Must delete from live DB when requested
- Backups: OK to keep encrypted backups if not accessible through normal access, will be overwritten on next cycle
- Log deletion event BEFORE deleting: `patient.data_deleted` (for audit)

#### f. Breach Response
- Notify Data Protection Board of India within **72 hours** of breach discovery
- Notify affected patients
- Keep incident log

#### g. Data Localization
- Store all data in India-region servers
- Railway.com: currently no India region. Options:
  1. Use Railway for app hosting + Neon/Supabase Postgres with Mumbai region
  2. Use AWS ap-south-1 (Mumbai) for Postgres
  3. Accept risk if Railway servers are in US (technically non-compliant for data localization)

### Technical Checklist
- [ ] Consent screen before first patient data entry
- [ ] Consent stored as immutable event with timestamp
- [ ] "Delete my data" workflow accessible from app + WhatsApp
- [ ] Encryption at rest (PostgreSQL TDE or column-level)
- [ ] Encryption in transit (TLS everywhere)
- [ ] Access logging (who accessed what patient data, when)
- [ ] Data Processing Agreement with Gupshup (they process patient phone numbers)
- [ ] Privacy policy page (linked from app + WhatsApp)
- [ ] Retention policy defined and enforced via cron

### Penalties
- Up to **Rs 250 crore** for major violations
- DPDP Rules 2025 are in force — this is not theoretical

---

## 6. Railway.com Deployment

### Architecture
```
Railway Project
├── Service: ruthva-web (Next.js 15)
│   ├── output: standalone
│   ├── PORT: auto-assigned
│   └── DATABASE_URL: reference from postgres
├── Service: ruthva-cron (Cron worker)
│   ├── Schedule: 0 2 * * * (2 AM UTC = 7:30 AM IST)
│   ├── Runs: node scripts/nightly-risk-scoring.js
│   └── DATABASE_URL: reference from postgres
└── Database: PostgreSQL (managed)
    └── Railway-managed PostgreSQL
```

### Next.js Standalone Setup

#### next.config.ts
```ts
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
};
export default nextConfig; // wrap with withSerwist as shown above
```

#### Dockerfile (for Railway)
```dockerfile
FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

### Environment Variables
```bash
# Railway auto-provides these for managed Postgres:
DATABASE_URL=postgresql://... # auto-linked from Postgres service

# App secrets (set in Railway dashboard):
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://app.ruthva.in
RESEND_API_KEY=...
GUPSHUP_API_KEY=...
GUPSHUP_APP_NAME=...
GUPSHUP_PHONE=...
```

**CRITICAL**: `NEXT_PUBLIC_*` variables are inlined at BUILD TIME. Set them in Railway's build environment, not just runtime.

### Cron Job Setup
Railway cron jobs are separate services. They cannot be part of the web service.

```json
// package.json script
{
  "scripts": {
    "cron:risk-scoring": "npx tsx scripts/nightly-risk-scoring.ts"
  }
}
```

In Railway dashboard:
1. Create new service in same project
2. Set "Cron Schedule": `0 2 * * *` (2 AM UTC)
3. Set "Start Command": `npm run cron:risk-scoring`
4. Link same DATABASE_URL from Postgres service
5. Cron service MUST exit cleanly after completion (close DB connections)

### Cron Job Best Practices
```ts
// scripts/nightly-risk-scoring.ts
import { prisma } from "../lib/prisma";

async function main() {
  console.log(`[${new Date().toISOString()}] Risk scoring started`);

  try {
    // Idempotent: use upsert, not insert
    const patients = await prisma.patient.findMany({
      where: { status: "active" },
    });

    for (const patient of patients) {
      const riskScore = await computeRiskScore(patient.id);
      await prisma.patientRiskScore.upsert({
        where: { patientId: patient.id },
        update: { score: riskScore, computedAt: new Date() },
        create: { patientId: patient.id, score: riskScore, computedAt: new Date() },
      });
    }

    console.log(`[${new Date().toISOString()}] Risk scoring completed: ${patients.length} patients`);
  } catch (err) {
    console.error("Risk scoring failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect(); // MUST close connections
    process.exit(0);
  }
}

main();
```

### Managed PostgreSQL
- Railway provides managed PostgreSQL with automatic backups
- Supports pg_cron extension natively (alternative to separate cron service)
- **No India region available** — data will be in US/EU
- For DPDP compliance: consider Neon (has Mumbai preview) or Supabase (Singapore closest) or AWS RDS Mumbai

### Railway Pricing Awareness
- Hobby plan: $5/month base
- Usage-based: ~$0.000463/min for services
- PostgreSQL: ~$0.000231/GB-hour storage
- Cron jobs: billed for execution time only (shuts down between runs)

---

## Quick Decision Matrix for Solo Builder

| Decision | Recommendation | Why |
|----------|---------------|-----|
| PWA library | Serwist | Active, Workbox-based, App Router native |
| Auth | Auth.js v5 + WhatsApp OTP | Battle-tested + India-appropriate |
| WhatsApp API | Gupshup | Best Indian BSP, good developer API |
| Event store | PostgreSQL JSONB | Simple, no extra infra, good enough to 10M+ events |
| Compliance | DPDP consent events + retention cron | Minimum viable compliance |
| Hosting | Railway (app) + external DB for India compliance | Or all-Railway if compliance risk acceptable |
| Email service | Resend | Simple API, good deliverability |
| OTP provider | Gupshup (WhatsApp) + MSG91 (SMS fallback) | Cost-effective combo for India |

---

## Data Localization Warning

**Railway has NO India region.** For strict DPDP compliance with patient data:

**Option A** (Recommended for launch): Railway for Next.js app + Neon Postgres (Mumbai region when available) or AWS RDS Mumbai
**Option B** (Simpler, higher risk): All on Railway, document in privacy policy that data is processed on US/EU servers with encryption
**Option C** (Future): Move to AWS/GCP Mumbai region when scaling

For a 6-week MVP targeting Indian doctors, Option B is pragmatic. Move to Option A before scaling.
