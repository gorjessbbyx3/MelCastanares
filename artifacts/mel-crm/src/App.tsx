import React, { useState, useEffect, useCallback, createContext, useContext } from "react";

class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: string | null }> {
  constructor(props: any) { super(props); this.state = { error: null }; }
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) return (
      <div style={{ minHeight: "100vh", background: "#1a2c24", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ background: "#fff", borderRadius: 12, padding: "32px 28px", maxWidth: 480, width: "100%" }}>
          <h2 style={{ color: "#c0392b", fontFamily: "Cormorant Garamond, serif", marginTop: 0 }}>Something went wrong</h2>
          <pre style={{ fontSize: 12, color: "#555", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>{this.state.error}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: 16, padding: "8px 20px", background: "#1a2c24", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer" }}>Reload</button>
        </div>
      </div>
    );
    return this.props.children;
  }
}
import { QueryClient, QueryClientProvider, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import {
  LayoutDashboard, Users, CheckSquare, DollarSign, Settings, LogOut,
  Plus, Trash2, Edit3, Phone, Mail, Home, MapPin, Calendar, Clock,
  ChevronRight, Search, X, AlertCircle, TrendingUp, Star, Filter,
  BarChart2, Building2, Megaphone, CheckCircle2, Circle, Target,
  ArrowRight, ExternalLink, RefreshCw, Menu, XCircle, Lock,
  Instagram, FolderOpen, ListTodo, MessageSquare
} from "lucide-react";
import { api, type Lead, type Task, type Commission, type Stats } from "./lib/api";
import SocialPage from "./pages/SocialPage";
import CalendarPage from "./pages/CalendarPage";
import TodosPage from "./pages/TodosPage";
import FilesPage from "./pages/FilesPage";
import AIChatPage from "./pages/AIChatPage";
import ListingsHubPage from "./pages/ListingsHubPage";

// ─── BRAND ───────────────────────────────────────────────────────────
const C = {
  sidebar: "var(--sidebar)",
  sidebarHover: "var(--sidebar-hover)",
  sidebarActive: "var(--sidebar-active)",
  gold: "var(--gold)",
  goldLight: "var(--gold-light)",
  teal: "var(--teal)",
  tealLight: "var(--teal-light)",
  cream: "var(--cream)",
  bg: "var(--bg)",
  card: "var(--card)",
  border: "var(--border)",
  text: "var(--text)",
  muted: "var(--muted)",
  dim: "var(--dim)",
  danger: "var(--danger)",
  warn: "var(--warn)",
  success: "var(--success)",
};

// ─── TOAST ───────────────────────────────────────────────────────────
type ToastData = { id: string; msg: string; type: "success" | "error" };
const ToastCtx = createContext<(msg: string, type?: "success" | "error") => void>(() => {});

function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);
  const add = useCallback((msg: string, type: "success" | "error" = "success") => {
    const id = String(Date.now());
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={add}>
      {children}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 500, display: "flex", flexDirection: "column", gap: 8 }}>
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === "success" ? <CheckCircle2 size={14} color={C.gold} /> : <AlertCircle size={14} color="#e74c3c" />}
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
const useToast = () => useContext(ToastCtx);

// ─── AUTH ─────────────────────────────────────────────────────────────
type AuthState = { authed: boolean; loading: boolean };
const AuthCtx = createContext<AuthState & { logout: () => void }>({ authed: false, loading: true, logout: () => {} });

function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ authed: false, loading: true });
  const [, setLoc] = useLocation();
  const toast = useToast();

  useEffect(() => {
    const token = localStorage.getItem("crm_token");
    if (!token) { setState({ authed: false, loading: false }); return; }
    api.verify()
      .then(r => setState({ authed: r.ok, loading: false }))
      .catch(() => setState({ authed: false, loading: false }));
  }, []);

  const logout = useCallback(() => {
    api.logout().catch(() => {});
    localStorage.removeItem("crm_token");
    setState({ authed: false, loading: false });
    setLoc("/login");
    toast("Signed out");
  }, [setLoc, toast]);

  return <AuthCtx.Provider value={{ ...state, logout }}>{children}</AuthCtx.Provider>;
}
const useAuth = () => useContext(AuthCtx);

// ─── HELPERS ──────────────────────────────────────────────────────────
const fmtPrice = (n: number) => n ? "$" + n.toLocaleString() : "—";
const fmtDate = (d: string) => {
  if (!d) return "—";
  const dt = new Date(d + "T00:00:00");
  return dt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};
const fmtRelDate = (d: string) => {
  if (!d) return "";
  const today = new Date(); today.setHours(0,0,0,0);
  const target = new Date(d + "T00:00:00");
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff < 0) return `${Math.abs(diff)}d overdue`;
  if (diff < 7) return `In ${diff} days`;
  return fmtDate(d);
};

const INTENT_LABELS: Record<string, string> = { buy: "Buyer", sell: "Seller", rent: "Renter", invest: "Investor" };
const INTENT_COLORS: Record<string, string> = { buy: "#1e5a8a", sell: "#7a3a1a", rent: "#2a5a3a", invest: "#5a2a7a" };
const INTENT_BG: Record<string, string>    = { buy: "#dbeafe", sell: "#fee3d0", rent: "#d1f5e0", invest: "#ead5f5" };

const STAGE_LABELS: Record<string, string> = { new: "New", contacted: "Contacted", showing: "Showing", contract: "Under Contract", closed: "Closed", lost: "Lost" };
const STAGE_COLORS: Record<string, string> = { new: "#7a6a5a", contacted: "#2a6b4a", showing: "#c9a96e", contract: "#d4851a", closed: "#2a7a4a", lost: "#c0392b" };
const STAGE_BG: Record<string, string>    = { new: "#f0ece6", contacted: "#d1f0e3", showing: "#fdf4e3", contract: "#fde9c8", closed: "#d1f0e1", lost: "#fde0dd" };
const STAGES = ["new", "contacted", "showing", "contract", "closed", "lost"];

const PRIORITY_COLORS: Record<string, string> = { high: "#c0392b", medium: "#d4851a", low: "#2a6b4a" };
const PRIORITY_BG: Record<string, string>    = { high: "#fde0dd", medium: "#fde9c8", low: "#d1f0e3" };

const SOURCE_LABELS: Record<string, string> = { website: "Website", valuation: "Valuation Tool", referral: "Referral", idx: "IDX Listing", "open-house": "Open House", social: "Social Media", other: "Other" };
const TIMELINE_OPTS = ["ASAP", "1–3 months", "3–6 months", "6–12 months", "1 year+"];
const NEIGHBORHOOD_OPTS = ["Kaimuki", "Kahala", "Diamond Head", "Hawaii Kai", "Manoa", "Nuuanu", "Makiki", "Aina Haina", "Waialae-Iki", "Kailua", "Kaneohe", "Mililani", "Ewa Beach", "Kapolei", "North Shore", "Other"];

// ─── BADGE ────────────────────────────────────────────────────────────
function Badge({ label, color, bg }: { label: string; color: string; bg: string }) {
  return <span className="badge" style={{ color, background: bg }}>{label}</span>;
}

