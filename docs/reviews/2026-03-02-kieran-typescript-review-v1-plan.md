# TypeScript Architecture Review -- Ruthva V1 Plan

**Reviewer:** Kieran (Senior TypeScript Reviewer)
**Date:** 2026-03-02
**Document:** `docs/plans/2026-03-01-feat-ruthva-v1-treatment-continuity-platform-plan.md`
**Verdict:** Solid foundation with 3 critical type holes and 5 moderate improvements needed

---

## CRITICAL -- Type Holes That Will Cause Runtime Errors

### C1. Event `metadata` is a JSONB black hole (FAIL)

The Prisma schema declares `metadata Json @default("{}")` and the plan lists 9 event types each with different metadata shapes, but there is **no type-level contract** between `eventType` and `metadata`. This is the single biggest type safety gap in the entire plan.

**What will happen:** Developers will write `event.metadata.visit_number` and TypeScript will either require a cast to `any` or fail to compile. You will inevitably end up with `(event.metadata as any).visit_number` scattered across the codebase.

**Required fix -- Discriminated union with a type-safe event factory:**

```typescript
// lib/events/types.ts

type EventBase<T extends string, M extends Record<string, unknown>> = {
  readonly eventType: T;
  readonly metadata: M;
  readonly journeyId: string;
  readonly eventTime: Date;
  readonly createdBy: 'system' | 'staff' | 'patient';
};

type JourneyStartedEvent = EventBase<'journey_started', {
  duration: number;
  interval: number;
}>;

type VisitExpectedEvent = EventBase<'visit_expected', {
  visitNumber: number;
  expectedDate: string; // ISO date string
}>;

type VisitConfirmedEvent = EventBase<'visit_confirmed', {
  confirmedBy: 'staff' | 'patient';
}>;

type VisitMissedEvent = EventBase<'visit_missed', {
  daysOverdue: number;
}>;

type AdherenceCheckSentEvent = EventBase<'adherence_check_sent', {
  messageId: string;
}>;

type AdherenceResponseEvent = EventBase<'adherence_response', {
  response: 'yes' | 'missed' | 'help_needed';
}>;

type ReminderSentEvent = EventBase<'reminder_sent', {
  messageId: string;
}>;

type RecoveryMessageSentEvent = EventBase<'recovery_message_sent', {
  attempt: number;
  messageId: string;
}>;

type PatientReturnedEvent = EventBase<'patient_returned', {
  daysAbsent: number;
}>;

// The union -- this is what you pass around
type RuthvaEvent =
  | JourneyStartedEvent
  | VisitExpectedEvent
  | VisitConfirmedEvent
  | VisitMissedEvent
  | AdherenceCheckSentEvent
  | AdherenceResponseEvent
  | ReminderSentEvent
  | RecoveryMessageSentEvent
  | PatientReturnedEvent;

// Type-safe event type string literal
type EventType = RuthvaEvent['eventType'];
```

**Type-safe factory (replaces untyped `createEvent` helpers):**

```typescript
// lib/events/create.ts
import { prisma } from '@/lib/db';

function createEvent<T extends RuthvaEvent>(
  event: Pick<T, 'eventType' | 'metadata' | 'journeyId' | 'createdBy'> & {
    eventTime?: Date;
  }
) {
  return prisma.event.create({
    data: {
      journeyId: event.journeyId,
      eventType: event.eventType,
      eventTime: event.eventTime ?? new Date(),
      metadata: event.metadata,
      createdBy: event.createdBy,
    },
  });
}

// Usage -- compiler enforces correct metadata shape:
createEvent<VisitMissedEvent>({
  eventType: 'visit_missed',
  metadata: { daysOverdue: 3 },      // TS enforces this shape
  journeyId: 'clx...',
  createdBy: 'system',
});

// This would FAIL at compile time:
createEvent<VisitMissedEvent>({
  eventType: 'visit_missed',
  metadata: { visitNumber: 3 },       // ERROR: wrong metadata shape
  journeyId: 'clx...',
  createdBy: 'system',
});
```

**Type-safe narrowing when reading events:**

```typescript
// lib/events/narrow.ts
function isEventType<T extends RuthvaEvent>(
  event: { eventType: string; metadata: unknown },
  type: T['eventType']
): event is T {
  return event.eventType === type;
}

// Usage:
const event = await prisma.event.findFirst({ where: { id } });
if (event && isEventType<VisitMissedEvent>(event, 'visit_missed')) {
  console.log(event.metadata.daysOverdue); // fully typed, no cast
}
```

This pattern gives you compile-time safety going IN (creation) and coming OUT (reading/narrowing).

---

### C2. Journey `status` and `createdBy` are stringly typed (FAIL)

