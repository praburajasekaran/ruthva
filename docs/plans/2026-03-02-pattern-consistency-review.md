# Pattern Consistency Review — Ruthva V1 Plan

**Reviewed:** 2026-03-02
**Source:** `docs/plans/2026-03-01-feat-ruthva-v1-treatment-continuity-platform-plan.md`

---

## 1. Event-Sourced Pattern Consistency

**Verdict: MOSTLY CONSISTENT — 3 issues found**

The plan declares an "event-sourced core" with a single `events` table and JSONB metadata, where all state is derived from events. The 9 canonical event types are well-defined with clear origin, trigger, and metadata columns.

### Inconsistencies Found

**ISSUE 1.1 — Journey status is stored as mutable state, not derived from events (ANTI-PATTERN)**

The `journeys` table has a `status` column (`active|completed|dropped`) that is mutated directly by the nightly cron:
- "nightly cron sets status to `completed`"
- "nightly cron sets status, stops messaging, notifies doctor"

In a true event-sourced system, journey status would be *derived* from events (e.g., a `journey_completed` or `journey_dropped` event would exist, and current status would be computed by replaying events). The plan even acknowledges this in the Sources section: "journey_completed computed not stored" — but the schema and cron logic contradict this by directly mutating the `status` field.

**Recommendation:** Either:
- (a) Add `journey_completed` and `journey_dropped` event types to the canonical 9 (making 11), and derive status from the latest lifecycle event. This is the pure event-sourced approach.
- (b) Explicitly document that journeys use a *hybrid* pattern: event-sourced for patient behavior, but mutable state for journey lifecycle. This is pragmatic for V1 but should be called out so future developers don't assume pure event sourcing.

**Severity: Medium** — This is the most significant pattern break in the plan.

**ISSUE 1.2 — `message_failed` event type referenced but not in the canonical 9**

The WhatsApp failure handling section says: "Still failed -> log `message_failed` event, skip this cycle." But `message_failed` is not listed in the 9 canonical event types table. This is an undocumented 10th event type.

**Recommendation:** Add `message_failed` to the canonical event types table with its origin (`system`), trigger (Gupshup delivery failure after retry), and metadata (`{ original_event_type, message_id, error_code }`).

**Severity: Low** — Easy to fix, just a documentation gap.

**ISSUE 1.3 — Delivery status updates go into event metadata, not as separate events**

"Status callback -> log delivery/read/failed status in event metadata" — This means delivery statuses *mutate* existing event metadata rather than creating new events. In event sourcing, events are immutable. Updating metadata on an existing `adherence_check_sent` event violates immutability.

**Recommendation:** Either:
- (a) Create a separate `message_status_updated` event type that references the original message event.
- (b) Explicitly document that message delivery statuses are a pragmatic exception to event immutability, stored as metadata updates on the originating event.

**Severity: Low-Medium** — Pragmatic for V1, but should be documented as a conscious trade-off.

---

## 2. Multi-Tenancy (clinic_id Scoping) Consistency

**Verdict: INCONSISTENT — 2 structural gaps**

### What is Consistent

- `patients` table has `clinic_id` FK with a unique constraint on `[clinicId, phone]` — good
- Quality Gates explicitly state: "Database queries scoped to clinic_id (no cross-tenant data leaks)"
- The Clinic -> Patient -> Journey -> Event hierarchy provides implicit scoping through joins

### Inconsistencies Found

**ISSUE 2.1 — `events` and `journeys` tables have NO direct `clinic_id` column**

The `events` table connects to `journey_id`, and `journeys` connects to `patient_id`. To scope events by clinic, you must join through `events -> journeys -> patients -> clinics`. This is a 3-table join for every clinic-scoped event query.

The nightly cron must "compute risk levels for all active journeys" — this requires joining journeys through patients to clinics to scope per-tenant. Every dashboard query (at-risk counts, recovered this month, revenue protected) requires the same multi-join.

