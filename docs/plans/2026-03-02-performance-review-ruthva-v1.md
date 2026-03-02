---
title: "Performance Review: Ruthva V1 — Treatment Continuity Platform"
type: review
status: active
date: 2026-03-02
origin: 2026-03-01-feat-ruthva-v1-treatment-continuity-platform-plan.md
---

# Performance Review: Ruthva V1

## 1. Performance Summary

The Ruthva V1 architecture is well-suited for its initial scale (100 active journeys per clinic, growing to 50+ clinics = ~5,000 active journeys). The event-sourced design with 4 app tables is clean. However, the plan has several performance gaps that will surface as the event table grows and as clinic count increases. The critical path for performance is the dashboard load — a doctor glancing at the screen between patients cannot tolerate latency.

**Overall assessment:** Sound architecture with 6 specific bottlenecks to address before implementation.

---

## 2. Critical Issues

### CRITICAL-1: Dashboard Queries Scan Entire Event History (O(n) per journey)

**The problem:** The dashboard must show: patients at risk count, critical patients count, recovered this month, and revenue protected. The risk engine computes risk from events (missed visits, ignored adherence checks, days overdue). The plan states risk is computed nightly by cron and stored... nowhere.

The plan says "Compute risk levels for all active journeys" but does not define where the computed risk level is persisted. The Journey model has only `status: active|completed|dropped` — there is no `risk_level` column. This means either:

- (a) Risk is recomputed on every dashboard load by scanning events (catastrophic for performance), or
- (b) Risk is computed by cron but the storage location is undefined (a plan gap).

**Impact at scale:** At 50 clinics with 100 journeys each, the dashboard would need to scan events for 100 journeys. Each journey accumulates ~2-4 events per day over 30-90 days = 60-360 events per journey. Scanning 100 x 200 avg = 20,000 events per dashboard load.

**Recommendation:** Add a materialized risk state to the Journey model:

```prisma
model Journey {
  // ... existing fields
  riskLevel      String   @default("stable") // stable|watch|at_risk|critical
  riskReason     String?  // "Follow-up overdue by 5 days"
  riskUpdatedAt  DateTime?
  lastActivityAt DateTime? // denormalized: last event timestamp
}
```

The nightly cron writes risk results directly to the Journey row. The dashboard queries become:

```sql
-- Dashboard stats: single indexed query, no event scanning
SELECT risk_level, COUNT(*) FROM journeys
WHERE patient_id IN (SELECT id FROM patients WHERE clinic_id = $1)
AND status = 'active'
GROUP BY risk_level;
```

**Severity:** CRITICAL — without this, the dashboard will not meet the 3-second load target on 4G.

### CRITICAL-2: Missing Composite Index for Clinic-Scoped Queries

**The problem:** Every dashboard query must be scoped to a clinic. But the Events table has no `clinic_id` — it relates to Journey, which relates to Patient, which relates to Clinic. This means every clinic-scoped event query requires a 3-table join:

```sql
SELECT e.* FROM events e
JOIN journeys j ON e.journey_id = j.id
JOIN patients p ON j.patient_id = p.id
WHERE p.clinic_id = $1;
```

**Impact at scale:** This 3-table join runs on every dashboard load, every patient list render, and every cron iteration. Without proper indexes, Postgres will do sequential scans.

**Recommendation:** Add `clinic_id` as a denormalized column on the Journey table (it is already implicitly available via Patient):

```prisma
model Journey {
  // ... existing fields
  clinicId  String
  clinic    Clinic @relation(fields: [clinicId], references: [id])

  @@index([clinicId, status])
  @@index([clinicId, riskLevel])
}
```

This eliminates the Patient join for all journey/dashboard queries. The cron worker can also partition work by clinic.

**Severity:** CRITICAL — multi-tenant query isolation depends on this.

### CRITICAL-3: Event Table Growth Without Archival Strategy

**The problem:** Events are append-only (event sourcing). Each journey generates 2-4 events per day for 30-90 days. At 50 clinics x 100 journeys x 60 days avg x 3 events/day = 900,000 events per cycle. After 6 months of operation: millions of rows.

The plan defines indexes on the Events table:
- `@@index([journeyId, eventType])`
- `@@index([eventType, eventTime])`
- `@@index([journeyId, eventTime])`

These are good for individual journey queries but not for aggregate analytics.

**Impact at scale:** Event table will grow to 1M+ rows within the first year. Queries that scan events for risk computation will degrade. The nightly cron processes ALL active journeys — scanning millions of event rows nightly.

