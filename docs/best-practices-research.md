# Best Practices Research: Next.js 15 Full-Stack with Neon + Prisma + Auth.js + Serwist

**Date:** 2026-03-02
**Focus:** Practical patterns for a solo developer shipping in 6 weeks

---

## 1. Next.js 15 App Router + Prisma on Neon Postgres

### Connection Setup

**Two connection strings are required:**

```env
# Pooled — for app runtime (has -pooler in hostname)
DATABASE_URL="postgresql://user:pass@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=15"

# Direct — for migrations only (no -pooler)
DIRECT_URL="postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=15"
```

**Note (Prisma 5.10.0+ / PgBouncer 1.22.0+):** You no longer need `pgbouncer=true` in the connection string. The pooled connection works for both queries and migrations. However, keeping `DIRECT_URL` for migrations is still the safest pattern.

### schema.prisma Configuration

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")       // pooled — runtime queries
  directUrl = env("DIRECT_URL")         // direct — migrations
}

generator client {
  provider = "prisma-client-js"
}
```

### Prisma Client Singleton (CRITICAL for Serverless)

```typescript
// lib/prisma.ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query'] : [],
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
```

**Why:** In dev, Next.js hot reloads create new PrismaClient instances. The global singleton prevents connection pool exhaustion. In production serverless, each cold start gets one instance per function invocation.

### Neon Serverless Driver Adapter (Optional — for Edge Runtime)

Only use this if you need Edge Runtime (Vercel Edge Functions). For standard Node.js runtime on Railway, the standard PrismaClient above is sufficient.

```typescript
// lib/prisma-edge.ts (only if deploying to Edge)
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'

const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL })
export const prisma = new PrismaClient({ adapter })
```

```bash
npm install @prisma/adapter-neon
```

### Cold Start Mitigation

1. **`connect_timeout=15`** in connection string (default is 5s, too short for Neon wake-up)
2. **Use pooled connection** — PgBouncer maintains warm connections that mask cold starts
3. **Neon paid plan:** Increase scale-to-zero timeout from 5min default (up to 7 days), or disable entirely
4. **Connection pool params:** `?connection_limit=5&pool_timeout=15` for serverless (keep connection_limit low)

### Migration Deployment

```bash
# Development
npx prisma migrate dev --name your_migration_name

