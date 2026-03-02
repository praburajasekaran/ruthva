# Admin Dashboard Feature -- Comprehensive User Flow Analysis

**Date:** 2026-03-02
**Status:** Review
**Scope:** Admin dashboard spec from `docs/brainstorms/2026-03-02-admin-dashboard-brainstorm.md`
**Methodology:** Examined spec against existing codebase (Prisma schema, auth system, session helpers, API patterns, cron jobs, WhatsApp integration, existing flow analysis in `docs/11-flow-analysis-gaps.md`)

---

## 1. User Flow Overview

### Flow A: Admin Authentication

```
Admin opens /admin/*
  -> Layout calls requireAdmin()
  -> requireAdmin() calls auth() to get session
  -> If no session -> redirect to /login
  -> If session exists -> check session.user.email against ADMIN_EMAIL env var
  -> If match -> render admin layout + page
  -> If no match -> ??? (redirect where? 403? /login?)
```

### Flow B: Analytics Overview (/admin)

```
Admin lands on /admin
  -> Page calls GET /api/admin/stats?range=30d
  -> API returns: totals, growth arrays, risk distribution, outcomes, engagement, failed messages
  -> Page renders stat cards, Recharts charts, failed message list
  -> Admin changes date range -> re-fetches stats with new range
```

### Flow C: Doctor List (/admin/doctors)

```
Admin navigates to /admin/doctors
  -> Page calls GET /api/admin/doctors?search=&filter=&page=1
  -> API returns paginated doctor list with stats
  -> Admin searches by name/email/clinic -> filtered results
  -> Admin clicks doctor row -> navigates to /admin/doctors/[id]
  -> Admin clicks "Deactivate" on a doctor -> confirmation dialog -> PATCH /api/admin/doctors/[id] {action: "deactivate"}
  -> Admin clicks "Reactivate" on a deactivated doctor -> PATCH /api/admin/doctors/[id] {action: "reactivate"}
```

### Flow D: Doctor Detail (/admin/doctors/[id])

```
Admin navigates to /admin/doctors/[id]
  -> Page calls GET /api/admin/doctors/[id]
  -> Renders: profile, clinic details, stats, activity timeline
  -> Admin clicks "Edit" -> inline edit or modal -> PATCH /api/admin/doctors/[id] with field updates
  -> Admin clicks "Deactivate" -> same as Flow C deactivation
```

### Flow E: CSV Export

```
Admin clicks "Export" button on /admin or /admin/doctors
  -> Client-side: fetch data from API, format as CSV, trigger download
  -> OR: GET /api/admin/export/doctors (returns CSV directly)
  -> Browser downloads CSV file
```

### Flow F: Doctor Deactivation Lifecycle

```
Deactivation:
  -> Admin clicks "Deactivate" on doctor
  -> Confirmation dialog with impact summary (X active journeys will be stopped, Y patients affected)
  -> Admin confirms
  -> API: Set user.deactivatedAt = now()
  -> API: Set all doctor's active journeys to status = "dropped"
  -> API: ??? Stop pending cron messages for those journeys
  -> Doctor tries to log in -> ??? (how is login blocked?)

Reactivation:
  -> Admin clicks "Reactivate" on deactivated doctor
  -> API: Set user.deactivatedAt = null
  -> API: ??? What happens to previously-dropped journeys?
  -> Doctor can log in again -> sees what state?
```

---

## 2. Flow Permutations Matrix

