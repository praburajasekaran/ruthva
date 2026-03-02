# Institutional Knowledge: Next.js + PostgreSQL + WhatsApp SaaS Development

## RUTHVA Project — AYUSH Compliance & Patient Recovery Platform

### Strategic Architecture (WhatsApp-Native Treatment Execution Engine)

**Core Concept:** Not a reminder tool, but a **Treatment Execution Engine** with WhatsApp as the interface layer.

**Wedge Strategy (4-Stage Revenue Path):**
1. **Operational Pain**: Automate doctor's complex protocol documentation → structured WhatsApp patient guidance
2. **Revenue Protection**: Reduce churn through adherence tracking → flag at-risk patients before dropout
3. **Growth Engine**: Detect positive milestones → trigger automated review/referral requests
4. **Intelligence Layer**: Aggregate longitudinal healing data → build AYUSH outcome intelligence graph

**Moat Formation**: Event-based data accumulation creates competitive advantage that cannot be replicated quickly once 10+ clinics are deployed.

### V1 Scope Boundary (45-Day Solo Build)

**Product Promise**: "Detect disappearing patients and bring them back automatically"

**Core Loop:**
```
Patient Added → System Monitors → Risk Detected → WhatsApp Sent → Patient Returns → Doctor Sees Result
```

**What Ships (6 Modules):**
1. **Clinic & Login**: Magic link OTP, clinic name, doctor name, WhatsApp number (no roles/permissions yet)
2. **Patient + Journey Creation**: Name, phone, duration, follow-up interval | UX target ≤20 seconds
3. **Event Engine**: Core infrastructure tracking 8 event types
4. **WhatsApp Automation**: Only 3 message types (adherence check, pre-visit reminder, recovery message)
5. **Risk Engine**: Deterministic daily scoring (Stable/Watch/At Risk/Critical)
6. **Doctor Dashboard**: Single screen showing at-risk patients, critical patients, recovered this month

**Hard "Do Not Build" (45-Day Boundary):**
- ❌ Prescriptions, medicine database, dosage schedules, diet plans, symptom tracking, patient records
- ❌ Billing, invoices, payment gateway, subscription UI, user roles, audit logs
- ❌ Protocol generation, chatbot, AI summaries, NLP extraction
- ❌ Referral system, review automation, marketing campaigns

**Database Schema (4 Tables Only):**
```
patients (patient_id, name, phone, clinic_id, created_at)
clinics (clinic_id, name, timezone, whatsapp_number)
journeys (journey_id, patient_id, start_date, duration_days, followup_interval_days, status, created_by)
events (event_id, journey_id, event_type, event_time, metadata JSON, created_by)
```

**Realistic Timeline:**
- Week 1-2: Models, journey creation, event logging
- Week 3: WhatsApp integration, adherence messages
- Week 4: Risk scoring, dashboard
- Week 5-6: Onboarding polish, deploy to 2 clinics

**Success Metric (Only One)**: Recovered patients per clinic per month

### Event-Driven Architecture (Silent Moat)

**Key Design Principle**: Model progression over time, not records. Everything reconstructable from events.

**Why This Scales:**
- No status fields → pure event queries
- Query: `at_risk = count(visit_expected) - count(visit_confirmed)`
- Future additions (adherence score, relapse prediction, benchmarking) derive from same event table
- Competitors starting later cannot recreate historical data

**V1 Event Types:**
```
journey_started
visit_expected (system-generated)
visit_confirmed
visit_missed
adherence_check_sent
adherence_response
reminder_sent
patient_returned
```

**Attendance Problem Solution:**
- Default every expected visit to `visit_missed`
- Mark confirmed via: staff tap, patient WhatsApp reply, or QR check-in
- All map to same `visit_confirmed` event

---

## STUDY-ABROAD-SERVICE Project — Multi-Tenant CRM for Education

### Django + PostgreSQL + Railway Deployment Patterns

**Critical Production Deployment Checklist:**

1. **ALLOWED_HOSTS Configuration**
   - Set `ALLOWED_HOSTS` env var immediately during Railway setup
   - Include `*.up.railway.app` wildcard
   - Use `RAILWAY_PUBLIC_DOMAIN` as fallback in production.py
   - Prevents HTTP 400 "Invalid HTTP_HOST header" errors

