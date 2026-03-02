# Technology Stack Research — Ruthva (Clinic Management SaaS)

> Researched: 2026-03-01 | Target: Next.js 15, Railway deployment, greenfield project

---

## 1. Next.js 15 App Router Patterns

### Route Handlers for Webhooks

Route Handlers live in `app/api/*/route.ts`. They use standard Web Request/Response APIs. No bodyParser config needed.

```typescript
// app/api/webhooks/whatsapp/route.ts
export async function POST(request: Request) {
  try {
    const text = await request.text()
    // Process the webhook payload — verify signature, parse JSON, handle event
  } catch (error) {
    return new Response(`Webhook error: ${error.message}`, { status: 400 })
  }
  return new Response('Success!', { status: 200 })
}
```

Key points:
- Export named functions for HTTP methods: `GET`, `POST`, `PUT`, `DELETE`, `PATCH`
- Access headers via `request.headers`
- Access query params via `new URL(request.url).searchParams`
- Return `new Response()` or `NextResponse.json()`

### Server Actions for Form Submissions

```typescript
// app/actions/appointment.ts
'use server'

import { revalidatePath } from 'next/cache'

export async function createAppointment(formData: FormData) {
  const rawFormData = {
    patientName: formData.get('patientName'),
    date: formData.get('date'),
    clinicId: formData.get('clinicId'),
  }
  // Validate with zod, save to DB, then:
  revalidatePath('/appointments')
}
```

```tsx
// In a component:
export default function Page() {
  return <form action={createAppointment}>...</form>
}
```

Key points:
- Mark with `'use server'` directive
- Receives FormData automatically
- Use `revalidatePath()` or `revalidateTag()` after mutations
- Use `redirect()` from `next/navigation` for post-action navigation
- Use `useFormStatus()` for pending states, `useActionState()` for error handling

### Middleware for Auth Protection

```typescript
// middleware.ts (project root, next to app/)
import { NextRequest, NextResponse } from 'next/server'
import { decrypt } from '@/app/lib/session'
import { cookies } from 'next/headers'

const protectedRoutes = ['/dashboard', '/appointments', '/patients']
const publicRoutes = ['/login', '/signup', '/']

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
  const isPublicRoute = publicRoutes.includes(path)

  const cookie = (await cookies()).get('session')?.value
  const session = await decrypt(cookie)

  if (isProtectedRoute && !session?.userId) {
    return NextResponse.redirect(new URL('/login', req.nextUrl))
  }

  if (isPublicRoute && session?.userId && !path.startsWith('/dashboard')) {
    return NextResponse.redirect(new URL('/dashboard', req.nextUrl))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|.*\\.png$).*)'],
}
```

Key points:
- File must be at project root (next to `app/`)
- Use `matcher` to exclude static assets, API routes
- Middleware runs on Edge Runtime -- keep lightweight
- For Auth.js integration, can export `auth as middleware` from `@/auth`

### Cron/Scheduled Tasks on Railway

Railway does not have native cron. Recommended approaches:

1. **Upstash QStash** (recommended for serverless): Calls your route handlers on schedule
2. **Separate worker service**: Deploy a Node.js service with `node-cron` or `bullmq`
3. **External cron**: Services like cron-job.org, EasyCron

```typescript
// app/api/cron/send-reminders/route.ts
import { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }
  // Run scheduled task logic (send appointment reminders, etc.)
  return Response.json({ success: true })
}
```

---

## 2. Prisma ORM with PostgreSQL

### Event Table with JSONB Metadata

```prisma
generator client {
  provider = "prisma-client"
  output   = "./generated"
}

datasource db {
  provider = "postgresql"
}

model Event {
  id          String   @id @default(cuid())
  clinicId    String   @map("clinic_id")
  type        String   // e.g., "appointment_booked", "reminder_sent"
  metadata    Json     @default("{}") // JSONB column in PostgreSQL
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  clinic      Clinic   @relation(fields: [clinicId], references: [id])

  @@index([clinicId])
  @@index([type])
  @@index([createdAt])
  @@map("events")
}
```

Querying JSONB fields:
```typescript
const events = await prisma.event.findMany({
  where: {
    clinicId: 'clinic_123',
    metadata: {
      path: ['appointmentId'],
      equals: 'apt_456',
    },
  },
})
```

### Multi-Tenant SaaS Pattern (clinic_id Scoping)

Row-Level Scoping: Add `clinicId` to every tenant-owned model.

