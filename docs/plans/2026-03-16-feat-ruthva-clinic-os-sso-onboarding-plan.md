---
title: "feat: Ruthva as entry point to Clinic OS with SSO handoff"
type: feat
date: 2026-03-16
---

# feat: Ruthva as Entry Point to Clinic OS with SSO Handoff

## Overview

Ruthva becomes the single authentication gateway for clinic-os. Doctors sign up at ruthva.com, verify their email with a 6-digit code, complete a minimal 4-field onboarding (doctor name, clinic name, mobile, practice type), and are seamlessly redirected into the clinic-os dashboard via a one-time SSO token. Returning users skip onboarding and go straight to clinic-os. Clinic-os drops its own auth entirely.

Additionally, admins can manually provision clinics via Django admin (existing Django admin already supports this — no custom admin action needed).

Users can manage their account (plan, usage, export, close) at ruthva.com/account, accessible from clinic-os settings via a "Manage Account" link.

## Problem Statement / Motivation

Today, ruthva and clinic-os are two separate apps with separate auth systems. Doctors must sign up and log in separately to each. The current ruthva onboarding is a 5-step wizard that forces adding a first patient and watching a simulation before reaching the dashboard — too much friction.

The goal is: **one signup, one login, one product experience.** Ruthva handles identity; clinic-os handles the clinic workflow.

## Proposed Solution

### Architecture

```
ruthva.com (Next.js)                     app.ruthva.com (clinic-os)
┌─────────────────────┐                  ┌─────────────────────────┐
│                     │                  │                         │
│  /login             │                  │                         │
│  Email + 6-digit    │                  │                         │
│  code (NextAuth)    │                  │                         │
│       ↓             │                  │                         │
│  /verify            │                  │                         │
│  Code entry         │                  │                         │
│       ↓             │                  │                         │
│  New user?          │                  │                         │
│  ├─ Yes → /onboard  │                  │                         │
│  │  4 fields        │                  │                         │
│  │  ↓               │                  │                         │
│  │  POST /api/      │   provision      │                         │
│  │  onboarding/     │ ───────────────→ │ POST /api/v1/auth/sso/  │
│  │  setup-clinic    │   (X-Ruthva-     │      provision/         │
│  │       ↓          │    Secret)       │  Creates Clinic + User  │
│  │  Generate SSO    │                  │  Returns subdomain +    │
│  │  token (inline)  │                  │  clinic_id              │
│  │       ↓          │                  │                         │
│  ├─ No ─→ Generate  │                  │                         │
│  │     SSO token    │                  │                         │
│  ↓     (inline)     │                  │                         │
│  Redirect ──────────│─ ?token=xyz ───→ │ /sso?token=xyz          │
│                     │                  │  ↓                      │
│                     │                  │  POST /api/v1/auth/sso/ │
│                     │                  │       validate/          │
│                     │   validate token │  ↓                      │
│                     │ ←─── (verify) ── │  Returns JWT pair       │
│                     │                  │  ↓                      │
│                     │                  │  setTokens() →          │
│                     │                  │  Dashboard              │
│  /account           │                  │                         │
│  Plan, usage,       │  ← "Manage       │  Settings page          │
│  export, close      │     Account"     │  (link opens new tab)   │
└─────────────────────┘                  └─────────────────────────┘
```

### SSO Token Mechanism

**Storage:** New Prisma model `SsoToken` in ruthva's database.

```prisma
model SsoToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt DateTime
  usedAt    DateTime?
  createdAt DateTime @default(now())

  @@index([token])
  @@index([expiresAt])
}
```

- **Token generation:** `crypto.randomBytes(32).toString('hex')` — 64 character hex string
- **TTL:** 60 seconds (short-lived, one-time use)
- **Validation:** Ruthva exposes `POST /api/sso/validate` secured by `X-Ruthva-Secret`. Clinic-os calls this to exchange the token for user/clinic info. Token is atomically marked as used via `UPDATE ... WHERE usedAt IS NULL` (prevents TOCTOU race condition). Replayed tokens are rejected.
- **Security:** Redirect uses `Referrer-Policy: no-referrer` header to prevent token leaking in referrer. Consider POST-based exchange in v2.
- **Cleanup:** Expired tokens cleaned up by a periodic job or on-read (check `expiresAt` during validation).

