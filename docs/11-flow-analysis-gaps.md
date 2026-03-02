# Ruthva V1 -- Comprehensive User Flow Analysis, Gaps & Edge Cases

> Generated 2026-03-01. Covers all 6 modules, 3 personas, 10 event types, 4 database tables.

---

## 1. User Flow Overview

### Flow 1: Clinic Onboarding & Authentication

```
Doctor opens app
  -> Step 1: Enter clinic name, doctor name, WhatsApp number (30s)
  -> Step 2: See promise preview (demo dashboard with sample data) (30s)
  -> Step 3: Add first patient (name, phone, duration, interval) (90s)
  -> Step 4: See WhatsApp message preview (60s)
  -> Step 5: Outcome simulation (risk -> recovery demo) (60s)
  -> Redirected to dashboard
```

**Subsequent logins:**
```
Doctor opens app
  -> Enter WhatsApp number
  -> Receive OTP via WhatsApp (Gupshup auth template)
  -> Enter OTP
  -> Redirected to dashboard
```

### Flow 2: Patient + Journey Creation (Staff Daily Workflow)

```
Staff opens app -> taps "Add Patient"
  -> Enter: name, phone number
  -> Select: treatment duration (15/30/45/60 day presets)
  -> Select: follow-up interval (weekly / biweekly)
  -> Tap "Create"
  -> System emits: journey_started event
  -> System generates: visit_expected events for full timeline
  -> System schedules: first adherence_check for next day
  -> Patient appears on dashboard
```

### Flow 3: Daily Adherence Check Loop (System + Patient)

```
Nightly cron (2 AM UTC / 7:30 AM IST):
  -> For each active journey where day <= duration:
    -> If day <= 21: send daily
    -> If day > 21: send every 2 days
    -> Send WhatsApp message with 3 buttons
    -> Emit: adherence_check_sent event

Patient receives WhatsApp:
  -> Taps "Yes" -> adherence_response {response: "yes"} event
  -> Taps "Missed today" -> adherence_response {response: "missed"} event
  -> Taps "Need help" -> adherence_response {response: "help_needed"} event
  -> Does nothing -> (silence = data, tracked by absence of response)
```

### Flow 4: Pre-Visit Reminder

```
Nightly cron checks visit_expected events:
  -> If visit_expected is tomorrow:
    -> Send WhatsApp reminder message
    -> Emit: reminder_sent event
  -> Patient taps "Yes" -> (currently no event mapping specified)
  -> Patient taps "Later" -> (currently no event mapping specified)
```

### Flow 5: Visit Confirmation / Miss Detection

```
Expected visit day arrives:
  -> Option A: Staff taps "Visited" on patient card -> visit_confirmed event
  -> Option B: Patient confirms via WhatsApp reply -> visit_confirmed event
  -> If no confirmation within grace period (3 days):
    -> System emits: visit_missed event
    -> Risk score recalculated
```

### Flow 6: Risk Escalation & Recovery

```
Nightly risk scoring cron:
  -> Compute risk per journey from events
  -> Escalate: Stable -> Watch -> At Risk -> Critical
  -> If visit_missed + 3 days grace exceeded:
    -> Mark AT RISK
    -> Send recovery WhatsApp message
    -> Emit: recovery_message_sent event

Patient receives recovery message:
  -> Taps "Yes" (schedule visit) -> (needs event mapping)
  -> Taps "Call me" -> (needs event mapping + action)

Patient returns to clinic:
  -> Staff marks return -> patient_returned event
  -> Risk score drops
  -> Dashboard shows recovery
```

### Flow 7: Doctor Dashboard Review

```
Doctor opens dashboard:
  -> Sees: Patients at Risk count, Critical Patients count, Recovered This Month
  -> Sees: Revenue Protected figure
  -> Scrolls at-risk list: name, risk level, last activity, action button
  -> Taps action button -> (sends recovery message? views timeline? UNSPECIFIED)
```

---

## 2. Flow Permutations Matrix

