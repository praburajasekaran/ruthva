# Deployment Checklist: Ruthva V1 — Railway + Neon Postgres Mumbai

**Date:** 2026-03-02
**Stack:** Next.js 15 (standalone) on Railway + Cron Worker on Railway + Neon Postgres Mumbai
**External Services:** Gupshup WhatsApp API, Resend Email, Auth.js v5

---

## Critical Findings & Decisions Required

### 1. Railway Cron vs Node-Cron vs Upstash QStash

**Decision required before deployment.**

| Approach | How It Works | Pros | Cons |
|----------|-------------|------|------|
| **Railway Cron Service** (plan uses this) | Separate Railway service with cron schedule `0 2 * * *`. Railway spins up container, runs script, shuts down. | Native to Railway, billed only for execution time, clean separation from web service | Process MUST exit cleanly after completion (`prisma.$disconnect()` + `process.exit(0)`). No retry on failure without custom logic. Cold start adds 10-30s. |
| **Node-cron in web service** | `node-cron` package inside the Next.js process | No separate service cost, always warm | Ties cron to web service lifecycle. Railway restarts kill scheduled jobs. Memory shared with web requests. NOT recommended. |
| **Upstash QStash** | External service calls your API route on schedule | Automatic retries, dead letter queues, no separate service | Extra vendor dependency. Adds latency (US-based QStash calling Railway). Requires auth on cron endpoint. |

**Recommendation:** Railway Cron Service as planned. It matches the architecture diagram. The cron job (risk scoring, visit generation, adherence scheduling) runs nightly and must be idempotent. Railway cron is the simplest approach for a solo builder.

**Implementation requirements for Railway cron:**
- Cron entry point: `cron/index.ts` compiled to JS (use `npx tsx` or pre-compile)
- Start command: `npm run cron:nightly`
- Must call `prisma.$disconnect()` in `finally` block
- Must call `process.exit(0)` on success, `process.exit(1)` on failure
- Log start/end timestamps for debugging
- Add manual trigger endpoint: `POST /api/cron/trigger` with `CRON_SECRET` auth header for emergency re-runs

### 2. Neon Postgres Mumbai — Latency from Railway

**Railway has no India region.** Railway services run in US-West. Neon Postgres is in Mumbai (ap-south-1).

**Expected latency:** 200-350ms per database round-trip (US-West to Mumbai).

**Mitigation strategies (implement all):**
- Use Neon's **connection pooling** (pgbouncer) via the pooled connection string — reduces connection overhead
- Batch database queries in server components — avoid N+1 query patterns
- Use Prisma's `findMany` with `include` instead of sequential queries
- Dashboard page: single query with joins, not multiple sequential queries
- Cron worker: batch operations (process all patients in one query, not one-by-one)
- Set `connection_limit=10` in Prisma to avoid exhausting Neon's connection pool

**Neon connection strings (two required):**
```
# Pooled — used by Prisma Client at runtime (via pgbouncer on port 5432)
DATABASE_URL="postgresql://user:pass@ep-xxx.ap-south-1.aws.neon.tech/ruthva?sslmode=require&pgbouncer=true&connect_timeout=15"

# Direct — used by Prisma CLI for migrations (port 5432 without pooler)
DIRECT_URL="postgresql://user:pass@ep-xxx.ap-south-1.aws.neon.tech/ruthva?sslmode=require&connect_timeout=15"
```

**Prisma configuration for dual URLs:**
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}
```

**AND** in `prisma.config.ts` for migrations:
```ts
import { defineConfig } from 'prisma/config'
export default defineConfig({
  earlyAccess: true,
  schema: 'prisma/schema.prisma',
})
```

### 3. SSL / Proxy Header Configuration

**Known issue from institutional knowledge (INSTITUTIONAL_KNOWLEDGE.md):** Railway terminates TLS at its edge proxy and forwards plain HTTP to your app. Without proper proxy header configuration, HTTPS redirects cause infinite 301 loops.

**For Next.js 15, this is handled differently than Django:**
- Next.js behind Railway does NOT need `SECURE_SSL_REDIRECT` equivalent — Next.js does not force SSL redirect by default
- However, Auth.js v5 needs `NEXTAUTH_URL` set to the HTTPS URL: `https://app.ruthva.in`
- If using `headers()` or checking protocol in middleware, trust `x-forwarded-proto`:

```ts
// middleware.ts — if you ever need to check protocol
const proto = request.headers.get('x-forwarded-proto') || 'http'
```

**Railway-specific headers to trust:**
- `x-forwarded-proto` — always "https" for external requests
- `x-forwarded-for` — client IP
- `x-forwarded-host` — original hostname

**In next.config.ts, no special proxy config needed** — Next.js standalone mode reads these headers by default.

### 4. Gupshup Webhook URL Configuration

**Webhook URL:** `https://app.ruthva.in/api/webhooks/gupshup`

**Setup steps (in Gupshup dashboard):**
1. Go to App Settings > Webhook Configuration
2. Set Callback URL: `https://app.ruthva.in/api/webhooks/gupshup`
3. Use Gupshup **Subscription API** (NOT deprecated Callback URL API)
4. Subscribe to events: `message`, `message-event`, `user-event`

**Webhook handler requirements:**
- Respond within 10 seconds (Gupshup timeout)
- Return 200 immediately, process async
- Validate request origin (Gupshup does not sign webhooks — use IP allowlist or shared secret in URL query param)
- Deduplicate by `messageId` (Gupshup may retry on timeout)
- Handle message types: `message` (incoming), `message-event` (delivery status), `user-event` (opt-in/out)

**Template approval (must happen BEFORE Phase 3):**
- 3 templates needed: adherence check, pre-visit reminder, recovery message
- Category: UTILITY (free in 24hr conversation window)
- Approval takes 24-48 hours
- Submit templates early — this is a deployment blocker

### 5. Resend Email Configuration

**Purpose:** 6-digit OTP for doctor authentication (Auth.js v5 Email provider)

**Setup:**
1. Create Resend account, verify domain `ruthva.in`
2. Add DNS records: SPF, DKIM, DMARC for `ruthva.in`
3. Set `RESEND_API_KEY` in Railway environment
4. Auth.js uses Resend provider — sends branded email from `noreply@ruthva.in`
5. OTP expires in 10 minutes (configured in Auth.js VerificationToken)

**Delivery considerations:**
- Resend has 99.5%+ delivery rate
- Indian email providers (Rediffmail, etc.) may have slower delivery — test with target doctor email providers
- Add "Check spam folder" prompt on verify screen with 60-second resend cooldown

---

## Pre-Deployment Setup (One-Time)

### External Account Setup

- [ ] **Neon Postgres:** Create project in Mumbai region (ap-south-1). Create database `ruthva`. Note pooled and direct connection strings.
- [ ] **Railway:** Create project `ruthva`. Create two services: `ruthva-web` (web) and `ruthva-cron` (cron).
- [ ] **Gupshup:** Register WhatsApp Business account. Complete business verification (2-5 business days lead time). This is the highest-risk external dependency.
- [ ] **Resend:** Create account. Verify domain `ruthva.in`. Add SPF/DKIM/DMARC DNS records.
- [ ] **Domain:** Point `app.ruthva.in` to Railway via CNAME record.
- [ ] **Gupshup templates:** Submit 3 WhatsApp message templates for Meta approval. Category: UTILITY. Allow 24-48 hours.

### Railway Project Configuration

- [ ] **ruthva-web service:**
  - Source: GitHub repo, branch `main`
  - Build command: `npm run build` (or auto-detected from Dockerfile)
  - Start command: `node server.js` (standalone output)
  - Dockerfile: Use multi-stage Dockerfile from tech-stack-best-practices.md (section 6)
  - Health check path: `/api/health`
  - Custom domain: `app.ruthva.in`
  - Region: US-West (Railway default — cannot choose India)

- [ ] **ruthva-cron service:**
  - Source: Same GitHub repo
  - Cron schedule: `0 2 * * *` (2:00 AM UTC = 7:30 AM IST)
  - Start command: `npm run cron:nightly`
  - No custom domain needed
  - No health check needed (runs and exits)