**Recommendation:**
1. With CRITICAL-1 implemented (risk level on Journey), the cron only needs to query recent events per journey (since last `riskUpdatedAt`), not the full history.
2. Add a partial index for recent events:
   ```sql
   CREATE INDEX idx_events_recent ON events (journey_id, event_time DESC)
   WHERE created_at > NOW() - INTERVAL '14 days';
   ```
3. For V2, implement event archival: move events older than 90 days from completed/dropped journeys to a `events_archive` table or cold storage.

**Severity:** CRITICAL for longevity — will not surface in week 1, but will degrade within 3-6 months of production use.

---

## 3. Optimization Opportunities

### OPT-1: Dashboard Data Fetching Strategy

**Current plan:** The plan does not specify how the dashboard fetches data. Given Next.js 15 App Router, the options are Server Components, Route Handlers, or Server Actions.

**Recommendation:** Use React Server Components for the dashboard page with parallel data fetching:

```typescript
// app/(app)/dashboard/page.tsx
export default async function DashboardPage() {
  const clinicId = await getClinicId();

  // Parallel fetch — all queries run simultaneously
  const [stats, atRiskPatients] = await Promise.all([
    getDashboardStats(clinicId),
    getAtRiskPatients(clinicId, { limit: 20 }),
  ]);

  return <Dashboard stats={stats} patients={atRiskPatients} />;
}
```

**Key points:**
- Server Components eliminate client-side fetch waterfalls. HTML streams directly.
- `Promise.all` runs the two queries in parallel against Neon (both hit the same connection pool).
- No loading spinners needed if the queries are fast (target: under 100ms each with proper indexes).
- For the "pull to refresh" gesture mentioned in the plan, use `router.refresh()` which re-renders the Server Component without a full page reload.

**Expected gain:** Eliminates one full network round trip (no client fetch). On Indian 4G with 100-200ms RTT, this saves 200-400ms per dashboard load.

### OPT-2: Neon Serverless Driver for Reduced Connection Overhead

**Current plan:** Prisma with standard Postgres connection to Neon Mumbai. The plan mentions "separate DATABASE_URL (pooled) and DIRECT_URL (migrations)."

**Recommendation:** Use `@neondatabase/serverless` driver adapter with Prisma for HTTP-based queries in the Next.js app, and standard TCP for the cron worker:

```typescript
// lib/db.ts — for Next.js serverless functions
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaNeon(pool);

export const prisma = new PrismaClient({ adapter });
```

**Why this matters:**
- Railway serverless deployments create cold starts. Standard TCP connections take 50-100ms to establish to Neon Mumbai.
- Neon's serverless driver uses HTTP, which pools at the Neon proxy layer — no connection overhead per request.
- The cron worker (long-running process) should use standard TCP pooled connection for throughput.

**Expected gain:** 50-100ms saved per cold-start request. Eliminates connection pool exhaustion risk.

### OPT-3: Cron Worker Batch Processing Design

**Current plan:** "Nightly cron completes in under 5 minutes for 100 active journeys." The plan outlines the cron steps but does not specify batch processing.

**Concern:** The cron worker processes all active journeys sequentially. At 50 clinics x 100 journeys = 5,000 active journeys. If each journey requires 2-3 event queries + 1-2 writes, that is 15,000-25,000 database operations.

**Recommendation:** Batch process by clinic, with bulk reads and bulk writes:

```typescript
// cron/compute-risk-levels.ts
async function computeRiskLevels() {
  // 1. Fetch ALL active journeys with their recent events in one query
  const journeys = await prisma.journey.findMany({
    where: { status: 'active' },
    include: {
      events: {
        where: {
          eventTime: { gte: subDays(new Date(), 14) },
        },
        orderBy: { eventTime: 'desc' },
      },
    },
  });

  // 2. Compute risk in memory (no DB calls)
  const updates = journeys.map((j) => ({
    id: j.id,
    riskLevel: computeRisk(j.events),
    riskReason: computeReason(j.events),
    riskUpdatedAt: new Date(),
  }));

  // 3. Bulk update using a transaction
  await prisma.$transaction(
    updates.map((u) =>
      prisma.journey.update({
        where: { id: u.id },
        data: {
          riskLevel: u.riskLevel,
          riskReason: u.riskReason,
          riskUpdatedAt: u.riskUpdatedAt,
        },
      })
    )
  );
}
```

**Better approach for 5,000+ journeys — use raw SQL bulk update:**