| Dimension | Variation | Affected Flows | Specified? |
|-----------|-----------|----------------|------------|
| **Admin identity** | Admin email matches ADMIN_EMAIL | A | Yes |
| **Admin identity** | Admin email does NOT match | A | Partially -- redirect target unclear |
| **Admin identity** | Admin is also a doctor with a clinic | A, C, D | NO |
| **Admin identity** | ADMIN_EMAIL env var is missing/empty | A | NO |
| **Admin identity** | ADMIN_EMAIL has multiple emails (comma-separated) | A | Mentioned but parsing logic unspecified |
| **Session state** | Valid session, admin email | A | Yes |
| **Session state** | Valid session, non-admin email | A | NO -- what response? |
| **Session state** | Expired session | A | Partial -- redirects to /login via getSession |
| **Session state** | Session exists but user.deactivatedAt is set | A | NO -- can a deactivated user who is also admin still access? |
| **Doctor state** | Active doctor with clinic | C, D | Yes |
| **Doctor state** | Active doctor without clinic (mid-onboarding) | C, D | NO |
| **Doctor state** | Deactivated doctor | C, D | Partial |
| **Doctor state** | Doctor with 0 patients | C, D | Not explicitly handled |
| **Doctor state** | Doctor with 100+ patients and active journeys | C, D, F | Performance implications unspecified |
| **Analytics range** | Last 30 days (default) | B | Yes |
| **Analytics range** | Last 7 days / 90 days / custom | B | "Option to change" but no specifics |
| **Analytics range** | Range with zero data (new platform) | B | NO -- empty state UX |
| **Analytics range** | Range spanning before platform existed | B | NO |
| **Export** | Doctor list CSV | E | Minimal spec |
| **Export** | Analytics summary CSV | E | Minimal spec |
| **Export** | Large export (1000+ doctors) | E | NO |
| **Device** | Desktop | All | Yes (primary) |
| **Device** | Mobile | All | Yes (responsive) |
| **Device** | Tablet | All | Implicitly via responsive |
| **Concurrent admin** | Two browser tabs open | All | NO -- but solo admin so low risk |

---

## 3. Missing Elements & Gaps

### 3.1 Authentication & Authorization Gaps

| # | Gap | Impact | Severity |
|---|-----|--------|----------|
| AUTH-1 | **requireAdmin() rejection behavior undefined.** If a logged-in non-admin user navigates to /admin, where are they redirected? A 403 page? Back to /login? Back to /dashboard? The spec says "layout-level auth protection" but not what happens on failure. | Non-admin doctors could see a confusing error or blank page. | Important |
| AUTH-2 | **ADMIN_EMAIL env var parsing not specified.** The spec mentions "comma-separated if needed later." Is it a single string comparison or does it split on commas? Is whitespace trimmed? Is comparison case-insensitive? | Could fail silently if admin email has trailing whitespace or different casing. | Important |
| AUTH-3 | **Admin who is also a doctor.** If the ADMIN_EMAIL belongs to someone who also onboarded as a doctor with a clinic, the existing `(app)` layout calls `requireClinic()` which would also pass. Can the admin access both /admin and /dashboard? Is navigation provided between them? | Admin might get stuck in doctor flow or not know admin exists. | Important |
| AUTH-4 | **Deactivated admin scenario.** If the admin user gets the `deactivatedAt` field set (e.g., accidentally or via API bug), can they still access admin? The `requireAdmin()` helper checks email against env var, but `getSession()` does not check `deactivatedAt`. | Admin could lock themselves out if deactivation is applied to their account. | Critical |
| AUTH-5 | **No session invalidation on deactivation.** When a doctor is deactivated, the spec says "block login" but existing sessions are database-backed (`Session` model). Deactivation sets `user.deactivatedAt` but does not delete active sessions. The doctor could continue using the app until their session expires naturally. | Deactivated doctor retains access for the remaining session lifetime (could be hours or days depending on NextAuth config). | Critical |
| AUTH-6 | **No login-time check for deactivatedAt.** The current auth flow (`auth.ts`) has no callback that checks `deactivatedAt`. Even after session expiry, a deactivated doctor could request a new OTP and log in again because no check prevents it. | Deactivation is ineffective at blocking login. The only protection would be if `requireClinic()` or `requireAdmin()` also checks `deactivatedAt`, which is not specified. | Critical |
| AUTH-7 | **Layout-level vs. API-level auth.** The spec says "layout-level protection" but admin API routes (`/api/admin/*`) also need independent auth checks. If someone discovers an API endpoint URL, layout protection does nothing -- they can call the API directly. The spec mentions following the existing pattern (auth check in each API route) but does not explicitly state requireAdmin in each API handler. | API endpoints could be called by any authenticated user, not just admin. | Critical |