### Dual Provisioning Strategy

**Order: Django first, then Prisma.** The external dependency (Django) is more likely to fail.

1. Validate onboarding form (4 fields)
2. Call Django `POST /api/v1/auth/sso/provision/` with clinic data
3. If Django returns success → create Clinic in Prisma
4. If Django fails → show error to user with retry button. **No Prisma record is created.**
5. If Prisma fails after Django succeeded → call Django `DELETE /api/v1/auth/sso/provision/{id}/` to rollback. Show error.

No `provisioningStatus` field needed — if a Prisma Clinic record exists, it was successfully synced. If provisioning fails, nothing is saved.

### Returning User SSO Flow

For returning users (clinic already exists), SSO token generation happens inline on the root page:

1. NextAuth creates session after email verification
2. Root page (`/`) detects user has clinic
3. Creates `SsoToken` record inline (no separate API call needed)
4. Redirects to `{CLINIC_OS_URL}/sso?token={token}` with `Referrer-Policy: no-referrer`
5. Clinic-os frontend calls its own backend to validate → gets JWT pair → `setTokens()` → dashboard

### Clinic-OS Session Expiry

When Django JWT expires in clinic-os:

1. Clinic-os frontend detects 401 on API call
2. Attempts refresh token rotation (existing behavior)
3. If refresh also expired → redirect to `ruthva.com/login` (simple — user re-authenticates normally)

No separate `/auth/sso-redirect` page needed. The normal login flow handles re-auth and redirects back to clinic-os.

### Logout Flow

- Logout button lives in clinic-os
- Destroys Django session (clears localStorage tokens)
- Redirects to `ruthva.com/login`
- **Important:** Ruthva session must also be destroyed. Clinic-os logout calls `ruthva.com/api/auth/signout` (NextAuth signout endpoint) before redirecting, OR ruthva's login page checks for a `?logout=true` param and clears the session. Without this, the user would be auto-redirected back to clinic-os (redirect loop).

### Admin & Manual Provisioning

- **Ruthva admin** (`/admin` route): unchanged, stays in ruthva. Admin users (matching `ADMIN_EMAIL` env var) are NOT redirected to clinic-os.
- **Django admin**: Can manually create Clinic + User records directly via existing admin interface. When a manually-provisioned user later visits ruthva.com and logs in, ruthva detects no local clinic → shows onboarding → provisions (Django already has the clinic, so the provision endpoint handles "already exists" idempotently by returning the existing record).

### Account & Billing Page

A new page at `ruthva.com/account` (accessible only to authenticated users with a clinic):

- **Plan name:** "Starter" (hardcoded for now)
- **Patient limit:** 200 patients
- **Usage display:** Current patient count / 200 (fetched from clinic-os Django API)
- **Export data:** Button to request data export (triggers background job in clinic-os, emails a download link)
- **Close account:** Button with confirmation dialog → deactivates account (sets `deactivatedAt` on User, calls Django to deactivate clinic)

Clinic-os settings page includes a "Manage Account" link that opens `ruthva.com/account` in a new tab.

## Technical Approach

### Implementation Phases

#### Phase 1: Schema, API Routes & Django Endpoints

**Goal:** All backend pieces — database changes, SSO endpoints in both apps, provisioning API.

**Ruthva (Next.js / Prisma):**

- [x] Add `SsoToken` model to `prisma/schema.prisma`
- [x] Add `ssoTokens SsoToken[]` relation to `User` model
- [x] Run `prisma migrate dev` to generate migration
- [x] Add env vars: `CLINIC_OS_URL`, `CLINIC_OS_API_URL` (already have `RUTHVA_INTEGRATION_SECRET`)