| Dimension | Variation | Impact on Flows |
|-----------|-----------|-----------------|
| **User type** | Doctor (onboards, views dashboard) | Flows 1, 7 |
| **User type** | Staff (adds patients, confirms visits) | Flows 2, 5 |
| **User type** | Patient (receives WhatsApp, replies) | Flows 3, 4, 6 |
| **Auth state** | First-time (onboarding) | Flow 1 full 5-step |
| **Auth state** | Returning (OTP login) | Flow 1 abbreviated |
| **Auth state** | Session expired mid-use | NOT SPECIFIED |
| **Journey state** | Day 1-21 (daily adherence) | Flow 3 daily cadence |
| **Journey state** | Day 22+ (every-2-day adherence) | Flow 3 reduced cadence |
| **Journey state** | Near expected visit | Flow 4 triggers |
| **Journey state** | Post-missed-visit + grace | Flow 6 triggers |
| **Device** | Mobile (primary -- PWA) | All flows |
| **Device** | Desktop browser | Dashboard only likely |
| **Device** | Offline/poor connectivity | PWA caching -- partially specified |
| **Network** | WhatsApp delivery failure | NOT SPECIFIED |
| **Network** | Webhook downtime | NOT SPECIFIED |
| **Patient response** | Replies promptly | Happy path |
| **Patient response** | Never replies (silence) | Gap in escalation rules |
| **Patient response** | Replies with free text (not button) | NOT SPECIFIED |
| **Patient response** | Blocks clinic number | NOT SPECIFIED |

---

## 3. Journey/Event Lifecycle -- Missing States & Transitions

### 3.1 Specified Event Types (10)

```
journey_started -> visit_expected -> visit_confirmed OR visit_missed
adherence_check_sent -> adherence_response
reminder_sent
recovery_message_sent
patient_returned
journey_completed (listed in doc 07 but NOT in doc 09's event list)
```

### 3.2 MISSING Events / States

| Missing Element | Why It Matters | Recommendation |
|----------------|----------------|----------------|
| **journey_completed** | Listed in doc 07 (10 events) but absent from doc 09 (8 events) and INSTITUTIONAL_KNOWLEDGE (8 events). Without this, journeys never formally end. The nightly cron will keep sending adherence checks past treatment duration. | Add journey_completed. Emit automatically when current_day > duration_days OR manually by staff. |
| **journey_paused / journey_resumed** | Patient requests temporary hold (travel, illness). No way to pause without generating false risk signals. | Add pause/resume events. Paused journeys skip adherence checks and visit expectations. |
| **journey_dropped** | Journey status has "dropped" in schema but no event triggers it. How does a journey move to dropped status? | Define explicit drop criteria: e.g., Critical risk for 14+ days with no response -> auto-drop. Or manual staff action. |
| **consent_granted / consent_withdrawn** | DPDP Act 2023 requires consent tracking. Doc 10 describes consent events but they are not in the V1 event list. | Add consent events. Block all WhatsApp messaging until consent_granted exists for patient. |
| **patient_opted_out** | Patient sends "STOP" via WhatsApp. Gupshup fires user-event. No event type to record this. | Add opt-out event. Must immediately stop all messages. Different from consent withdrawal (opt-out is channel-specific, consent is data-level). |
| **message_delivered / message_failed** | Doc 10 describes delivery status tracking (enqueued -> sent -> delivered -> read -> failed) but no event types exist for these. | Store delivery status in adherence_check_sent / reminder_sent / recovery_message_sent metadata. Add message_failed as a distinct event that triggers fallback logic. |
| **Risk level change event** | Risk transitions (Stable -> Watch -> At Risk -> Critical) are computed but never stored as events. Dashboard queries would need to recompute every time. | Add risk_level_changed event with {from, to, reasons} metadata. Enables historical risk tracking and audit trail. |

### 3.3 State Transition Diagram -- Gaps Highlighted

