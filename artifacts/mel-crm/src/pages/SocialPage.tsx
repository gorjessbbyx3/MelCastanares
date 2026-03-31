import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Star, Sparkles, Pin, Trash2, TrendingUp, Hash, Clock, Users,
  Heart, MessageCircle, BarChart2, RefreshCw, Copy, CheckCircle2, Instagram, AlertCircle
} from "lucide-react";
import { api, type ContentIdea } from "../lib/api";

const SNAPSHOT = {
  followers: 319,
  uploads: 39,
  avgLikes: 115,
  avgComments: 14.3,
  engagement: "485.58%",
  postsPerWeek: 2.1,
  bestDay: "Saturday",
  bestTime: "8:00 AM UTC",
  sentiment: { positive: 6.19, neutral: 93.29, negative: 0.52 },
  topHashtags: [
    { tag: "#hawaiirealestate", count: 9 },
    { tag: "#realestate", count: 8 },
    { tag: "#oahurealtor", count: 5 },
    { tag: "#realtor", count: 3 },
    { tag: "#oahurealestate", count: 2 },
    { tag: "#lifestyle", count: 2 },
    { tag: "#mililani", count: 2 },
    { tag: "#hawaiihomes", count: 1 },
    { tag: "#realestateagent", count: 1 },
    { tag: "#family", count: 1 },
  ],
  topWords: ["right", "about", "realtor", "Comment", "information", "Listed", "buying", "understand", "homes", "offers"],
};

const TOPIC_PROMPTS = [
  "Buyer tips for Oahu first-timers",
  "Neighborhood spotlight: Kaimuki",
  "What's the Oahu market doing right now?",
  "Open house announcement",
  "Seller tips to maximize value",
  "Why work with a local Realtor",
  "Fun fact about Hawai'i real estate",
  "Client success story",
];

