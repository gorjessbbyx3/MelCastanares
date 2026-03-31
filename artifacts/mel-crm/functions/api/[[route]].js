// Cloudflare Pages Function — Mel's CRM API
// Env vars: CRM_PASSWORD, DB (D1), AI (Workers AI), FILES_BUCKET (R2)

function uuid() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36); }
function now() { return new Date().toISOString(); }
function today() { return new Date().toISOString().slice(0, 10); }

const mem = { sessions: [], leads: [], tasks: [], commissions: [], events: [], todos: [], files: [], contentIdeas: [], expenses: [], settings: {}, igCache: null };

function cors(h = {}) { return new Headers({ "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization", ...h }); }
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: cors({ "Content-Type": "application/json" }) }); }
function err(msg, status = 400) { return json({ error: msg }, status); }

async function auth(request, env) {
  const token = (request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
  if (!token) return false;
  if (env.DB) { const r = await env.DB.prepare("SELECT id FROM crm_sessions WHERE token=? AND expires_at>?").bind(token, now()).first(); return !!r; }
  return mem.sessions.some(s => s.token === token && s.expires_at > now());
}

// Returns the configured password, or null if none has ever been set (first-run mode)
async function getPassword(env) {
  if (env.DB) {
    const r = await env.DB.prepare("SELECT value FROM crm_settings WHERE key='password'").first().catch(() => null);
    if (r?.value) return r.value;
  } else if (mem.settings.password) {
    return mem.settings.password;
  }
  return env.CRM_PASSWORD || null;
}

// ── Mappers ──────────────────────────────────────────────────────────
const dbToLead = r => ({ id:r.id, name:r.name||"", email:r.email||"", phone:r.phone||"", intent:r.intent||"buy", status:r.status||"new", source:r.source||"website", priceMin:r.price_min||0, priceMax:r.price_max||0, neighborhoods:r.neighborhoods||"", bedsMin:r.beds_min||0, bathsMin:r.baths_min||0, preApproval:r.pre_approval||"unknown", preApprovalAmount:r.pre_approval_amount||0, timeline:r.timeline||"", propertyAddress:r.property_address||"", estimatedValue:r.estimated_value||0, notes:r.notes||"", nextStep:r.next_step||"", nextStepDate:r.next_step_date||"", createdAt:r.created_at||now(), updatedAt:r.updated_at||now() });
const dbToTask = r => ({ id:r.id, title:r.title||"", type:r.type||"follow-up", leadId:r.lead_id||"", leadName:r.lead_name||"", dueDate:r.due_date||"", dueTime:r.due_time||"", priority:r.priority||"medium", completed:r.completed===1||r.completed===true, notes:r.notes||"", createdAt:r.created_at||now() });
const dbToComm = r => ({ id:r.id, leadId:r.lead_id||"", clientName:r.client_name||"", propertyAddress:r.property_address||"", salePrice:r.sale_price||0, commissionRate:r.commission_rate||3, commissionAmount:r.commission_amount||0, status:r.status||"pending", closeDate:r.close_date||"", notes:r.notes||"", createdAt:r.created_at||now() });
const dbToEvent = r => ({ id:r.id, title:r.title||"", type:r.type||"appointment", date:r.date||"", time:r.time||"", endTime:r.end_time||"", leadId:r.lead_id||"", leadName:r.lead_name||"", location:r.location||"", notes:r.notes||"", createdAt:r.created_at||now() });
const dbToTodo = r => ({ id:r.id, title:r.title||"", category:r.category||"general", completed:r.completed===1||r.completed===true, dueDate:r.due_date||"", createdAt:r.created_at||now() });
const dbToFile = r => ({ id:r.id, name:r.name||"", category:r.category||"other", url:r.url||"", notes:r.notes||"", size:r.size||"", createdAt:r.created_at||now() });
const dbToIdea = r => ({ id:r.id, text:r.text||"", topic:r.topic||"", pinned:r.pinned===1||r.pinned===true, createdAt:r.created_at||now() });
const dbToExpense = r => ({ id:r.id, date:r.date||"", category:r.category||"Other", vendor:r.vendor||"", description:r.description||"", amount:r.amount||0, receiptUrl:r.receipt_url||"", taxDeductible:r.tax_deductible===1||r.tax_deductible===true, notes:r.notes||"", createdAt:r.created_at||now() });
const dbToTx = r => ({ id:r.id, leadId:r.lead_id||"", clientName:r.client_name||"", propertyAddress:r.property_address||"", transactionType:r.transaction_type||"buy", status:r.status||"active", listPrice:r.list_price||0, salePrice:r.sale_price||0, commissionRate:r.commission_rate||3, commissionAmount:r.commission_amount||0, contractDate:r.contract_date||"", escrowOpenDate:r.escrow_open_date||"", inspectionDeadline:r.inspection_deadline||"", disclosureDeadline:r.disclosure_deadline||"", loanContingencyDate:r.loan_contingency_date||"", titleClearDate:r.title_clear_date||"", hoaDocsDate:r.hoa_docs_date||"", closingDate:r.closing_date||"", milestones:typeof r.milestones==="string" ? JSON.parse(r.milestones||"[]") : (r.milestones||[]), notes:r.notes||"", createdAt:r.created_at||now() });
const dbToLeadWithDna = r => ({ ...dbToLead(r), leadDna:r.lead_dna||"", leadDnaUpdated:r.lead_dna_updated||"" });

// ── AI helpers ────────────────────────────────────────────────────────
const AI_MODEL = "@cf/meta/llama-3.1-8b-instruct";
async function runAI(env, messages, maxTokens = 1024) {
  if (!env.AI) return null;
  try {
    const res = await env.AI.run(AI_MODEL, { messages, max_tokens: maxTokens });
    return res.response || res.result?.response || "";
  } catch (e) { console.error("AI error:", e); return null; }
}

// ── R2 helpers ────────────────────────────────────────────────────────
function r2KeyToItem(obj, folder) {
  const key = obj.key;
  const relativePath = folder ? key.slice(folder.length) : key;
  const parts = relativePath.split("/").filter(Boolean);
  const isFolder = key.endsWith("/") || (obj.size === 0 && key.endsWith("/.keep"));
  return {
    key,
    name: parts[parts.length - 1] || key,
    size: obj.size || 0,
    uploaded: obj.uploaded ? obj.uploaded.toISOString() : now(),
    isFolder,
    contentType: obj.httpMetadata?.contentType || "application/octet-stream",
  };
}

// ── Main handler ──────────────────────────────────────────────────────
export async function onRequest(ctx) {
  const { request, env } = ctx;
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/api/");
  const route = pathParts.length > 1 ? "/" + pathParts[pathParts.length - 1] : url.pathname;
  const method = request.method.toUpperCase();

  if (method === "OPTIONS") return new Response(null, { status: 204, headers: cors() });

  // ── Auth ─────────────────────────────────────────────────────────────
  if (route === "/auth/login" && method === "POST") {
    const { password } = await request.json().catch(() => ({}));
    const correctPw = await getPassword(env);
    if (correctPw !== null && password !== correctPw) return err("Incorrect password", 401);
    const token = uuid() + uuid();
    const expires = new Date(Date.now() + 30 * 86400000).toISOString();
    if (env.DB) await env.DB.prepare("INSERT INTO crm_sessions (id,token,expires_at) VALUES (?,?,?)").bind(uuid(), token, expires).run();
    else mem.sessions.push({ token, expires_at: expires });
    return json({ token, requiresPasswordSetup: correctPw === null });
  }
  if (route === "/auth/verify" && method === "GET") { return (await auth(request, env)) ? json({ ok: true }) : err("Unauthorized", 401); }
  if (route === "/auth/logout" && method === "POST") {
    const token = (request.headers.get("Authorization") || "").replace("Bearer ", "").trim();
    if (env.DB) await env.DB.prepare("DELETE FROM crm_sessions WHERE token=?").bind(token).run();
    else mem.sessions = mem.sessions.filter(s => s.token !== token);
    return json({ ok: true });
  }
  if (!(await auth(request, env))) return err("Unauthorized", 401);

  // ── Password change ───────────────────────────────────────────────────
  if (route === "/auth/password" && method === "POST") {
    const { currentPassword, newPassword } = await request.json().catch(() => ({}));
    if (!newPassword || newPassword.length < 4) return err("New password must be at least 4 characters");
    const correctPw = await getPassword(env);
    if (correctPw !== null && currentPassword !== correctPw) return err("Current password is incorrect", 401);
    if (env.DB) {
      await env.DB.prepare("CREATE TABLE IF NOT EXISTS crm_settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)").run().catch(() => {});
      await env.DB.prepare("INSERT OR REPLACE INTO crm_settings (key, value) VALUES ('password', ?)").bind(newPassword).run();
    } else {
      mem.settings.password = newPassword;
    }
    return json({ ok: true });
  }

  // ── Stats ─────────────────────────────────────────────────────────────
  if (route === "/stats" && method === "GET") {
    const yr = new Date().getFullYear() + "-01-01";
    if (env.DB) {
      const [tl, al, td, closedR, ytdR] = await Promise.all([
        env.DB.prepare("SELECT COUNT(*) as n FROM crm_leads").first(),
        env.DB.prepare("SELECT COUNT(*) as n FROM crm_leads WHERE status NOT IN ('closed','lost')").first(),
        env.DB.prepare("SELECT COUNT(*) as n FROM crm_tasks WHERE due_date=? AND completed=0").bind(today()).first(),
        env.DB.prepare("SELECT COUNT(*) as n FROM crm_commissions WHERE status='closed' AND close_date>=?").bind(yr).first(),
        env.DB.prepare("SELECT COALESCE(SUM(commission_amount),0) as s FROM crm_commissions WHERE status='closed' AND close_date>=?").bind(yr).first(),
      ]);
      return json({ totalLeads: tl.n, activeLeads: al.n, tasksDueToday: td.n, closedCommissions: closedR.n, totalCommissionYTD: ytdR.s });
    }
    const closed = mem.commissions.filter(c => c.status === "closed" && c.close_date >= yr);
    return json({ totalLeads: mem.leads.length, activeLeads: mem.leads.filter(l => !["closed","lost"].includes(l.status)).length, tasksDueToday: mem.tasks.filter(t => !t.completed && t.due_date === today()).length, closedCommissions: closed.length, totalCommissionYTD: closed.reduce((s, c) => s + (c.commission_amount || 0), 0) });
  }

  // ── LEADS ─────────────────────────────────────────────────────────────
  if (route === "/leads" && method === "GET") {
    if (env.DB) { const { results } = await env.DB.prepare("SELECT * FROM crm_leads ORDER BY created_at DESC").all(); return json(results.map(dbToLead)); }
    return json([...mem.leads].sort((a, b) => b.created_at.localeCompare(a.created_at)).map(dbToLead));
  }
  if (route === "/leads" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const r = { id: uuid(), name: b.name||"", email: b.email||"", phone: b.phone||"", intent: b.intent||"buy", status: b.status||"new", source: b.source||"website", price_min: b.priceMin||0, price_max: b.priceMax||0, neighborhoods: b.neighborhoods||"", beds_min: b.bedsMin||0, baths_min: b.bathsMin||0, pre_approval: b.preApproval||"unknown", pre_approval_amount: b.preApprovalAmount||0, timeline: b.timeline||"", property_address: b.propertyAddress||"", estimated_value: b.estimatedValue||0, notes: b.notes||"", next_step: b.nextStep||"", next_step_date: b.nextStepDate||"", created_at: now(), updated_at: now() };
    if (env.DB) await env.DB.prepare("INSERT INTO crm_leads (id,name,email,phone,intent,status,source,price_min,price_max,neighborhoods,beds_min,baths_min,pre_approval,pre_approval_amount,timeline,property_address,estimated_value,notes,next_step,next_step_date,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(r.id,r.name,r.email,r.phone,r.intent,r.status,r.source,r.price_min,r.price_max,r.neighborhoods,r.beds_min,r.baths_min,r.pre_approval,r.pre_approval_amount,r.timeline,r.property_address,r.estimated_value,r.notes,r.next_step,r.next_step_date,r.created_at,r.updated_at).run();
    else mem.leads.push(r);
    return json(dbToLead(r), 201);
  }
  const lm = route.match(/^\/leads\/([^/]+)$/);
  if (lm) {
    const id = lm[1];
    if (method === "PUT") {
      const b = await request.json().catch(() => ({}));
      const upd = { name:b.name, email:b.email, phone:b.phone, intent:b.intent, status:b.status, source:b.source, price_min:b.priceMin, price_max:b.priceMax, neighborhoods:b.neighborhoods, beds_min:b.bedsMin, baths_min:b.bathsMin, pre_approval:b.preApproval, pre_approval_amount:b.preApprovalAmount, timeline:b.timeline, property_address:b.propertyAddress, estimated_value:b.estimatedValue, notes:b.notes, next_step:b.nextStep, next_step_date:b.nextStepDate, updated_at:now() };
      const fields = Object.entries(upd).filter(([,v]) => v !== undefined);
      if (env.DB) { await env.DB.prepare("UPDATE crm_leads SET " + fields.map(([k]) => `${k}=?`).join(",") + " WHERE id=?").bind(...fields.map(([,v]) => v), id).run(); return json(dbToLead(await env.DB.prepare("SELECT * FROM crm_leads WHERE id=?").bind(id).first())); }
      const i = mem.leads.findIndex(l => l.id === id); if (i < 0) return err("Not found", 404); fields.forEach(([k,v]) => { mem.leads[i][k] = v; }); return json(dbToLead(mem.leads[i]));
    }
    if (method === "DELETE") { if (env.DB) await env.DB.prepare("DELETE FROM crm_leads WHERE id=?").bind(id).run(); else mem.leads = mem.leads.filter(l => l.id !== id); return json({ ok: true }); }
  }

  // ── TASKS ─────────────────────────────────────────────────────────────
  if (route === "/tasks" && method === "GET") {
    if (env.DB) { const { results } = await env.DB.prepare("SELECT * FROM crm_tasks ORDER BY due_date ASC, created_at DESC").all(); return json(results.map(dbToTask)); }
    return json([...mem.tasks].sort((a,b)=>(a.due_date||"").localeCompare(b.due_date||"")).map(dbToTask));
  }
  if (route === "/tasks" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const r = { id:uuid(), title:b.title||"", type:b.type||"follow-up", lead_id:b.leadId||"", lead_name:b.leadName||"", due_date:b.dueDate||"", due_time:b.dueTime||"", priority:b.priority||"medium", completed:0, notes:b.notes||"", created_at:now() };
    if (env.DB) await env.DB.prepare("INSERT INTO crm_tasks (id,title,type,lead_id,lead_name,due_date,due_time,priority,completed,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(r.id,r.title,r.type,r.lead_id,r.lead_name,r.due_date,r.due_time,r.priority,r.completed,r.notes,r.created_at).run();
    else mem.tasks.push(r);
    return json(dbToTask(r), 201);
  }
  const tm = route.match(/^\/tasks\/([^/]+)$/);
  if (tm) {
    const id = tm[1];
    if (method === "PUT") {
      const b = await request.json().catch(() => ({}));
      const upd = { title:b.title, type:b.type, lead_id:b.leadId, lead_name:b.leadName, due_date:b.dueDate, due_time:b.dueTime, priority:b.priority, completed:b.completed!==undefined?(b.completed?1:0):undefined, notes:b.notes };
      const fields = Object.entries(upd).filter(([,v]) => v !== undefined);
      if (env.DB) { await env.DB.prepare("UPDATE crm_tasks SET " + fields.map(([k]) => `${k}=?`).join(",") + " WHERE id=?").bind(...fields.map(([,v]) => v), id).run(); return json(dbToTask(await env.DB.prepare("SELECT * FROM crm_tasks WHERE id=?").bind(id).first())); }
      const i = mem.tasks.findIndex(t => t.id === id); if (i < 0) return err("Not found", 404); fields.forEach(([k,v]) => { mem.tasks[i][k] = v; }); return json(dbToTask(mem.tasks[i]));
    }
    if (method === "DELETE") { if (env.DB) await env.DB.prepare("DELETE FROM crm_tasks WHERE id=?").bind(id).run(); else mem.tasks = mem.tasks.filter(t => t.id !== id); return json({ ok: true }); }
  }

  // ── COMMISSIONS ───────────────────────────────────────────────────────
  if (route === "/commissions" && method === "GET") {
    if (env.DB) { const { results } = await env.DB.prepare("SELECT * FROM crm_commissions ORDER BY created_at DESC").all(); return json(results.map(dbToComm)); }
    return json([...mem.commissions].sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(dbToComm));
  }
  if (route === "/commissions" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const r = { id:uuid(), lead_id:b.leadId||"", client_name:b.clientName||"", property_address:b.propertyAddress||"", sale_price:b.salePrice||0, commission_rate:b.commissionRate||3, commission_amount:b.commissionAmount||0, status:b.status||"pending", close_date:b.closeDate||"", notes:b.notes||"", created_at:now() };
    if (env.DB) await env.DB.prepare("INSERT INTO crm_commissions (id,lead_id,client_name,property_address,sale_price,commission_rate,commission_amount,status,close_date,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(r.id,r.lead_id,r.client_name,r.property_address,r.sale_price,r.commission_rate,r.commission_amount,r.status,r.close_date,r.notes,r.created_at).run();
    else mem.commissions.push(r);
    return json(dbToComm(r), 201);
  }
  const cm = route.match(/^\/commissions\/([^/]+)$/);
  if (cm) {
    const id = cm[1];
    if (method === "PUT") {
      const b = await request.json().catch(() => ({}));
      const upd = { lead_id:b.leadId, client_name:b.clientName, property_address:b.propertyAddress, sale_price:b.salePrice, commission_rate:b.commissionRate, commission_amount:b.commissionAmount, status:b.status, close_date:b.closeDate, notes:b.notes };
      const fields = Object.entries(upd).filter(([,v]) => v !== undefined);
      if (env.DB) { await env.DB.prepare("UPDATE crm_commissions SET " + fields.map(([k]) => `${k}=?`).join(",") + " WHERE id=?").bind(...fields.map(([,v]) => v), id).run(); return json(dbToComm(await env.DB.prepare("SELECT * FROM crm_commissions WHERE id=?").bind(id).first())); }
      const i = mem.commissions.findIndex(c => c.id === id); if (i < 0) return err("Not found", 404); fields.forEach(([k,v]) => { mem.commissions[i][k] = v; }); return json(dbToComm(mem.commissions[i]));
    }
    if (method === "DELETE") { if (env.DB) await env.DB.prepare("DELETE FROM crm_commissions WHERE id=?").bind(id).run(); else mem.commissions = mem.commissions.filter(c => c.id !== id); return json({ ok: true }); }
  }

  // ── EVENTS ────────────────────────────────────────────────────────────
  if (route === "/events" && method === "GET") {
    if (env.DB) { const { results } = await env.DB.prepare("SELECT * FROM crm_events ORDER BY date ASC, time ASC").all(); return json(results.map(dbToEvent)); }
    return json([...mem.events].sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time)).map(dbToEvent));
  }
  if (route === "/events" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const r = { id:uuid(), title:b.title||"", type:b.type||"appointment", date:b.date||"", time:b.time||"", end_time:b.endTime||"", lead_id:b.leadId||"", lead_name:b.leadName||"", location:b.location||"", notes:b.notes||"", created_at:now() };
    if (env.DB) await env.DB.prepare("INSERT INTO crm_events (id,title,type,date,time,end_time,lead_id,lead_name,location,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)").bind(r.id,r.title,r.type,r.date,r.time,r.end_time,r.lead_id,r.lead_name,r.location,r.notes,r.created_at).run();
    else mem.events.push(r);
    return json(dbToEvent(r), 201);
  }
  const em = route.match(/^\/events\/([^/]+)$/);
  if (em) {
    const id = em[1];
    if (method === "PUT") {
      const b = await request.json().catch(() => ({}));
      const upd = { title:b.title, type:b.type, date:b.date, time:b.time, end_time:b.endTime, lead_id:b.leadId, lead_name:b.leadName, location:b.location, notes:b.notes };
      const fields = Object.entries(upd).filter(([,v]) => v !== undefined);
      if (env.DB) { await env.DB.prepare("UPDATE crm_events SET " + fields.map(([k]) => `${k}=?`).join(",") + " WHERE id=?").bind(...fields.map(([,v]) => v), id).run(); return json(dbToEvent(await env.DB.prepare("SELECT * FROM crm_events WHERE id=?").bind(id).first())); }
      const i = mem.events.findIndex(e => e.id === id); if (i < 0) return err("Not found", 404); fields.forEach(([k,v]) => { mem.events[i][k] = v; }); return json(dbToEvent(mem.events[i]));
    }
    if (method === "DELETE") { if (env.DB) await env.DB.prepare("DELETE FROM crm_events WHERE id=?").bind(id).run(); else mem.events = mem.events.filter(e => e.id !== id); return json({ ok: true }); }
  }

  // ── TODOS ─────────────────────────────────────────────────────────────
  if (route === "/todos" && method === "GET") {
    if (env.DB) { const { results } = await env.DB.prepare("SELECT * FROM crm_todos ORDER BY completed ASC, created_at DESC").all(); return json(results.map(dbToTodo)); }
    return json([...mem.todos].sort((a,b)=>a.completed-b.completed||b.created_at.localeCompare(a.created_at)).map(dbToTodo));
  }
  if (route === "/todos" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const r = { id:uuid(), title:b.title||"", category:b.category||"general", completed:0, due_date:b.dueDate||"", created_at:now() };
    if (env.DB) await env.DB.prepare("INSERT INTO crm_todos (id,title,category,completed,due_date,created_at) VALUES (?,?,?,?,?,?)").bind(r.id,r.title,r.category,r.completed,r.due_date,r.created_at).run();
    else mem.todos.push(r);
    return json(dbToTodo(r), 201);
  }
  const tdm = route.match(/^\/todos\/([^/]+)$/);
  if (tdm) {
    const id = tdm[1];
    if (method === "PUT") {
      const b = await request.json().catch(() => ({}));
      const upd = { title:b.title, category:b.category, completed:b.completed!==undefined?(b.completed?1:0):undefined, due_date:b.dueDate };
      const fields = Object.entries(upd).filter(([,v]) => v !== undefined);
      if (env.DB) { await env.DB.prepare("UPDATE crm_todos SET " + fields.map(([k]) => `${k}=?`).join(",") + " WHERE id=?").bind(...fields.map(([,v]) => v), id).run(); return json(dbToTodo(await env.DB.prepare("SELECT * FROM crm_todos WHERE id=?").bind(id).first())); }
      const i = mem.todos.findIndex(t => t.id === id); if (i < 0) return err("Not found", 404); fields.forEach(([k,v]) => { mem.todos[i][k] = v; }); return json(dbToTodo(mem.todos[i]));
    }
    if (method === "DELETE") { if (env.DB) await env.DB.prepare("DELETE FROM crm_todos WHERE id=?").bind(id).run(); else mem.todos = mem.todos.filter(t => t.id !== id); return json({ ok: true }); }
  }

  // ── FILES (D1 link manager) ────────────────────────────────────────────
  if (route === "/files" && method === "GET") {
    if (env.DB) { const { results } = await env.DB.prepare("SELECT * FROM crm_files ORDER BY created_at DESC").all(); return json(results.map(dbToFile)); }
    return json([...mem.files].sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(dbToFile));
  }
  if (route === "/files" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const r = { id:uuid(), name:b.name||"", category:b.category||"other", url:b.url||"", notes:b.notes||"", size:b.size||"", created_at:now() };
    if (env.DB) await env.DB.prepare("INSERT INTO crm_files (id,name,category,url,notes,size,created_at) VALUES (?,?,?,?,?,?,?)").bind(r.id,r.name,r.category,r.url,r.notes,r.size,r.created_at).run();
    else mem.files.push(r);
    return json(dbToFile(r), 201);
  }
  const fm = route.match(/^\/files\/([^/]+)$/);
  if (fm) {
    const id = fm[1];
    if (method === "PUT") {
      const b = await request.json().catch(() => ({}));
      const upd = { name:b.name, category:b.category, url:b.url, notes:b.notes, size:b.size };
      const fields = Object.entries(upd).filter(([,v]) => v !== undefined);
      if (env.DB) { await env.DB.prepare("UPDATE crm_files SET " + fields.map(([k]) => `${k}=?`).join(",") + " WHERE id=?").bind(...fields.map(([,v]) => v), id).run(); return json(dbToFile(await env.DB.prepare("SELECT * FROM crm_files WHERE id=?").bind(id).first())); }
      const i = mem.files.findIndex(f => f.id === id); if (i < 0) return err("Not found", 404); fields.forEach(([k,v]) => { mem.files[i][k] = v; }); return json(dbToFile(mem.files[i]));
    }
    if (method === "DELETE") { if (env.DB) await env.DB.prepare("DELETE FROM crm_files WHERE id=?").bind(id).run(); else mem.files = mem.files.filter(f => f.id !== id); return json({ ok: true }); }
  }

  // ── R2 FILE MANAGER ───────────────────────────────────────────────────
  // Check if R2 is available
  if (route === "/r2/status" && method === "GET") {
    return json({ available: !!env.FILES_BUCKET });
  }

  // List files/folders in a directory
  if (route === "/r2/list" && method === "GET") {
    if (!env.FILES_BUCKET) return json({ folders: [], files: [], available: false });
    const folder = url.searchParams.get("folder") || "";
    const prefix = folder ? (folder.endsWith("/") ? folder : folder + "/") : "";
    const listed = await env.FILES_BUCKET.list({ prefix, delimiter: "/" });
    const folders = (listed.delimitedPrefixes || []).map(p => ({
      key: p,
      name: p.slice(prefix.length).replace(/\/$/, ""),
      isFolder: true,
    }));
    const files = (listed.objects || [])
      .filter(o => !o.key.endsWith("/.keep") && o.key !== prefix)
      .map(o => ({
        key: o.key,
        name: o.key.slice(prefix.length),
        size: o.size,
        uploaded: o.uploaded ? o.uploaded.toISOString() : now(),
        isFolder: false,
        contentType: o.httpMetadata?.contentType || "application/octet-stream",
      }));
    return json({ folders, files, prefix, available: true });
  }

  // Create folder
  if (route === "/r2/folder" && method === "POST") {
    if (!env.FILES_BUCKET) return err("R2 not configured", 503);
    const { folder, name } = await request.json().catch(() => ({}));
    if (!name) return err("Folder name required");
    const folderKey = (folder ? folder + "/" : "") + name.replace(/\//g, "-") + "/.keep";
    await env.FILES_BUCKET.put(folderKey, "", { httpMetadata: { contentType: "text/plain" } });
    return json({ ok: true, key: folderKey });
  }

  // Upload file (multipart)
  if (route === "/r2/upload" && method === "POST") {
    if (!env.FILES_BUCKET) return err("R2 not configured", 503);
    const folder = url.searchParams.get("folder") || "";
    const formData = await request.formData().catch(() => null);
    if (!formData) return err("Expected multipart form data");
    const file = formData.get("file");
    if (!file || typeof file === "string") return err("No file provided");
    const prefix = folder ? (folder.endsWith("/") ? folder : folder + "/") : "";
    const key = prefix + file.name;
    await env.FILES_BUCKET.put(key, file.stream(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });
    return json({ ok: true, key, name: file.name, size: file.size, contentType: file.type });
  }

  // Move / rename file
  if (route === "/r2/move" && method === "POST") {
    if (!env.FILES_BUCKET) return err("R2 not configured", 503);
    const { oldKey, newKey } = await request.json().catch(() => ({}));
    if (!oldKey || !newKey) return err("oldKey and newKey required");
    const obj = await env.FILES_BUCKET.get(oldKey);
    if (!obj) return err("Source file not found", 404);
    const body = await obj.arrayBuffer();
    await env.FILES_BUCKET.put(newKey, body, { httpMetadata: { contentType: obj.httpMetadata?.contentType || "application/octet-stream" } });
    await env.FILES_BUCKET.delete(oldKey);
    return json({ ok: true, newKey });
  }

  // Delete file or folder
  if (route === "/r2/delete" && method === "DELETE") {
    if (!env.FILES_BUCKET) return err("R2 not configured", 503);
    const key = url.searchParams.get("key");
    if (!key) return err("key required");
    // If it's a folder, delete all objects with that prefix
    if (key.endsWith("/") || !key.includes(".")) {
      const prefix = key.endsWith("/") ? key : key + "/";
      let cursor;
      do {
        const listed = await env.FILES_BUCKET.list({ prefix, cursor });
        for (const obj of listed.objects || []) await env.FILES_BUCKET.delete(obj.key);
        cursor = listed.truncated ? listed.cursor : null;
      } while (cursor);
    } else {
      await env.FILES_BUCKET.delete(key);
    }
    return json({ ok: true });
  }

  // Download / stream file
  if (route === "/r2/download" && method === "GET") {
    if (!env.FILES_BUCKET) return err("R2 not configured", 503);
    const key = url.searchParams.get("key");
    if (!key) return err("key required");
    const obj = await env.FILES_BUCKET.get(key);
    if (!obj) return err("File not found", 404);
    const contentType = obj.httpMetadata?.contentType || "application/octet-stream";
    const fileName = key.split("/").pop() || "file";
    const headers = cors({ "Content-Type": contentType, "Content-Disposition": `attachment; filename="${fileName}"` });
    return new Response(obj.body, { headers });
  }

  // ── CONTENT IDEAS ─────────────────────────────────────────────────────
  if (route === "/content-ideas" && method === "GET") {
    if (env.DB) { const { results } = await env.DB.prepare("SELECT * FROM crm_content_ideas WHERE pinned=1 ORDER BY created_at DESC").all(); return json(results.map(dbToIdea)); }
    return json(mem.contentIdeas.filter(c => c.pinned).sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(dbToIdea));
  }
  if (route === "/content-ideas" && method === "POST") {
    const b = await request.json().catch(() => ({}));
    const r = { id:uuid(), text:b.text||"", topic:b.topic||"", pinned:1, created_at:now() };
    if (env.DB) await env.DB.prepare("INSERT INTO crm_content_ideas (id,text,topic,pinned,created_at) VALUES (?,?,?,?,?)").bind(r.id,r.text,r.topic,r.pinned,r.created_at).run();
    else mem.contentIdeas.push(r);
    return json(dbToIdea(r), 201);
  }
  const idm = route.match(/^\/content-ideas\/([^/]+)$/);
  if (idm) {
    const id = idm[1];
    if (method === "DELETE") { if (env.DB) await env.DB.prepare("DELETE FROM crm_content_ideas WHERE id=?").bind(id).run(); else mem.contentIdeas = mem.contentIdeas.filter(c => c.id !== id); return json({ ok: true }); }
  }

  // ── AI: Content generation ────────────────────────────────────────────
  if (route === "/ai/content" && method === "POST") {
    const { topic } = await request.json().catch(() => ({}));
    const prompt = topic || "Hawaii real estate tips for Oahu buyers and sellers";
    const systemPrompt = `You are a social media expert for Mel Castanares, a REALTOR® in Honolulu, Oahu, Hawai'i (RS-84753, Dream Home Realty Hawai'i). Her Instagram is @mel.castanares.

Generate exactly 4 engaging Instagram post captions for her. Each should:
- Be ready to copy-paste
- Include 1-2 relevant emojis
- End with a call to action (DM, comment, or link in bio)
- Include 3-5 hashtags at the end (#hawaiirealestate #oahurealtor etc.)
- Be authentic and personable, not genuine
- Be 2-4 sentences max

Topic: ${prompt}

Return ONLY the 4 captions, separated by "|||" (three pipe characters). No numbering, no labels, no extra text.`;

    const aiResponse = await runAI(env, [{ role: "user", content: systemPrompt }], 1200);
    if (aiResponse) {
      const ideas = aiResponse.split("|||").map(s => s.trim()).filter(Boolean).slice(0, 4);
      return json({ ideas });
    }
    return json({ ideas: [
      `🏡 Dreaming of owning a home in Oahu? The ${prompt.toLowerCase().includes("seller") ? "market" : "process"} might feel overwhelming, but I'm here to guide you every step of the way. DM me "HOME" to get started! #hawaiirealestate #oahurealtor #firsttimebuyer`,
      `🌺 Local expertise matters. As an Oahu Realtor who lives and breathes this market, I know what it takes to find YOUR perfect home. Let's chat! 📲 Link in bio. #oahuhomes #honolulurealestate #alohastate`,
      `💡 Did you know? Understanding Hawaii's fee simple vs leasehold properties can save you thousands. Comment "INFO" and I'll explain! #hawaiirealestate #realestatetips #oahulife`,
      `📊 Oahu market update: Homes are moving fast and inventory is tight. If you're thinking of buying or selling, NOW is the time to talk strategy. DM me today! 🤙 #oahurealtor #hawaiirealestate #mililani`,
    ]});
  }

  // ── AI: Chat ──────────────────────────────────────────────────────────
  if (route === "/ai/chat" && method === "POST") {
    const { message, context } = await request.json().catch(() => ({}));
    const systemPrompt = `You are Mel's real estate CRM assistant. Today is ${today()}.

Mel Castanares is a REALTOR® (RS-84753) at Dream Home Realty Hawai'i in Oahu. Phone: (808) 285-8774. Instagram: @mel.castanares.

Current data:
- Total leads: ${context?.totalLeads ?? "unknown"}
- Active leads: ${context?.activeLeadCount ?? "unknown"} — ${context?.activeLeads || "none"}
- Overdue tasks: ${context?.overdueTasks || "none"}
- Today's tasks: ${context?.todayTasks || "none"}
- Upcoming calendar events: ${context?.events || "none"}

You can help Mel with:
1. Answering questions about her leads, tasks, and calendar
2. Suggesting follow-up strategies for leads
3. Instagram content ideas and hashtag suggestions
4. Real estate market insights for Oahu
5. Creating calendar events — if she asks to schedule something, reply with a JSON block at the end: {"action":"create_event","event":{"title":"...","type":"appointment|open-house|showing|closing|call|personal","date":"YYYY-MM-DD","time":"HH:MM","location":"..."}}

Keep responses concise, warm, and actionable. Use 'Mahalo' or Aloha where natural.`;

    const aiResponse = await runAI(env, [
      { role: "system", content: systemPrompt },
      { role: "user", content: message }
    ], 800);

    if (aiResponse) {
      let action = undefined; let event = undefined;
      const jsonMatch = aiResponse.match(/\{[\s\S]*"action"\s*:\s*"create_event"[\s\S]*\}/);
      if (jsonMatch) {
        try { const parsed = JSON.parse(jsonMatch[0]); action = parsed.action; event = parsed.event; } catch {}
      }
      const cleanMessage = aiResponse.replace(/\{[\s\S]*"action"\s*:\s*"create_event"[\s\S]*\}/, "").trim();
      return json({ message: cleanMessage, action, event });
    }

    const lower = message.toLowerCase();
    if (lower.includes("lead") || lower.includes("contact")) return json({ message: `You currently have ${context?.totalLeads ?? 0} leads, with ${context?.activeLeadCount ?? 0} active in your pipeline. Your active leads include: ${context?.activeLeads || "none yet"}. Would you like to add a new lead or update someone's status?` });
    if (lower.includes("task") || lower.includes("overdue")) return json({ message: `Today's tasks: ${context?.todayTasks || "none"}. Overdue: ${context?.overdueTasks || "none"}. Head to the Tasks page to check them off!` });
    if (lower.includes("calendar") || lower.includes("event") || lower.includes("schedule")) return json({ message: `Your upcoming events: ${context?.events || "nothing scheduled yet"}. Head to the Calendar page to add or manage events!` });
    if (lower.includes("instagram") || lower.includes("post") || lower.includes("content")) return json({ message: "Head to the Social page to generate Instagram content ideas with AI! Your best posting time is Saturday at 8am, and your top hashtags are #hawaiirealestate and #oahurealtor. 🌺" });
    return json({ message: "Mahalo! 🌺 I can help with your leads, tasks, calendar, and Instagram content ideas. What would you like to know?" });
  }

  // ── MLS Listings ──────────────────────────────────────────────────────
  if (route === "/mls/listings" && method === "GET") {
    const IDX_URL = "https://search.idxbroker.com/idx/results/listings?pt=&ccz=city&city[]=Honolulu&city[]=Kailua&city[]=Mililani&city[]=Aiea&city[]=Pearl+City&city[]=Kapolei&sold=0&a_propStatus[]=Active&bd=0&tb=0&pricekeywords=0&savedName=&savedExclusive=&savedType=";
    try {
      const r = await fetch(IDX_URL, {
        headers: { "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36", Accept: "text/html,application/xhtml+xml" },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) throw new Error(`IDX ${r.status}`);
      const html = await r.text();
      const listings = [];
      const blockRx = /<div[^>]+class="[^"]*IDX-resultsRow[^"]*"[^>]*>([\s\S]*?)<\/div>\s*(?=<div[^>]+class="[^"]*IDX-resultsRow|$)/g;
      let match;
      while ((match = blockRx.exec(html)) !== null && listings.length < 20) {
        const block = match[1];
        const priceM = block.match(/\$[\d,]+/);
        const addrM = block.match(/(?:Address|address)[^>]*>[^<]*<[^>]+>([^<]+)/);
        const mlsM = block.match(/MLS[^\d]*(\d{7,9})/i);
        const bedsM = block.match(/(\d+)\s*(?:Bed|BR|bd)/i);
        const bathsM = block.match(/([\d.]+)\s*(?:Bath|BA|ba)/i);
        const sqftM = block.match(/([\d,]+)\s*(?:sq\s*ft|sqft)/i);
        const imgM = block.match(/src="([^"]*\.jpe?g[^"]*)"/i);
        const hrefM = block.match(/href="(\/idx\/listings\/detail[^"]+)"/);
        if (priceM && addrM) {
          listings.push({
            mlsNum: mlsM ? mlsM[1] : "",
            address: addrM[1].trim(),
            city: "Honolulu", state: "HI", zip: "",
            price: parseInt(priceM[0].replace(/[\$,]/g, "")) || 0,
            beds: bedsM ? parseInt(bedsM[1]) : 0,
            baths: bathsM ? parseFloat(bathsM[1]) : 0,
            sqft: sqftM ? parseInt(sqftM[1].replace(/,/g, "")) : 0,
            status: "Active",
            photo: imgM ? imgM[1] : "",
            listingUrl: hrefM ? `https://search.idxbroker.com${hrefM[1]}` : "#",
          });
        }
      }
      return json({ listings, count: listings.length, source: "idx-broker" });
    } catch (e) {
      return json({ listings: [], count: 0, error: "IDX feed unavailable", source: "idx-broker" });
    }
  }

  // ── Expenses ──────────────────────────────────────────────────────────
  if (route === "/expenses" && method === "GET") {
    if (env.DB) {
      const rows = await env.DB.prepare("SELECT * FROM crm_expenses ORDER BY date DESC, created_at DESC").all();
      return json((rows.results || []).map(dbToExpense));
    }
    return json(mem.expenses.sort((a, b) => b.date.localeCompare(a.date)).map(dbToExpense));
  }
  if (route === "/expenses" && method === "POST") {
    const d = await request.json().catch(() => ({}));
    const id = uuid();
    const ts = now();
    if (env.DB) {
      await env.DB.prepare("INSERT INTO crm_expenses (id,date,category,vendor,description,amount,receipt_url,tax_deductible,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)")
        .bind(id, d.date||today(), d.category||"Other", d.vendor||"", d.description||"", d.amount||0, d.receiptUrl||"", d.taxDeductible!==false?1:0, d.notes||"", ts).run();
      const row = await env.DB.prepare("SELECT * FROM crm_expenses WHERE id=?").bind(id).first();
      return json(dbToExpense(row), 201);
    }
    const e = { id, date:d.date||today(), category:d.category||"Other", vendor:d.vendor||"", description:d.description||"", amount:d.amount||0, receipt_url:d.receiptUrl||"", tax_deductible:d.taxDeductible!==false?1:0, notes:d.notes||"", created_at:ts };
    mem.expenses.push(e);
    return json(dbToExpense(e), 201);
  }
  if (route.startsWith("/expenses/") && method === "PUT") {
    const id = route.split("/")[2];
    const d = await request.json().catch(() => ({}));
    if (env.DB) {
      await env.DB.prepare("UPDATE crm_expenses SET date=?,category=?,vendor=?,description=?,amount=?,receipt_url=?,tax_deductible=?,notes=? WHERE id=?")
        .bind(d.date, d.category, d.vendor, d.description||"", d.amount||0, d.receiptUrl||"", d.taxDeductible!==false?1:0, d.notes||"", id).run();
      const row = await env.DB.prepare("SELECT * FROM crm_expenses WHERE id=?").bind(id).first();
      return json(row ? dbToExpense(row) : {});
    }
    const idx = mem.expenses.findIndex(e => e.id === id);
    if (idx >= 0) { mem.expenses[idx] = { ...mem.expenses[idx], ...d, id }; return json(dbToExpense(mem.expenses[idx])); }
    return err("Not found", 404);
  }
  if (route.startsWith("/expenses/") && method === "DELETE") {
    const id = route.split("/")[2];
    if (env.DB) { await env.DB.prepare("DELETE FROM crm_expenses WHERE id=?").bind(id).run(); return json({ ok: true }); }
    mem.expenses = mem.expenses.filter(e => e.id !== id);
    return json({ ok: true });
  }

  // ── Receipt upload (R2) ───────────────────────────────────────────────
  if (route === "/expenses/upload" && method === "POST") {
    if (!env.FILES_BUCKET) return err("R2 not configured", 503);
    const formData = await request.formData().catch(() => null);
    const file = formData?.get("file");
    if (!file || typeof file === "string") return err("No file provided", 400);
    const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
    const key = `receipts/${today()}-${uuid().slice(0,8)}.${ext}`;
    await env.FILES_BUCKET.put(key, file.stream(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
    const obj = await env.FILES_BUCKET.get(key);
    const url = obj ? `https://pub-${key}` : key;
    return json({ ok: true, url: `/api/r2/download?key=${encodeURIComponent(key)}`, key });
  }

  // ── HI Central Open Houses ────────────────────────────────────────────
  if (route === "/hicentral/openhouses" && method === "GET") {
    try {
      // HI Central public open house search
      const HICENTRAL_URL = "https://www.hicentral.com/for-sale-oahu/homes/?open_house=1";
      const r = await fetch(HICENTRAL_URL, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
          "Referer": "https://www.hicentral.com/",
        },
        signal: AbortSignal.timeout(12000),
      });
      if (!r.ok) throw new Error(`HI Central returned ${r.status}`);
      const html = await r.text();
      const listings = [];

      // Parse listing cards from HI Central
      const cardRx = /<(?:div|article)[^>]+class="[^"]*(?:listing-card|property-card|search-result)[^"]*"[^>]*>([\s\S]*?)<\/(?:div|article)>/gi;
      let m;
      while ((m = cardRx.exec(html)) !== null && listings.length < 30) {
        const card = m[1];
        const priceM = card.match(/\$[\d,]+(?:,\d{3})?/);
        const addrM = card.match(/(?:address|street)[^>]*>([^<]{5,80})</i) || card.match(/<[^>]+title="([^"]{10,80})"/);
        const ohM = card.match(/Open\s+House[^<]*([A-Za-z]+\s+\d+|today)/i);
        const bedM = card.match(/(\d+)\s*(?:bed|br)/i);
        const bathM = card.match(/([\d.]+)\s*(?:bath|ba)/i);
        const sqftM = card.match(/([\d,]+)\s*(?:sq\.?\s*ft|sqft)/i);
        const imgM = card.match(/src="([^"]*(?:property|listing|image)[^"]*\.jpe?g[^"]*)"/i);
        const linkM = card.match(/href="([^"]*(?:property|listing|detail)[^"]*)"/i);
        if (priceM || addrM) {
          listings.push({
            price: priceM ? parseInt(priceM[0].replace(/[\$,]/g, "")) : 0,
            address: addrM ? addrM[1].trim() : "Oahu, HI",
            openHouseDate: ohM ? ohM[1] : "",
            beds: bedM ? bedM[1] : "",
            baths: bathM ? bathM[1] : "",
            sqft: sqftM ? sqftM[1].replace(/,/g, "") : "",
            photo: imgM ? imgM[1] : "",
            url: linkM ? (linkM[1].startsWith("http") ? linkM[1] : "https://www.hicentral.com" + linkM[1]) : "https://www.hicentral.com",
            source: "hicentral",
          });
        }
      }
      return json({ openHouses: listings, count: listings.length, source: "hicentral", url: HICENTRAL_URL });
    } catch (e) {
      return json({ openHouses: [], count: 0, error: "Could not load HI Central data", url: "https://www.hicentral.com/for-sale-oahu/homes/?open_house=1" });
    }
  }

  // ── TRANSACTIONS ──────────────────────────────────────────────────────
  const BUY_MILESTONES = () => JSON.stringify([
    {id:"droa",label:"DROA Signed",completed:false,date:""},
    {id:"earnest",label:"Earnest Money Deposited",completed:false,date:""},
    {id:"escrow",label:"Escrow Opened",completed:false,date:""},
    {id:"inspection",label:"Home Inspection",completed:false,date:""},
    {id:"disclosure",label:"Seller Disclosures Reviewed (SREC)",completed:false,date:""},
    {id:"loan",label:"Loan Commitment Received",completed:false,date:""},
    {id:"title",label:"Title Search Cleared",completed:false,date:""},
    {id:"hoa",label:"HOA Docs Reviewed",completed:false,date:""},
    {id:"walkthrough",label:"Final Walk-Through",completed:false,date:""},
    {id:"closing",label:"Closing & Recording",completed:false,date:""},
  ]);
  const SELL_MILESTONES = () => JSON.stringify([
    {id:"listing",label:"Listing Agreement Signed",completed:false,date:""},
    {id:"photos",label:"Photos & Marketing Live",completed:false,date:""},
    {id:"mls",label:"Listed on MLS",completed:false,date:""},
    {id:"offer",label:"Offer Accepted",completed:false,date:""},
    {id:"escrow",label:"Escrow Opened",completed:false,date:""},
    {id:"inspection",label:"Inspection Completed",completed:false,date:""},
    {id:"appraisal",label:"Appraisal Cleared",completed:false,date:""},
    {id:"loan",label:"Buyer's Loan Approved",completed:false,date:""},
    {id:"walkthrough",label:"Final Walk-Through",completed:false,date:""},
    {id:"closing",label:"Closing & Recording",completed:false,date:""},
  ]);

  if (route === "/transactions" && method === "GET") {
    if (!await auth(request, env)) return err("Unauthorized", 401);
    if (env.DB) {
      const { results } = await env.DB.prepare("SELECT * FROM crm_transactions ORDER BY created_at DESC").all();
      return json(results.map(dbToTx));
    }
    return json((mem.transactions || []).map(dbToTx));
  }
  if (route === "/transactions" && method === "POST") {
    if (!await auth(request, env)) return err("Unauthorized", 401);
    const d = await request.json().catch(() => ({}));
    if (!d.clientName || !d.propertyAddress) return err("clientName and propertyAddress required");
    const id = uuid();
    const milestones = d.milestones ? JSON.stringify(d.milestones) : (d.transactionType === "sell" ? SELL_MILESTONES() : BUY_MILESTONES());
    const commAmt = d.commissionAmount || Math.round((d.salePrice||d.listPrice||0) * ((d.commissionRate||3)/100));
    if (env.DB) {
      await env.DB.prepare("INSERT INTO crm_transactions (id,lead_id,client_name,property_address,transaction_type,status,list_price,sale_price,commission_rate,commission_amount,contract_date,escrow_open_date,inspection_deadline,disclosure_deadline,loan_contingency_date,title_clear_date,hoa_docs_date,closing_date,milestones,notes,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,d.leadId||null,d.clientName,d.propertyAddress,d.transactionType||"buy",d.status||"active",d.listPrice||0,d.salePrice||0,d.commissionRate||3,commAmt,d.contractDate||null,d.escrowOpenDate||null,d.inspectionDeadline||null,d.disclosureDeadline||null,d.loanContingencyDate||null,d.titleClearDate||null,d.hoaDocsDate||null,d.closingDate||null,milestones,d.notes||null,now()).run();
      const r = await env.DB.prepare("SELECT * FROM crm_transactions WHERE id=?").bind(id).first();
      return json(dbToTx(r), 201);
    }
    const tx = { id, lead_id:d.leadId||"", client_name:d.clientName, property_address:d.propertyAddress, transaction_type:d.transactionType||"buy", status:d.status||"active", list_price:d.listPrice||0, sale_price:d.salePrice||0, commission_rate:d.commissionRate||3, commission_amount:commAmt, milestones, notes:d.notes||"", created_at:now() };
    if (!mem.transactions) mem.transactions = [];
    mem.transactions.unshift(tx);
    return json(dbToTx(tx), 201);
  }
  if (route.match(/^\/transactions\/[^/]+$/) && method === "PUT") {
    if (!await auth(request, env)) return err("Unauthorized", 401);
    const id = route.split("/")[2];
    const d = await request.json().catch(() => ({}));
    const milestonesVal = d.milestones !== undefined ? JSON.stringify(d.milestones) : undefined;
    const commAmt = d.commissionAmount !== undefined ? d.commissionAmount : (d.salePrice !== undefined ? Math.round(d.salePrice * ((d.commissionRate||3)/100)) : undefined);
    if (env.DB) {
      const fields = []; const vals = [];
      if (d.clientName !== undefined) { fields.push("client_name=?"); vals.push(d.clientName); }
      if (d.propertyAddress !== undefined) { fields.push("property_address=?"); vals.push(d.propertyAddress); }
      if (d.transactionType !== undefined) { fields.push("transaction_type=?"); vals.push(d.transactionType); }
      if (d.status !== undefined) { fields.push("status=?"); vals.push(d.status); }
      if (d.listPrice !== undefined) { fields.push("list_price=?"); vals.push(d.listPrice); }
      if (d.salePrice !== undefined) { fields.push("sale_price=?"); vals.push(d.salePrice); }
      if (d.commissionRate !== undefined) { fields.push("commission_rate=?"); vals.push(d.commissionRate); }
      if (commAmt !== undefined) { fields.push("commission_amount=?"); vals.push(commAmt); }
      if (d.contractDate !== undefined) { fields.push("contract_date=?"); vals.push(d.contractDate); }
      if (d.escrowOpenDate !== undefined) { fields.push("escrow_open_date=?"); vals.push(d.escrowOpenDate); }
      if (d.inspectionDeadline !== undefined) { fields.push("inspection_deadline=?"); vals.push(d.inspectionDeadline); }
      if (d.disclosureDeadline !== undefined) { fields.push("disclosure_deadline=?"); vals.push(d.disclosureDeadline); }
      if (d.loanContingencyDate !== undefined) { fields.push("loan_contingency_date=?"); vals.push(d.loanContingencyDate); }
      if (d.titleClearDate !== undefined) { fields.push("title_clear_date=?"); vals.push(d.titleClearDate); }
      if (d.hoaDocsDate !== undefined) { fields.push("hoa_docs_date=?"); vals.push(d.hoaDocsDate); }
      if (d.closingDate !== undefined) { fields.push("closing_date=?"); vals.push(d.closingDate); }
      if (milestonesVal !== undefined) { fields.push("milestones=?"); vals.push(milestonesVal); }
      if (d.notes !== undefined) { fields.push("notes=?"); vals.push(d.notes); }
      if (fields.length) { vals.push(id); await env.DB.prepare(`UPDATE crm_transactions SET ${fields.join(",")} WHERE id=?`).bind(...vals).run(); }
      const r = await env.DB.prepare("SELECT * FROM crm_transactions WHERE id=?").bind(id).first();
      return r ? json(dbToTx(r)) : err("Not found", 404);
    }
    if (!mem.transactions) return err("Not found", 404);
    const tidx = mem.transactions.findIndex(t => t.id === id);
    if (tidx < 0) return err("Not found", 404);
    const t = mem.transactions[tidx];
    const milestonesVal = d.milestones !== undefined ? JSON.stringify(d.milestones) : undefined;
    const commAmt = d.commissionAmount !== undefined ? d.commissionAmount : (d.salePrice !== undefined ? Math.round(d.salePrice * ((d.commissionRate || t.commission_rate || 3) / 100)) : undefined);
    if (d.clientName !== undefined) t.client_name = d.clientName;
    if (d.propertyAddress !== undefined) t.property_address = d.propertyAddress;
    if (d.transactionType !== undefined) t.transaction_type = d.transactionType;
    if (d.status !== undefined) t.status = d.status;
    if (d.listPrice !== undefined) t.list_price = d.listPrice;
    if (d.salePrice !== undefined) t.sale_price = d.salePrice;
    if (d.commissionRate !== undefined) t.commission_rate = d.commissionRate;
    if (commAmt !== undefined) t.commission_amount = commAmt;
    if (d.contractDate !== undefined) t.contract_date = d.contractDate;
    if (d.escrowOpenDate !== undefined) t.escrow_open_date = d.escrowOpenDate;
    if (d.inspectionDeadline !== undefined) t.inspection_deadline = d.inspectionDeadline;
    if (d.disclosureDeadline !== undefined) t.disclosure_deadline = d.disclosureDeadline;
    if (d.loanContingencyDate !== undefined) t.loan_contingency_date = d.loanContingencyDate;
    if (d.titleClearDate !== undefined) t.title_clear_date = d.titleClearDate;
    if (d.hoaDocsDate !== undefined) t.hoa_docs_date = d.hoaDocsDate;
    if (d.closingDate !== undefined) t.closing_date = d.closingDate;
    if (milestonesVal !== undefined) t.milestones = milestonesVal;
    if (d.notes !== undefined) t.notes = d.notes;
    return json(dbToTx(t));
  }
  if (route.match(/^\/transactions\/[^/]+$/) && method === "DELETE") {
    if (!await auth(request, env)) return err("Unauthorized", 401);
    const id = route.split("/")[2];
    if (env.DB) { await env.DB.prepare("DELETE FROM crm_transactions WHERE id=?").bind(id).run(); return json({ ok: true }); }
    return json({ ok: true });
  }

  // ── LEAD DNA ──────────────────────────────────────────────────────────
  if (route.match(/^\/leads\/[^/]+\/dna$/) && method === "PUT") {
    if (!await auth(request, env)) return err("Unauthorized", 401);
    const leadId = route.split("/")[2];
    const { dna } = await request.json().catch(() => ({}));
    if (!dna) return err("dna required");
    if (env.DB) {
      try { await env.DB.prepare("ALTER TABLE crm_leads ADD COLUMN lead_dna TEXT").run(); } catch {}
      try { await env.DB.prepare("ALTER TABLE crm_leads ADD COLUMN lead_dna_updated TEXT").run(); } catch {}
      await env.DB.prepare("UPDATE crm_leads SET lead_dna=?, lead_dna_updated=? WHERE id=?").bind(dna, now(), leadId).run();
      const r = await env.DB.prepare("SELECT * FROM crm_leads WHERE id=?").bind(leadId).first();
      return r ? json(dbToLeadWithDna(r)) : err("Not found", 404);
    }
    return json({ ok: true });
  }
  if (route.match(/^\/leads\/[^/]+$/) && method === "GET") {
    if (!await auth(request, env)) return err("Unauthorized", 401);
    const leadId = route.split("/")[2];
    if (env.DB) {
      try { await env.DB.prepare("ALTER TABLE crm_leads ADD COLUMN lead_dna TEXT").run(); } catch {}
      try { await env.DB.prepare("ALTER TABLE crm_leads ADD COLUMN lead_dna_updated TEXT").run(); } catch {}
      const r = await env.DB.prepare("SELECT * FROM crm_leads WHERE id=?").bind(leadId).first();
      return r ? json(dbToLeadWithDna(r)) : err("Not found", 404);
    }
    const memLead = mem.leads.find(l => l.id === leadId);
    return memLead ? json(dbToLeadWithDna(memLead)) : err("Not found", 404);
  }

  // ── Instagram public profile scrape ──────────────────────────────────
  if (route === "/instagram/stats" && method === "GET") {
    const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
    const IG_HANDLE = "mel.castanares";

    // Serve from in-memory cache if fresh
    if (mem.igCache && Date.now() - mem.igCache.ts < CACHE_TTL_MS) {
      return json({ ...mem.igCache.data, cached: true });
    }

    try {
      const res = await fetch(`https://www.instagram.com/${IG_HANDLE}/`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          "Sec-Fetch-Dest": "document",
          "Sec-Fetch-Mode": "navigate",
          "Sec-Fetch-Site": "none",
          "Cache-Control": "max-age=0",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) throw new Error(`Instagram returned ${res.status}`);
      const html = await res.text();

      let data = null;

      // Current structure: JSON in <script type="application/json" data-sjs>
      const ssjsBlocks = [...html.matchAll(/<script[^>]+type="application\/json"[^>]*data-sjs[^>]*>([\s\S]*?)<\/script>/g)];
      for (const block of ssjsBlocks) {
        try {
          const str = block[1];
          const followersM = str.match(/"edge_followed_by":\{"count":(\d+)\}/);
          if (!followersM) continue;
          const followingM = str.match(/"edge_follow":\{"count":(\d+)\}/);
          const postsM = str.match(/"edge_owner_to_timeline_media":\{"count":(\d+)/);
          const bioM = str.match(/"biography":"((?:[^"\\]|\\.)*)"/);
          const fullNameM = str.match(/"full_name":"((?:[^"\\]|\\.)*)"/);
          const picM = str.match(/"profile_pic_url_hd":"((?:[^"\\]|\\.)*)"/);
          const likesAll = [...str.matchAll(/"edge_liked_by":\{"count":(\d+)\}/g)].map(m => parseInt(m[1]));
          const commAll = [...str.matchAll(/"edge_media_to_comment":\{"count":(\d+)\}/g)].map(m => parseInt(m[1]));
          const avgLikes = likesAll.length ? Math.round(likesAll.reduce((a, b) => a + b, 0) / likesAll.length) : null;
          const avgComments = commAll.length ? Math.round(commAll.reduce((a, b) => a + b, 0) / commAll.length * 10) / 10 : null;
          const followers = parseInt(followersM[1]);
          data = {
            followers,
            following: followingM ? parseInt(followingM[1]) : null,
            posts: postsM ? parseInt(postsM[1]) : null,
            bio: bioM ? bioM[1].replace(/\\n/g, " ").replace(/\\u0026/g, "&") : "",
            fullName: fullNameM ? fullNameM[1] : "",
            profilePic: picM ? picM[1].replace(/\\\//g, "/") : "",
            avgLikes,
            avgComments,
            engagement: avgLikes ? ((avgLikes / followers) * 100).toFixed(2) + "%" : null,
            fetchedAt: now(),
            source: "live",
          };
          break;
        } catch {}
      }

      // Fallback: legacy window._sharedData
      if (!data) {
        const sharedMatch = html.match(/window\._sharedData\s*=\s*(\{[\s\S]*?\});<\/script>/);
        if (sharedMatch) {
          try {
            const parsed = JSON.parse(sharedMatch[1]);
            const user = parsed?.entry_data?.ProfilePage?.[0]?.graphql?.user;
            if (user) {
              data = {
                followers: user.edge_followed_by?.count ?? null,
                following: user.edge_follow?.count ?? null,
                posts: user.edge_owner_to_timeline_media?.count ?? null,
                bio: user.biography || "",
                fullName: user.full_name || "",
                profilePic: user.profile_pic_url_hd || "",
                avgLikes: null, avgComments: null, engagement: null,
                fetchedAt: now(),
                source: "live",
              };
            }
          } catch {}
        }
      }

      if (data) {
        mem.igCache = { ts: Date.now(), data };
        return json({ ...data, cached: false });
      }
      throw new Error("Could not parse Instagram profile data");
    } catch (e) {
      return json({ error: String(e.message), source: "error" }, 502);
    }
  }

  return err("Not found", 404);
}
