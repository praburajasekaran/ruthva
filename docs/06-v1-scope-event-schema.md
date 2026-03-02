# V1 Scope & Event Schema

> Split from `brainstorm.md` — Covers the ruthlessly small V1 feature boundary, 4-screen UI constraint, event-driven data architecture, attendance tracking, and build timeline.

---

# 🧠 First Principle: What V1 Is *Not*

V1 is NOT:

❌ practice management
❌ EMR
❌ prescription builder
❌ full protocol engine
❌ AI diagnosis
❌ analytics dashboards

Those are expansion layers.

Your V1 has only one job:

```text
Detect disappearing patients and bring them back automatically.
```

If you solve only this, you already create value.

---

# 🎯 V1 Product Identity

Do not think:

> "AYUSH software."

Think:

```text
Missed Patient Recovery System for AYUSH Clinics
```

Single outcome.

Single promise.

---

# ⭐ The Magic Moment (Design Around This)

Doctor opens dashboard and sees:

```
⚠️ 11 patients likely to drop treatment this week
₹86,000 revenue at risk
[Recover Now]
```

That moment sells the product.

Everything else exists to produce this screen.

---

# 🧱 Ruthlessly Small V1 Scope

## Core Capability = 4 Things Only

---

## 1️⃣ Patient + Treatment Capture (Ultra Minimal)

Doctor or staff adds:

* Patient name
* Phone number
* Treatment duration (e.g., 30 days / 60 days)
* Follow-up frequency (weekly / biweekly)

That's it.

NO complex case sheets.

Input time target:
👉 **under 20 seconds**

---

### UX Trick (important)

Instead of forms:

```
Paste prescription text →
AI extracts structure →
User confirms
```

Claude excels here.

---

## 2️⃣ Expected Visit Engine (Invisible Logic)

System calculates:

```
Treatment = 60 days
Follow-up = every 7 days
→ expected visits timeline created automatically
```

You now know when absence = risk.

This is your first intelligence layer.

---

## 3️⃣ Drop-off Detection (Core Algorithm)

Simple rule initially:

```
If expected visit missed + 3 days
→ patient marked AT RISK
```

No AI needed yet.

Rules beat intelligence early.

---

## 4️⃣ WhatsApp Recovery Automation

System sends:

* reminder,
* gentle compliance message,
* follow-up booking prompt.

Example:

> "Doctor asked us to check — continuing treatment regularly improves results. Shall we help schedule your next visit?"

Clinic sees patient return.

ROI becomes obvious.

---

# 🧩 That's the Entire V1

Nothing else.

No reports.
No billing.
No EMR.

Just continuity recovery.

---

# 📱 Minimal Screens (Only 4)

You should literally limit yourself to this.

---

## Screen 1 — Today Dashboard

```
Patients at risk: 8
Recovered this month: 14
Revenue protected: ₹1.2L
```

Primary action:
👉 Recover patients.

---

## Screen 2 — Add Patient

Fast entry or paste prescription.

---

## Screen 3 — At-Risk Patients List

* name,
* last visit,
* risk level,
* message sent status.

---

## Screen 4 — Patient Timeline (Simple)

```
Treatment started
Reminder sent
Missed visit
Recovered
```

Event-based from day one.

---

# 🚀 Why This Feels Magical

Doctors currently have:

❌ zero visibility.

You give:

✅ predictive visibility.

Prediction feels like intelligence even when rule-based.

---

# 🧠 Hidden Moat You Start Building Immediately

Even V1 collects events:

```
treatment_started
visit_expected
visit_missed
message_sent
patient_returned
```

After months:

You learn adherence patterns.

Competitors starting later cannot recreate history.

---

# ⛔ Features You MUST Reject in V1

You will feel tempted. Don't.

Do NOT add:

* prescription templates,
* inventory,
* diet charts,
* patient app,
* analytics reports,
* AI chatbots,
* billing.

Each delays learning.

---

# 📆 Realistic Solo Builder Timeline