### 3.2 Doctor Management Gaps

| # | Gap | Impact | Severity |
|---|-----|--------|----------|
| DOC-1 | **"Edit" scope undefined.** The spec says admin can "edit" a doctor but does not specify which fields. Can admin change the doctor's name? Email? Clinic name? WhatsApp number? Changing email has auth implications. Changing WhatsApp number affects all message routing. | Developers will guess at editable fields, potentially exposing dangerous mutations (email change = account takeover). | Critical |
| DOC-2 | **Deactivation impact on active journeys incompletely specified.** The spec says "stop active journeys" but does not define the mechanism. Options: (a) set all active journeys to `dropped`, (b) set a clinic-level flag that cron jobs check, (c) filter by `user.deactivatedAt` in cron queries. Each has different implications for data integrity and reactivation. | If journeys are set to `dropped`, reactivation cannot "reverse" this -- dropped is a terminal state in the current schema. The spec says "reactivation reverses this" but that is impossible if journeys were dropped. | Critical |
| DOC-3 | **Reactivation data restoration undefined.** The spec says "reactivation reverses [deactivation]" but: What happens to journeys that were stopped? Are they resumed? What about missed visits during the deactivation period? Do patients get a backlog of messages? Is a new journey started? | Reactivation without clear rules could lead to patients receiving confusing messages about visits that passed during deactivation. | Critical |
| DOC-4 | **Deactivation confirmation UX undefined.** What information does the admin see before confirming deactivation? Number of affected patients? Active journeys? Is there a "type doctor name to confirm" safeguard? | Accidental deactivation of a doctor with 50 active patients could be devastating. No undo is specified. | Important |
| DOC-5 | **Pagination not specified for doctor list.** If there are 500 doctors, does the list paginate? What page size? How does search interact with pagination? | Performance degradation with scale. Loading 500 doctors with their stats in one query will be slow. | Important |
| DOC-6 | **Doctor list sort order undefined.** What is the default sort? By signup date? Name? Patient count? Can admin change sort order? | Inconsistent developer interpretation. | Nice-to-have |
| DOC-7 | **Bulk actions not considered.** Can admin deactivate multiple doctors at once? Export filtered subset? | Solo admin might need to handle batch operations as platform grows. | Nice-to-have |
| DOC-8 | **Doctor without a clinic.** A user who signed up but never completed onboarding has no Clinic record. They appear in the User table but have no clinic association. Should they appear in the admin doctor list? Can they be "deactivated"? | Admin might see partial registrations and not understand why a doctor has no clinic/patients. | Important |

### 3.3 Analytics Gaps

