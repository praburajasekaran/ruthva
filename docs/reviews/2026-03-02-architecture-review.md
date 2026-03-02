# Architecture Review: Ruthva V1 -- Treatment Continuity Platform

**Reviewer:** Architecture Strategist Agent
**Date:** 2026-03-02
**Scope:** Full system architecture review of the V1 plan
**Plan reviewed:** `docs/plans/2026-03-01-feat-ruthva-v1-treatment-continuity-platform-plan.md`

---

## 1. Architecture Overview

Ruthva V1 is a vertically-focused SaaS product with a deliberately narrow scope: detect patient drop-off from Ayurveda treatments and recover them via WhatsApp automation. The architecture is:

- **Next.js 15 fullstack app** (App Router + API routes + PWA via Serwist) deployed on Railway
- **Separate cron worker service** on Railway for nightly batch processing
- **Neon Postgres (Mumbai)** with 4 app tables + 4 Auth.js tables
- **Event-sourced core** with a single `events` table using JSONB metadata
- **Gupshup WhatsApp Business API** for all patient messaging
- **Auth.js v5** with 6-digit email OTP via Resend
- **Multi-tenancy** via `clinic_id` foreign key on every patient/journey/event

Target scale: 50 clinics, 100 active journeys per clinic (5,000 total journeys), approximately 9,500 WhatsApp messages per clinic per month.

---

## 2. Answering the Six Architectural Questions

### Q1: Is Event Sourcing the Right Pattern for This Scale?

**Verdict: Yes, but what you have is not classical event sourcing -- and that is the correct choice.**

Classical event sourcing means: no mutable state anywhere, all reads derived from replaying events, CQRS with separate read/write models, event versioning, and projections infrastructure. That would be severe overengineering for V1.

What the plan actually describes is an **event log pattern with mutable entity tables alongside it**. The `journeys` table has a mutable `status` field (`active|completed|dropped`). The `patients` table has mutable `consent_given`. This is a hybrid: entities hold current state, events hold the timeline. This is pragmatically correct.

**Why the event log still earns its keep at this scale:**
- The core product value is temporal: "what happened over time to this patient." Without an event log, you would need to reconstruct timelines from scattered status changes and timestamps on multiple tables, which is fragile.
- Risk scoring queries naturally read event sequences: count `visit_expected` minus count `visit_confirmed`. This is cleaner than maintaining a separate risk state table.
- The event log becomes the data moat. After 6 months with 10 clinics, you have adherence pattern data that competitors cannot recreate. The marginal cost of storing events is near zero; the future value is high.

**The one risk to manage:** The plan states "No status fields -- just logic over events" in the brainstorm docs, but the Prisma schema has `journey.status` as a mutable field. This contradiction is already identified in `docs/11-flow-analysis-gaps.md` (section 7.1). The plan resolves it correctly: the cron worker sets status based on event-derived logic. But the team must be disciplined that `journey.status` is a **computed cache**, not a source of truth. If status and events ever disagree, events win. Document this as an architectural invariant.

**Recommendation:** Add a code comment or a `lib/invariants.ts` doc-block stating: "journey.status is a materialized cache derived from events. The cron worker is the only writer. Never update status directly from API routes."

---

### Q2: Single Events Table vs. Separate Tables per Event Type

**Verdict: Single table is correct for V1. The proposed schema holds well through V2.**

**Why single table works here:**
- You have 9 event types. Separate tables would mean 9 tables with near-identical schemas, 9 sets of indexes, 9 Prisma models, and 9 migration files when you add a column. The DX cost is not justified.
- All events share the same structural shape: `journey_id`, `event_type`, `event_time`, `metadata (JSONB)`, `created_by`. The only variance is inside `metadata`, which JSONB handles naturally.
- Dashboard queries frequently need cross-type reads: "for journey X, give me all events ordered by time." A single table serves this with one indexed query. With separate tables, this becomes a UNION ALL across 9 tables.
- At 50 clinics with 100 journeys each averaging 60-day treatments, the rough event volume is: ~52 adherence checks + 8 reminders + 8 visit_expected + 8 visit_confirmed + ~2 recovery messages = ~78 events per journey. That is **390,000 events per 60-day cycle** across all clinics. With proper indexes, PostgreSQL handles this without breaking a sweat. You will not need partitioning until you are well past 10 million rows.