# Production (CI/CD or Railway deploy)
npx prisma migrate deploy
```

**Railway-specific:** Add `npx prisma migrate deploy` as a build step or pre-start script in package.json.

---

## 2. Auth.js v5 Custom Email OTP (Not Magic Links)

### Recommended Approach: Resend Provider + generateVerificationToken

Use the **Resend email provider** (NOT CredentialsProvider). The Resend provider supports `generateVerificationToken` to replace the default 32-char hex token with a 6-digit OTP.

**Why not CredentialsProvider?** CredentialsProvider doesn't support sessions properly, doesn't trigger Auth.js callbacks correctly, and requires you to manage the entire auth flow yourself. The Email/Resend provider gives you proper session management, CSRF protection, and token lifecycle.

### Implementation

```typescript
// auth.ts
import NextAuth from "next-auth"
import Resend from "next-auth/providers/resend"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import { randomInt } from "crypto"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Resend({
      from: "auth@yourdomain.com",

      // Override token to generate 6-digit OTP
      async generateVerificationToken() {
        return randomInt(100000, 999999).toString()
      },

      // Custom email with OTP code (not magic link)
      async sendVerificationRequest({ identifier: email, token, provider }) {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.AUTH_RESEND_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: provider.from,
            to: email,
            subject: "Your sign-in code",
            html: `
              <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
                <h2 style="text-align: center; color: #333;">Your verification code</h2>
                <div style="background: #f4f4f5; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0;">
                  <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #18181b;">
                    ${token}
                  </span>
                </div>
                <p style="color: #71717a; text-align: center; font-size: 14px;">
                  This code expires in 10 minutes. Do not share it.
                </p>
              </div>
            `,
            text: `Your verification code is: ${token}`,
          }),
        })

        if (!res.ok) {
          throw new Error("Resend error: " + JSON.stringify(await res.json()))
        }
      },
    }),
  ],
  pages: {
    signIn: "/login",
    verifyRequest: "/verify", // Custom page to enter OTP
  },
})
```

### Custom OTP Verification Page

Auth.js email providers use a callback URL pattern by default. For OTP input, create a custom verification page:

```typescript
// app/verify/page.tsx
"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function VerifyPage() {
  const [otp, setOtp] = useState("")
  const [error, setError] = useState("")
  const searchParams = useSearchParams()
  const email = searchParams.get("email") || ""
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")

    // Auth.js email verification callback
    const callbackUrl = `/api/auth/callback/resend?token=${otp}&email=${encodeURIComponent(email)}`

    const res = await fetch(callbackUrl, { redirect: "manual" })

    if (res.status === 302 || res.ok) {
      router.push("/dashboard")
    } else {
      setError("Invalid or expired code. Please try again.")
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <p>Enter the 6-digit code sent to {email}</p>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]{6}"
        maxLength={6}
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
        autoFocus
        autoComplete="one-time-code"
      />
      {error && <p style={{ color: "red" }}>{error}</p>}
      <button type="submit" disabled={otp.length !== 6}>
        Verify
      </button>
    </form>
  )
}
```

### Rate Limiting OTP Attempts

Auth.js does NOT provide built-in rate limiting. Implement it yourself:

```typescript
// lib/rate-limit.ts
const attempts = new Map<string, { count: number; resetAt: number }>()

export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const record = attempts.get(key)

  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs })
    return true // allowed
  }

  if (record.count >= maxAttempts) {
    return false // blocked
  }

  record.count++
  return true // allowed
}
```

For production, use **Upstash Redis** rate limiting (`@upstash/ratelimit`) instead of in-memory — it works across serverless invocations.

### Security Considerations for 6-digit OTP

- **Brute force risk:** 6-digit = 1M combinations. With 5 attempts per 15-min window, this is safe.
- **Token expiry:** Auth.js default is 24h. Override to 10 minutes in your adapter or via `maxAge` on the provider.
- **One-time use:** Auth.js deletes tokens after verification by default (good).
- **Add `maxAge`:** `Resend({ maxAge: 600 })` (10 minutes in seconds)

### Database Requirement

Auth.js email providers **require a database adapter**. The PrismaAdapter handles:
- `verification_tokens` table (stores OTP + email + expiry)
- `users` and `sessions` tables
- `accounts` table (for linking providers)

Run `npx prisma migrate dev` after adding the Auth.js schema.

---

## 3. Event Sourcing at Small Scale with Prisma

### Verdict: Full Event Sourcing is Overkill for <10K Events

For a solo developer shipping in 6 weeks, full event sourcing introduces:
- Steep learning curve (aggregates, projections, snapshots)
- Complex read model synchronization
- CQRS overhead that provides no benefit at small scale
- Specialized patterns that Prisma doesn't natively support well

### Recommended: Hybrid Approach (Status Fields + Event Log)

Keep your standard CRUD models with status fields for fast reads, and add an append-only event log table for audit trail and history.

```prisma
// schema.prisma

// Standard CRUD model with status field (fast reads)
model Application {
  id          String   @id @default(cuid())
  studentId   String
  status      String   @default("draft") // draft, submitted, under_review, accepted, rejected
  university  String
  program     String
  updatedAt   DateTime @updatedAt
  createdAt   DateTime @default(now())

  student     User     @relation(fields: [studentId], references: [id])
  events      ApplicationEvent[]
}

