import { Router } from "express";

const router = Router();

function timestamp() {
  return new Date().toISOString();
}

function logLead(type: string, data: Record<string, unknown>) {
  console.log(`[LEAD] [${timestamp()}] type=${type}`, JSON.stringify(data));
}

router.post("/leads/contact", async (req, res) => {
  const { name, email, phone, message, source, intent } = req.body;

  if (!name || !email) {
    return res.status(400).json({ ok: false, error: "name and email are required" });
  }

  const lead = {
    type: "contact",
    receivedAt: timestamp(),
    name,
    email,
    phone: phone || null,
    message: message || null,
    source: source || "website-contact-form",
    intent: intent || null,
  };

  logLead("contact", lead);

  return res.status(200).json({
    ok: true,
    message: "Thanks! Mel will be in touch within 24 hours.",
    leadId: `c-${Date.now()}`,
  });
});

router.post("/leads/valuation", async (req, res) => {
  const { name, email, phone, address, city, propertyType, bedrooms, bathrooms, sqft, notes } = req.body;

  if (!name || !email || !address) {
    return res.status(400).json({ ok: false, error: "name, email, and address are required" });
  }

  const lead = {
    type: "valuation",
    receivedAt: timestamp(),
    name,
    email,
    phone: phone || null,
    address,
    city: city || null,
    propertyType: propertyType || null,
    bedrooms: bedrooms || null,
    bathrooms: bathrooms || null,
    sqft: sqft || null,
    notes: notes || null,
    source: "website-valuation-form",
  };

  logLead("valuation", lead);

  return res.status(200).json({
    ok: true,
    message: "Got it! Mel will send your home valuation report within 24 hours.",
    leadId: `v-${Date.now()}`,
  });
});

router.post("/leads/chat", async (req, res) => {
  const { name, email, phone, question, conversationSummary, source } = req.body;

  if (!email && !phone) {
    return res.status(400).json({ ok: false, error: "at least one of email or phone is required" });
  }

  const lead = {
    type: "chat",
    receivedAt: timestamp(),
    name: name || null,
    email: email || null,
    phone: phone || null,
    question: question || null,
    conversationSummary: conversationSummary || null,
    source: source || "ai-chat-widget",
  };

  logLead("chat", lead);

  return res.status(200).json({
    ok: true,
    message: "Thanks! Mel will follow up with you soon.",
    leadId: `ch-${Date.now()}`,
  });
});

export default router;