```prisma
status    String   @default("active") // active|completed|dropped
createdBy String   // system|staff|patient
```

These are plain `String` in Prisma. At the TypeScript layer, they will be `string` -- no autocompletion, no exhaustive switch checking, no typo protection.

**Required fix -- Use Prisma `enum` for status, and a shared const for `createdBy`:**

```prisma
enum JourneyStatus {
  active
  completed
  dropped
}

model Journey {
  status JourneyStatus @default(active)
  // ...
}
```

For `createdBy` on the Event model, since it crosses both Prisma and application logic:

```prisma
enum EventCreator {
  system
  staff
  patient
}

model Event {
  createdBy EventCreator
  // ...
}
```

This gives you generated TypeScript enums from Prisma that integrate directly with your discriminated union types. A `switch` on `journey.status` will now produce a compiler error if you forget a case.

---

### C3. Event `eventType` column has no database or Prisma constraint (FAIL)

`eventType String` is a plain string column. Nothing prevents inserting `"visit_mised"` (typo) or `"some_random_type"` into the database. The TypeScript union type proposed in C1 protects application code, but the cron worker, raw SQL queries, or any future service that writes directly will bypass it.

**Required fix -- Add a Prisma enum for event types too:**

```prisma
enum EventType {
  journey_started
  visit_expected
  visit_confirmed
  visit_missed
  adherence_check_sent
  adherence_response
  reminder_sent
  recovery_message_sent
  patient_returned
}

model Event {
  eventType EventType
  // ...
}
```

This gives you database-level constraint AND a generated TypeScript type. The discriminated union from C1 still sits on top for metadata safety, but the enum ensures the database itself rejects invalid event types.

---

## MODERATE -- Improvements for Production Readiness

### M1. No Zod validation schemas shown for API routes

The acceptance criteria state "All API routes have input validation (Zod schemas)" but the plan shows no Zod schema examples. For a plan of this detail level, the validation layer deserves at least a pattern example.

**Recommended pattern:**

```typescript
// lib/validations/patient.ts
import { z } from 'zod';

const createPatientSchema = z.object({
  name: z.string().min(1).max(100),
  phone: z.string().regex(/^\+91\d{10}$/, 'Must be a valid Indian mobile number'),
  durationDays: z.union([z.literal(15), z.literal(30), z.literal(45), z.literal(60)]),
  followupIntervalDays: z.union([z.literal(7), z.literal(14)]),
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: 'Patient consent is required' }),
  }),
});

type CreatePatientInput = z.infer<typeof createPatientSchema>;
```

Key point: use `z.literal(true)` for the consent field, not `z.boolean()`. The form should be rejected if consent is `false` -- this is a DPDP compliance requirement baked into the type system.

---

### M2. Missing type for risk levels

The plan defines 4 risk levels (Stable, Watch, At Risk, Critical) but no TypeScript representation. This will be used across the cron worker, dashboard queries, and UI components.

```typescript
// lib/risk/types.ts
const RISK_LEVELS = ['stable', 'watch', 'at_risk', 'critical'] as const;
type RiskLevel = typeof RISK_LEVELS[number];

type RiskAssessment = {
  readonly level: RiskLevel;
  readonly reason: string;
  readonly computedAt: Date;
};
```

---

### M3. Prisma client singleton pattern not specified

The plan lists `lib/db.ts (Prisma client)` but does not mention the standard Next.js singleton pattern. Without this, hot module reloading in development creates multiple Prisma Client instances and exhausts database connections.

**Required pattern:**

```typescript
// lib/db.ts
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
```

Note: the `as unknown as` cast here is one of the rare justified uses of type assertion -- `globalThis` genuinely does not have a `prisma` property, and this is the canonical Prisma pattern.

---

### M4. Webhook signature validation type

The plan mentions "Webhook endpoint validates Gupshup signature" but does not specify where this happens. This needs a middleware-like guard that runs before any event processing.

```typescript
// lib/gupshup/validate.ts
import { type NextRequest } from 'next/server';

type GupshupWebhookPayload = {
  readonly type: 'message' | 'message-event';
  readonly payload: {
    readonly source: string;
    readonly type: 'quick_reply' | 'text';
    readonly payload?: {
      readonly id: string;
      readonly title: string;
    };
  };
};

function validateGupshupSignature(request: NextRequest): boolean {
  const signature = request.headers.get('x-gupshup-signature');
  // HMAC validation logic
  return true; // placeholder
}

async function parseGupshupWebhook(
  request: NextRequest
): Promise<GupshupWebhookPayload | null> {
  if (!validateGupshupSignature(request)) return null;
  const body = await request.json();
  // Validate with Zod schema before returning
  return gupshupWebhookSchema.parse(body);
}
```