```prisma
model Clinic {
  id            String         @id @default(cuid())
  name          String
  slug          String         @unique
  patients      Patient[]
  appointments  Appointment[]
  events        Event[]
  users         User[]
  createdAt     DateTime       @default(now()) @map("created_at")
  updatedAt     DateTime       @updatedAt @map("updated_at")
  deletedAt     DateTime?      @map("deleted_at")

  @@map("clinics")
}

model Patient {
  id          String   @id @default(cuid())
  clinicId    String   @map("clinic_id")
  name        String
  phone       String
  metadata    Json     @default("{}")
  clinic      Clinic   @relation(fields: [clinicId], references: [id])

  @@index([clinicId])
  @@map("patients")
}
```

Prisma Client Extension for automatic tenant scoping:
```typescript
const prismaWithTenant = prisma.$extends({
  query: {
    $allModels: {
      async findMany({ args, query }) {
        args.where = { ...args.where, clinicId: getCurrentClinicId() }
        return query(args)
      },
    },
  },
})
```

### Migration Workflow

```bash
# Development: create and apply migration
npx prisma migrate dev --name add_events_table

# Production: apply pending migrations (in CI/CD)
npx prisma migrate deploy

# Generate client after schema changes
npx prisma generate

# Reset database (development only)
npx prisma migrate reset
```

### Connection Pooling on Railway

Railway provides direct PostgreSQL. For production pooling, use PgBouncer or Prisma Accelerate.

```env
# .env
# PgBouncer (pooled) — used by Prisma Client at runtime
DATABASE_URL="postgres://USER:PASSWORD@HOST:PORT/DATABASE?pgbouncer=true"
# Direct — used by Prisma CLI for migrations
DIRECT_URL="postgres://USER:PASSWORD@HOST:PORT/DATABASE"
```

```typescript
// prisma.config.ts
import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: env('DIRECT_URL') },
})
```

```typescript
// lib/db.ts
import { PrismaClient } from '../prisma/generated/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
export const prisma = new PrismaClient({ adapter })
```

Set `connection_limit=10` or lower on Railway to avoid exhausting connections.

---

## 3. Auth.js (NextAuth v5) — Magic Link / Email Provider

### Core Configuration

```typescript
// auth.ts
import NextAuth from "next-auth"
import Nodemailer from "next-auth/providers/nodemailer"
import Resend from "next-auth/providers/resend"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/db"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    // Option A: Nodemailer with custom SMTP
    Nodemailer({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: Number(process.env.EMAIL_SERVER_PORT),
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD,
        },
      },
      from: process.env.EMAIL_FROM,
      maxAge: 60 * 60, // 1 hour link expiry
      async sendVerificationRequest({ identifier, url, provider }) {
        const { host } = new URL(url)
        await transporter.sendMail({
          to: identifier,
          from: provider.from,
          subject: `Sign in to ${host}`,
          html: `
            <body style="background: #f9f9f9;">
              <table style="padding: 20px; margin: 0 auto;">
                <tr><td>
                  <h1>Sign in to ${host}</h1>
                  <a href="${url}" style="background: #346df1; color: #fff; padding: 12px 20px; text-decoration: none; border-radius: 5px;">Sign in</a>
                  <p>If you did not request this email, you can safely ignore it.</p>
                </td></tr>
              </table>
            </body>
          `,
        })
      },
    }),

    // Option B: Resend (simpler setup)
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: "Auth <noreply@yourdomain.com>",
    }),
  ],
  pages: {
    signIn: "/auth/login",
    verifyRequest: "/auth/verify-request",
  },
  session: { strategy: "database" }, // Required for email provider
  callbacks: {
    async session({ session, user }) {
      session.user.clinicId = user.clinicId
      session.user.role = user.role
      return session
    },
  },
})
```

### API Route Setup

```typescript
// app/api/auth/[...nextauth]/route.ts
import { handlers } from "@/auth"
export const { GET, POST } = handlers
```

### Server Action for Magic Link

```typescript
// app/actions/auth.ts
'use server'
import { signIn } from "@/auth"

export async function sendMagicLink(formData: FormData) {
  await signIn("nodemailer", {
    email: formData.get("email"),
    redirectTo: "/dashboard",
  })
}
```

### Session Management

Server-side (Server Components / Route Handlers):
```typescript
import { auth } from "@/auth"

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/auth/login")
  return <div>Welcome {session.user.name}</div>
}
```