```sql
-- Single query: fetch all active journeys with event counts
SELECT j.id, j.start_date, j.duration_days,
  MAX(e.event_time) FILTER (WHERE e.event_type = 'visit_confirmed') AS last_visit,
  MAX(e.event_time) FILTER (WHERE e.event_type = 'adherence_response') AS last_response,
  COUNT(*) FILTER (WHERE e.event_type = 'adherence_check_sent'
    AND e.event_time > NOW() - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM events er
      WHERE er.journey_id = j.id
      AND er.event_type = 'adherence_response'
      AND er.event_time > e.event_time
    )) AS unanswered_checks_7d
FROM journeys j
LEFT JOIN events e ON e.journey_id = j.id
  AND e.event_time > NOW() - INTERVAL '14 days'
WHERE j.status = 'active'
GROUP BY j.id;
```

This reduces the entire risk computation to 1 read query + 1 bulk update, regardless of journey count.

**Expected gain:** Reduces cron from O(n) database round trips to O(1). At 5,000 journeys, this is the difference between 25,000 queries (minutes) and 2 queries (seconds).

### OPT-4: Webhook Response Time

**Current plan:** POST /api/webhooks/gupshup parses incoming messages and creates events.

**Concern:** Gupshup expects webhook responses within 10 seconds. If the event creation involves multiple database writes or triggers downstream processing, the webhook could timeout.

**Recommendation:** Acknowledge immediately, process asynchronously:

```typescript
// app/api/webhooks/gupshup/route.ts
export async function POST(request: Request) {
  const body = await request.json();

  // 1. Validate signature (fast, in-memory)
  if (!validateGupshupSignature(body, request.headers)) {
    return Response.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 2. Fire-and-forget: queue event creation
  // Use waitUntil() in Next.js to run after response
  const responsePromise = processWebhook(body);

  // For Railway (not Vercel), use a simpler pattern:
  // Process inline but keep it fast (single INSERT)
  await createEvent({
    journeyId: body.journeyId, // resolved from patient phone lookup
    eventType: 'adherence_response',
    eventTime: new Date(),
    metadata: { response: parseQuickReply(body) },
    createdBy: 'patient',
  });

  // 3. Return 200 immediately
  return Response.json({ status: 'ok' });
}
```

**Key optimization:** The phone-to-journey lookup (finding which journey a WhatsApp message belongs to) needs an efficient path:

```prisma
model Patient {
  // ... existing fields
  @@index([phone])  // ADD THIS — webhook looks up patient by phone number
}
```

Then the lookup is: `phone -> patient -> active journey` (2 indexed queries).

**Expected gain:** Webhook response time under 200ms. Prevents Gupshup retry storms.

### OPT-5: PWA Bundle Size and Caching for Indian 4G

**Current plan:** "Lightweight — No component library. Raw Tailwind + Lucide React icons." and Serwist for PWA.

**Recommendations for sub-3-second load on 4G (effective ~2-5 Mbps in urban India, 500Kbps-1Mbps in tier-2/3 cities):**

1. **Target bundle budget:** Main JS bundle under 100KB gzipped. With Next.js 15 App Router + Tailwind + Lucide (tree-shaken), this is achievable if no heavy dependencies creep in.

2. **Font optimization:**
   ```typescript
   // Use next/font with swap strategy
   import { Inter } from 'next/font/google';
   const inter = Inter({
     subsets: ['latin'],
     display: 'swap',  // Show text immediately with fallback font
     preload: true,
   });
   ```
   Inter full weight = ~100KB. With `subsets: ['latin']` and only needed weights, this drops to ~20KB.

3. **Serwist service worker caching strategy:**
   ```typescript
   // sw.ts — cache strategy for Indian 4G
   // Static assets: CacheFirst (fonts, icons, CSS)
   // Dashboard data: StaleWhileRevalidate (show cached, refresh in background)
   // API mutations: NetworkOnly (writes must hit server)

   // Pre-cache the app shell on install
   precacheEntries: [
     '/dashboard',
     '/patients',
     '/patients/new',
     '/offline',
   ]
   ```

   **StaleWhileRevalidate for the dashboard is critical:** Doctor opens app, sees last-cached dashboard instantly (0ms perceived load), fresh data loads in background. This alone solves the 3-second requirement.

4. **Image strategy:** The plan mentions no images (no patient photos, no avatars). Keep it that way. Lucide icons are inline SVGs (~1KB each, tree-shaken). This is already optimal.

5. **Critical CSS:** Tailwind v4 with Next.js 15 automatically extracts critical CSS. No additional configuration needed.