| # | Gap | Impact | Severity |
|---|-----|--------|----------|
| ANA-1 | **Date range options not specified.** "Default 30-day range with option to change" -- what options? Preset buttons (7d, 30d, 90d, 1y)? Custom date picker? Both? | Developer must guess UX. | Important |
| ANA-2 | **Empty state for new platform.** When the platform has zero doctors, zero patients, zero journeys -- what does the admin dashboard show? "No data yet" message? Or zeros everywhere with empty charts? | First-time admin experience could be confusing if all charts are blank with no guidance. | Important |
| ANA-3 | **"Failed messages" tracking depends on schema changes.** The spec requires new EventType enum values (`reminder_failed`, `recovery_message_failed`, `adherence_check_failed`) but the current `whatsapp.ts` does NOT create failure events. When `sendTemplate()` returns `{status: "error"}`, the code still creates a success event (e.g., `adherence_check_sent`) with `status: "error"` in metadata. There is no separate failure event. | The admin dashboard cannot query for failed messages by EventType because no failure events exist. Must either: (a) change whatsapp.ts to create failure events, or (b) query by metadata status field instead. The spec assumes (a) but the code pattern supports (b). | Critical |
| ANA-4 | **Analytics query performance not addressed.** Aggregating across all clinics, patients, journeys, and events for growth charts requires cross-table queries. With 500 doctors, 5000 patients, and 50000 events, these queries could be slow. No caching, materialized views, or pre-aggregation strategy is mentioned. | Admin dashboard could be unusably slow at moderate scale. | Important |
| ANA-5 | **"Engagement metrics per clinic" scope unclear.** The spec lists "response rates per clinic" as an analytics metric. This requires correlating adherence_check_sent events with adherence_response events per clinic. The current Event model does not have a direct clinicId -- it only has journeyId. Resolving clinic requires joining through Journey. | Complex query with potential N+1 or large joins. Also unclear: is this a table showing every clinic? A top-10 chart? A filterable view? | Important |
| ANA-6 | **Growth chart granularity undefined.** "Days/weeks/months" is mentioned but how does the admin switch between them? Is it automatic based on date range (e.g., 7-day range shows daily, 90-day shows weekly, 1-year shows monthly)? Or explicit toggle? | Inconsistent implementation. | Nice-to-have |
| ANA-7 | **"Outcomes" metrics need precise definitions.** Recovery rate, completion rate, drop-off rate -- what are the exact formulas? Recovery rate = patients who returned / patients who reached at_risk? Completion rate = journeys with status=completed / total journeys? Over what time period? Are these rates computed over the selected date range or all-time? | Different interpretations yield very different numbers. | Important |
| ANA-8 | **Real-time vs. cached data not specified.** Does the admin dashboard show live data or is there a cache/refresh interval? If live, every page load runs expensive aggregation queries. | User expectations vs. performance trade-off. | Nice-to-have |

### 3.4 CSV Export Gaps

| # | Gap | Impact | Severity |
|---|-----|--------|----------|
| CSV-1 | **Export format undefined.** What columns are included in the doctor list CSV? What fields in the analytics summary CSV? What date format? What encoding (UTF-8 with BOM for Excel compatibility)? | Developer guesses at columns. Could miss important fields or include sensitive ones. | Important |
| CSV-2 | **Patient PII in exports.** Does the analytics export include patient-level data? Phone numbers? Names? If so, the CSV becomes a PII liability. If the admin downloads it and emails it, DPDP Act violations occur. | Data leak risk through exports. | Critical |
| CSV-3 | **Export trigger mechanism undefined.** Client-side generation (fetch JSON, convert to CSV in browser) vs. server-side (API returns CSV stream). For large datasets, client-side will be slow and memory-intensive. | Browser tab crash with large exports. | Important |
| CSV-4 | **No export audit trail.** When admin exports data, is this logged? For DPDP compliance, data exports should be tracked. | Compliance gap. | Important |
| CSV-5 | **Filtered vs. full export.** If admin has search filters applied on the doctor list, does export include only filtered results or all doctors? | Admin expectation mismatch. | Nice-to-have |

### 3.5 Security Gaps

| # | Gap | Impact | Severity |
|---|-----|--------|----------|
| SEC-1 | **No rate limiting on admin API routes.** Admin API endpoints (stats, doctors, export) have no rate limiting mentioned. A compromised admin session could exfiltrate all platform data rapidly. | Data exfiltration risk. | Important |
| SEC-2 | **Admin actions not audited.** Deactivation, reactivation, edits -- none create an audit event. If something goes wrong, there is no trail of who did what and when. | Accountability gap. Solo admin today, but "if needed later" suggests multi-admin future. | Important |
| SEC-3 | **CSRF protection for state-changing admin endpoints.** PATCH and DELETE endpoints for doctor management need CSRF protection. NextAuth provides CSRF tokens for auth flows but not for custom API routes. | State-changing operations could be triggered by malicious third-party sites if admin is authenticated. | Important |
| SEC-4 | **Admin session does not have elevated timeout.** Admin session uses the same database session strategy as doctor sessions. If doctor sessions are long-lived (for PWA convenience), admin sessions are equally long-lived. Admin should arguably have shorter session timeouts given elevated access. | Extended window of opportunity if admin device is compromised. | Nice-to-have |
| SEC-5 | **No admin-specific activity logging.** Unlike doctor sessions scoped to their own clinic data, admin has cross-tenant access. No logging of which doctor profiles were viewed, what data was exported, or when admin accessed the system. | Cannot detect unauthorized admin activity or compromised admin account. | Important |

