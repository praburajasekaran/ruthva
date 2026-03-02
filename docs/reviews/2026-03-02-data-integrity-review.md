# Data Integrity Review: Ruthva V1 Event-Sourced Model

**Date:** 2026-03-02
**Scope:** Event-sourced data model, JSONB metadata, journey lifecycle, cron idempotency, race conditions, cascade deletes, unique constraints, transaction boundaries, DPDP deletion
**Verdict:** The plan has strong foundational thinking. Nine specific gaps need to be closed before implementation.

---

## 1. Events Table JSONB Metadata -- Integrity Constraints

**Current state:** The `metadata` column is `Json @default("{}")` with no validation. Any arbitrary JSON can be inserted.

**Risks:**
- A `visit_expected` event without `visit_number` or `expected_date` in metadata silently corrupts the visit schedule.
- A `recovery_message_sent` event missing `attempt` makes escalation logic (max 2 attempts) unreliable.
- Misspelled keys (`vist_number` instead of `visit_number`) go undetected.

**Recommendations:**

(a) Define a TypeScript discriminated union for event creation -- the plan already mentions "type-safe helpers" but this must be the ONLY code path that creates events. No raw Prisma `create()` calls on the Event model outside these helpers.

```typescript
// lib/events.ts
type EventPayload =
  | { eventType: 'journey_started'; metadata: { duration: number; interval: number } }
  | { eventType: 'visit_expected'; metadata: { visit_number: number; expected_date: string } }
  | { eventType: 'visit_confirmed'; metadata: { confirmed_by: 'staff' | 'patient' } }
  | { eventType: 'visit_missed'; metadata: { days_overdue: number } }
  | { eventType: 'adherence_check_sent'; metadata: { message_id: string } }
  | { eventType: 'adherence_response'; metadata: { response: 'yes' | 'missed' | 'help_needed' } }
  | { eventType: 'reminder_sent'; metadata: { message_id: string } }
  | { eventType: 'recovery_message_sent'; metadata: { attempt: number; message_id: string } }
  | { eventType: 'patient_returned'; metadata: { days_absent: number } };
```

(b) Add a Zod schema per event type and validate at the `createEvent()` boundary. This catches corruption from webhook handlers or cron bugs.

(c) Add a CHECK constraint at the database level for `event_type`:

```sql
ALTER TABLE events ADD CONSTRAINT valid_event_type
  CHECK (event_type IN (
    'journey_started', 'visit_expected', 'visit_confirmed',
    'visit_missed', 'adherence_check_sent', 'adherence_response',
    'reminder_sent', 'recovery_message_sent', 'patient_returned'
  ));
```

(d) Consider adding a `schema_version` field to the events table (integer, default 1). When metadata shapes evolve in V2/V3, this allows safe migration of event interpretation logic without rewriting historical events.

---

## 2. Journey Status Transitions -- Invalid State Machine

**Current state:** `status` is a plain `String @default("active")` with allowed values `active|completed|dropped`. No constraints prevent invalid transitions.

**Risks:**
- A completed journey could be set back to `active` (re-opening a finished treatment).
- A dropped journey could be set to `completed` (logically contradictory).
- Multiple cron runs could race to transition the same journey.

**Recommendations:**

(a) Add a database-level CHECK constraint:

```sql
ALTER TABLE journeys ADD CONSTRAINT valid_status
  CHECK (status IN ('active', 'completed', 'dropped'));
```

(b) Enforce valid transitions in application code. The only legal transitions are:

```
active -> completed  (duration expired, nightly cron)
active -> dropped    (14+ days Critical with no response, nightly cron)
```

No reverse transitions. No `completed -> dropped` or `dropped -> active`. Implement this as a guard:

```typescript
function transitionJourneyStatus(current: string, next: string): boolean {
  const allowed: Record<string, string[]> = {
    active: ['completed', 'dropped'],
    completed: [],
    dropped: [],
  };
  return allowed[current]?.includes(next) ?? false;
}
```

(c) Use optimistic locking on the journey row. Add a `version` column (integer) and use `WHERE status = 'active' AND version = :currentVersion` in the UPDATE. This prevents two cron processes from both transitioning the same journey.

(d) Log a `journey_completed` or `journey_dropped` event when status changes. Currently the plan has no event type for journey lifecycle transitions. This creates a gap in the event log -- the timeline will show the journey just stops, with no closing event. Add:

```
| journey_completed | system | Cron: duration expired | { final_day: 31 } |
| journey_dropped   | system | Cron: 14+ days critical | { days_critical: 14 } |
```

---

## 3. Nightly Cron Idempotency

