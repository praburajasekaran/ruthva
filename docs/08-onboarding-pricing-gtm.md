# Onboarding, Pricing & Go-to-Market Strategy

> Split from `brainstorm.md` — Covers the 5-minute doctor onboarding flow, pricing model design, GTM strategy, positioning, and the "notebook objection" reframing.

---

# 🧠 First Principle of Onboarding

Your onboarding must achieve one psychological outcome:

```text
Doctor believes: "This will run automatically without adding work."
```

Not *understands features*.
Not *likes UI*.
Believes workload decreases.

Everything below is designed around that belief.

---

You are not onboarding a user.

You are staging a **future reality preview**.

The doctor must see:

1. A patient added,
2. Messages automatically generated,
3. Drop-off detected,
4. Recovery triggered.

All within minutes.

They must mentally fast-forward to usage.

---

# ⭐ The 5-Minute Onboarding Goal

At minute 5, the doctor sees:

```text
⚠️ 1 patient at risk
Recovery message ready
```

Even if it's simulated.

That is your activation moment.

---

# 🧭 Onboarding Structure (Exactly 5 Steps)

No signup maze.
No feature explanation.

Just progression.

---

## STEP 1 — Identity (30 seconds)

**Screen:** Welcome

```
Welcome to [Product Name]

We help ensure patients complete treatment regularly.
```

Ask only:

* Clinic Name
* Doctor Name
* WhatsApp Number

Button:

```
Continue →
```

Nothing else.

No password complexity yet (magic link login later).

---

### Why minimal?

Every extra field increases abandonment dramatically in doctor workflows.

---

## STEP 2 — The Promise (Preview Before Work)

Before asking them to input anything, show outcome.

**Screen: Demo Dashboard (Pre-filled)**

```
This is what clinics see daily:

Patients at risk: 6
Recovered this month: 11
Revenue protected: ₹92,000
```

Small text:

> "Let's create your first patient to activate this."

You are anchoring value before effort.

---

## STEP 3 — Add First Patient (90 seconds)

This is the most important step.

### Title:

```
Add a patient (takes 20 seconds)
```

Fields ONLY:

* Patient Name
* Phone Number
* Treatment Duration

  * 15 days
  * 30 days
  * 45 days
  * 60 days
* Follow-up frequency

  * Weekly
  * Every 2 weeks

Defaults pre-selected.

---

### UX Rule

No blank dropdowns.

Everything tap-selectable.

---

### Hidden System Action

When they click **Create**:

System instantly creates:

```text
journey_started
visit_expected
adherence_check_scheduled
```

You silently start automation.

---

## STEP 4 — The Magic Preview (Critical Moment)

Immediately show:

```
Here's what your patient will receive:
```

Display WhatsApp message preview:

---

**Patient View Simulation**

```
Vanakkam 🙏

Just a quick check from Sri Lakshmi Ayurveda Clinic.

Were you able to continue treatment today?

✅ Yes
⚠️ Missed today
❓ Need help
```

---

Buttons animated slightly.

Doctor imagines patient receiving it.

This is emotional confirmation.

---

Then show:

```
This message will be sent automatically.
You don't need to do anything.
```

That sentence matters enormously.

---

## STEP 5 — Instant Outcome Simulation

Now create future state instantly.

System generates demo events:

```text
Day 7 → visit_expected
Day 10 → visit_missed
```

Dashboard updates:

```
⚠️ 1 patient needs follow-up
```

Show recovery message preview.

---

Doctor experiences full lifecycle in 10 seconds.

Brain connects cause → effect.

---

# 🧩 Final Screen — Activation

```
You're ready.

We'll start monitoring treatment continuity automatically.
```

Buttons:

```
Add another patient
Go to dashboard
```

No tutorials.

Usage teaches product.

---

# ⏱️ Real Timing

| Step               | Time   |
| ------------------ | ------ |
| Identity           | 30 sec |
| Promise preview    | 30 sec |
| Add patient        | 90 sec |
| Message preview    | 60 sec |
| Outcome simulation | 60 sec |

≈ 4–5 minutes total.

---

# 🧠 Psychological Mechanics (Why This Works)

You trigger three beliefs sequentially:

### 1. Value exists

(demo dashboard)

### 2. Effort is small

(20-sec patient add)

### 3. System works automatically

(message preview + simulation)

Adoption happens when all three align.

---

# 🚨 Common Onboarding Mistakes You Must Avoid

Do NOT:

