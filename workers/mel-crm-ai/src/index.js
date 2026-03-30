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

    return json({ error: "Not found" }, 404);
  },
};
