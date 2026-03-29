# Mel Castanares Real Estate — Leads API Reference

**Base URL (production):** `https://melcastanares.techsavvyhawaii.com/api`  
**Base URL (local dev):** `http://localhost:8080/api`

All endpoints accept and return `application/json`. POST bodies must include `Content-Type: application/json`.

---

## Endpoints Overview

| Method | Path | Trigger | Required Fields |
|--------|------|---------|-----------------|
| POST | `/api/leads/contact` | Contact form submission | `name`, `email` |
| POST | `/api/leads/valuation` | Home valuation request | `name`, `email`, `address` |
| POST | `/api/leads/chat` | AI chat widget lead capture | `email` OR `phone` |

---

## POST `/api/leads/contact`

Submitted when a visitor fills out the **Contact Form** on the website.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Full name of the lead |
| `email` | string | ✅ | Email address |
| `phone` | string | — | Phone number (any format, e.g. `808-555-0101`) |
| `message` | string | — | Message body from the contact form |
| `source` | string | — | Lead origin. Default: `website-contact-form` |
| `intent` | string | — | `"buy"`, `"sell"`, `"invest"`, `"relocation"`, or `null` |

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

### Server Log Output

```
[LEAD] [2026-03-29T06:00:00.000Z] type=contact {"type":"contact","receivedAt":"...","name":"Sarah Tanaka","email":"sarah@example.com","phone":"808-555-0101","message":"...","source":"website-contact-form","intent":"buy"}
```

---

## POST `/api/leads/valuation`

Submitted when a visitor requests a **Home Valuation** through the valuation tool.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ✅ | Full name |
| `email` | string | ✅ | Email address |
| `address` | string | ✅ | Property street address (e.g. `1234 Kamehameha Hwy`) |
| `phone` | string | — | Phone number |
| `city` | string | — | City or neighborhood (e.g. `Pearl City`, `Mililani`) |
| `propertyType` | string | — | `"single-family"`, `"condo"`, `"townhome"`, `"land"`, `"multi-family"` |
| `bedrooms` | number | — | Number of bedrooms |
| `bathrooms` | number | — | Number of bathrooms (use `2.5` for half-baths) |
| `sqft` | number | — | Approximate interior square footage |
| `notes` | string | — | Free-text context from the seller (renovations, solar, etc.) |

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

Captured when a visitor provides contact info through the **AI Chat widget** or when the chat system captures a hot lead after a conversation.

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | ✅ (or phone) | Email address |
| `phone` | string | ✅ (or email) | Phone number |
| `name` | string | — | Name if provided during chat |
| `question` | string | — | The initial question that triggered the lead |
| `conversationSummary` | string | — | Brief summary of the chat exchange for Mel's context |
| `source` | string | — | Origin. Default: `ai-chat-widget` |

### Example Request

```json
{
  "name": "Leilani Moku",
  "email": "leilani@example.com",
  "phone": "808-555-0177",
  "question": "What neighborhoods are best for families near military bases?",
  "conversationSummary": "Military family relocating from San Diego. Interested in Ewa Beach or Pearl City. Budget ~$750K. Timeline: 4 months.",
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

## CRM Integration Guide

### Where to Add Your Integration

All three routes follow the same pattern in `artifacts/api-server/src/routes/leads.ts`:

```typescript
logLead("contact", lead);   // ← logs to console

// ADD YOUR CRM / EMAIL CALL HERE — before the return statement:
// await sendToHubSpot(lead);
// await sendToFollowUpBoss(lead);
// await sendEmail(lead);

return res.status(200).json({ ... });
```

Install your provider's SDK via:

```bash
pnpm --filter @workspace/api-server add @hubspot/api-client
pnpm --filter @workspace/api-server add follow-up-boss-sdk
pnpm --filter @workspace/api-server add @sendgrid/mail
```

---

### HubSpot Integration (Recommended)

HubSpot is an excellent fit — it has a free CRM tier, direct real estate templates, and a strong Contacts API.

```typescript
import { Client } from "@hubspot/api-client";

const hubspot = new Client({ accessToken: process.env.HUBSPOT_TOKEN });