// ─── MODAL ────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, width = 520 }: {
  open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number;
}) {
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box slide-in" style={{ maxWidth: width }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, padding: 4 }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function ConfirmDialog({ open, msg, onConfirm, onCancel }: { open: boolean; msg: string; onConfirm: () => void; onCancel: () => void }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-box slide-in" style={{ maxWidth: 360 }}>
        <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
          <AlertCircle size={20} color={C.danger} />
          <p style={{ margin: 0, fontSize: 14, color: C.text }}>{msg}</p>
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button className="crm-btn crm-btn-ghost" onClick={onCancel}>Cancel</button>
          <button className="crm-btn crm-btn-danger" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="form-row">
      <label className="form-label">{label}</label>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// LOGIN PAGE
// ═══════════════════════════════════════════════════════════════════════
function LoginPage() {
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");
  const [, setLoc] = useLocation();
  const { authed } = useAuth();

  const mut = useMutation({
    mutationFn: () => api.login(pw),
    onSuccess: (r) => {
      localStorage.setItem("crm_token", r.token);
      if (r.requiresPasswordSetup) {
        localStorage.setItem("crm_setup_pw", "1");
        window.location.href = (import.meta.env.BASE_URL || "/").replace(/\/$/, "") + "/settings";
      } else {
        window.location.href = import.meta.env.BASE_URL || "/";
      }
    },
    onError: () => { setError("Incorrect password. Please try again."); setPw(""); },
  });

  useEffect(() => { if (authed) setLoc("/"); }, [authed, setLoc]);

  return (
    <div style={{ minHeight: "100vh", background: "#1a2c24", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div className="slide-in" style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: "100%", maxWidth: 380, boxShadow: "0 24px 64px rgba(0,0,0,0.25)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ width: 56, height: 56, background: "#1a2c24", borderRadius: 14, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
            <Home size={24} color="#c9a96e" />
          </div>
          <h1 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: 26, color: "#2c2218", margin: "0 0 4px" }}>Mel's CRM</h1>
          <p style={{ fontSize: 13, color: "#7a6a5a", margin: 0 }}>Dream Home Realty Hawai'i · Private Dashboard</p>
        </div>
        <form onSubmit={e => { e.preventDefault(); mut.mutate(); }}>
          <div style={{ marginBottom: 16 }}>
            <input className="crm-input" type="password" placeholder="Enter password (leave blank if first time)" value={pw} onChange={e => { setPw(e.target.value); setError(""); }} autoFocus />
            {error && <p style={{ fontSize: 12, color: "#c0392b", marginTop: 6, marginBottom: 0 }}>{error}</p>}
          </div>
          <button type="submit" className="crm-btn crm-btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={mut.isPending}>
            {mut.isPending ? "Signing in…" : "Sign In"}
          </button>
        </form>
        <p style={{ textAlign: "center", fontSize: 11, color: "#a89880", marginTop: 20, marginBottom: 0 }}>First time? Leave the field blank and click Sign In to set your password.</p>
        <p style={{ textAlign: "center", fontSize: 11, color: "#a89880", marginTop: 8, marginBottom: 0 }}>melcastanares.techsavvyhawaii.com · RS-84753</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SIDEBAR / SHELL
// ═══════════════════════════════════════════════════════════════════════
const NAV = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pipeline", label: "Pipeline", icon: Target },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/tasks", label: "Tasks", icon: CheckSquare },
  { href: "/commissions", label: "Commissions", icon: DollarSign },
  { section: "Tools" },
  { href: "/social", label: "Social", icon: Instagram },
  { href: "/calendar", label: "Calendar", icon: Calendar },
  { href: "/listings", label: "Listings Hub", icon: Building2 },
  { href: "/todos", label: "Todos", icon: ListTodo },
  { href: "/files", label: "Files", icon: FolderOpen },
  { href: "/ai-chat", label: "AI Chat", icon: MessageSquare },
  { section: "Account" },
  { href: "/settings", label: "Settings", icon: Settings },
];

function Sidebar({ mobile, onClose }: { mobile?: boolean; onClose?: () => void }) {
  const [loc] = useLocation();
  const { logout } = useAuth();

  return (
    <div style={{ width: "100%", background: "#1a2c24", height: "100%", display: "flex", flexDirection: "column", padding: "20px 0" }}>
      <div style={{ padding: "0 20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, background: "rgba(201,169,110,0.15)", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Home size={18} color="#c9a96e" />
          </div>
          <div>
            <div style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: 15, color: "#fff", fontWeight: 600, lineHeight: 1.2 }}>Mel Castanares</div>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.05em" }}>REALTOR® RS-84753</div>
          </div>
          {mobile && onClose && (
            <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)", padding: 4 }}><X size={18} /></button>
          )}
        </div>
      </div>
      <nav style={{ flex: 1, padding: "12px 10px", overflowY: "auto" }}>
        {NAV.map((item, i) => {
          if ("section" in item) {
            return <div key={i} style={{ fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: "rgba(255,255,255,0.25)", padding: "12px 12px 4px", marginTop: 4 }}>{item.section}</div>;
          }
          const { href, label, icon: Icon } = item as { href: string; label: string; icon: React.ComponentType<{ size: number; color?: string }> };
          const active = href === "/" ? loc === "/" : loc.startsWith(href);
          return (
            <Link key={href} href={href} onClick={onClose}>
              <a style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 8, marginBottom: 2, cursor: "pointer", textDecoration: "none", background: active ? "#2e5040" : "transparent", color: active ? "#fff" : "rgba(255,255,255,0.55)", fontSize: 13, fontWeight: active ? 600 : 400, transition: "background 0.15s, color 0.15s" }}>
                <Icon size={16} color={active ? "#c9a96e" : undefined} />{label}
                {active && <ChevronRight size={12} style={{ marginLeft: "auto", color: "#c9a96e" }} />}
              </a>
            </Link>
          );
        })}
      </nav>
      <div style={{ padding: "12px 10px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <a href="https://melcastanares.techsavvyhawaii.com" target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, color: "rgba(255,255,255,0.4)", fontSize: 12, textDecoration: "none" }}>
          <ExternalLink size={13} />Website
        </a>
        <button onClick={logout} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "8px 12px", borderRadius: 8, background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
          <LogOut size={15} />Sign Out
        </button>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  const [loc] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pageTitle = (NAV.filter(n => "href" in n) as { href: string; label: string; icon: React.ComponentType<{ size: number }> }[]).find(n => n.href === "/" ? loc === "/" : loc.startsWith(n.href))?.label ?? "Dashboard";

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <div style={{ display: "none", flexShrink: 0, width: 220 }} className="lg-sidebar">
        <Sidebar />
      </div>
      {mobileOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 300, display: "flex" }}>
          <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} onClick={() => setMobileOpen(false)} />
          <div style={{ position: "relative", width: 240, zIndex: 1 }}><Sidebar mobile onClose={() => setMobileOpen(false)} /></div>
        </div>
      )}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <div style={{ background: "#fff", borderBottom: "1px solid #e8e0d4", padding: "0 20px", height: 56, display: "flex", alignItems: "center", gap: 14, flexShrink: 0 }}>
          <button onClick={() => setMobileOpen(true)} style={{ background: "none", border: "none", cursor: "pointer", color: "#7a6a5a", padding: 4, display: "flex" }}><Menu size={20} /></button>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#2c2218" }}>{pageTitle}</h2>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#1a2c24", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#c9a96e" }}>M</span>
            </div>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 24 }}>{children}</div>
      </div>
      <style>{`@media (min-width: 900px) { .lg-sidebar { display: flex !important; } }`}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════
function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

