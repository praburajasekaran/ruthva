# Simplification Analysis: Ruthva V1 Plan

**Reviewed:** 2026-03-02
**Reviewer:** Code Simplicity Review (YAGNI / Minimalism)
**Document:** `docs/plans/2026-03-01-feat-ruthva-v1-treatment-continuity-platform-plan.md`

---

## Core Purpose

Detect patients dropping off Ayurveda treatments and bring them back via WhatsApp. One loop: patient added, monitored, risk detected, recovery message sent, patient returns.

---

## 1. Event Sourcing Is Over-Engineered for V1

**Severity: HIGH -- Biggest risk to shipping**

The plan calls for an "event-sourced core" with a single `events` table where "all state derived from events." This is a significant architectural choice that adds complexity at every layer:

- Every query must aggregate/scan events to derive current state (risk level, visit status, journey progress)
- The nightly cron must read and interpret event streams for every active journey
- The dashboard must compute stats by traversing event histories
- Debugging requires mentally replaying event sequences
- 9 canonical event types with JSONB metadata -- each needing parsing logic

**What to do instead:**

Add status fields directly to the `journeys` and `patients` tables:

```
journeys:
  + risk_level        (stable|watch|at_risk|critical)
  + risk_reason       (text)
  + last_visit_date   (date)
  + next_visit_date   (date)
  + missed_visits     (int)
  + recovery_attempts (int)
  + last_message_date (date)
  + last_response_date (date)
```

Keep a simplified `activity_log` table for the patient timeline display (event_type, timestamp, note). This is an append-only log for display purposes, NOT a source of truth.

**Impact:** Eliminates event aggregation queries, makes dashboard queries trivial SELECTs, simplifies cron to direct field updates, removes the entire "event engine" abstraction layer.

**Estimated complexity reduction:** 30-40% of total codebase.

---

## 2. The 4-Table Schema Should Be 3 Tables (Plus Activity Log)

**Severity: MEDIUM**

The `events` table is doing double duty: (a) source of truth for all state, and (b) timeline display. Split the concern:

- `clinics` -- keep as-is
- `patients` -- keep as-is
- `journeys` -- add status fields (see above), remove dependency on event aggregation
- `activity_log` -- simple append-only table (journey_id, type, message, created_at). No JSONB. No metadata parsing. Just display strings.

This is still 4 tables, but the `activity_log` is trivially simple compared to the current `events` table that drives all business logic.

**Fields to question on `clinics`:**
- `practice_type` with default "ayurveda" -- YAGNI. V1 is Ayurveda-only. Remove the field. Add it when you actually support Siddha.
- `timezone` with default "Asia/Kolkata" -- YAGNI. V1 targets Indian clinics only. Hardcode the timezone. Add the field when you expand geographically.

**Fields to question on `journeys`:**
- `created_by` (String) -- who created the journey. In V1 there is one user per clinic. This field has no consumer. Remove it.

---

## 3. Nine Event Types Is Too Many Abstractions for V1

**Severity: MEDIUM**

The plan defines 9 canonical event types with typed helpers, JSONB metadata schemas, and index strategies for each. With the status-field approach above, most of these become simple field updates:

| Event Type | Replace With |
|---|---|
| `journey_started` | INSERT into journeys (it already exists) |
| `visit_expected` | `next_visit_date` field on journey |
| `visit_confirmed` | UPDATE `last_visit_date`, recompute `next_visit_date` |
| `visit_missed` | UPDATE `missed_visits += 1`, update `risk_level` |
| `adherence_check_sent` | UPDATE `last_message_date` |
| `adherence_response` | UPDATE `last_response_date` |
| `reminder_sent` | UPDATE `last_message_date` |
| `recovery_message_sent` | UPDATE `recovery_attempts += 1`, UPDATE `last_message_date` |
| `patient_returned` | UPDATE `risk_level = stable`, reset counters |

Each of these also appends a row to `activity_log` for the timeline display. But the activity_log is dead simple -- no business logic reads from it.

**Impact:** Eliminates the entire "Event Engine" concept, the type-safe event helpers, the event index strategy, and the "latest event wins" conflict resolution logic.

---

## 4. The Nightly Cron Can Start as an API Route

**Severity: MEDIUM**

The plan calls for a separate Railway service for the cron worker. For V1 with ~10 clinics and ~300 patients max:

- A single API route (`/api/cron/nightly`) triggered by Railway's cron job scheduler (or even a free service like cron-job.org) is sufficient
- No separate service to deploy, monitor, or pay for
- Same codebase, same database connection, same deployment

