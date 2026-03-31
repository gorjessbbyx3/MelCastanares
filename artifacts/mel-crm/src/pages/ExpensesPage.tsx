import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Receipt, Plus, Trash2, Upload, DollarSign, Tag, Calendar,
  TrendingDown, FileText, Filter, Download, Edit3, X, Check,
  Camera, Link as LinkIcon,
} from "lucide-react";
import { api, type Expense } from "../lib/api";

const CATEGORIES = [
  "Marketing & Advertising", "MLS & Board Fees", "Office Supplies",
  "Professional Development", "Meals & Entertainment", "Transportation",
  "Technology & Software", "Staging & Photography", "Gifts & Client Appreciation",
  "Insurance", "Licensing & Renewals", "Other",
];

const CAT_COLORS: Record<string, { color: string; bg: string }> = {
  "Marketing & Advertising": { color: "#1e5a8a", bg: "#dbeafe" },
  "MLS & Board Fees": { color: "#2a6b4a", bg: "#d4f0e2" },
  "Office Supplies": { color: "#7a3a1a", bg: "#fee3d0" },
  "Professional Development": { color: "#5a2a7a", bg: "#ead5f5" },
  "Meals & Entertainment": { color: "#c9a96e", bg: "#fdf4e3" },
  "Transportation": { color: "#d4851a", bg: "#fdefd0" },
  "Technology & Software": { color: "#2a7a8a", bg: "#d0f5f8" },
  "Staging & Photography": { color: "#8a2a5a", bg: "#fdd5e8" },
  "Gifts & Client Appreciation": { color: "#c0392b", bg: "#fde8e5" },
  "Insurance": { color: "#2a4a7a", bg: "#d5e3f8" },
  "Licensing & Renewals": { color: "#4a6a2a", bg: "#e0f0d4" },
  "Other": { color: "#7a6a5a", bg: "#f0ece6" },
};

function fmtMoney(n: number) { return n ? "$" + n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "$0.00"; }
function fmtDate(d: string) { if (!d) return "—"; return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }

const EMPTY: Partial<Expense> = {
  date: new Date().toISOString().slice(0, 10), category: "Other", vendor: "",
  description: "", amount: 0, receiptUrl: "", taxDeductible: true, notes: "",
};

function Badge({ label }: { label: string }) {
  const s = CAT_COLORS[label] || CAT_COLORS["Other"];
  return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: 20, fontSize: 11, fontWeight: 600, color: s.color, background: s.bg, whiteSpace: "nowrap" }}>{label}</span>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a" }}>{label}</label>
      {children}
    </div>
  );
}