**Recommendation:** Add `clinic_id` as a denormalized column on both `journeys` and `events` tables. This is a standard multi-tenancy pattern that:
- Enables simple `WHERE clinic_id = ?` on all queries
- Supports future Row-Level Security (RLS) policies on Neon Postgres
- Eliminates expensive joins on the most frequent query path (dashboard loads)

**Severity: Medium-High** — This will cause performance issues as clinics scale and makes RLS implementation harder.

**ISSUE 2.2 — Cron worker has no clinic_id scoping strategy defined**

The cron worker processes "all active journeys" — but there is no mention of how it partitions work by clinic or prevents cross-tenant data access. The cron files (`generate-expected-visits.ts`, `detect-missed-visits.ts`, `compute-risk-levels.ts`, `trigger-recovery-messages.ts`) would need to either:
- Process all clinics in a single batch (simpler, but risky for data isolation)
- Iterate clinic-by-clinic (safer, and enables per-clinic error isolation)

**Recommendation:** Document the cron strategy. Recommend clinic-by-clinic iteration so a failure for one clinic does not block processing for others.

**Severity: Medium** — Affects reliability and data isolation.

---

## 3. WhatsApp Messaging Pattern Consistency

**Verdict: MOSTLY CONSISTENT — 2 gaps**

### What is Consistent

All 3 message types follow a clear pattern:
1. **Adherence Check (Sensor):** scheduled by cron -> sent via Gupshup -> logged as `adherence_check_sent` -> response creates `adherence_response`
2. **Pre-Visit Reminder (Assist):** triggered by `visit_expected` date -> sent via Gupshup -> logged as `reminder_sent`
3. **Recovery Message (Intervention):** triggered by risk engine -> sent via Gupshup -> logged as `recovery_message_sent`

The send/log pattern is consistent. Quick-reply buttons are defined for all 3 types. Gupshup template registration is planned for all 3.

### Inconsistencies Found

**ISSUE 3.1 — No `adherence_response`-equivalent event for Reminder and Recovery replies**

The Adherence Check defines a clear response path: patient replies -> `adherence_response` event with `{ response: "yes"|"missed"|"help_needed" }`.

But the Pre-Visit Reminder has buttons `[Yes] [Later]` and the Recovery Message has buttons `[Yes] [Call me]` — yet there are no corresponding event types for these responses. The webhook handler section says "parse quick reply -> create adherence_response event" — suggesting ALL replies become `adherence_response` events regardless of which message they are replying to.

**Recommendation:** Either:
- (a) Use `adherence_response` as a generic response event but include a `source_message_type` field in metadata to distinguish which message the patient replied to. This is simpler.
- (b) Create distinct event types: `reminder_response` and `recovery_response`. This is more explicit.

Option (a) is pragmatic for V1 but should be documented. The metadata should include `{ source_event_id, response, source_type: "adherence_check"|"reminder"|"recovery" }`.

**Severity: Medium** — Without this, you cannot distinguish whether a "Yes" reply is confirming adherence, confirming a visit, or agreeing to reschedule.

**ISSUE 3.2 — Pre-Visit Reminder has no retry/failure handling defined**

The plan defines failure handling for the adherence check (retry once after 1hr, then `message_failed`) and recovery messages (escalation policy with max 2 attempts). But the Pre-Visit Reminder has no failure path defined.

**Recommendation:** Apply the same retry pattern as adherence checks: retry once after 1hr, then `message_failed` event.

**Severity: Low** — Easy to fix by applying the existing pattern.

---

## 4. Risk Scoring / Escalation Logic Consistency

**Verdict: MOSTLY CONSISTENT — 2 ambiguities**

### What is Consistent

The 4-level system (Stable -> Watch -> At Risk -> Critical) is clearly defined with:
- Deterministic rules (no ML)
- Explainable reasons for each level
- Color-coded dashboard display (Green/Yellow/Orange/Red)
- CSS variables for each level (`--color-risk-stable`, `--color-risk-watch`, `--color-risk-at-risk`, `--color-risk-critical`)