```
Journey Lifecycle:
  journey_started
    -> [ACTIVE]
      -> visit_expected (system, recurring)
        -> visit_confirmed (staff/patient) -> stays ACTIVE
        -> visit_missed (system, after grace) -> risk escalates
      -> adherence_check_sent (system, daily/biweekly)
        -> adherence_response (patient) -> updates risk signal
        -> [NO RESPONSE] -> ??? (no explicit handling)
      -> recovery_message_sent (system, on risk)
        -> patient_returned (staff) -> risk improves
        -> [NO RESPONSE TO RECOVERY] -> ??? (escalation undefined)
    -> [COMPLETED] ??? (trigger undefined)
    -> [DROPPED] ??? (trigger undefined)
    -> [PAUSED] ??? (not supported)

DEAD END: What happens after recovery_message_sent if patient does NOT return?
  - Is a second recovery message sent? When?
  - Does risk escalate to Critical? What happens at Critical?
  - Is there a terminal state where system stops trying?

DEAD END: What happens when treatment duration expires?
  - Do adherence checks stop automatically?
  - Is journey_completed auto-emitted?
  - What if patient still has outstanding missed visits at duration end?
```

---

## 4. Edge Cases

### 4.1 Patient-Level Edge Cases

| Edge Case | Current Handling | Gap |
|-----------|-----------------|-----|
| **Patient with multiple concurrent treatments** | Schema supports it (multiple journeys per patient). | Dashboard UX not specified: does risk show per-journey or aggregated per-patient? If patient has 2 journeys, one Stable and one Critical, what appears on dashboard? |
| **Phone number change** | Not addressed. Patient phone is on the patients table. | If phone changes, all active journeys' WhatsApp messages go to wrong number. Need phone update flow that re-links to active journeys. |
| **Phone number shared by two patients** | Not addressed. Phone is not marked UNIQUE in schema. | Family members sharing a phone. Adherence checks for Patient A and Patient B go to same WhatsApp. Confusing replies. Quick-reply button responses cannot be attributed to correct patient. |
| **Treatment extension** | Not addressed. Journey has fixed duration_days. | Doctor decides to extend 30-day treatment to 45 days. No way to modify journey duration. Must create new journey? Loses continuity data. |
| **Early completion** | Not addressed. | Patient recovers faster. No way to end journey early. System keeps sending adherence checks. |
| **Treatment type change** | Not addressed. Journey has no treatment_type field. | Doctor switches patient from weekly to biweekly follow-up mid-treatment. No way to modify followup_interval_days on existing journey. |
| **Patient returns but to a DIFFERENT clinic** | Not addressed. Patient is clinic-scoped. | Unlikely in V1 (single-clinic) but architecturally relevant. |
| **Patient is a minor** | Not addressed. | Consent and messages go to guardian's phone. Guardian may have their own patient record. |
| **International phone number** | Not addressed. | Unlikely for ICP but Gupshup requires country code formatting. |

### 4.2 Journey/Timing Edge Cases

| Edge Case | Current Handling | Gap |
|-----------|-----------------|-----|
| **Journey created mid-day** | Start date recorded. | Does day counting start same day or next day? If created at 11 PM, does adherence check go out at 7:30 AM the next morning (8.5 hours later) or the morning after that? |
| **Visit expected on a Sunday/holiday** | Not addressed. | Clinics may be closed on Sundays. Expected visit falls on clinic holiday. Patient cannot visit. System marks as missed after grace period. False positive risk. |
| **Visit confirmed BEFORE expected date** | Not addressed. | Patient comes early. visit_confirmed event exists but no matching visit_expected for that date. Does it satisfy the next upcoming visit_expected? |
| **Multiple visits between expected dates** | Not addressed. | Patient visits twice in one interval. Second visit has no visit_expected to match against. |
| **Grace period overlaps with next visit_expected** | Not addressed. | Weekly follow-up: visit expected Day 7. Grace period = 3 days (until Day 10). Next visit expected Day 14. If patient confirms on Day 10, does it count for Day 7 or Day 14? |
| **Adherence check sent on same day as pre-visit reminder** | Not addressed. | Patient receives 2 WhatsApp messages on same day. Contributes to message fatigue. |
| **Timezone handling** | Clinic has timezone field. | Cron runs at 2 AM UTC. For IST (UTC+5:30) this is 7:30 AM. But what about clinics in different Indian timezones? Northeast India is effectively UTC+6. Messages would arrive at 8 AM -- acceptable. But if system expands beyond India, timezone logic is needed. |

