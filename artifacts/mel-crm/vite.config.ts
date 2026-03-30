import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import type { Plugin } from "vite";

// PORT is only required for the dev server, not production builds
const rawPort = process.env.PORT;
const port = rawPort ? Number(rawPort) : 3000;
if (rawPort && (Number.isNaN(port) || port <= 0)) throw new Error(`Invalid PORT value: "${rawPort}"`);
// BASE_PATH defaults to "/" for standalone Cloudflare Pages deployments
const basePath = process.env.BASE_PATH || "/";

// ── In-memory CRM API for local development ───────────────────────────
function devCrmApi(): Plugin {
  const mem: { sessions: any[]; leads: any[]; tasks: any[]; commissions: any[]; events: any[]; todos: any[]; files: any[]; contentIdeas: any[] } = { sessions: [], leads: [], tasks: [], commissions: [], events: [], todos: [], files: [], contentIdeas: [] };
  const now = () => new Date().toISOString();
  const today = () => new Date().toISOString().slice(0, 10);
  const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
  // Read password dynamically so changes to the env secret take effect without a restart
  const getCrmPw = () => (mem as any).password || process.env.CRM_PASSWORD || "mel2024";

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
  function dbToEvent(r: any) { return { id: r.id, title: r.title||"", type: r.type||"appointment", date: r.date||"", time: r.time||"", endTime: r.end_time||"", leadId: r.lead_id||"", leadName: r.lead_name||"", location: r.location||"", notes: r.notes||"", createdAt: r.created_at||now() }; }
  function dbToTodo(r: any) { return { id: r.id, title: r.title||"", category: r.category||"general", completed: r.completed===1||r.completed===true, dueDate: r.due_date||"", createdAt: r.created_at||now() }; }
  function dbToFile(r: any) { return { id: r.id, name: r.name||"", category: r.category||"other", url: r.url||"", notes: r.notes||"", size: r.size||"", createdAt: r.created_at||now() }; }
  function dbToIdea(r: any) { return { id: r.id, text: r.text||"", topic: r.topic||"", pinned: r.pinned===1||r.pinned===true, createdAt: r.created_at||now() }; }

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
        if (route === "/auth/login" && method === "POST") { const b = await body(req); if (b.password !== getCrmPw()) return errRes(res,"Incorrect password",401); const token = uid()+uid(); mem.sessions.push({ token, expires_at: new Date(Date.now()+30*86400000).toISOString() }); return jsonRes(res,{token}); }
        if (route === "/auth/verify" && method === "GET") { return getAuth(req) ? jsonRes(res,{ok:true}) : errRes(res,"Unauthorized",401); }
        if (route === "/auth/logout" && method === "POST") { const hdr=(req.headers["authorization"]||"").replace("Bearer ","").trim(); mem.sessions=mem.sessions.filter(s=>s.token!==hdr); return jsonRes(res,{ok:true}); }
        if (route === "/auth/password" && method === "POST") { const b=await body(req); if(b.currentPassword!==getCrmPw()) return errRes(res,"Current password is incorrect",401); if(!b.newPassword||b.newPassword.length<4) return errRes(res,"Password too short"); (mem as any).password=b.newPassword; return jsonRes(res,{ok:true}); }

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

        // Events
        if (route === "/events" && method === "GET") return jsonRes(res,[...mem.events].sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.time||"").localeCompare(b.time||"")).map(dbToEvent));
        if (route === "/events" && method === "POST") { const b=await body(req); const r={id:uid(),title:b.title||"",type:b.type||"appointment",date:b.date||"",time:b.time||"",end_time:b.endTime||"",lead_id:b.leadId||"",lead_name:b.leadName||"",location:b.location||"",notes:b.notes||"",created_at:now()}; mem.events.push(r); return jsonRes(res,dbToEvent(r),201); }
        const em=route.match(/^\/events\/([^/]+)$/);
        if (em && method==="PUT") { const id=em[1]; const b=await body(req); const i=mem.events.findIndex((e:any)=>e.id===id); if(i<0) return errRes(res,"Not found",404); const upd:any={title:b.title,type:b.type,date:b.date,time:b.time,end_time:b.endTime,lead_id:b.leadId,lead_name:b.leadName,location:b.location,notes:b.notes}; Object.entries(upd).forEach(([k,v])=>{if(v!==undefined)mem.events[i][k]=v;}); return jsonRes(res,dbToEvent(mem.events[i])); }
        if (em && method==="DELETE") { const id=em[1]; mem.events=mem.events.filter((e:any)=>e.id!==id); return jsonRes(res,{ok:true}); }

        // Todos
        if (route === "/todos" && method === "GET") return jsonRes(res,[...mem.todos].sort((a:any,b:any)=>a.completed-b.completed||b.created_at.localeCompare(a.created_at)).map(dbToTodo));
        if (route === "/todos" && method === "POST") { const b=await body(req); const r={id:uid(),title:b.title||"",category:b.category||"general",completed:0,due_date:b.dueDate||"",created_at:now()}; mem.todos.push(r); return jsonRes(res,dbToTodo(r),201); }
        const tdm=route.match(/^\/todos\/([^/]+)$/);
        if (tdm && method==="PUT") { const id=tdm[1]; const b=await body(req); const i=mem.todos.findIndex((t:any)=>t.id===id); if(i<0) return errRes(res,"Not found",404); const upd:any={title:b.title,category:b.category,completed:b.completed!==undefined?(b.completed?1:0):undefined,due_date:b.dueDate}; Object.entries(upd).forEach(([k,v])=>{if(v!==undefined)mem.todos[i][k]=v;}); return jsonRes(res,dbToTodo(mem.todos[i])); }
        if (tdm && method==="DELETE") { const id=tdm[1]; mem.todos=mem.todos.filter((t:any)=>t.id!==id); return jsonRes(res,{ok:true}); }

        // Files
        if (route === "/files" && method === "GET") return jsonRes(res,[...mem.files].sort((a:any,b:any)=>b.created_at.localeCompare(a.created_at)).map(dbToFile));
        if (route === "/files" && method === "POST") { const b=await body(req); const r={id:uid(),name:b.name||"",category:b.category||"other",url:b.url||"",notes:b.notes||"",size:b.size||"",created_at:now()}; mem.files.push(r); return jsonRes(res,dbToFile(r),201); }
        const fxm=route.match(/^\/files\/([^/]+)$/);
        if (fxm && method==="PUT") { const id=fxm[1]; const b=await body(req); const i=mem.files.findIndex((f:any)=>f.id===id); if(i<0) return errRes(res,"Not found",404); const upd:any={name:b.name,category:b.category,url:b.url,notes:b.notes,size:b.size}; Object.entries(upd).forEach(([k,v])=>{if(v!==undefined)mem.files[i][k]=v;}); return jsonRes(res,dbToFile(mem.files[i])); }
        if (fxm && method==="DELETE") { const id=fxm[1]; mem.files=mem.files.filter((f:any)=>f.id!==id); return jsonRes(res,{ok:true}); }

        // R2 File Manager (dev stubs — no actual R2 in dev)
        if (route === "/r2/status" && method === "GET") return jsonRes(res,{available:false});
        if (route.startsWith("/r2/")) return jsonRes(res,{available:false,folders:[],files:[]});

        // MLS Listings proxy (forward to api-server in dev)
        if (route === "/mls/listings" && method === "GET") {
          try {
            const r = await fetch("http://localhost:3001/listings/idx");
            if (r.ok) { const d = await r.json(); return jsonRes(res, d); }
          } catch {}
          return jsonRes(res,{listings:[],count:0,error:"api-server unavailable in dev"});
        }

        // Content Ideas
        if (route === "/content-ideas" && method === "GET") return jsonRes(res,mem.contentIdeas.filter((c:any)=>c.pinned).sort((a:any,b:any)=>b.created_at.localeCompare(a.created_at)).map(dbToIdea));
        if (route === "/content-ideas" && method === "POST") { const b=await body(req); const r={id:uid(),text:b.text||"",topic:b.topic||"",pinned:1,created_at:now()}; mem.contentIdeas.push(r); return jsonRes(res,dbToIdea(r),201); }
        const idm=route.match(/^\/content-ideas\/([^/]+)$/);
        if (idm && method==="DELETE") { const id=idm[1]; mem.contentIdeas=mem.contentIdeas.filter((c:any)=>c.id!==id); return jsonRes(res,{ok:true}); }

        // AI: Content (dev fallback)
        if (route === "/ai/content" && method === "POST") { const b=await body(req); const tp=b.topic||"Hawaii real estate"; return jsonRes(res,{ideas:[`🏡 Looking to buy in Oahu? The ${tp} market is moving fast. Let's find your dream home before it's gone! DM me today 🤙 #hawaiirealestate #oahurealtor`,`🌺 ${tp} — local expertise makes all the difference. As your Oahu REALTOR®, I'm here every step of the way. Comment "HOME" to get started! #oahuhomes #melcastanares`,`💡 Tip: Understanding Oahu's market takes local knowledge. Let's chat about ${tp} and what it means for your goals! Link in bio 📲 #hawaiirealestate #realestatetips`,`📊 Market update: ${tp} is trending. Whether buying, selling, or just curious — I've got the answers. DM "INFO" for a free consultation! #oahurealtor #dreamhomehawaii`]}); }

        // AI: Chat (dev fallback)
        if (route === "/ai/chat" && method === "POST") { const b=await body(req); const msg=(b.message||"").toLowerCase(); const ctx=b.context||{}; if(msg.includes("lead")||msg.includes("contact")) return jsonRes(res,{message:`You have ${ctx.totalLeads??0} leads, with ${ctx.activeLeadCount??0} active. Active: ${ctx.activeLeads||"none"}. Head to Contacts or Pipeline to manage them!`}); if(msg.includes("task")||msg.includes("overdue")) return jsonRes(res,{message:`Today's tasks: ${ctx.todayTasks||"none"}. Overdue: ${ctx.overdueTasks||"none"}. Check the Tasks page!`}); if(msg.includes("calendar")||msg.includes("event")||msg.includes("schedule")) return jsonRes(res,{message:`Upcoming events: ${ctx.events||"none scheduled"}. Head to the Calendar page to add events!`}); if(msg.includes("instagram")||msg.includes("content")||msg.includes("post")) return jsonRes(res,{message:"Head to the Social page to generate Instagram content ideas! Your best time to post is Saturday at 8am. 🌺 Top hashtags: #hawaiirealestate #oahurealtor"}); return jsonRes(res,{message:"Aloha, Mel! 🌺 I'm your AI assistant. Deploy to Cloudflare with an AI binding for full AI capabilities. In the meantime, ask me about your leads, tasks, or calendar!"}); }

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
