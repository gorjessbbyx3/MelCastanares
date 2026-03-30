import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileText, Plus, Trash2, Edit3, CheckCircle2, Circle, X,
  ChevronRight, Home, DollarSign, Calendar, AlertCircle,
  TrendingUp, Clock, MapPin
} from "lucide-react";
import { api, type Transaction, type TxMilestone } from "../lib/api";

// ── Helpers ───────────────────────────────────────────────────────────
function fmt$(n: number) { return n > 0 ? "$" + n.toLocaleString() : "—"; }
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function daysUntil(d: string) {
  if (!d) return null;
  const diff = Math.ceil((new Date(d + "T12:00:00").getTime() - Date.now()) / 86400000);
  return diff;
}

const STATUS_COLORS: Record<string, { color: string; bg: string; label: string }> = {
  active:         { color: "#2a7a4a", bg: "#d1f0e1", label: "Active" },
  pending:        { color: "#d4851a", bg: "#fde9c8", label: "Pending" },
  closed:         { color: "#1e5a8a", bg: "#dbeafe", label: "Closed" },
  cancelled:      { color: "#7a6a5a", bg: "#f0ece6", label: "Cancelled" },
};

// ── Modal ─────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box slide-in" style={{ maxWidth: wide ? 680 : 480 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#7a6a5a" }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Transaction Form ──────────────────────────────────────────────────
function TxForm({ tx, onSave, onCancel, saving }: { tx: Partial<Transaction>; onSave: (d: Partial<Transaction>) => void; onCancel: () => void; saving?: boolean }) {
  const [form, setForm] = useState<Partial<Transaction>>({
    clientName: "", propertyAddress: "", transactionType: "buy", status: "active",
    listPrice: 0, salePrice: 0, commissionRate: 3, commissionAmount: 0,
    contractDate: "", escrowOpenDate: "", inspectionDeadline: "", disclosureDeadline: "",
    loanContingencyDate: "", titleClearDate: "", hoaDocsDate: "", closingDate: "",
    notes: "", ...tx,
  });
  const upd = (k: keyof Transaction, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const commAmt = Math.round((form.salePrice || form.listPrice || 0) * ((form.commissionRate || 3) / 100));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Client Name *</label>
          <input className="crm-input" value={form.clientName} onChange={e => upd("clientName", e.target.value)} placeholder="e.g. John & Jane Smith" autoFocus />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Property Address *</label>
          <input className="crm-input" value={form.propertyAddress} onChange={e => upd("propertyAddress", e.target.value)} placeholder="e.g. 123 Kaimuki Ave, Honolulu, HI 96816" />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Transaction Type</label>
          <select className="crm-input" value={form.transactionType} onChange={e => upd("transactionType", e.target.value)}>
            <option value="buy">Buyer-Side</option>
            <option value="sell">Seller-Side</option>
            <option value="lease">Lease</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Status</label>
          <select className="crm-input" value={form.status} onChange={e => upd("status", e.target.value)}>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="closed">Closed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>List Price</label>
          <input className="crm-input" type="number" value={form.listPrice || ""} onChange={e => upd("listPrice", parseInt(e.target.value) || 0)} placeholder="e.g. 850000" />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Sale Price</label>
          <input className="crm-input" type="number" value={form.salePrice || ""} onChange={e => upd("salePrice", parseInt(e.target.value) || 0)} placeholder="e.g. 840000" />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Commission Rate (%)</label>
          <input className="crm-input" type="number" step="0.25" value={form.commissionRate || ""} onChange={e => upd("commissionRate", parseFloat(e.target.value) || 3)} />
        </div>
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Est. Commission</label>
          <div className="crm-input" style={{ background: "#f5f2ee", color: "#2a7a4a", fontWeight: 700 }}>{fmt$(commAmt)}</div>
        </div>
      </div>
      <div style={{ borderTop: "1px solid #e8e0d4", paddingTop: 14 }}>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a89880", marginBottom: 10 }}>Key Dates</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {[
            ["contractDate", "Contract Date"], ["escrowOpenDate", "Escrow Opens"],
            ["inspectionDeadline", "Inspection Deadline"], ["disclosureDeadline", "Disclosure Deadline"],
            ["loanContingencyDate", "Loan Contingency"], ["titleClearDate", "Title Clear"],
            ["hoaDocsDate", "HOA Docs Due"], ["closingDate", "Closing Date"],
          ].map(([key, label]) => (
            <div key={key}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 4 }}>{label}</label>
              <input className="crm-input" type="date" value={(form as Record<string, unknown>)[key] as string || ""} onChange={e => upd(key as keyof Transaction, e.target.value)} style={{ fontSize: 12 }} />
            </div>
          ))}
        </div>
      </div>
      <div>
        <label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Notes</label>
        <textarea className="crm-input" rows={2} value={form.notes} onChange={e => upd("notes", e.target.value)} style={{ resize: "vertical" }} />
      </div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="crm-btn crm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="crm-btn crm-btn-primary" onClick={() => onSave({ ...form, commissionAmount: commAmt })} disabled={!form.clientName || !form.propertyAddress || saving}>
          {saving ? "Saving…" : tx.id ? "Save Changes" : "Create Transaction"}
        </button>
      </div>
    </div>
  );
}

