import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import type { Plugin } from "vite";

const rawPort = process.env.PORT;
if (!rawPort) throw new Error("PORT environment variable is required but was not provided.");
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) throw new Error(`Invalid PORT value: "${rawPort}"`);
const basePath = process.env.BASE_PATH;
if (!basePath) throw new Error("BASE_PATH environment variable is required but was not provided.");

// ── In-memory CRM API for local development ───────────────────────────
function devCrmApi(): Plugin {
  const mem: { sessions: any[]; leads: any[]; tasks: any[]; commissions: any[] } = { sessions: [], leads: [], tasks: [], commissions: [] };
  const now = () => new Date().toISOString();
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  const CRM_PW = process.env.CRM_PASSWORD || "mel2024";

  function getAuth(req: any) {
    const hdr = req.headers["authorization"] || "";
    const token = hdr.replace("Bearer ", "").trim();
    return mem.sessions.some(s => s.token === token && s.expires_at > now());
  }

  function jsonRes(res: any, data: any, status = 200) {
    res.statusCode = status;
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.end(JSON.stringify(data));
  }
  function errRes(res: any, msg: string, status = 400) { jsonRes(res, { error: msg }, status); }

  async function body(req: any): Promise<any> {
    return new Promise((resolve) => {
      let b = "";
      req.on("data", (c: any) => b += c);
      req.on("end", () => { try { resolve(JSON.parse(b)); } catch { resolve({}); } });
    });
  }

  function dbToLead(r: any) { return { id: r.id, name: r.name||"", email: r.email||"", phone: r.phone||"", intent: r.intent||"buy", status: r.status||"new", source: r.source||"website", priceMin: r.price_min||0, priceMax: r.price_max||0, neighborhoods: r.neighborhoods||"", bedsMin: r.beds_min||0, bathsMin: r.baths_min||0, preApproval: r.pre_approval||"unknown", preApprovalAmount: r.pre_approval_amount||0, timeline: r.timeline||"", propertyAddress: r.property_address||"", estimatedValue: r.estimated_value||0, notes: r.notes||"", nextStep: r.next_step||"", nextStepDate: r.next_step_date||"", createdAt: r.created_at||now(), updatedAt: r.updated_at||now() }; }
  function dbToTask(r: any) { return { id: r.id, title: r.title||"", type: r.type||"follow-up", leadId: r.lead_id||"", leadName: r.lead_name||"", dueDate: r.due_date||"", dueTime: r.due_time||"", priority: r.priority||"medium", completed: r.completed===1||r.completed===true, notes: r.notes||"", createdAt: r.created_at||now() }; }
  function dbToComm(r: any) { return { id: r.id, leadId: r.lead_id||"", clientName: r.client_name||"", propertyAddress: r.property_address||"", salePrice: r.sale_price||0, commissionRate: r.commission_rate||3, commissionAmount: r.commission_amount||0, status: r.status||"pending", closeDate: r.close_date||"", notes: r.notes||"", createdAt: r.created_at||now() }; }

  return {
    name: "dev-crm-api",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url || "";
        // Match /mel-crm/api/...  or  /api/...
        const m = url.match(/\/api(\/.*?)(\?.*)?$/);
        if (!m) return next();
        const route = m[1];
        const method = (req.method || "GET").toUpperCase();

        if (method === "OPTIONS") { res.setHeader("Access-Control-Allow-Origin","*"); res.setHeader("Access-Control-Allow-Headers","Content-Type,Authorization"); res.statusCode=204; return res.end(); }

        // Auth: login
        if (route === "/auth/login" && method === "POST") { const b = await body(req); if (b.password !== CRM_PW) return errRes(res,"Incorrect password",401); const token = uid()+uid(); mem.sessions.push({ token, expires_at: new Date(Date.now()+30*86400000).toISOString() }); return jsonRes(res,{token}); }
        if (route === "/auth/verify" && method === "GET") { return getAuth(req) ? jsonRes(res,{ok:true}) : errRes(res,"Unauthorized",401); }
        if (route === "/auth/logout" && method === "POST") { const hdr=(req.headers["authorization"]||"").replace("Bearer ","").trim(); mem.sessions=mem.sessions.filter(s=>s.token!==hdr); return jsonRes(res,{ok:true}); }

        if (!getAuth(req)) return errRes(res,"Unauthorized",401);

        // Stats
        if (route === "/stats" && method === "GET") { const yr=new Date().getFullYear()+"-01-01"; const closed=mem.commissions.filter(c=>c.status==="closed"&&c.close_date>=yr); return jsonRes(res,{totalLeads:mem.leads.length,activeLeads:mem.leads.filter(l=>!["closed","lost"].includes(l.status)).length,tasksDueToday:mem.tasks.filter(t=>!t.completed&&t.due_date===today()).length,closedCommissions:closed.length,totalCommissionYTD:closed.reduce((s,c)=>s+(c.commission_amount||0),0)}); }

        // Leads
        if (route === "/leads" && method === "GET") return jsonRes(res,[...mem.leads].sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(dbToLead));
        if (route === "/leads" && method === "POST") { const b=await body(req); const r={id:uid(),name:b.name||"",email:b.email||"",phone:b.phone||"",intent:b.intent||"buy",status:b.status||"new",source:b.source||"website",price_min:b.priceMin||0,price_max:b.priceMax||0,neighborhoods:b.neighborhoods||"",beds_min:b.bedsMin||0,baths_min:b.bathsMin||0,pre_approval:b.preApproval||"unknown",pre_approval_amount:b.preApprovalAmount||0,timeline:b.timeline||"",property_address:b.propertyAddress||"",estimated_value:b.estimatedValue||0,notes:b.notes||"",next_step:b.nextStep||"",next_step_date:b.nextStepDate||"",created_at:now(),updated_at:now()}; mem.leads.push(r); return jsonRes(res,dbToLead(r),201); }
        const lm=route.match(/^\/leads\/([^/]+)$/);
        if (lm && method==="PUT") { const id=lm[1]; const b=await body(req); const i=mem.leads.findIndex(l=>l.id===id); if(i<0) return errRes(res,"Not found",404); const upd:any={name:b.name,email:b.email,phone:b.phone,intent:b.intent,status:b.status,source:b.source,price_min:b.priceMin,price_max:b.priceMax,neighborhoods:b.neighborhoods,beds_min:b.bedsMin,baths_min:b.bathsMin,pre_approval:b.preApproval,pre_approval_amount:b.preApprovalAmount,timeline:b.timeline,property_address:b.propertyAddress,estimated_value:b.estimatedValue,notes:b.notes,next_step:b.nextStep,next_step_date:b.nextStepDate,updated_at:now()}; Object.entries(upd).forEach(([k,v])=>{if(v!==undefined)mem.leads[i][k]=v;}); return jsonRes(res,dbToLead(mem.leads[i])); }
        if (lm && method==="DELETE") { const id=lm[1]; mem.leads=mem.leads.filter(l=>l.id!==id); return jsonRes(res,{ok:true}); }

        // Tasks
        if (route === "/tasks" && method === "GET") return jsonRes(res,[...mem.tasks].sort((a,b)=>(a.due_date||"").localeCompare(b.due_date||"")).map(dbToTask));
        if (route === "/tasks" && method === "POST") { const b=await body(req); const r={id:uid(),title:b.title||"",type:b.type||"follow-up",lead_id:b.leadId||"",lead_name:b.leadName||"",due_date:b.dueDate||"",due_time:b.dueTime||"",priority:b.priority||"medium",completed:0,notes:b.notes||"",created_at:now()}; mem.tasks.push(r); return jsonRes(res,dbToTask(r),201); }
        const tm=route.match(/^\/tasks\/([^/]+)$/);
        if (tm && method==="PUT") { const id=tm[1]; const b=await body(req); const i=mem.tasks.findIndex(t=>t.id===id); if(i<0) return errRes(res,"Not found",404); const upd:any={title:b.title,type:b.type,lead_id:b.leadId,lead_name:b.leadName,due_date:b.dueDate,due_time:b.dueTime,priority:b.priority,completed:b.completed!==undefined?(b.completed?1:0):undefined,notes:b.notes}; Object.entries(upd).forEach(([k,v])=>{if(v!==undefined)mem.tasks[i][k]=v;}); return jsonRes(res,dbToTask(mem.tasks[i])); }
        if (tm && method==="DELETE") { const id=tm[1]; mem.tasks=mem.tasks.filter(t=>t.id!==id); return jsonRes(res,{ok:true}); }

        // Commissions
        if (route === "/commissions" && method === "GET") return jsonRes(res,[...mem.commissions].sort((a,b)=>b.created_at.localeCompare(a.created_at)).map(dbToComm));
        if (route === "/commissions" && method === "POST") { const b=await body(req); const r={id:uid(),lead_id:b.leadId||"",client_name:b.clientName||"",property_address:b.propertyAddress||"",sale_price:b.salePrice||0,commission_rate:b.commissionRate||3,commission_amount:b.commissionAmount||0,status:b.status||"pending",close_date:b.closeDate||"",notes:b.notes||"",created_at:now()}; mem.commissions.push(r); return jsonRes(res,dbToComm(r),201); }
        const cm=route.match(/^\/commissions\/([^/]+)$/);
        if (cm && method==="PUT") { const id=cm[1]; const b=await body(req); const i=mem.commissions.findIndex(c=>c.id===id); if(i<0) return errRes(res,"Not found",404); const upd:any={lead_id:b.leadId,client_name:b.clientName,property_address:b.propertyAddress,sale_price:b.salePrice,commission_rate:b.commissionRate,commission_amount:b.commissionAmount,status:b.status,close_date:b.closeDate,notes:b.notes}; Object.entries(upd).forEach(([k,v])=>{if(v!==undefined)mem.commissions[i][k]=v;}); return jsonRes(res,dbToComm(mem.commissions[i])); }
        if (cm && method==="DELETE") { const id=cm[1]; mem.commissions=mem.commissions.filter(c=>c.id!==id); return jsonRes(res,{ok:true}); }

        next();
      });
    },
  };
}

export default defineConfig({
  base: basePath,
  plugins: [
    devCrmApi(),
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) => m.cartographer({ root: path.resolve(import.meta.dirname, "..") })),
          await import("@replit/vite-plugin-dev-banner").then((m) => m.devBanner()),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: { strict: true, deny: ["**/.*"] },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