// Append-only event log (never update, never delete)
model ApplicationEvent {
  id            String   @id @default(cuid())
  applicationId String
  eventType     String   // "status_changed", "document_uploaded", "note_added", "fee_paid"
  payload       Json     // { from: "draft", to: "submitted", reason: "..." }
  actorId       String?  // who triggered this
  createdAt     DateTime @default(now())

  application   Application @relation(fields: [applicationId], references: [id])
  actor         User?       @relation(fields: [actorId], references: [id])

  @@index([applicationId, createdAt])
  @@index([eventType])
}
```

### Helper Function: Status Change + Event Log

```typescript
// lib/application-events.ts
import { prisma } from "@/lib/prisma"

type StatusTransition = {
  applicationId: string
  from: string
  to: string
  actorId: string
  reason?: string
}

export async function transitionStatus({ applicationId, from, to, actorId, reason }: StatusTransition) {
  return prisma.$transaction(async (tx) => {
    // Verify current status (optimistic locking)
    const app = await tx.application.findUniqueOrThrow({
      where: { id: applicationId },
    })

    if (app.status !== from) {
      throw new Error(`Expected status "${from}", got "${app.status}"`)
    }

    // Update status field (fast reads)
    const updated = await tx.application.update({
      where: { id: applicationId },
      data: { status: to },
    })

    // Append event (audit trail)
    await tx.applicationEvent.create({
      data: {
        applicationId,
        eventType: "status_changed",
        payload: { from, to, reason },
        actorId,
      },
    })

    return updated
  })
}

// Generic event logger
export async function logEvent(
  applicationId: string,
  eventType: string,
  payload: Record<string, unknown>,
  actorId?: string
) {
  return prisma.applicationEvent.create({
    data: { applicationId, eventType, payload, actorId },
  })
}
```

### Timeline View Query

```typescript
// Get full history for an application
const timeline = await prisma.applicationEvent.findMany({
  where: { applicationId },
  orderBy: { createdAt: "asc" },
  include: { actor: { select: { name: true, email: true } } },
})
```

### Why This Hybrid Works

| Concern | Full Event Sourcing | Hybrid Approach |
|---|---|---|
| Current state query | Replay events or maintain projection | Direct read from status field |
| History / audit trail | Native | Event log table |
| Complexity | High | Low |
| Prisma compatibility | Poor (no native support) | Excellent |
| Time to implement | Weeks | Hours |
| Works at <10K events | Overkill | Perfect fit |

### When to Consider Full Event Sourcing Later

- You need to "replay" events to reconstruct past states
- You have multiple consumers of the same event stream
- You exceed 100K events and need snapshots
- You need temporal queries ("what was the status on March 1st?")

For the temporal query case, the hybrid approach already supports this via: `WHERE applicationId = ? AND createdAt <= ? ORDER BY createdAt DESC LIMIT 1`

### Alternative: Bemi for Automatic Audit Trails

If you want zero-code audit trails, [Bemi](https://github.com/BemiHQ/bemi-prisma) plugs into Prisma and uses PostgreSQL Change Data Capture to automatically track all data changes. Good for compliance, but adds infrastructure complexity.

---

## 4. Next.js PWA with Serwist

### Package Choice

- **`@serwist/next`** — for webpack (stable, proven)
- **`@serwist/turbopack`** — for Turbopack (newer, use if you need Turbopack)

For shipping in 6 weeks, use **`@serwist/next` with webpack**. It is more stable and has more community examples.

### Installation

```bash
npm install -D serwist @serwist/next
```

### next.config.ts

```typescript
import withSerwistInit from "@serwist/next"

const revision = crypto.randomUUID()

const withSerwist = withSerwistInit({
  cacheOnNavigation: true,
  reloadOnOnline: false,   // Don't force-refresh (preserves form data)
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  additionalPrecacheEntries: [
    { url: "/~offline", revision },
  ],
})

export default withSerwist({
  // your other Next.js config
})
```

### Service Worker (app/sw.ts)

```typescript
import { defaultCache } from "@serwist/next/worker"
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist"
import { Serwist } from "serwist"

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          return request.destination === "document"
        },
      },
    ],
  },
})

