import { useState, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Send, Sparkles, Bot, User, RefreshCw, MessageSquare } from "lucide-react";
import { api, type Lead, type Task, type CRMEvent } from "../lib/api";

interface Message { role: "user" | "assistant"; content: string; time: string; }

const SUGGESTIONS = [
  "Who are my active leads right now?",
  "What's on my calendar this week?",
  "What tasks are overdue?",
  "Give me tips for my next open house",
  "What hashtags should I use for a listing in Kaimuki?",
  "How do I write a good listing caption for Instagram?",
  "What should I post this Saturday at 8am?",
  "Summarize my pipeline status",
];

function fmtTime() {
  return new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export default function AIChatPage() {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Aloha, Mel! 🌺 I'm your AI assistant. I know your leads, calendar, and tasks. Ask me anything — or try one of the suggestions below.",
    time: fmtTime(),
  }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: leads = [] } = useQuery<Lead[]>({ queryKey: ["leads"], queryFn: api.getLeads });
  const { data: tasks = [] } = useQuery<Task[]>({ queryKey: ["tasks"], queryFn: api.getTasks });
  const { data: events = [] } = useQuery<CRMEvent[]>({ queryKey: ["events"], queryFn: api.getEvents });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const buildContext = () => {
    const today = new Date().toISOString().slice(0, 10);
    const activeLeads = leads.filter(l => !["closed", "lost"].includes(l.status));
    const overdueTasks = tasks.filter(t => !t.completed && t.dueDate && t.dueDate < today);
    const todayTasks = tasks.filter(t => !t.completed && t.dueDate === today);
    const upcomingEvents = events.filter(e => e.date >= today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
    return {
      activeLeads: activeLeads.map(l => `${l.name} (${l.intent}, ${l.status}${l.nextStep ? `, next: ${l.nextStep}` : ""})`).join("; "),
      totalLeads: leads.length,
      activeLeadCount: activeLeads.length,
      overdueTasks: overdueTasks.map(t => t.title).join(", ") || "none",
      todayTasks: todayTasks.map(t => t.title).join(", ") || "none",
      events: upcomingEvents.map(e => `${e.date}${e.time ? " " + e.time : ""}: ${e.title}${e.location ? " at " + e.location : ""}`).join("; ") || "none",
      leads: [],
    };
  };

  const send = async (text?: string) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    setInput("");
    const userMsg: Message = { role: "user", content: msg, time: fmtTime() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const ctx = buildContext();
      const res = await api.aiChat(msg, ctx);
      setMessages(prev => [...prev, { role: "assistant", content: res.message, time: fmtTime() }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "⚠️ AI is not available in local development. Deploy to Cloudflare Pages and add the `AI` binding to enable this feature.", time: fmtTime() }]);
    }
    setLoading(false);
  };

  const clearChat = () => setMessages([{ role: "assistant", content: "Chat cleared! How can I help you, Mel?", time: fmtTime() }]);

  return (
    <div className="fade-in" style={{ height: "calc(100vh - 110px)", display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
        <div>
          <h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}><MessageSquare size={22} color="#c9a96e" />AI Assistant</h1>
          <p className="section-sub" style={{ margin: 0 }}>Knows your {leads.length} leads, {tasks.filter(t => !t.completed).length} pending tasks, and {events.length} calendar events</p>
        </div>
        <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={clearChat}><RefreshCw size={12} />Clear</button>
      </div>

      <div style={{ flex: 1, display: "flex", gap: 20, overflow: "hidden", minHeight: 0 }}>
        {/* Chat window */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div className="card" style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 14 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: m.role === "assistant" ? "#1a2c24" : "#c9a96e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {m.role === "assistant" ? <Sparkles size={14} color="#c9a96e" /> : <User size={14} color="#fff" />}
                </div>
                <div style={{ maxWidth: "75%" }}>
                  <div style={{ background: m.role === "user" ? "#1a2c24" : "#fff", color: m.role === "user" ? "#fff" : "#2c2218", borderRadius: m.role === "user" ? "12px 12px 4px 12px" : "12px 12px 12px 4px", padding: "10px 14px", fontSize: 14, lineHeight: 1.6, border: m.role === "assistant" ? "1px solid #e8e0d4" : "none", whiteSpace: "pre-wrap" }}>
                    {m.content}
                  </div>
                  <div style={{ fontSize: 10, color: "#a89880", marginTop: 4, textAlign: m.role === "user" ? "right" : "left" }}>{m.time}</div>
                </div>
              </div>
            ))}
            {loading && (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#1a2c24", display: "flex", alignItems: "center", justifyContent: "center" }}><Sparkles size={14} color="#c9a96e" /></div>
                <div style={{ background: "#fff", border: "1px solid #e8e0d4", borderRadius: "12px 12px 12px 4px", padding: "10px 16px", display: "flex", gap: 6 }}>
                  {[0, 1, 2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#c9a96e", animation: `bounce 1.2s ${i * 0.2}s infinite` }} />)}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
          <div style={{ padding: "12px 0 0", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 10 }}>
              <input className="crm-input" value={input} onChange={e => setInput(e.target.value)} placeholder="Ask me anything about your leads, tasks, or calendar…" onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()} style={{ flex: 1, fontSize: 14 }} />
              <button className="crm-btn crm-btn-primary" onClick={() => send()} disabled={!input.trim() || loading} style={{ padding: "8px 16px" }}><Send size={16} /></button>
            </div>
          </div>
        </div>

        {/* Sidebar: Suggestions + Context */}
        <div style={{ width: 240, flexShrink: 0, display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card">
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #e8e0d4", fontSize: 12, fontWeight: 700, color: "#7a6a5a", textTransform: "uppercase", letterSpacing: "0.06em" }}>Suggestions</div>
            <div style={{ padding: "8px 8px", display: "flex", flexDirection: "column", gap: 4 }}>
              {SUGGESTIONS.map((s, i) => (
                <button key={i} onClick={() => send(s)} style={{ padding: "8px 10px", borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", textAlign: "left", fontSize: 12, color: "#2c2218", lineHeight: 1.4 }} onMouseEnter={e => (e.currentTarget.style.background = "#f5efe7")} onMouseLeave={e => (e.currentTarget.style.background = "transparent")}>
                  {s}
                </button>
              ))}
            </div>
          </div>
          <div className="card">
            <div style={{ padding: "12px 14px", borderBottom: "1px solid #e8e0d4", fontSize: 12, fontWeight: 700, color: "#7a6a5a", textTransform: "uppercase", letterSpacing: "0.06em" }}>Context Loaded</div>
            <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { label: "Leads", value: leads.length },
                { label: "Active leads", value: leads.filter(l => !["closed", "lost"].includes(l.status)).length },
                { label: "Pending tasks", value: tasks.filter(t => !t.completed).length },
                { label: "Events", value: events.length },
              ].map(item => (
                <div key={item.label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                  <span style={{ color: "#7a6a5a" }}>{item.label}</span>
                  <span style={{ fontWeight: 700, color: "#2a6b4a" }}>{item.value}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: "#fdf4e3", border: "1px solid #e8d5b0", borderRadius: 8, padding: "12px 14px", fontSize: 11, color: "#7a6a5a", lineHeight: 1.6 }}>
            <strong style={{ color: "#c9a96e" }}>To enable AI:</strong> Add the <code style={{ background: "#fff", padding: "1px 4px", borderRadius: 3 }}>AI</code> binding in your Cloudflare Pages project settings → Functions → AI Bindings.
          </div>
        </div>
      </div>
      <style>{`@keyframes bounce { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1); } }`}</style>
    </div>
  );
}
