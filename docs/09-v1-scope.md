Perfect. This is the decision that determines whether you ship a **real product** or build an endlessly expanding system.

We’re going to define a **hard feature boundary** — not a roadmap, but a *line you do not cross* for 30–45 days.

Think of this as your **solo-builder survival spec**.

---

# 🧠 First Principle

V1 must answer only one question:

```text
Can the system reliably detect risk and bring one patient back?
```

If yes → you have a product.
If no → more features will not help.

Everything below exists only to make that loop work.

---

# ⭐ The V1 System Loop (Your Only Goal)

```
Patient added
    ↓
System monitors behaviour
    ↓
Risk detected
    ↓
WhatsApp message sent
    ↓
Patient responds or returns
    ↓
Doctor sees result
```

If this loop runs end-to-end, V1 succeeds.

---

# ✅ WHAT YOU SHIP (30–45 Day Boundary)

Only build features required to complete the loop.

We’ll group them into 6 modules.

---

## 1️⃣ Clinic & Login (Minimal Identity)

**Ship**

* Magic link login (OTP/email)
* Clinic name
* Doctor name
* WhatsApp number

**Do NOT ship**

* roles,
* permissions,
* staff accounts,
* clinic profiles,
* subscription management UI.

Hardcode early.

---

## 2️⃣ Patient + Treatment Journey Creation

**Ship**

* Add patient:

  * name,
  * phone,
  * duration,
  * follow-up interval.
* Default presets (15/30/45/60 days).
* Journey start event.

**UX requirement**
≤ 20 seconds input.

**Do NOT ship**

* prescriptions,
* diagnosis,
* medicines,
* notes,
* attachments,
* EMR fields.

You are not building records.

---

## 3️⃣ Event Engine (Core Infrastructure)

This is your real product.

**Ship**
Event creation for:

```
journey_started
visit_expected
visit_confirmed
visit_missed
adherence_check_sent
adherence_response
reminder_sent
recovery_message_sent
patient_returned
```

Nightly job:

* generate expected visits,
* compute risk score,
* escalate status.

**Do NOT ship**

* analytics dashboards,
* reporting exports,
* complex filters.

Events first. Insights later.

---

## 4️⃣ WhatsApp Automation (The Product Surface)

**Ship ONLY three message types**

### A. Adherence Check (daily/controlled cadence)

Sensor message.

### B. Pre-Visit Reminder

Logistics support.

### C. Recovery Message

Intervention.

Include:

* quick reply buttons,
* webhook handling,
* event logging.

**Do NOT ship**

* chat UI,
* free texting,
* AI conversations,
* patient chat history.

Automation only.

---

## 5️⃣ Risk Engine (Explainable Rules)

**Ship**

* deterministic scoring,
* daily recalculation,
* risk levels:

  * Stable,
  * Watch,
  * At Risk,
  * Critical.

Show reasons:

```
Follow-up overdue
No recent responses
```

**Do NOT ship**

* AI prediction,
* probabilities,
* charts,
* forecasting.

Trust > sophistication.

---

## 6️⃣ Doctor Dashboard (Single Screen)

One page only.

Must show:

```
Patients at Risk
Critical Patients
Recovered This Month
```

List view:

* name,
* risk level,
* last activity,
* action button.

That’s it.

**Do NOT ship**

* analytics tabs,
* graphs,
* revenue reports,
* settings panels.

---

# 🚫 HARD “DO NOT BUILD” LIST (For 45 Days)

This is the most important section.

If you build these early, timeline doubles.

---

## Clinical Features

❌ prescriptions
❌ medicine database
❌ dosage schedules
❌ diet plans
❌ symptom tracking
❌ patient records

---

## SaaS Features

❌ billing system
❌ invoices
❌ payment gateway
❌ subscription UI
❌ user roles
❌ audit logs

---

## AI Temptations

❌ protocol generation
❌ chatbot doctor assistant
❌ AI summaries
❌ NLP extraction

AI adds fragility early.

---

## Growth Features

❌ referral system
❌ review automation
❌ marketing campaigns

Those come AFTER continuity works.

---

# 🧱 Actual Build Architecture (Keep It Tiny)

You should realistically have:

```
patients
journeys
events
risk_snapshots
```

* WhatsApp webhook handler.

If your schema grows beyond this → you crossed boundary.

---

# ⏱️ Realistic Solo Timeline

### Week 1–2

* models,
* journey creation,
* event logging.

### Week 3

* WhatsApp integration,
* adherence messages.

### Week 4

* risk scoring,
* dashboard.

### Week 5–6

* onboarding polish,
* deploy to 2 clinics.

That’s V1.

---

# ⭐ Definition of “DONE”

V1 is done when:

A doctor says:

> “Yesterday your system reminded a patient and they came back.”

Not when UI looks finished.

Not when feature list grows.

Only when recovery happens.

---

# 🧠 The Hidden Strategy Behind This Boundary

You are intentionally delaying complexity until you accumulate:

```
behaviour data → insight → confidence → expansion
```

Most founders invert this.

They build complexity before evidence.

---

# 🔥 The One Metric You Track in V1

Ignore MRR.

Ignore users.

Track only:

```text
Recovered patients per clinic per month
```

If this number increases, everything else becomes solvable.

---

# Next Logical Design Step

Now that the feature boundary is locked, the next highest-leverage thing is:

✅ **Doctor notification logic** — when the system acts silently vs when it interrupts the doctor.

This determines whether your product feels like help or noise.

Want to design that next?