async function sendToHubSpot(lead: any) {
  await hubspot.crm.contacts.basicApi.create({
    properties: {
      firstname:    lead.name?.split(" ")[0] || "",
      lastname:     lead.name?.split(" ").slice(1).join(" ") || "",
      email:        lead.email,
      phone:        lead.phone || "",
      hs_lead_source: "WEBSITE",
      message:      lead.message || lead.conversationSummary || "",
      // Custom properties (create in HubSpot settings first):
      lead_type:    lead.type,
      lead_intent:  lead.intent || "",
      property_address: lead.address || "",
    },
  });
}
```

**HubSpot field mapping:**

| Lead field | HubSpot property |
|------------|------------------|
| `name` | `firstname` + `lastname` |
| `email` | `email` |
| `phone` | `phone` |
| `intent` | Custom: `lead_intent` |
| `address` | Custom: `property_address` |
| `message` / `conversationSummary` | `message` |
| `type` | Custom: `lead_type` |
| `source` | `hs_lead_source` |

---

### Follow Up Boss Integration

Follow Up Boss is purpose-built for real estate and has excellent lead routing.

```typescript
async function sendToFollowUpBoss(lead: any) {
  await fetch("https://api.followupboss.com/v1/events", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Basic ${Buffer.from(process.env.FUB_API_KEY + ":").toString("base64")}`,
    },
    body: JSON.stringify({
      source:   "Website",
      system:   "Mel Castanares Real Estate",
      type:     lead.type === "valuation" ? "Seller" : "Buyer",
      people: [{
        name:   lead.name,
        emails: [{ value: lead.email }],
        phones: lead.phone ? [{ value: lead.phone }] : [],
      }],
      propertyStreet: lead.address || "",
      message:        lead.message || lead.conversationSummary || lead.question || "",
      tags:           [lead.source, lead.intent].filter(Boolean),
    }),
  });
}
```

---

### Email Notification via SendGrid

To send Mel an instant email alert for each new lead:

```typescript
import sgMail from "@sendgrid/mail";
sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

async function notifyMelByEmail(lead: any) {
  await sgMail.send({
    to:      "mel@homesweethomehawaii.com",
    from:    "leads@melcastanares.techsavvyhawaii.com",
    subject: `New ${lead.type} lead — ${lead.name}`,
    text:    JSON.stringify(lead, null, 2),
    html: `
      <h2>New ${lead.type} lead</h2>
      <p><strong>Name:</strong> ${lead.name}</p>
      <p><strong>Email:</strong> ${lead.email}</p>
      <p><strong>Phone:</strong> ${lead.phone || "—"}</p>
      <p><strong>Intent:</strong> ${lead.intent || "—"}</p>
      <p><strong>Message:</strong> ${lead.message || lead.conversationSummary || "—"}</p>
      <p><strong>Received:</strong> ${lead.receivedAt}</p>
    `,
  });
}
```

---

### Webhook / Zapier Pattern

If you want to route leads to any tool via Zapier, Make, or a custom webhook:

```typescript
async function sendWebhook(lead: any) {
  await fetch(process.env.WEBHOOK_URL!, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event:     "lead.created",
      leadId:    lead.leadId,
      type:      lead.type,
      timestamp: lead.receivedAt,
      contact: {
        name:   lead.name,
        email:  lead.email,
        phone:  lead.phone,
      },
      details: lead,
    }),
  });
}
```

Set `WEBHOOK_URL` as an environment variable in Replit Secrets.

---

### Environment Variables

Add all secrets via Replit Secrets (not `.env` files):

| Variable | Description |
|----------|-------------|
| `HUBSPOT_TOKEN` | HubSpot private app access token |
| `FUB_API_KEY` | Follow Up Boss API key |
| `SENDGRID_API_KEY` | SendGrid API key |
| `WEBHOOK_URL` | Zapier/Make webhook URL |

---

### Authentication

The leads API endpoints are currently **public** (no API key required) — by design, since they are called directly from the browser. To add server-side protection for admin tools or external callers:

1. **Simple shared secret:** Check a `X-Api-Key: <secret>` header on all incoming requests using Express middleware.
2. **Rate limiting:** Add `express-rate-limit` to prevent spam/scraping.

```bash
pnpm --filter @workspace/api-server add express-rate-limit
```

```typescript
import rateLimit from "express-rate-limit";

router.use("/leads", rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                    // max 20 lead submissions per IP per window
  message: { ok: false, error: "Too many requests — please try again later." },
}));
```

---

### Error Handling Best Practices

Wrap all CRM calls in try/catch so a failed CRM delivery never breaks the lead form:

```typescript
logLead("contact", lead);

try {
  await sendToHubSpot(lead);
  await notifyMelByEmail(lead);
} catch (err) {
  console.error("[LEAD CRM ERROR]", err);
  // Lead is logged above — Mel can recover from the server logs
  // Do NOT let this error propagate to the client
}

return res.status(200).json({ ok: true, ... });
```

---

### Lead ID Format

| Type | Prefix | Example |
|------|--------|---------|
| Contact form | `c-` | `c-1713980000000` |
| Valuation | `v-` | `v-1713980000001` |
| Chat widget | `ch-` | `ch-1713980000002` |

Lead IDs are `<prefix><Date.now()>`. They are unique per request as long as requests don't arrive in the exact same millisecond (extremely rare). For guaranteed uniqueness in a database context, replace with `crypto.randomUUID()`.

---

*Last updated: March 2026 · melcastanares.techsavvyhawaii.com · Contact: mel@homesweethomehawaii.com*