const INPUT = { width: "100%", padding: "8px 12px", border: "1px solid #e8e0d4", borderRadius: 6, background: "#fff", color: "#2c2218", fontSize: 14, outline: "none" } as const;
const SELECT = { ...INPUT } as const;

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<Expense>>(EMPTY);
  const [filterCat, setFilterCat] = useState("all");
  const [filterYear, setFilterYear] = useState(String(new Date().getFullYear()));
  const [uploading, setUploading] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["expenses"], queryFn: api.getExpenses,
  });
  const { data: r2Status } = useQuery<{ available: boolean }>({
    queryKey: ["r2-status"], queryFn: api.r2Status,
  });
  const canUpload = r2Status?.available ?? false;

  const createMut = useMutation({ mutationFn: (d: Partial<Expense>) => api.createExpense(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); resetForm(); } });
  const updateMut = useMutation({ mutationFn: ({ id, d }: { id: string; d: Partial<Expense> }) => api.updateExpense(id, d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); resetForm(); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => api.deleteExpense(id), onSuccess: () => { qc.invalidateQueries({ queryKey: ["expenses"] }); setDeleteId(null); } });

  function resetForm() { setForm(EMPTY); setEditId(null); setShowForm(false); setUrlMode(false); }
  function openEdit(e: Expense) { setForm(e); setEditId(e.id); setShowForm(true); }
  function setF(k: keyof Expense, v: any) { setForm(f => ({ ...f, [k]: v })); }

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const { url } = await api.uploadReceipt(file);
      setF("receiptUrl", url);
    } catch { alert("Receipt upload failed. You can paste a URL instead."); setUrlMode(true); }
    finally { setUploading(false); }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (editId) updateMut.mutate({ id: editId, d: form });
    else createMut.mutate(form);
  }

  const years = [...new Set(expenses.map(e => e.date.slice(0, 4)))].sort().reverse();
  if (!years.includes(filterYear)) years.unshift(filterYear);

  const filtered = expenses.filter(e => {
    if (filterCat !== "all" && e.category !== filterCat) return false;
    if (filterYear !== "all" && !e.date.startsWith(filterYear)) return false;
    return true;
  }).sort((a, b) => b.date.localeCompare(a.date));

  const totalFiltered = filtered.reduce((s, e) => s + e.amount, 0);
  const totalDeductible = filtered.filter(e => e.taxDeductible).reduce((s, e) => s + e.amount, 0);

  const catBreakdown = CATEGORIES.map(cat => ({
    cat,
    total: filtered.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
    count: filtered.filter(e => e.category === cat).length,
  })).filter(c => c.count > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="fade-in">
      {/* ── Header ── */}
      <div style={{ marginBottom: 24, display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: 26, fontWeight: 600, color: "#2c2218", margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
            <Receipt size={22} color="#c9a96e" />Expenses & Receipts
          </h1>
          <p style={{ fontSize: 13, color: "#7a6a5a", margin: 0 }}>Track business expenses · upload receipts · summarize for tax time</p>
        </div>
        <button onClick={() => { setForm(EMPTY); setEditId(null); setShowForm(true); }} className="crm-btn crm-btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <Plus size={14} />Add Expense
        </button>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Total Expenses", value: fmtMoney(totalFiltered), sub: `${filtered.length} entries`, icon: Receipt, accent: "#c0392b", bg: "#fde8e5" },
          { label: "Tax Deductible", value: fmtMoney(totalDeductible), sub: `${filtered.filter(e => e.taxDeductible).length} deductible`, icon: Tag, accent: "#2a6b4a", bg: "#d4f0e2" },
          { label: "Non-Deductible", value: fmtMoney(totalFiltered - totalDeductible), sub: "personal/mixed", icon: TrendingDown, accent: "#d4851a", bg: "#fdefd0" },
          { label: "Top Category", value: catBreakdown[0]?.cat?.split(" ")[0] || "—", sub: catBreakdown[0] ? fmtMoney(catBreakdown[0].total) : "no expenses", icon: DollarSign, accent: "#1e5a8a", bg: "#dbeafe" },
        ].map(s => (
          <div key={s.label} style={{ background: "#fff", borderRadius: 12, padding: "16px 18px", borderLeft: `3px solid ${s.accent}`, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: "#a89880", marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, fontWeight: 700, color: s.accent, lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: "#7a6a5a", marginTop: 4 }}>{s.sub}</div>
            </div>
            <div style={{ width: 36, height: 36, borderRadius: 9, background: s.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <s.icon size={16} color={s.accent} />
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18, flexWrap: "wrap", alignItems: "center" }}>
        <Filter size={14} color="#a89880" />
        <select value={filterYear} onChange={e => setFilterYear(e.target.value)} style={{ ...SELECT, width: "auto", padding: "6px 10px", fontSize: 13 }}>
          <option value="all">All Years</option>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ ...SELECT, width: "auto", padding: "6px 10px", fontSize: 13 }}>
          <option value="all">All Categories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(filterCat !== "all" || filterYear !== String(new Date().getFullYear())) && (
          <button onClick={() => { setFilterCat("all"); setFilterYear(String(new Date().getFullYear())); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 12, color: "#c0392b", display: "flex", alignItems: "center", gap: 4 }}>
            <X size={12} />Clear
          </button>
        )}
        <div style={{ marginLeft: "auto", fontSize: 12, color: "#7a6a5a" }}>{filtered.length} expenses · {fmtMoney(totalFiltered)} total</div>
      </div>

      {/* ── Category breakdown ── */}
      {catBreakdown.length > 0 && (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e0d4", padding: "16px 20px", marginBottom: 18 }}>
          <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 15, fontWeight: 600, color: "#2c2218", marginBottom: 12 }}>Breakdown by Category</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {catBreakdown.map(c => (
              <div key={c.cat} onClick={() => setFilterCat(c.cat === filterCat ? "all" : c.cat)} style={{ cursor: "pointer", padding: "8px 14px", borderRadius: 8, background: filterCat === c.cat ? (CAT_COLORS[c.cat] || CAT_COLORS["Other"]).bg : "#f9f5f0", border: `1px solid ${filterCat === c.cat ? (CAT_COLORS[c.cat] || CAT_COLORS["Other"]).color + "50" : "#ece6de"}` }}>
                <div style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 18, fontWeight: 700, color: (CAT_COLORS[c.cat] || CAT_COLORS["Other"]).color }}>{fmtMoney(c.total)}</div>
                <div style={{ fontSize: 10, color: "#7a6a5a", textTransform: "uppercase", letterSpacing: "0.05em", marginTop: 2 }}>{c.cat.split(" ")[0]} · {c.count}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Expense list ── */}
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e8e0d4", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #f0e8de", background: "#fdfaf6", display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={14} color="#c9a96e" />
          <span style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 15, fontWeight: 600 }}>Expense Log</span>
        </div>
        {isLoading ? (
          <div style={{ padding: 48, textAlign: "center", color: "#a89880" }}>Loading expenses…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center" }}>
            <Receipt size={32} style={{ opacity: 0.25, marginBottom: 12 }} />
            <div style={{ fontSize: 14, color: "#a89880", fontStyle: "italic", marginBottom: 12 }}>No expenses yet — start tracking your business deductions</div>
            <button onClick={() => { setForm(EMPTY); setShowForm(true); }} className="crm-btn crm-btn-primary"><Plus size={13} />Add First Expense</button>
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ background: "#fdfaf6" }}>
                {["Date", "Vendor / Description", "Category", "Amount", "Receipt", ""].map(h => (
                  <th key={h} style={{ padding: "10px 16px", textAlign: "left", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a89880", borderBottom: "1px solid #f0e8de", fontWeight: 600 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((expense, i) => (
                <tr key={expense.id} style={{ borderBottom: i < filtered.length - 1 ? "1px solid #f9f5f0" : "none", background: "transparent" }}
                  onMouseEnter={e => (e.currentTarget.style.background = "#fdfaf6")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "12px 16px", color: "#7a6a5a", whiteSpace: "nowrap" }}>{fmtDate(expense.date)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600, color: "#2c2218" }}>{expense.vendor || "—"}</div>
                    {expense.description && <div style={{ fontSize: 11, color: "#a89880", marginTop: 2 }}>{expense.description}</div>}
                    {expense.taxDeductible && <span style={{ fontSize: 10, color: "#2a6b4a", background: "#d4f0e2", padding: "1px 6px", borderRadius: 10, marginTop: 3, display: "inline-block" }}>Tax deductible</span>}
                  </td>
                  <td style={{ padding: "12px 16px" }}><Badge label={expense.category} /></td>
                  <td style={{ padding: "12px 16px", fontFamily: "Cormorant Garamond, serif", fontSize: 17, fontWeight: 700, color: "#c0392b", whiteSpace: "nowrap" }}>{fmtMoney(expense.amount)}</td>
                  <td style={{ padding: "12px 16px" }}>
                    {expense.receiptUrl ? (
                      <a href={expense.receiptUrl} target="_blank" rel="noopener" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#2a6b4a", textDecoration: "none" }}>
                        <Receipt size={12} />View
                      </a>
                    ) : <span style={{ color: "#e8d5b0", fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button onClick={() => openEdit(expense)} style={{ background: "none", border: "none", cursor: "pointer", color: "#a89880", padding: 4 }}><Edit3 size={13} /></button>
                      <button onClick={() => setDeleteId(expense.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b", padding: 4 }}><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Add/Edit Modal ── */}
      {showForm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
          onClick={e => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="slide-in" style={{ background: "#fff", borderRadius: 14, padding: 28, width: "100%", maxWidth: 540, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "Cormorant Garamond, serif", fontSize: 22, margin: 0 }}>{editId ? "Edit Expense" : "Add Expense"}</h2>
              <button onClick={resetForm} style={{ background: "none", border: "none", cursor: "pointer", color: "#a89880" }}><X size={16} /></button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <Field label="Date *">
                  <input style={INPUT} type="date" value={form.date || ""} onChange={e => setF("date", e.target.value)} required />
                </Field>
                <Field label="Amount ($) *">
                  <input style={INPUT} type="number" min="0" step="0.01" placeholder="0.00" value={form.amount || ""} onChange={e => setF("amount", parseFloat(e.target.value) || 0)} required />
                </Field>
              </div>
              <Field label="Vendor / Payee *">
                <input style={INPUT} placeholder="e.g. Zillow, Office Depot, Starbucks" value={form.vendor || ""} onChange={e => setF("vendor", e.target.value)} required />
              </Field>
              <Field label="Description">
                <input style={INPUT} placeholder="What was this for?" value={form.description || ""} onChange={e => setF("description", e.target.value)} />
              </Field>
              <Field label="Category *">
                <select style={SELECT} value={form.category || "Other"} onChange={e => setF("category", e.target.value)}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>

              {/* Receipt upload */}
              <Field label="Receipt">
                <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                  {form.receiptUrl ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: "#f0faf4", borderRadius: 8, border: "1px solid #a8d5b5" }}>
                      <Check size={14} color="#2a6b4a" />
                      <a href={form.receiptUrl} target="_blank" rel="noopener" style={{ fontSize: 12, color: "#2a6b4a", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{form.receiptUrl}</a>
                      <button type="button" onClick={() => setF("receiptUrl", "")} style={{ background: "none", border: "none", cursor: "pointer", color: "#c0392b" }}><X size={12} /></button>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {canUpload && (
                        <>
                          <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "#f5efe7", border: "1px solid #e8d5b0", cursor: "pointer", color: "#7a6a5a" }}>
                            {uploading ? "Uploading…" : <><Camera size={12} />Upload Photo / PDF</>}
                          </button>
                          <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                        </>
                      )}
                      <button type="button" onClick={() => setUrlMode(v => !v)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, fontSize: 12, fontWeight: 600, background: "#f5efe7", border: "1px solid #e8d5b0", cursor: "pointer", color: "#7a6a5a" }}>
                        <LinkIcon size={12} />Paste URL
                      </button>
                      {!canUpload && <span style={{ fontSize: 11, color: "#a89880", alignSelf: "center" }}>Direct upload requires R2 setup</span>}
                    </div>
                  )}
                  {urlMode && !form.receiptUrl && (
                    <input style={INPUT} placeholder="https://drive.google.com/... or Dropbox link" value={form.receiptUrl || ""} onChange={e => setF("receiptUrl", e.target.value)} />
                  )}
                </div>
              </Field>

              <Field label="Notes">
                <textarea style={{ ...INPUT, minHeight: 64, resize: "vertical" }} placeholder="Additional notes…" value={form.notes || ""} onChange={e => setF("notes", e.target.value)} />
              </Field>

              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                <input type="checkbox" checked={!!form.taxDeductible} onChange={e => setF("taxDeductible", e.target.checked)} style={{ accentColor: "#2a6b4a", width: 15, height: 15 }} />
                <span style={{ fontWeight: 600, color: "#2c2218" }}>Tax deductible</span>
                <span style={{ color: "#a89880", fontSize: 12 }}>(business expense)</span>
              </label>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
                <button type="button" onClick={resetForm} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: "transparent", color: "#7a6a5a", border: "1px solid #e8e0d4", cursor: "pointer" }}>Cancel</button>
                <button type="submit" disabled={createMut.isPending || updateMut.isPending}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 20px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: "#2a6b4a", color: "#fff", border: "none", cursor: "pointer", opacity: createMut.isPending || updateMut.isPending ? 0.6 : 1 }}>
                  <Check size={13} />{editId ? "Save Changes" : "Add Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ── */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div className="slide-in" style={{ background: "#fff", borderRadius: 12, padding: 28, maxWidth: 340, width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
              <Trash2 size={20} color="#c0392b" />
              <p style={{ margin: 0, fontSize: 14 }}>Delete this expense? This can't be undone.</p>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button onClick={() => setDeleteId(null)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: "transparent", color: "#7a6a5a", border: "1px solid #e8e0d4", cursor: "pointer" }}>Cancel</button>
              <button onClick={() => deleteMut.mutate(deleteId)} disabled={deleteMut.isPending}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: "#c0392b", color: "#fff", border: "none", cursor: "pointer" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