### Ambiguities Found

**ISSUE 4.1 — Transition triggers are defined by criteria, not by event-based transitions**

The risk levels are defined as static criteria (e.g., "Visit overdue 3+ days" = At Risk), but there is no defined *transition* logic. Specifically:

- Can a patient go from Stable directly to Critical? (e.g., no response for 7+ days after being Stable)
- Can a patient go from Critical back to Stable? (e.g., they respond after being Critical)
- When `patient_returned` event is created by staff, does risk immediately reset to Stable or does it wait for next cron run?

The escalation policy references "Critical for 14+ consecutive days" for auto-drop, but does not define downward transitions.

**Recommendation:** Define explicit transition rules:
- Upward: any level can jump to any higher level based on criteria (not sequential)
- Downward: `visit_confirmed` or `patient_returned` resets to Stable; `adherence_response` with "yes" moves down one level; recovery reply moves to Watch
- Timing: risk level changes only on nightly cron (acceptable for V1), with one exception: `patient_returned` should reset immediately

**Severity: Medium** — Without this, the cron worker implementation will require guesswork.

**ISSUE 4.2 — Recovery message trigger overlaps with risk level assignment**

The recovery message is triggered when "Risk engine marks patient At Risk or Critical." But the escalation policy in the WhatsApp section says "1st recovery message: 3 days after missed visit" and "2nd recovery message: 6 days after missed visit."

The risk level criteria say At Risk = "Visit overdue 3+ days." So the 1st recovery message and the At Risk assignment happen at the same threshold (3 days overdue). But Critical = "Visit overdue 7+ days" while the 2nd recovery message fires at 6 days. There is a 1-day gap between the 2nd recovery (day 6) and Critical status (day 7).

**Recommendation:** Align the timings explicitly:
- Day 3 overdue: At Risk + 1st recovery message (consistent)
- Day 6 overdue: still At Risk + 2nd recovery message
- Day 7 overdue: Critical (no more messages, doctor notified)
- Day 21 overdue (14 days Critical): journey auto-dropped

Document these as a unified timeline so the cron worker can implement them as a single ordered sequence.

**Severity: Low-Medium** — The intent is clear but the numbers need to be reconciled in one place.

---

## 5. UI Component Pattern Consistency

**Verdict: CONSISTENT — 1 minor observation**

### What is Consistent

The plan defines 4 reusable patterns with concrete Tailwind implementations:
1. **Stat Card** — `rounded-lg border border-border bg-surface p-4` with number/label/subtext structure
2. **Patient Row** — `flex items-center gap-3 px-4 py-3 min-h-[72px]` with avatar/content/chevron structure
3. **Action Button** — `rounded-md bg-brand-600 px-4 py-2` with hover/active states
4. **Risk Badge** — `inline-flex items-center rounded-full px-2 py-0.5` with risk-color background

All patterns use the CSS variable design tokens consistently. Lucide React icons are specified. The approach of "conventions, not components" is explicitly stated.

### Minor Observation

**OBSERVATION 5.1 — No loading/empty/error states defined for UI patterns**

The UI patterns show the "happy path" only. There is no definition of:
- What the Stat Card shows when data is loading or zero
- What the Patient List shows when empty ("No patients at risk" state)
- What happens when a dashboard query fails

The plan says "No skeleton loaders (simple loading spinner is fine for V1)" — but does not show what this spinner looks like or where it appears.

**Recommendation:** Add a brief section defining: (a) a loading spinner pattern, (b) empty state patterns for each list, (c) inline error state for failed queries. These can be simple Tailwind patterns matching the existing conventions.

**Severity: Low** — Cosmetic, but developers will need to improvise without guidance.

---

## 6. Naming Convention Consistency

**Verdict: MOSTLY CONSISTENT — 3 issues**

### What is Consistent

