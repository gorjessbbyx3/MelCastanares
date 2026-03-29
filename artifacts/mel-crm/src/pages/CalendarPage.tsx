import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Edit3, Home, Phone,
  Calendar, MapPin, Users, X, Sparkles, Send, Clock
} from "lucide-react";
import { api, type CRMEvent, type Lead } from "../lib/api";

const EVENT_TYPES = {
  appointment: { label: "Appointment", color: "#1e5a8a", bg: "#dbeafe" },
  "open-house": { label: "Open House", color: "#2a7a4a", bg: "#d1f0e1" },
  showing: { label: "Showing", color: "#c9a96e", bg: "#fdf4e3" },
  closing: { label: "Closing", color: "#d4851a", bg: "#fde9c8" },
  call: { label: "Call", color: "#5a2a7a", bg: "#ead5f5" },
  personal: { label: "Personal", color: "#7a6a5a", bg: "#f0ece6" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

const now = () => new Date().toISOString();
const EMPTY: Partial<CRMEvent> = { title: "", type: "appointment", date: "", time: "", endTime: "", leadName: "", location: "", notes: "" };

function Modal({ open, onClose, title, children, width = 480 }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode; width?: number }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal-box slide-in" style={{ maxWidth: width }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <h2 className="modal-title" style={{ margin: 0 }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "#7a6a5a" }}><X size={16} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

function EventForm({ event, leads, onSave, onCancel, saving }: { event: Partial<CRMEvent>; leads: Lead[]; onSave: (d: Partial<CRMEvent>) => void; onCancel: () => void; saving?: boolean }) {
  const [form, setForm] = useState<Partial<CRMEvent>>({ ...EMPTY, ...event });
  const upd = (k: keyof CRMEvent, v: unknown) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Title *</label>
        <input className="crm-input" value={form.title} onChange={e => upd("title", e.target.value)} placeholder="e.g. Open House at 123 Kaimuki Ave" autoFocus /></div>
      <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Type</label>
        <select className="crm-input" value={form.type} onChange={e => upd("type", e.target.value)}>
          {Object.entries(EVENT_TYPES).map(([v, { label }]) => <option key={v} value={v}>{label}</option>)}
        </select></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
        <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Date *</label>
          <input className="crm-input" type="date" value={form.date} onChange={e => upd("date", e.target.value)} /></div>
        <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Start Time</label>
          <input className="crm-input" type="time" value={form.time} onChange={e => upd("time", e.target.value)} /></div>
        <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>End Time</label>
          <input className="crm-input" type="time" value={form.endTime} onChange={e => upd("endTime", e.target.value)} /></div>
      </div>
      <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Location</label>
        <input className="crm-input" value={form.location} onChange={e => upd("location", e.target.value)} placeholder="Address or Zoom link" /></div>
      <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Linked Lead</label>
        <select className="crm-input" value={form.leadId || ""} onChange={e => { const lead = leads.find(l => l.id === e.target.value); setForm(f => ({ ...f, leadId: e.target.value, leadName: lead?.name || "" })); }}>
          <option value="">None</option>
          {leads.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select></div>
      <div><label style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a", display: "block", marginBottom: 5 }}>Notes</label>
        <textarea className="crm-input" rows={2} value={form.notes} onChange={e => upd("notes", e.target.value)} style={{ resize: "vertical" }} /></div>
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
        <button className="crm-btn crm-btn-ghost" onClick={onCancel}>Cancel</button>
        <button className="crm-btn crm-btn-primary" onClick={() => onSave(form)} disabled={!form.title || !form.date || saving}>{saving ? "Saving…" : "Save Event"}</button>
      </div>
    </div>
  );
}

function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr % 12 || 12}:${m} ${hr < 12 ? "AM" : "PM"}`;
}

export default function CalendarPage() {
  const qc = useQueryClient();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CRMEvent | null>(null);
  const [addForDate, setAddForDate] = useState("");
  const [aiMsg, setAiMsg] = useState("");
  const [aiReply, setAiReply] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const aiRef = useRef<HTMLInputElement>(null);

  const { data: events = [] } = useQuery<CRMEvent[]>({ queryKey: ["events"], queryFn: api.getEvents });
  const { data: leads = [] } = useQuery<Lead[]>({ queryKey: ["leads"], queryFn: api.getLeads });

  const createMut = useMutation({ mutationFn: (d: Partial<CRMEvent>) => api.createEvent(d), onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); setShowAdd(false); setEditing(null); } });
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: Partial<CRMEvent> }) => api.updateEvent(id, data), onSuccess: () => { qc.invalidateQueries({ queryKey: ["events"] }); setEditing(null); } });
  const deleteMut = useMutation({ mutationFn: (id: string) => api.deleteEvent(id), onSuccess: () => qc.invalidateQueries({ queryKey: ["events"] }) });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  while (cells.length % 7 !== 0) cells.push(null);

  const getEventsForDate = (d: number) => {
    const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    return events.filter(e => e.date === ds);
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const selectedEvents = selectedDate ? events.filter(e => e.date === selectedDate) : [];

  // Upcoming events
  const upcoming = [...events].filter(e => e.date >= todayStr).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);

  const handleAiBook = async () => {
    if (!aiMsg.trim()) return;
    setAiLoading(true);
    setAiReply("");
    try {
      const res = await api.aiChat(aiMsg, { events: upcoming.map(e => `${e.date} ${e.time || ""}: ${e.title}`).join(", "), leads: [] });
      setAiReply(res.message);
      if (res.action === "create_event" && res.event) {
        await createMut.mutateAsync(res.event);
        setAiReply(prev => prev + "\n\n✅ Event created on your calendar!");
      }
    } catch { setAiReply("AI booking is available when deployed to Cloudflare. In local dev, add events manually."); }
    setAiLoading(false);
  };

  return (
    <div className="fade-in">
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20 }}>
        <div><h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}><Calendar size={22} color="#c9a96e" />Calendar</h1>
          <p className="section-sub">Appointments, open houses, and your schedule</p></div>
        <button className="crm-btn crm-btn-primary" onClick={() => { setAddForDate(todayStr); setShowAdd(true); }}><Plus size={15} />Add Event</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20 }}>
        <div>
          {/* Calendar Grid */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 12 }}>
              <button onClick={prevMonth} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#7a6a5a" }}><ChevronLeft size={18} /></button>
              <span style={{ flex: 1, textAlign: "center", fontFamily: "Cormorant Garamond, Georgia, serif", fontSize: 18, fontWeight: 600 }}>{MONTHS[month]} {year}</span>
              <button onClick={nextMonth} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "#7a6a5a" }}><ChevronRight size={18} /></button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" }}>
              {DAYS.map(d => <div key={d} style={{ padding: "8px 0", fontSize: 11, fontWeight: 700, color: "#a89880", textTransform: "uppercase", letterSpacing: "0.05em" }}>{d}</div>)}
              {cells.map((day, i) => {
                if (!day) return <div key={i} style={{ minHeight: 70, background: "#fdfaf6" }} />;
                const ds = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dayEvents = getEventsForDate(day);
                const isToday = ds === todayStr;
                const isSelected = ds === selectedDate;
                return (
                  <div key={i} onClick={() => setSelectedDate(ds === selectedDate ? null : ds)} style={{ minHeight: 70, padding: "6px 4px", border: "0.5px solid #e8e0d4", cursor: "pointer", background: isSelected ? "#f0f8f2" : isToday ? "#fdfaf6" : "#fff", position: "relative" }}>
                    <div style={{ width: 24, height: 24, borderRadius: "50%", background: isToday ? "#1a2c24" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 4px", fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? "#c9a96e" : "#2c2218" }}>{day}</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                      {dayEvents.slice(0, 2).map(ev => {
                        const tc = EVENT_TYPES[ev.type as keyof typeof EVENT_TYPES] || EVENT_TYPES.appointment;
                        return <div key={ev.id} style={{ fontSize: 9, fontWeight: 600, color: tc.color, background: tc.bg, borderRadius: 3, padding: "1px 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>;
                      })}
                      {dayEvents.length > 2 && <div style={{ fontSize: 9, color: "#a89880" }}>+{dayEvents.length - 2} more</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Day Events */}
          {selectedDate && (
            <div className="card" style={{ marginBottom: 16 }}>
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
                <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => { setAddForDate(selectedDate); setShowAdd(true); }}><Plus size={12} />Add</button>
              </div>
              {selectedEvents.length === 0 ? (
                <div style={{ padding: "24px 16px", textAlign: "center", color: "#a89880", fontSize: 13 }}>No events. Click "Add" to schedule something.</div>
              ) : selectedEvents.map(ev => {
                const tc = EVENT_TYPES[ev.type as keyof typeof EVENT_TYPES] || EVENT_TYPES.appointment;
                return (
                  <div key={ev.id} style={{ padding: "12px 16px", borderBottom: "1px solid #e8e0d4", display: "flex", gap: 12 }}>
                    <div style={{ width: 4, background: tc.color, borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 3 }}>{ev.title}</div>
                      <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#7a6a5a", flexWrap: "wrap" }}>
                        {ev.time && <span><Clock size={11} style={{ verticalAlign: "middle" }} /> {fmtTime(ev.time)}{ev.endTime ? ` – ${fmtTime(ev.endTime)}` : ""}</span>}
                        {ev.location && <span><MapPin size={11} style={{ verticalAlign: "middle" }} /> {ev.location}</span>}
                        {ev.leadName && <span><Users size={11} style={{ verticalAlign: "middle" }} /> {ev.leadName}</span>}
                      </div>
                      {ev.notes && <div style={{ fontSize: 12, color: "#a89880", marginTop: 4, fontStyle: "italic" }}>{ev.notes}</div>}
                    </div>
                    <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                      <button style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#7a6a5a" }} onClick={() => setEditing(ev)}><Edit3 size={12} /></button>
                      <button style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c0392b" }} onClick={() => deleteMut.mutate(ev.id)}><Trash2 size={12} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Sidebar */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Upcoming */}
          <div className="card">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 8 }}>
              <Calendar size={14} color="#c9a96e" /><span style={{ fontSize: 13, fontWeight: 600 }}>Upcoming</span>
            </div>
            {upcoming.length === 0 ? (
              <div style={{ padding: "20px 16px", textAlign: "center", color: "#a89880", fontSize: 12 }}>No upcoming events</div>
            ) : upcoming.map(ev => {
              const tc = EVENT_TYPES[ev.type as keyof typeof EVENT_TYPES] || EVENT_TYPES.appointment;
              const dt = new Date(ev.date + "T12:00:00");
              return (
                <div key={ev.id} style={{ padding: "10px 14px", borderBottom: "1px solid #e8e0d4", display: "flex", gap: 10, cursor: "pointer" }} onClick={() => { setSelectedDate(ev.date); setMonth(dt.getMonth()); setYear(dt.getFullYear()); }}>
                  <div style={{ flexShrink: 0, textAlign: "center", minWidth: 36 }}>
                    <div style={{ fontSize: 10, color: "#a89880", textTransform: "uppercase" }}>{dt.toLocaleDateString("en-US", { month: "short" })}</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: tc.color }}>{dt.getDate()}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</div>
                    <div style={{ fontSize: 11, color: "#a89880" }}>{ev.time ? fmtTime(ev.time) : ""} {ev.leadName ? `· ${ev.leadName}` : ""}</div>
                  </div>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: tc.color, flexShrink: 0, marginTop: 6 }} />
                </div>
              );
            })}
          </div>

          {/* AI Booking Assistant */}
          <div className="card">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 8 }}>
              <Sparkles size={14} color="#c9a96e" /><span style={{ fontSize: 13, fontWeight: 600 }}>AI Booking</span>
            </div>
            <div style={{ padding: "14px 14px" }}>
              <div style={{ fontSize: 11, color: "#7a6a5a", marginBottom: 10 }}>Type naturally: "Schedule open house at 123 Main St on Saturday at 10am"</div>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <input ref={aiRef} className="crm-input" style={{ flex: 1, fontSize: 12 }} value={aiMsg} onChange={e => setAiMsg(e.target.value)} placeholder="Book a showing…" onKeyDown={e => e.key === "Enter" && handleAiBook()} />
                <button className="crm-btn crm-btn-primary" style={{ padding: "8px 10px" }} onClick={handleAiBook} disabled={aiLoading}><Send size={14} /></button>
              </div>
              {aiLoading && <div style={{ fontSize: 12, color: "#7a6a5a" }}>AI is thinking…</div>}
              {aiReply && <div style={{ fontSize: 12, color: "#2c2218", background: "#f5efe7", borderRadius: 6, padding: "10px 12px", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{aiReply}</div>}
            </div>
          </div>

          {/* Legend */}
          <div className="card">
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #e8e0d4" }}><span style={{ fontSize: 12, fontWeight: 600, color: "#7a6a5a" }}>Event Types</span></div>
            <div style={{ padding: "10px 14px", display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(EVENT_TYPES).map(([k, v]) => (
                <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: v.color }} />
                  <span style={{ color: "#7a6a5a" }}>{v.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Add Event">
        <EventForm event={{ ...EMPTY, date: addForDate }} leads={leads} onSave={d => createMut.mutate(d)} onCancel={() => setShowAdd(false)} saving={createMut.isPending} />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Event">
        {editing && <EventForm event={editing} leads={leads} onSave={d => updateMut.mutate({ id: editing.id, data: d })} onCancel={() => setEditing(null)} saving={updateMut.isPending} />}
      </Modal>
    </div>
  );
}