- [x] Create `POST /api/sso/validate` route (`src/app/api/sso/validate/route.ts`)
  - Secured by `X-Ruthva-Secret` header (reuse `validateIntegrationAuth` from `src/lib/integration-auth.ts`)
  - Request: `{ token }`
  - Atomic update: `UPDATE SsoToken SET usedAt = now() WHERE token = ? AND expiresAt > now() AND usedAt IS NULL`
  - If update affected 0 rows → 401 (invalid/expired/used)
  - Returns `{ userId, email, clinicId, clinicName, doctorName }`

- [x] Create `POST /api/onboarding/setup-clinic` route (`src/app/api/onboarding/setup-clinic/route.ts`)
  - Requires authenticated session
  - Validates 4 fields via Zod: `doctorName`, `clinicName`, `whatsappNumber`, `practiceType`
  - `practiceType` validated as one of: `ayurveda`, `siddha`, `homeopathy`
  - Calls Django `POST /api/v1/auth/sso/provision/` with clinic data + `X-Ruthva-Secret`
  - Maps `practiceType` → Django's `discipline` field explicitly
  - If Django succeeds: creates Clinic in Prisma with `externalSubdomain` from Django response
  - Generates SSO token inline, returns `{ clinic, redirectUrl }`
  - If Django fails: returns 502 with error message

- [x] Add Zod schema to `src/lib/validations.ts`: `setupClinicSchema`

**Clinic-OS (Django):**

- [x] Add `SsoProvisionView` — `POST /api/v1/auth/sso/provision/` endpoint
  - Secured by `X-Ruthva-Secret` header (reuse existing integration auth pattern)
  - Request: `{ email, doctor_name, clinic_name, whatsapp_number, discipline, ruthva_clinic_id }`
  - `discipline` must be one of Django's `DISCIPLINE_CHOICES` (5 values: siddha, ayurveda, yoga_naturopathy, unani, homeopathy)
  - Generates subdomain from clinic_name: `slugify(clinic_name)[:63]`. If taken, appends numeric suffix.
  - Creates `Clinic` + `User` (with `is_clinic_owner=True`, unusable password, role=`admin`)
  - Idempotent: if clinic with matching `ruthva_clinic_id` exists, return existing record
  - Response: `{ id, subdomain, clinic_id, user_id }`
- [x] Add `SsoValidateView` — `POST /api/v1/auth/sso/validate/` endpoint
  - Secured by `X-Ruthva-Secret` header
  - Request: `{ token }`
  - Calls ruthva's `POST /api/sso/validate` to exchange token for user info
  - Finds or creates Django user by email
  - Returns JWT pair: `{ access, refresh, clinic_slug }`
  - Exempt from `TenantMiddleware` (add to exempt paths)
- [x] Add `ruthva_clinic_id` field to `Clinic` model (nullable, unique) for cross-reference
- [x] Add Django migration
- [x] Register new URLs in `config/urls.py`

**Files to create/modify:**

| File | Action |
|---|---|
| `ruthva/prisma/schema.prisma` | Modify: add SsoToken model |
| `ruthva/.env` | Add: CLINIC_OS_URL, CLINIC_OS_API_URL |
| `ruthva/src/app/api/sso/validate/route.ts` | Create |
| `ruthva/src/app/api/onboarding/setup-clinic/route.ts` | Create |
| `ruthva/src/lib/validations.ts` | Modify: add setupClinicSchema |
| `clinic-os/backend/users/views.py` | Modify: add SsoProvisionView, SsoValidateView |
| `clinic-os/backend/users/serializers.py` | Modify: add SsoProvisionSerializer |
| `clinic-os/backend/config/urls.py` | Modify: add SSO routes |
| `clinic-os/backend/clinics/models.py` | Modify: add ruthva_clinic_id field |
| `clinic-os/backend/clinics/middleware.py` | Modify: exempt SSO paths from TenantMiddleware |

#### Phase 2: Frontend Changes (Both Apps)

**Goal:** Simplified onboarding, SSO redirect logic in ruthva, SSO landing page in clinic-os.

**Ruthva Frontend:**