- **Event types:** All use `snake_case` consistently (`journey_started`, `visit_expected`, `visit_confirmed`, `visit_missed`, `adherence_check_sent`, `adherence_response`, `reminder_sent`, `recovery_message_sent`, `patient_returned`)
- **Database tables (ER diagram):** `CLINICS`, `PATIENTS`, `JOURNEYS`, `EVENTS` — uppercase plural (Mermaid convention)
- **CSS variables:** `--color-risk-stable`, `--color-brand-600` — consistent kebab-case
- **API routes:** `/api/webhooks/gupshup`, `/api/auth/[...nextauth]` — consistent Next.js conventions

### Inconsistencies Found

**ISSUE 6.1 — Prisma models use singular PascalCase but ER diagram uses plural UPPERCASE**

ER diagram: `CLINICS`, `PATIENTS`, `JOURNEYS`, `EVENTS`
Prisma schema: `Clinic`, `Patient`, `Journey`, `Event`

This is technically fine (Prisma convention is singular PascalCase, ER diagrams often use plural) but the plan does not specify what the actual PostgreSQL table names will be. By default, Prisma will create tables named `Clinic`, `Patient`, `Journey`, `Event` (singular PascalCase) unless `@@map("clinics")` is used.

**Recommendation:** Add `@@map("clinics")`, `@@map("patients")`, `@@map("journeys")`, `@@map("events")` to Prisma models so PostgreSQL table names are lowercase plural — matching the ER diagram and conventional database naming.

**Severity: Low** — Cosmetic but prevents confusion when writing raw SQL or viewing tables in Neon console.

**ISSUE 6.2 — Mixed naming in event metadata keys**

Looking at metadata examples:
- `journey_started`: `{ duration: 30, interval: 7 }` — short names
- `visit_expected`: `{ visit_number: 3, expected_date: "2026-03-15" }` — snake_case
- `visit_confirmed`: `{ confirmed_by: "staff" }` — snake_case
- `adherence_check_sent`: `{ message_id: "gupshup_xyz" }` — snake_case
- `adherence_response`: `{ response: "yes"|"missed"|"help_needed" }` — single key
- `recovery_message_sent`: `{ attempt: 1, message_id: "gupshup_xyz" }` — snake_case

The `journey_started` metadata uses `duration` and `interval` which are ambiguous (duration of what? interval of what?). Every other event uses more explicit keys like `visit_number`, `expected_date`, `days_overdue`.

**Recommendation:** Rename `journey_started` metadata to `{ duration_days: 30, followup_interval_days: 7 }` to match the Prisma schema field names (`durationDays`, `followupIntervalDays` in camelCase) or at minimum be self-documenting.

**Severity: Low** — Cosmetic but improves readability of event logs.

**ISSUE 6.3 — Cron file naming uses kebab-case but lib files are unspecified**

Cron files: `generate-expected-visits.ts`, `detect-missed-visits.ts`, `compute-risk-levels.ts` (kebab-case)
Lib files: `auth.ts`, `db.ts`, `events.ts`, `gupshup.ts`, `risk.ts`, `dashboard.ts` (single-word or flat)

This is fine for now but should be documented as a convention: kebab-case for multi-word filenames. `risk.ts` vs `compute-risk-levels.ts` suggests different naming approaches for lib vs cron.

**Severity: Very Low** — Observation only.

---

## 7. Error Handling Pattern Consistency

**Verdict: PARTIALLY CONSISTENT — 2 gaps**

### What is Consistent

The plan has a well-structured Error & Failure Propagation table covering 5 failure scenarios:
1. Gupshup API down -> retry once, log `message_failed`, skip cycle
2. Patient blocks number -> error 470, pause messaging, flag on dashboard
3. Nightly cron fails -> health checks, manual trigger, idempotent design
4. Neon Postgres timeout -> connection pooling, retry, offline PWA
5. Auth email failure -> Resend reliability, "Resend code" button, spam folder prompt

