# Gupshup WhatsApp Business API: Integration Best Practices (2025-2026)

Reference guide for a solo developer building a patient follow-up system in India.

---

## 1. Subscription API (Replacing Deprecated Callback URL API)

### Deprecation Timeline
- **Jan 29, 2025**: Placeholder/testing webhooks removed; callback URL required for messages
- **April 30, 2025**: Callback URL API officially deprecated (extended to July 31, 2025)
- **May 2025**: Synchronous response sending deprecated; must use Send Message APIs
- **Migration**: Use Subscription API for all new integrations

### Configuration Steps
1. Navigate to **App > Integration > Webhooks** in Gupshup console
2. Click **Create Webhook**, add your HTTPS callback URL, save
3. Select event checkboxes: **Message events** and **System events**
4. Configure up to **5 subscriptions per app** (V2 and V3 APIs)

### Subscription Modes
| Mode | Purpose |
|------|---------|
| **FLOW_MESSAGE** | Standard inbound messages and interactive responses |
| **PAYMENTS** | Payment-related events only (V3 APIs) |
| **FAILED** | Separates failed delivery events from other events |
| **BILLING** | Billing-related events |

### Webhook Requirements
- Must have **public HTTPS access**
- Must return **HTTP 2xx** with empty response body
- Optimal acknowledgment: **< 100ms** (recommended: 500-1000ms)
- If no 2xx within **10 seconds**, Gupshup retries after a brief interval
- Process events **asynchronously**, acknowledge **synchronously**
- Only **1 URL per Delivery Events** category (latest URL wins)

### Recommended Architecture for Solo Dev
```
[Gupshup] --> [Express/Fastify endpoint] --> [Queue (BullMQ/Redis)]
                    |                              |
              Immediate 200 OK              Async worker processes
```

---

## 2. Template Message Approval (Healthcare in India)

### What Gets APPROVED
- **Appointment reminders**: "Hi {{1}}, your appointment with Dr. {{2}} is on {{3}} at {{4}}. Reply 1 to confirm or 2 to reschedule."
- **Follow-up check-ins**: "Hi {{1}}, it's been {{2}} days since your visit. How are you feeling? Reply with any concerns."
- **Lab result notifications**: "Hi {{1}}, your {{2}} results are ready. Please visit our clinic or call {{3}} to discuss."
- **Medication reminders** (utility category): "Hi {{1}}, reminder to take your {{2}} medication as prescribed."
- **Payment/billing** (utility): "Hi {{1}}, your invoice of Rs. {{2}} for visit on {{3}} is due. Pay at {{4}}."

### What Gets REJECTED
- **Drug promotion/sales**: Anything selling pharmaceutical drugs or medical devices
- **Diagnostic marketing**: Marketing templates promoting specific tests or procedures
- **Templates with sensitive data requests**: Asking for government IDs, full card numbers
- **Mismatched category**: Filing a marketing template as "utility"
- **Formatting errors**: Non-sequential variables, variables at start/end of message
- **Excessive variables**: Too many {{N}} placeholders relative to static text
- **Templates > 550 characters** in body (marketing/utility)
- **Templates with > 10 emojis** in body

### Common Rejection Codes
| Code | Meaning | Fix |
|------|---------|-----|
| `TAG_CONTENT_MISMATCH` | Category/language doesn't match content | Ensure utility templates are truly transactional |
| `INVALID_FORMAT` | Placeholder formatting wrong | Use sequential `{{1}}`, `{{2}}`; never start/end with variable |
| `ABUSIVE` | Violates business policy | Remove threatening language, sensitive data requests |
| `SCAM` | Looks like phishing | Use your own domain, not wa.me links or shortened URLs |

### Tips for Healthcare Utility Templates
1. **Always file appointment/follow-up reminders as UTILITY** (not marketing)
2. **Provide sample values** when submitting (mandatory since 2025)
3. **Keep body under 550 characters**
4. **Never place `{{1}}` at the very start or end** of the template body
5. **Include your clinic/business name** as static text (not a variable)
6. **Avoid medical advice** in templates; stick to logistics (time, place, action)
7. **For India WABAs**: Templates may face additional scrutiny; be extra clear about purpose

---

## 3. Interactive Quick-Reply Buttons

### Limits
- Maximum **3 quick-reply buttons** per template message
- Each button text: max **20 characters**
- Button payload (postback): max **256 characters**

