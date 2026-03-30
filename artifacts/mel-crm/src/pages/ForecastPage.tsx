import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { TrendingUp, DollarSign, Target, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { api, type Lead, type Commission } from "../lib/api";

// ── Pipeline probabilities by lead status ─────────────────────────────
const STATUS_PROB: Record<string, number> = {
  new: 0.05, contacted: 0.15, qualified: 0.30, touring: 0.45,
  offer_made: 0.65, under_contract: 0.85, closed: 1.0, lost: 0,
};
const STATUS_LABEL: Record<string, string> = {
  new: "New", contacted: "Contacted", qualified: "Qualified", touring: "Touring",
  offer_made: "Offer Made", under_contract: "Under Contract", closed: "Closed", lost: "Lost",
};
const DEFAULT_COMMISSION_RATE = 0.03;
const DEFAULT_PRICE = 750000; // Oahu median fallback

function fmt$(n: number, compact = false) {
  if (compact) {
    if (n >= 1000000) return "$" + (n / 1000000).toFixed(1) + "M";
    if (n >= 1000) return "$" + Math.round(n / 1000) + "K";
  }
  return "$" + n.toLocaleString();
}

function getMonthLabel(offset: number) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
}

function getCurrentYear() { return new Date().getFullYear(); }

// ── Custom tooltip ─────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#fff", border: "1px solid #e8e0d4", borderRadius: 10, padding: "10px 14px", boxShadow: "0 4px 16px rgba(0,0,0,0.1)" }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#2c2218", marginBottom: 6 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color, fontWeight: 600 }}>{p.name}: {fmt$(p.value)}</div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────
export default function ForecastPage() {
  const leadsQ = useQuery<Lead[]>({ queryKey: ["leads"], queryFn: api.getLeads });
  const commissionsQ = useQuery<Commission[]>({ queryKey: ["commissions"], queryFn: api.getCommissions });

  const leads = leadsQ.data || [];
  const commissions = commissionsQ.data || [];

  // ── Expected commission from pipeline ─────────────────────────────
  const pipelineItems = useMemo(() => {
    return leads
      .filter(l => l.status !== "lost" && l.status !== "closed")
      .map(l => {
        const prob = STATUS_PROB[l.status] || 0.05;
        const price = l.priceMax || l.priceMin || DEFAULT_PRICE;
        const gross = price * DEFAULT_COMMISSION_RATE;
        const expected = Math.round(gross * prob);
        return { lead: l, prob, gross: Math.round(gross), expected };
      })
      .sort((a, b) => b.expected - a.expected);
  }, [leads]);

  // ── Actual closed YTD ─────────────────────────────────────────────
  const currentYear = getCurrentYear();
  const closedYTD = useMemo(() => {
    return commissions
      .filter(c => c.status === "closed" && c.closeDate?.startsWith(String(currentYear)))
      .reduce((s, c) => s + (c.commissionAmount || 0), 0);
  }, [commissions, currentYear]);

  // ── Monthly chart data (last 3 months actual + next 6 months forecast) ─
  const chartData = useMemo(() => {
    const months: { month: string; actual: number; forecast: number }[] = [];
    for (let i = -3; i <= 6; i++) {
      const d = new Date();
      d.setMonth(d.getMonth() + i);
      const yr = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const key = `${yr}-${mo}`;
      const actual = commissions
        .filter(c => c.status === "closed" && c.closeDate?.startsWith(key))
        .reduce((s, c) => s + (c.commissionAmount || 0), 0);
      // Forecast: spread pipeline expected commission evenly over next 3 months based on timeline hints
      const forecast = i >= 0
        ? Math.round(pipelineItems.reduce((s, p) => s + p.expected, 0) / 4 * Math.exp(-i * 0.4))
        : 0;
      months.push({ month: getMonthLabel(i), actual, forecast });
    }
    return months;
  }, [commissions, pipelineItems]);

  // ── Totals ────────────────────────────────────────────────────────
  const totalPipelineExpected = pipelineItems.reduce((s, p) => s + p.expected, 0);
  const totalPipelineGross = pipelineItems.reduce((s, p) => s + p.gross, 0);
  const totalExpectedThisQ = Math.round(totalPipelineExpected * 0.6);
  const annualPace = closedYTD > 0 ? Math.round(closedYTD / (new Date().getMonth() + 1) * 12) : 0;

  const STATUS_STAGE_ORDER = ["under_contract", "offer_made", "touring", "qualified", "contacted", "new"];

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}><TrendingUp size={22} color="#c9a96e" />Commission Forecaster</h1>
        <p className="section-sub">Pipeline probability-weighted forecast · Actual vs expected income</p>
      </div>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(165px, 1fr))", gap: 12, marginBottom: 28 }}>
        {[
          { label: "Closed YTD", value: fmt$(closedYTD, true), sub: `${currentYear} actual`, icon: <CheckCircle2 size={16} color="#2a7a4a" />, bg: "#d1f0e1", color: "#2a7a4a" },
          { label: "Annual Pace", value: annualPace > 0 ? fmt$(annualPace, true) : "—", sub: "at current rate", icon: <TrendingUp size={16} color="#1e5a8a" />, bg: "#dbeafe", color: "#1e5a8a" },
          { label: "Pipeline (Expected)", value: fmt$(totalPipelineExpected, true), sub: `${pipelineItems.length} active leads`, icon: <Target size={16} color="#c9a96e" />, bg: "#fdf4e3", color: "#c9a96e" },
          { label: "This Quarter (Est.)", value: fmt$(totalExpectedThisQ, true), sub: "probability-weighted", icon: <Clock size={16} color="#d4851a" />, bg: "#fde9c8", color: "#d4851a" },
        ].map(c => (
          <div key={c.label} style={{ background: "#fff", border: "1px solid #e8e0d4", borderRadius: 12, padding: "16px 18px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: c.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.icon}</div>
              <span style={{ fontSize: 11, color: "#7a6a5a" }}>{c.label}</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 800, color: c.color, marginBottom: 2 }}>{c.value}</div>
            <div style={{ fontSize: 11, color: "#a89880" }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div style={{ background: "#fff", border: "1px solid #e8e0d4", borderRadius: 14, padding: "20px 20px 16px", marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "#2c2218" }}>Actual vs Forecasted Commission</div>
          <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#2a7a4a", display: "inline-block" }} />Actual Closed</span>
            <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, borderRadius: 2, background: "#c9a96e", display: "inline-block" }} />Forecast</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0ece6" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#7a6a5a" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => v >= 1000 ? "$" + Math.round(v / 1000) + "K" : "$" + v} tick={{ fontSize: 10, fill: "#7a6a5a" }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <ReferenceLine x={getMonthLabel(0)} stroke="#c9a96e" strokeDasharray="4 3" label={{ value: "Today", position: "top", fontSize: 10, fill: "#c9a96e" }} />
            <Bar dataKey="actual" name="Actual Closed" fill="#2a7a4a" radius={[4, 4, 0, 0]} />
            <Bar dataKey="forecast" name="Forecast" radius={[4, 4, 0, 0]}>
              {chartData.map((_, i) => <Cell key={i} fill={i < 3 ? "#e8e0d4" : "#c9a96e"} opacity={i < 3 ? 0 : 0.7} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Pipeline breakdown */}
      <div style={{ background: "#fff", border: "1px solid #e8e0d4", borderRadius: 14, padding: "20px" }}>
        <div style={{ fontWeight: 700, fontSize: 14, color: "#2c2218", marginBottom: 4 }}>Pipeline Breakdown</div>
        <div style={{ fontSize: 12, color: "#7a6a5a", marginBottom: 16 }}>Gross commission × close probability = expected value</div>

        {pipelineItems.length === 0 && (
          <div style={{ padding: "30px 0", textAlign: "center", color: "#a89880", fontSize: 13 }}>
            <AlertCircle size={28} style={{ marginBottom: 8, opacity: 0.4 }} />
            <div>No active leads in the pipeline</div>
          </div>
        )}

        {/* Stage grouping */}
        {STATUS_STAGE_ORDER.filter(s => pipelineItems.some(p => p.lead.status === s)).map(status => {
          const items = pipelineItems.filter(p => p.lead.status === status);
          const stageTotal = items.reduce((s, p) => s + p.expected, 0);
          return (
            <div key={status} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#7a6a5a" }}>{STATUS_LABEL[status] || status} — {Math.round((STATUS_PROB[status] || 0) * 100)}% probability</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#c9a96e" }}>{fmt$(stageTotal, true)} expected</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {items.map(({ lead, prob, gross, expected }) => (
                  <div key={lead.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", background: "#f9f6f1", borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "#2c2218" }}>{lead.name}</div>
                      <div style={{ fontSize: 11, color: "#7a6a5a" }}>{lead.neighborhoods || "Oahu"} · {lead.intent === "sell" ? "Seller" : "Buyer"}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: "#7a6a5a" }}>{fmt$(gross, true)} gross</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#2a7a4a" }}>{fmt$(expected, true)} expected</div>
                    </div>
                    <div style={{ width: 48, height: 48, flexShrink: 0 }}>
                      <svg viewBox="0 0 36 36" style={{ transform: "rotate(-90deg)" }}>
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#e8e0d4" strokeWidth="4" />
                        <circle cx="18" cy="18" r="15" fill="none" stroke="#c9a96e" strokeWidth="4"
                          strokeDasharray={`${prob * 94.2} 94.2`} strokeLinecap="round" />
                      </svg>
                      <div style={{ fontSize: 10, textAlign: "center", marginTop: -38, color: "#7a6a5a", fontWeight: 700 }}>{Math.round(prob * 100)}%</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Total row */}
        {pipelineItems.length > 0 && (
          <div style={{ borderTop: "2px solid #e8e0d4", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#2c2218" }}>{pipelineItems.length} leads · {fmt$(totalPipelineGross, true)} gross pipeline</div>
              <div style={{ fontSize: 11, color: "#7a6a5a" }}>Expected after probability weighting</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#c9a96e" }}>{fmt$(totalPipelineExpected, true)}</div>
              <div style={{ fontSize: 11, color: "#7a6a5a" }}>probability-weighted</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