**Current state:** The plan mentions "idempotent cron design" and "idempotency key (journey_id + event_type + date) with unique constraint" but the Prisma schema does not include this unique constraint.

**Risks:**
- If the cron crashes halfway and restarts, it could re-emit `visit_expected` or `visit_missed` events, leading to duplicate WhatsApp messages.
- Railway cron may fire twice due to deployment overlap.

**Recommendations:**

(a) Add the unique constraint to the Prisma schema immediately:

```prisma
model Event {
  // ... existing fields ...

  @@unique([journeyId, eventType, eventDate], name: "idempotency_key")
}
```

This requires adding an `eventDate` column (Date type, derived from `eventTime` but stored as a date for deduplication). Alternative: use a composite of `journeyId + eventType + date_trunc('day', eventTime)` via a unique index in a raw migration.

(b) Use `upsert` or `INSERT ... ON CONFLICT DO NOTHING` for cron-generated events. This makes re-runs safe.

(c) Add a `cron_runs` tracking table:

```sql
CREATE TABLE cron_runs (
  id UUID PRIMARY KEY,
  run_date DATE NOT NULL,
  job_name TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'running', -- running|completed|failed
  events_created INT DEFAULT 0,
  UNIQUE(run_date, job_name)
);
```

This provides observability and prevents overlapping runs (check for `status = 'running'` before starting).

(d) The cron should process journeys in a deterministic order (e.g., `ORDER BY id`) and commit in batches, not one giant transaction. This prevents lock contention on the events table and allows partial progress on restart.

---

## 4. Race Condition: visit_confirmed vs visit_missed

**Current state:** The plan says "if `visit_confirmed` exists for a date, ignore `visit_missed` for same date (latest event wins)" and "All event queries use `eventTime DESC` ordering."

**Analysis:** This is a TOCTOU (time-of-check-time-of-use) race. The scenario:

```
11:55 PM  Staff taps "Visited" -> visit_confirmed created (eventTime = 11:55 PM)
12:00 AM  Cron starts, queries events for this journey
12:00 AM  Cron sees no visit_confirmed for expected_date (query uses date comparison,
          but visit_confirmed has yesterday's date in eventTime)
12:01 AM  Cron emits visit_missed -> patient gets unnecessary recovery message later
```

**The root problem:** The `visit_confirmed` event's `eventTime` is the timestamp when staff tapped the button, but the `visit_expected` event's `expected_date` is in metadata. The cron checks whether a confirmation exists "for that expected date" -- but there is no explicit link between a `visit_confirmed` and a specific `visit_expected`.

**Recommendations:**

(a) Add `expected_visit_id` or `expected_date` to the `visit_confirmed` metadata:

```typescript
{ eventType: 'visit_confirmed', metadata: { confirmed_by: 'staff', for_expected_date: '2026-03-15' } }
```

This creates an explicit link. The cron checks: "Is there a `visit_confirmed` with `for_expected_date` matching this `visit_expected`'s date?" -- unambiguous, no date math.

(b) The cron's missed-visit detection query should be:

```sql
SELECT ve.* FROM events ve
WHERE ve.event_type = 'visit_expected'
  AND ve.journey_id = :journeyId
  AND (ve.metadata->>'expected_date')::date + :graceDays < CURRENT_DATE
  AND NOT EXISTS (
    SELECT 1 FROM events vc
    WHERE vc.journey_id = ve.journey_id
      AND vc.event_type = 'visit_confirmed'
      AND vc.metadata->>'for_expected_date' = ve.metadata->>'expected_date'
  )
  AND NOT EXISTS (
    SELECT 1 FROM events vm
    WHERE vm.journey_id = ve.journey_id
      AND vm.event_type = 'visit_missed'
      AND vm.metadata->>'expected_date' = ve.metadata->>'expected_date'
  );
```

(c) Add a grace window to the cron. Do not run missed-visit detection for expected dates where `expected_date + grace_days = today`. Only detect missed visits where `expected_date + grace_days < today`. This gives staff until end-of-day to confirm.

(d) Consider running the cron at 2:00 AM IST instead of midnight, giving a buffer for late-night confirmations.

---

## 5. Cascade Delete Behavior

**Current state:** The plan says "cascade delete in Prisma schema" for patient deletion but the Prisma schema shown has no `onDelete` directives.

**Risks:**
- Deleting a patient without cascading leaves orphaned journeys and events (referential integrity violation).
- Prisma's default behavior is to throw an error on delete if child records exist, NOT to cascade.
- For DPDP deletion requests, a failed cascade means partial deletion -- some patient data remains.

**Recommendations:**

(a) Add explicit cascade behavior to the Prisma schema:

```prisma
model Patient {
  // ...
  journeys Journey[] // Prisma will cascade if we set onDelete on the child side
}

model Journey {
  patientId String
  patient   Patient @relation(fields: [patientId], references: [id], onDelete: Cascade)
  events    Event[]
}

model Event {
  journeyId String
  journey   Journey @relation(fields: [journeyId], references: [id], onDelete: Cascade)
}
```

This ensures `DELETE FROM patients WHERE id = X` cascades to journeys, then to events.

(b) Also add cascade from Clinic to Patient:

```prisma
model Patient {
  clinicId String
  clinic   Clinic @relation(fields: [clinicId], references: [id], onDelete: Cascade)
}
```

If a clinic account is deleted (DPDP: doctor requests full data removal), all patients, journeys, and events are removed.

(c) The DPDP deletion endpoint must be a single transaction:

```typescript
await prisma.$transaction(async (tx) => {
  // Delete all events for all journeys of this patient
  // Delete all journeys for this patient
  // Delete the patient
  // OR: just delete the patient and let CASCADE handle it
  await tx.patient.delete({ where: { id: patientId } });

  // Also purge from any caches, logs, or external systems
  // Log the deletion event in an audit table (without PII)
});
```

(d) CRITICAL: The Auth.js tables (users, accounts, sessions) are NOT cascaded from Clinic. If a doctor requests full deletion, you must also delete their Auth.js user record. Map the deletion path: `User -> Clinic -> Patients -> Journeys -> Events` plus `User -> Accounts, Sessions`.

---

## 6. Unique Constraints

**Current state:** The schema has `@@unique([clinicId, phone])` on Patient. No unique constraint on events for idempotency.

**Analysis of the existing constraint:**

The `[clinicId, phone]` constraint is correct -- a phone number is unique within a clinic. This prevents duplicate patient records.

**Missing constraints:**

(a) Events idempotency (covered in section 3 above).

(b) Journey uniqueness: There is no constraint preventing multiple active journeys for the same patient. The plan does not discuss this scenario. If a patient starts a 30-day treatment, drops off, then returns and starts a new 60-day treatment, there could be two `active` journeys.

**Recommendation:** Add a partial unique index:

```sql
CREATE UNIQUE INDEX one_active_journey_per_patient
  ON journeys (patient_id)
  WHERE status = 'active';
```

This allows multiple completed/dropped journeys (history) but only one active journey at a time per patient. This is critical for the cron -- without it, the cron must handle the ambiguity of which active journey to process.

(c) Clinic-level uniqueness: `whatsappNumber` is `@unique` on Clinic, which is correct globally. The `userId` is also `@unique`, correctly enforcing one clinic per auth user.

(d) Phone number format: There is no validation that `phone` follows a consistent format. `+919876543210`, `09876543210`, and `9876543210` could all refer to the same number but pass the unique constraint. Normalize to E.164 format (`+91XXXXXXXXXX`) at the application layer before insert.

---

## 7. JSONB Metadata Validation

**Current state:** No database-level validation of JSONB contents. Relies entirely on application code.

**Risks beyond section 1:**
- The Gupshup webhook handler parses external input and stores it in metadata. A malformed webhook payload could inject unexpected keys or types.
- Large JSONB blobs (e.g., if someone sends a very long WhatsApp message stored in metadata) could degrade query performance on JSONB operators.

**Recommendations:**

(a) Validate at every ingestion point, not just the `createEvent()` helper:
- Webhook handler: validate and sanitize Gupshup payload before creating events.
- Cron worker: validate computed metadata before inserting.
- API routes: validate staff-originated events (visit_confirmed, patient_returned).

(b) Add a size limit on metadata:

```sql
ALTER TABLE events ADD CONSTRAINT metadata_size_limit
  CHECK (pg_column_size(metadata) <= 4096);
```

4KB is generous for the defined metadata shapes and prevents accidental bloat.

(c) Create GIN indexes on commonly queried JSONB paths:

```sql
CREATE INDEX idx_events_expected_date
  ON events ((metadata->>'expected_date'))
  WHERE event_type = 'visit_expected';

CREATE INDEX idx_events_for_expected_date
  ON events ((metadata->>'for_expected_date'))
  WHERE event_type = 'visit_confirmed';
```

These are critical for the cron's missed-visit detection query performance.

---

## 8. Transaction Boundaries

**Current state:** The plan mentions one transaction: "wrap in transaction; rollback patient if events fail" for patient creation. No other transactions are defined.

**Operations that MUST be atomic:**

(a) **Patient + Journey + initial Events creation:**

