# Ruthva Repository Research: Admin Dashboard Patterns

## 1. Route Group Structure

### Root Layout (`/src/app/layout.tsx`, lines 1-39)
- Inter font via `next/font/google` with CSS variable `--font-inter`
- Metadata: title "Ruthva", description "Treatment Continuity for Ayurveda Practices"
- PWA manifest at `/manifest.json`, theme color `#16a34a`
- Simple `<html><body>` wrapper, no providers or session context

### `(auth)` Layout (`/src/app/(auth)/layout.tsx`, lines 1-7)
- Passthrough layout: `<>{children}</>`
- No auth check -- public routes
- Pages: `/login`, `/verify`

### `(app)` Layout (`/src/app/(app)/layout.tsx`, lines 1-27)
- **Route protection**: calls `await requireClinic()` (server-side, redirects to `/onboarding` or `/login`)
- `export const dynamic = "force-dynamic"` -- prevents static generation
- Structure:
  ```tsx
  <div className="flex min-h-dvh flex-col bg-surface">
    <header> (sticky, h-12, brand name + clinic.name) </header>
    <main className="flex-1 pb-20">{children}</main>
    <BottomNav />
  </div>
  ```
- Imports: `requireClinic` from `@/lib/session`, `BottomNav` from `./bottom-nav`

### `(app)` Pages
- `/dashboard/page.tsx` -- main dashboard
- `/patients/page.tsx` -- patient list
- `/patients/new/page.tsx` -- add patient form
- `/patients/[id]/page.tsx` -- patient detail
- `/settings/page.tsx` -- settings

### BottomNav (`/src/app/(app)/bottom-nav.tsx`, lines 1-67)
- Client component (`"use client"`)
- 4 tabs: Home (`/dashboard`), Patients (`/patients`), Add (`/patients/new` -- primary/FAB style), Settings (`/settings`)
- Icons: `Home, Users, PlusCircle, Settings` from `lucide-react`
- Active state: `pathname === tab.href` or `pathname.startsWith(tab.href)`
- Fixed bottom, border-top, `pb-safe` for iOS safe area

---

## 2. Session/Auth Helpers (`/src/lib/session.ts`, lines 1-28)

Three functions, all async, all server-side:

```typescript
// Redirects to /login if no session
async function getSession(): Promise<session & { user: { id: string; email: string } }>

// Returns { session, clinic } -- clinic may be null
async function getClinic(): Promise<{ session, clinic: Clinic | null }>

// Redirects to /onboarding if no clinic
async function requireClinic(): Promise<{ session, clinic: Clinic }>
```

**Pattern**: `getSession()` -> `getClinic()` -> `requireClinic()` (progressive guards)

### Auth Config (`/src/lib/auth.ts`, lines 1-53)
- NextAuth v5 beta with `PrismaAdapter`
- Session strategy: `"database"` (not JWT)
- Provider: `Resend` (email OTP, 6-digit code, 10-min expiry)
- Custom pages: `/login`, `/verify`
- Callback sets `session.user.id = user.id`

---

## 3. API Route Handler Pattern

### Pattern (from `/src/app/api/clinic/route.ts` and `/src/app/api/patients/route.ts`):

```typescript
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { someSchema } from "@/lib/validations";

export async function POST(request: Request) {
  // 1. Auth check
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Load clinic (tenant scoping)
  const clinic = await db.clinic.findUnique({
    where: { userId: session.user.id },
  });
  if (!clinic) {
    return NextResponse.json({ error: "Clinic not found" }, { status: 404 });
  }

  // 3. Parse & validate body with Zod
  const body = await request.json();
  const parsed = someSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    );
  }

  // 4. Check for duplicates (409)
  // 5. Create record
  // 6. Return JSON with 201 status
  return NextResponse.json({ data }, { status: 201 });
}
```

**Key conventions**:
- Auth via `auth()` from `@/lib/auth` (not `getSession`)
- Zod validation with `.safeParse()`, first error message returned
- HTTP status codes: 401 (unauth), 404 (not found), 409 (conflict), 400 (validation), 201 (created)
- All data scoped by clinic (multi-tenant)
- No middleware file exists -- auth is checked per-route/layout

### All API Routes:
- `POST /api/clinic` -- create clinic
- `POST /api/patients` -- create patient + journey
- `POST /api/journeys/confirm-visit` -- confirm visit
- `POST /api/journeys/mark-returned` -- mark patient returned
- `POST /api/onboarding/complete` -- complete onboarding
- `POST /api/cron` -- cron job handler
- `POST /api/webhooks/whatsapp` -- WhatsApp webhook
- `GET  /api/health` -- health check
- `GET|POST /api/auth/[...nextauth]` -- NextAuth handlers

---

## 4. Prisma Schema -- Full Models (`/prisma/schema.prisma`)

