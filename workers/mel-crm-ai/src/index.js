// ═══════════════════════════════════════════════════════════════════════
// MEL CRM AI WORKER — Cloudflare Worker with Workers AI
// Handles: /ai/chat (CRM assistant) + /ai/content (Instagram generator)
// Model: @cf/meta/llama-3.1-8b-instruct (free tier: ~10K neurons/day)
// ═══════════════════════════════════════════════════════════════════════

const MODEL = "@cf/meta/llama-3.1-8b-instruct";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Authorization",
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

async function runAI(env, messages, maxTokens = 800) {
  const res = await env.AI.run(MODEL, { messages, max_tokens: maxTokens });
  return res.response || "";
}

// ── /ai/chat ─────────────────────────────────────────────────────────────
async function handleChat(request, env) {
  const { message, context = {} } = await request.json().catch(() => ({}));
  if (!message) return json({ error: "message required" }, 400);

  const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

  const systemPrompt = `You are Mel's private CRM AI assistant. Today is ${today}.

MEL CASTANARES — REALTOR® RS-84753
Brokerage: Dream Home Realty Hawai'i
Phone: (808) 285-8774 | Email: mel@homesweethomehawaii.com
Instagram: @mel.castanares | Service area: All of O'ahu

CURRENT DASHBOARD DATA:
- Total leads: ${context.totalLeads ?? 0}
- Active leads (${context.activeLeadCount ?? 0}): ${context.activeLeads || "none yet"}
- Overdue tasks: ${context.overdueTasks || "none"}
- Today's tasks: ${context.todayTasks || "none"}
- Upcoming calendar events: ${context.events || "nothing scheduled"}

YOUR CAPABILITIES:
1. Answer questions about Mel's leads, tasks, commissions, and calendar
2. Suggest follow-up strategies and scripts for specific clients
3. Help draft emails or text messages to clients
4. Generate Instagram captions and content ideas
5. Provide Oahu market insights and pricing guidance
6. Schedule calendar events — when Mel asks to schedule something, end your reply with ONLY this JSON on the last line:
   {"action":"create_event","title":"...","type":"appointment","date":"YYYY-MM-DD","time":"HH:MM","location":"..."}

TONE: Professional but warm. Use Mel's voice — local Hawaii flair, genuine care for clients. Be concise and actionable. Use "Mahalo" where natural but don't overdo it.`;

  try {
    const aiResponse = await runAI(env, [
      { role: "system", content: systemPrompt },
      { role: "user", content: message },
    ], 700);

    // Parse optional event creation action from last line
    let action, event, cleanMessage = aiResponse.trim();
    const lines = cleanMessage.split("\n");
    const lastLine = lines[lines.length - 1].trim();
    if (lastLine.startsWith("{") && lastLine.includes("create_event")) {
      try {
        const parsed = JSON.parse(lastLine);
        action = parsed.action;
        event = { title: parsed.title, type: parsed.type, date: parsed.date, time: parsed.time, location: parsed.location };
        cleanMessage = lines.slice(0, -1).join("\n").trim();
      } catch {}
    }

    return json({ message: cleanMessage, action, event });
  } catch (e) {
    console.error("Chat AI error:", e);
    return json({ message: "Mahalo for your patience — I hit a small snag. Try again in a moment, or check your tasks and leads directly in the CRM! 🌺" });
  }
}