### 4.3 System/Data Edge Cases

| Edge Case | Current Handling | Gap |
|-----------|-----------------|-----|
| **Duplicate patient entry** | Not addressed. Phone not UNIQUE. | Staff accidentally adds same patient twice with same phone. Two journeys created. Patient gets double messages. |
| **Staff adds patient without phone** | Phone is required field. | What if doctor wants to track journey but patient has no WhatsApp? System becomes half-functional: visit tracking works but messaging does not. |
| **100-journey limit reached** | Starter plan: 100 active journeys. | No enforcement mechanism specified. What happens at journey 101? Hard block? Warning? Grace period? |
| **Nightly cron fails** | Not addressed. | No adherence checks sent. No risk recalculation. No visit_missed detection. System appears dead for a day. No retry/catch-up mechanism specified. |
| **Cron runs twice** (Railway cron idempotency) | Doc 10 mentions idempotent upserts. | Adherence checks must be idempotent. If cron runs twice, patient should not receive 2 WhatsApp messages. Need deduplication by (journey_id, event_type, date). |

---

## 5. Failure Modes

### 5.1 WhatsApp / Gupshup Failures

| Failure Mode | Impact | Mitigation (Specified?) |
|-------------|--------|------------------------|
| **Gupshup API down** | No messages sent. Adherence checks, reminders, recovery messages all fail. | NOT SPECIFIED. Need: retry queue with exponential backoff. Store pending messages and retry on next cron run. |
| **Message delivery failed** (phone off, no internet) | Event logged as adherence_check_sent but patient never receives it. System assumes silence = disengagement. False risk signal. | PARTIALLY SPECIFIED (doc 10 mentions delivery status tracking). Need: distinguish between "sent but undelivered" and "delivered but no reply." |
| **WhatsApp Business account suspended** | All messaging stops. Core product loop breaks. | NOT SPECIFIED. Need: monitoring/alerting. Consider SMS fallback for critical recovery messages. |
| **Template rejected by Meta** | Cannot send that message type. | NOT SPECIFIED. Need: fallback templates pre-approved. Monitor template status. |
| **Template reclassified (utility -> marketing)** | Cost increases unexpectedly. Potential delivery restrictions. | NOTED in doc 10 but no mitigation. Need: template monitoring and cost alerting. |
| **Rate limit hit** (250 conversations/24hrs for new accounts) | Messages queued but not sent. At-risk patients don't receive recovery messages. | NOT SPECIFIED. Need: prioritization logic. Recovery messages > adherence checks > reminders. |
| **Patient sends free-text reply instead of button** | Webhook receives text message. No handler for free-text. Event not recorded. | NOT SPECIFIED. Need: at minimum, log the message. Optionally, fuzzy-match "yes"/"no"/"help" from free text. |
| **Patient sends message OUTSIDE expected flow** | Patient initiates conversation unprompted ("When is my next visit?"). | NOT SPECIFIED. V1 says "no chat UI." Need: at minimum, auto-reply acknowledging receipt and suggesting they call clinic. |
| **Webhook receives duplicate callback** | Same message event processed twice. | MENTIONED in doc 10 (deduplicate by messageId). Need: implement in webhook handler. |
| **Patient blocks clinic WhatsApp number** | Messages fail silently or Gupshup returns error. | NOT SPECIFIED. Need: detect block from delivery status. Mark patient as unreachable. Alert staff on dashboard. |
| **Patient opts out ("STOP")** | Gupshup fires user-event with opt-out. | MENTIONED in doc 10 (handleOptEvent). Need: create patient_opted_out event. Stop all messages. Show on dashboard. Provide re-opt-in path. |

### 5.2 System/Infrastructure Failures