- [x] Rewrite `src/app/onboarding/page.tsx` — single step with 4 fields:
  - Doctor name (text input)
  - Clinic name (text input)
  - Mobile number (tel input)
  - Practice type (pill selector: Ayurveda / Siddha / Homeopathy)
  - Submit button: "Set up my clinic"
  - On submit: `POST /api/onboarding/setup-clinic` → redirect to `redirectUrl`
  - Error state: show error message with retry button

- [x] Modify `src/app/page.tsx` (root page — server component):
  - Authenticated + has clinic → create SSO token inline (server-side) → redirect to clinic-os with `Referrer-Policy: no-referrer`
  - Authenticated + no clinic → redirect to `/onboarding`
  - Authenticated + admin → redirect to `/admin` (unchanged)
  - Unauthenticated → show landing page (unchanged)

- [x] Modify `src/app/(app)/layout.tsx`:
  - Non-admin authenticated users with clinic → redirect to clinic-os (via SSO)
  - Prevents users from accessing stale ruthva UI pages via direct URL

- [x] Handle logout param: if `?logout=true` on `/login`, clear NextAuth session before showing login form

**Clinic-OS Frontend:**

- [x] Create `/sso` page (`frontend/src/app/sso/page.tsx`):
  - Reads `token` from query params
  - Calls `POST /api/v1/auth/sso/validate/` with the token
  - On success: calls `setTokens({ access, refresh, clinic_slug })` from AuthProvider
  - Redirects to `/` (dashboard)
  - On error (invalid/expired token): shows error message with "Return to ruthva.com" link
  - Shows loading spinner during validation

- [x] Modify `AuthProvider.tsx`:
  - When tokens expire and refresh fails → redirect to `${RUTHVA_URL}/login` instead of `/login`
  - Remove `signup()` method (signup no longer happens in clinic-os)

- [x] Remove or redirect auth pages:
  - `/login` → redirect to `ruthva.com/login`
  - `/signup` → redirect to `ruthva.com/login`

- [x] Add "Manage Account" link to settings page → opens `ruthva.com/account` in new tab

- [ ] Add env var: `NEXT_PUBLIC_RUTHVA_URL` to clinic-os frontend

**Files to create/modify:**

| File | Action |
|---|---|
| `ruthva/src/app/onboarding/page.tsx` | Rewrite |
| `ruthva/src/app/page.tsx` | Modify |
| `ruthva/src/app/(app)/layout.tsx` | Modify |
| `ruthva/src/app/(auth)/login/page.tsx` | Modify: handle ?logout=true |
| `clinic-os/frontend/src/app/sso/page.tsx` | Create |
| `clinic-os/frontend/src/components/auth/AuthProvider.tsx` | Modify |
| `clinic-os/frontend/src/app/login/page.tsx` | Modify (redirect to ruthva) |
| `clinic-os/frontend/src/app/signup/page.tsx` | Modify (redirect to ruthva) |
| `clinic-os/frontend/src/app/(dashboard)/settings/page.tsx` | Modify: add Manage Account link |
| `clinic-os/frontend/.env` | Add: NEXT_PUBLIC_RUTHVA_URL |

#### Phase 3: Account Page & Polish

**Goal:** Account management page at ruthva, patient usage tracking, data export, account closure.

- [x] Create `src/app/account/page.tsx` — authenticated page showing:
  - Plan name: "Starter" (hardcoded)
  - Patient limit: 200
  - Usage: fetch current patient count from clinic-os Django API (`GET /api/v1/auth/sso/usage/` secured by `X-Ruthva-Secret`)
  - Progress bar: patients used / 200
  - Export data button: calls `POST /api/account/export` → triggers clinic-os export job → emails link
  - Close account button: confirmation dialog → `POST /api/account/close`

- [x] Create `POST /api/account/export` route
  - Calls Django API to trigger data export background job
  - Returns success message

- [x] Create `POST /api/account/close` route
  - Sets `deactivatedAt` on User record
  - Calls Django to deactivate clinic
  - Signs out user
  - Redirects to ruthva.com with "account closed" message

- [x] Add Django endpoint: `GET /api/v1/auth/sso/usage/`
  - Secured by `X-Ruthva-Secret`
  - Returns `{ patient_count, patient_limit }` for clinic identified by ruthva_clinic_id