2. **SSL Redirect Loop (Most Dangerous)**
   - Railway terminates TLS at edge, forwards HTTP to app
   - `SECURE_SSL_REDIRECT = True` causes infinite 301 loop without `SECURE_PROXY_SSL_HEADER`
   - **MUST pair together** in production.py:
   ```python
   SECURE_SSL_REDIRECT = True
   SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
   ```
   - Applies to Render, Heroku, Fly.io too

3. **Redis Connection Failures**
   - REDIS_URL env var must be explicitly linked in Railway dashboard
   - Don't use localhost fallback (fails silently at runtime)
   - Keep `env("REDIS_URL")` without default so missing config fails loudly at boot

---

## MOTIONIFY Project — Next.js Portal SaaS Patterns

### API Field Name Mismatch → Data Loss Pattern

**The Problem**: Frontend → API → Backend field name mismatches cause silent data loss on refresh.

**Root Causes (Cascading):**
1. Backend returns `assignedTo`, frontend expects `assigneeId` → undefined fields
2. Backend `allowedFields` lists `'deadline'`, Zod schema outputs `'dueDate'` → field never matches
3. Truthy checks `if (updates.description)` prevent clearing fields to empty/null

**Prevention Pattern:**
When field flows DB → Backend → Frontend:
1. ✅ Verify `mapTaskFromDB()` output field names
2. ✅ Verify Zod schema field names (must match)
3. ✅ Verify `allowedFields` array matches Zod output
4. ✅ Use `!== undefined` checks, not truthy checks

**Solution Pattern**: Add mapping layer
```typescript
function mapApiTask(task: any): Task {
    return {
        ...task,
        assigneeId: task.assignedTo || task.assigneeId,
        deadline: task.deadline || task.dueDate,
    };
}
// Apply to ALL API response handlers
```

---

## Cross-Project SaaS Architectural Principles

### 1. Event-Driven Systems
- Single events table with JSON metadata
- Enables future analytics/intelligence without schema changes
- Competitors can't replicate historical data once accumulated

### 2. Multi-Tenant SaaS Structure
- Org-slug in URL routes
- Real-time UI updates via HTMX polling (30s cadence)
- Transparent permission/role assignment in dashboard

### 3. WhatsApp Integration
- Use Twilio/Gupshup for message templates
- Require template approval before deploy
- Webhook handling for quick-reply parsing
- Cannot send medical info in messages (compliance constraint)

### 4. Deployment (Railway Pattern → Generalizable)
- Reverse proxy always terminates SSL → always set proxy header
- Link all plugin variables (Redis, Postgres) explicitly in dashboard
- ALLOWED_HOSTS must include wildcard for generated domains
- Use env var checklist `.env.example` for cold deployments

---

## SaaS Product Design First Principle

**Ship the continuity loop, not the feature list.**
- Ruthva: Detect → Recover → Repeat
- Study-Abroad: Intake → Score → Nurture → Enroll
- Motionify: Create → Assign → Track → Deliver

Define "DONE" by **observable customer outcome**, not feature completion or polish.

**Ruthva V1 is done when:** "A doctor said yesterday your system reminded a patient and they came back."

---

## Relevant Source Files

- `/Users/praburajasekaran/Documents/local-htdocs/ruthva/docs/04-whatsapp-protocol-wedge.md` — Strategic moat and reframing
- `/Users/praburajasekaran/Documents/local-htdocs/ruthva/docs/09-v1-scope.md` — V1 boundary and ship list
- `/Users/praburajasekaran/Documents/local-htdocs/ruthva/docs/06-v1-scope-event-schema.md` — Event architecture deep dive
- `/Users/praburajasekaran/Documents/local-htdocs/study-abroad-service/docs/solutions/deployment/django-railway-deployment-issues.md` — Production deployment patterns
- `/Users/praburajasekaran/Documents/local-htdocs/motionify-gai-1/docs/solutions/integration-issues/api-field-name-mismatch-task-data-loss.md` — API field mapping prevention