serwist.addEventListeners()
```

### Web App Manifest (app/manifest.ts)

```typescript
import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Your App Name",
    short_name: "AppName",
    description: "Your app description",
    start_url: "/",
    display: "standalone",           // KEY: makes it feel like a native app
    background_color: "#ffffff",
    theme_color: "#18181b",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
```

### Offline Fallback Page

```typescript
// app/~offline/page.tsx
export default function OfflinePage() {
  return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <h1>You are offline</h1>
      <p>Please check your internet connection and try again.</p>
    </div>
  )
}
```

### TypeScript Configuration

Add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext", "webworker"],
    "types": ["@serwist/next/typings"]
  },
  "exclude": ["public/sw.js"]
}
```

### Meta Tags in Root Layout

```typescript
// app/layout.tsx
export const metadata: Metadata = {
  title: "Your App",
  description: "Your app description",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Your App",
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: "#18181b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,    // Prevents zoom on mobile for app-like feel
}
```

### Known Issues and Gotchas

1. **Turbopack:** Use `@serwist/turbopack` package, NOT `@serwist/next` if using Turbopack
2. **Development:** Always disable Serwist in dev (`disable: process.env.NODE_ENV === "development"`), or you will cache stale pages
3. **`reloadOnOnline: false`** — set this to false or users lose form data when reconnecting
4. **Service worker caching API routes:** Be careful not to cache authenticated API routes. The `defaultCache` from Serwist handles this reasonably, but review if you have custom API patterns.
5. **iOS Safari:** PWA support is limited. Test `standalone` display thoroughly on iOS.

---

## 5. Neon Postgres with Prisma on Railway

### Environment Variables on Railway

Set these in your Railway service variables:

```env
# Pooled connection (runtime queries)
DATABASE_URL="postgresql://user:pass@ep-cool-name-123456-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=15&connection_limit=5&pool_timeout=15"

# Direct connection (migrations)
DIRECT_URL="postgresql://user:pass@ep-cool-name-123456.us-east-2.aws.neon.tech/neondb?sslmode=require&connect_timeout=15"
```

**Key parameters:**
- `connect_timeout=15` — gives Neon time to wake from cold start (default 5s is too short)
- `connection_limit=5` — keeps it low for serverless (Railway containers can run multiple instances)
- `pool_timeout=15` — time to wait for a connection from the pool
- `sslmode=require` — always required for Neon

### Railway Deployment Configuration

**Option A: Build-time migration (recommended for solo dev)**

```json
// package.json
{
  "scripts": {
    "build": "prisma generate && prisma migrate deploy && next build",
    "start": "next start"
  }
}
```

**Option B: Separate migration step (safer for teams)**

Use Railway's deploy hooks or a separate Railway service for migrations.

### Railway Nixpacks Configuration

Railway uses Nixpacks for builds. For Next.js + Prisma, it usually auto-detects correctly. If not:

```toml
# railway.toml (if needed)
[build]
buildCommand = "npm run build"

[deploy]
startCommand = "npm run start"
healthcheckPath = "/api/health"
healthcheckTimeout = 300
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 3
```

### Cold Start Handling Strategy

Railway containers themselves can cold start (if using scale-to-zero). Combined with Neon cold start, you can get double cold start delays.

**Mitigation:**

1. **Neon side:** Use `connect_timeout=15` (already set above)
2. **Railway side:** Keep at least 1 replica running (Railway Pro plan) or set `minScale: 1`
3. **Health check endpoint:**