### 3.6 UI/UX Gaps

| # | Gap | Impact | Severity |
|---|-----|--------|----------|
| UX-1 | **Navigation between admin and doctor app.** If admin is also a doctor, how do they switch between /admin and /dashboard? Is there a link in the admin sidebar? Does the admin layout show a "Switch to Doctor View" button? | Admin who is also a doctor has no way to navigate between the two interfaces. | Important |
| UX-2 | **Admin sidebar navigation items not specified.** The spec mentions "sidebar navigation" but does not list the items. Presumably: Analytics, Doctors. Are there other items? Settings? Logout? | Developer must guess navigation structure. | Important |
| UX-3 | **Activity timeline on doctor detail page -- data source and limits.** The timeline shows "recent events: patient additions, journey starts/completions, messages sent/failed." How many events? All events across all patients? Paginated? This could be thousands of events for an active doctor. | Performance and UX issues with unbounded event lists. | Important |
| UX-4 | **Loading states not specified.** Charts and stats require potentially slow API calls. What does the admin see while data loads? Skeleton screens? Spinners? | Jarring UX if charts pop in one by one. | Nice-to-have |
| UX-5 | **Error states for admin pages.** What happens if the stats API returns a 500? If a doctor ID is invalid? If the database is temporarily unreachable? | Unhandled errors could show raw error pages or blank screens. | Important |
| UX-6 | **Mobile sidebar behavior details.** "Hamburger on mobile" -- does it overlay content? Push content? Is there a backdrop? Does it close on navigation? | Inconsistent mobile implementation. | Nice-to-have |

---

## 4. Critical Questions Requiring Clarification

### CRITICAL (Blocks Implementation or Creates Security/Data Risks)

**Q1. How does deactivation actually block login?**
The current auth system (`auth.ts`) uses NextAuth with Resend email provider. There is no callback that checks `user.deactivatedAt`. The `session` callback only copies `user.id` to the session. Without a check in either the `signIn` callback or the `session` callback (or a new `authorize` check), a deactivated doctor can still request an OTP and log in.
- *Proposed solution*: Add a `signIn` callback that queries `user.deactivatedAt` and returns `false` if set. Also add a check in `getSession()` (or a new `requireActiveUser()` wrapper) that redirects deactivated users to a "/deactivated" page.
- *Also needed*: On deactivation, delete all active sessions for that user from the `Session` table to immediately revoke access.

**Q2. What happens to active journeys on deactivation, and can reactivation restore them?**
The current schema has `JourneyStatus: active | completed | dropped`. If deactivation sets journeys to `dropped`, that is a terminal state -- there is no `paused` or `suspended` status. Reactivation cannot "reverse" a drop. The spec explicitly says "reactivation reverses this" which contradicts the schema.
- *Option A*: Add a `suspended` journey status. Deactivation sets journeys to `suspended`. Reactivation sets them back to `active`. Cron jobs already filter by `status: "active"` so suspended journeys are automatically excluded.
- *Option B*: Do not change journey status. Instead, have cron jobs check `user.deactivatedAt` (via clinic -> user join). Journeys stay `active` in the database but no messages are sent. Reactivation is automatic.
- *Impact if unanswered*: Developers will pick an approach. If they pick "drop all journeys," reactivation becomes data-destructive.

