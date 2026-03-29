# Mel Castanares Real Estate — Leads API Reference

**Base URL:** `https://<your-domain>/api`

All endpoints accept and return `application/json`. All POST bodies must include `Content-Type: application/json`.

---

## POST `/api/leads/contact`

Submitted when a visitor fills out the **Contact Form** on the website.

### Request Body

| Field     | Type   | Required | Description                                              |
|-----------|--------|----------|----------------------------------------------------------|
| `name`    | string | ✅       | Full name of the lead                                    |
| `email`   | string | ✅       | Email address                                            |
| `phone`   | string | —        | Phone number (optional)                                  |
| `message` | string | —        | Message body from the form                               |
| `source`  | string | —        | Origin of the lead (default: `website-contact-form`)     |
| `intent`  | string | —        | `"buy"`, `"sell"`, `"invest"`, `"relocation"`, or `null` |

### Example Request

```json
{
  "name": "Sarah Tanaka",
  "email": "sarah@example.com",
  "phone": "808-555-0101",
  "message": "I'm looking to buy in Kailua with a budget around $900K.",
  "intent": "buy"
}
```

### Success Response `200`

```json
{
  "ok": true,
  "message": "Thanks! Mel will be in touch within 24 hours.",
  "leadId": "c-1713980000000"
}
```

### Error Response `400`

```json
{
  "ok": false,
  "error": "name and email are required"
}
```

---

## POST `/api/leads/valuation`

Submitted when a visitor requests a **Home Valuation** through the valuation tool.

### Request Body

| Field          | Type   | Required | Description                                       |
|----------------|--------|----------|---------------------------------------------------|
| `name`         | string | ✅       | Full name                                         |
| `email`        | string | ✅       | Email address                                     |
| `address`      | string | ✅       | Property street address                           |
| `phone`        | string | —        | Phone number                                      |
| `city`         | string | —        | City / neighborhood                               |
| `propertyType` | string | —        | `"single-family"`, `"condo"`, `"townhome"`, etc.  |
| `bedrooms`     | number | —        | Number of bedrooms                                |
| `bathrooms`    | number | —        | Number of bathrooms                               |
| `sqft`         | number | —        | Approximate square footage                        |
| `notes`        | string | —        | Any additional context from the seller            |

### Example Request

```json
{
  "name": "David Kahananui",
  "email": "david@example.com",
  "phone": "808-555-0199",
  "address": "1234 Kamehameha Hwy",
  "city": "Pearl City",
  "propertyType": "single-family",
  "bedrooms": 3,
  "bathrooms": 2,
  "sqft": 1450,
  "notes": "Renovated kitchen in 2022, solar panels installed."
}
```

### Success Response `200`

```json
{
  "ok": true,
  "message": "Got it! Mel will send your home valuation report within 24 hours.",
  "leadId": "v-1713980000001"
}
```

### Error Response `400`

```json
{
  "ok": false,
  "error": "name, email, and address are required"
}
```

---

## POST `/api/leads/chat`

Captured when a visitor provides contact info through the **AI Chat widget** or when the chat system logs a hot lead.

### Request Body

| Field                 | Type   | Required       | Description                                        |
|-----------------------|--------|----------------|----------------------------------------------------|
| `email`               | string | ✅ (or phone)  | Email address                                      |
| `phone`               | string | ✅ (or email)  | Phone number                                       |
| `name`                | string | —              | Name if provided during chat                       |
| `question`            | string | —              | The initial question that triggered the lead       |
| `conversationSummary` | string | —              | Brief summary of the chat exchange for Mel's context |
| `source`              | string | —              | Origin (default: `ai-chat-widget`)                 |

### Example Request

```json
{
  "name": "Leilani Moku",
  "email": "leilani@example.com",
  "phone": "808-555-0177",
  "question": "What neighborhoods are best for families near military bases?",
  "conversationSummary": "User is military family relocating from San Diego. Interested in Ewa Beach or Pearl City. Budget ~$750K. Timeline: 4 months.",
  "source": "ai-chat-widget"
}
```

### Success Response `200`

```json
{
  "ok": true,
  "message": "Thanks! Mel will follow up with you soon.",
  "leadId": "ch-1713980000002"
}
```

### Error Response `400`

```json
{
  "ok": false,
  "error": "at least one of email or phone is required"
}
```

---

## Notes for Integration

- All leads are currently **logged to server console**. To route them to email (SendGrid, Mailgun) or a CRM (HubSpot, Follow Up Boss), add the provider SDK to the `leads.ts` route file and call it after the `logLead()` line.
- Lead IDs (`leadId`) are timestamp-based and unique per request. Store them if you're building a lead tracking system.
- All endpoints return `200` on success regardless of downstream delivery. If you need transactional guarantees, add a database write before returning.

---

*Last updated: March 2026 · Contact: mel@homesweethomehawaii.com*