| Failure Mode | Impact | Mitigation (Specified?) |
|-------------|--------|------------------------|
| **Database connection failure** | App completely non-functional. | NOT SPECIFIED. Railway managed Postgres has SLA but no app-level circuit breaker described. |
| **Nightly cron fails silently** | No adherence checks, no risk updates for a day. Patients appear stable when they're not. | NOT SPECIFIED. Need: health check. If cron hasn't run by 8 AM IST, alert via email/WhatsApp to admin. |
| **Cron job timeout** | Large clinic with 100 patients. If cron takes too long, Railway may kill the process. | NOT SPECIFIED. Need: batch processing with checkpointing. Process 50 patients, commit, continue. |
| **Railway deployment causes downtime** | Webhook URL unreachable. Gupshup retries for limited time, then drops. | NOT SPECIFIED. Need: Gupshup retry policy understanding. Queue missed webhooks. |
| **PWA cached stale data** | Staff sees outdated dashboard. Marks visit_confirmed on already-missed patient. | PARTIALLY SPECIFIED (Serwist caching strategies mentioned). Need: ensure API calls use StaleWhileRevalidate, not CacheFirst. Dashboard must show "last updated" timestamp. |

---

## 6. Onboarding Gaps

### 6.1 Onboarding Flow Issues

| Gap | Description | Impact |
|-----|-------------|--------|
| **No WhatsApp verification during onboarding** | Doctor enters WhatsApp number in Step 1 but no OTP is sent until later. | Doctor could enter wrong number. First patient's messages go to wrong WhatsApp. Suggest: verify WhatsApp number during onboarding with OTP before Step 3. |
| **Step 3 adds REAL patient during onboarding** | Spec says "Add a patient (takes 20 seconds)." Is this a real patient or demo? If real, system starts sending WhatsApp messages immediately. | Doctor may not be ready for live messaging. Patient receives adherence check before doctor has even finished onboarding. Suggest: clearly label as "test patient" or delay automation until onboarding completes. |
| **Step 5 uses simulated events** | "System generates demo events: Day 7 visit_expected, Day 10 visit_missed." | These simulated events could pollute real data. Must be clearly sandboxed or cleaned up after onboarding. If they are in the real events table, dashboard stats will be wrong. |
| **No Gupshup integration during onboarding** | Doc 08 says "Do NOT require WhatsApp integration immediately. Integration comes AFTER belief." | Contradiction: Step 4 shows message preview, Step 5 simulates recovery. But actual WhatsApp sending requires Gupshup API key, template approval, and business verification. When does this happen? |
| **No payment/subscription step** | Onboarding goes straight to dashboard. No trial period defined. No credit card required. | How does the 100-journey limit get enforced? When does billing start? Free trial duration not specified. |
| **Multi-doctor clinic onboarding** | Only one doctor name collected. | 1-3 doctor clinics are the ICP. How does the second doctor get access? No invite flow. No role assignment (deliberately excluded from V1). |
| **Staff onboarding** | Staff is a named persona but has no onboarding flow. | How does staff log in? Same WhatsApp OTP? Separate phone number? Shared login? This is deliberately deferred ("no roles/permissions yet") but creates a real Day 1 problem. |

### 6.2 Post-Onboarding First-Day Experience

| Gap | Description |
|-----|-------------|
| **What happens between onboarding and first real adherence check?** | If doctor onboards at 3 PM, first adherence check goes at 7:30 AM next morning. 16-hour gap where nothing happens. Doctor may think system isn't working. |
| **No "what to expect" communication** | After onboarding, doctor doesn't know when the first message will be sent, what will happen tomorrow, or what their daily workflow should be. |
| **No sample/demo mode** | Doctor cannot explore dashboard with realistic data before adding real patients. Step 2's promise preview is static, not interactive. |

---

## 7. Data Integrity Risks

### 7.1 Schema-Level Risks