const TRENDING = [
  { tip: "Carousel posts get 3× more reach than single images on Instagram", icon: "📊" },
  { tip: "Reels under 30 seconds are being boosted by the algorithm in 2026", icon: "🎬" },
  { tip: "'Day in the life' content outperforms listing-only posts for real estate agents", icon: "🏠" },
  { tip: "Posting at 8–9 AM local time on Saturdays matches your best engagement window", icon: "⏰" },
  { tip: "#aloha and local lifestyle hashtags drive more Oahu-specific discovery", icon: "🤙" },
  { tip: "Asking a question in your caption boosts comment rate by up to 2×", icon: "💬" },
];

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <button onClick={copy} style={{ padding: "4px 8px", borderRadius: 4, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", color: "#7a6a5a", fontSize: 11, display: "flex", alignItems: "center", gap: 4 }}>
      {copied ? <CheckCircle2 size={12} color="#2a7a4a" /> : <Copy size={12} />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function SocialPage() {
  const qc = useQueryClient();
  const [topic, setTopic] = useState("");
  const [ideas, setIdeas] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState("");

  const { data: igLive, isLoading: igLoading, refetch: igRefetch } = useQuery({
    queryKey: ["ig-stats"],
    queryFn: api.getInstagramStats,
    staleTime: 6 * 60 * 60 * 1000, // treat as fresh for 6h
    retry: false,
  });

  // Merge live data over snapshot — fall back to snapshot values when live is unavailable
  const igStats = {
    followers: igLive?.followers ?? SNAPSHOT.followers,
    uploads: igLive?.posts ?? SNAPSHOT.uploads,
    avgLikes: igLive?.avgLikes ?? SNAPSHOT.avgLikes,
    avgComments: igLive?.avgComments ?? SNAPSHOT.avgComments,
    engagement: igLive?.engagement ?? SNAPSHOT.engagement,
  };
  const igSource = igLive?.source === "live" ? (igLive.cached ? "cached" : "live") : "snapshot";
  const igFetchedAt = igLive?.fetchedAt ? new Date(igLive.fetchedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "Mar 2026";

  const { data: pinned = [] } = useQuery<ContentIdea[]>({ queryKey: ["content-ideas"], queryFn: api.getContentIdeas });

  const pinMut = useMutation({
    mutationFn: (text: string) => api.createContentIdea({ text, topic, pinned: true }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-ideas"] }),
  });
  const unpinMut = useMutation({
    mutationFn: (id: string) => api.deleteContentIdea(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["content-ideas"] }),
  });

  const generate = async () => {
    setGenerating(true);
    setAiError("");
    try {
      const result = await api.generateContent(topic || "Hawaii real estate tips for Oahu buyers and sellers");
      setIdeas(result.ideas);
    } catch {
      setAiError("AI generation failed. Check your Cloudflare AI binding.");
      setIdeas([
        "🏖️ Just listed a stunning home steps from the beach in Kailua! DM me for details. #oahurealtor #hawaiirealestate",
        "💡 Buyer tip: In Oahu's market, pre-approval isn't optional — it's your golden ticket. Let's get you ready! #oahuhomes #buyertips",
        "🌺 Why do people fall in love with Hawaii? It's not just the weather — it's community, culture, and 'ohana. Let me help you find yours. #hawaiilife",
        "📊 Market update: Oahu home values held steady this spring. Now is a great time to know what your home is worth! Comment 'VALUE' and I'll run a free CMA.",
      ]);
    }
    setGenerating(false);
  };

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 24 }}>
        <h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Instagram size={22} color="#c9a96e" /> Social & Content
        </h1>
        <p className="section-sub">@mel.castanares · Instagram analytics + AI content generator</p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
          {igLoading ? (
            <span style={{ fontSize: 11, color: "#a89880" }}>Fetching live stats…</span>
          ) : igSource === "live" ? (
            <span style={{ fontSize: 11, color: "#2a7a4a" }}>● Live · fetched {igFetchedAt}</span>
          ) : igSource === "cached" ? (
            <span style={{ fontSize: 11, color: "#c9a96e" }}>● Cached · fetched {igFetchedAt}</span>
          ) : (
            <span style={{ fontSize: 11, color: "#a89880", display: "flex", alignItems: "center", gap: 4 }}><AlertCircle size={11} /> Snapshot · Mar 2026 (live fetch unavailable)</span>
          )}
          <button onClick={() => igRefetch()} style={{ fontSize: 11, color: "#7a6a5a", background: "none", border: "1px solid #e8e0d4", borderRadius: 4, padding: "2px 8px", cursor: "pointer" }}>Refresh</button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 14, marginBottom: 24 }}>
        {[
          { label: "Followers", value: igLoading ? "…" : igStats.followers?.toLocaleString() ?? "—", icon: Users, color: "#1e5a8a" },
          { label: "Uploads", value: igLoading ? "…" : String(igStats.uploads ?? "—"), icon: BarChart2, color: "#2a6b4a" },
          { label: "Avg Likes", value: igLoading ? "…" : String(igStats.avgLikes ?? "—"), icon: Heart, color: "#c0392b" },
          { label: "Avg Comments", value: igLoading ? "…" : String(igStats.avgComments ?? "—"), icon: MessageCircle, color: "#d4851a" },
          { label: "Engagement", value: igLoading ? "…" : igStats.engagement ?? "—", icon: TrendingUp, color: "#7a2a7a" },
          { label: "Posts/Week", value: SNAPSHOT.postsPerWeek.toString(), icon: RefreshCw, color: "#2a7a4a" },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ fontSize: 22, color: s.color }}>{s.value}</div>
              </div>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}><s.icon size={16} color={s.color} /></div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        {/* Top Hashtags */}
        <div className="card">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 8 }}>
            <Hash size={15} color="#c9a96e" /><span style={{ fontSize: 13, fontWeight: 600 }}>Top Hashtags</span>
            <span style={{ fontSize: 11, color: "#a89880", marginLeft: "auto" }}>Last 100 posts</span>
          </div>
          <div style={{ padding: "14px 18px", display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SNAPSHOT.topHashtags.map(h => (
              <div key={h.tag} style={{ display: "flex", alignItems: "center", gap: 4, background: "#f5efe7", borderRadius: 20, padding: "4px 10px" }}>
                <span style={{ fontSize: 12, color: "#2a6b4a", fontWeight: 600 }}>{h.tag}</span>
                <span style={{ fontSize: 10, color: "#a89880" }}>{h.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Best Time + Tips */}
        <div className="card">
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={15} color="#c9a96e" /><span style={{ fontSize: 13, fontWeight: 600 }}>Best Posting Window</span>
          </div>
          <div style={{ padding: "18px 18px" }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#2a6b4a" }}>Saturday</div>
              <div style={{ fontSize: 16, color: "#7a6a5a" }}>8:00 AM HST</div>
              <div style={{ fontSize: 11, color: "#a89880", marginTop: 4 }}>From last 12 posts</div>
            </div>
            <div style={{ background: "#f5efe7", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "#7a6a5a", marginBottom: 8 }}>Sentiment</div>
              <div style={{ display: "flex", gap: 4 }}>
                <div style={{ flex: SNAPSHOT.sentiment.positive, background: "#2a7a4a", height: 8, borderRadius: 4 }} title={`Positive ${SNAPSHOT.sentiment.positive}%`} />
                <div style={{ flex: SNAPSHOT.sentiment.neutral, background: "#e8e0d4", height: 8, borderRadius: 4 }} title={`Neutral ${SNAPSHOT.sentiment.neutral}%`} />
                <div style={{ flex: SNAPSHOT.sentiment.negative, background: "#c0392b", height: 8, borderRadius: 4 }} title={`Negative ${SNAPSHOT.sentiment.negative}%`} />
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 6, fontSize: 10, color: "#7a6a5a" }}>
                <span>✅ Positive {SNAPSHOT.sentiment.positive}%</span>
                <span>⚪ Neutral {SNAPSHOT.sentiment.neutral}%</span>
                <span>🔴 Negative {SNAPSHOT.sentiment.negative}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* AI Content Generator */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ padding: "16px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 8 }}>
          <Sparkles size={16} color="#c9a96e" />
          <span style={{ fontSize: 14, fontWeight: 600 }}>AI Content Generator</span>
          <span style={{ fontSize: 11, color: "#a89880", marginLeft: "auto" }}>Powered by Cloudflare AI</span>
        </div>
        <div style={{ padding: "18px 18px" }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input className="crm-input" value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic or keyword (optional) — e.g. 'open house Kaimuki' or 'buyer tips'" style={{ flex: 1 }} onKeyDown={e => e.key === "Enter" && generate()} />
            <button className="crm-btn crm-btn-primary" onClick={generate} disabled={generating}>
              <Sparkles size={14} />{generating ? "Generating…" : "Generate Ideas"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
            {TOPIC_PROMPTS.map(p => (
              <button key={p} onClick={() => setTopic(p)} style={{ padding: "4px 10px", borderRadius: 14, fontSize: 11, border: "1px solid #e8e0d4", background: topic === p ? "#f5efe7" : "#fff", color: "#7a6a5a", cursor: "pointer" }}>{p}</button>
            ))}
          </div>
          {aiError && <div style={{ background: "#fde0dd", borderRadius: 6, padding: "10px 12px", fontSize: 12, color: "#c0392b", marginBottom: 12 }}>{aiError} (showing sample ideas)</div>}
          {ideas.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {ideas.map((idea, i) => (
                <div key={i} style={{ background: "#fdfaf6", border: "1px solid #e8e0d4", borderRadius: 8, padding: "14px 16px" }}>
                  <div style={{ fontSize: 13, color: "#2c2218", lineHeight: 1.6, marginBottom: 10 }}>{idea}</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <CopyButton text={idea} />
                    <button onClick={() => pinMut.mutate(idea)} disabled={pinMut.isPending} style={{ padding: "4px 10px", borderRadius: 4, border: "1px solid #c9a96e", background: "#fff8ed", cursor: "pointer", fontSize: 11, color: "#c9a96e", display: "flex", alignItems: "center", gap: 4 }}>
                      <Pin size={11} />Pin
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Pinned Ideas */}
      {pinned.length > 0 && (
        <div className="card" style={{ marginBottom: 20 }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 8 }}>
            <Pin size={15} color="#c9a96e" /><span style={{ fontSize: 13, fontWeight: 600 }}>Pinned Ideas</span>
            <span style={{ fontSize: 11, color: "#a89880", marginLeft: "auto" }}>{pinned.length} saved</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {pinned.map(idea => (
              <div key={idea.id} style={{ padding: "12px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "flex-start", gap: 10 }}>
                <Star size={14} color="#c9a96e" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, fontSize: 13, lineHeight: 1.6, color: "#2c2218" }}>{idea.text}</div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <CopyButton text={idea.text} />
                  <button onClick={() => unpinMut.mutate(idea.id)} style={{ width: 26, height: 26, borderRadius: 4, border: "1px solid #e8e0d4", background: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: "#c0392b" }}><Trash2 size={11} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Trending Tips */}
      <div className="card">
        <div style={{ padding: "14px 18px", borderBottom: "1px solid #e8e0d4", display: "flex", alignItems: "center", gap: 8 }}>
          <TrendingUp size={15} color="#c9a96e" /><span style={{ fontSize: 13, fontWeight: 600 }}>Trending Tips for Real Estate Creators</span>
        </div>
        <div style={{ padding: "14px 18px", display: "flex", flexDirection: "column", gap: 10 }}>
          {TRENDING.map((t, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "10px 14px", background: "#fdfaf6", borderRadius: 8, fontSize: 13, color: "#2c2218", lineHeight: 1.5 }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{t.icon}</span>
              <span>{t.tip}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