### Sending a Template with Quick-Reply Buttons (Gupshup API)
```json
POST /wa/api/v1/msg
{
  "channel": "whatsapp",
  "source": "YOUR_PHONE",
  "destination": "PATIENT_PHONE",
  "message": {
    "type": "template",
    "template": {
      "name": "appointment_reminder",
      "language": { "code": "en" },
      "components": [
        {
          "type": "body",
          "parameters": [
            { "type": "text", "text": "Priya" },
            { "type": "text", "text": "Dr. Sharma" },
            { "type": "text", "text": "March 5, 2026" }
          ]
        },
        {
          "type": "button",
          "sub_type": "quick_reply",
          "index": 0,
          "parameters": [{ "type": "payload", "payload": "CONFIRM_APT_12345" }]
        },
        {
          "type": "button",
          "sub_type": "quick_reply",
          "index": 1,
          "parameters": [{ "type": "payload", "payload": "RESCHEDULE_APT_12345" }]
        },
        {
          "type": "button",
          "sub_type": "quick_reply",
          "index": 2,
          "parameters": [{ "type": "payload", "payload": "CANCEL_APT_12345" }]
        }
      ]
    }
  }
}
```

### Webhook Payload When Patient Clicks a Button
```json
{
  "app": "YourApp",
  "timestamp": 1709395200000,
  "version": 2,
  "type": "message",
  "payload": {
    "id": "wamid.XXXX",
    "source": "919876543210",
    "type": "button",
    "payload": {
      "title": "Confirm",
      "postbackText": "CONFIRM_APT_12345"
    },
    "sender": {
      "phone": "919876543210",
      "name": "Priya",
      "country_code": "91",
      "dial_code": "91"
    },
    "context": {
      "id": "wamid.ORIGINAL_MSG_ID",
      "gsId": "gs-uuid-of-original-message"
    }
  }
}
```

### Handling Pattern
```javascript
app.post('/webhook', (req, res) => {
  res.status(200).send(''); // Acknowledge immediately

  const { payload } = req.body;
  if (payload.type === 'button') {
    const action = payload.payload.postbackText; // e.g., "CONFIRM_APT_12345"
    const patientPhone = payload.sender.phone;
    const originalMsgId = payload.context?.gsId;

    // Parse action and appointment ID
    const [verb, , appointmentId] = action.split('_');
    // Route to handler: confirmAppointment(), rescheduleAppointment(), cancelAppointment()
    queue.add('button-response', { verb, appointmentId, patientPhone });
  }
});
```

---

## 4. Delivery Status Tracking

### Webhook Event Types (Message Events)
| Event | When Fired | Use Case |
|-------|-----------|----------|
| `enqueued` | Message accepted by Gupshup (queued for WhatsApp) | Log send attempt |
| `sent` | Message delivered to WhatsApp servers | Confirm dispatch |
| `delivered` | Message arrived on patient's device | Mark as delivered |
| `read` | Patient opened/read the message | Track engagement |
| `failed` | Message could not be sent | Trigger fallback (SMS, call) |
| `deleted` | Message was deleted | Update UI if applicable |

### Delivery Event Payload
```json
{
  "app": "YourApp",
  "timestamp": 1709395200000,
  "version": 2,
  "type": "message-event",
  "payload": {
    "id": "gupshup-msg-id",
    "whatsappMessageId": "wamid.XXXX",
    "type": "delivered",
    "destination": "919876543210",
    "payload": {
      "ts": 1709395200
    }
  }
}
```

### Failed Delivery Handling Pattern
```javascript
async function handleDeliveryEvent(event) {
  const { type, destination, id } = event.payload;

  switch (type) {
    case 'enqueued':
      await db.updateMessageStatus(id, 'queued');
      break;
    case 'sent':
      await db.updateMessageStatus(id, 'sent');
      break;
    case 'delivered':
      await db.updateMessageStatus(id, 'delivered');
      break;
    case 'read':
      await db.updateMessageStatus(id, 'read');
      break;
    case 'failed':
      await db.updateMessageStatus(id, 'failed');
      const errorCode = event.payload.payload?.code;

      if (errorCode === 470) {
        // Session expired - need template message
        await scheduleTemplateRetry(id, destination);
      } else if (errorCode === 471) {
        // Rate limited - backoff and retry
        await scheduleRetryWithBackoff(id, destination);
      } else if (errorCode === 1002) {
        // Number not on WhatsApp - fallback to SMS
        await fallbackToSMS(destination);
      } else if (errorCode === 1008) {
        // User not opted in
        await flagForOptInRequest(destination);
      } else {
        // Generic failure - retry once, then flag for manual review
        await scheduleGenericRetry(id, destination);
      }
      break;
  }
}
```

