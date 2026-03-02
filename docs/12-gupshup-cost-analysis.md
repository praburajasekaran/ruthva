# Gupshup WhatsApp API — Cost Analysis for Ruthva V1

## Per-Message Rates (India, 2026)

Gupshup follows a per-message pricing model combining Meta's base fee + Gupshup's platform markup (~₹0.08/message).

| Message Category | Meta Base Rate | Total (with markup) |
|---|---|---|
| Marketing | ₹0.86–0.88 | ₹0.94–0.96 |
| Utility / Transactional | ₹0.11–0.13 | ₹0.19–0.21 |
| Authentication (OTP) | ₹0.11–0.14 | ₹0.19–0.22 |
| Service (User-Initiated) | FREE | ₹0.08 |

Meta increased India's marketing message rates by ~10% as of January 2026.

## Fixed & Variable Fees

- **One-time setup fee:** ~₹2,000 (account activation + number registration)
- **Monthly platform cap:** Gupshup caps platform fees at $75 (~₹6,200)/month. Once reached, Gupshup surcharges are waived — Meta fees still apply.
- **Media surcharge:** Messages with files (images/videos) between 64KB–5MB incur ~₹0.08 extra per message.

## Free Tiers & Windows

- **72-hour free window:** Messages via Click-to-WhatsApp Ads or Facebook Page CTAs are free for 72 hours.
- **24-hour service window:** User-initiated chats — business replies within 24 hours are free of Meta charges. Gupshup still charges its ₹0.08 markup.

## Cost Per Patient (60-Day Treatment Cycle)

Based on Ruthva's messaging patterns (max 1 message/day per patient):

| Message Type | Count | Category | Rate | Cost |
|---|---|---|---|---|
| Daily adherence checks | ~52 | Utility | ₹0.20 | ₹10.40 |
| Pre-visit reminders | ~8 | Utility | ₹0.20 | ₹1.60 |
| Recovery messages (if at-risk) | 0–2 | Marketing* | ₹0.95 | ₹0–1.90 |
| Patient quick-reply responses | ~35 | Service | ₹0.08 | ₹2.80 |
| **Total per patient per cycle** | | | | **₹14.80–16.70** |

**Per patient per month: ~₹7.50–8.50**

*Recovery message classification matters — see note below.

## Clinic-Level Economics (100 Active Patients)

| Item | Value |
|---|---|
| Monthly messaging cost (Meta + Gupshup) | ₹750–850/month |
| One-time setup fee | ₹2,000 |
| Ruthva subscription revenue | ₹1,999/month |
| Gross margin after messaging | ~₹1,150–1,250/month |
| Messaging as % of revenue | ~38–42% |

## At Scale

| Active Patients | Monthly Messaging Cost | Notes |
|---|---|---|
| 50 | ₹375–425 | Small clinic |
| 100 | ₹750–850 | Typical Segment B clinic |
| 200 | ₹1,500–1,700 | Growing practice |
| 800+ | ₹6,200+ (cap kicks in) | Gupshup platform fee capped, only Meta fees scale |

Gupshup's ₹6,200/month platform cap kicks in at ~77,500 messages. At 100 patients generating ~9,500 messages/month, it's irrelevant. Only matters at ~800+ active patients.

## Key Considerations

### Recovery message classification

Recovery messages are the cost wildcard. Marketing (₹0.95) vs utility (₹0.20) is a 4.7x difference per message.

To qualify as **utility**, recovery templates should be worded as treatment continuity:
- "Your next session at {{clinic_name}} is pending. Would you like to continue?"
- NOT "Come back for a special offer" or promotional language

### Patient replies are not free

Gupshup charges ₹0.08 per inbound message even though Meta doesn't charge for service conversations. Since Ruthva's adherence checks are designed to generate quick-reply responses, this adds ~₹2.80/patient/cycle.

### Volume discounts

Starting July 2025, Meta offers volume-based discounts for utility and authentication messages — progressively lower rates as monthly volume to a specific country increases. Relevant once Ruthva scales beyond a few hundred patients.

### Enterprise quotes

For high-volume needs, Gupshup offers custom enterprise quotes with lower per-message rates in exchange for committed monthly spend.