**Q3. Which doctor fields can the admin edit?**
The spec says admin can "edit" a doctor but does not list editable fields. The User model has `name`, `email`, `image`. The Clinic model has `name`, `doctorName`, `whatsappNumber`, `email`. Some changes are benign (doctorName). Others are dangerous (email = changes login identity, whatsappNumber = changes message routing for all patients).
- *Proposed approach*: Allow editing of `Clinic.name`, `Clinic.doctorName`, `Clinic.email`. Do NOT allow editing `User.email` or `Clinic.whatsappNumber` from admin. Those require the doctor's own flow.

**Q4. How should admin API routes enforce authorization independently of the layout?**
The spec says "layout-level protection" but API routes like `GET /api/admin/doctors` can be called directly by any authenticated user. Each admin API route needs its own `requireAdmin()` check.
- *Proposed pattern*: Create a `requireAdmin()` helper that calls `auth()`, checks session email against `ADMIN_EMAIL`, and returns a 403 response if not admin. Use this at the top of every admin API route handler, identical to how existing routes use `auth()` + clinic check.

**Q5. How should failed messages be tracked -- new event types or metadata?**
The spec says to add `reminder_failed`, `recovery_message_failed`, `adherence_check_failed` to the EventType enum. But the current code in `whatsapp.ts` always creates a `*_sent` event regardless of success/failure, storing the status in metadata. This means:
- Option A (spec approach): Create a separate failure event AND the sent event. Two events per failed message.
- Option B (current code pattern): Keep single event, query by metadata `status: "error"`.
- Option C (hybrid): On success, create `*_sent`. On failure, create `*_failed` instead. No sent event for failures.
- *Impact*: The analytics dashboard query for "failed messages" depends entirely on which option is chosen. The unique constraint `@@unique([journeyId, eventType, eventDate])` also complicates Option A since you cannot have both a `_sent` and `_failed` event of the same type on the same day.

### IMPORTANT (Significantly Affects UX or Maintainability)

**Q6. What redirect/response does a non-admin authenticated user get when accessing /admin?**
A doctor who types `/admin` in the URL bar should not see the admin dashboard. But they ARE authenticated. `getSession()` will pass. Only the admin email check fails. Where do they go?
- *Proposed approach*: Redirect to `/dashboard` (the doctor app) with no error message. The admin URL simply does not exist for non-admin users.

**Q7. What are the exact date range options for analytics?**
- *Proposed approach*: Preset buttons: 7 days, 30 days (default), 90 days, 1 year, All time. No custom date picker in V1.

**Q8. What columns are included in each CSV export?**
Doctor list CSV needs defined columns. Analytics summary CSV needs defined metrics.
- *Proposed for doctor list*: Doctor Name, Email, Clinic Name, WhatsApp Number (masked: +91****1234), Signup Date, Status (Active/Deactivated), Patient Count, Active Journeys, Completed Journeys.
- *Proposed for analytics*: Date Range, Total Doctors, Total Patients, Total Journeys, Messages Sent, Messages Failed, Recovery Rate, Completion Rate.

**Q9. Should doctors without clinics (incomplete onboarding) appear in the admin doctor list?**
Users who signed up but never completed onboarding exist in the `User` table but have no `Clinic` record.
- *Proposed approach*: Show them in a separate "Incomplete Signups" section or with a "No Clinic" badge. Do not allow deactivation (nothing to deactivate since they have no patients/journeys).

**Q10. What are the precise formulas for outcome metrics?**
- *Recovery rate*: Journeys that reached `at_risk` or `critical` AND later had a `patient_returned` event / Total journeys that reached `at_risk` or `critical`. Time-bounded by selected date range.
- *Completion rate*: Journeys with `status = completed` / Total journeys created in date range.
- *Drop-off rate*: Journeys with `status = dropped` / Total journeys created in date range.

### NICE-TO-HAVE (Improves Clarity but Has Reasonable Defaults)

