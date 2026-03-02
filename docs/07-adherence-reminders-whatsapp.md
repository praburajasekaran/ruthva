# Adherence Reminders & WhatsApp Conversation Design

> Split from `brainstorm.md` — Covers medicine reminders as sensors (not features), the daily adherence check design, message fatigue handling, event schema refinements, and the full WhatsApp conversation system.

---

# 🧠 Should We Add Medicine Reminders to V1?

Yes — but the important nuance is:

> **Medicine reminders are essential to the vision, but dangerous in V1 if positioned incorrectly.**

---

# First Principle: What Problem Are You Solving *First*?

Your wedge is:

```text
Recover disappearing patients.
```

Not:

```text
Manage full treatment adherence.
```

These sound related, but they create very different products.

---

## If you add medicine reminders as a primary feature now:

You become:

❌ adherence app
❌ reminder tool
❌ patient engagement software

And doctors mentally classify you as:

> "another reminder system"

Low urgency. Low pricing power.

---

## If reminders exist *in service of continuity recovery*:

You become:

✅ treatment continuity infrastructure

High urgency. High ROI.

Same feature. Different strategic role.

---

# ⭐ The Correct Mental Model

Medicine reminders should be treated as:

```text
A SENSOR, not a FEATURE.
```

This distinction is critical.

---

# What Does "Sensor" Mean?

You are not reminding patients just to help them.

You are measuring:

* engagement,
* adherence behaviour,
* risk signals.

Every reminder generates data.

Example:

| Patient Action   | Signal        |
| ---------------- | ------------- |
| Reads message    | engaged       |
| Replies          | compliant     |
| Ignores 3 days   | drop-off risk |
| Stops responding | high-risk     |

Now reminders power prediction.

---

# 🔥 Why AYUSH Specifically Makes This Powerful

AYUSH treatments differ from allopathy:

| Allopathy               | AYUSH                        |
| ----------------------- | ---------------------------- |
| drug acts independently | outcome depends on behaviour |
| short cycle             | long cycle                   |
| adherence optional      | adherence critical           |

Meaning adherence behaviour = treatment success proxy.

So reminders become **diagnostic signals**.

That's extremely valuable.

---

# 🧩 How Reminders Fit Into V1 Without Breaking Focus

You add them — but in a constrained way.

## V1 Rule:

> Reminders exist only to detect continuity risk.

Not to manage full protocol complexity.

---

# ✅ Minimal V1 Medicine Reminder Design

Do NOT build:

* dosage schedules,
* complex timing,
* multiple medicines,
* diet tracking,
* symptom logs.

That becomes an EMR.

---

## Instead: One Simple Concept

### Daily Continuity Check

System sends one message:

> "Quick check — were you able to continue the treatment today?"

Buttons:

```
✅ Yes
⚠️ Missed today
❓ Need help
```

That's it.

---

### Why this works

You capture adherence signal without modelling medicine complexity.

You learn behaviour, not dosage.

---

# Event Schema Extension (Small but Powerful)

Add only two new events.

```
adherence_check_sent
adherence_response
```

metadata example:

```json
{
  "response": "yes"
}
```

Now your system knows:

* silent patients,
* struggling patients,
* compliant patients.

Drop-off prediction improves massively.

---

# 📈 What This Enables Later (Without Rebuild)

After months of data:

You can infer:

* adherence decline precedes drop-off,
* optimal intervention timing,
* protocol difficulty patterns.

You gradually evolve into protocol intelligence — without building it upfront.

---

# 🚨 Why Full Medicine Reminders Too Early Is Dangerous

Three real risks:

### 1. Input Explosion

Doctor must enter:

* medicines,
* dosage,
* timings.

Adoption collapses.

---

### 2. Support Burden

Patients ask:

* "Can I take after food?"
* "I missed morning dose?"

You become pseudo-clinical support.

Huge solo-founder trap.

---

### 3. Category Drift

You move from revenue tool → wellness app.

Pricing power drops.

---

# 🧠 The Correct Evolution Path

Think in layers:

```
Phase 1: Continuity detection
    ↓
Phase 2: Adherence sensing
    ↓
Phase 3: Protocol assistance
    ↓
Phase 4: Treatment intelligence
```

You're adding adherence sensing now — not protocol management.

---

# ⭐ The Subtle Product Insight

Doctors don't initially pay for reminders.

They pay because:

> "Patients who were disappearing are now continuing treatment."

Reminders are invisible machinery behind that outcome.

---

# V1 Decision Rule (Simple)

Ask for every feature:

> Does this help detect or prevent drop-off?

If yes → include minimal version.
If no → delay.

Medicine reminders pass this test **only in minimal sensing form**.

---

# Practical V1 Scope Adjustment

Your V1 now includes:

✅ Patient journey creation
✅ Expected visit engine
✅ Drop-off detection
✅ Recovery WhatsApp messages
✅ **Daily adherence check (single interaction)**

Still small. Much smarter.

---

# Synthesis: Merging Both Approaches

There's a difference between:

- **"Send reminder before visit"** — that's a scheduling feature
- **"Send a daily check, use the response as a drop-off signal"** — that's a sensor

The daily check message is better than visit reminders because visit reminders only work on visit days. Adherence checks work every day. Daily touchpoints give you a continuous signal stream instead of periodic snapshots. A patient who replies "yes" for 8 days then goes silent is a **much earlier** drop-off signal than waiting for a missed visit on day 14.

## The Hierarchy

**Daily:** Adherence check ("Were you able to continue treatment today?") — this is your sensor, runs every day, generates behavioral signal.

**Pre-visit:** Visit reminder ("Your follow-up is tomorrow") — this is logistics, runs only before expected visits, improves show-up rates.

**Post-miss:** Recovery message ("We noticed you haven't visited...") — this is your safety net, triggers only on confirmed drop-off.

The daily check is the **primary data source**. The visit reminder is a **courtesy**. The recovery message is the **last resort**.

---

## Message Fatigue (Critical Consideration)

A daily WhatsApp message for a 60-day treatment is 60 messages. By day 15, patients stop reading them. Daily check-ins have a decay curve where engagement drops roughly 40-50% by week three.

So the sensing strategy needs to be **adaptive from V1**, not just on a fixed daily schedule:

- **Week 1:** Daily (establishing the habit)
- **Week 2-3:** Every other day (patient is in routine)
- **Week 4+:** Only on days before expected visits + one mid-interval check

**The silence itself is data.** If a patient who was replying daily suddenly stops on day 12, that's a stronger signal than a patient who never replied consistently. So your system should track reply *patterns*, not just individual replies.

### Recommended V1 Rule (Simplified)

```
First 21 days → fixed daily check
After day 21 → every 2 days
```

One global rule. No personalization yet.

Why? Because now you can measure reply decay, silence thresholds, and engagement half-life. That dataset becomes your future intelligence.

---

## Revised V1 Event Types — Final List

1. `journey_started`
2. `journey_completed`
3. `visit_expected`
4. `visit_confirmed`
5. `visit_missed`
6. `adherence_check_sent`
7. `adherence_response`
8. `reminder_sent` (pre-visit)
9. `recovery_message_sent`
10. `patient_returned`

Ten events. Clean. Complete. No redundancy.

### Human-origin events

```
journey_started
visit_confirmed
adherence_response
patient_returned
```

### System-origin events

```
visit_expected
visit_missed
adherence_check_sent
reminder_sent
recovery_message_sent
```

---

# 🔥 WhatsApp Conversation Design (The Real Product)

Doctors decide adoption based on patient message tone.

The WhatsApp conversation is not UX decoration.

It **is the product interface** for patients.

Your app is just the control panel.

---

# Core Design Principle

Messages must feel like:

```
care from clinic
NOT
automation from software
```

AYUSH trust is relational, not transactional.

---

# The V1 Conversation System

We design only **three conversation types**.

Nothing else.

---

## 1️⃣ Daily Adherence Check (Sensor)

### Message Structure

```
Vanakkam 🙏

Just a quick check from [Clinic Name].

Were you able to continue your treatment today?

✅ Yes
⚠️ Missed today
❓ Need help
```

---

### Why this works

* culturally aligned greeting,
* no medical claims,
* clinic voice,
* extremely low cognitive load.

---

### System Behaviour

| Response  | Event                           |
| --------- | ------------------------------- |
| Yes       | adherence_response: success     |
| Missed    | adherence_response: missed      |
| Need help | adherence_response: help_needed |

---

## 2️⃣ Pre-Visit Reminder (Assist)

Sent only if visit_expected approaching.

```
Vanakkam 🙏

This is a gentle reminder from [Clinic Name].

Your follow-up visit is expected tomorrow to keep treatment progress steady.

Would you like help confirming a time?
```

Buttons:

```
✅ Yes
⏰ Later
```

No pressure language.

---

## 3️⃣ Recovery Message (Intervention)

Most important tone-wise.

Never accusatory.

```
Vanakkam 🙏

Doctor asked us to check in.

We noticed you may have missed a follow-up. Continuing regularly usually gives better results.

Shall we help you schedule your next visit?
```

Buttons:

```
✅ Yes
📞 Call me
```

Key phrase:

> "Doctor asked us to check"

Creates human intent attribution.

---

# 🧠 Hidden Psychological Design

Each message reinforces:

```
Doctor cares → Clinic attentive → Treatment important
```

You are strengthening practitioner trust indirectly.

This aligns perfectly with AYUSH philosophy.

---

# 📊 Signals Generated (What You Really Built)

Without extra work you now measure:

* engagement consistency,
* behavioural drift,
* help requests,
* recovery effectiveness,
* intervention timing success.

That becomes your intelligence layer later.

---

# ⭐ The Deeper Realisation

You are not building messaging.

You are building:

```
A continuous therapeutic relationship layer.
```

Between visits.

Between consultations.

Between human interactions.

That layer does not currently exist in AYUSH at scale.