---

## Environment Variables

### ruthva-web service

```bash
# Database (Neon Mumbai)
DATABASE_URL="postgresql://...?sslmode=require&pgbouncer=true&connect_timeout=15"
DIRECT_URL="postgresql://...?sslmode=require&connect_timeout=15"

# Auth.js v5
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
NEXTAUTH_URL="https://app.ruthva.in"
AUTH_TRUST_HOST="true"

# Resend (email OTP)
RESEND_API_KEY="re_..."

# Gupshup (WhatsApp)
GUPSHUP_API_KEY="<from dashboard>"
GUPSHUP_APP_NAME="<your app name>"
GUPSHUP_PHONE="<registered WhatsApp number>"

# Cron trigger auth
CRON_SECRET="<generate with: openssl rand -base64 32>"

# App
NODE_ENV="production"
# PORT is auto-assigned by Railway — do NOT set manually
```

### ruthva-cron service

```bash
# Database (same as web)
DATABASE_URL="postgresql://...?sslmode=require&pgbouncer=true&connect_timeout=15"
DIRECT_URL="postgresql://...?sslmode=require&connect_timeout=15"

# Gupshup (cron sends WhatsApp messages)
GUPSHUP_API_KEY="<same as web>"
GUPSHUP_APP_NAME="<same as web>"
GUPSHUP_PHONE="<same as web>"

# App
NODE_ENV="production"
```

**CRITICAL:** `NEXT_PUBLIC_*` variables are inlined at BUILD TIME in Next.js. If any exist, set them in Railway build environment, not just runtime.

---

## Required Files Before First Deploy

### Dockerfile (project root)

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
# Generate Prisma client before build
RUN npx prisma generate
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Copy Prisma schema + migrations for deploy command
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

EXPOSE 3000
CMD ["node", "server.js"]
```

### next.config.ts (standalone output)

```ts
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist({
  output: "standalone",
  reactStrictMode: true,
});
```

### Health Check Endpoint

```ts
// app/api/health/route.ts
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "connected" }, { status: 200 });
  } catch (error) {
    return Response.json({ status: "error", db: "disconnected" }, { status: 503 });
  }
}
```

### .env.example

```bash
# Database (Neon Postgres Mumbai)
DATABASE_URL="postgresql://user:pass@ep-xxx.ap-south-1.aws.neon.tech/ruthva?sslmode=require&pgbouncer=true&connect_timeout=15"
DIRECT_URL="postgresql://user:pass@ep-xxx.ap-south-1.aws.neon.tech/ruthva?sslmode=require&connect_timeout=15"

# Auth.js v5
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
NEXTAUTH_URL="https://app.ruthva.in"
AUTH_TRUST_HOST="true"

# Resend (Email OTP)
RESEND_API_KEY="re_xxxx"

# Gupshup (WhatsApp Business API)
GUPSHUP_API_KEY="your-api-key"
GUPSHUP_APP_NAME="your-app-name"
GUPSHUP_PHONE="your-registered-number"

