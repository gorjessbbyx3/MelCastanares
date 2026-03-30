import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Plus, Trash2, FolderOpen, ExternalLink, Search, File,
  FileText, Image, Link2, Home, X, FolderPlus, Upload,
  Download, Edit3, Move, Folder, ChevronRight, AlertCircle,
  FileImage, FileVideo, Music, Archive, Code, MoreVertical,
} from "lucide-react";
import { api, type CRMFile } from "../lib/api";

// ── Helpers ───────────────────────────────────────────────────────────
function fmtSize(bytes: number): string {
  if (!bytes) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / 1024 / 1024).toFixed(1) + " MB";
}
function fmtDate(iso: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fileIcon(name: string, contentType: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["jpg","jpeg","png","gif","webp","svg","heic"].includes(ext) || contentType?.startsWith("image/")) return <FileImage size={16} />;
  if (["mp4","mov","avi","mkv","webm"].includes(ext) || contentType?.startsWith("video/")) return <FileVideo size={16} />;
  if (["mp3","wav","aac","m4a"].includes(ext) || contentType?.startsWith("audio/")) return <Music size={16} />;
  if (["pdf"].includes(ext)) return <FileText size={16} />;
  if (["zip","rar","7z","tar","gz"].includes(ext)) return <Archive size={16} />;
  if (["js","ts","jsx","tsx","html","css","json","py","sql"].includes(ext)) return <Code size={16} />;
  if (["doc","docx","txt","rtf"].includes(ext)) return <FileText size={16} />;
  return <File size={16} />;
}

// ── Link manager types ────────────────────────────────────────────────
const CATEGORIES = ["all","listing","contract","marketing","photo","document","link","other"];
const CAT_COLORS: Record<string, { color: string; bg: string }> = {
  listing: { color: "#2a7a4a", bg: "#d1f0e1" },
  contract: { color: "#1e5a8a", bg: "#dbeafe" },
  marketing: { color: "#7a2a7a", bg: "#ead5f5" },
  photo: { color: "#d4851a", bg: "#fde9c8" },
  document: { color: "#2a6b4a", bg: "#d1f5e0" },
  link: { color: "#c9a96e", bg: "#fdf4e3" },
  other: { color: "#7a6a5a", bg: "#f0ece6" },
};

interface R2Item { key: string; name: string; size?: number; uploaded?: string; isFolder: boolean; contentType?: string; }
interface R2ListResult { folders: R2Item[]; files: R2Item[]; prefix: string; available: boolean; }