Client-side:
```typescript
// app/providers.tsx
"use client"
import { SessionProvider } from "next-auth/react"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus={true}>
      {children}
    </SessionProvider>
  )
}
```

### Protecting API Routes

```typescript
// app/api/patients/route.ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export const GET = auth(function GET(req) {
  if (req.auth) return NextResponse.json(req.auth)
  return NextResponse.json({ message: "Not authenticated" }, { status: 401 })
})
```

### Middleware Protection (Auth.js native)

```typescript
// middleware.ts — simplest approach
export { auth as middleware } from "@/auth"

export const config = {
  matcher: ["/dashboard/:path*", "/api/patients/:path*"],
}
```

### Required Prisma Schema for Auth.js

```prisma
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime? @map("email_verified")
  image         String?
  clinicId      String?   @map("clinic_id")
  role          String    @default("member")
  accounts      Account[]
  sessions      Session[]
  clinic        Clinic?   @relation(fields: [clinicId], references: [id])
  @@map("users")
}

model Account {
  userId            String  @map("user_id")
  type              String
  provider          String
  providerAccountId String  @map("provider_account_id")
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?
  user              User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@id([provider, providerAccountId])
  @@map("accounts")
}

model Session {
  sessionToken String   @unique @map("session_token")
  userId       String   @map("user_id")
  expires      DateTime
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@map("sessions")
}

model VerificationToken {
  identifier String
  token      String
  expires    DateTime
  @@id([identifier, token])
  @@map("verification_tokens")
}
```

---

## 4. Gupshup WhatsApp API

### Sending Template Messages with Interactive Buttons

**API Endpoint:** `POST https://api.gupshup.io/wa/api/v1/template/msg`

```typescript
// lib/gupshup.ts
const GUPSHUP_API_URL = 'https://api.gupshup.io/wa/api/v1/template/msg'

export async function sendTemplateMessage({
  to,
  templateId,
  params,
}: {
  to: string
  templateId: string
  params: string[]
}) {
  const message = { id: templateId, params }

  const response = await fetch(GUPSHUP_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      apikey: process.env.GUPSHUP_API_KEY!,
    },
    body: new URLSearchParams({
      source: process.env.GUPSHUP_SOURCE_NUMBER!,
      destination: to,
      template: JSON.stringify(message),
      'src.name': process.env.GUPSHUP_APP_NAME!,
    }),
  })

  return response.json()
}
```

**Button Types:**
- **Quick Reply**: Max 3 buttons, predefined replies with payload
- **Call-to-Action**: Max 2 buttons, call number or visit website
- **2025 update**: Up to 10 mixed buttons per template

**Template Example:**
```json
{
  "id": "appointment_reminder",
  "params": ["John", "March 15, 2026", "10:00 AM", "Dr. Smith"],
  "buttons": [
    { "type": "quick_reply", "text": "Confirm", "payload": "CONFIRM_APT_123" },
    { "type": "quick_reply", "text": "Reschedule", "payload": "RESCHEDULE_APT_123" },
    { "type": "quick_reply", "text": "Cancel", "payload": "CANCEL_APT_123" }
  ]
}
```

### Webhook for Incoming Messages

```typescript
// app/api/webhooks/whatsapp/route.ts
import { NextRequest } from 'next/server'

interface GupshupIncomingMessage {
  app: string
  timestamp: number
  version: number
  type: string          // 'message' | 'message-event'
  payload: {
    id: string
    source: string      // sender phone
    destination: string // your business number
    type: string        // 'text' | 'image' | 'button_reply' | 'list_reply'
    payload: {
      text?: string
      title?: string    // for button_reply
      id?: string       // button payload ID
    }
    sender: {
      phone: string
      name: string
      country_code: string
      dial_code: string
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as GupshupIncomingMessage

    if (body.type === 'message') {
      const { payload } = body
      const senderPhone = payload.source
      const messageType = payload.type

      if (messageType === 'text') {
        const text = payload.payload.text
        // Handle text message
      } else if (messageType === 'button_reply') {
        const buttonId = payload.payload.id
        const buttonTitle = payload.payload.title
        // Handle button reply from quick reply templates
      }
    }

    return Response.json({ status: 'ok' })
  } catch (error) {
    console.error('Webhook error:', error)
    return Response.json({ error: 'Failed' }, { status: 400 })
  }
}
```

### Message Status Callbacks