### Recommended: Message Status State Machine
```
QUEUED --> SENT --> DELIVERED --> READ
  |         |         |
  v         v         v
FAILED   FAILED    (terminal)
  |
  v
RETRY --> QUEUED (max 3 retries)
  |
  v
FALLBACK_SMS
```

---

## 5. Rate Limits

### Throughput Limits
| Limit Type | Value | Notes |
|------------|-------|-------|
| API calls (message sending) | **20 msg/sec** | Per Gupshup account |
| Partner API rate limit | **10 req/sec** | With 1-second cooldown |
| Webhook acknowledgment | **< 10 sec** | Or Gupshup retries |

### Messaging Tiers (Per Phone Number, Rolling 24hr)
| Tier | Unique Contacts | How to Reach |
|------|----------------|--------------|
| Tier 1 | 1,000 | Default for new numbers |
| Tier 2 | 10,000 | Good quality + volume over time |
| Tier 3 | 100,000 | Sustained good quality |
| Tier 4 | Unlimited | Enterprise-level quality |

### Backpressure Implementation
```javascript
const Bottleneck = require('bottleneck');

// Gupshup allows 20 msg/sec; use 15 for safety margin
const limiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 67, // ~15 msg/sec (1000ms / 15)
  reservoir: 15,
  reservoirRefreshAmount: 15,
  reservoirRefreshInterval: 1000,
});

// Wrap Gupshup API call
const sendMessage = limiter.wrap(async (destination, template, params) => {
  try {
    const response = await gupshupClient.sendTemplate(destination, template, params);
    return response;
  } catch (error) {
    if (error.statusCode === 429 || error.code === 471) {
      // Rate limited by WhatsApp - exponential backoff
      const retryAfter = error.retryAfter || 60;
      await sleep(retryAfter * 1000);
      throw error; // Bottleneck will retry
    }
    throw error;
  }
});

// Queue-based sending for batch follow-ups
async function sendBatchFollowUps(patients) {
  const results = await Promise.allSettled(
    patients.map(p => sendMessage(p.phone, 'follow_up_check', [p.name, p.daysSinceVisit]))
  );
  // Log failures for retry
  results.forEach((r, i) => {
    if (r.status === 'rejected') {
      retryQueue.add({ patient: patients[i], attempt: 1 });
    }
  });
}
```

---

## 6. Cost Optimization (July 2025 Per-Message Pricing)

### Pricing Model (Effective July 1, 2025)
| Message Type | Within 24hr Window | Outside 24hr Window |
|-------------|-------------------|---------------------|
| **Utility** (appointment reminders, follow-ups) | **FREE** | ~INR 0.30-0.35/msg |
| **Authentication** (OTP) | Charged per message | Charged per message |
| **Marketing** (promotions) | Charged per message | ~INR 0.78-0.86/msg |
| **Service** (free-form replies to patient messages) | **FREE** | N/A (only within window) |

### The 24-Hour Customer Service Window
- Opens when a **patient messages you first**
- Stays active for **24 hours from their most recent message**
- **Utility templates sent within this window are FREE**
- Service (free-form) messages within this window are FREE

### Cost Optimization Strategies for Patient Follow-Up

#### Strategy 1: Prompt Patient Responses to Open Windows
```
Template: "Hi {{1}}, your follow-up with Dr. {{2}} is in 2 days.
Reply YES to confirm or HELP for questions."
                         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                    Encourages reply --> opens 24hr free window
```

#### Strategy 2: Batch Follow-Ups After Patient Interaction
When a patient replies (opening the window), immediately send all pending utility messages:
1. Appointment confirmation (free utility within window)
2. Pre-visit instructions (free utility within window)
3. Payment reminder (free utility within window)

#### Strategy 3: Conversation Flow Design
```
Day 0: Patient visits clinic
  --> Send appointment follow-up template (UTILITY, charged ~INR 0.35)
  --> Patient replies "Thanks" (opens 24hr window)
  --> Send medication instructions (FREE utility within window)
  --> Send next appointment details (FREE utility within window)

Day 7: Automated check-in
  --> Send follow-up template (UTILITY, charged ~INR 0.35)
  --> If patient replies, send additional info FREE
```

#### Strategy 4: Volume-Based Pricing Tiers
Higher monthly volumes unlock lower per-message rates for utility and authentication. Track monthly volumes and forecast to negotiate better rates with Gupshup.

### Gupshup Markup
Gupshup adds approximately **INR 0.08/message** on top of Meta's fee. On 10,000 messages/month, that's INR 800 extra. Factor this into cost projections.