| Risk | Description | Severity |
|------|-------------|----------|
| **No UNIQUE constraint on patient phone + clinic** | Same patient can be added multiple times. Double messaging. Conflicting journey states. | HIGH |
| **No foreign key enforcement described** | Events reference journey_id, journeys reference patient_id, patients reference clinic_id. If foreign keys are not enforced, orphaned records can exist. | MEDIUM |
| **JSONB metadata is unvalidated** | Event metadata is freeform JSON. Different event types expect different metadata shapes. No runtime validation means malformed events can be stored. | MEDIUM |
| **No event versioning/schema evolution** | If event metadata structure changes (e.g., adherence_response adds new fields), old events have different shapes. Querying becomes fragile. | LOW (V1) / HIGH (V2+) |
| **journey.status is a denormalized field** | Journey has status (active/completed/dropped) but state should be derived from events. If status and events disagree, which is source of truth? | MEDIUM |
| **No audit trail for staff actions** | "No audit logs" is on the do-not-build list. But visit_confirmed events don't record WHO confirmed. created_by field exists but is underspecified. | MEDIUM |

### 7.2 Concurrency Risks

| Risk | Description | Severity |
|------|-------------|----------|
| **Two staff confirm same visit simultaneously** | Two visit_confirmed events for same visit_expected. Risk scoring counts both. | LOW |
| **Cron and manual action overlap** | Staff confirms visit at 7:29 AM. Cron runs at 7:30 AM and emits visit_missed for same visit_expected. Both events exist. Contradictory state. | HIGH |
| **Race between WhatsApp webhook and cron** | Patient replies "Yes" to adherence check at 7:29 AM. Cron runs at 7:30 AM, doesn't see the response yet, and computes incorrect risk. | MEDIUM |

### 7.3 Data Compliance Risks (DPDP Act)

| Risk | Description | Severity |
|------|-------------|----------|
| **No consent collection in V1 flow** | DPDP requires explicit consent before collecting personal data. V1 onboarding collects patient name and phone without consent event. | CRITICAL |
| **No data deletion workflow** | DPDP requires deletion on request. Events table is append-only by design. Deleting a patient requires purging events, which breaks event-sourcing integrity. | HIGH |
| **Data localization** | Railway has no India region. Patient data stored outside India. DPDP requires data localization for health data. | HIGH |
| **No DPA with Gupshup** | Gupshup processes patient phone numbers. DPDP requires Data Processing Agreement with processors. | MEDIUM |

---

## 8. Critical Questions Requiring Clarification

### CRITICAL (Blocks Implementation or Creates Risk)

**Q1. How does journey_completed get triggered?**
When a journey's duration expires, what happens? Does the system automatically emit journey_completed? Does the cron handle this? If not, adherence checks will be sent indefinitely past treatment end date.
- *Default assumption if unanswered*: Auto-complete when current_date > start_date + duration_days. Cron checks this nightly.

**Q2. What happens after a recovery message gets no response?**
The spec defines one recovery message sent when visit missed + 3 days. If patient ignores it, what next? A second message? Escalation to Critical? Doctor notification? The flow has a dead end here.
- *Default assumption*: Send one recovery message. If no response in 7 more days, escalate to Critical. Doctor sees it on dashboard. No further automated messages (to avoid spam).

**Q3. How is patient consent collected for WhatsApp messaging?**
DPDP Act requires explicit consent before sending messages. The onboarding flow adds a patient and starts automation with no consent step. Who consents -- the doctor on behalf of the patient? The patient via WhatsApp opt-in?
- *Default assumption*: First WhatsApp message includes opt-in. System requires patient to reply before continuing. Consent event stored.

**Q4. How do staff members authenticate?**
Staff is a primary persona (adds patients, confirms visits) but there is no staff login flow. Shared clinic login? Separate OTP? This is a Day 1 problem even though "roles" are deferred.
- *Default assumption*: Single shared clinic login. Anyone with clinic WhatsApp OTP can access. Staff vs. doctor is not differentiated in V1.

**Q5. What is the "action button" on the at-risk patient list?**
Dashboard shows an action button per patient. What does it do? Send recovery message? Open timeline? Call patient? Mark as contacted?
- *Default assumption*: Sends recovery message via WhatsApp if not already sent. Shows timeline if already sent.

### IMPORTANT (Significantly Affects UX)

**Q6. How are shared phone numbers handled?**
A family may share one WhatsApp number. Two patients, same phone, different journeys. Adherence check for which patient? Quick-reply response attributed to which journey?
- *Default assumption*: Warn on duplicate phone entry. If duplicates exist, include patient name in messages and use message metadata to attribute responses.