```typescript
// Status events come to the same webhook URL
if (body.type === 'message-event') {
  const status = body.payload.type // 'sent' | 'delivered' | 'read' | 'failed'
  const messageId = body.payload.gsId
  await prisma.messageLog.update({
    where: { gupshupId: messageId },
    data: { status, statusUpdatedAt: new Date() },
  })
}
```

### Template Approval Requirements

- Submit via Gupshup dashboard for WhatsApp approval
- Categories: MARKETING, UTILITY, AUTHENTICATION
- Approval takes 24-48 hours typically
- Template names: lowercase with underscores only
- Variables: `{{1}}`, `{{2}}` etc.
- Body: up to 1024 characters; Footer: optional, up to 60 characters
- Header: text, image, video, or document

### 2025 Deprecation Notices

- **Callback URL API deprecated by April 30, 2025** — migrate to Subscription API
- New modes: FLOW_MESSAGE, PAYMENTS, FAILED, BILLING
- Up to 5 subscriptions per app
- Callback URL required for receiving messages (sandbox no longer shows them since Jan 29, 2025)

---

## 5. Serwist PWA for Next.js 15 App Router

### Installation

```bash
npm i @serwist/next serwist
```

### Next.js Configuration

```typescript
// next.config.ts
import { spawnSync } from "node:child_process"
import withSerwistInit from "@serwist/next"

const revision = spawnSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf-8",
}).stdout?.trim() ?? crypto.randomUUID()

const withSerwist = withSerwistInit({
  additionalPrecacheEntries: [{ url: "/~offline", revision }],
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  cacheOnFrontEndNav: true,
  reloadOnOnline: false,    // Prevent data loss on forms
  disable: process.env.NODE_ENV === "development",
})

export default withSerwist({
  // Your existing Next.js config
})
```

### Service Worker

```typescript
// app/sw.ts
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

### TypeScript Config Addition

```json
{
  "compilerOptions": {
    "types": ["@serwist/next/typings"],
    "lib": ["esnext", "webworker", "dom", "dom.iterable"]
  }
}
```

### Offline Fallback Page

```tsx
// app/~offline/page.tsx
export default function OfflinePage() {
  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <h1>You are offline</h1>
      <p>Please check your internet connection and try again.</p>
    </div>
  )
}
```

### Web App Manifest

```json
{
  "name": "Ruthva - Clinic Management",
  "short_name": "Ruthva",
  "icons": [
    { "src": "/icons/android-chrome-192x192.png", "sizes": "192x192", "type": "image/png", "purpose": "maskable" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ],
  "theme_color": "#FFFFFF",
  "background_color": "#FFFFFF",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait"
}
```

### Layout PWA Metadata

```typescript
// app/layout.tsx
import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
  applicationName: "Ruthva",
  title: { default: "Ruthva - Clinic Management", template: "%s - Ruthva" },
  description: "Clinic management and patient engagement platform",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "Ruthva" },
  formatDetection: { telephone: false },
}

export const viewport: Viewport = { themeColor: "#FFFFFF" }
```

### Push Notifications (Future)

```typescript
// In service worker (app/sw.ts) — add before serwist.addEventListeners():
self.addEventListener("push", (event) => {
  const data = event.data?.json() ?? {}
  event.waitUntil(
    self.registration.showNotification(data.title ?? "Notification", {
      body: data.body,
      icon: "/icons/android-chrome-192x192.png",
      data: data.url ? { url: data.url } : undefined,
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  if (event.notification.data?.url) {
    event.waitUntil(self.clients.openWindow(event.notification.data.url))
  }
})
```

Client-side subscription:
```typescript
async function subscribeToPush() {
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
  })
  await fetch("/api/push/subscribe", {
    method: "POST",
    body: JSON.stringify(subscription),
  })
}
```

---

## Documentation Sources

- [Next.js App Router docs](https://nextjs.org/docs/app)
- [Prisma PostgreSQL docs](https://www.prisma.io/docs/orm/overview/databases/postgresql)
- [Prisma PgBouncer docs](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/pgbouncer)
- [Auth.js (NextAuth v5) docs](https://authjs.dev)
- [Gupshup Template Messages](https://docs.gupshup.io/docs/template-messages)
- [Gupshup Webhooks](https://docs.gupshup.io/docs/webhooks-2)
- [Gupshup Message Events](https://docs.gupshup.io/docs/message-events)
- [Gupshup 2025 Updates](https://support.gupshup.io/hc/en-us/articles/42866242419609)
- [Serwist Next.js docs](https://serwist.pages.dev/docs/next/getting-started)