❌ explain features
❌ show settings screens
❌ ask clinic address/license/etc
❌ introduce analytics early
❌ require WhatsApp integration immediately

Integration comes AFTER belief.

---

# ⭐ Hidden Growth Effect

Doctors will screenshot the message preview and send it to staff.

That becomes organic distribution.

Your onboarding doubles as marketing.

---

# What Happens Immediately After Onboarding

Within 24 hours:

* first adherence check sent,
* doctor receives notification,
* sees patient response.

Real signal replaces simulation.

Hook established.

---

# 💰 Pricing Strategy

> You are selling recovered revenue, not software.

---

# 🧠 What Doctors Think They're Buying

AYUSH doctors do NOT buy:

* automation,
* AI,
* SaaS,
* analytics.

They buy relief from one fear:

> "Patients start treatment but don't finish."

So pricing must map to:

```text
continuity → outcomes → revenue → reputation
```

NOT features.

---

# ⭐ The Correct Pricing Anchor

Never anchor pricing to:

❌ number of users
❌ number of messages
❌ features
❌ dashboards

Anchor to:

✅ **patients under continuity monitoring**

Because that matches mental value.

---

# 🧩 Pricing Model (V1 → Scale)

## Phase 1 (First 50 Clinics): Simple Flat Pricing

You need learning, not optimisation.

### Starter Plan

**₹1,999 / month**

Includes:

* up to 100 active treatment journeys,
* adherence checks,
* recovery automation,
* WhatsApp messaging included.

Why this works:

* psychologically affordable,
* not "enterprise software,"
* easy yes decision.

Your goal early is adoption density.

---

## Phase 2 (After PMF): Continuity-Based Pricing

Shift to usage-linked pricing.

### Growth Plan

**₹3,999 / month**
(up to 300 journeys)

### Pro Plan

**₹7,999 / month**
(unlimited journeys)

Why journeys?

Doctors think:

> "More patients completing treatment = more revenue."

Pricing scales with success.

---

# 🔥 The Secret Pricing Lever (Very Important)

Add a visible metric:

```text
Revenue Protected This Month: ₹72,000
```

Now pricing comparison becomes:

```
Pay ₹3,999 → Recover ₹72,000
```

Decision becomes irrationally easy.

---

# 💰 Why NOT Performance Pricing Yet

Avoid early because:

* attribution disputes,
* accounting complexity,
* trust friction,
* harder billing.

Flat subscription builds trust first.

Performance layer can come later.

---

# 🧠 Realistic Revenue Math

Typical AYUSH clinic:

* 25 patients/day,
* ₹1,500 avg consultation/therapy,
* 30–60 day treatments.

If you recover even:

👉 5 extra patients/month

That's ₹7,500–₹20,000 regained revenue.

Your ₹2k–₹4k pricing feels trivial.

This is ideal SaaS economics.

---

# 🚀 GTM Strategy (Solo Builder Reality)

Forget ads.

Your GTM must exploit **trust networks**.

AYUSH is relationship-driven.

---

## Phase 1 — Founder-Led Wedge (First 10 Clinics)

Goal: learning + proof.

### Method: Live Demo Outreach

Script:

> "How many patients started treatment last month but never came back? I built something that shows you exactly who they are."

That sentence opens doors.

---

### Where to Find Clinics

Start hyper-local:

* Siddha clinics,
* Ayurveda centres,
* Panchakarma clinics.

Walk-in demos beat cold email here.

India advantage.

---

## Phase 2 — WhatsApp Viral Loop (10 → 50 Clinics)

Your product naturally generates shareable moments.

Doctors will show:

* recovery dashboard,
* message previews.

Encourage this subtly.

Add small footer:

```
Sent via [Product Name] Continuity System
```

Soft attribution.

---

## Phase 3 — Association Leverage (50+ Clinics)

Approach:

* AYUSH practitioner associations,
* local medical groups,
* training institutes.

Offer:

> "Free continuity audit for members."

You become educator, not seller.

---

# 📣 Positioning (Critical)

Never say:

❌ AYUSH Practice Management Software
❌ Patient Engagement Platform

Say:

```text
Patient Continuity System for AYUSH Clinics
```

Category creation > competition.

---

# 🎯 Ideal Early ICP (Start Narrow)

Target:

* 1–3 doctor clinics,
* therapy-based treatments,
* WhatsApp-heavy communication,
* urban/semi-urban India.

Avoid:

* hospitals,
* government centres,
* large chains.

Too slow early.

---

# 🧩 Demo Flow (Your Sales Weapon)

Demo must take <7 minutes.