// ── /ai/content ───────────────────────────────────────────────────────────
async function handleContent(request, env) {
  const { topic } = await request.json().catch(() => ({}));
  const prompt = topic?.trim() || "Oahu real estate tips for buyers and sellers";

  const systemPrompt = `You are a social media expert creating Instagram content for Mel Castanares, a REALTOR® in Honolulu, Oahu, Hawai'i (RS-84753, Dream Home Realty Hawai'i). Her handle is @mel.castanares.

Generate exactly 4 Instagram post captions on this topic: "${prompt}"

Each caption must:
- Be 2-4 sentences — punchy and conversational
- Include 1-2 relevant emojis (not excessive)
- End with a clear call to action (DM, comment, or "link in bio")
- Include 4-6 hashtags at the end: always include #hawaiirealestate and #oahurealtor plus 2-4 topic-specific ones
- Sound like Mel — warm, local, knowledgeable, not salesy

Format: Return ONLY the 4 captions separated by the exact string "|||" with no extra text, numbering, or labels.`;

  try {
    const aiResponse = await runAI(env, [{ role: "user", content: systemPrompt }], 1200);
    const ideas = aiResponse
      .split("|||")
      .map(s => s.trim())
      .filter(Boolean)
      .slice(0, 4);

    if (ideas.length === 0) throw new Error("no ideas parsed");
    return json({ ideas });
  } catch (e) {
    console.error("Content AI error:", e);
    // Fallback captions if AI fails
    return json({
      ideas: [
        `🏡 Thinking about buying in Oahu? The market moves fast — and having a local REALTOR® in your corner makes all the difference. DM me "HOME" and let's find your perfect fit! #hawaiirealestate #oahurealtor #firsttimebuyer`,
        `🌺 Whether you're buying, selling, or just curious about what your home is worth — I'm here for the real conversations. No pressure, just honest local expertise. Comment "VALUE" for a free home estimate! #oahuhomes #honolulurealestate #dreamhomehawaii`,
        `💡 Hawaii real estate tip: Understanding fee simple vs. leasehold before you make an offer could save you thousands. Ask me anything! DM me or hit the link in bio 📲 #hawaiirealestate #realestatetips #oahulife #melcastanares`,
        `📊 Oahu market update: Inventory is tight and homes are moving. If you've been on the fence about ${prompt.toLowerCase()}, NOW is the time to have a strategy conversation. DM me today! 🤙 #oahurealtor #hawaiirealestate #listingagent`,
      ],
    });
  }
}

// ── /ai/lead-dna ─────────────────────────────────────────────────────────
async function handleLeadDna(request, env) {
  const { lead } = await request.json().catch(() => ({}));
  if (!lead) return json({ error: "lead required" }, 400);

  const systemPrompt = `You are a real estate sales coach analyzing a lead profile for Mel Castanares, REALTOR® in Honolulu, Hawaii.

Analyze this lead and produce a concise "Lead DNA" profile. Return ONLY valid JSON — no extra text.

Lead data:
- Name: ${lead.name}
- Intent: ${lead.intent} (buy/sell/lease)
- Status: ${lead.status}
- Price range: $${(lead.priceMin||0).toLocaleString()} – $${(lead.priceMax||0).toLocaleString()}
- Neighborhoods: ${lead.neighborhoods || "not specified"}
- Beds/Baths: ${lead.bedsMin || "?"}bd / ${lead.bathsMin || "?"}ba
- Pre-approval: ${lead.preApproval} ${lead.preApprovalAmount > 0 ? "($" + lead.preApprovalAmount.toLocaleString() + ")" : ""}
- Timeline: ${lead.timeline || "not specified"}
- Notes: ${lead.notes || "none"}
- Next step: ${lead.nextStep || "none"}

Return JSON with exactly these fields:
{
  "communicationStyle": "one of: Direct, Analytical, Relational, Expressive",
  "motivationLevel": "one of: Hot 🔥, Warm ☀️, Cool 🌊, Cold ❄️",
  "primaryMotivation": "1 sentence on what is driving this person",
  "keyRisks": "1 sentence on their likely hesitations or objections",
  "recommendedApproach": "2-3 specific actionable tactics for Mel to use with this person",
  "bestContactMethod": "one of: Call, Text, Email, Video Tour",
  "coachingTip": "1 sharp coaching tip for Mel on how to move this deal forward"
}`;

  try {
    const raw = await runAI(env, [{ role: "user", content: systemPrompt }], 600);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no JSON");
    const profile = JSON.parse(jsonMatch[0]);
    return json({ profile });
  } catch (e) {
    console.error("Lead DNA error:", e);
    return json({ error: "Could not generate DNA profile" }, 500);
  }
}

