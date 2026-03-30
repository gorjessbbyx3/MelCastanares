import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Heart, Mail, Copy, CheckCircle2, X, Sparkles, AlertCircle, Clock, Calendar } from "lucide-react";
import { api, type Commission, type NurtureEmail } from "../lib/api";

// ── Helpers ───────────────────────────────────────────────────────────
function daysBetween(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a + "T12:00:00").getTime()) / 86400000);
}
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmt$(n: number) { return n > 0 ? "$" + n.toLocaleString() : "—"; }

interface AnniversaryInfo {
  commission: Commission;
  yearNumber: number;
  anniversaryDate: string;
  daysUntil: number;
  urgency: "overdue" | "soon" | "upcoming" | "far";
}

function computeAnniversaries(commissions: Commission[]): AnniversaryInfo[] {
  const today = new Date().toISOString().slice(0, 10);
  const result: AnniversaryInfo[] = [];

  for (const c of commissions) {
    if (c.status !== "closed" || !c.closeDate) continue;
    // Find next upcoming anniversary (1st, 2nd, 3rd year)
    for (let yr = 1; yr <= 3; yr++) {
      const closeYear = parseInt(c.closeDate.slice(0, 4));
      const annivYear = closeYear + yr;
      const annivDate = `${annivYear}${c.closeDate.slice(4)}`;
      const days = daysBetween(today, annivDate);
      // Only include if within -7 to +180 days (just passed or coming up)
      if (days >= -7 && days <= 180) {
        result.push({
          commission: c,
          yearNumber: yr,
          anniversaryDate: annivDate,
          daysUntil: days,
          urgency: days < 0 ? "overdue" : days <= 14 ? "soon" : days <= 60 ? "upcoming" : "far",
        });
        break; // Only show the next upcoming anniversary per client
      }
    }
  }

  return result.sort((a, b) => a.daysUntil - b.daysUntil);
}