**Q11. Should admin actions create audit events?**
- *Proposed default*: Yes. Add `admin_deactivated_doctor`, `admin_reactivated_doctor`, `admin_edited_doctor` as event-like records. Could be a simple `AdminAuditLog` table or additional EventType values.

**Q12. Should the admin dashboard auto-refresh?**
- *Proposed default*: No auto-refresh. Manual refresh via browser reload or a "Refresh" button. Stale data is acceptable for a monitoring dashboard.

**Q13. Should CSV exports be logged for compliance?**
- *Proposed default*: Yes, log export actions in the audit trail with timestamp and admin email.

---

## 5. Schema Change Review

The spec proposes two schema changes. Analysis of each:

### 5.1 EventType Enum Additions

```
reminder_failed
recovery_message_failed
adherence_check_failed
```

**Issue**: See Q5 above. The current code pattern stores success/failure in metadata, not as separate event types. The unique constraint `@@unique([journeyId, eventType, eventDate])` means you cannot have both `adherence_check_sent` and `adherence_check_failed` for the same journey on the same day -- but you CAN have one of each since they are different eventType values. However, if a message fails and is retried later the same day and succeeds, you would have both `_sent` and `_failed` which is confusing.

**Recommendation**: Use Option C from Q5 -- create `_failed` INSTEAD of `_sent` on failure. If retried and succeeds later, the `_failed` event exists alongside a new `_sent` event (different eventType, same date, same journey -- allowed by the unique constraint). Update `whatsapp.ts` to use the appropriate event type based on outcome.

### 5.2 User Model Addition

```prisma
deactivatedAt DateTime?
```

**Issue**: This field alone is insufficient. The following additional changes are needed:

1. **Auth callbacks must check this field** -- otherwise deactivation has no effect on login (see Q1).
2. **Session cleanup on deactivation** -- delete from `Session` table where `userId` matches.
3. **Cron job filtering** -- either (a) cron jobs must join through `Journey -> Clinic -> User` and check `deactivatedAt IS NULL`, or (b) a `suspended` journey status is added (see Q2).
4. **Index on deactivatedAt** -- if cron jobs filter by this field, it needs to be indexed for performance.

**Recommendation**: Add `deactivatedAt DateTime?` to User model. Also add `@@index([email])` if not already present (for admin email lookup). Consider adding `JourneyStatus.suspended` if Option A from Q2 is chosen.

---

## 6. Interaction with Existing Codebase Patterns

### 6.1 Existing Auth Pattern (session.ts)

The current helpers are: `getSession()` (checks auth, redirects to /login), `getClinic()` (gets session + clinic), `requireClinic()` (redirects to /onboarding if no clinic).

The admin needs: `requireAdmin()` which checks session email against env var. This is a NEW helper that does NOT check for a clinic (admin may or may not have one).

**Proposed implementation path**:
```
requireAdmin():
  1. Call auth() -- get session
  2. If no session -> redirect /login
  3. If session.user.email not in ADMIN_EMAILS -> redirect /dashboard
  4. Return session (typed with admin guarantee)
```

### 6.2 Existing API Pattern (patients/route.ts)

API routes follow: `auth() -> clinic lookup -> Zod validation -> Prisma query -> NextResponse.json`.

Admin API routes should follow: `auth() -> admin email check -> Zod validation (for inputs) -> Prisma query -> NextResponse.json`.

**Key difference**: Admin routes do NOT use `scopedDb()` or clinic-based filtering. They query across ALL clinics. This is by design but must be explicit to avoid accidental use of scoped helpers.

### 6.3 Existing Cron Pattern (send-reminders.ts, trigger-recovery-messages.ts)

Cron jobs query `journey.findMany({ where: { status: "active" } })`. They do NOT check `user.deactivatedAt`. If a doctor is deactivated but journeys remain `active`, cron jobs will STILL send messages to that doctor's patients.