// ── /ai/offer-strategy ───────────────────────────────────────────────────
async function handleOfferStrategy(request, env) {
  const { property } = await request.json().catch(() => ({}));
  if (!property) return json({ error: "property required" }, 400);

  const systemPrompt = `You are a Hawaii real estate transaction expert helping Mel Castanares (REALTOR® RS-84753, Dream Home Realty Hawai'i) advise a buyer on offer strategy.

Property details:
- Address: ${property.address || "Oahu, HI"}
- List price: $${(property.listPrice||0).toLocaleString()}
- Beds/Baths: ${property.beds || "?"}bd / ${property.baths || "?"}ba
- Sqft: ${property.sqft || "unknown"}
- Days on market: ${property.daysOnMarket || "unknown"}
- HOA fees: ${property.hoaFees ? "$" + property.hoaFees + "/mo" : "unknown"}
- Fee simple or leasehold: ${property.ownership || "unknown"}
- Additional context: ${property.notes || "none"}

Hawaii-specific factors to weigh: fee simple vs leasehold, condo reserve funds, flood zones, lava zones, termite/pest history, ohana unit potential.

Return ONLY valid JSON:
{
  "suggestedOfferRange": { "low": number, "mid": number, "high": number },
  "offerStrategyNote": "2-3 sentence rationale for the suggested range",
  "contingenciesRecommended": ["list", "of", "contingencies"],
  "contingenciesToConsiderWaiving": ["list", "if", "market", "is", "competitive"],
  "negotiationTips": ["2-3", "specific", "negotiation", "tips"],
  "hawaiiSpecificWarnings": ["any", "hawaii-specific", "flags", "or", "empty", "array"],
  "confidenceLevel": "one of: Strong, Moderate, Limited — based on available info"
}`;

  try {
    const raw = await runAI(env, [{ role: "user", content: systemPrompt }], 800);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no JSON");
    const strategy = JSON.parse(jsonMatch[0]);
    return json({ strategy });
  } catch (e) {
    console.error("Offer strategy error:", e);
    return json({ error: "Could not generate offer strategy" }, 500);
  }
}

// ── /ai/nurture-draft ─────────────────────────────────────────────────────
async function handleNurtureDraft(request, env) {
  const { client } = await request.json().catch(() => ({}));
  if (!client) return json({ error: "client required" }, 400);

  const systemPrompt = `You are writing a personal check-in email from Mel Castanares (REALTOR® RS-84753, Dream Home Realty Hawai'i, mel@homesweethomehawaii.com, (808) 285-8774) to a past client.

Client: ${client.name}
Property they closed on: ${client.address}
Close date: ${client.closeDate}
Anniversary: ${client.anniversary} (${client.daysUntil} days from now)
Sale price: ${client.salePrice ? "$" + client.salePrice.toLocaleString() : "not specified"}
Notes: ${client.notes || "none"}

Write a warm, personal email (NOT templated-sounding) that:
1. References their specific home and neighborhood
2. Shares a brief genuine market update for their area
3. Mentions that their home has likely appreciated (if anniversary is 1+ yr)
4. Offers a free current market valuation
5. Includes a soft ask for referrals — not pushy
6. Signs off with Mel's contact info

Return ONLY valid JSON:
{
  "subject": "email subject line",
  "body": "full email body with \\n for line breaks"
}`;

  try {
    const raw = await runAI(env, [{ role: "user", content: systemPrompt }], 900);
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("no JSON");
    const email = JSON.parse(jsonMatch[0]);
    return json({ email });
  } catch (e) {
    console.error("Nurture draft error:", e);
    return json({ error: "Could not generate email draft" }, 500);
  }
}

// ── Router ────────────────────────────────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method.toUpperCase();

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS });
    }

    // Health check
    if (url.pathname === "/health" && method === "GET") {
      return json({ ok: true, model: MODEL, hasAI: !!env.AI });
    }

    if (url.pathname === "/ai/chat" && method === "POST") {
      return handleChat(request, env);
    }

    if (url.pathname === "/ai/content" && method === "POST") {
      return handleContent(request, env);
    }

    if (url.pathname === "/ai/lead-dna" && method === "POST") {
      return handleLeadDna(request, env);
    }

    if (url.pathname === "/ai/offer-strategy" && method === "POST") {
      return handleOfferStrategy(request, env);
    }

    if (url.pathname === "/ai/nurture-draft" && method === "POST") {
      return handleNurtureDraft(request, env);
    }

    return json({ error: "Not found" }, 404);
  },
};