**Q7. Can journey parameters be modified after creation?**
Treatment duration extended, follow-up interval changed, journey paused. None of these are specified.
- *Default assumption*: Journeys are immutable in V1. To change, complete old journey and create new one.

**Q8. What does the dashboard "Revenue Protected" number derive from?**
Doc 06 says: `remaining_days x avg_visit_value`. But avg_visit_value is not a field in any table. Is it a global clinic setting? User input? Hardcoded?
- *Default assumption*: Clinic-level setting entered during onboarding or settings. Default to Rs 1,500 if not set.

**Q9. How does the system handle adherence check + pre-visit reminder on the same day?**
If visit is expected tomorrow and it's also an adherence check day, patient gets two messages. This violates the message fatigue principle.
- *Default assumption*: Pre-visit reminder replaces adherence check on reminder days. Only send one message per day.

**Q10. What triggers patient_returned?**
Is it manual staff action only? Or can it be inferred from visit_confirmed after a visit_missed period? What if patient calls to reschedule but doesn't visit -- is that a "return"?
- *Default assumption*: patient_returned is triggered only when staff marks a visit_confirmed after the patient was in At Risk or Critical status.

### NICE-TO-HAVE (Improves Clarity)

**Q11. Is there a maximum number of recovery messages per journey?**
Could the system send recovery messages weekly forever for a dropped patient?
- *Default assumption*: Max 3 recovery messages per journey. After that, manual intervention only.

**Q12. When does message fatigue rule change take effect?**
"First 21 days daily, then every 2 days." Is day 1 the journey start date or the first message date? What if journey starts on a day the cron has already run?
- *Default assumption*: Day 1 = journey start_date. Counting is calendar days, not message count.

**Q13. What is the offline PWA experience?**
Serwist is configured for offline fallback. Can staff add patients offline? Can they confirm visits offline? What syncs when back online?
- *Default assumption*: Offline shows read-only cached dashboard. No write operations offline in V1. Show "You're offline" banner.

**Q14. How are simulated onboarding events cleaned up?**
Step 5 creates demo visit_expected and visit_missed events. Are these in the real events table? Do they affect dashboard counts?
- *Default assumption*: Onboarding events are flagged with metadata `{demo: true}` and excluded from dashboard queries.

---

## 9. Recommended Next Steps

### Immediate (Before Writing Code)

1. **Define journey lifecycle terminal states**: Specify exact triggers for journey_completed and journey_dropped. Add these events to the V1 event list.

2. **Define recovery message escalation path**: What happens when recovery message gets no response? How many messages maximum? What is the terminal state?

3. **Resolve staff authentication**: Even without roles, decide: shared login, or individual OTP per staff phone? This affects every daily workflow.

4. **Add consent collection to the flow**: Either (a) first WhatsApp message is opt-in, or (b) doctor collects verbal consent and staff records it. Must be an event.

5. **Define dashboard action button behavior**: This is the doctor's primary interaction point. Must be specified before UI work.

### Before First Clinic Deploy

6. **Add phone uniqueness validation**: UNIQUE constraint on (phone, clinic_id) to prevent duplicate patients.

7. **Add message deduplication**: Prevent double-sends if cron runs twice. Key: (journey_id, event_type, DATE(event_time)).

8. **Define cron failure alerting**: If nightly cron doesn't run, the product is silently broken. Need health check.

9. **Handle cron/manual action race condition**: If visit_confirmed and visit_missed both exist for the same visit_expected, which wins? Define precedence rule.

10. **Add delivery status tracking to message events**: Store Gupshup delivery status in event metadata. Distinguish "sent but undelivered" from "delivered but no reply."

### Before Scaling Beyond 5 Clinics

11. **Resolve data localization**: Move database to India region (Neon Mumbai or AWS RDS Mumbai).

12. **Implement DPDP consent + deletion workflow**.

13. **Add phone number change flow**.

14. **Handle WhatsApp rate limits with message prioritization**: Recovery > Reminders > Adherence checks.

15. **Define journey modification patterns**: Pause, resume, extend duration, change interval.