**Files to create/modify:**

| File | Action |
|---|---|
| `ruthva/src/app/account/page.tsx` | Create |
| `ruthva/src/app/api/account/export/route.ts` | Create |
| `ruthva/src/app/api/account/close/route.ts` | Create |
| `clinic-os/backend/users/views.py` | Modify: add SsoUsageView |

## ERD: New/Modified Models

```mermaid
erDiagram
    User ||--o{ SsoToken : "generates"
    User ||--o| Clinic : "owns"

    User {
        string id PK
        string email UK
        datetime emailVerified
        string name
        datetime deactivatedAt
    }

    SsoToken {
        string id PK
        string token UK
        string userId FK
        datetime expiresAt
        datetime usedAt
        datetime createdAt
    }

    Clinic {
        string id PK
        string name
        string doctorName
        string whatsappNumber UK
        string email
        string externalSubdomain UK
        string userId FK_UK
    }

    %% Clinic-OS Django side
    DjangoClinic {
        int id PK
        string name
        string subdomain UK
        string discipline
        string ruthva_clinic_id UK
    }

    DjangoUser {
        int id PK
        string email UK
        string username UK
        int clinic_id FK
        string role
        boolean is_clinic_owner
    }

    Clinic ||--|| DjangoClinic : "synced via ruthva_clinic_id"
    DjangoClinic ||--o{ DjangoUser : "has"
```

## Acceptance Criteria

### Functional Requirements

- [ ] New user can sign up at ruthva.com with email + 6-digit code
- [ ] After email verification, new user sees a single-step onboarding with 4 fields
- [ ] Practice type selector offers: Ayurveda, Siddha, Homeopathy
- [ ] Onboarding creates clinic in both Prisma and Django databases
- [ ] After onboarding, user is seamlessly redirected to clinic-os dashboard
- [ ] Returning user logs in at ruthva.com and is redirected straight to clinic-os (no onboarding)
- [ ] SSO token is one-time use, expires in 60 seconds, cannot be replayed
- [ ] Clinic-os login/signup pages redirect to ruthva.com
- [ ] When clinic-os session expires, user is redirected to ruthva.com/login to re-authenticate
- [ ] Logout in clinic-os destroys both clinic-os tokens AND ruthva session, redirects to ruthva.com/login (no redirect loop)
- [ ] Admin users (matching ADMIN_EMAIL) stay on ruthva's admin panel, not redirected to clinic-os
- [ ] Admin can manually create clinics via Django admin (existing admin interface)
- [ ] If Django provisioning fails during onboarding, user sees error with retry button and no Prisma record is created
- [ ] Deactivated users are blocked at login with a clear message
- [ ] Account page shows plan name, patient usage (count/200), export and close options
- [ ] "Manage Account" link in clinic-os settings opens ruthva.com/account in new tab

### Non-Functional Requirements

- [ ] SSO token has sufficient entropy (32 bytes / 64 hex chars)
- [ ] SSO token validation uses atomic update (`WHERE usedAt IS NULL`) to prevent TOCTOU race
- [ ] All inter-service calls authenticated via `X-Ruthva-Secret` header
- [ ] SSO redirect includes `Referrer-Policy: no-referrer` to prevent token leaking
- [ ] Django SSO endpoints exempt from TenantMiddleware
- [ ] Field mapping is explicit: `practiceType` (ruthva, 3 values) → `discipline` (Django, 5 values)
- [ ] Django provision endpoint generates subdomain with collision handling (append numeric suffix if taken)

## Dependencies & Prerequisites