# Cron trigger auth
CRON_SECRET="generate-with-openssl-rand-base64-32"
```

---

## RED: Pre-Deploy Checks (Required)

### Database

- [ ] Neon project created in Mumbai (ap-south-1) region
- [ ] Database `ruthva` exists
- [ ] Pooled connection string works: `psql "$DATABASE_URL" -c "SELECT 1"`
- [ ] Direct connection string works: `psql "$DIRECT_URL" -c "SELECT 1"`
- [ ] Run migrations: `npx prisma migrate deploy`
- [ ] Verify 8 tables exist (4 app + 4 auth):

```sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
-- Expected: accounts, clinics, events, journeys, patients, sessions, users, verification_tokens
```

- [ ] Verify indexes exist on events table:

```sql
SELECT indexname FROM pg_indexes WHERE tablename = 'events';
-- Expected: events_pkey, events_journeyId_eventType_idx, events_eventType_eventTime_idx, events_journeyId_eventTime_idx
```

### External Services

- [ ] Gupshup business verification complete (check status in dashboard)
- [ ] All 3 WhatsApp templates approved by Meta (check status: `APPROVED`)
- [ ] Resend domain verified (SPF + DKIM + DMARC passing)
- [ ] Test Resend: send a test email via API to a real doctor email address
- [ ] Test Gupshup: send a test template message to a test phone number

### Railway Configuration

- [ ] All environment variables set on `ruthva-web` service (compare against .env.example)
- [ ] All environment variables set on `ruthva-cron` service
- [ ] `NEXTAUTH_SECRET` is a strong random value (not a placeholder)
- [ ] `NEXTAUTH_URL` is `https://app.ruthva.in` (not Railway's generated domain)
- [ ] `AUTH_TRUST_HOST` is `true` (required for Railway reverse proxy)
- [ ] Custom domain `app.ruthva.in` configured on `ruthva-web` with CNAME DNS record
- [ ] SSL certificate provisioned by Railway for `app.ruthva.in`
- [ ] Cron schedule set: `0 2 * * *` on `ruthva-cron` service

### Application

- [ ] `next.config.ts` has `output: "standalone"`
- [ ] Dockerfile builds successfully locally: `docker build -t ruthva .`
- [ ] Health check endpoint responds: `curl http://localhost:3000/api/health`
- [ ] PWA manifest serves correctly: `curl http://localhost:3000/manifest.webmanifest`
- [ ] Webhook endpoint exists: `POST /api/webhooks/gupshup`
- [ ] Cron manual trigger exists: `POST /api/cron/trigger` with `CRON_SECRET` auth

---

## YELLOW: Deploy Steps

### First Deployment Sequence

1. [ ] Push code to `main` branch (Railway auto-deploys from GitHub)
2. [ ] Railway builds Docker image — monitor build logs for errors
3. [ ] Railway starts `ruthva-web` — monitor deploy logs
4. [ ] Run database migrations (one of these approaches):
   - **Option A (build step):** Add to Dockerfile: `RUN npx prisma migrate deploy` in builder stage (requires `DIRECT_URL` at build time)
   - **Option B (release command):** In Railway settings, set release command: `npx prisma migrate deploy` (runs after build, before start)
   - **Option C (manual):** SSH/exec into Railway service and run manually (not recommended for automation)
   - **Recommended: Option B** — Railway release commands run after build with runtime env vars available
5. [ ] Verify `ruthva-web` health: `curl https://app.ruthva.in/api/health`
6. [ ] Verify `ruthva-cron` service is created and schedule is set
7. [ ] Configure Gupshup webhook URL: `https://app.ruthva.in/api/webhooks/gupshup`
8. [ ] Send test webhook from Gupshup dashboard — verify it reaches your endpoint

---

## GREEN: Post-Deploy Verification (Within 15 Minutes)

### Connectivity

- [ ] `https://app.ruthva.in` loads (no SSL errors, no redirect loops)
- [ ] `https://app.ruthva.in/api/health` returns `{"status":"ok","db":"connected"}`
- [ ] PWA installable: open in Android Chrome, check "Add to Home Screen" prompt
- [ ] Offline fallback: toggle airplane mode, verify offline page shows

### Authentication Flow

- [ ] Navigate to login page
- [ ] Enter a test email address
- [ ] Verify 6-digit OTP email arrives (check Resend dashboard for delivery status)
- [ ] Enter OTP, verify session created
- [ ] Verify clinic onboarding flow starts

### Core Functionality

- [ ] Create a test clinic profile
- [ ] Add a test patient (name, phone, duration, interval, consent checkbox)
- [ ] Verify `journey_started` event created in database:

```sql
SELECT * FROM events WHERE "eventType" = 'journey_started' ORDER BY "createdAt" DESC LIMIT 1;
```

- [ ] Verify `visit_expected` events generated:

```sql
SELECT COUNT(*) FROM events WHERE "eventType" = 'visit_expected';
-- Expected: > 0 (based on duration/interval of test patient)
```

- [ ] Dashboard loads and shows stats

### WhatsApp Integration

