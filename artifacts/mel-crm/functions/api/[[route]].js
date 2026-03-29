// Cloudflare Pages Function — CRM API
// Env vars: CRM_PASSWORD (default: mel2024), DB (D1 binding)

function uuid() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function now() { return new Date().toISOString(); }
function today() { return new Date().toISOString().slice(0, 10); }

// ── In-memory fallback (dev / no D1) ─────────────────────────────────
const mem = { sessions: [], leads: [], tasks: [], commissions: [] };

// ── CORS helpers ──────────────────────────────────────────────────────
function cors(headers = {}) {
  return new Headers({ "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization", ...headers });
}
function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: cors({ "Content-Type": "application/json" }) });
}
function err(msg, status = 400) { return json({ error: msg }, status); }

// ── Auth helpers ──────────────────────────────────────────────────────
async function auth(request, env) {
  const hdr = request.headers.get("Authorization") || "";
  const token = hdr.replace("Bearer ", "").trim();
  if (!token) return false;
  if (env.DB) {
    const row = await env.DB.prepare("SELECT id FROM crm_sessions WHERE token=? AND expires_at>?").bind(token, now()).first();
    return !!row;
  }
  return mem.sessions.some(s => s.token === token && s.expires_at > now());
}

// ── Handler ───────────────────────────────────────────────────────────
export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);

  // Find the /api prefix in the pathname
  const pathParts = url.pathname.split("/api/");
  const route = pathParts.length > 1 ? "/" + pathParts[pathParts.length - 1] : url.pathname;

  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });

  // ── Auth: login ─────────────────────────────────────────────────────
  if (route === "/auth/login" && request.method === "POST") {
    const { password } = await request.json().catch(() => ({}));
    const correct = env.CRM_PASSWORD || "mel2024";
    if (password !== correct) return err("Incorrect password", 401);
    const token = uuid() + uuid();
    const expires = new Date(Date.now() + 30 * 86400 * 1000).toISOString();
    if (env.DB) {
      await env.DB.prepare("INSERT INTO crm_sessions (id,token,expires_at) VALUES (?,?,?)").bind(uuid(), token, expires).run();
    } else {
      mem.sessions.push({ token, expires_at: expires });
    }
    return json({ token });
  }

  // ── Auth: verify ────────────────────────────────────────────────────
  if (route === "/auth/verify" && request.method === "GET") {
    const ok = await auth(request, env);
    if (!ok) return err("Unauthorized", 401);
    return json({ ok: true });
  }

  // ── Auth: logout ────────────────────────────────────────────────────
  if (route === "/auth/logout" && request.method === "POST") {
    const hdr = request.headers.get("Authorization") || "";
    const token = hdr.replace("Bearer ", "").trim();
    if (env.DB) await env.DB.prepare("DELETE FROM crm_sessions WHERE token=?").bind(token).run();
    else mem.sessions = mem.sessions.filter(s => s.token !== token);
    return json({ ok: true });
  }

  // ── Require auth for everything else ────────────────────────────────
  if (!(await auth(request, env))) return err("Unauthorized", 401);

  // ── Stats ────────────────────────────────────────────────────────────
  if (route === "/stats" && request.method === "GET") {
    let totalLeads, activeLeads, tasksDueToday, closedComms, totalCommYTD;
    if (env.DB) {
      const yr = new Date().getFullYear() + "-01-01";
      totalLeads = (await env.DB.prepare("SELECT COUNT(*) as n FROM crm_leads").first()).n;
      activeLeads = (await env.DB.prepare("SELECT COUNT(*) as n FROM crm_leads WHERE status NOT IN ('closed','lost')").first()).n;
      tasksDueToday = (await env.DB.prepare("SELECT COUNT(*) as n FROM crm_tasks WHERE due_date=? AND completed=0").bind(today()).first()).n;
      closedComms = (await env.DB.prepare("SELECT COUNT(*) as n FROM crm_commissions WHERE status='closed' AND close_date>=?").bind(yr).first()).n;
      totalCommYTD = (await env.DB.prepare("SELECT COALESCE(SUM(commission_amount),0) as s FROM crm_commissions WHERE status='closed' AND close_date>=?").bind(yr).first()).s;
    } else {
      const yr = new Date().getFullYear() + "-01-01";
      totalLeads = mem.leads.length;
      activeLeads = mem.leads.filter(l => !["closed","lost"].includes(l.status)).length;
      tasksDueToday = mem.tasks.filter(t => !t.completed && t.due_date === today()).length;
      const closedYear = mem.commissions.filter(c => c.status === "closed" && c.close_date >= yr);
      closedComms = closedYear.length;
      totalCommYTD = closedYear.reduce((s, c) => s + (c.commission_amount || 0), 0);
    }
    return json({ totalLeads, activeLeads, tasksDueToday, closedCommissions: closedComms, totalCommissionYTD: totalCommYTD });
  }

  // ── LEADS ────────────────────────────────────────────────────────────
  if (route === "/leads") {
    if (request.method === "GET") {
      if (env.DB) {
        const { results } = await env.DB.prepare("SELECT * FROM crm_leads ORDER BY created_at DESC").all();
        return json(results.map(dbToLead));
      }
      return json([...mem.leads].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(dbToLead));
    }
    if (request.method === "POST") {
      const b = await request.json().catch(() => ({}));
      const r = { id: uuid(), name: b.name || "", email: b.email || "", phone: b.phone || "", intent: b.intent || "buy", status: b.status || "new", source: b.source || "website", price_min: b.priceMin || 0, price_max: b.priceMax || 0, neighborhoods: b.neighborhoods || "", beds_min: b.bedsMin || 0, baths_min: b.bathsMin || 0, pre_approval: b.preApproval || "unknown", pre_approval_amount: b.preApprovalAmount || 0, timeline: b.timeline || "", property_address: b.propertyAddress || "", estimated_value: b.estimatedValue || 0, notes: b.notes || "", next_step: b.nextStep || "", next_step_date: b.nextStepDate || "", created_at: now(), updated_at: now() };
      if (env.DB) await env.DB.prepare("INSERT INTO crm_leads (id,name,email,phone,intent,status,source,price_min,price_max,neighborhoods,beds_min,baths_min,pre_approval,pre_approval_amount,timeline,property_address,estimated_value,notes,next_step,next_step_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(r.id,r.name,r.email,r.phone,r.intent,r.status,r.source,r.price_min,r.price_max,r.neighborhoods,r.beds_min,r.baths_min,r.pre_approval,r.pre_approval_amount,r.timeline,r.property_address,r.estimated_value,r.notes,r.next_step,r.next_step_date,r.created_at,r.updated_at).run();
      else mem.leads.push(r);
      return json(dbToLead(r), 201);
    }
  }

  const leadMatch = route.match(/^\/leads\/([^/]+)$/);
  if (leadMatch) {
    const id = leadMatch[1];
    if (request.method === "PUT") {
      const b = await request.json().catch(() => ({}));
      const upd = { status: b.status, intent: b.intent, name: b.name, email: b.email, phone: b.phone, source: b.source, price_min: b.priceMin, price_max: b.priceMax, neighborhoods: b.neighborhoods, beds_min: b.bedsMin, baths_min: b.bathsMin, pre_approval: b.preApproval, pre_approval_amount: b.preApprovalAmount, timeline: b.timeline, property_address: b.propertyAddress, estimated_value: b.estimatedValue, notes: b.notes, next_step: b.nextStep, next_step_date: b.nextStepDate, updated_at: now() };
      const fields = Object.entries(upd).filter(([,v]) => v !== undefined);
      if (env.DB) { const sql = "UPDATE crm_leads SET " + fields.map(([k]) => `${k}=?`).join(",") + " WHERE id=?"; await env.DB.prepare(sql).bind(...fields.map(([,v]) => v), id).run(); const row = await env.DB.prepare("SELECT * FROM crm_leads WHERE id=?").bind(id).first(); return json(dbToLead(row)); }
      const i = mem.leads.findIndex(l => l.id === id); if (i < 0) return err("Not found", 404); fields.forEach(([k,v]) => { mem.leads[i][k] = v; }); return json(dbToLead(mem.leads[i]));
    }
    if (request.method === "DELETE") {
      if (env.DB) await env.DB.prepare("DELETE FROM crm_leads WHERE id=?").bind(id).run();
      else mem.leads = mem.leads.filter(l => l.id !== id);
      return json({ ok: true });
    }
  }

  // ── TASKS ────────────────────────────────────────────────────────────
  if (route === "/tasks") {
    if (request.method === "GET") {
      if (env.DB) { const { results } = await env.DB.prepare("SELECT * FROM crm_tasks ORDER BY due_date ASC, created_at DESC").all(); return json(results.map(dbToTask)); }
      return json([...mem.tasks].sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "")).map(dbToTask));
    }
    if (request.method === "POST") {
      const b = await request.json().catch(() => ({}));
      const r = { id: uuid(), title: b.title || "", type: b.type || "follow-up", lead_id: b.leadId || "", lead_name: b.leadName || "", due_date: b.dueDate || "", due_time: b.dueTime || "", priority: b.priority || "medium", completed: 0, notes: b.notes || "", created_at: now() };
      if (env.DB) await env.DB.prepare("INSERT INTO crm_tasks (id,title,type,lead_id,lead_name,due_date,due_time,priority,completed,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(r.id,r.title,r.type,r.lead_id,r.lead_name,r.due_date,r.due_time,r.priority,r.completed,r.notes,r.created_at).run();
      else mem.tasks.push(r);
      return json(dbToTask(r), 201);
    }
  }

  const taskMatch = route.match(/^\/tasks\/([^/]+)$/);
  if (taskMatch) {
    const id = taskMatch[1];
    if (request.method === "PUT") {
      const b = await request.json().catch(() => ({}));
      const upd = { title: b.title, type: b.type, lead_id: b.leadId, lead_name: b.leadName, due_date: b.dueDate, due_time: b.dueTime, priority: b.priority, completed: b.completed !== undefined ? (b.completed ? 1 : 0) : undefined, notes: b.notes };
      const fields = Object.entries(upd).filter(([,v]) => v !== undefined);
      if (env.DB) { const sql = "UPDATE crm_tasks SET " + fields.map(([k]) => `${k}=?`).join(",") + " WHERE id=?"; await env.DB.prepare(sql).bind(...fields.map(([,v]) => v), id).run(); const row = await env.DB.prepare("SELECT * FROM crm_tasks WHERE id=?").bind(id).first(); return json(dbToTask(row)); }
      const i = mem.tasks.findIndex(t => t.id === id); if (i < 0) return err("Not found", 404); fields.forEach(([k,v]) => { mem.tasks[i][k] = v; }); return json(dbToTask(mem.tasks[i]));
    }
    if (request.method === "DELETE") {
      if (env.DB) await env.DB.prepare("DELETE FROM crm_tasks WHERE id=?").bind(id).run();
      else mem.tasks = mem.tasks.filter(t => t.id !== id);
      return json({ ok: true });
    }
  }

  // ── COMMISSIONS ───────────────────────────────────────────────────────
  if (route === "/commissions") {
    if (request.method === "GET") {
      if (env.DB) { const { results } = await env.DB.prepare("SELECT * FROM crm_commissions ORDER BY created_at DESC").all(); return json(results.map(dbToComm)); }
      return json([...mem.commissions].sort((a,b) => b.created_at.localeCompare(a.created_at)).map(dbToComm));
    }
    if (request.method === "POST") {
      const b = await request.json().catch(() => ({}));
      const r = { id: uuid(), lead_id: b.leadId || "", client_name: b.clientName || "", property_address: b.propertyAddress || "", sale_price: b.salePrice || 0, commission_rate: b.commissionRate || 3, commission_amount: b.commissionAmount || 0, status: b.status || "pending", close_date: b.closeDate || "", notes: b.notes || "", created_at: now() };
      if (env.DB) await env.DB.prepare("INSERT INTO crm_commissions (id,lead_id,client_name,property_address,sale_price,commission_rate,commission_amount,status,close_date,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(r.id,r.lead_id,r.client_name,r.property_address,r.sale_price,r.commission_rate,r.commission_amount,r.status,r.close_date,r.notes,r.created_at).run();
      else mem.commissions.push(r);
      return json(dbToComm(r), 201);
    }
  }

  const commMatch = route.match(/^\/commissions\/([^/]+)$/);
  if (commMatch) {
    const id = commMatch[1];
    if (request.method === "PUT") {
      const b = await request.json().catch(() => ({}));
      const upd = { lead_id: b.leadId, client_name: b.clientName, property_address: b.propertyAddress, sale_price: b.salePrice, commission_rate: b.commissionRate, commission_amount: b.commissionAmount, status: b.status, close_date: b.closeDate, notes: b.notes };
      const fields = Object.entries(upd).filter(([,v]) => v !== undefined);
      if (env.DB) { const sql = "UPDATE crm_commissions SET " + fields.map(([k]) => `${k}=?`).join(",") + " WHERE id=?"; await env.DB.prepare(sql).bind(...fields.map(([,v]) => v), id).run(); const row = await env.DB.prepare("SELECT * FROM crm_commissions WHERE id=?").bind(id).first(); return json(dbToComm(row)); }
      const i = mem.commissions.findIndex(c => c.id === id); if (i < 0) return err("Not found", 404); fields.forEach(([k,v]) => { mem.commissions[i][k] = v; }); return json(dbToComm(mem.commissions[i]));
    }
    if (request.method === "DELETE") {
      if (env.DB) await env.DB.prepare("DELETE FROM crm_commissions WHERE id=?").bind(id).run();
      else mem.commissions = mem.commissions.filter(c => c.id !== id);
      return json({ ok: true });
    }
  }

  return err("Not found", 404);
}