// ── Timeline Panel ────────────────────────────────────────────────────
function TimelinePanel({ tx, onUpdate }: { tx: Transaction; onUpdate: (id: string, data: Partial<Transaction>) => void }) {
  const completed = tx.milestones.filter(m => m.completed).length;
  const pct = tx.milestones.length > 0 ? Math.round((completed / tx.milestones.length) * 100) : 0;

  const toggleMilestone = (mId: string) => {
    const updated = tx.milestones.map(m =>
      m.id === mId ? { ...m, completed: !m.completed, date: !m.completed ? new Date().toISOString().slice(0, 10) : "" } : m
    );
    onUpdate(tx.id, { milestones: updated });
  };

  // Key dates with urgency
  const keyDates: { label: string; value: string }[] = [
    { label: "Contract", value: tx.contractDate },
    { label: "Inspection", value: tx.inspectionDeadline },
    { label: "Disclosures", value: tx.disclosureDeadline },
    { label: "Loan", value: tx.loanContingencyDate },
    { label: "Closing", value: tx.closingDate },
  ].filter(d => d.value);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Progress bar */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a" }}>Progress</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#2a7a4a" }}>{completed}/{tx.milestones.length} milestones · {pct}%</span>
        </div>
        <div style={{ height: 8, background: "#e8e0d4", borderRadius: 4, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg, #c9a96e, #2a7a4a)", borderRadius: 4, transition: "width 0.4s" }} />
        </div>
      </div>

      {/* Key dates strip */}
      {keyDates.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {keyDates.map(({ label, value }) => {
            const days = daysUntil(value);
            const urgent = days !== null && days >= 0 && days <= 7;
            const overdue = days !== null && days < 0;
            return (
              <div key={label} style={{ background: overdue ? "#fde8e5" : urgent ? "#fef9ec" : "#f5f2ee", border: `1px solid ${overdue ? "#f5a9a3" : urgent ? "#f5d87a" : "#e8e0d4"}`, borderRadius: 8, padding: "5px 10px", fontSize: 11 }}>
                <span style={{ color: "#7a6a5a" }}>{label}: </span>
                <span style={{ fontWeight: 700, color: overdue ? "#c0392b" : urgent ? "#d4851a" : "#2c2218" }}>{fmtDate(value)}</span>
                {days !== null && <span style={{ marginLeft: 4, color: overdue ? "#c0392b" : urgent ? "#d4851a" : "#7a6a5a" }}>({days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "today" : `${days}d`})</span>}
              </div>
            );
          })}
        </div>
      )}

      {/* Milestone checklist */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {tx.milestones.map((m, i) => {
          const prevDone = i === 0 || tx.milestones[i - 1].completed;
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: m.completed ? "#f0faf5" : "#fff", border: `1px solid ${m.completed ? "#b8e8cc" : "#e8e0d4"}`, borderRadius: 8, opacity: !m.completed && !prevDone ? 0.5 : 1 }}>
              <button onClick={() => toggleMilestone(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: m.completed ? "#2a7a4a" : "#c8bfb5", flexShrink: 0, padding: 0 }}>
                {m.completed ? <CheckCircle2 size={18} /> : <Circle size={18} />}
              </button>
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 13, fontWeight: m.completed ? 500 : 600, color: m.completed ? "#5a8a6a" : "#2c2218", textDecoration: m.completed ? "line-through" : "none" }}>{m.label}</span>
              </div>
              {m.completed && m.date && <span style={{ fontSize: 11, color: "#7a6a5a" }}>{fmtDate(m.date)}</span>}
            </div>
          );
        })}
      </div>

      {/* Commission */}
      {tx.commissionAmount > 0 && (
        <div style={{ background: "linear-gradient(135deg, #1a2c24, #2a4a34)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
          <DollarSign size={20} color="#c9a96e" />
          <div>
            <div style={{ fontSize: 11, color: "#8aaa8a", marginBottom: 2 }}>Expected Commission</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#c9a96e" }}>{fmt$(tx.commissionAmount)}</div>
          </div>
          <div style={{ marginLeft: "auto", textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#8aaa8a" }}>at {tx.commissionRate}%</div>
            <div style={{ fontSize: 13, color: "#d4c4a4" }}>of {fmt$(tx.salePrice || tx.listPrice)}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Transaction Card ──────────────────────────────────────────────────
function TxCard({ tx, onClick, onEdit, onDelete }: { tx: Transaction; onClick: () => void; onEdit: () => void; onDelete: () => void }) {
  const sc = STATUS_COLORS[tx.status] || STATUS_COLORS.active;
  const completed = tx.milestones.filter(m => m.completed).length;
  const pct = tx.milestones.length > 0 ? Math.round((completed / tx.milestones.length) * 100) : 0;
  const closingDays = tx.closingDate ? daysUntil(tx.closingDate) : null;

  return (
    <div style={{ background: "#fff", border: "1px solid #e8e0d4", borderRadius: 12, padding: "16px 18px", cursor: "pointer", transition: "box-shadow 0.15s" }}
      onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px rgba(0,0,0,0.08)"}
      onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = ""}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div onClick={onClick} style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: 14, color: "#2c2218" }}>{tx.clientName}</span>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: sc.bg, color: sc.color, fontWeight: 600 }}>{sc.label}</span>
            <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "#f0ece6", color: "#7a6a5a" }}>{tx.transactionType === "sell" ? "Seller" : tx.transactionType === "lease" ? "Lease" : "Buyer"}</span>
          </div>
          <div style={{ fontSize: 12, color: "#7a6a5a", display: "flex", alignItems: "center", gap: 4 }}><MapPin size={11} />{tx.propertyAddress}</div>
        </div>
        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
          <button onClick={e => { e.stopPropagation(); onEdit(); }} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a6a5a" }}><Edit3 size={12} /></button>
          <button onClick={e => { e.stopPropagation(); onDelete(); }} style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c0392b" }}><Trash2 size={12} /></button>
        </div>
      </div>
      <div onClick={onClick}>
        {/* Progress bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <div style={{ flex: 1, height: 5, background: "#e8e0d4", borderRadius: 3, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct === 100 ? "#2a7a4a" : "#c9a96e", borderRadius: 3 }} />
          </div>
          <span style={{ fontSize: 11, color: "#7a6a5a", whiteSpace: "nowrap" }}>{pct}% · {completed}/{tx.milestones.length}</span>
        </div>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#7a6a5a" }}>
          {tx.commissionAmount > 0 && <span style={{ color: "#2a7a4a", fontWeight: 700 }}>{fmt$(tx.commissionAmount)}</span>}
          {closingDays !== null && (
            <span style={{ display: "flex", alignItems: "center", gap: 3, color: closingDays < 0 ? "#c0392b" : closingDays <= 14 ? "#d4851a" : "#7a6a5a" }}>
              <Calendar size={11} />
              {closingDays < 0 ? `${Math.abs(closingDays)}d past closing` : closingDays === 0 ? "Closing today!" : `Closing in ${closingDays}d`}
            </span>
          )}
          <span style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 3 }}><ChevronRight size={12} />View timeline</span>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function TransactionsPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const [viewing, setViewing] = useState<Transaction | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const txQ = useQuery<Transaction[]>({ queryKey: ["transactions"], queryFn: api.getTransactions });
  const createMut = useMutation({
    mutationFn: (d: Partial<Transaction>) => api.createTransaction(d),
    onSuccess: (tx) => { qc.invalidateQueries({ queryKey: ["transactions"] }); setShowAdd(false); setViewing(tx); },
  });
  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Transaction> }) => api.updateTransaction(id, data),
    onSuccess: (tx) => { qc.invalidateQueries({ queryKey: ["transactions"] }); setEditing(null); if (viewing?.id === tx.id) setViewing(tx); },
  });
  const deleteMut = useMutation({
    mutationFn: (id: string) => api.deleteTransaction(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["transactions"] }); if (viewing) setViewing(null); },
  });

  const all = txQ.data || [];
  const filtered = filter === "all" ? all : all.filter(t => t.status === filter);
  const active = all.filter(t => t.status === "active" || t.status === "pending");
  const totalExpected = active.reduce((s, t) => s + t.commissionAmount, 0);
  const viewingLive = viewing ? all.find(t => t.id === viewing.id) || viewing : null;

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}><FileText size={22} color="#c9a96e" />Transaction Command Center</h1>
          <p className="section-sub">Track every deal from DROA to closing · Hawaii-specific milestones</p>
        </div>
        <button className="crm-btn crm-btn-primary" onClick={() => setShowAdd(true)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} />New Transaction
        </button>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 24 }}>
        {[
          { label: "Active Deals", value: all.filter(t => t.status === "active").length.toString(), icon: <TrendingUp size={16} color="#2a7a4a" />, bg: "#d1f0e1", color: "#2a7a4a" },
          { label: "Pending Close", value: all.filter(t => t.status === "pending").length.toString(), icon: <Clock size={16} color="#d4851a" />, bg: "#fde9c8", color: "#d4851a" },
          { label: "Closed YTD", value: all.filter(t => t.status === "closed").length.toString(), icon: <CheckCircle2 size={16} color="#1e5a8a" />, bg: "#dbeafe", color: "#1e5a8a" },
          { label: "Pipeline Comm.", value: "$" + Math.round(totalExpected / 1000) + "K", icon: <DollarSign size={16} color="#c9a96e" />, bg: "#fdf4e3", color: "#c9a96e" },
        ].map(c => (
          <div key={c.label} style={{ background: "#fff", border: "1px solid #e8e0d4", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.icon}</div>
              <span style={{ fontSize: 11, color: "#7a6a5a" }}>{c.label}</span>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "2px solid #e8e0d4" }}>
        {[["all", "All"], ["active", "Active"], ["pending", "Pending"], ["closed", "Closed"], ["cancelled", "Cancelled"]].map(([id, label]) => (
          <button key={id} onClick={() => setFilter(id)} style={{ padding: "8px 18px", background: "none", border: "none", cursor: "pointer", fontWeight: filter === id ? 700 : 400, color: filter === id ? "#1a2c24" : "#7a6a5a", borderBottom: `2px solid ${filter === id ? "#c9a96e" : "transparent"}`, marginBottom: -2, fontSize: 13 }}>
            {label} {id !== "all" && <span style={{ fontSize: 11, color: filter === id ? "#c9a96e" : "#a89880", marginLeft: 2 }}>({all.filter(t => t.status === id).length})</span>}
          </button>
        ))}
      </div>

      {txQ.isLoading && <div style={{ padding: 40, textAlign: "center", color: "#a89880" }}>Loading transactions…</div>}

      {!txQ.isLoading && filtered.length === 0 && (
        <div style={{ padding: "60px 24px", textAlign: "center" }}>
          <Home size={40} color="#e8e0d4" style={{ marginBottom: 12 }} />
          <div style={{ fontWeight: 600, color: "#2c2218", marginBottom: 6 }}>No transactions yet</div>
          <div style={{ fontSize: 13, color: "#7a6a5a", marginBottom: 16 }}>Add your first deal to start tracking milestones</div>
          <button className="crm-btn crm-btn-primary" onClick={() => setShowAdd(true)}>
            <Plus size={13} style={{ marginRight: 6 }} />New Transaction
          </button>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map(tx => (
          <TxCard key={tx.id} tx={tx}
            onClick={() => setViewing(tx)}
            onEdit={() => setEditing(tx)}
            onDelete={() => { if (confirm(`Delete ${tx.clientName}'s transaction?`)) deleteMut.mutate(tx.id); }} />
        ))}
      </div>

      {/* Add modal */}
      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="New Transaction" wide>
        <TxForm tx={{}} onSave={d => createMut.mutate(d)} onCancel={() => setShowAdd(false)} saving={createMut.isPending} />
      </Modal>

      {/* Edit modal */}
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Transaction" wide>
        {editing && <TxForm tx={editing} onSave={d => updateMut.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} saving={updateMut.isPending} />}
      </Modal>

      {/* Timeline drawer */}
      <Modal open={!!viewingLive} onClose={() => setViewing(null)} title={viewingLive ? `${viewingLive.clientName} — ${viewingLive.propertyAddress}` : ""} wide>
        {viewingLive && (
          <TimelinePanel tx={viewingLive}
            onUpdate={(id, data) => updateMut.mutate({ id, data })} />
        )}
      </Modal>
    </div>
  );
}