- [ ] Send test adherence check to test phone number via Gupshup
- [ ] Reply with quick-reply button on WhatsApp
- [ ] Verify webhook received at `/api/webhooks/gupshup` (check Railway logs)
- [ ] Verify `adherence_response` event created in database

### Cron Worker

- [ ] Manually trigger cron: `curl -X POST -H "Authorization: Bearer $CRON_SECRET" https://app.ruthva.in/api/cron/trigger`
- [ ] Check Railway logs for `ruthva-cron` — verify it ran and exited cleanly
- [ ] Wait for scheduled cron run (2:00 AM UTC) and verify in Railway logs

### Database Integrity

```sql
-- Verify no orphaned records
SELECT COUNT(*) FROM patients p
LEFT JOIN clinics c ON p."clinicId" = c.id
WHERE c.id IS NULL;
-- Expected: 0

-- Verify no journeys without patients
SELECT COUNT(*) FROM journeys j
LEFT JOIN patients p ON j."patientId" = p.id
WHERE p.id IS NULL;
-- Expected: 0

-- Verify event counts are reasonable
SELECT "eventType", COUNT(*) FROM events GROUP BY "eventType" ORDER BY COUNT(*) DESC;
```

---

## BLUE: Monitoring (First 7 Days)

### Daily Checks

| Check | How | Alert Condition |
|-------|-----|-----------------|
| Health endpoint | `curl https://app.ruthva.in/api/health` | Non-200 response |
| Railway deploy status | Railway dashboard | Failed deploys |
| Cron execution | Railway logs for `ruthva-cron` | No log entry at expected time, or exit code 1 |
| Gupshup message delivery | Gupshup dashboard > Reports | Delivery rate < 90% |
| Resend email delivery | Resend dashboard | Bounce rate > 5% |
| Neon database | Neon dashboard > Monitoring | Connection errors, high latency |
| Error logs | Railway logs for `ruthva-web` | Any unhandled exceptions |

### Latency Monitoring

The US-West (Railway) to Mumbai (Neon) round-trip is the primary performance concern.

- [ ] Add timing logs to key database queries:

```ts
const start = Date.now();
const result = await prisma.event.findMany({ ... });
console.log(`[DB] Dashboard query: ${Date.now() - start}ms`);
```

- [ ] Acceptable: < 500ms for dashboard page load (server-side)
- [ ] Warning: 500-1000ms — consider query optimization
- [ ] Critical: > 1000ms — investigate connection pooling, query patterns, or consider Railway region change when available

### Cron Job Monitoring

- [ ] Verify nightly cron completes each day (check Railway logs at ~2:00-2:10 AM UTC)
- [ ] Track cron duration — should complete in < 5 minutes for 100 active journeys
- [ ] If cron fails, manually trigger via API endpoint and investigate logs

### WhatsApp Message Monitoring

- [ ] Track daily message counts in Gupshup dashboard
- [ ] Monitor for error 470 (patient blocked number) — flag these patients in dashboard
- [ ] Verify rate limits: new accounts start at 250 business-initiated conversations/24hrs
- [ ] Watch for Meta template reclassification (utility -> marketing) — check template status weekly

---

## ROLLBACK: Recovery Procedures

### Code Rollback

Railway supports instant rollback to previous deployment:

1. [ ] Go to Railway dashboard > `ruthva-web` > Deployments
2. [ ] Click on previous successful deployment
3. [ ] Click "Rollback to this deployment"
4. [ ] Verify health check passes on rolled-back version

### Database Rollback

**Migrations are NOT automatically reversible.** Plan before applying:

- **Additive migrations** (add column, add table): Safe to roll back code — new columns are ignored by old code
- **Destructive migrations** (drop column, rename): NOT safe to roll back — old code expects old schema
- **Data migrations** (backfills): May need manual reversal

**Neon branching for safe migrations:**
1. Before deploying a migration, create a Neon branch (point-in-time copy)
2. Apply migration to main branch
3. If migration fails, restore from branch
4. Delete branch after confirming success