**This is a critical gap that must be resolved** regardless of which deactivation strategy (Q2) is chosen.

### 6.4 Event Unique Constraint

`@@unique([journeyId, eventType, eventDate])` means only ONE event of each type per journey per day. This affects:
- Failed message tracking: Cannot have `adherence_check_sent` AND `adherence_check_failed` if they are the same event type (but they are different types, so this is fine).
- Retry scenarios: If a message fails at 7:30 AM and is retried at 8:00 AM, the event upsert will UPDATE the first event rather than creating a second. This is the intended idempotency behavior.

---

## 7. Recommended Next Steps (Prioritized)

### Before Implementation Begins

1. **Decide deactivation strategy** (Q2) -- Option A (suspended status) vs. Option B (cron filtering). This affects schema, cron jobs, and reactivation logic. Everything else depends on this decision.

2. **Define editable fields** (Q3) -- List exactly which fields admin can change. This scopes the API endpoint and form.

3. **Decide failed message tracking pattern** (Q5) -- New event types vs. metadata query. This affects schema migration and analytics queries.

4. **Specify requireAdmin() rejection behavior** (Q6) -- Where non-admin users go. Quick decision, but blocks layout implementation.

### During Implementation

5. **Add signIn callback for deactivatedAt check** -- Essential for deactivation to actually work. Without this, the entire deactivation feature is broken.

6. **Add requireAdmin() check to EVERY admin API route** -- Not just layout. Every `GET /api/admin/*`, `PATCH /api/admin/*` needs independent auth.

7. **Update cron jobs to exclude deactivated doctors** -- Regardless of strategy choice, messages must stop when a doctor is deactivated.

8. **Define CSV column lists** -- Before building export, agree on exact columns and any PII masking.

### Before Production

9. **Add admin audit logging** -- At minimum, log deactivation/reactivation actions with timestamps.

10. **Test reactivation end-to-end** -- The most complex flow. Deactivate a doctor with active patients, verify messages stop, reactivate, verify correct resumption.

11. **Load test analytics queries** -- Run aggregation queries against realistic data volumes to identify slow queries before users hit them.

---

## Appendix: Files Examined

| File | Purpose | Relevance |
|------|---------|-----------|
| `prisma/schema.prisma` | Database schema | User model (no deactivatedAt yet), Journey statuses, Event types, unique constraints |
| `src/lib/auth.ts` | NextAuth config | No signIn callback checking deactivation, session callback only copies user.id |
| `src/lib/session.ts` | Session helpers | getSession, getClinic, requireClinic -- no requireAdmin exists |
| `src/lib/scoped-db.ts` | Tenant isolation | Admin routes must NOT use this (need cross-tenant access) |
| `src/lib/events.ts` | Event creation | createEvent uses upsert with unique constraint; no failure event types |
| `src/lib/whatsapp.ts` | Message sending | Always creates _sent events regardless of success/failure |
| `src/lib/validations.ts` | Zod schemas | No admin-specific validations exist yet |
| `src/app/(app)/layout.tsx` | App layout | Uses requireClinic(); admin layout will use requireAdmin() |
| `src/app/(auth)/login/page.tsx` | Login page | Shared between admin and doctor; no admin-specific flow |
| `src/app/api/patients/route.ts` | API pattern reference | Shows existing auth + clinic + validation + response pattern |
| `src/lib/cron/send-reminders.ts` | Cron reference | Queries active journeys; does NOT check user.deactivatedAt |
| `src/lib/cron/trigger-recovery-messages.ts` | Cron reference | Same pattern; no deactivation check |
| `docs/11-flow-analysis-gaps.md` | Existing gap analysis | Covers V1 flows; admin dashboard is net-new territory |
| `docs/security-audit-2026-03-02.md` | Security findings | Relevant: OTP brute force, multi-tenant isolation, PII handling |
| `docs/brainstorms/2026-03-02-admin-dashboard-brainstorm.md` | The spec being analyzed | Source document for this review |