function TaskTypeIcon({ type }: { type: string }) {
  const map: Record<string, React.ReactNode> = { "follow-up": <Mail size={14} color="#2a6b4a" />, showing: <Home size={14} color="#1e5a8a" />, call: <Phone size={14} color="#d4851a" />, paperwork: <Building2 size={14} color="#5a2a7a" />, "open-house": <Megaphone size={14} color="#c9a96e" />, other: <Circle size={14} color="#7a6a5a" /> };
  return <span style={{ flexShrink: 0 }}>{map[type] ?? map.other}</span>;
}

function DashboardPage() {
  const { data: stats } = useQuery<Stats>({ queryKey: ["stats"], queryFn: api.stats });
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ["tasks"], queryFn: api.getTasks });
  const { data: leads = [] } = useQuery<Lead[]>({ queryKey: ["leads"], queryFn: api.getLeads });

  const today = new Date().toISOString().slice(0, 10);
  const todayTasks = tasks.filter(t => !t.completed && t.dueDate === today);
  const recentLeads = [...leads].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5);

  const statCards = [
    { label: "Total Leads", value: String(stats?.totalLeads ?? leads.length), sub: `${stats?.activeLeads ?? 0} active`, icon: Users, color: "#2a6b4a" },
    { label: "Due Today", value: String(stats?.tasksDueToday ?? todayTasks.length), sub: "tasks", icon: Clock, color: "#d4851a" },
    { label: "In Pipeline", value: String(stats?.activeLeads ?? leads.filter(l => !["closed","lost"].includes(l.status)).length), sub: "active deals", icon: Target, color: "#1e5a8a" },
    { label: "Commissions YTD", value: "$" + (stats?.totalCommissionYTD ?? 0).toLocaleString(), sub: `${stats?.closedCommissions ?? 0} closed`, icon: DollarSign, color: "#2a7a4a" },
  ];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 className="section-title">Good {getTimeOfDay()}, Mel</h1>
        <p className="section-sub">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</p>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
        {statCards.map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div><div className="stat-label">{s.label}</div><div className="stat-value" style={{ color: s.color }}>{s.value}</div><div className="stat-sub">{s.sub}</div></div>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}><s.icon size={18} color={s.color} /></div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        <div className="card">
          <div style={{ padding: "16px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><CheckSquare size={16} color="#2a6b4a" /><span style={{ fontSize: 14, fontWeight: 600 }}>Today's Tasks</span></div>
            <Link href="/tasks"><a style={{ fontSize: 12, color: "#2a6b4a", textDecoration: "none" }}>View all</a></Link>
          </div>
          <div>
            {todayTasks.length === 0 ? (
              <div style={{ padding: "24px 18px", textAlign: "center", color: "#a89880", fontSize: 13 }}>
                <CheckCircle2 size={24} color="#2a7a4a" style={{ marginBottom: 8, opacity: 0.6 }} /><div>All caught up!</div>
              </div>
            ) : todayTasks.slice(0, 6).map(task => (
              <div key={task.id} style={{ padding: "12px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 10 }}>
                <TaskTypeIcon type={task.type} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</div>
                  {task.leadName && <div style={{ fontSize: 11, color: "#7a6a5a" }}>{task.leadName}</div>}
                </div>
                {task.dueTime && <span style={{ fontSize: 11, color: "#a89880" }}>{task.dueTime}</span>}
                <Badge label={task.priority} color={PRIORITY_COLORS[task.priority]} bg={PRIORITY_BG[task.priority]} />
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <div style={{ padding: "16px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Users size={16} color="#2a6b4a" /><span style={{ fontSize: 14, fontWeight: 600 }}>Recent Leads</span></div>
            <Link href="/contacts"><a style={{ fontSize: 12, color: "#2a6b4a", textDecoration: "none" }}>View all</a></Link>
          </div>
          <div>
            {recentLeads.length === 0 ? (
              <div style={{ padding: "24px 18px", textAlign: "center", color: "#a89880", fontSize: 13 }}>
                <Users size={24} style={{ marginBottom: 8, opacity: 0.4 }} /><div>No leads yet</div>
              </div>
            ) : recentLeads.map(lead => (
              <div key={lead.id} style={{ padding: "12px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#f5efe7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#2a6b4a", flexShrink: 0 }}>{lead.name.charAt(0).toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{lead.name}</div>
                  <div style={{ fontSize: 11, color: "#7a6a5a" }}>{lead.email}</div>
                </div>
                <Badge label={STAGE_LABELS[lead.status]} color={STAGE_COLORS[lead.status]} bg={STAGE_BG[lead.status]} />
              </div>
            ))}
          </div>
        </div>
      </div>
      {leads.length > 0 && (
        <div className="card" style={{ marginTop: 20 }}>
          <div style={{ padding: "16px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 8 }}><BarChart2 size={16} color="#2a6b4a" /><span style={{ fontSize: 14, fontWeight: 600 }}>Pipeline Overview</span></div>
          <div style={{ padding: "18px 20px" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {STAGES.filter(s => s !== "lost").map(stage => {
                const count = leads.filter(l => l.status === stage).length;
                return (
                  <Link key={stage} href={`/pipeline`}>
                    <a style={{ textDecoration: "none" }}>
                      <div style={{ background: STAGE_BG[stage], borderRadius: 8, padding: "10px 16px", cursor: "pointer" }}>
                        <div style={{ fontSize: 20, fontWeight: 700, color: STAGE_COLORS[stage] }}>{count}</div>
                        <div style={{ fontSize: 11, color: "#7a6a5a", marginTop: 2 }}>{STAGE_LABELS[stage]}</div>
                      </div>
                    </a>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// LEAD FORM
// ═══════════════════════════════════════════════════════════════════════
const EMPTY_LEAD: Partial<Lead> = {
  name: "", email: "", phone: "", intent: "buy", status: "new", source: "website",
  priceMin: 0, priceMax: 0, neighborhoods: "", bedsMin: 0, bathsMin: 0,
  preApproval: "unknown", preApprovalAmount: 0, timeline: "",
  propertyAddress: "", estimatedValue: 0, notes: "", nextStep: "", nextStepDate: "",
};

function LeadForm({ lead, onSave, onCancel, saving }: { lead: Partial<Lead>; onSave: (d: Partial<Lead>) => void; onCancel: () => void; saving?: boolean }) {
  const [form, setForm] = useState<Partial<Lead>>({ ...EMPTY_LEAD, ...lead });
  const upd = (k: keyof Lead, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const isSeller = form.intent === "sell";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Full Name *"><input className="crm-input" value={form.name} onChange={e => upd("name", e.target.value)} placeholder="Jane Smith" /></Field>
        <Field label="Phone"><input className="crm-input" type="tel" value={form.phone} onChange={e => upd("phone", e.target.value)} placeholder="(808) 000-0000" /></Field>
      </div>
      <Field label="Email"><input className="crm-input" type="email" value={form.email} onChange={e => upd("email", e.target.value)} placeholder="jane@email.com" /></Field>
      <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr 1fr" }}>
        <Field label="Intent"><select className="crm-input" value={form.intent} onChange={e => upd("intent", e.target.value)}>{Object.entries(INTENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
        <Field label="Stage"><select className="crm-input" value={form.status} onChange={e => upd("status", e.target.value)}>{STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}</select></Field>
        <Field label="Source"><select className="crm-input" value={form.source} onChange={e => upd("source", e.target.value)}>{Object.entries(SOURCE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></Field>
      </div>
      {isSeller ? (<>
        <Field label="Property Address"><input className="crm-input" value={form.propertyAddress} onChange={e => upd("propertyAddress", e.target.value)} placeholder="123 Kaimuki Ave, Honolulu, HI" /></Field>
        <Field label="Estimated Value ($)"><input className="crm-input" type="number" value={form.estimatedValue || ""} onChange={e => upd("estimatedValue", Number(e.target.value))} placeholder="750000" /></Field>
      </>) : (<>
        <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <Field label="Price Min ($)"><input className="crm-input" type="number" value={form.priceMin || ""} onChange={e => upd("priceMin", Number(e.target.value))} placeholder="500000" /></Field>
          <Field label="Price Max ($)"><input className="crm-input" type="number" value={form.priceMax || ""} onChange={e => upd("priceMax", Number(e.target.value))} placeholder="900000" /></Field>
        </div>
        <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <Field label="Beds (min)"><input className="crm-input" type="number" value={form.bedsMin || ""} onChange={e => upd("bedsMin", Number(e.target.value))} placeholder="3" /></Field>
          <Field label="Baths (min)"><input className="crm-input" type="number" step="0.5" value={form.bathsMin || ""} onChange={e => upd("bathsMin", Number(e.target.value))} placeholder="2" /></Field>
        </div>
        <Field label="Neighborhoods"><select className="crm-input" value={form.neighborhoods} onChange={e => upd("neighborhoods", e.target.value)}><option value="">Select…</option>{NEIGHBORHOOD_OPTS.map(n => <option key={n} value={n}>{n}</option>)}</select></Field>
        <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
          <Field label="Pre-approval"><select className="crm-input" value={form.preApproval} onChange={e => upd("preApproval", e.target.value)}><option value="unknown">Unknown</option><option value="none">Not started</option><option value="pending">In progress</option><option value="approved">Approved</option></select></Field>
          <Field label="Pre-approval Amount"><input className="crm-input" type="number" value={form.preApprovalAmount || ""} onChange={e => upd("preApprovalAmount", Number(e.target.value))} placeholder="750000" /></Field>
        </div>
      </>)}
      <Field label="Timeline"><select className="crm-input" value={form.timeline} onChange={e => upd("timeline", e.target.value)}><option value="">Select…</option>{TIMELINE_OPTS.map(t => <option key={t} value={t}>{t}</option>)}</select></Field>
      <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Next Step"><input className="crm-input" value={form.nextStep} onChange={e => upd("nextStep", e.target.value)} placeholder="Schedule showing" /></Field>
        <Field label="Next Step Date"><input className="crm-input" type="date" value={form.nextStepDate} onChange={e => upd("nextStepDate", e.target.value)} /></Field>
      </div>
      <Field label="Notes"><textarea className="crm-input" rows={3} value={form.notes} onChange={e => upd("notes", e.target.value)} placeholder="Additional notes…" style={{ resize: "vertical" }} /></Field>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", paddingTop: 4 }}>
        <button className="crm-btn crm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="crm-btn crm-btn-primary" onClick={() => onSave(form)} disabled={!form.name || saving}>{saving ? "Saving…" : "Save Lead"}</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PIPELINE PAGE
// ═══════════════════════════════════════════════════════════════════════
function PipelinePage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: leads = [], isLoading } = useQuery<Lead[]>({ queryKey: ["leads"], queryFn: api.getLeads });
  const [activeStage, setActiveStage] = useState("all");
  const [search, setSearch] = useState("");

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Lead> }) => api.updateLead(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["leads"] }),
    onError: () => toast("Failed to update", "error"),
  });

  const filtered = leads.filter(l => {
    const matchStage = activeStage === "all" || l.status === activeStage;
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase());
    return matchStage && matchSearch;
  });

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 className="section-title">Pipeline</h1>
        <p className="section-sub">Track leads through your real estate pipeline</p>
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {[{ key: "all", label: "All" }, ...STAGES.map(s => ({ key: s, label: STAGE_LABELS[s] }))].map(({ key, label }) => {
          const count = key === "all" ? leads.length : leads.filter(l => l.status === key).length;
          const active = activeStage === key;
          return (
            <button key={key} onClick={() => setActiveStage(key)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 13, fontWeight: active ? 600 : 400, cursor: "pointer", background: active ? (STAGE_BG[key] || "#d1f0e3") : "#fff", color: active ? (STAGE_COLORS[key] || "#2a6b4a") : "#7a6a5a", border: `1px solid ${active ? (STAGE_COLORS[key] || "#2a6b4a") : "#e8e0d4"}` }}>
              {label} <span style={{ opacity: 0.7 }}>({count})</span>
            </button>
          );
        })}
      </div>
      <div style={{ position: "relative", marginBottom: 16, maxWidth: 320 }}>
        <Search size={14} color="#a89880" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
        <input className="crm-input" style={{ paddingLeft: 32 }} placeholder="Search leads…" value={search} onChange={e => setSearch(e.target.value)} />
        {search && <button onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#a89880" }}><X size={14} /></button>}
      </div>
      {isLoading ? <div style={{ textAlign: "center", padding: "60px 20px", color: "#a89880" }}>Loading…</div> : (
        <div className="card">
          {filtered.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "#a89880" }}><Target size={32} style={{ marginBottom: 12, opacity: 0.3 }} /><div style={{ fontSize: 14 }}>No leads in this stage</div></div>
          ) : filtered.map(lead => <PipelineRow key={lead.id} lead={lead} onStageChange={(status) => updateMut.mutate({ id: lead.id, data: { status } })} />)}
        </div>
      )}
    </div>
  );
}

function PipelineRow({ lead, onStageChange }: { lead: Lead; onStageChange: (s: string) => void }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const updateMut = useMutation({
    mutationFn: (data: Partial<Lead>) => api.updateLead(lead.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); setEditing(false); toast("Lead updated"); },
    onError: () => toast("Failed to save", "error"),
  });
  const deleteMut = useMutation({
    mutationFn: () => api.deleteLead(lead.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); toast("Lead deleted"); },
  });
  return (<>
    <div style={{ padding: "14px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 14 }}>
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f5efe7", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#2a6b4a", flexShrink: 0 }}>{lead.name.charAt(0).toUpperCase()}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>{lead.name}</span>
          <Badge label={INTENT_LABELS[lead.intent]} color={INTENT_COLORS[lead.intent]} bg={INTENT_BG[lead.intent]} />
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 3, flexWrap: "wrap" }}>
          {lead.email && <span style={{ fontSize: 12, color: "#7a6a5a" }}>{lead.email}</span>}
          {lead.phone && <span style={{ fontSize: 12, color: "#7a6a5a" }}>{lead.phone}</span>}
          {lead.intent !== "sell" && lead.priceMax ? <span style={{ fontSize: 12, color: "#7a6a5a" }}>{fmtPrice(lead.priceMin)} – {fmtPrice(lead.priceMax)}</span> : null}
          {lead.intent === "sell" && lead.propertyAddress ? <span style={{ fontSize: 12, color: "#7a6a5a" }}>{lead.propertyAddress}</span> : null}
        </div>
        {lead.nextStep && <div style={{ fontSize: 12, color: "#2a6b4a", marginTop: 4 }}>→ {lead.nextStep}{lead.nextStepDate ? ` · ${fmtDate(lead.nextStepDate)}` : ""}</div>}
      </div>
      <select className="crm-input" style={{ width: 140, fontSize: 12 }} value={lead.status} onChange={e => onStageChange(e.target.value)}>
        {STAGES.map(s => <option key={s} value={s}>{STAGE_LABELS[s]}</option>)}
      </select>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        {lead.phone && <a href={`tel:${lead.phone}`} style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #e8e0d4", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}><Phone size={13} color="#2a6b4a" /></a>}
        <button style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a6a5a" }} onClick={() => setEditing(true)}><Edit3 size={13} /></button>
        <button style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c0392b" }} onClick={() => setDelConfirm(true)}><Trash2 size={13} /></button>
      </div>
    </div>
    <Modal open={editing} onClose={() => setEditing(false)} title="Edit Lead" width={580}><LeadForm lead={lead} onSave={data => updateMut.mutate(data)} onCancel={() => setEditing(false)} saving={updateMut.isPending} /></Modal>
    <ConfirmDialog open={delConfirm} msg={`Delete ${lead.name}?`} onConfirm={() => deleteMut.mutate()} onCancel={() => setDelConfirm(false)} />
  </>);
}

// ═══════════════════════════════════════════════════════════════════════
// CONTACTS PAGE
// ═══════════════════════════════════════════════════════════════════════
function ContactsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: leads = [], isLoading } = useQuery<Lead[]>({ queryKey: ["leads"], queryFn: api.getLeads });
  const [showAdd, setShowAdd] = useState(false);
  const [search, setSearch] = useState("");
  const [filterIntent, setFilterIntent] = useState("all");

  const createMut = useMutation({
    mutationFn: (data: Partial<Lead>) => api.createLead(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); qc.invalidateQueries({ queryKey: ["stats"] }); setShowAdd(false); toast("Lead added!"); },
    onError: () => toast("Failed to add lead", "error"),
  });

  const filtered = leads.filter(l => {
    const matchIntent = filterIntent === "all" || l.intent === filterIntent;
    const matchSearch = !search || l.name.toLowerCase().includes(search.toLowerCase()) || l.email.toLowerCase().includes(search.toLowerCase()) || (l.phone || "").includes(search);
    return matchIntent && matchSearch;
  });

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div><h1 className="section-title">Contacts</h1><p className="section-sub">{leads.length} total leads</p></div>
        <button className="crm-btn crm-btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} />Add Lead</button>
      </div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <Search size={14} color="#a89880" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input className="crm-input" style={{ paddingLeft: 32, width: 260 }} placeholder="Search by name, email, phone…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="crm-input" style={{ width: 140 }} value={filterIntent} onChange={e => setFilterIntent(e.target.value)}>
          <option value="all">All types</option>
          {Object.entries(INTENT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>
      {isLoading ? <div style={{ textAlign: "center", padding: "60px 20px", color: "#a89880" }}>Loading contacts…</div> : (
        <div className="card">
          {filtered.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "#a89880" }}>
              <Users size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ marginBottom: 16 }}>{search ? "No results found" : "No contacts yet. Add your first lead!"}</div>
              {!search && <button className="crm-btn crm-btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} />Add First Lead</button>}
            </div>
          ) : filtered.map(lead => <ContactRow key={lead.id} lead={lead} />)}
        </div>
      )}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add New Lead" width={580}>
        <LeadForm lead={EMPTY_LEAD} onSave={data => createMut.mutate(data)} onCancel={() => setShowAdd(false)} saving={createMut.isPending} />
      </Modal>
    </div>
  );
}

function ContactRow({ lead }: { lead: Lead }) {
  const qc = useQueryClient();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);
  const updateMut = useMutation({
    mutationFn: (data: Partial<Lead>) => api.updateLead(lead.id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); setEditing(false); toast("Saved"); },
    onError: () => toast("Failed to save", "error"),
  });
  const deleteMut = useMutation({
    mutationFn: () => api.deleteLead(lead.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["leads"] }); qc.invalidateQueries({ queryKey: ["stats"] }); toast("Deleted"); },
  });
  return (<>
    <div style={{ borderBottom: "1px solid #e8e0d4" }}>
      <div style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }} onClick={() => setExpanded(e => !e)}>
        <div style={{ width: 38, height: 38, borderRadius: "50%", background: INTENT_BG[lead.intent], display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: INTENT_COLORS[lead.intent], flexShrink: 0 }}>{lead.name.charAt(0).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>{lead.name}</span>
            <Badge label={INTENT_LABELS[lead.intent]} color={INTENT_COLORS[lead.intent]} bg={INTENT_BG[lead.intent]} />
            <Badge label={STAGE_LABELS[lead.status]} color={STAGE_COLORS[lead.status]} bg={STAGE_BG[lead.status]} />
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 3 }}>
            {lead.email && <span style={{ fontSize: 12, color: "#7a6a5a" }}>{lead.email}</span>}
            {lead.phone && <span style={{ fontSize: 12, color: "#7a6a5a" }}>{lead.phone}</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 11, color: "#a89880" }}>{new Date(lead.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <ChevronRight size={14} color="#7a6a5a" style={{ transform: expanded ? "rotate(90deg)" : "none", transition: "transform 0.15s" }} />
        </div>
      </div>
      {expanded && (
        <div style={{ padding: "0 18px 18px", borderTop: "1px solid #e8e0d4", background: "#fdfaf6" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 12, padding: "14px 0" }}>
            {lead.intent !== "sell" && (lead.priceMin || lead.priceMax) ? <div><div style={{ fontSize: 11, color: "#7a6a5a", marginBottom: 2 }}>Budget</div><div style={{ fontSize: 13, fontWeight: 500 }}>{fmtPrice(lead.priceMin)} – {fmtPrice(lead.priceMax)}</div></div> : null}
            {lead.intent === "sell" && lead.propertyAddress ? <div><div style={{ fontSize: 11, color: "#7a6a5a", marginBottom: 2 }}>Property</div><div style={{ fontSize: 13, fontWeight: 500 }}>{lead.propertyAddress}</div></div> : null}
            {lead.intent === "sell" && lead.estimatedValue ? <div><div style={{ fontSize: 11, color: "#7a6a5a", marginBottom: 2 }}>Est. Value</div><div style={{ fontSize: 13, fontWeight: 500 }}>{fmtPrice(lead.estimatedValue)}</div></div> : null}
            {lead.intent !== "sell" && lead.bedsMin ? <div><div style={{ fontSize: 11, color: "#7a6a5a", marginBottom: 2 }}>Beds</div><div style={{ fontSize: 13, fontWeight: 500 }}>{lead.bedsMin}+ bd</div></div> : null}
            {lead.neighborhoods ? <div><div style={{ fontSize: 11, color: "#7a6a5a", marginBottom: 2 }}>Neighborhood</div><div style={{ fontSize: 13, fontWeight: 500 }}>{lead.neighborhoods}</div></div> : null}
            {lead.timeline ? <div><div style={{ fontSize: 11, color: "#7a6a5a", marginBottom: 2 }}>Timeline</div><div style={{ fontSize: 13, fontWeight: 500 }}>{lead.timeline}</div></div> : null}
            {lead.source ? <div><div style={{ fontSize: 11, color: "#7a6a5a", marginBottom: 2 }}>Source</div><div style={{ fontSize: 13, fontWeight: 500 }}>{SOURCE_LABELS[lead.source] || lead.source}</div></div> : null}
          </div>
          {lead.notes && <div style={{ fontSize: 13, color: "#2c2218", background: "#fff", borderRadius: 6, padding: "10px 12px", marginBottom: 10, borderLeft: "3px solid #c9a96e" }}>{lead.notes}</div>}
          {lead.nextStep && <div style={{ fontSize: 13, color: "#2a6b4a", marginBottom: 12 }}>→ <strong>Next step:</strong> {lead.nextStep}{lead.nextStepDate ? ` · ${fmtDate(lead.nextStepDate)}` : ""}</div>}
          <div style={{ display: "flex", gap: 8 }}>
            {lead.email && <a href={`mailto:${lead.email}`} className="crm-btn crm-btn-ghost crm-btn-sm" style={{ textDecoration: "none" }}><Mail size={13} />Email</a>}
            {lead.phone && <a href={`tel:${lead.phone}`} className="crm-btn crm-btn-ghost crm-btn-sm" style={{ textDecoration: "none" }}><Phone size={13} />Call</a>}
            <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => setEditing(true)}><Edit3 size={13} />Edit</button>
            <button className="crm-btn crm-btn-sm" style={{ background: "#fde0dd", color: "#c0392b", border: "none" }} onClick={() => setDelConfirm(true)}><Trash2 size={13} />Delete</button>
          </div>
        </div>
      )}
    </div>
    <Modal open={editing} onClose={() => setEditing(false)} title="Edit Contact" width={580}><LeadForm lead={lead} onSave={data => updateMut.mutate(data)} onCancel={() => setEditing(false)} saving={updateMut.isPending} /></Modal>
    <ConfirmDialog open={delConfirm} msg={`Delete ${lead.name}?`} onConfirm={() => deleteMut.mutate()} onCancel={() => setDelConfirm(false)} />
  </>);
}