// ── Modal ─────────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, wide }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; wide?: boolean }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box slide-in" style={{ maxWidth: wide ? 600 : 460 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#7a6a5a" }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Link Form ─────────────────────────────────────────────────────────
function LinkForm({ file, onSave, onCancel, saving }: { file: Partial<CRMFile>; onSave: (d: Partial<CRMFile>) => void; onCancel: () => void; saving?: boolean }) {
  const [form, setForm] = useState<Partial<CRMFile>>({ name: "", category: "document", url: "", notes: "", size: "", ...file });
  const upd = (k: keyof CRMFile, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Name *</label>
        <input className="crm-input" value={form.name} onChange={e => upd("name", e.target.value)} placeholder="e.g. 123 Kaimuki Ave – Listing Photos" autoFocus /></div>
      <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Category</label>
        <select className="crm-input" value={form.category} onChange={e => upd("category", e.target.value)}>
          {CATEGORIES.filter(c => c !== "all").map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
        </select></div>
      <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>URL / Link *</label>
        <input className="crm-input" type="url" value={form.url} onChange={e => upd("url", e.target.value)} placeholder="https://drive.google.com/…" /></div>
      <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Notes</label>
        <textarea className="crm-input" rows={2} value={form.notes} onChange={e => upd("notes", e.target.value)} style={{ resize: "vertical" }} /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="crm-btn crm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="crm-btn crm-btn-primary" onClick={() => onSave(form)} disabled={!form.name || !form.url || saving}>{saving ? "Saving…" : "Save Link"}</button>
      </div>
    </div>
  );
}

// ── R2 File Manager ───────────────────────────────────────────────────
function R2FileManager() {
  const qc = useQueryClient();
  const [folder, setFolder] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renaming, setRenaming] = useState<R2Item | null>(null);
  const [newName, setNewName] = useState("");
  const [moving, setMoving] = useState<R2Item | null>(null);
  const [moveDest, setMoveDest] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const statusQ = useQuery<{ available: boolean }>({ queryKey: ["r2-status"], queryFn: () => api.r2Status() });
  const listQ = useQuery<R2ListResult>({ queryKey: ["r2-list", folder], queryFn: () => api.r2List(folder), enabled: statusQ.data?.available === true });

  const createFolderMut = useMutation({
    mutationFn: ({ folder: f, name }: { folder: string; name: string }) => api.r2CreateFolder(f, name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["r2-list"] }); setShowNewFolder(false); setNewFolderName(""); },
  });
  const deleteMut = useMutation({
    mutationFn: (key: string) => api.r2Delete(key),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["r2-list"] }),
  });
  const moveMut = useMutation({
    mutationFn: ({ oldKey, newKey }: { oldKey: string; newKey: string }) => api.r2Move(oldKey, newKey),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["r2-list"] }); setRenaming(null); setMoving(null); },
  });

  const breadcrumbs = folder ? folder.split("/").filter(Boolean) : [];

  async function handleUpload(files: FileList | null) {
    if (!files || !files.length) return;
    setUploading(true);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      setUploadProgress(`Uploading ${f.name} (${i + 1}/${files.length})…`);
      await api.r2Upload(folder, f);
    }
    setUploading(false);
    setUploadProgress("");
    qc.invalidateQueries({ queryKey: ["r2-list"] });
    if (fileInput.current) fileInput.current.value = "";
  }

  if (statusQ.isLoading) return <div style={{ padding: 40, textAlign: "center", color: "#a89880" }}>Checking storage…</div>;

  if (!statusQ.data?.available) {
    return (
      <div style={{ padding: "40px 24px", textAlign: "center" }}>
        <div style={{ width: 60, height: 60, borderRadius: 16, background: "#f5efe7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><FolderOpen size={28} color="#c9a96e" /></div>
        <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 8 }}>R2 Storage Not Configured</div>
        <div style={{ fontSize: 13, color: "#7a6a5a", maxWidth: 440, margin: "0 auto 20px", lineHeight: 1.7 }}>
          To enable file uploads, create an R2 bucket and add the binding to your Cloudflare Pages project.
        </div>
        <div className="card" style={{ padding: 20, maxWidth: 440, margin: "0 auto", textAlign: "left" }}>
          <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 10 }}>Setup Instructions</div>
          <ol style={{ fontSize: 12, color: "#7a6a5a", lineHeight: 2, paddingLeft: 18, margin: 0 }}>
            <li>Go to Cloudflare dashboard → R2 → Create bucket</li>
            <li>Name it <code style={{ background: "#f5efe7", padding: "1px 5px", borderRadius: 3 }}>mel-crm-files</code></li>
            <li>In your Pages project → Settings → Functions → R2 bucket bindings</li>
            <li>Add binding: Variable name <code style={{ background: "#f5efe7", padding: "1px 5px", borderRadius: 3 }}>FILES_BUCKET</code> → <code style={{ background: "#f5efe7", padding: "1px 5px", borderRadius: 3 }}>mel-crm-files</code></li>
            <li>Redeploy the CRM</li>
          </ol>
        </div>
      </div>
    );
  }

  const items = listQ.data;
  const folders = items?.folders || [];
  const files = items?.files || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        {/* Breadcrumb */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 6, fontSize: 13, flexWrap: "wrap" }}>
          <button onClick={() => setFolder("")} style={{ background: "none", border: "none", cursor: "pointer", color: folder ? "#c9a96e" : "#1a2c24", fontWeight: 600, padding: 0, display: "flex", alignItems: "center", gap: 4 }}>
            <Home size={13} />Root
          </button>
          {breadcrumbs.map((crumb, i) => {
            const path = breadcrumbs.slice(0, i + 1).join("/");
            return (
              <span key={i} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <ChevronRight size={12} color="#a89880" />
                <button onClick={() => setFolder(path)} style={{ background: "none", border: "none", cursor: "pointer", color: i === breadcrumbs.length - 1 ? "#1a2c24" : "#c9a96e", fontWeight: 600, padding: 0 }}>{crumb}</button>
              </span>
            );
          })}
        </div>
        <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => setShowNewFolder(true)}><FolderPlus size={13} />New Folder</button>
        <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={() => fileInput.current?.click()} disabled={uploading}>
          <Upload size={13} />{uploading ? uploadProgress || "Uploading…" : "Upload Files"}
        </button>
        <input ref={fileInput} type="file" multiple style={{ display: "none" }} onChange={e => handleUpload(e.target.files)} />
      </div>

      {/* New folder input */}
      {showNewFolder && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input className="crm-input" style={{ flex: 1 }} value={newFolderName} onChange={e => setNewFolderName(e.target.value)}
            placeholder="Folder name" autoFocus onKeyDown={e => { if (e.key === "Enter" && newFolderName) createFolderMut.mutate({ folder, name: newFolderName }); if (e.key === "Escape") { setShowNewFolder(false); setNewFolderName(""); } }} />
          <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={() => newFolderName && createFolderMut.mutate({ folder, name: newFolderName })} disabled={!newFolderName || createFolderMut.isPending}>Create</button>
          <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => { setShowNewFolder(false); setNewFolderName(""); }}>Cancel</button>
        </div>
      )}

      {/* File listing */}
      {listQ.isLoading ? (
        <div style={{ padding: 40, textAlign: "center", color: "#a89880" }}>Loading…</div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "#a89880" }}>
          <FolderOpen size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ marginBottom: 12 }}>This folder is empty</div>
          <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={() => fileInput.current?.click()}><Upload size={13} />Upload First File</button>
        </div>
      ) : (
        <div className="card" style={{ overflow: "hidden" }}>
          {/* Folders */}
          {folders.map(f => (
            <div key={f.key} style={{ padding: "12px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
              onClick={() => setFolder(f.key.endsWith("/") ? f.key.slice(0, -1) : f.key)}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: "#fdf4e3", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Folder size={16} color="#c9a96e" /></div>
              <div style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{f.name}/</div>
              <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
                <button title="Delete folder" onClick={() => { if (confirm(`Delete folder "${f.name}" and all its contents?`)) deleteMut.mutate(f.key); }}
                  style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c0392b" }}><Trash2 size={12} /></button>
              </div>
            </div>
          ))}
          {/* Files */}
          {files.map(f => {
            const prefix = folder ? (folder.endsWith("/") ? folder : folder + "/") : "";
            return (
              <div key={f.key} style={{ padding: "12px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: "#f5efe7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#7a6a5a" }}>{fileIcon(f.name, f.contentType || "")}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                  <div style={{ fontSize: 12, color: "#a89880", marginTop: 2 }}>{fmtSize(f.size || 0)} · {fmtDate(f.uploaded || "")}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <a href={`${import.meta.env.BASE_URL?.replace(/\/$/, "")}/api/r2/download?key=${encodeURIComponent(f.key)}`}
                    title="Download" style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e8e0d4", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#2a6b4a" }}><Download size={12} /></a>
                  <button title="Rename" onClick={() => { setRenaming(f); setNewName(f.name); }}
                    style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a6a5a" }}><Edit3 size={12} /></button>
                  <button title="Move to folder" onClick={() => { setMoving(f); setMoveDest(""); }}
                    style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#1e5a8a" }}><Move size={12} /></button>
                  <button title="Delete" onClick={() => { if (confirm(`Delete "${f.name}"?`)) deleteMut.mutate(f.key); }}
                    style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c0392b" }}><Trash2 size={12} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rename modal */}
      <Modal open={!!renaming} onClose={() => setRenaming(null)} title="Rename File">
        {renaming && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>New name</label>
              <input className="crm-input" value={newName} onChange={e => setNewName(e.target.value)} autoFocus
                onKeyDown={e => { if (e.key === "Enter" && newName) { const prefix = renaming.key.slice(0, renaming.key.length - renaming.name.length); moveMut.mutate({ oldKey: renaming.key, newKey: prefix + newName }); } }} /></div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="crm-btn crm-btn-ghost" onClick={() => setRenaming(null)}>Cancel</button>
              <button className="crm-btn crm-btn-primary" onClick={() => { if (newName) { const prefix = renaming.key.slice(0, renaming.key.length - renaming.name.length); moveMut.mutate({ oldKey: renaming.key, newKey: prefix + newName }); } }} disabled={!newName || moveMut.isPending}>Rename</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Move modal */}
      <Modal open={!!moving} onClose={() => setMoving(null)} title="Move File">
        {moving && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, color: "#7a6a5a" }}>Moving: <strong>{moving.name}</strong></div>
            <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Destination folder path (leave blank for root)</label>
              <input className="crm-input" value={moveDest} onChange={e => setMoveDest(e.target.value)} placeholder="e.g. contracts or listings/oahu" /></div>
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
              <button className="crm-btn crm-btn-ghost" onClick={() => setMoving(null)}>Cancel</button>
              <button className="crm-btn crm-btn-primary" onClick={() => { const dest = moveDest ? (moveDest.endsWith("/") ? moveDest : moveDest + "/") : ""; moveMut.mutate({ oldKey: moving.key, newKey: dest + moving.name }); }} disabled={moveMut.isPending}>Move</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

// ── Link Manager ──────────────────────────────────────────────────────
function LinkManager() {
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative" }}>
          <Search size={14} color="#a89880" style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input className="crm-input" style={{ paddingLeft: 32, width: 220 }} placeholder="Search links…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div style={{ display: "flex", gap: 6, flex: 1, flexWrap: "wrap" }}>
          {CATEGORIES.map(c => {
            const count = c === "all" ? files.length : files.filter(f => f.category === c).length;
            const active = filterCat === c;
            const cc = CAT_COLORS[c] || CAT_COLORS.other;
            return (
              <button key={c} onClick={() => setFilterCat(c)} style={{ padding: "5px 12px", borderRadius: 20, fontSize: 11, cursor: "pointer", fontWeight: active ? 600 : 400, background: active ? (c === "all" ? "#1a2c24" : cc.bg) : "#fff", color: active ? (c === "all" ? "#c9a96e" : cc.color) : "#7a6a5a", border: `1px solid ${active ? (c === "all" ? "#1a2c24" : cc.color) : "#e8e0d4"}`, textTransform: "capitalize" }}>
                {c} ({count})
              </button>
            );
          })}
        </div>
        <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={() => setShowAdd(true)}><Plus size={13} />Add Link</button>
      </div>

      {isLoading ? <div style={{ padding: 40, textAlign: "center", color: "#a89880" }}>Loading…</div> : filtered.length === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", color: "#a89880" }}>
          <Link2 size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div style={{ marginBottom: 12 }}>{search ? "No links match your search" : "No links yet"}</div>
          {!search && <button className="crm-btn crm-btn-primary crm-btn-sm" onClick={() => setShowAdd(true)}><Plus size={13} />Add First Link</button>}
        </div>
      ) : (
        <div className="card">
          {filtered.map(f => {
            const cc = CAT_COLORS[f.category] || CAT_COLORS.other;
            return (
              <div key={f.id} style={{ padding: "13px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 34, height: 34, borderRadius: 8, background: cc.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Link2 size={14} color={cc.color} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{f.name}</div>
                  <div style={{ display: "flex", gap: 10, marginTop: 2, fontSize: 12, color: "#a89880", flexWrap: "wrap" }}>
                    <span style={{ textTransform: "capitalize", background: cc.bg, color: cc.color, padding: "1px 6px", borderRadius: 10 }}>{f.category}</span>
                    {f.notes && <span style={{ fontStyle: "italic" }}>{f.notes}</span>}
                    <span>{fmtDate(f.createdAt)}</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  {f.url && <a href={f.url} target="_blank" rel="noopener" title="Open link" style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e8e0d4", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", color: "#2a6b4a" }}><ExternalLink size={12} /></a>}
                  <button onClick={() => setEditing(f)} title="Edit" style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a6a5a" }}><Edit3 size={12} /></button>
                  <button onClick={() => deleteMut.mutate(f.id)} title="Delete" style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c0392b" }}><Trash2 size={12} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Link / Resource">
        <LinkForm file={{}} onSave={d => createMut.mutate(d)} onCancel={() => setShowAdd(false)} saving={createMut.isPending} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Link">
        {editing && <LinkForm file={editing} onSave={d => updateMut.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} saving={updateMut.isPending} />}
      </Modal>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────
export default function FilesPage() {
  const [tab, setTab] = useState<"files" | "links">("files");

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}><FolderOpen size={22} color="#c9a96e" />Files</h1>
          <p className="section-sub">Upload & manage files · Save links & resources</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 20, borderBottom: "2px solid #e8e0d4" }}>
        {([["files", "Cloud Files", <Upload size={13} />], ["links", "Links & Resources", <Link2 size={13} />]] as const).map(([id, label, icon]) => (
          <button key={id} onClick={() => setTab(id)} style={{ padding: "10px 20px", background: "none", border: "none", cursor: "pointer", fontWeight: tab === id ? 700 : 400, color: tab === id ? "#1a2c24" : "#7a6a5a", borderBottom: `2px solid ${tab === id ? "#c9a96e" : "transparent"}`, marginBottom: -2, display: "flex", alignItems: "center", gap: 6, fontSize: 13, transition: "all 0.15s" }}>
            {icon}{label}
          </button>
        ))}
      </div>

      {tab === "files" && <R2FileManager />}
      {tab === "links" && (
        <>
          {/* ── Pinned Resource Shortcuts ── */}
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a89880", marginBottom: 10 }}>Pinned Resources</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
              {[
                { name: "HI Central – MLS Forms & Docs", url: "https://members.hicentral.com/index.php/mls-forms-docs", color: "#c0392b", bg: "#fde8e5", desc: "Forms, contracts & MLS documentation" },
                { name: "HI Central – Member Portal", url: "https://members.hicentral.com", color: "#c0392b", bg: "#fde8e5", desc: "HI Central member login & resources" },
              ].map(r => (
                <a key={r.name} href={r.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "none", flex: "1 1 260px", maxWidth: 380 }}>
                  <div style={{ background: "#fff", border: "1px solid #e8e0d4", borderRadius: 10, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, transition: "box-shadow 0.15s" }}
                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "0 3px 14px rgba(0,0,0,0.09)"}
                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = ""}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, background: r.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Link2 size={15} color={r.color} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#2c2218", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                      <div style={{ fontSize: 11, color: "#7a6a5a" }}>{r.desc}</div>
                    </div>
                    <ExternalLink size={12} color="#a89880" style={{ flexShrink: 0 }} />
                  </div>
                </a>
              ))}
            </div>
          </div>
          <LinkManager />
        </>
      )}
    </div>
  );
}