A separate cron service makes sense at scale. For 10 clinics, it is premature infrastructure.

**What to do instead:**
```
app/api/cron/nightly/route.ts
  - Protected by a secret token in the request header
  - Called by Railway cron or external cron service
  - Runs: update missed visits, recompute risk levels, trigger messages
  - For 100 journeys this completes in seconds
```

**Impact:** Removes an entire deployment unit, simplifies CI/CD, eliminates inter-service concerns.

---

## 5. The 5-Phase Plan Can Compress to 3 Phases

**Severity: MEDIUM**

Current phases:
1. Foundation (Week 1-2)
2. Event Engine + Dashboard (Week 2-3)
3. WhatsApp Automation (Week 3-4)
4. Risk Engine + Recovery (Week 4-5)
5. Onboarding Polish + Deploy (Week 5-6)

With the simplifications above (no event engine, no separate cron service), the plan compresses to:

**Phase 1: Core (Week 1-2.5)**
- Project setup, DB, auth, patient CRUD, journey creation
- Dashboard with stats (direct DB queries, no event aggregation)
- Visit confirmation UI

**Phase 2: WhatsApp + Risk (Week 2.5-4.5)**
- Gupshup integration (send + receive)
- Risk scoring logic (direct field reads/updates)
- Recovery message flow
- Cron API route for nightly processing

**Phase 3: Polish + Ship (Week 4.5-6)**
- Onboarding flow
- Deploy to Railway
- Real clinic testing

The "Event Engine" phase disappears entirely. Risk engine and WhatsApp merge because they are tightly coupled (risk triggers messages).

---

## 6. Design System Tokens Are Appropriately Scoped (Keep)

**Severity: LOW -- This is fine**

The CSS variables in `globals.css` are actually well-scoped:
- Brand colors (6 values)
- Risk level colors (4 values)
- Neutral scale (8 values)
- Typography (1 font, standard scale)
- Border radii (4 values)

This is not over-engineered. It is ~25 CSS custom properties in one file. The plan explicitly says "No component library" and uses raw Tailwind. The tokens ensure visual consistency without abstraction overhead.

**One small cut:** The typography scale variables (`--text-xs` through `--text-3xl`) duplicate Tailwind's built-in scale. Remove them and use Tailwind's `text-xs`, `text-sm`, etc. directly. Keep only the custom semantic colors.

---

## 7. The 5-Step Onboarding Is Too Elaborate for V1

**Severity: MEDIUM**

The plan describes a 5-step onboarding:
1. Identity (clinic name, doctor name, email)
2. Promise preview (pre-filled demo dashboard)
3. Add first patient
4. Message preview (show what patient will receive)
5. Outcome simulation (fast-forward risk detection)

Steps 2, 4, and 5 are demos/simulations. For the first 2-3 friendly clinics (who you are personally onboarding), this is wasted effort.

**What to do instead for V1:**
1. Clinic setup (name, doctor name) -- one screen after first login
2. Add first patient -- redirect to the Add Patient form

That is it. Two steps. You are personally onboarding these clinics. You can explain the value proposition in person or on a call. The demo dashboard, message preview, and outcome simulation are sales tools -- build them when you have 20+ inbound leads, not 2-3 friendly clinics.

---

## 8. Specific YAGNI Violations

### 8a. `practice_type` field on clinics
V1 is Ayurveda-only. This field exists for a future Siddha expansion (V2+). Remove it.

### 8b. `timezone` field on clinics
V1 targets India only. Hardcode "Asia/Kolkata". Add the field when you go international.

### 8c. Resend email as "fallback"
The architecture diagram labels Resend as "Email fallback." But email is only used for auth OTP. It is not a fallback for WhatsApp. The label is misleading and suggests a future email notification system. Simplify: Resend is for auth OTP, full stop.

### 8d. Delivery status callback parsing
The webhook handler is specified to "parse delivery status callbacks and update event metadata." For V1, you only need to handle incoming patient replies. Delivery status tracking (delivered, read, failed) is analytics -- useful but not essential for the core loop. Simplify: log delivery failures for retry logic, ignore read/delivered status.

### 8e. `created_by` field on events/journeys
With single-user clinics in V1, tracking who created what has no consumer. Remove the field. Add it when multi-user arrives in V2.

### 8f. Message retry logic (1 retry after 1 hour)
For V1, if a message fails to send, log it and move on. A delayed retry system requires a job queue or scheduled task infrastructure. The nightly cron will attempt the message again the next day anyway. Skip the 1-hour retry.