### User (lines 39-50)
```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  accounts      Account[]
  sessions      Session[]
  clinic        Clinic?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### Clinic (lines 90-102)
```prisma
model Clinic {
  id             String    @id @default(cuid())
  name           String
  doctorName     String
  whatsappNumber String    @unique
  email          String?
  patients       Patient[]
  journeys       Journey[]
  userId         String    @unique
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
}
```

### Patient (lines 104-118)
```prisma
model Patient {
  id             String    @id @default(cuid())
  clinicId       String
  clinic         Clinic    @relation(fields: [clinicId], references: [id], onDelete: Cascade)
  name           String
  phone          String
  phoneHash      String
  consentGiven   Boolean   @default(false)
  consentGivenAt DateTime?
  journeys       Journey[]
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  @@unique([clinicId, phoneHash])
}
```

### Journey (lines 120-145)
```prisma
model Journey {
  id                   String        @id @default(cuid())
  patientId            String
  patient              Patient       @relation(...)
  clinicId             String
  clinic               Clinic        @relation(...)
  startDate            DateTime      @db.Date
  durationDays         Int
  followupIntervalDays Int
  status               JourneyStatus @default(active)    // active | completed | dropped
  riskLevel            RiskLevel     @default(stable)     // stable | watch | at_risk | critical
  riskReason           String?
  riskUpdatedAt        DateTime?
  lastVisitDate        DateTime?     @db.Date
  nextVisitDate        DateTime?     @db.Date
  missedVisits         Int           @default(0)
  recoveryAttempts     Int           @default(0)
  lastActivityAt       DateTime?
  events               Event[]
  createdAt            DateTime      @default(now())
  updatedAt            DateTime      @updatedAt
  @@index([clinicId, status])
  @@index([clinicId, riskLevel])
  @@index([status, nextVisitDate])
}
```

### Event (lines 147-161)
```prisma
model Event {
  id        String    @id @default(cuid())
  journeyId String
  journey   Journey   @relation(...)
  eventType EventType
  eventDate DateTime  @db.Date
  eventTime DateTime
  metadata  Json      @default("{}")
  createdBy String
  createdAt DateTime  @default(now())
  @@unique([journeyId, eventType, eventDate])
  @@index([journeyId, eventTime])
  @@index([eventType, eventTime])
}
```

### Enums
- `JourneyStatus`: active, completed, dropped
- `RiskLevel`: stable, watch, at_risk, critical
- `EventType`: journey_started, visit_expected, visit_confirmed, visit_missed, adherence_check_sent, adherence_response, reminder_sent, recovery_message_sent, patient_returned

---

## 5. Dashboard Page (`/src/app/(app)/dashboard/page.tsx`, lines 1-182)

### Data Fetching Pattern
- Server component (no `"use client"`)
- Calls `requireClinic()` for auth + clinic data
- Uses `Promise.all()` with 5 parallel Prisma queries:
  1. `db.journey.count()` -- at-risk count
  2. `db.journey.count()` -- critical count
  3. `db.journey.count()` -- total active
  4. `db.event.count()` -- recovered this month
  5. `db.journey.findMany()` -- at-risk patients (top 20)

### Display Pattern
- Primary stat card (patients at risk + revenue at risk)
- 3-column grid of secondary stats (critical, active, recovered)
- "Needs Attention" list with risk-colored avatars
- Links to `/patients/[id]`
- Icons from `lucide-react`: `AlertCircle, TrendingUp, ChevronRight, Heart`

### Design Conventions
- Cards: `rounded-xl border border-border bg-surface p-4`
- Stats: `text-3xl font-semibold tabular-nums`
- Secondary text: `text-sm text-text-secondary` / `text-xs text-text-muted`
- Risk colors: `text-risk-stable`, `text-risk-critical`, etc.

---

## 6. createdAt/updatedAt Fields (for Growth Analytics)

ALL models have `createdAt` and `updatedAt`:
| Model    | createdAt | updatedAt |
|----------|-----------|-----------|
| User     | line 48   | line 49   |
| Account  | line 64   | line 65   |
| Session  | line 76   | line 77   |
| Clinic   | line 100  | line 101  |
| Patient  | line 114  | line 115  |
| Journey  | line 139  | line 140  |
| Event    | line 156  | (none -- only createdAt) |

**Event** has only `createdAt` (no updatedAt). All other models have both.
Additionally: `Journey.riskUpdatedAt`, `Patient.consentGivenAt`, `Journey.lastActivityAt` for time-series analytics.

---

## 7. globals.css Design Tokens (`/src/app/globals.css`, lines 1-73)

Uses Tailwind v4 `@theme` directive:

### Brand Palette
- `--color-brand-50`: #f0fdf4
- `--color-brand-100`: #dcfce7
- `--color-brand-500`: #22c55e
- `--color-brand-600`: #16a34a
- `--color-brand-700`: #15803d
- `--color-brand-900`: #14532d

### Risk Levels (Semantic)
- `--color-risk-stable`: #22c55e (green)
- `--color-risk-watch`: #eab308 (yellow)
- `--color-risk-at-risk`: #f97316 (orange)
- `--color-risk-critical`: #ef4444 (red)

### Neutral Scale
- `--color-surface`: #ffffff
- `--color-surface-raised`: #f9fafb
- `--color-surface-sunken`: #f3f4f6
- `--color-border`: #e5e7eb
- `--color-border-strong`: #d1d5db
- `--color-text-primary`: #111827
- `--color-text-secondary`: #6b7280
- `--color-text-muted`: #9ca3af

### Typography
- `--font-sans`: var(--font-inter)
- Sizes: xs(0.75rem), sm(0.875rem), base(1rem), lg(1.125rem), xl(1.25rem), 2xl(1.5rem), 3xl(1.875rem)

### Spacing/Radius
- `--radius-sm`: 0.375rem, `--radius-md`: 0.5rem, `--radius-lg`: 0.75rem, `--radius-xl`: 1rem

### Utility Classes
- `.tabular-nums` -- font-variant-numeric: tabular-nums
- `.min-h-dvh` -- min-height: 100dvh
- `.pb-safe` -- padding-bottom: env(safe-area-inset-bottom)

---

## 8. Package.json Dependencies (`/package.json`)

### Runtime Dependencies
| Package | Version |
|---------|---------|
| next | 16.1.6 |
| react | 19.2.3 |
| react-dom | 19.2.3 |
| next-auth | ^5.0.0-beta.30 |
| @auth/prisma-adapter | ^2.11.1 |
| @prisma/client | ^7.4.2 |
| @prisma/adapter-pg | ^7.4.2 |
| prisma | ^7.4.2 |
| pg | ^8.19.0 |
| lucide-react | ^0.575.0 |
| zod | ^4.3.6 |
| resend | ^6.9.3 |
| @serwist/next | ^9.5.6 |
| @upstash/ratelimit | ^2.0.8 |
| @upstash/redis | ^1.36.3 |

### Dev Dependencies
| Package | Version |
|---------|---------|
| tailwindcss | ^4 |
| @tailwindcss/postcss | ^4 |
| typescript | ^5 |
| @types/node | ^20 |
| @types/react | ^19 |
| @types/react-dom | ^19 |
| @types/pg | ^8.18.0 |
| eslint | ^9 |
| eslint-config-next | 16.1.6 |
| babel-plugin-react-compiler | 1.0.0 |
| dotenv | ^17.3.1 |

### Build Script
```json
"build": "prisma generate && next build"
```

---

## 9. Additional Helpers

### Prisma Client (`/src/lib/db.ts`, lines 1-20)
- Uses `PrismaPg` adapter with `DATABASE_URL`
- Global singleton pattern for dev hot-reload
- Import: `import { PrismaClient } from "@/generated/prisma/client"`

### Scoped DB (`/src/lib/scoped-db.ts`, lines 1-28)
- `scopedDb(clinicId)` returns tenant-scoped query helpers
- Prevents cross-tenant data leaks by auto-filtering `where: { clinicId }`
- Exposes: `patient.findMany()`, `patient.count()`, `journey.findMany()`, `journey.count()`

### Validations (`/src/lib/validations.ts`, lines 1-17)
- `createClinicSchema`: name, doctorName, whatsappNumber
- `createPatientSchema`: name, phone, durationDays (7-180), followupIntervalDays (1-30), consentGiven (must be true)

### Events (`/src/lib/events.ts`, lines 1-227)
- `createEvent()` -- upsert pattern with compound unique key
- `createJourneyWithEvents()` -- transaction: create journey + journey_started event + visit_expected events
- `confirmVisit(journeyId)` -- upsert visit_confirmed + update journey state
- `markPatientReturned(journeyId)` -- upsert patient_returned + reset risk to stable

---

## 10. Key Patterns for Admin Dashboard Implementation

1. **Auth in pages**: Use `requireClinic()` for server components, `auth()` for API routes
2. **No middleware**: Auth is checked at layout/route level, not via middleware
3. **Multi-tenant**: All queries scoped by `clinicId`, use `scopedDb()` helper or manual filtering
4. **Server components**: Dashboard is fully server-rendered, no client state for data
5. **Client components**: Only for interactive UI (BottomNav uses `"use client"`)
6. **Styling**: Tailwind v4 with semantic tokens (brand, risk, surface, text, border)
7. **Icons**: Always `lucide-react`
8. **Validation**: Zod schemas in `/src/lib/validations.ts`
9. **DB access**: Direct Prisma via `db` from `@/lib/db`, never raw SQL
10. **Transactions**: Use `db.$transaction()` for multi-step writes (see events.ts)