## Week 1

* patient model,
* treatment logic,
* dashboard skeleton.

## Week 2

* WhatsApp integration,
* reminder automation.

## Week 3

* risk detection,
* timeline events.

## Week 4

* onboarding flow,
* deploy to first clinics.

Ship imperfectly.

Learning > polish.

---

# ⭐ The Key Psychological Rule

V1 must feel like:

> "How did we run the clinic without this?"

Not:

> "Nice additional software."

---

# 🔥 Success Metric (Only One)

Ignore signups.

Track:

```text
Recovered patients per clinic per month.
```

If this number grows → you have product-market fit signal.

---

# 🧭 What This Unlocks Next (Without Rebuild)

Once adopted, you naturally add:

1. protocol guidance,
2. adherence scoring,
3. therapy tracking,
4. outcome analytics,
5. AYUSH intelligence layer.

All from same foundation.

---

# The Real Reason This Works for You

As a solo AI-native builder:

* small surface area,
* strong UX leverage,
* rapid iteration,
* behavioural data accumulation.

You win through speed and insight, not feature breadth.

---

# Critique & Refinements

## What's Genuinely Right

The **single-outcome discipline** is the hardest thing for builders to maintain, and this spec nails it. "Detect disappearing patients and bring them back" — that's not a feature list, that's a business promise.

The **magic moment screen** is correctly identified. That "₹86,000 revenue at risk" dashboard is what sells the product in demos, in screenshots, in WhatsApp forwards between doctors.

The **4-screen constraint** is brutal and correct. Every additional screen in V1 is a week of building + a week of debugging + a lifetime of maintaining.

The **event-based data model** from day one is the smartest architectural decision here.

## Subtle Risks

**1. The "20-second input" promise is your make-or-break moment.**

The real design question isn't "how fast can someone enter data" — it's **"who enters the data, and what's their existing workflow?"**

If the answer is "staff writes in a register" → your input should feel like a digital register, not a form. Consider: WhatsApp-based intake where staff just sends a message like "Murugan 9876543210 varmam 30d weekly" and the system parses it.

**2. The "paste prescription → AI extracts" UX trick is a V1.5 feature, not V1.**

For V1, a simple structured input (name, phone, duration, frequency) with maybe 3 tap-selectable defaults for common durations is faster to build AND more reliable.

**3. The WhatsApp automation has a compliance nuance.**

Sending health-related messages via WhatsApp Business API requires the message to NOT contain specific medical information. Build the templates carefully from day one.

**4. The 4-week timeline is optimistic but not impossible.**

Realistic adjustment:

- Week 1-2: Core models + basic dashboard (functional, ugly)
- Week 3: WhatsApp integration (this alone will eat a week — Twilio/Gupshup setup, message templates approval, webhook handling)
- Week 4-5: Risk detection + onboarding polish
- Week 5-6: Deploy to 2-3 friendly clinics

Call it **6 weeks to first real clinic**.

## The One Thing That's Missing

**How does the system know a patient actually visited?**

Three options, in order of simplicity:

1. **Staff marks attendance** — one tap on the patient name each visit day
2. **WhatsApp check-in** — patient confirms visit via reply
3. **Assume missed unless marked** — default every expected visit to "missed" and only clear it if staff confirms

Option 3 is the most V1-appropriate. False alerts that lead to "oh they did come, let me mark it" are actually **your onboarding mechanism** for daily usage.

---

# 🧱 The Event Architecture (V1-Safe)

## 🧠 First Principle: Don't Model Records — Model Time

Most clinic software models **objects**:

```
Patient
Appointment
Prescription
```

Your product must model **progression over time**.

Because drop-off detection is fundamentally a **temporal problem**.

So instead of:

```text
patient_status = active
```

we store:

```text
events describing what happened
```

Everything becomes reconstructable from events.

---

# ⭐ Core Concept

Your entire system revolves around one entity:

```text
TREATMENT JOURNEY
```

Not patient.
Not visit.
Not prescription.