- Clinic-os Django backend must be running and accessible from ruthva's server
- `CLINIC_OS_URL` and `CLINIC_OS_API_URL` env vars configured
- `RUTHVA_INTEGRATION_SECRET` shared between both apps (already exists)
- Domain setup: clinic-os accessible at `app.ruthva.com` (or configured URL)

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation |
|---|---|---|
| Django API down during onboarding | User cannot complete signup | Django-first provisioning. Error with retry button. No partial state. |
| SSO token stolen from URL bar | Session hijacking | 60s TTL, one-time use, high entropy, `Referrer-Policy: no-referrer`. POST-based exchange in v2. |
| Token validation race condition | Duplicate sessions | Atomic `UPDATE ... WHERE usedAt IS NULL` — only one request wins. |
| Logout redirect loop | User stuck between apps | Explicit session destruction on both sides before redirect. |
| Field name mismatch (practiceType ↔ discipline) | Silent data loss | Explicit mapping function. Zod validation on ruthva side, serializer validation on Django side. |
| Subdomain collision during provisioning | Clinic creation fails | Django generates subdomain with numeric suffix fallback. |
| Existing clinic-os users locked out | Loss of access | Pre-launch: no existing users. If there are, migration script to create ruthva User records by email. |

## Reviewer Feedback Applied

Changes from plan review (DHH, Kieran, Simplicity reviewers):

1. **Dropped `provisioningStatus` enum** — if Prisma record exists, it's synced. Failure = no record.
2. **Dropped `PracticeType` enum from Prisma** — ruthva only stores clinic name/doctor/whatsapp. Practice type is passed through to Django's `discipline` field but not stored in Prisma (Django is the source of truth for clinic workflow data).
3. **Eliminated `/auth/sso-redirect` page** — session expiry in clinic-os just redirects to `ruthva.com/login`. Simpler, less code.
4. **Inlined SSO token generation** — no separate `/api/sso/generate` endpoint. Root page and onboarding handler create tokens directly.
5. **Removed Phase 5 (Django admin provisioning)** — Django admin already supports creating Clinic + User records. No custom admin action needed.
6. **Fixed logout redirect loop** — logout must destroy both clinic-os AND ruthva sessions.
7. **Added atomic token validation** — `UPDATE WHERE usedAt IS NULL` prevents TOCTOU race condition.
8. **Added `Referrer-Policy: no-referrer`** — prevents SSO token from leaking in HTTP referrer headers.
9. **Added subdomain collision handling** — Django provision endpoint appends numeric suffix if slug is taken.
10. **Collapsed 5 phases → 3 phases** — backend (Phase 1), frontend (Phase 2), account page (Phase 3).

## Institutional Learnings Applied

From documented solutions across the codebase:

1. **Magic link URLs must point to actual routes** — SSO callback `/sso?token=xyz` is a real page in clinic-os
2. **Cookie deletion must match creation flags exactly** — relevant when implementing logout across both apps
3. **Field name mismatches cause silent data loss** — explicit mapping between `practiceType` (ruthva) and `discipline` (Django)
4. **Never skip the API call in form submit** — onboarding form always POSTs before redirecting
5. **Multi-tenant security** — SSO validation must verify `clinic_id` matches the user's clinic
6. **Django PaaS deployment** — ALLOWED_HOSTS + SECURE_PROXY_SSL_HEADER required for SSO endpoint

## References & Research

### Internal References

- Auth config: `ruthva/src/lib/auth.ts`
- Session helpers: `ruthva/src/lib/session.ts`
- Integration auth pattern: `ruthva/src/lib/integration-auth.ts`
- Current onboarding API: `ruthva/src/app/api/onboarding/complete/route.ts`
- Current onboarding UI: `ruthva/src/app/onboarding/page.tsx`
- Prisma schema: `ruthva/prisma/schema.prisma`
- Clinic-os auth endpoints: `clinic-os/backend/users/views.py`
- Clinic-os AuthProvider: `clinic-os/frontend/src/components/auth/AuthProvider.tsx`
- Clinic-os TenantMiddleware: `clinic-os/backend/clinics/middleware.py`
- Clinic-os RuthvaService: `clinic-os/backend/integrations/services.py`
- Brainstorm: `ruthva/docs/brainstorms/2026-03-16-ruthva-clinic-os-signup-flow-brainstorm.md`

### Related Work

- Existing integration: Ruthva ↔ Sivanethram webhook loop (PR #1)
- Integration API: `ruthva/src/app/api/integration/v1/journeys/`