```typescript
await prisma.$transaction(async (tx) => {
  const patient = await tx.patient.create({ data: patientData });
  const journey = await tx.journey.create({ data: { patientId: patient.id, ... } });
  await tx.event.create({ data: { journeyId: journey.id, eventType: 'journey_started', ... } });
  // Generate all visit_expected events
  for (const visit of expectedVisits) {
    await tx.event.create({ data: { journeyId: journey.id, eventType: 'visit_expected', ... } });
  }
});
```

If any step fails, nothing is committed. No orphaned patients without journeys.

(b) **Journey status transition + closing event:**

The transition from `active` to `completed` or `dropped` MUST atomically update the journey status AND create the closing event. Otherwise you could have a journey marked `completed` with no `journey_completed` event, or vice versa.

(c) **Visit confirmation + risk-level update (if computed eagerly):**

In V1, risk is computed nightly, so this is less critical. But if you ever add real-time risk updates, the visit_confirmed event and risk recalculation must be atomic.

(d) **DPDP deletion (covered in section 5).**

**Operations that should NOT be in a single transaction:**

(e) **The nightly cron run.** Processing 100+ journeys in one transaction would hold locks for too long. Process in batches of 10-20 journeys, each batch in its own transaction. On failure, the remaining batches are unprocessed but the completed batches are committed. Idempotency keys (section 3) make re-runs safe.

---

## 9. Data Retention and DPDP Deletion

**Current state:** The plan covers consent collection, data localization (Neon Mumbai), and mentions a deletion API endpoint. Gaps remain.

**Recommendations:**

(a) **Audit trail for deletions.** When patient data is deleted under DPDP, you need to prove the deletion happened without retaining PII. Create a `deletion_log` table:

```sql
CREATE TABLE deletion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL,         -- 'patient', 'clinic'
  entity_id TEXT NOT NULL,           -- the deleted record's ID (not PII)
  clinic_id TEXT NOT NULL,           -- for audit scoping
  requested_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  records_deleted JSONB,             -- { patients: 1, journeys: 2, events: 47 }
  requested_by TEXT NOT NULL         -- 'patient_request', 'clinic_request', 'system_retention'
);
```

(b) **Data retention policy.** The plan does not define how long data is kept. DPDP requires data to be retained only as long as necessary for the stated purpose. Recommendations:
- Active journeys: retained while active.
- Completed/dropped journeys: retain for 12 months after completion for clinic reference, then auto-purge.
- Add a `retention_expires_at` column to the journeys table, set to `completed_at + 12 months`.
- Monthly cron job purges expired journeys and their events.

(c) **Consent withdrawal.** The plan handles consent at creation but does not address consent withdrawal. Under DPDP, a patient can withdraw consent at any time. This should:
- Stop all WhatsApp messaging immediately.
- NOT delete historical events (the clinic may need the treatment record).
- Set `consent_given = false` and `consent_withdrawn_at` timestamp.
- Add a `consent_withdrawn` event to the journey.

(d) **Data export.** DPDP grants data principals the right to access their data. While not required in V1 UI, the backend should support generating a JSON export of all data for a given patient (patient record + journeys + events). This is straightforward with the current schema.

(e) **Encryption at rest.** Neon Postgres encrypts data at rest by default (AES-256). Verify this is enabled for the Mumbai region. No additional application-level encryption is needed for V1, but consider encrypting the `phone` column if you add application-level encryption later (phone numbers are PII under DPDP).

---

## Summary of Required Schema Changes

| Change | Priority | Complexity |
|---|---|---|
| Add `onDelete: Cascade` to all foreign keys | CRITICAL | Low |
| Add CHECK constraint on `journey.status` | CRITICAL | Low |
| Add CHECK constraint on `event.event_type` | HIGH | Low |
| Add idempotency unique index on events | CRITICAL | Medium |
| Add partial unique index for one-active-journey-per-patient | HIGH | Low |
| Add `for_expected_date` to `visit_confirmed` metadata | HIGH | Low |
| Add `journey_completed` and `journey_dropped` event types | HIGH | Low |
| Add `event_date` column for idempotency deduplication | HIGH | Medium |
| Add `schema_version` column on events | MEDIUM | Low |
| Add metadata size CHECK constraint | MEDIUM | Low |
| Add GIN indexes on JSONB query paths | MEDIUM | Medium |
| Add `deletion_log` table | HIGH | Low |
| Add `retention_expires_at` to journeys | MEDIUM | Low |
| Add `consent_withdrawn_at` to patients | HIGH | Low |
| Normalize phone to E.164 in application layer | HIGH | Low |
| Add `cron_runs` tracking table | MEDIUM | Low |

**Total: 16 changes. 4 critical, 7 high, 5 medium. Zero low priority -- this is health-adjacent data.**