State lifecycle risks are also covered: partial journey creation (transaction + rollback), duplicate events (idempotency key), stale risk levels, orphaned journeys (cascade delete).

### Gaps Found

**ISSUE 7.1 — No error handling for webhook validation failures**

The Quality Gates mention "Webhook endpoint validates Gupshup signature" but there is no defined behavior for when validation fails. What happens when:
- An invalid/spoofed request hits `/api/webhooks/gupshup`?
- The request body is malformed (missing fields, wrong format)?
- A quick-reply response does not match expected values?

**Recommendation:** Define:
- Invalid signature: return 401, log attempt, do not create event
- Malformed body: return 400, log warning with request body for debugging
- Unexpected quick-reply value: create `adherence_response` event with `{ response: "unknown", raw_response: "..." }` — do not discard data

**Severity: Medium** — Webhook endpoints are public-facing and will receive unexpected payloads.

**ISSUE 7.2 — No error handling for the "Add Patient" transaction failure path**

The plan mentions wrapping patient creation in a transaction (State Lifecycle Risks section), but the UI section does not define what the user sees when:
- The transaction fails (DB error)
- The phone number is already registered (unique constraint violation on `[clinicId, phone]`)
- Consent is not checked (validation error)

**Recommendation:** Define inline error states for the Add Patient form:
- DB error: "Something went wrong. Please try again." with retry button
- Duplicate phone: "This patient already exists in your clinic." with link to existing patient
- Missing consent: "Patient consent is required to proceed." (prevent form submission)

**Severity: Low-Medium** — These are common paths that developers will encounter immediately.

---

## Summary of All Issues

| # | Pattern | Issue | Severity |
|---|---------|-------|----------|
| 1.1 | Event Sourcing | Journey status mutated directly instead of derived from events | Medium |
| 1.2 | Event Sourcing | `message_failed` not in canonical 9 event types | Low |
| 1.3 | Event Sourcing | Delivery status updates mutate existing events | Low-Medium |
| 2.1 | Multi-Tenancy | No `clinic_id` on `journeys` or `events` tables | Medium-High |
| 2.2 | Multi-Tenancy | Cron worker has no clinic-scoping strategy | Medium |
| 3.1 | WhatsApp Messaging | No way to distinguish responses to different message types | Medium |
| 3.2 | WhatsApp Messaging | Pre-Visit Reminder has no failure handling defined | Low |
| 4.1 | Risk Scoring | No downward transition rules defined (Critical -> Stable) | Medium |
| 4.2 | Risk Scoring | Recovery message timing misaligned with risk level thresholds | Low-Medium |
| 5.1 | UI Components | No loading/empty/error states for UI patterns | Low |
| 6.1 | Naming | Prisma model names won't match ER diagram table names | Low |
| 6.2 | Naming | `journey_started` metadata keys are ambiguous | Low |
| 6.3 | Naming | No documented file naming convention | Very Low |
| 7.1 | Error Handling | No webhook validation failure behavior defined | Medium |
| 7.2 | Error Handling | No user-facing error states for Add Patient form | Low-Medium |

### Priority Recommendations (Top 5)

1. **Add `clinic_id` to `journeys` and `events` tables** (Issue 2.1) — This is a schema decision that is expensive to change later. Denormalize now for query performance and RLS readiness.

2. **Decide on journey status: event-derived or hybrid** (Issue 1.1) — Document the choice explicitly. If hybrid, add `journey_completed` and `journey_dropped` events anyway for the audit trail, even if status is also mutated.

3. **Define risk level downward transitions** (Issue 4.1) — The cron worker cannot be implemented without knowing how patients move from Critical back to Stable.

4. **Add `source_type` to adherence_response metadata** (Issue 3.1) — Without this, analytics on message effectiveness are impossible (you cannot tell which message type prompted the patient to reply).

5. **Define webhook error handling** (Issue 7.1) — The webhook is a public endpoint. Define behavior for invalid signatures, malformed bodies, and unexpected responses before implementation.