---

## 7. Error Codes and Handling Patterns

### Critical Error Codes
| Code | Name | Meaning | Action |
|------|------|---------|--------|
| **470** | Session Expired | 24hr window closed; no customer reply within 24h | Re-send as template message (not session message) |
| **471** | Rate Limited / Spam | Phone number flagged for too many messages or marked spam | Check quality status in WhatsApp Manager; slow down sending; implement exponential backoff |
| **500** | Internal Server Error | Gupshup server issue | Retry with exponential backoff (max 3 attempts) |
| **1001** | Bot Mismatch | Sender details don't match mapped bot | Verify app configuration in Gupshup dashboard |
| **1002** | Not on WhatsApp | Destination number not registered on WhatsApp | Fallback to SMS; flag number in DB |
| **1003** | Low Wallet Balance | Gupshup prepaid balance insufficient | Alert admin; auto-recharge if supported |
| **1008** | Not Opted In | User hasn't opted in or is inactive | Send opt-in request via other channel; do not retry |

### Comprehensive Error Handler
```javascript
class GupshupErrorHandler {
  static async handle(error, messageId, destination) {
    const code = error.code || error.statusCode;

    switch (code) {
      case 470:
        // Session expired - safe to retry with template
        return { action: 'RETRY_AS_TEMPLATE', delay: 0 };

      case 471:
        // Rate limited - check quality rating
        console.warn(`Rate limited for ${destination}. Check WhatsApp Manager quality status.`);
        return {
          action: 'BACKOFF_RETRY',
          delay: Math.min(60000 * Math.pow(2, error.attempt || 0), 3600000), // Max 1hr
          maxRetries: 3
        };

      case 500:
        return {
          action: 'RETRY',
          delay: 5000 * Math.pow(2, error.attempt || 0),
          maxRetries: 3
        };

      case 1002:
        return { action: 'FALLBACK_SMS', delay: 0 };

      case 1003:
        await alertAdmin('Gupshup wallet balance low!');
        return { action: 'PAUSE_ALL', delay: 0 };

      case 1008:
        return { action: 'FLAG_OPT_IN_NEEDED', delay: 0 };

      default:
        console.error(`Unknown Gupshup error ${code}:`, error);
        return {
          action: 'RETRY',
          delay: 10000,
          maxRetries: 1
        };
    }
  }
}
```

---

## 8. India-Specific Compliance

### DLT Registration Requirements
**DLT (Distributed Ledger Technology) registration is MANDATORY** under TRAI guidelines for any business sending commercial messages in India, including WhatsApp.

#### Required Documents
- PAN Card
- GST Registration Certificate
- Certificate of Incorporation (or equivalent)
- Letter of Authorization (LOA)

#### DLT Registration Steps
1. Register as an **Enterprise** on a TRAI-approved DLT platform (Jio, Airtel, Vodafone-Idea, BSNL, MTNL)
2. Register your **headers** (sender IDs)
3. Register your **content templates** with variable tags
4. Get unique **Entity ID** and **Template IDs**
5. Share these with Gupshup during app configuration

### Healthcare Content Restrictions on WhatsApp

#### PROHIBITED
- Selling pharmaceutical drugs or medical devices via WhatsApp
- Promoting specific medications or treatments in marketing templates
- Requesting sensitive medical information (diagnosis, test results) via template variables
- Using WhatsApp commerce features (catalog/cart) for drugs/devices

#### ALLOWED
- Appointment reminders and confirmations (utility templates)
- Follow-up check-ins (utility templates, no medical advice)
- Lab result availability notifications (not the results themselves)
- Payment/billing communications
- Medication reminders (reminder to take prescribed meds, not selling)
- Prescription refill reminders
- Clinic/facility information and directions

#### Exception: Clinic/Lab Services
If your primary business is a **clinic, lab, or patient care service** (not a pharmacy), you can use WhatsApp more freely. Ensure your WABA profile specifies the medical service (clinic, laboratory, vaccines, diagnosis center).

### NDHM (National Digital Health Mission) Considerations
- Patient data shared via WhatsApp should comply with India's Digital Personal Data Protection Act (DPDPA) 2023
- Obtain explicit consent before sending health-related messages
- Do NOT include actual medical reports/results in WhatsApp messages; send notification + secure portal link instead
- Maintain audit trail of all patient communications