// ── Modal ─────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box slide-in" style={{ maxWidth: 560 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#7a6a5a" }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Email Draft Modal ─────────────────────────────────────────────────
function EmailDraftModal({ info, onClose }: { info: AnniversaryInfo; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState<NurtureEmail | null>(null);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.generateNurtureDraft({
        name: info.commission.clientName,
        address: info.commission.propertyAddress,
        closeDate: info.commission.closeDate,
        anniversary: `${info.yearNumber}-year anniversary`,
        daysUntil: info.daysUntil,
        salePrice: info.commission.salePrice,
        notes: info.commission.notes,
      });
      setEmail(res.email);
    } catch {
      setError("Couldn't generate email — try again in a moment");
    }
    setLoading(false);
  };

  const copyEmail = () => {
    if (!email) return;
    navigator.clipboard.writeText(`Subject: ${email.subject}\n\n${email.body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <div style={{ background: "#f5f2ee", borderRadius: 10, padding: "12px 14px" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#2c2218" }}>{info.commission.clientName}</div>
          <div style={{ fontSize: 12, color: "#7a6a5a" }}>{info.commission.propertyAddress}</div>
          <div style={{ fontSize: 12, color: "#7a6a5a", marginTop: 4 }}>
            Closed: {fmtDate(info.commission.closeDate)} · {info.yearNumber}-year anniversary
            {info.daysUntil >= 0 ? ` in ${info.daysUntil} days` : ` (${Math.abs(info.daysUntil)} days ago)`}
          </div>
        </div>
      </div>

      {!email && !loading && (
        <div style={{ textAlign: "center", padding: "24px 0" }}>
          <Sparkles size={32} color="#c9a96e" style={{ marginBottom: 12 }} />
          <div style={{ fontSize: 13, color: "#7a6a5a", marginBottom: 20 }}>
            Generate a personalized check-in email in Mel's voice — references the specific property, shares a market update, and asks for referrals naturally.
          </div>
          <button className="crm-btn crm-btn-primary" onClick={generate}>
            <Sparkles size={13} style={{ marginRight: 6 }} />Generate Email Draft
          </button>
          {error && <div style={{ marginTop: 10, color: "#c0392b", fontSize: 12 }}>{error}</div>}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: "center", padding: "32px 0", color: "#a89880" }}>
          <div style={{ marginBottom: 12 }}>✍️ Writing personalized email…</div>
          <div style={{ fontSize: 12 }}>Tailoring to {info.commission.clientName} and their home</div>
        </div>
      )}

      {email && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a89880", marginBottom: 6 }}>Subject</div>
            <div style={{ background: "#f5f2ee", borderRadius: 8, padding: "10px 14px", fontSize: 13, fontWeight: 600, color: "#2c2218" }}>{email.subject}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a89880", marginBottom: 6 }}>Email Body</div>
            <div style={{ background: "#f5f2ee", borderRadius: 8, padding: "14px", fontSize: 13, color: "#2c2218", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 300, overflowY: "auto" }}>{email.body}</div>
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button className="crm-btn crm-btn-ghost" onClick={generate} style={{ fontSize: 12 }}>Regenerate</button>
            <button className="crm-btn crm-btn-primary" onClick={copyEmail} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {copied ? <><CheckCircle2 size={13} />Copied!</> : <><Copy size={13} />Copy Email</>}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Anniversary Card ───────────────────────────────────────────────────
function AnnivCard({ info, onGenerate }: { info: AnniversaryInfo; onGenerate: () => void }) {
  const { commission: c, yearNumber, anniversaryDate, daysUntil, urgency } = info;
  const urgencyStyle = {
    overdue: { color: "#c0392b", bg: "#fde8e5", border: "#f5a9a3", label: "Just Passed" },
    soon:    { color: "#d4851a", bg: "#fef9ec", border: "#f5d87a", label: "Coming Soon" },
    upcoming:{ color: "#2a7a4a", bg: "#d1f0e1", border: "#8ad4aa", label: "Upcoming" },
    far:     { color: "#7a6a5a", bg: "#f0ece6", border: "#e8e0d4", label: "Scheduled" },
  }[urgency];

  const ordinal = yearNumber === 1 ? "1st" : yearNumber === 2 ? "2nd" : "3rd";

  return (
    <div style={{ background: "#fff", border: `1px solid ${urgencyStyle.border}`, borderRadius: 12, padding: "16px 18px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#2c2218" }}>{c.clientName}</span>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: urgencyStyle.bg, color: urgencyStyle.color, fontWeight: 600 }}>
              {ordinal} Anniversary · {urgencyStyle.label}
            </span>
          </div>
          <div style={{ fontSize: 12, color: "#7a6a5a" }}>{c.propertyAddress}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: urgencyStyle.color }}>
            {daysUntil < 0 ? `${Math.abs(daysUntil)}d ago` : daysUntil === 0 ? "Today!" : `${daysUntil}d`}
          </div>
          <div style={{ fontSize: 10, color: "#a89880" }}>{fmtDate(anniversaryDate)}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#7a6a5a" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Calendar size={11} />Closed {fmtDate(c.closeDate)}</span>
        {c.salePrice > 0 && <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ color: "#2a7a4a", fontWeight: 700 }}>{fmt$(c.salePrice)}</span></span>}
        <button className="crm-btn crm-btn-primary" onClick={onGenerate} style={{ marginLeft: "auto", padding: "6px 14px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}>
          <Mail size={12} />Draft Email
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function NurturePage() {
  const [drafting, setDrafting] = useState<AnniversaryInfo | null>(null);

  const commissionsQ = useQuery<Commission[]>({ queryKey: ["commissions"], queryFn: api.getCommissions });
  const commissions = commissionsQ.data || [];

  const anniversaries = computeAnniversaries(commissions);
  const closedCount = commissions.filter(c => c.status === "closed").length;

  const soon = anniversaries.filter(a => a.urgency === "soon" || a.urgency === "overdue");
  const upcoming = anniversaries.filter(a => a.urgency === "upcoming");
  const far = anniversaries.filter(a => a.urgency === "far");

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}><Heart size={22} color="#c9a96e" />Post-Closing Nurture</h1>
        <p className="section-sub">Stay top of mind with past clients · AI-generated anniversary check-ins</p>
      </div>

      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Past Clients", value: closedCount.toString(), icon: <CheckCircle2 size={15} color="#2a7a4a" />, bg: "#d1f0e1", color: "#2a7a4a" },
          { label: "Due Soon (14d)", value: soon.length.toString(), icon: <AlertCircle size={15} color="#d4851a" />, bg: "#fde9c8", color: "#d4851a" },
          { label: "Next 60 Days", value: (soon.length + upcoming.length).toString(), icon: <Clock size={15} color="#c9a96e" />, bg: "#fdf4e3", color: "#c9a96e" },
          { label: "Tracked (180d)", value: anniversaries.length.toString(), icon: <Calendar size={15} color="#1e5a8a" />, bg: "#dbeafe", color: "#1e5a8a" },
        ].map(c => (
          <div key={c.label} style={{ background: "#fff", border: "1px solid #e8e0d4", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 28, height: 28, borderRadius: 7, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.icon}</div>
              <span style={{ fontSize: 11, color: "#7a6a5a" }}>{c.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {commissionsQ.isLoading && <div style={{ padding: 40, textAlign: "center", color: "#a89880" }}>Loading…</div>}

      {!commissionsQ.isLoading && closedCount === 0 && (
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <Heart size={40} color="#e8e0d4" style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 600, color: "#2c2218", marginBottom: 6 }}>No closed commissions yet</div>
          <div style={{ fontSize: 13, color: "#7a6a5a" }}>Once you mark commissions as closed, anniversary reminders will appear here automatically</div>
        </div>
      )}

      {!commissionsQ.isLoading && closedCount > 0 && anniversaries.length === 0 && (
        <div style={{ background: "#fff", border: "1px solid #e8e0d4", borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
          <CheckCircle2 size={36} color="#2a7a4a" style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 600, color: "#2c2218", marginBottom: 6 }}>All clear — no anniversaries in the next 180 days</div>
          <div style={{ fontSize: 13, color: "#7a6a5a" }}>{closedCount} past client{closedCount !== 1 ? "s" : ""} tracked. Check back as anniversaries approach.</div>
        </div>
      )}

      {soon.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#d4851a", marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
            <AlertCircle size={13} />Action Needed — Within 14 Days ({soon.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {soon.map((a, i) => <AnnivCard key={i} info={a} onGenerate={() => setDrafting(a)} />)}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#2a7a4a", marginBottom: 10 }}>
            Upcoming — Next 60 Days ({upcoming.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map((a, i) => <AnnivCard key={i} info={a} onGenerate={() => setDrafting(a)} />)}
          </div>
        </div>
      )}

      {far.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a89880", marginBottom: 10 }}>
            On the Radar — 60–180 Days ({far.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {far.map((a, i) => <AnnivCard key={i} info={a} onGenerate={() => setDrafting(a)} />)}
          </div>
        </div>
      )}

      <Modal open={!!drafting} onClose={() => setDrafting(null)} title="Anniversary Email Draft">
        {drafting && <EmailDraftModal info={drafting} onClose={() => setDrafting(null)} />}
      </Modal>
    </div>
  );
}