### 8g. Pull-to-refresh gesture
The plan specifies "pull-to-refresh on dashboard (native-feeling data refresh)." This requires a custom gesture handler or library. For V1, a simple refresh button or just let the page reload on navigation. The dashboard data changes once per day (nightly cron), not in real-time.

### 8h. Swipe-right on patient row for "Mark Visited"
Custom swipe gesture handling is non-trivial to build well on mobile web. Replace with a simple tap-to-expand or a visible button. The plan already has a "Visited" button concept.

### 8i. CSS page transitions (slide animations)
"CSS-only slide transitions between views" still require careful implementation for App Router navigation. For V1, standard page navigation is fine. Users will not notice the difference on a fast connection.

### 8j. Bottom sheet for confirmations
"Bottom sheet for confirmations (not modal dialogs)" requires either a library or custom implementation. For V1, use browser `confirm()` or a simple inline confirmation pattern.

---

## 9. Patterns That Could Be Simpler

### 9a. Risk scoring does not need a separate "engine"
The plan frames risk as a "Risk Engine (Deterministic Scoring)" with 4 levels and computed reasons. With status fields on journeys, this becomes a simple function:

```typescript
function computeRiskLevel(journey: Journey): RiskLevel {
  const daysSinceVisit = daysSince(journey.lastVisitDate, journey.nextVisitDate);
  const daysSinceResponse = daysSince(journey.lastResponseDate);

  if (daysSinceVisit >= 7 || daysSinceResponse >= 7) return 'critical';
  if (daysSinceVisit >= 3 || journey.missedCheckins >= 3) return 'at_risk';
  if (daysSinceVisit >= 1 || journey.missedCheckins >= 1) return 'watch';
  return 'stable';
}
```

No event scanning. No aggregation. One function, ~10 lines.

### 9b. Dashboard queries become trivial
Instead of aggregating events across journeys:
```sql
SELECT risk_level, COUNT(*) FROM journeys
WHERE clinic_id = ? AND status = 'active'
GROUP BY risk_level;
```

One query. No event traversal.

### 9c. Idempotency key with unique constraint on events
The plan adds `@@unique([journey_id, event_type, date])` for idempotent cron. With status fields, idempotency is natural -- updating a field to the same value is a no-op. No unique constraints needed.

---

## Summary Table

| Item | Severity | Action | LOC Impact |
|---|---|---|---|
| Event sourcing -> status fields | HIGH | Replace | -30-40% |
| Separate cron service -> API route | MEDIUM | Replace | -1 deployment unit |
| 5 phases -> 3 phases | MEDIUM | Compress | Schedule clarity |
| 9 event types -> field updates + activity log | MEDIUM | Replace | -20% of business logic |
| 5-step onboarding -> 2-step | MEDIUM | Simplify | -3 screens |
| `practice_type`, `timezone`, `created_by` fields | LOW | Remove | -3 fields |
| Message retry (1hr delay) | LOW | Remove | -1 scheduled job |
| Swipe gestures, pull-to-refresh, slide transitions, bottom sheets | LOW | Remove | -4 interaction patterns |
| Typography CSS variables | LOW | Remove | -8 variables |
| Delivery status parsing | LOW | Simplify | -1 webhook handler branch |
| Design system tokens | NONE | Keep | Already minimal |

---

## Final Assessment

**Total potential LOC reduction:** 35-45% of planned codebase
**Complexity score:** HIGH (currently) -> MEDIUM (after simplifications)
**Recommended action:** Proceed with simplifications

The plan demonstrates excellent product thinking -- the problem, ICP, positioning, and "DO NOT BUILD" list are sharp. The over-engineering is concentrated in the technical architecture, specifically the event-sourcing pattern. This is the single biggest risk to shipping: it multiplies the complexity of every feature (dashboard, risk scoring, cron, visit tracking) by requiring event aggregation instead of direct field reads.

The solo developer should replace event sourcing with direct status fields on the `journeys` table, keep a simple `activity_log` for the timeline display, merge the cron into an API route, compress to 3 phases, and strip the onboarding to 2 steps. The resulting system will be dramatically simpler to build, debug, and maintain -- and will ship the exact same product to the first 10 clinics.

**The test:** If someone asks "what is this patient's risk level?", the answer should be `SELECT risk_level FROM journeys WHERE id = ?` -- not "scan all events for this journey, find the latest visit_expected, check if there is a corresponding visit_confirmed within the grace period, count consecutive missed adherence checks, and apply the scoring matrix."