**Expected budget:**
| Asset | Size (gzipped) |
|---|---|
| Next.js runtime | ~45KB |
| App code (all pages) | ~30KB |
| Tailwind CSS | ~8KB (only used classes) |
| Inter font (latin, 2 weights) | ~20KB |
| Lucide icons (tree-shaken) | ~5KB |
| **Total** | **~108KB** |

At 1Mbps (poor Indian 4G): 108KB / 125KB/s = ~0.9 seconds. With service worker cache: instant on repeat visits.

---

## 4. Scalability Assessment

### Data Volume Projections

| Metric | V1 Launch | 6 Months | 12 Months |
|---|---|---|---|
| Clinics | 3 | 50 | 200 |
| Active journeys | 300 | 5,000 | 20,000 |
| Events/day | 900 | 15,000 | 60,000 |
| Total events | 5,000 | 2.7M | 22M |
| WhatsApp messages/day | 300 | 5,000 | 20,000 |
| DB size estimate | 10MB | 500MB | 4GB |

### Scaling Inflection Points

1. **5,000 active journeys (~50 clinics):** The nightly cron becomes the bottleneck if not batch-optimized (OPT-3). Without denormalized risk levels (CRITICAL-1), dashboard queries will exceed 1 second.

2. **20,000 active journeys (~200 clinics):** Event table hits 20M+ rows. Partial indexes and event archival become necessary. Consider read replicas for dashboard queries vs. cron writes.

3. **50,000+ active journeys:** Single Neon instance may hit connection limits. Will need Neon branching or dedicated connection pooling (PgBouncer). The cron worker should be horizontally partitioned by clinic range.

### Connection Pooling: Railway to Neon Mumbai

**Critical concern:** Railway runs in US/EU regions. Neon is in Mumbai. The cross-region latency is 150-250ms per query.

**Wait -- the plan says Railway for deployment but Neon Mumbai for data.** Railway does not have an India region. This means:

- Every database query from the Next.js app on Railway to Neon Mumbai incurs 150-250ms latency.
- A dashboard page making 3 queries sequentially = 450-750ms just in network latency.
- This alone could blow the 3-second budget.

**Recommendations:**

1. **Use `Promise.all` for all parallel queries** (OPT-1) — turns 3 sequential queries (750ms) into 1 parallel batch (250ms).

2. **Use Neon serverless driver** (OPT-2) — HTTP-based, avoids TCP connection overhead.

3. **Investigate Railway alternatives with India presence:**
   - **Fly.io** has a Mumbai region (`maa`). App server in Mumbai + Neon in Mumbai = <10ms query latency.
   - **Render** has Singapore (close to Mumbai, ~30ms).
   - If Railway is non-negotiable, the service worker StaleWhileRevalidate strategy (OPT-5) becomes mandatory to mask the latency.

4. **Connection pool configuration for Neon:**
   ```
   # .env
   # Pooled connection (for app queries via Neon's built-in pgbouncer)
   DATABASE_URL="postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/ruthva?sslmode=require&pgbouncer=true&connect_timeout=10"

   # Direct connection (for migrations only)
   DIRECT_URL="postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/ruthva?sslmode=require"
   ```

   Neon's built-in connection pooler (pgbouncer) supports up to 10,000 concurrent connections on the paid plan. V1 on the free/launch plan gets 100 connections — sufficient for early scale.

**Severity of cross-region latency:** HIGH. This is the single biggest threat to the 3-second dashboard target. Strongly recommend deploying the Next.js app on Fly.io Mumbai or similar India-region provider.

---

## 5. Recommended Database Indexes (Complete Strategy)

### Prisma Schema Additions

```prisma
model Clinic {
  // ... existing fields
  journeys Journey[] // Add direct relation for denormalized clinicId

  @@index([userId]) // Auth lookup: user -> clinic
}

model Patient {
  // ... existing fields

  @@unique([clinicId, phone]) // Already in plan - good
  @@index([phone])            // ADD: webhook phone lookup
  @@index([clinicId])         // ADD: clinic-scoped patient list
}

model Journey {
  // ... existing fields
  clinicId       String          // ADD: denormalized for query performance
  riskLevel      String  @default("stable")  // ADD: materialized risk
  riskReason     String?         // ADD: human-readable reason
  riskUpdatedAt  DateTime?       // ADD: last risk computation
  lastActivityAt DateTime?       // ADD: last event timestamp

  @@index([clinicId, status])          // ADD: dashboard active journey count
  @@index([clinicId, riskLevel])       // ADD: dashboard risk breakdown
  @@index([patientId, status])         // ADD: patient's active journey lookup
  @@index([status, riskUpdatedAt])     // ADD: cron stale risk detection
}

model Event {
  // ... existing fields

  @@index([journeyId, eventType])   // Already in plan - good
  @@index([eventType, eventTime])   // Already in plan - good
  @@index([journeyId, eventTime])   // Already in plan - good

  // ADD: idempotency constraint (plan mentions this but doesn't define it)
  @@unique([journeyId, eventType, eventTime], name: "idempotency_key")
}
```