```bash
# Create branch before migration
neonctl branches create --name pre-migration-backup --project-id <project-id>

# If rollback needed, restore
neonctl branches restore main --source pre-migration-backup --project-id <project-id>
```

### Gupshup Webhook Rollback

If webhook endpoint is broken and messages are being lost:
1. [ ] Temporarily disable webhook in Gupshup dashboard
2. [ ] Fix and redeploy
3. [ ] Re-enable webhook
4. [ ] Note: messages received during downtime are lost (Gupshup does not queue indefinitely)

### Full Disaster Recovery

If both Railway and code are in a broken state:
1. [ ] Neon database is independent — data is safe in Mumbai
2. [ ] Railway: redeploy from a known-good Git commit
3. [ ] Gupshup: webhook URL remains configured, just needs working endpoint
4. [ ] Auth sessions: stored in Neon — users stay logged in after redeploy

---

## Architecture Decision Records

### ADR-1: Railway Cron Service (not node-cron, not QStash)

**Decision:** Use Railway's native cron service as a separate service.
**Rationale:** Simplest for solo builder. No extra vendor. Clean separation from web service. Billed only for execution time. Cron job must exit cleanly.
**Trade-off:** No automatic retry on failure. Must add manual trigger endpoint for emergency re-runs.

### ADR-2: Neon Mumbai (not Railway Postgres)

**Decision:** Neon Postgres in Mumbai region instead of Railway's managed Postgres.
**Rationale:** DPDP Act data localization requirement for patient health data. Railway has no India region.
**Trade-off:** 200-350ms latency per database round-trip from Railway US-West. Mitigated by connection pooling, batched queries, and minimizing round-trips per request.

### ADR-3: Dual Database URLs (DATABASE_URL + DIRECT_URL)

**Decision:** Two connection strings — pooled for runtime, direct for migrations.
**Rationale:** Neon's pgbouncer pooler does not support Prisma's migration protocol. Migrations must use the direct connection. Runtime queries benefit from pooling.
**Implementation:** `DATABASE_URL` with `?pgbouncer=true` for Prisma Client. `DIRECT_URL` without pgbouncer for `prisma migrate deploy`.

### ADR-4: AUTH_TRUST_HOST Required

**Decision:** Set `AUTH_TRUST_HOST=true` in production.
**Rationale:** Railway terminates TLS at its proxy. Auth.js needs to trust the `x-forwarded-host` and `x-forwarded-proto` headers to generate correct callback URLs. Without this, OAuth/email callbacks break.

### ADR-5: Manual Cron Trigger Endpoint

**Decision:** Add `POST /api/cron/trigger` protected by `CRON_SECRET` bearer token.
**Rationale:** If Railway cron fails silently or needs emergency re-run, an HTTP endpoint allows manual triggering without SSH access. The cron logic is idempotent, so re-running is safe.

---

## Deployment Timeline (Recommended Order)

### Week 5 of Development (Pre-Deploy)

| Day | Action |
|-----|--------|
| Mon | Create Neon project (Mumbai), create database, note connection strings |
| Mon | Create Railway project, configure two services (web + cron) |
| Mon | Set all environment variables in Railway |
| Tue | Configure domain `app.ruthva.in` CNAME to Railway |
| Tue | Verify Gupshup business verification is complete |
| Tue | Verify all 3 WhatsApp templates are `APPROVED` |
| Wed | Verify Resend domain verification is complete (SPF/DKIM/DMARC) |
| Wed | Build Docker image locally, test health check |
| Thu | Push to main, Railway auto-deploys |
| Thu | Run `prisma migrate deploy` via Railway release command |
| Thu | Post-deploy verification (GREEN checklist above) |
| Fri | Configure Gupshup webhook URL |
| Fri | End-to-end test: login -> create patient -> receive WhatsApp -> reply -> verify event |

### Week 6 (First Clinics)

| Day | Action |
|-----|--------|
| Mon | Onboard first friendly clinic doctor |
| Mon | Monitor first cron run (next morning) |
| Tue-Fri | Daily monitoring checks (BLUE checklist above) |
| Fri | Review first week: message delivery rates, cron reliability, latency |