**What to watch for at scale:**
- **GIN index on metadata:** The plan's tech-stack research doc (`docs/10-tech-stack-best-practices.md`) suggests a GIN index on metadata. For V1, skip it. GIN indexes are expensive to maintain on write-heavy tables and you are not querying metadata fields in WHERE clauses for V1. Add it only when you need to query by `metadata->>'message_id'` or similar.
- **Partial indexes:** The partial index pattern (`WHERE event_type LIKE 'followup.%'`) from `docs/10-tech-stack-best-practices.md` is good guidance for V2 when query patterns stabilize.

**The plan's indexes are well-chosen:**
```
@@index([journeyId, eventType])   -- "all adherence responses for this journey"
@@index([eventType, eventTime])   -- "all visit_missed events today" (cron queries)
@@index([journeyId, eventTime])   -- "full timeline for this journey"
```

**One missing index:** The cron worker will query "all events for journeys in clinic X." This requires joining through `journeys -> patients -> clinics`. Consider adding a denormalized `clinic_id` directly on the events table as a future optimization, but NOT in V1. The join path through 3 tables is fine at this scale.

---

### Q3: Cron Worker as Separate Service vs. Serverless Functions

**Verdict: Separate Railway cron service is the right call. Serverless functions would be worse here.**

**Why the separate cron service wins:**
- **Execution time:** The nightly job does 5 things: generate expected visits, detect missed visits, compute risk levels, trigger recovery messages, and complete expired journeys. For 100 journeys per clinic across 50 clinics, this could take 30-120 seconds. Vercel serverless functions have a 10-second timeout on the Hobby plan (60 seconds on Pro). Railway cron has no such constraint.
- **Database connection management:** Serverless functions create a new database connection per invocation. With Neon's serverless driver this is tolerable, but the cron worker runs 5 sequential batch operations -- a single long-lived connection is more efficient and avoids connection pool exhaustion.
- **Shared code:** The cron worker imports the same Prisma client and event helpers as the web app. A separate Railway service in the same monorepo shares this code naturally. Serverless functions (e.g., Vercel Cron) would need the same deployment but with different entry points, which adds configuration complexity.
- **Cost:** Railway bills cron services only for execution time. A 2-minute nightly run costs approximately $0.001/day. This is effectively free.