### Raw SQL Indexes (Post-Migration)

```sql
-- Partial index: only active journeys (most queries filter on status = 'active')
CREATE INDEX idx_journeys_active ON journeys (clinic_id, risk_level)
WHERE status = 'active';

-- Partial index: recent events for cron processing
CREATE INDEX idx_events_recent ON events (journey_id, event_type, event_time DESC)
WHERE created_at > NOW() - INTERVAL '14 days';

-- GIN index on event metadata (for future querying on JSONB fields)
-- DEFER to V2: only add if you need to query inside metadata
-- CREATE INDEX idx_events_metadata ON events USING GIN (metadata);
```

---

## 6. Recommended Actions (Priority Order)

| Priority | Action | Impact | Effort |
|---|---|---|---|
| P0 | Add `riskLevel`, `riskReason`, `riskUpdatedAt`, `lastActivityAt` to Journey model | Eliminates event scanning on dashboard | 1 hour |
| P0 | Add `clinicId` to Journey model (denormalized) | Eliminates 3-table join on every query | 30 min |
| P0 | Evaluate Fly.io Mumbai instead of Railway for Next.js app | Eliminates 150-250ms cross-region latency per query | 2 hours |
| P1 | Add `@@index([phone])` on Patient for webhook lookup | Sub-ms webhook phone resolution | 5 min |
| P1 | Implement batch cron processing (OPT-3) | Cron runs in seconds, not minutes | 4 hours |
| P1 | Use Neon serverless driver adapter with Prisma | Eliminates connection overhead in serverless | 1 hour |
| P1 | Configure Serwist with StaleWhileRevalidate for dashboard | Instant perceived load on repeat visits | 2 hours |
| P2 | Add idempotency unique constraint on Events | Prevents duplicate events from cron reruns | 15 min |
| P2 | Add partial index on active journeys | Faster dashboard queries as data grows | 15 min |
| P2 | Implement `Promise.all` for parallel dashboard queries | Saves 150-250ms per dashboard load | 30 min |
| P3 | Plan event archival strategy for V2 | Prevents event table from growing unbounded | Design only |
| P3 | Add partial index on recent events (14 days) | Speeds up cron event scanning | 15 min |

---

## 7. Architecture Diagram (Revised with Recommendations)

```
Doctor's phone (PWA, service worker cache)
    |
    | Indian 4G (100-200ms RTT)
    |
    v
[Next.js 15 App — Fly.io Mumbai*]  <-- *Recommended change from Railway
    |
    | <10ms (same region)
    |
    v
[Neon Postgres Mumbai]
    - journeys.risk_level (materialized)    <-- NEW
    - journeys.clinic_id (denormalized)     <-- NEW
    - events (append-only, indexed)
    - Partial indexes on active data
    |
[Cron Worker — Railway or Fly.io]
    - Batch reads: 1 query for all active journeys + recent events
    - Batch writes: bulk UPDATE journeys SET risk_level
    - Runs in <30 seconds for 5,000 journeys
    |
[Gupshup WhatsApp API]
    - Webhook -> Patient.phone index -> instant journey lookup
    - Single INSERT event, return 200 in <200ms
```

---

## 8. Summary of Plan Gaps Found

1. **No storage defined for computed risk levels** — risk is computed nightly but nowhere to persist it. Dashboard would need to recompute from events.
2. **No `clinicId` on Journey** — forces 3-table join for every tenant-scoped query.
3. **Cross-region latency not addressed** — Railway (US/EU) to Neon (Mumbai) adds 150-250ms per query. Plan acknowledges Neon Mumbai for DPDP but does not note that Railway has no India region for compute.
4. **No event archival strategy** — append-only events will grow unbounded.
5. **No idempotency constraint defined in schema** — plan mentions idempotency for cron but does not define the unique constraint.
6. **No batch processing specification for cron** — cron steps are listed but the query strategy (individual vs. batch) is not specified.
7. **Webhook phone lookup index missing** — Patient table needs `@@index([phone])` for efficient webhook processing.
8. **Dashboard data fetching pattern undefined** — Server Components vs. client fetch not specified.