```typescript
// app/api/health/route.ts
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`
    return Response.json({ status: "ok" })
  } catch (error) {
    return Response.json({ status: "error", message: String(error) }, { status: 500 })
  }
}
```

4. **Cron-based keep-alive** (free tier workaround):

Use an external cron service (Upstash QStash, cron-job.org) to ping your health endpoint every 4 minutes, keeping both Railway and Neon warm.

### Neon Dashboard Settings

- **Scale to zero:** Increase timeout to 10+ minutes on paid plan, or disable
- **Compute size:** Start with 0.25 CU (cheapest), scale up when needed
- **Auto-suspend:** The pooler stays warm even when compute suspends, but first query after suspend takes ~500ms-2s

### Migration Workflow

```bash
# Local development
npx prisma migrate dev --name add_users_table

# Preview before deploying
npx prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma

# Production (runs during Railway build)
npx prisma migrate deploy

# Emergency: reset production (DESTRUCTIVE)
# npx prisma migrate reset --force
```

---

## Quick Reference: Day-1 Checklist

### Environment Variables (.env)

```env
# Neon Postgres
DATABASE_URL="postgresql://...pooler.../neondb?sslmode=require&connect_timeout=15&connection_limit=5"
DIRECT_URL="postgresql://...direct.../neondb?sslmode=require&connect_timeout=15"

# Auth.js
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_RESEND_KEY="re_your_resend_api_key"

# App
NEXT_PUBLIC_APP_URL="https://yourdomain.com"
```

### Package Installation

```bash
# Core
npm install next@latest react@latest react-dom@latest
npm install prisma @prisma/client @auth/prisma-adapter next-auth@beta

# Resend for email
npm install resend

# PWA
npm install -D serwist @serwist/next

# Useful extras
npm install @upstash/ratelimit @upstash/redis  # rate limiting
npm install lucide-react                        # icons
```

### File Structure

```
app/
  api/
    auth/[...nextauth]/route.ts
    health/route.ts
  (auth)/
    login/page.tsx
    verify/page.tsx
  (app)/
    dashboard/page.tsx
  ~offline/page.tsx
  layout.tsx
  manifest.ts
  sw.ts
lib/
  prisma.ts
  auth.ts          # NextAuth config
  rate-limit.ts
prisma/
  schema.prisma
  migrations/
next.config.ts
```

---

## Sources

### Next.js + Prisma + Neon
- [Neon Docs: Connect from Prisma](https://neon.com/docs/guides/prisma)
- [Neon Docs: Connection Latency and Timeouts](https://neon.com/docs/connect/connection-latency)
- [Neon Docs: Connection Pooling](https://neon.com/docs/connect/connection-pooling)
- [Neon Docs: Schema Migrations with Prisma](https://neon.com/docs/guides/prisma-migrations)
- [Prisma Docs: Neon](https://www.prisma.io/docs/orm/overview/databases/neon)
- [Prisma Docs: Database Connections](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections)
- [Neon Docs: Use with Railway](https://neon.com/docs/guides/railway)

### Auth.js v5
- [Auth.js: Email Providers](https://authjs.dev/getting-started/authentication/email)
- [Auth.js: Resend Provider](https://authjs.dev/getting-started/providers/resend)
- [Auth.js: Configuring HTTP Email](https://authjs.dev/guides/configuring-http-email)
- [Auth.js: Credentials Provider](https://authjs.dev/getting-started/providers/credentials)
- [NextAuth Discussion: OTP with Custom Provider](https://github.com/nextauthjs/next-auth/discussions/2812)

### Event Sourcing
- [Bemi: Rethinking Event Sourcing](https://blog.bemi.io/rethinking-event-sourcing/)
- [Bemi Prisma: Automatic Data Change Tracking](https://github.com/BemiHQ/bemi-prisma)
- [Kurrent: Event Sourcing vs Audit Log](https://www.kurrent.io/blog/event-sourcing-audit)

### Serwist PWA
- [Serwist Docs: Getting Started with Next.js](https://serwist.pages.dev/docs/next/getting-started)
- [Serwist Docs: Turbopack Integration](https://serwist.pages.dev/docs/next)
- [Next.js Docs: Progressive Web Apps](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Serwist GitHub: Turbopack Support Issue](https://github.com/serwist/serwist/issues/54)