**Risks the plan correctly identifies:**
- Cron failure goes undetected. Mitigation: add a health check. After each cron run, write a `cron_health` row to a simple table with `last_run_at`. The web app checks this on dashboard load. If `last_run_at` is more than 25 hours old, show a warning banner to the admin.
- Cron runs twice (Railway's at-least-once guarantee). Mitigation: idempotency keys. The plan mentions this but does not specify the key. Use `(journey_id, event_type, DATE(event_time))` as a unique constraint or upsert key for system-generated events.

**One architectural improvement:** The plan's cron entry point (`cron/index.ts`) runs all 5 tasks sequentially. If any task fails, subsequent tasks do not run. Wrap each task in a try/catch and continue. Log failures but do not abort the entire job.

```typescript
// cron/index.ts -- recommended pattern
const tasks = [
  generateExpectedVisits,
  detectMissedVisits,
  computeRiskLevels,
  triggerRecoveryMessages,
  completeExpiredJourneys,
];

for (const task of tasks) {
  try {
    await task();
  } catch (err) {
    console.error(`[CRON] ${task.name} failed:`, err);
    // Continue to next task -- do not abort
  }
}
```

---

### Q4: Risk Scoring -- Nightly Batch vs. Real-Time Computation

**Verdict: Nightly batch is correct for V1. The plan's reasoning is sound, but one intra-day gap needs a simple mitigation.**

**Why nightly batch works:**
- Risk levels change slowly. A patient goes from Stable to Watch to At Risk over days, not minutes. A 24-hour scoring cadence is sufficient granularity.
- Real-time scoring would require: (a) recomputing on every webhook callback, (b) recomputing on every staff action, (c) a queueing system to debounce rapid updates. This is significant complexity for zero user-visible benefit at V1 scale.
- The dashboard is viewed by doctors a few times per day, not monitored in real-time. Stale-by-hours data is acceptable.

**The intra-day gap:** The plan acknowledges this: "adherence_response events provide intra-day signal." But the dashboard queries currently rely on the nightly-computed risk level. If a patient responds to a recovery message at 10 AM, the dashboard still shows them as "At Risk" until the next 2 AM cron run. This is confusing but not harmful.

**Recommended mitigation (simple, no real-time scoring needed):** When displaying a patient's risk level on the dashboard, add a lightweight query: "has this patient sent an adherence_response or visit_confirmed event since the last cron run?" If yes, append a "(responding)" indicator. This does not change the risk level -- it just shows the doctor that the patient is engaging.

```sql
-- Dashboard query enhancement (pseudocode)
SELECT j.*,
  EXISTS (
    SELECT 1 FROM events e
    WHERE e.journey_id = j.id
    AND e.event_type IN ('adherence_response', 'visit_confirmed')
    AND e.created_at > '2026-03-02T02:00:00Z' -- last cron run
  ) AS has_recent_activity
FROM journeys j WHERE ...
```

---

### Q5: Multi-Tenancy via clinic_id on Every Table -- Sufficient for This Stage?

**Verdict: Yes, this is the correct approach for V1 through at least 200 clinics. No changes needed.**

**What the plan does well:**
- `clinic_id` on `patients`, with cascading to `journeys` and `events` through foreign keys. This means every query can be scoped by joining up to `patients.clinic_id`.
- The `@@unique([clinicId, phone])` constraint on patients prevents cross-tenant data collision (same phone number at two clinics is two separate patients).
- The quality gate "Database queries scoped to clinic_id (no cross-tenant data leaks)" is explicitly listed in acceptance criteria.

**What shared-database multi-tenancy requires (and the plan should formalize):**

1. **Query scoping middleware:** Every API route and server action must filter by the authenticated user's clinic_id. This is the most common source of multi-tenant data leaks. Recommendation: create a `getClinicId()` helper that reads from the session, and a `prisma` wrapper or Prisma client extension that automatically adds `where: { clinicId }` to every query.

```typescript
// lib/db.ts -- recommended pattern
export function scopedPrisma(clinicId: string) {
  return prisma.$extends({
    query: {
      patient: {
        $allOperations({ args, query }) {
          args.where = { ...args.where, clinicId };
          return query(args);
        },
      },
      // ... same for journey queries through patient join
    },
  });
}
```

2. **Events table does not have clinic_id directly.** This is fine architecturally (events belong to journeys, which belong to patients, which belong to clinics). But every event query for the dashboard requires a 3-table join: `events -> journeys -> patients WHERE patients.clinic_id = X`. At V1 scale this is negligible. At 500+ clinics, consider denormalizing `clinic_id` onto the events table.

3. **Row-Level Security (RLS) is not needed yet.** RLS in Postgres is powerful but adds complexity to migrations and debugging. The application-layer scoping described above is sufficient through V1 and V2.

**When to revisit:** If Ruthva ever needs to support "a doctor who works at two clinics" or "a corporate chain viewing all clinics," the current model breaks. But that is a V3+ concern at earliest.

---

### Q6: PWA with Next.js App Router -- SSR vs. CSR Concerns for Mobile-First Dashboard

**Verdict: The plan's approach is sound, but it needs to explicitly choose CSR for the authenticated app shell. SSR should be limited to the landing page and auth screens.**

**The tension:** Next.js App Router defaults to Server Components (SSR/SSG). For a mobile-first dashboard behind authentication:

- **SSR on every dashboard load** means: request hits Railway, server fetches data, renders HTML, streams to client. On Indian 4G with Railway servers in US/EU, server round-trip adds 200-400ms latency before first paint.
- **CSR with client-side data fetching** means: the PWA shell loads from service worker cache (instant), then fetches data via API routes. First paint is immediate; data appears after API call.

**Recommended architecture:**

1. **Landing page (`/`) and auth pages (`/login`, `/verify`):** Server Components. These are public, benefit from SSR for SEO (if relevant), and are visited once.

2. **Authenticated app shell (`/(app)/layout.tsx`):** This should be a Client Component shell that renders the bottom tab bar, header, and a content area. The shell itself is cached by Serwist and loads instantly from the service worker.

3. **Dashboard data (`/(app)/dashboard/page.tsx`):** Use `'use client'` with SWR or TanStack Query for data fetching. The page renders a loading state immediately (from cached shell), then fetches stats via `/api/dashboard`. This pattern gives:
   - Instant app-open experience (PWA shell from cache)
   - Fresh data on every view (API call)
   - Offline fallback (SWR shows stale cached data with "last updated" timestamp)

4. **API routes (`/api/*`):** These remain server-side (Route Handlers). They query Prisma and return JSON. This is the correct separation.

**Why NOT to use Server Components for the dashboard:**
- Server Components cannot use browser APIs (needed for pull-to-refresh, swipe gestures, offline detection).
- Server Components re-render on navigation, causing a full server round-trip. With a CSR dashboard, tab switching between Home/Patients is instant (client-side routing).
- The PWA service worker caches the client-side bundle. Server-rendered HTML is harder to cache meaningfully for dynamic data.

**The plan's Serwist configuration is correct:**
- `StaleWhileRevalidate` for API data (show cached, fetch fresh in background)
- `CacheFirst` for static assets (JS bundles, icons, fonts)
- Offline fallback page for when the network is completely unavailable

**One concern: `100dvh` and viewport handling.** The plan correctly specifies `100dvh` for dynamic viewport height. Ensure the `<meta name="viewport">` tag includes `viewport-fit=cover` for proper safe area handling on iOS:

```html
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
```

---

## 3. Compliance Check -- Architectural Principles

### SOLID Principles

| Principle | Assessment |
|---|---|
| **Single Responsibility** | PASS. Clear separation: `lib/events.ts` (event creation), `lib/risk.ts` (scoring), `lib/gupshup.ts` (messaging), `lib/dashboard.ts` (stat queries). Each module has one reason to change. |
| **Open/Closed** | PASS. Adding a 10th event type means adding a new case to the event creation helper and risk scoring logic. No existing code needs modification. The JSONB metadata pattern supports new fields without schema migration. |
| **Liskov Substitution** | N/A for V1. No inheritance hierarchies. |
| **Interface Segregation** | PASS. The 3 WhatsApp message types are separate template functions, not a monolithic "send message" with mode flags. |
| **Dependency Inversion** | PARTIAL. The cron worker directly imports Prisma and Gupshup clients. For V1 this is fine. For testability in V2, consider injecting these as dependencies. |

### Coupling Analysis

| Component Pair | Coupling Level | Assessment |
|---|---|---|
| Web app <-> Cron worker | LOW (shared DB only) | Correct. They share the database and Prisma schema but have no direct communication. |
| Web app <-> Gupshup | LOW (API calls + webhook) | Correct. Gupshup is behind `lib/gupshup.ts`. Swapping to Twilio means changing one file. |
| Events <-> Risk scoring | MEDIUM | Risk scoring reads events directly. This is acceptable -- the event schema IS the contract. |
| Auth <-> App | LOW | Auth.js tables are separate from app tables. Only linkage is `Clinic.userId -> User.id`. Clean. |

### Separation of Concerns

The plan maintains clear boundaries:
- **Data layer:** Prisma models + event helpers
- **Business logic:** Risk engine, journey lifecycle rules
- **Messaging:** Gupshup client, template definitions
- **Presentation:** Next.js pages + API routes
- **Scheduling:** Cron worker (separate service)

No layer violations detected.

---

## 4. Risk Analysis

### Risk 1: Journey Status as Dual Source of Truth (MEDIUM)

**What:** `journey.status` is mutable AND events describe the same state transitions. The gap analysis (`docs/11-flow-analysis-gaps.md`) flagged this correctly.

**Why it matters:** If a bug in the cron worker fails to update `journey.status` to `completed`, but the events clearly show the journey is past its duration, the dashboard (reading `status`) and the patient timeline (reading events) will disagree.

**Mitigation:** The cron worker is the single writer of `journey.status`. API routes and server actions must NEVER write to `journey.status` directly. Add a Prisma middleware or lint rule to enforce this. Additionally, the dashboard queries should derive risk levels from events, with `journey.status` used only as a filter for "active journeys."

### Risk 2: No Idempotency Key on Events Table (HIGH)

**What:** The events table has no unique constraint that prevents duplicate system-generated events. If the cron runs twice, patients could receive duplicate WhatsApp messages.

**Why it matters:** Duplicate `adherence_check_sent` events mean duplicate messages, which damages trust and violates the "max 1 message per day" rule.

**Mitigation:** Add a compound unique index:

```prisma
model Event {
  // ... existing fields
  @@unique([journeyId, eventType, eventDate]) // eventDate = DATE(eventTime)
}
```

Since Prisma does not natively support functional indexes, implement this as a raw SQL migration:

```sql
CREATE UNIQUE INDEX idx_events_idempotency
ON events (journey_id, event_type, (event_time::date))
WHERE event_type IN ('adherence_check_sent', 'reminder_sent', 'visit_expected', 'visit_missed');
```

This partial unique index only applies to system-generated events (staff/patient events like `visit_confirmed` can legitimately occur multiple times on the same day if corrected).

### Risk 3: Webhook Reliability and Event Attribution (MEDIUM)

**What:** Gupshup sends both incoming messages and delivery statuses to a single webhook URL. If the webhook is down during a Railway deployment, callbacks are lost. Additionally, quick-reply responses from shared phone numbers cannot be unambiguously attributed to a specific patient.

**Mitigation:**
- Gupshup retries webhooks for a limited period. Document the retry policy and ensure the webhook handler is idempotent (deduplicate by `messageId`).
- For shared phone numbers: include the patient name in the outbound message and use the `context` field in Gupshup's API to tag which journey the message belongs to. When the reply comes back, the `context` field maps it to the correct journey.

### Risk 4: No Clinic-Scoped Rate Limiting (LOW for V1, MEDIUM for V2)

**What:** The 250-conversation/24hr limit for new WhatsApp Business accounts is not enforced in the application. If a clinic has 100 patients, the nightly cron could attempt to send 100+ messages, exceeding the limit.

**Mitigation:** Add a counter in the cron worker: track messages sent per clinic per day. When approaching the limit, prioritize: recovery messages first, then pre-visit reminders, then adherence checks. Log skipped messages as events with reason `rate_limited`.

### Risk 5: Missing `recovery_message_sent` Escalation Terminal State (HIGH -- already resolved in plan)

The plan explicitly addresses this in the "Escalation policy" section: max 2 recovery messages, then mark Critical, notify doctor via dashboard, stop automated messages. This is correct. Verify that the cron implementation enforces the "max 2 per missed-visit cycle" rule by querying existing `recovery_message_sent` events before sending.

---

## 5. Recommendations

### Immediate (Before Writing Code)

1. **Formalize the "status is a cache" invariant.** Add a comment block in `schema.prisma` above the `Journey` model and in `INSTITUTIONAL_KNOWLEDGE.md` stating that `journey.status` is a materialized view derived from events, updated only by the cron worker.

2. **Add the idempotency index on events.** This is the highest-priority schema change. Without it, cron double-runs cause duplicate messages.

3. **Choose CSR for the authenticated app shell.** Explicitly mark `(app)/layout.tsx` as `'use client'` and use SWR/TanStack Query for all dashboard data fetching. Reserve Server Components for landing and auth pages only.

4. **Add `clinic_id` query scoping helper.** Create a `scopedPrisma(clinicId)` wrapper or Prisma extension that automatically filters by clinic. Use it in every API route. This is the single most important multi-tenancy safeguard.

### Before First Clinic Deploy

5. **Add cron health monitoring.** Write `last_run_at` to a simple health table after each cron run. Show a dashboard warning if stale.

6. **Implement message priority queue in cron.** When sending messages, order by: recovery > reminder > adherence check. Respect rate limits.

7. **Add `context` parameter to Gupshup messages.** Tag each outbound message with `journey_id` so inbound replies can be attributed correctly, especially for shared phone numbers.

### Before Scaling Beyond 10 Clinics

8. **Consider denormalizing `clinic_id` onto the events table.** Eliminates the 3-table join for clinic-scoped event queries.

9. **Add event schema versioning.** Store a `schema_version` field in event metadata. When metadata shapes change between versions, old events remain parseable.

10. **Implement a lightweight projection table.** A `journey_summary` table (materialized by the cron worker) with columns like `risk_level`, `last_activity_at`, `messages_sent_count`, `next_expected_visit`. This eliminates repeated event aggregation on every dashboard load.

---

## 6. Overall Assessment

**The architecture is well-suited for its stated purpose and scale.** The plan demonstrates unusually strong discipline for a solo-builder V1: clear scope boundaries, a minimal but extensible data model, sensible infrastructure choices, and thorough gap analysis.

**Strongest architectural decisions:**
- Event log pattern (not full event sourcing) with mutable entity tables. Pragmatic hybrid.
- Neon Mumbai for data localization. Correctly separates compute (Railway, US/EU) from data (Neon, India).
- Separate cron worker instead of serverless. Avoids timeout and connection issues.
- 4-table schema. Resists the temptation to add tables for things that are views over events.

**Areas needing attention before code:**
- Idempotency index on events (prevents duplicate messages)
- CSR vs SSR decision for the app shell (affects PWA performance)
- Clinic-scoped query middleware (prevents multi-tenant data leaks)

**No fundamental architectural changes are recommended.** The plan is sound. The recommendations above are refinements, not redesigns.
