# Admin Dashboard Brainstorm

**Date:** 2026-03-02
**Status:** Reviewed
**Feature:** Platform admin dashboard for Ruthva

---

## What We're Building

A platform admin dashboard accessible at `/admin/*` that gives the app owner (solo admin) full visibility and management capabilities across all doctors, clinics, patients, and journeys on the Ruthva platform.

### Core Capabilities

1. **Doctor Management** — View all signed-up doctors with full management (view, edit, deactivate/reactivate) and their associated clinic details
2. **Platform Analytics** — Comprehensive analytics including:
   - Platform totals (doctors, clinics, patients, active journeys)
   - Growth over time (signups, new patients, new journeys — days/weeks/months)
   - Risk & outcomes (risk level distribution, recovery rates, dropped patients)
   - Engagement metrics (messages sent, missed visits, response rates per clinic)
   - Failed message tracking
3. **CSV Export** — Export doctor list and analytics summary

### What We're NOT Building

- Separate clinic management (existing doctor onboarding flow is sufficient)
- Multi-admin role system (solo admin only)
- Subdomain-based admin (using `/admin/*` path routing)

---

## Why This Approach

**Integrated Route Group** — A new `/(admin)` route group within the existing Next.js app.

### Reasons

- **Simplest path**: Shares the existing NextAuth system, Prisma models, and design tokens
- **No new infrastructure**: Same deployment on Railway, same database
- **Consistent design**: Reuses the existing brand colors, surfaces, and UI patterns
- **Solo admin**: No need for the complexity of a separate app or third-party tool
- **Auth via env**: Simple `ADMIN_EMAIL` environment variable checked against session — no role system needed (aligns with V1 "Do Not Build roles/permissions" constraint)

### Rejected Alternatives

- **Separate Next.js app**: Overkill for solo admin, doubles hosting costs and maintenance
- **Third-party admin (Retool/AdminJS)**: Less control, doesn't match brand, external dependency

---

## Key Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Admin access model | Env-based email allowlist (`ADMIN_EMAIL`) | Solo admin, avoids building role system |
| URL structure | `/admin/*` path routing | Simplest, no DNS/infra changes needed |
| Layout | Responsive (desktop + mobile) | Desktop-first priority but usable on mobile |
| Charting library | Recharts | Lightweight, declarative React API, good defaults |
| Clinic management | Not needed | Existing onboarding flow is sufficient |
| Doctor management | View, edit, deactivate/reactivate | No hard delete — soft deactivation only, safer for solo admin |
| Navigation | Sidebar (desktop) / hamburger (mobile) | Separate layout from the doctor-facing bottom nav |
| Doctor deactivation | Soft delete everything | Block login, stop journeys, preserve all data for reactivation |
| Failed message tracking | New failure event types | Add `reminder_failed`, `recovery_message_failed`, etc. to EventType enum |
| Data export | Basic CSV exports | Export doctor list and analytics summary |
| Analytics time range | Last 30 days default | With option to change range |

---

## Admin Dashboard Pages

### 1. `/admin` — Analytics Overview
- **Stat cards**: Total doctors, clinics, patients, active journeys, messages sent
- **Growth charts** (Recharts): Signups over time, new patients over time, new journeys over time
- **Risk distribution**: Bar/pie chart of journey risk levels (stable/watch/at-risk/critical)
- **Outcomes**: Recovery rate, completion rate, drop-off rate
- **Engagement**: Messages sent vs failed, missed visit trends, per-clinic engagement
- **Failed messages**: Count and list of failed message deliveries

### 2. `/admin/doctors` — Doctor Management
- **Table/list**: All signed-up doctors with name, email, clinic name, signup date, patient count, journey stats
- **Search & filter**: By name, email, clinic name, signup date
- **Actions**: View details, edit, deactivate/reactivate
### 3. `/admin/doctors/[id]` — Doctor Detail
- Doctor profile (name, email, signup date, status)
- Associated clinic details (name, WhatsApp number, email)
- Stats summary (patient count, active/completed/dropped journeys, risk distribution)
- Activity timeline (recent events: patient additions, journey starts/completions, messages sent/failed)

---

## Technical Shape

### Auth
- `ADMIN_EMAIL` env variable (comma-separated if needed later)
- New `requireAdmin()` helper in `src/lib/session.ts` — checks session email against env
- Layout-level protection for all `/admin/*` routes (consistent with existing app — no middleware.ts)

### Routing
- New route group: `src/app/(admin)/admin/`
- Own layout with sidebar navigation (not the doctor-facing bottom nav)
- Pages: `page.tsx` (analytics), `doctors/page.tsx`, `doctors/[id]/page.tsx`

### API
- New routes under `src/app/api/admin/`
- Follow existing pattern: auth check → Zod validation → Prisma query → NextResponse.json
- Endpoints: `GET /api/admin/stats`, `GET /api/admin/doctors`, `PATCH/DELETE /api/admin/doctors/[id]`

### Analytics Data Sources
All data already exists in the current schema:
- **Totals**: COUNT queries on Clinic, Patient, Journey
- **Growth**: GROUP BY date on createdAt fields
- **Risk**: GROUP BY riskLevel on Journey
- **Outcomes**: Journey.status distribution, Event types
- **Engagement**: Event type counts (reminder_sent, recovery_message_sent, adherence_check_sent)
- **Failed messages**: New EventType values (`reminder_failed`, `recovery_message_failed`, `adherence_check_failed`) to be added to schema

### UI
- Reuse existing design tokens (brand colors, surfaces, text hierarchy, borders)
- Recharts for visualizations, matching brand color palette
- Lucide React icons throughout
- Hand-rolled components (no component library — consistent with existing app)
- Responsive: sidebar collapses to hamburger on mobile

---

## Schema Changes Required

### EventType Enum Additions
```
reminder_failed
recovery_message_failed
adherence_check_failed
```

### User Model Addition
- `deactivatedAt DateTime?` — null means active, set to timestamp when soft-deleted by admin

---

## Next Steps

- Proceed to `/workflows:plan` for implementation planning
- User to provide admin dashboard logo
