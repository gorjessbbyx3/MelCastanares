// ═══════════════════════════════════════════════════════════
// Cloudflare Pages Function — POST /api/contact
// Receives contact form submissions, emails Mel via Resend.
//
// Required env var (Cloudflare Pages > Settings > Variables):
//   RESEND_API_KEY  — from resend.com (free tier works fine)
//
// Optional env vars:
//   RESEND_FROM     — e.g. "Website <noreply@yourdomain.com>"
//                     (domain must be verified in Resend dashboard)
//                     Defaults to "onboarding@resend.dev" if not set
//   CONTACT_TO      — Recipient email. Defaults to mel@homesweethomehawaii.com
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

  const { name, email, phone, message, intent, source } = body;
  if (!name || !email) {
    return json({ ok: false, error: "name and email are required" }, 400);
  }

  const leadId = `c-${Date.now()}`;
  const receivedAt = new Date().toISOString();

  // ── Send email notification via Resend ──
  const resendKey = ctx.env?.RESEND_API_KEY;
  const fromEmail = ctx.env?.RESEND_FROM || "Mel's Website <onboarding@resend.dev>";
  const toEmail   = ctx.env?.CONTACT_TO  || "mel@homesweethomehawaii.com";

  if (resendKey) {
    const emailHtml = `
<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e0d8cc;border-radius:8px;background:#fdfaf6">
  <div style="background:#1a2c24;padding:20px 24px;border-radius:6px 6px 0 0;margin:-24px -24px 24px">
    <h2 style="color:#fff;margin:0;font-size:20px">New Contact from Mel's Website</h2>
    <p style="color:#8ab8a0;margin:6px 0 0;font-size:13px">Received ${receivedAt}</p>
  </div>

  <table style="width:100%;border-collapse:collapse;font-size:14px">
    <tr><td style="padding:10px 0;color:#6b5c48;font-weight:600;width:130px">Name</td><td style="padding:10px 0;color:#2c2218">${name}</td></tr>
    <tr style="background:#f5efe7"><td style="padding:10px 8px;color:#6b5c48;font-weight:600">Email</td><td style="padding:10px 8px"><a href="mailto:${email}" style="color:#2a6b4a">${email}</a></td></tr>
    <tr><td style="padding:10px 0;color:#6b5c48;font-weight:600">Phone</td><td style="padding:10px 0;color:#2c2218">${phone || "—"}</td></tr>
    <tr style="background:#f5efe7"><td style="padding:10px 8px;color:#6b5c48;font-weight:600">Intent</td><td style="padding:10px 8px;color:#2c2218">${intent || "General Inquiry"}</td></tr>
    <tr><td style="padding:10px 0;color:#6b5c48;font-weight:600">Source</td><td style="padding:10px 0;color:#2c2218">${source || "website-contact-form"}</td></tr>
    <tr style="background:#f5efe7"><td style="padding:10px 8px;color:#6b5c48;font-weight:600;vertical-align:top">Message</td><td style="padding:10px 8px;color:#2c2218;white-space:pre-wrap">${message || "—"}</td></tr>
  </table>

  <div style="margin-top:24px;display:flex;gap:12px">
    <a href="mailto:${email}?subject=Re: Your inquiry to Mel Castanares" style="display:inline-block;background:#2a6b4a;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px">Reply to ${name.split(" ")[0]}</a>
    ${phone ? `<a href="tel:${phone.replace(/\D/g,"")}" style="display:inline-block;background:#f5efe7;color:#2c2218;padding:10px 20px;border-radius:6px;text-decoration:none;font-weight:600;font-size:13px;border:1px solid #d4c9ba">Call ${name.split(" ")[0]}</a>` : ""}
  </div>

  <p style="margin-top:24px;font-size:11px;color:#9b8670">Lead ID: ${leadId} · melcastanares.techsavvyhawaii.com</p>
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
          subject: `🏡 New Contact: ${name} — ${intent || "General Inquiry"}`,
          html: emailHtml,
        }),
      });
    } catch (err) {
      console.error("[contact] Resend error:", err);
    }
  } else {
    console.log(`[LEAD][contact] ${receivedAt} name=${name} email=${email} phone=${phone} intent=${intent} message=${message}`);
  }

  return json({
    ok: true,
    message: "Thanks! Mel will be in touch within 24 hours.",
    leadId,
  });
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