// ── DB → JS mappers ───────────────────────────────────────────────────
function dbToLead(r) {
  return { id: r.id, name: r.name || "", email: r.email || "", phone: r.phone || "", intent: r.intent || "buy", status: r.status || "new", source: r.source || "website", priceMin: r.price_min || 0, priceMax: r.price_max || 0, neighborhoods: r.neighborhoods || "", bedsMin: r.beds_min || 0, bathsMin: r.baths_min || 0, preApproval: r.pre_approval || "unknown", preApprovalAmount: r.pre_approval_amount || 0, timeline: r.timeline || "", propertyAddress: r.property_address || "", estimatedValue: r.estimated_value || 0, notes: r.notes || "", nextStep: r.next_step || "", nextStepDate: r.next_step_date || "", createdAt: r.created_at || now(), updatedAt: r.updated_at || now() };
}
function dbToTask(r) {
  return { id: r.id, title: r.title || "", type: r.type || "follow-up", leadId: r.lead_id || "", leadName: r.lead_name || "", dueDate: r.due_date || "", dueTime: r.due_time || "", priority: r.priority || "medium", completed: r.completed === 1 || r.completed === true, notes: r.notes || "", createdAt: r.created_at || now() };
}
function dbToComm(r) {
  return { id: r.id, leadId: r.lead_id || "", clientName: r.client_name || "", propertyAddress: r.property_address || "", salePrice: r.sale_price || 0, commissionRate: r.commission_rate || 3, commissionAmount: r.commission_amount || 0, status: r.status || "pending", closeDate: r.close_date || "", notes: r.notes || "", createdAt: r.created_at || now() };
}