A patient can have many journeys.

---

# You only need **three layers**.

```
Entities  →  Journeys  →  Events
```

---

## 1️⃣ Entities (Stable Data)

These rarely change.

### Patient

```
patient_id
name
phone
clinic_id
created_at
```

---

### Clinic

```
clinic_id
name
timezone
whatsapp_number
```

---

### Treatment Journey (CRITICAL TABLE)

This is your real product object.

```
journey_id
patient_id
start_date
duration_days
followup_interval_days
status (active/completed/dropped)
created_by
```

Think:

> "Murugan's 30-day Varmam treatment"

—not Murugan himself.

---

# 2️⃣ Events (The Heart of the System)

Everything meaningful becomes an event.

Single table:

```
events
------
event_id
journey_id
event_type
event_time
metadata (JSON)
created_by (system/user/patient)
```

Yes — one table.

This is how Shopify, Stripe, and modern SaaS systems scale.

---

## V1 Event Types (Only 8 Needed)

### Setup Events

```
journey_started
```

metadata:

```
duration: 30
interval: 7
```

---

### Expected Behaviour (SYSTEM GENERATED)

```
visit_expected
```

Generated automatically.

This is your prediction baseline.

---

### Reality Signals

```
visit_confirmed
visit_missed
```

This solves your "how do we know visits happened?" problem.

---

### Communication Events

```
reminder_sent
patient_replied
recovery_message_sent
```

---

### Outcome Event

```
patient_returned
```

This powers your ROI dashboard.

---

# 🔁 How Drop-Off Detection Actually Works

No status fields.

Just logic over events.

---

## Example Timeline

```
Day 0   journey_started
Day 7   visit_expected
Day 10  (no confirmation)
        → system emits visit_missed
        → recovery_message_sent
Day 11  patient_returned
```

Risk = absence of expected events.

That's the key idea.

---

# ✅ Solving the Attendance Problem

## Default Rule

Every expected visit becomes:

```
visit_expected
```

If no confirmation within X days:

```
visit_missed (system event)
```

---

## Confirmation Methods (Add Gradually)

V1 allows ANY of these to create:

```
visit_confirmed
```

### Method A (Primary)

Staff taps:

✅ "Visited"

(one-tap action)

---

### Method B (Later)

Patient replies WhatsApp:

> "Yes"

Webhook → event recorded.

---

### Method C (Future)

QR check-in at clinic.

Same event emitted.

---

Notice:

All inputs map to SAME event.

Your system stays clean forever.

---

# 📊 How Dashboard Calculates Magic Numbers

No stored analytics needed.

Query events:

```
at_risk_patients =
count(visit_expected)
- count(visit_confirmed)
```

Revenue at risk:

```
remaining_days × avg_visit_value
```

Derived dynamically.

---

# 🧠 Why This Schema Is Extremely Powerful Later

Without changing structure you can add:

* adherence score,
* relapse prediction,
* protocol comparison,
* clinic benchmarking,
* AI insights.

Because intelligence = patterns across events.

You already captured them.

---

# 🚨 Important Constraint (Solo Builder Rule)

You must resist adding tables like:

```
appointments
attendance
reminders
alerts
```

All of these are **views over events**, not core data.

Event table stays source of truth.

---

# 🧩 What Your Database Roughly Looks Like

```
patients
clinics
journeys
events   ← 90% of future power lives here
```

That's it.

Four tables.

Anything more in V1 is overbuilding.

---

# ⭐ The Non-Obvious Advantage You Just Created

Your product now measures something nobody in AYUSH currently measures:

```text
treatment continuity as a measurable signal.
```

That becomes your long-term category ownership.

Not reminders.
Not WhatsApp.
Continuity intelligence.

---

# 🧭 What Happens After 10 Clinics

You begin learning:

* real drop-off timelines,
* protocol adherence patterns,
* optimal follow-up timing,
* behaviour differences by treatment type.

Competitors starting later cannot reconstruct this history.

This is your silent moat formation.