// ═══════════════════════════════════════════════════════════════════════
// TASKS PAGE
// ═══════════════════════════════════════════════════════════════════════
const EMPTY_TASK: Partial<Task> = { title: "", type: "follow-up", leadId: "", leadName: "", dueDate: new Date().toISOString().slice(0, 10), dueTime: "", priority: "medium", notes: "" };

function TasksPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: tasks = [], isLoading } = useQuery<Task[]>({ queryKey: ["tasks"], queryFn: api.getTasks });
  const { data: leads = [] } = useQuery<Lead[]>({ queryKey: ["leads"], queryFn: api.getLeads });
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Task | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const createMut = useMutation({ mutationFn: (d: Partial<Task>) => api.createTask(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["stats"] }); setShowAdd(false); toast("Task added"); }, onError: () => toast("Failed to add task", "error") });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<Task> }) => api.updateTask(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); qc.invalidateQueries({ queryKey: ["stats"] }); setEditing(null); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => api.deleteTask(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast("Task deleted"); } });

  const visible = tasks.filter(t => showCompleted ? true : !t.completed);
  const today = new Date().toISOString().slice(0, 10);
  const groups: Record<string, Task[]> = {};
  visible.forEach(t => {
    const label = t.completed ? "Completed" : !t.dueDate ? "No date" : t.dueDate < today ? "Overdue" : t.dueDate === today ? "Today" : fmtRelDate(t.dueDate) === "Tomorrow" ? "Tomorrow" : "Upcoming";
    if (!groups[label]) groups[label] = [];
    groups[label].push(t);
  });
  const groupOrder = ["Overdue", "Today", "Tomorrow", "Upcoming", "No date", "Completed"];

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div><h1 className="section-title">Tasks</h1><p className="section-sub">{tasks.filter(t => !t.completed).length} pending · {tasks.filter(t => t.completed).length} completed</p></div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="crm-btn crm-btn-ghost" onClick={() => setShowCompleted(s => !s)} style={{ fontSize: 12 }}>{showCompleted ? "Hide" : "Show"} Completed</button>
          <button className="crm-btn crm-btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} />Add Task</button>
        </div>
      </div>
      {isLoading ? <div style={{ textAlign: "center", padding: 60, color: "#a89880" }}>Loading…</div> : visible.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "#a89880" }}>
          <CheckCircle2 size={36} color="#2a7a4a" style={{ marginBottom: 12, opacity: 0.5 }} />
          <div style={{ marginBottom: 16 }}>No pending tasks — great work!</div>
          <button className="crm-btn crm-btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} />Add Task</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {groupOrder.filter(g => groups[g]).map(group => (
            <div key={group}>
              <div style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: group === "Overdue" ? "#c0392b" : group === "Today" ? "#2a6b4a" : "#7a6a5a", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                {group === "Overdue" && <AlertCircle size={13} />}{group} ({groups[group].length})
              </div>
              <div className="card">
                {groups[group].map(task => (
                  <div key={task.id} style={{ padding: "12px 16px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 12 }}>
                    <button onClick={() => updateMut.mutate({ id: task.id, data: { completed: !task.completed } })} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0, color: task.completed ? "#2a7a4a" : "#a89880" }}>{task.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}</button>
                    <TaskTypeIcon type={task.type} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: task.completed ? 400 : 500, textDecoration: task.completed ? "line-through" : "none", color: task.completed ? "#a89880" : "#2c2218" }}>{task.title}</div>
                      <div style={{ display: "flex", gap: 10, marginTop: 2, fontSize: 11, color: "#7a6a5a" }}>
                        {task.leadName && <span>{task.leadName}</span>}
                        {task.dueTime && <span>{task.dueTime}</span>}
                        {task.notes && <span style={{ fontStyle: "italic" }}>{task.notes.slice(0, 40)}{task.notes.length > 40 ? "…" : ""}</span>}
                      </div>
                    </div>
                    <Badge label={task.priority} color={PRIORITY_COLORS[task.priority]} bg={PRIORITY_BG[task.priority]} />
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a6a5a" }} onClick={() => setEditing(task)}><Edit3 size={12} /></button>
                      <button style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c0392b" }} onClick={() => deleteMut.mutate(task.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Task"><TaskForm task={EMPTY_TASK} leads={leads} onSave={d => createMut.mutate(d)} onCancel={() => setShowAdd(false)} saving={createMut.isPending} /></Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Task">{editing && <TaskForm task={editing} leads={leads} onSave={d => updateMut.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} saving={updateMut.isPending} />}</Modal>
    </div>
  );
}