---

### M5. Clinic-scoped query pattern needs a helper

The acceptance criteria state "Database queries scoped to clinic_id (no cross-tenant data leaks)." This is a critical security requirement. Rather than relying on every developer remembering to add `clinicId` to every query, create a scoped query helper.

```typescript
// lib/db/scoped.ts
function scopedPatients(clinicId: string) {
  return prisma.patient.findMany({
    where: { clinicId },
  });
}

// Or a more composable pattern:
function withClinicScope(clinicId: string) {
  return {
    patients: {
      findMany: (args?: Omit<Parameters<typeof prisma.patient.findMany>[0], 'where'> & {
        where?: Omit<NonNullable<Parameters<typeof prisma.patient.findMany>[0]>['where'], 'clinicId'>;
      }) =>
        prisma.patient.findMany({
          ...args,
          where: { ...args?.where, clinicId },
        }),
    },
  } as const;
}
```

---

## MINOR -- Good Practices to Adopt from the Start

### N1. Metadata key naming inconsistency

The plan mixes snake_case in metadata (`visit_number`, `expected_date`, `confirmed_by`, `message_id`, `days_overdue`, `days_absent`) but the Prisma schema uses camelCase (`durationDays`, `followupIntervalDays`). Pick one convention for the entire TypeScript layer.

**Recommendation:** Use camelCase everywhere in TypeScript types (matching Prisma generated types). The snake_case can live in the database column names via `@map`, but the application layer should be consistently camelCase.

### N2. `cuid()` vs `uuid` mismatch

The ERD says `uuid id PK` but the Prisma schema uses `@default(cuid())`. These are different. CUIDs are fine, but the documentation should be consistent. Update the ERD to say `cuid` or switch Prisma to `@default(uuid())`.

### N3. Consider `satisfies` for configuration objects

For the manifest, brand tokens, and risk level configs, use the `satisfies` operator (TypeScript 4.9+) to validate types while preserving literal inference:

```typescript
const RISK_CONFIG = {
  stable: { color: 'green', label: 'Stable' },
  watch: { color: 'yellow', label: 'Watch' },
  at_risk: { color: 'orange', label: 'At Risk' },
  critical: { color: 'red', label: 'Critical' },
} as const satisfies Record<RiskLevel, { color: string; label: string }>;
```

### N4. Auth.js session type extension not mentioned

Auth.js v5 with PrismaAdapter will require extending the `Session` and `User` types to include the `clinicId`. Without this, you will be casting `session.user` to access clinic data.

```typescript
// types/next-auth.d.ts
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      clinicId: string;
      email: string;
    };
  }
}
```

---

## POSITIVE -- What the Plan Gets Right

1. **Event-sourced design with only 4 app tables** -- simple, auditable, extensible. This is the correct architecture for a system where "what happened" matters more than "current state."

2. **Separate cron worker** -- keeping scheduled jobs out of the web process is the right call. The plan correctly identifies idempotency as a requirement.

3. **Database session strategy over JWT** -- correct for a PWA that needs persistent sessions across device restarts. JWT would require refresh token logic that adds complexity for no benefit here.

4. **Consent modeled as a first-class field** (`consentGiven` + `consentGivenAt`) -- not an afterthought. Good for DPDP compliance.

5. **Composite unique constraint** `@@unique([clinicId, phone])` -- prevents duplicate patients per clinic while allowing the same phone number across clinics. Correct multi-tenant design.

6. **Compound indexes on Events table** -- the three indexes (`journeyId + eventType`, `eventType + eventTime`, `journeyId + eventTime`) cover the primary query patterns well.

---

## Summary Scorecard

| Area | Rating | Notes |
|---|---|---|
| Prisma Schema | 6/10 | Solid structure, but stringly-typed enums are a landmine |
| Event Type System | 4/10 | Biggest gap -- JSONB metadata has zero type safety as designed |
| Auth.js Integration | 7/10 | Good choices, missing session type extension |
| API Route Patterns | 5/10 | Zod mentioned but no patterns shown; no scoped query helper |
| Event Creation Helpers | 3/10 | Referenced but not defined; will be `any`-laden without discriminated union |
| Overall Architecture | 8/10 | Event sourcing, separate cron, minimal tables -- strong foundation |

**Bottom line:** The architecture is sound and well-reasoned. The type safety layer is where it falls short. The three critical issues (C1, C2, C3) must be addressed before implementation begins, or the codebase will accumulate `as any` casts within the first week. The discriminated union + Prisma enum pattern described in this review should be treated as a prerequisite, not a nice-to-have.
