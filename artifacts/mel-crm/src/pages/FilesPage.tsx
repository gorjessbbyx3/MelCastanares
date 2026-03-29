import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, FolderOpen, ExternalLink, Search, File,
  FileText, Image, Link2, Home, X
} from "lucide-react";
import { api, type CRMFile } from "../lib/api";

const CATEGORIES = ["all", "listing", "contract", "marketing", "photo", "document", "link", "other"];
const CAT_COLORS: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
  listing: { color: "#2a7a4a", bg: "#d1f0e1", icon: <Home size={14} /> },
  contract: { color: "#1e5a8a", bg: "#dbeafe", icon: <FileText size={14} /> },
  marketing: { color: "#7a2a7a", bg: "#ead5f5", icon: <Image size={14} /> },
  photo: { color: "#d4851a", bg: "#fde9c8", icon: <Image size={14} /> },
  document: { color: "#2a6b4a", bg: "#d1f5e0", icon: <File size={14} /> },
  link: { color: "#c9a96e", bg: "#fdf4e3", icon: <Link2 size={14} /> },
  other: { color: "#7a6a5a", bg: "#f0ece6", icon: <File size={14} /> },
};

const EMPTY: Partial<CRMFile> = { name: "", category: "document", url: "", notes: "", size: "" };

function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box slide-in" style={{ maxWidth: 460 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#7a6a5a" }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function FileForm({ file, onSave, onCancel, saving }: { file: Partial<CRMFile>; onSave: (d: Partial<CRMFile>) => void; onCancel: () => void; saving?: boolean }) {
  const [form, setForm] = useState<Partial<CRMFile>>({ ...EMPTY, ...file });
  const upd = (k: keyof CRMFile, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Name *</label>
        <input className="crm-input" value={form.name} onChange={e => upd("name", e.target.value)} placeholder="e.g. 123 Kaimuki Ave – Listing Photos" autoFocus /></div>
      <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Category</label>
        <select className="crm-input" value={form.category} onChange={e => upd("category", e.target.value)}>
          {CATEGORIES.filter(c => c !== "all").map(c => <option key={c} value={c} style={{ textTransform: "capitalize" }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select></div>
      <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>URL / Link</label>
        <input className="crm-input" type="url" value={form.url} onChange={e => upd("url", e.target.value)} placeholder="https://drive.google.com/…" /></div>
      <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>File Size / Info</label>
        <input className="crm-input" value={form.size} onChange={e => upd("size", e.target.value)} placeholder="e.g. 12 MB, 24 pages, 18 photos" /></div>
      <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Notes</label>
        <textarea className="crm-input" rows={2} value={form.notes} onChange={e => upd("notes", e.target.value)} style={{ resize: "vertical" }} placeholder="Any additional context…" /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="crm-btn crm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="crm-btn crm-btn-primary" onClick={() => onSave(form)} disabled={!form.name || saving}>{saving ? "Saving…" : "Save File"}</button>
      </div>
    </div>
  );
}

export default function FilesPage() {
  const qc = useQueryClient();
  const { data: files = [], isLoading } = useQuery<CRMFile[]>({ queryKey: ["files"], queryFn: api.getFiles });
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CRMFile | null>(null);
  const [filterCat, setFilterCat] = useState("all");
  const [search, setSearch] = useState("");

  const createMut = useMutation({ mutationFn: (d: Partial<CRMFile>) => api.createFile(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["files"] }); setShowAdd(false); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<CRMFile> }) => api.updateFile(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["files"] }); setEditing(null); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => api.deleteFile(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["files"] }) });

  const filtered = files.filter(f => {
    const matchCat = filterCat === "all" || f.category === filterCat;
    const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || (f.notes || "").toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const grouped: Record<string, CRMFile[]> = {};
  filtered.forEach(f => { const c = f.category || "other"; if (!grouped[c]) grouped[c] = []; grouped[c].push(f); });

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div><h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}><FolderOpen size={22} color="#c9a96e" />Files</h1>
          <p className="section-sub">{files.length} documents, links & resources</p></div>
        <button className="crm-btn crm-btn-primary" onClick={() => setShowAdd(true)}><Plus size={15} />Add File</button>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <Search size={14} color="#a89880" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input className="crm-input" style={{ paddingLeft: 32, width: 240 }} placeholder="Search files…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {CATEGORIES.map(c => {
          const count = c === "all" ? files.length : files.filter(f => f.category === c).length;
          const active = filterCat === c;
          const cc = CAT_COLORS[c] || CAT_COLORS.other;
          return (
            <button key={c} onClick={() => setFilterCat(c)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", fontWeight: active ? 600 : 400, background: active ? (c === "all" ? "#1a2c24" : cc.bg) : "#fff", color: active ? (c === "all" ? "#c9a96e" : cc.color) : "#7a6a5a", border: `1px solid ${active ? (c === "all" ? "#1a2c24" : cc.color) : "#e8e0d4"}`, textTransform: "capitalize" }}>
              {c} ({count})
            </button>
          );
        })}
      </div>

      {isLoading ? <div style={{ textAlign: "center", padding: 60, color: "#a89880" }}>Loading…</div> : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 24px", color: "#a89880" }}>
          <FolderOpen size={36} style={{ marginBottom: 12, opacity: 0.3 }} />
          <div style={{ marginBottom: 16 }}>{search ? "No files match your search" : "No files yet — add your first document or link"}</div>
          {!search && <button className="crm-btn crm-btn-primary" onClick={() => setShowAdd(true)}><Plus size={14} />Add First File</button>}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {Object.entries(grouped).map(([cat, catFiles]) => {
            const cc = CAT_COLORS[cat] || CAT_COLORS.other;
            return (
              <div key={cat}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: cc.color, marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                  {cc.icon}{cat} ({catFiles.length})
                </div>
                <div className="card">
                  {catFiles.map(f => (
                    <div key={f.id} style={{ padding: "14px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: cc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: cc.color }}>{cc.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div>
                        <div style={{ display: "flex", gap: 12, marginTop: 2, fontSize: 12, color: "#7a6a5a", flexWrap: "wrap" }}>
                          {f.size && <span>{f.size}</span>}
                          {f.notes && <span style={{ fontStyle: "italic" }}>{f.notes}</span>}
                          <span>{new Date(f.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                        {f.url && <a href={f.url} target="_blank" rel="noopener" style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #e8e0d4", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#2a6b4a" }}><ExternalLink size={13} /></a>}
                        <button onClick={() => setEditing(f)} style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a6a5a" }}>✏️</button>
                        <button onClick={() => deleteMut.mutate(f.id)} style={{ width: 30, height: 30, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c0392b" }}><Trash2 size={13} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add File / Link"><FileForm file={EMPTY} onSave={d => createMut.mutate(d)} onCancel={() => setShowAdd(false)} saving={createMut.isPending} /></Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit File">{editing && <FileForm file={editing} onSave={d => updateMut.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} saving={updateMut.isPending} />}</Modal>
    </div>
  );
}