function TaskForm({ task, leads, onSave, onCancel, saving }: { task: Partial<Task>; leads: Lead[]; onSave: (d: Partial<Task>) => void; onCancel: () => void; saving?: boolean }) {
  const [form, setForm] = useState<Partial<Task>>({ ...EMPTY_TASK, ...task });
  const upd = (k: keyof Task, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  const handleLeadChange = (id: string) => { const lead = leads.find(l => l.id === id); setForm(f => ({ ...f, leadId: id, leadName: lead?.name || "" })); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Task Title *"><input className="crm-input" value={form.title} onChange={e => upd("title", e.target.value)} placeholder="e.g. Schedule showing at 123 Kaimuki Ave" autoFocus /></Field>
      <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Type"><select className="crm-input" value={form.type} onChange={e => upd("type", e.target.value)}><option value="follow-up">Follow-up</option><option value="showing">Showing</option><option value="call">Call</option><option value="paperwork">Paperwork</option><option value="open-house">Open House</option><option value="other">Other</option></select></Field>
        <Field label="Priority"><select className="crm-input" value={form.priority} onChange={e => upd("priority", e.target.value)}><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select></Field>
      </div>
      <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Due Date"><input className="crm-input" type="date" value={form.dueDate} onChange={e => upd("dueDate", e.target.value)} /></Field>
        <Field label="Time"><input className="crm-input" type="time" value={form.dueTime} onChange={e => upd("dueTime", e.target.value)} /></Field>
      </div>
      <Field label="Linked Lead"><select className="crm-input" value={form.leadId || ""} onChange={e => handleLeadChange(e.target.value)}><option value="">None</option>{leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
      <Field label="Notes"><textarea className="crm-input" rows={2} value={form.notes} onChange={e => upd("notes", e.target.value)} placeholder="Optional notes…" style={{ resize: "vertical" }} /></Field>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="crm-btn crm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="crm-btn crm-btn-primary" onClick={() => onSave(form)} disabled={!form.title || saving}>{saving ? "Saving…" : "Save Task"}</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COMMISSIONS PAGE
// ═══════════════════════════════════════════════════════════════════════
const EMPTY_COMM: Partial<Commission> = { leadId: "", clientName: "", propertyAddress: "", salePrice: 0, commissionRate: 3, commissionAmount: 0, status: "pending", closeDate: "", notes: "" };

function CommissionsPage() {
  const qc = useQueryClient();
  const toast = useToast();
  const { data: commissions = [], isLoading } = useQuery<Commission[]>({ queryKey: ["commissions"], queryFn: api.getCommissions });
  const { data: leads = [] } = useQuery<Lead[]>({ queryKey: ["leads"], queryFn: api.getLeads });
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Commission | null>(null);
  const [delConfirm, setDelConfirm] = useState<string | null>(null);

  const createMut = useMutation({ mutationFn: (d: Partial<Commission>) => api.createCommission(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["commissions"] }); qc.invalidateQueries({ queryKey: ["stats"] }); setShowAdd(false); toast("Commission added"); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<Commission> }) => api.updateCommission(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["commissions"] }); qc.invalidateQueries({ queryKey: ["stats"] }); setEditing(null); toast("Saved"); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => api.deleteCommission(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["commissions"] }); toast("Deleted"); } });

  const closed = commissions.filter(c => c.status === "closed");
  const pending = commissions.filter(c => c.status !== "closed");
  const ytdTotal = closed.reduce((s, c) => s + c.commissionAmount, 0);
  const pendingTotal = pending.reduce((s, c) => s + c.commissionAmount, 0);

  const STATUS: Record<string, { color: string; bg: string; label: string }> = { pending: { color: "#7a6a5a", bg: "#f0ece6", label: "Pending" }, "in-escrow": { color: "#1e5a8a", bg: "#dbeafe", label: "In Escrow" }, closed: { color: "#2a7a4a", bg: "#d1f0e1", label: "Closed" } };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div><h1 className="section-title">Commissions</h1><p className="section-sub">Track your real estate transactions and earnings</p></div>
        <button className="crm-btn crm-btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} />Add Transaction</button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 24 }}>
        <div className="stat-card"><div className="stat-label">YTD Commissions</div><div className="stat-value" style={{ color: "#2a7a4a" }}>${ytdTotal.toLocaleString()}</div><div className="stat-sub">{closed.length} closed</div></div>
        <div className="stat-card"><div className="stat-label">In Pipeline</div><div className="stat-value" style={{ color: "#1e5a8a" }}>${pendingTotal.toLocaleString()}</div><div className="stat-sub">{pending.length} transactions</div></div>
        <div className="stat-card"><div className="stat-label">Total Transactions</div><div className="stat-value">{commissions.length}</div><div className="stat-sub">all time</div></div>
        <div className="stat-card"><div className="stat-label">Avg Commission</div><div className="stat-value">{closed.length > 0 ? "$" + Math.round(ytdTotal / closed.length).toLocaleString() : "—"}</div><div className="stat-sub">per closed deal</div></div>
      </div>
      {isLoading ? <div style={{ textAlign: "center", padding: 60, color: "#a89880" }}>Loading…</div> : (
        <div className="card">
          {commissions.length === 0 ? (
            <div style={{ padding: "60px 24px", textAlign: "center", color: "#a89880" }}>
              <DollarSign size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
              <div style={{ marginBottom: 16 }}>No transactions yet.</div>
              <button className="crm-btn crm-btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} />Add Transaction</button>
            </div>
          ) : commissions.map(comm => {
            const sc = STATUS[comm.status] || STATUS.pending;
            return (
              <div key={comm.id} style={{ padding: "16px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: sc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Home size={18} color={sc.color} /></div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{comm.clientName}</div>
                  <div style={{ fontSize: 12, color: "#7a6a5a" }}>{comm.propertyAddress}</div>
                  {comm.closeDate && <div style={{ fontSize: 12, color: "#a89880", marginTop: 2 }}>Close: {fmtDate(comm.closeDate)}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: sc.color }}>${comm.commissionAmount.toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: "#7a6a5a" }}>{fmtPrice(comm.salePrice)} · {comm.commissionRate}%</div>
                  <Badge label={sc.label} color={sc.color} bg={sc.bg} />
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a6a5a" }} onClick={() => setEditing(comm)}><Edit3 size={13} /></button>
                  <button style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c0392b" }} onClick={() => setDelConfirm(comm.id)}><Trash2 size={13} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Transaction"><CommissionForm comm={EMPTY_COMM} leads={leads} onSave={d => createMut.mutate(d)} onCancel={() => setShowAdd(false)} saving={createMut.isPending} /></Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Transaction">{editing && <CommissionForm comm={editing} leads={leads} onSave={d => updateMut.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} saving={updateMut.isPending} />}</Modal>
      <ConfirmDialog open={!!delConfirm} msg="Delete this transaction?" onConfirm={() => { if (delConfirm) { deleteMut.mutate(delConfirm); setDelConfirm(null); }}} onCancel={() => setDelConfirm(null)} />
    </div>
  );
}

function CommissionForm({ comm, leads, onSave, onCancel, saving }: { comm: Partial<Commission>; leads: Lead[]; onSave: (d: Partial<Commission>) => void; onCancel: () => void; saving?: boolean }) {
  const [form, setForm] = useState<Partial<Commission>>({ ...EMPTY_COMM, ...comm });
  const upd = (k: keyof Commission, v: unknown) => setForm(f => {
    const next = { ...f, [k]: v };
    if (k === "salePrice" || k === "commissionRate") next.commissionAmount = Math.round((Number(next.salePrice) || 0) * (Number(next.commissionRate) || 3) / 100);
    return next;
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Field label="Client Name *"><input className="crm-input" value={form.clientName} onChange={e => upd("clientName", e.target.value)} placeholder="Jane Smith" /></Field>
      <Field label="Property Address *"><input className="crm-input" value={form.propertyAddress} onChange={e => upd("propertyAddress", e.target.value)} placeholder="123 Kaimuki Ave, Honolulu, HI 96816" /></Field>
      <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Sale Price ($)"><input className="crm-input" type="number" value={form.salePrice || ""} onChange={e => upd("salePrice", Number(e.target.value))} placeholder="750000" /></Field>
        <Field label="Commission Rate (%)"><input className="crm-input" type="number" step="0.1" value={form.commissionRate || ""} onChange={e => upd("commissionRate", Number(e.target.value))} placeholder="3" /></Field>
      </div>
      <div style={{ background: "#f5efe7", borderRadius: 8, padding: "12px 14px" }}>
        <div style={{ fontSize: 12, color: "#7a6a5a" }}>Commission Amount</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: "#2a7a4a" }}>${(form.commissionAmount || 0).toLocaleString()}</div>
      </div>
      <div className="form-grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
        <Field label="Status"><select className="crm-input" value={form.status} onChange={e => upd("status", e.target.value)}><option value="pending">Pending</option><option value="in-escrow">In Escrow</option><option value="closed">Closed</option></select></Field>
        <Field label="Close Date"><input className="crm-input" type="date" value={form.closeDate} onChange={e => upd("closeDate", e.target.value)} /></Field>
      </div>
      <Field label="Linked Lead"><select className="crm-input" value={form.leadId || ""} onChange={e => setForm(f => ({ ...f, leadId: e.target.value }))}><option value="">None</option>{leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
      <Field label="Notes"><textarea className="crm-input" rows={2} value={form.notes} onChange={e => upd("notes", e.target.value)} style={{ resize: "vertical" }} /></Field>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="crm-btn crm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="crm-btn crm-btn-primary" onClick={() => onSave(form)} disabled={!form.clientName || !form.propertyAddress || saving}>{saving ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SETTINGS PAGE
// ═══════════════════════════════════════════════════════════════════════
function SettingsPage() {
  const { logout } = useAuth();
  const toast = useToast();
  const [pwForm, setPwForm] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const isSetupMode = !!localStorage.getItem("crm_setup_pw");

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (pwForm.next !== pwForm.confirm) { toast("New passwords don't match", "error"); return; }
    if (pwForm.next.length < 4) { toast("Password must be at least 4 characters", "error"); return; }
    setPwSaving(true);
    try {
      await api.changePassword(isSetupMode ? null : pwForm.current, pwForm.next);
      localStorage.removeItem("crm_setup_pw");
      toast(isSetupMode ? "Password set! Your CRM is now secured." : "Password updated successfully");
      setPwForm({ current: "", next: "", confirm: "" });
    } catch (err: any) {
      toast(err.message || "Failed to update password", "error");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <div className="fade-in">
      <h1 className="section-title">Settings</h1>
      <p className="section-sub">CRM configuration</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 560 }}>
        {isSetupMode && (
          <div style={{ background: "#f0faf4", border: "1px solid #a8d5b5", borderRadius: 12, padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <Lock size={18} color="#1a5c33" style={{ flexShrink: 0, marginTop: 1 }} />
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: "#1a5c33", marginBottom: 3 }}>Welcome! Set your password</div>
              <div style={{ fontSize: 13, color: "#2d7a4a" }}>Your CRM has no password yet. Fill in the form below to secure it — you'll use this password every time you log in.</div>
            </div>
          </div>
        )}

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#1a2c24", display: "flex", alignItems: "center", justifyContent: "center" }}><Home size={22} color="#c9a96e" /></div>
            <div><div style={{ fontWeight: 700, fontSize: 15 }}>Mel Castanares</div><div style={{ fontSize: 12, color: "#7a6a5a" }}>REALTOR® RS-84753 · Dream Home Realty Hawai'i</div></div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <a href="tel:+18082858774" className="crm-btn crm-btn-ghost crm-btn-sm" style={{ textDecoration: "none" }}><Phone size={13} />(808) 285-8774</a>
            <a href="mailto:mel@homesweethomehawaii.com" className="crm-btn crm-btn-ghost crm-btn-sm" style={{ textDecoration: "none" }}><Mail size={13} />mel@homesweethomehawaii.com</a>
            <a href="https://melcastanares.techsavvyhawaii.com" target="_blank" rel="noopener" className="crm-btn crm-btn-ghost crm-btn-sm" style={{ textDecoration: "none" }}><ExternalLink size={13} />Website</a>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <Lock size={16} color="#c9a96e" />
            <div style={{ fontWeight: 600, fontSize: 14 }}>{isSetupMode ? "Set Password" : "Change Password"}</div>
          </div>
          <form onSubmit={handleChangePassword} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {!isSetupMode && (
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Current Password</label>
                <input className="crm-input" type="password" value={pwForm.current} onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))} placeholder="Enter current password" autoComplete="current-password" />
              </div>
            )}
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>{isSetupMode ? "Password" : "New Password"}</label>
              <input className="crm-input" type="password" value={pwForm.next} onChange={e => setPwForm(f => ({ ...f, next: e.target.value }))} placeholder="Choose a password (min 4 chars)" autoComplete="new-password" autoFocus={isSetupMode} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Confirm Password</label>
              <input className="crm-input" type="password" value={pwForm.confirm} onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Repeat password" autoComplete="new-password" />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button className="crm-btn crm-btn-primary" type="submit" disabled={(!isSetupMode && !pwForm.current) || !pwForm.next || !pwForm.confirm || pwSaving}>
                <Lock size={13} />{pwSaving ? "Saving…" : isSetupMode ? "Set Password" : "Update Password"}
              </button>
            </div>
          </form>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>Cloudflare Setup</div>
          <div style={{ fontSize: 13, color: "#7a6a5a", lineHeight: 1.7 }}>
            <ol style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 4 }}>
              <li>D1 database <code style={{ background: "#f5efe7", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>mel-crm-db</code> → bind as <code style={{ background: "#f5efe7", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>DB</code></li>
              <li>R2 bucket <code style={{ background: "#f5efe7", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>mel-crm-files</code> → bind as <code style={{ background: "#f5efe7", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>FILES_BUCKET</code></li>
              <li>Workers AI → bind as <code style={{ background: "#f5efe7", padding: "1px 6px", borderRadius: 4, fontSize: 12 }}>AI</code></li>
            </ol>
          </div>
        </div>

        <div className="card" style={{ padding: 24 }}>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Sign Out</div>
          <div style={{ fontSize: 13, color: "#7a6a5a", marginBottom: 16 }}>You'll need your password to sign back in.</div>
          <button className="crm-btn crm-btn-ghost" onClick={logout}><LogOut size={14} />Sign Out</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PROTECTED APP
// ═══════════════════════════════════════════════════════════════════════
function ProtectedApp() {
  const { authed, loading } = useAuth();
  const [loc, setLoc] = useLocation();

  useEffect(() => {
    if (!loading && !authed && loc !== "/login") setLoc("/login");
    if (!loading && authed && loc === "/login") setLoc("/");
  }, [authed, loading, loc, setLoc]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#1a2c24", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#c9a96e", fontSize: 14 }}>Loading…</div>
      </div>
    );
  }

  if (!authed) return <LoginPage />;

  return (
    <Shell>
      {loc === "/" && <DashboardPage />}
      {loc.startsWith("/pipeline") && <PipelinePage />}
      {loc.startsWith("/contacts") && <ContactsPage />}
      {loc.startsWith("/tasks") && <TasksPage />}
      {loc.startsWith("/commissions") && <CommissionsPage />}
      {loc.startsWith("/social") && <SocialPage />}
      {loc.startsWith("/calendar") && <CalendarPage />}
      {loc.startsWith("/listings") && <ListingsHubPage />}
      {loc.startsWith("/todos") && <TodosPage />}
      {loc.startsWith("/files") && <FilesPage />}
      {loc.startsWith("/ai-chat") && <AIChatPage />}
      {loc.startsWith("/settings") && <SettingsPage />}
    </Shell>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// APP ROOT
// ═══════════════════════════════════════════════════════════════════════
import { Router as WouterRouter } from "wouter";

const queryClient = new QueryClient();

export default function App() {
  const base = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <WouterRouter base={base}>
            <AuthProvider>
              <ProtectedApp />
            </AuthProvider>
          </WouterRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