### Template Wording Guidelines for India Healthcare
```
GOOD (Utility - will likely pass):
"Hi {{1}}, reminder: your appointment at {{2}} Clinic with Dr. {{3}} is
scheduled for {{4}} at {{5}}. Reply CONFIRM or RESCHEDULE."

GOOD (Utility - follow-up):
"Hi {{1}}, it has been {{2}} days since your visit to {{3}} Clinic.
We hope you are feeling better. For any concerns, call us at {{4}}."

BAD (will be rejected - medical advice):
"Hi {{1}}, based on your {{2}} diagnosis, you should take {{3}} medication
twice daily. Buy it at {{4}} pharmacy."

BAD (will be rejected - selling drugs):
"Hi {{1}}, get 20% off on {{2}} tablets this week! Order now at {{3}}."
```

---

## Quick Reference: Solo Developer Architecture

```
                    Patient's WhatsApp
                          |
                    [Gupshup Cloud]
                     /          \
            Inbound msgs    Delivery events
                 |                |
          [Your Express.js Server - Single endpoint]
                 |                |
           /webhook          /webhook
          (type:message)   (type:message-event)
                 |                |
          [BullMQ Queue]   [Status updater]
                 |                |
          [Worker]          [PostgreSQL]
           |    |    |
     Confirm  Reschedule  Follow-up
     handler   handler     scheduler
                              |
                    [Cron: Send templates]
                              |
                    [Rate limiter (Bottleneck)]
                              |
                    [Gupshup Send API]
```

### Minimum Viable Setup Checklist
1. [ ] Register on Gupshup, create WhatsApp app
2. [ ] Complete DLT registration (TRAI requirement)
3. [ ] Set up WABA with clinic/healthcare profile
4. [ ] Submit utility templates for approval (with samples)
5. [ ] Configure Subscription API with webhook URL
6. [ ] Enable message events: enqueued, failed, sent, delivered, read
7. [ ] Implement webhook endpoint with immediate 200 acknowledgment
8. [ ] Set up async processing queue (BullMQ + Redis)
9. [ ] Implement rate limiter (Bottleneck, 15 msg/sec safety margin)
10. [ ] Build error handling with fallback-to-SMS for code 1002
11. [ ] Set up wallet balance monitoring (alert on code 1003)
12. [ ] Design conversation flows to maximize free 24hr utility window
13. [ ] Implement delivery status tracking in database
14. [ ] Set up retry logic with exponential backoff

---

## Sources

- [Gupshup Technical Updates 2025](https://support.gupshup.io/hc/en-us/articles/42866242419609-Gupshup-Technical-and-Policy-Updates-2025)
- [Gupshup Webhooks Documentation](https://console-docs.gupshup.io/docs/webhooks)
- [Gupshup Subscriptions and Notifications](https://docs.gupshup.io/docs/subscriptions-and-notifications)
- [Gupshup Message Events](https://docs.gupshup.io/docs/message-events)
- [Gupshup Error Codes](https://docs.gupshup.io/docs/error-and-status-messages)
- [Gupshup Template Messages](https://docs.gupshup.io/docs/template-messages)
- [Gupshup Add Subscription API](https://docs.gupshup.io/reference/addsubscriptionforapp)
- [Gupshup Rate Limits FAQ](https://support.gupshup.io/hc/en-us/articles/360012076319-How-many-messages-per-second-can-I-send-using-the-API)
- [Gupshup Partner Rate Limits](https://partner-docs.gupshup.io/docs/partner-rate-limits)
- [WhatsApp Business Policy](https://business.whatsapp.com/policy)
- [WhatsApp Pricing Guide (eesel.ai)](https://www.eesel.ai/blog/whatsapp-business-api-latest-pricing-and-policy-changes)
- [WhatsApp Pricing Updates (ControlHippo)](https://controlhippo.com/blog/whatsapp/whatsapp-business-api-pricing-update/)
- [Template Rejection Reasons (Spur)](https://help.spurnow.com/en/articles/11999432-whatsapp-template-rejected-common-reasons-and-how-to-fix)
- [Template Approval Checklist (WUSeller)](https://www.wuseller.com/blog/whatsapp-template-approval-checklist-27-reasons-meta-rejects-messages/)
- [WhatsApp Healthcare Guide (Haptik)](https://www.haptik.ai/blog/whatsapp-business-messaging-regulated-sectors)
- [WhatsApp Healthcare Patient Communication (SparkTG)](https://sparktg.com/blog/whatsapp-business-api-healthcare-patient-communication)
- [DLT Registration India Guide](https://uniquedigitaloutreach.in/2026/02/16/dlt-registration-in-india-explained-no-confusion/)
