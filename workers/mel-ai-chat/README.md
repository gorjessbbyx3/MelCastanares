# Mel AI Chat — Cloudflare Worker

AI-powered real estate assistant for Mel's website.
Uses **Cloudflare Workers AI** with Llama 3.1 8B running on the edge.

## Free Tier
- 10,000 neurons/day (roughly 100-200 chat messages)
- No API keys needed — Workers AI is built into Cloudflare
- Runs globally on Cloudflare's edge network (fast everywhere)

## Deploy

1. Install Wrangler (Cloudflare CLI):
```bash
npm install -g wrangler
```

2. Login to Cloudflare:
```bash
wrangler login
```

3. Deploy:
```bash
cd workers/mel-ai-chat
npm install
wrangler deploy
```

4. Copy the deployed URL (e.g. `https://mel-ai-chat.YOUR-SUBDOMAIN.workers.dev`)

5. Update the frontend — in `artifacts/jane-doe-realty/src/App.tsx`, find:
```js
const CHAT_WORKER_URL = "https://mel-ai-chat.gorjessbbyx3.workers.dev";
```
Replace with your actual worker URL.

## How It Works

- Frontend sends chat messages via POST to the Worker
- Worker prepends a detailed system prompt about Mel, her brokerage,
  O'ahu neighborhoods, Hawaii real estate basics, and conversation guidelines
- Workers AI runs Llama 3.1 8B Instruct and returns the response
- Keeps last 10 messages for context (stays within token limits)
- Graceful error fallback shows Mel's direct contact info

## System Prompt Includes

- Mel's full contact info and brokerage details
- Dream Home Realty Hawaii background
- Neighborhood-by-neighborhood price guides for all of O'ahu
- Hawaii-specific knowledge (leasehold vs fee simple, GET tax, VA loans, etc.)
- Conversation style guidelines (warm, local, concise)
- When to suggest contacting Mel directly

## Customizing

Edit `src/index.js` → `SYSTEM_PROMPT` to update:
- Neighborhood prices as the market changes
- New service areas or specialties
- Seasonal info (open houses, market conditions)
- New listings or featured properties