1. Add fake patient.
2. Show message preview.
3. Simulate drop-off.
4. Show recovery alert.
5. Show revenue protected.

Close with:

> "We'll activate this for your clinic this week."

No pricing discussion first.

Value → price → decision.

---

# ⭐ The Real GTM Advantage You Have

Most competitors sell software.

You sell insight:

```text
"These patients are disappearing."
```

Insight sells faster than tools.

---

# 📈 Expected Adoption Curve (Realistic)

| Month | Clinics |
| ----- | ------- |
| 1     | 3–5     |
| 3     | 15–20   |
| 6     | 40–60   |
| 12    | 120–150 |

With almost zero paid marketing.

---

# 🚨 Biggest GTM Mistake to Avoid

Do NOT launch publicly early.

No Product Hunt.
No big announcement.

Quiet adoption → iteration → clarity → then scale.

Vertical SaaS spreads through trust, not hype.

---

# 🧠 The Deeper Strategy

Your GTM is actually building your moat:

Every clinic onboarded = more behavioural data.

More data → better risk detection → stronger product → easier sales.

Product and distribution reinforce each other.

---

# Handling the "Notebook Objection"

> "They can find this themselves from their excel sheet / notebook, right?"

Yes, technically a doctor **can** find this from a notebook or Excel sheet.

So if your value proposition is:

> "I show you patients who didn't come back"

you lose immediately.

The critical insight:

```text
Your product is NOT about information.
It is about timing + certainty + action.
```

---

# 🧠 What Doctors Actually Have Today

They possess **historical records**, not **operational awareness**.

To find drop-offs manually, they must:

1. remember treatment duration,
2. remember expected follow-up timing,
3. scan pages,
4. mentally calculate delays,
5. decide if absence matters,
6. remember to call later.

This never happens consistently.

Because clinics operate in **real-time chaos**.

---

## The Real Constraint Is Cognitive Load

Doctors don't lack data.

They lack:

```text
continuous attention to continuity.
```

Your product externalizes that attention.

---

# ⭐ The True Job Your Product Does

You are not answering:

> "Who didn't come back?"

You are answering:

```text
"Who is about to fail treatment RIGHT NOW,
and what should I do about it?"
```

That is fundamentally different.

---

# 🔥 The Three Things Excel/Notebook Cannot Do

## 1️⃣ Detect Risk Before the Doctor Notices

Notebook shows past absence.

You show emerging risk.

Example:

```
Patient usually replies daily
↓
Stops responding for 3 days
↓
Risk rising BEFORE missed visit
```

Human memory cannot track patterns like this.

---

## 2️⃣ Act Automatically

Notebook insight requires effort.

Your system executes:

```
Detect → message → recovery → notify doctor
```

No staff action needed.

Automation is the value multiplier.

---

## 3️⃣ Operate Continuously

Manual systems work occasionally.

You work:

```
24 hours/day
every patient
every treatment
every clinic day
```

Consistency is impossible manually.

---

# 🧠 The Positioning Shift You Must Make

Your current line implies:

> "I give you information."

You must instead communicate:

> "I watch continuity for you."

---

## Weak Pitch (Information)

❌ "I show you patients who didn't return."

Feels replaceable.

---

## Strong Pitch (Operational Delegation)

✅ "You don't have to track follow-ups anymore — the system watches treatment continuity automatically and alerts you only when needed."

Now you are replacing mental effort.

---

# ⭐ The Real Product Category

You are building:

```text
Autopilot for treatment continuity
```

Not reporting software.

---

# 🚨 The Psychological Truth

Doctors already *know* patients disappear.

What they feel is:

* guilt,
* lack of time,
* inability to track everyone.

Your product removes guilt.

That's emotionally powerful.

---

# 🧩 Better GTM Hook (Upgrade Your Line)

### Version 1 — Strongest (Operational Relief)

> "Right now you have to remember which patients should come back. This system remembers for you and follows up automatically."

---

### Version 2 — Revenue Framing

> "Patients dropping treatment isn't the problem — not noticing early is. This system notices instantly."

---

### Version 3 — Curiosity Hook

> "Some patients stop treatment days before you realize it. We detect that early and bring them back automatically."

---

Notice:

None mention Excel.

You're not competing with storage.

You're competing with attention.

---

# 🧠 The Deeper Insight (Very Important)

Vertical SaaS almost never wins by digitizing records.

It wins by digitizing **responsibility**.

You are taking responsibility for continuity monitoring.

That is what clinics actually pay for.
