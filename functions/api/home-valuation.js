// ═══════════════════════════════════════════════════════════
// Cloudflare Pages Function — POST /api/home-valuation
// Receives home valuation requests, emails Mel via Resend.
//
// Same env vars as /api/contact:
//   RESEND_API_KEY, RESEND_FROM, CONTACT_TO
// ═══════════════════════════════════════════════════════════

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });

export async function onRequestPost(ctx) {
  let body;
  try { body = await ctx.request.json(); }
  catch { return json({ ok: false, error: "Invalid JSON" }, 400); }

  const {
    name, email, phone, address, neighborhood, propType,
    beds, baths, sqft, yearBuilt, condition, features,
    timeline, estimateLow, estimateHigh, estimateMedian,
  } = body;

  if (!name || !email) {
    return json({ ok: false, error: "name and email are required" }, 400);
  }

  const leadId = `v-${Date.now()}`;
  const receivedAt = new Date().toISOString();

  const featureList = Array.isArray(features) ? features.join(", ") : (features || "—");
  const estimateStr = estimateMedian
    ? `$${Number(estimateLow).toLocaleString()} – $${Number(estimateHigh).toLocaleString()} (median $${Number(estimateMedian).toLocaleString()})`
    : "Not calculated";

  const resendKey = ctx.env?.RESEND_API_KEY;
  const fromEmail = ctx.env?.RESEND_FROM || "Mel's Website <onboarding@resend.dev>";
  const toEmail   = ctx.env?.CONTACT_TO  || "mel@homesweethomehawaii.com";

  if (resendKey) {
    const emailHtml = `
<div style="font-family:Arial,sans-serif;max-width:620px;margin:0 auto;padding:24px;border:1px solid #e0d8cc;border-radius:8px;background:#fdfaf6">
  <div style="background:#1a2c24;padding:20px 24px;border-radius:6px 6px 0 0;margin:-24px -24px 24px">
    <h2 style="color:#fff;margin:0;font-size:20px">New Home Valuation Request</h2>
    <p style="color:#8ab8a0;margin:6px 0 0;font-size:13px">Received ${receivedAt}</p>
  </div>

  <h3 style="color:#6b5c48;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 12px">Contact Info</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
    <tr><td style="padding:8px 0;color:#6b5c48;font-weight:600;width:140px">Name</td><td style="color:#2c2218">${name}</td></tr>
    <tr style="background:#f5efe7"><td style="padding:8px 8px;color:#6b5c48;font-weight:600">Email</td><td style="padding:8px 8px"><a href="mailto:${email}" style="color:#2a6b4a">${email}</a></td></tr>
    <tr><td style="padding:8px 0;color:#6b5c48;font-weight:600">Phone</td><td style="color:#2c2218">${phone || "—"}</td></tr>
    <tr style="background:#f5efe7"><td style="padding:8px 8px;color:#6b5c48;font-weight:600">Timeline</td><td style="padding:8px 8px;color:#2c2218">${timeline || "—"}</td></tr>
  </table>

  <h3 style="color:#6b5c48;font-size:13px;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 12px">Property Details</h3>
  <table style="width:100%;border-collapse:collapse;font-size:14px;margin-bottom:24px">
    <tr><td style="padding:8px 0;color:#6b5c48;font-weight:600;width:140px">Address</td><td style="color:#2c2218">${address || "—"}</td></tr>
    <tr style="background:#f5efe7"><td style="padding:8px 8px;color:#6b5c48;font-weight:600">Neighborhood</td><td style="padding:8px 8px;color:#2c2218">${neighborhood || "—"}</td></tr>
    <tr><td style="padding:8px 0;color:#6b5c48;font-weight:600">Type</td><td style="color:#2c2218">${propType || "—"}</td></tr>
    <tr style="background:#f5efe7"><td style="padding:8px 8px;color:#6b5c48;font-weight:600">Beds / Baths</td><td style="padding:8px 8px;color:#2c2218">${beds || "—"} bd / ${baths || "—"} ba</td></tr>
    <tr><td style="padding:8px 0;color:#6b5c48;font-weight:600">Sq Ft</td><td style="color:#2c2218">${sqft || "—"}</td></tr>
    <tr style="background:#f5efe7"><td style="padding:8px 8px;color:#6b5c48;font-weight:600">Year Built</td><td style="padding:8px 8px;color:#2c2218">${yearBuilt || "—"}</td></tr>
    <tr><td style="padding:8px 0;color:#6b5c48;font-weight:600">Condition</td><td style="color:#2c2218">${condition || "—"}</td></tr>
    <tr style="background:#f5efe7"><td style="padding:8px 8px;color:#6b5c48;font-weight:600">Features</td><td style="padding:8px 8px;color:#2c2218">${featureList}</td></tr>
  </table>

  <div style="background:#f0f9f4;border:1px solid #b2dac7;border-radius:6px;padding:16px 20px;margin-bottom:24px">
    <div style="font-size:12px;color:#2a6b4a;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px">AI Estimate from Website</div>
    <div style="font-size:18px;font-weight:700;color:#1a2c24">${estimateStr}</div>
  </div>

  <a href="mailto:${email}?subject=Your O'ahu Home Valuation — Mel Castanares&body=Hi ${name.split(" ")[0]},%0D%0A%0D%0AThanks for requesting a home valuation for ${address || "your property"}! I'd love to prepare a full CMA for you.%0D%0A%0D%0ACan we schedule a quick call to go over the details?%0D%0A%0D%0A— Mel Castanares%0D%0AREALTOR® RS-84753 · Dream Home Realty Hawai'i%0D%0A(808) 285-8774" style="display:inline-block;background:#2a6b4a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px">Reply to ${name.split(" ")[0]}</a>

  <p style="margin-top:20px;font-size:11px;color:#9b8670">Lead ID: ${leadId} · melcastanares.techsavvyhawaii.com</p>
</div>`;

    try {
      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [toEmail],
          reply_to: email,
          subject: `🏡 Valuation Request: ${name} — ${address || neighborhood || "O'ahu property"}`,
          html: emailHtml,
        }),
      });
    } catch (err) {
      console.error("[valuation] Resend error:", err);
    }
  } else {
    console.log(`[LEAD][valuation] ${receivedAt} name=${name} email=${email} address=${address}`);
  }

  return json({
    ok: true,
    message: "Got it! Mel will send your full CMA within 24 hours.",
    leadId,
  });
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
