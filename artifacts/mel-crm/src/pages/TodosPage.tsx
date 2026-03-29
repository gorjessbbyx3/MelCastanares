import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, CheckCircle2, Circle, Filter, ListTodo } from "lucide-react";
import { api, type Todo } from "../lib/api";

const CATEGORIES = ["general", "listing", "buyer", "marketing", "admin", "personal"];
const CAT_COLORS: Record<string, { color: string; bg: string }> = {
  general: { color: "#7a6a5a", bg: "#f0ece6" },
  listing: { color: "#2a7a4a", bg: "#d1f0e1" },
  buyer: { color: "#1e5a8a", bg: "#dbeafe" },
  marketing: { color: "#7a2a7a", bg: "#ead5f5" },
  admin: { color: "#d4851a", bg: "#fde9c8" },
  personal: { color: "#c0392b", bg: "#fde0dd" },
};

export default function TodosPage() {
  const qc = useQueryClient();
  const { data: todos = [], isLoading } = useQuery<Todo[]>({ queryKey: ["todos"], queryFn: api.getTodos });
  const [newTitle, setNewTitle] = useState("");
  const [newCat, setNewCat] = useState("general");
  const [newDue, setNewDue] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "done">("active");
  const [filterCat, setFilterCat] = useState("all");

  const createMut = useMutation({ mutationFn: (d: Partial<Todo>) => api.createTodo(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["todos"] }); setNewTitle(""); setNewDue(""); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<Todo> }) => api.updateTodo(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }) });
  const deleteMut = useMutation({ mutationFn: (id: string) => api.deleteTodo(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["todos"] }) });

  const addTodo = () => { if (!newTitle.trim()) return; createMut.mutate({ title: newTitle.trim(), category: newCat, dueDate: newDue }); };

  const filtered = todos.filter(t => {
    const matchFilter = filter === "all" || (filter === "active" && !t.completed) || (filter === "done" && t.completed);
    const matchCat = filterCat === "all" || t.category === filterCat;
    return matchFilter && matchCat;
  });

  const activeCnt = todos.filter(t => !t.completed).length;
  const doneCnt = todos.filter(t => t.completed).length;

  const today = new Date().toISOString().slice(0, 10);
  const fmtDue = (d: string) => {
    if (!d) return null;
    if (d < today) return { label: "Overdue", color: "#c0392b" };
    if (d === today) return { label: "Today", color: "#d4851a" };
    return { label: new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }), color: "#7a6a5a" };
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}><ListTodo size={22} color="#c9a96e" />Todos</h1>
        <p className="section-sub">{activeCnt} active · {doneCnt} completed</p>
      </div>

      {/* Add Todo */}
      <div className="card" style={{ marginBottom: 20, padding: "16px 18px" }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input className="crm-input" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Add a todo…" onKeyDown={e => e.key === "Enter" && addTodo()} style={{ flex: 1 }} autoFocus />
          <select className="crm-input" value={newCat} onChange={e => setNewCat(e.target.value)} style={{ width: 120 }}>
            {CATEGORIES.map(c => <option key={c} value={c} style={{ textTransform: "capitalize" }}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
          </select>
          <input className="crm-input" type="date" value={newDue} onChange={e => setNewDue(e.target.value)} style={{ width: 140 }} />
          <button className="crm-btn crm-btn-primary" onClick={addTodo} disabled={!newTitle.trim() || createMut.isPending}><Plus size={15} />Add</button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {(["all", "active", "done"] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: filter === f ? 700 : 400, cursor: "pointer", background: filter === f ? "#1a2c24" : "#fff", color: filter === f ? "#c9a96e" : "#7a6a5a", border: `1px solid ${filter === f ? "#1a2c24" : "#e8e0d4"}` }}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
        <div style={{ width: 1, background: "#e8e0d4", margin: "0 4px" }} />
        <button onClick={() => setFilterCat("all")} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", background: filterCat === "all" ? "#f5efe7" : "#fff", color: filterCat === "all" ? "#2a6b4a" : "#7a6a5a", border: `1px solid ${filterCat === "all" ? "#2a6b4a" : "#e8e0d4"}`, fontWeight: filterCat === "all" ? 600 : 400 }}>All Categories</button>
        {CATEGORIES.map(c => {
          const cc = CAT_COLORS[c];
          return <button key={c} onClick={() => setFilterCat(c === filterCat ? "all" : c)} style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, cursor: "pointer", background: filterCat === c ? cc.bg : "#fff", color: filterCat === c ? cc.color : "#7a6a5a", border: `1px solid ${filterCat === c ? cc.color : "#e8e0d4"}`, fontWeight: filterCat === c ? 600 : 400, textTransform: "capitalize" }}>{c}</button>;
        })}
      </div>

      {isLoading ? <div style={{ textAlign: "center", padding: 60, color: "#a89880" }}>Loading…</div> : (
        <div className="card">
          {filtered.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center", color: "#a89880" }}>
              <CheckCircle2 size={32} color="#2a7a4a" style={{ marginBottom: 12, opacity: 0.4 }} />
              <div style={{ marginBottom: 12 }}>{filter === "done" ? "No completed todos yet" : "Nothing here — add a todo above!"}</div>
            </div>
          ) : filtered.map(todo => {
            const cc = CAT_COLORS[todo.category] || CAT_COLORS.general;
            const due = fmtDue(todo.dueDate);
            return (
              <div key={todo.id} style={{ padding: "12px 16px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => updateMut.mutate({ id: todo.id, data: { completed: !todo.completed } })} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0, padding: 0, color: todo.completed ? "#2a7a4a" : "#a89880" }}>
                  {todo.completed ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 14, fontWeight: todo.completed ? 400 : 500, textDecoration: todo.completed ? "line-through" : "none", color: todo.completed ? "#a89880" : "#2c2218" }}>{todo.title}</span>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: cc.color, background: cc.bg, borderRadius: 20, padding: "2px 8px", textTransform: "capitalize" }}>{todo.category}</span>
                  {due && <span style={{ fontSize: 11, color: due.color, fontWeight: 500 }}>{due.label}</span>}
                  <button onClick={() => deleteMut.mutate(todo.id)} style={{ width: 26, height: 26, borderRadius: 5, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c0392b" }}><Trash2 size={11} /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
