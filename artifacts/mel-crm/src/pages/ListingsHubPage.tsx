import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Calendar, Globe, RefreshCw, ExternalLink, BedDouble, Bath, Maximize2, MapPin, Home } from "lucide-react";
import { api, type CRMEvent } from "../lib/api";

// ── Helpers ───────────────────────────────────────────────────────────
function fmtDate(d: string) {
  if (!d) return "—";
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}
function fmtTime(t: string) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm}`;
}
function fmtPrice(p: number) {
  if (!p) return "—";
  return "$" + p.toLocaleString();
}

interface MLSListing {
  mlsNum: string;
  price: number;
  priceText: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  status: string;
  beds: string;
  baths: string;
  sqft: string;
  photo: string;
  listingUrl: string;
  courtesy: string;
}

// ── MLS Listings Tab ──────────────────────────────────────────────────
function MLSTab() {
  const [search, setSearch] = useState("");
  const { data, isLoading, error, refetch, isFetching } = useQuery<{ listings: MLSListing[]; count: number; cached: boolean; error?: string }>({
    queryKey: ["mls-listings"],
    queryFn: async () => {
      const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
      // Try fetching via the api-server proxy route
      const r = await fetch(`${BASE}/api/mls/listings`);
      if (!r.ok) throw new Error("Failed to fetch listings");
      return r.json();
    },
    retry: 1,
    staleTime: 15 * 60 * 1000,
  });

  const listings = (data?.listings || []).filter(l =>
    !search || l.address?.toLowerCase().includes(search.toLowerCase()) || l.city?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 10, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <input style={{ flex: 1, minWidth: 200, padding: "8px 12px", border: "1px solid #e8e0d4", borderRadius: 8, fontSize: 13, outline: "none" }}
          placeholder="Search by address or city…" value={search} onChange={e => setSearch(e.target.value)} />
        <button className="crm-btn crm-btn-ghost crm-btn-sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw size={13} className={isFetching ? "spin" : ""} />{isFetching ? "Loading…" : "Refresh"}
        </button>
        {data && (
          <a href="https://shopoahuproperties.idxbroker.com/idx/results/listings" target="_blank" rel="noopener" className="crm-btn crm-btn-ghost crm-btn-sm" style={{ textDecoration: "none" }}>
            <ExternalLink size={13} />Full IDX Search
          </a>
        )}
      </div>

      {isLoading ? (
        <div style={{ padding: 48, textAlign: "center", color: "#a89880" }}>
          <RefreshCw size={24} style={{ opacity: 0.4, marginBottom: 12 }} className="spin" />
          <div>Loading Oahu MLS listings…</div>
        </div>
      ) : error || (data?.error && !listings.length) ? (
        <div style={{ padding: "40px 24px", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: "#fde9c8", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Building2 size={24} color="#d4851a" /></div>
          <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>IDX Feed Unavailable</div>
          <div style={{ fontSize: 13, color: "#7a6a5a", maxWidth: 400, margin: "0 auto 20px", lineHeight: 1.7 }}>
            The IDX Broker feed is temporarily unavailable. Your listings are still live on your IDX website.
          </div>
          <a href="https://shopoahuproperties.idxbroker.com/idx/results/listings" target="_blank" rel="noopener" className="crm-btn crm-btn-primary" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ExternalLink size={14} />View on IDX Broker
          </a>
        </div>
      ) : listings.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: "#a89880" }}>
          <Home size={28} style={{ opacity: 0.3, marginBottom: 12 }} />
          <div>No listings match your search</div>
        </div>
      ) : (
        <>
          <div style={{ fontSize: 12, color: "#a89880", marginBottom: 12 }}>
            {listings.length} listing{listings.length !== 1 ? "s" : ""} {data?.cached ? "(cached)" : ""}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {listings.map(l => (
              <a key={l.mlsNum} href={l.listingUrl} target="_blank" rel="noopener" style={{ textDecoration: "none", color: "inherit" }}>
                <div className="card" style={{ overflow: "hidden", transition: "box-shadow 0.15s" }} onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.12)")} onMouseLeave={e => (e.currentTarget.style.boxShadow = "")}>
                  <div style={{ height: 160, background: l.photo ? `url(${l.photo}) center/cover no-repeat` : "#f0ece6", position: "relative" }}>
                    {!l.photo && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}><Home size={32} color="#c9a96e" style={{ opacity: 0.5 }} /></div>}
                    {l.status && (
                      <div style={{ position: "absolute", top: 10, left: 10, background: l.status.toLowerCase().includes("active") ? "#1a2c24" : "#c9a96e", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 10, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l.status}</div>
                    )}
                  </div>
                  <div style={{ padding: 16 }}>
                    <div style={{ fontWeight: 700, fontSize: 18, color: "#1a2c24", marginBottom: 4 }}>{l.priceText || fmtPrice(l.price)}</div>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, display: "flex", alignItems: "center", gap: 4 }}>
                      <MapPin size={11} color="#a89880" />{l.address}
                    </div>
                    <div style={{ fontSize: 12, color: "#7a6a5a", marginBottom: 10 }}>{l.city}{l.city && l.state ? ", " : ""}{l.state} {l.zip}</div>
                    <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#5a4a3a" }}>
                      {l.beds && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><BedDouble size={12} />{l.beds} bd</span>}
                      {l.baths && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Bath size={12} />{l.baths} ba</span>}
                      {l.sqft && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><Maximize2 size={12} />{Number(l.sqft).toLocaleString()} sqft</span>}
                    </div>
                    {l.courtesy && <div style={{ marginTop: 10, fontSize: 10, color: "#a89880", borderTop: "1px solid #e8e0d4", paddingTop: 8 }}>Courtesy of {l.courtesy}</div>}
                  </div>
                </div>
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ── Open Houses Tab ───────────────────────────────────────────────────
function OpenHousesTab() {
  const { data: events = [], isLoading } = useQuery<CRMEvent[]>({
    queryKey: ["events"],
    queryFn: api.getEvents,
  });

  const openHouses = events
    .filter(e => e.type === "open-house")
    .sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = openHouses.filter(e => e.date >= today);
  const past = openHouses.filter(e => e.date < today);

  if (isLoading) return <div style={{ padding: 40, textAlign: "center", color: "#a89880" }}>Loading…</div>;

  if (openHouses.length === 0) {
    return (
      <div style={{ padding: "48px 24px", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, borderRadius: 14, background: "#f5efe7", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}><Calendar size={24} color="#c9a96e" /></div>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>No Open Houses Scheduled</div>
        <div style={{ fontSize: 13, color: "#7a6a5a", marginBottom: 20 }}>Create events with type "open-house" in the Calendar to see them here.</div>
        <a href="#/calendar" className="crm-btn crm-btn-primary" style={{ textDecoration: "none" }}><Calendar size={14} />Go to Calendar</a>
      </div>
    );
  }

  const EventCard = ({ ev }: { ev: CRMEvent }) => (
    <div className="card" style={{ padding: 20, display: "flex", gap: 16 }}>
      <div style={{ width: 56, height: 56, borderRadius: 12, background: "#fdf4e3", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: "#1a2c24", lineHeight: 1 }}>{new Date(ev.date + "T00:00:00").getDate()}</div>
        <div style={{ fontSize: 10, color: "#c9a96e", fontWeight: 700, textTransform: "uppercase" }}>{new Date(ev.date + "T00:00:00").toLocaleDateString("en-US", { month: "short" })}</div>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>{ev.title}</div>
        <div style={{ display: "flex", gap: 12, fontSize: 12, color: "#7a6a5a", flexWrap: "wrap" }}>
          <span>{fmtDate(ev.date)}</span>
          {ev.time && <span>{fmtTime(ev.time)}{ev.endTime ? ` – ${fmtTime(ev.endTime)}` : ""}</span>}
          {ev.location && <span style={{ display: "flex", alignItems: "center", gap: 3 }}><MapPin size={11} />{ev.location}</span>}
        </div>
        {ev.notes && <div style={{ marginTop: 6, fontSize: 12, color: "#a89880", fontStyle: "italic" }}>{ev.notes}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {upcoming.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#2a7a4a", marginBottom: 12 }}>Upcoming ({upcoming.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {upcoming.map(e => <EventCard key={e.id} ev={e} />)}
          </div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "#a89880", marginBottom: 12 }}>Past ({past.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, opacity: 0.65 }}>
            {past.map(e => <EventCard key={e.id} ev={e} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── AppFolio Tab ──────────────────────────────────────────────────────
function AppFolioTab() {
  const [loaded, setLoaded] = useState(false);
  const APPFOLIO_URL = "https://account.appfolio.com/realms/foliospace/protocol/openid-connect/auth?client_id=account-picker&redirect_uri=https%3A%2F%2Faccount.appfolio.com%2Frealms%2Ffoliospace%2Fappfolio%2Faccount-picker%2Flogin-redirect%3Fpath%3D%2F&state=0%2F7ac79406-7330-2211-750a-84fe21823c09&response_type=code&scope=openid";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>AppFolio Portal</div>
          <div style={{ fontSize: 12, color: "#7a6a5a" }}>Property management dashboard</div>
        </div>
        <a href={APPFOLIO_URL} target="_blank" rel="noopener" className="crm-btn crm-btn-ghost crm-btn-sm" style={{ textDecoration: "none" }}>
          <ExternalLink size={13} />Open in New Tab
        </a>
      </div>
      <div style={{ border: "1px solid #e8e0d4", borderRadius: 12, overflow: "hidden", background: "#f0ece6", minHeight: 600, position: "relative" }}>
        {!loaded && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}><Globe size={24} color="#1a2c24" /></div>
            <div style={{ fontSize: 13, color: "#7a6a5a", textAlign: "center", maxWidth: 320, lineHeight: 1.6 }}>
              Loading AppFolio portal…<br />
              <span style={{ fontSize: 12 }}>If it doesn't load, AppFolio may block embedded views. Use "Open in New Tab" above.</span>
            </div>
          </div>
        )}
        <iframe
          src={APPFOLIO_URL}
          style={{ width: "100%", height: 680, border: "none", display: loaded ? "block" : "block", opacity: loaded ? 1 : 0 }}
          onLoad={() => setLoaded(true)}
          title="AppFolio Portal"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation"
        />
      </div>
      <div style={{ marginTop: 12, padding: "10px 14px", background: "#fdf4e3", borderRadius: 8, fontSize: 12, color: "#7a6a5a" }}>
        <strong>Note:</strong> Some portals block embedded views for security reasons. If you see a blank screen, click "Open in New Tab" to access AppFolio directly.
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────
const TABS = [
  { id: "mls", label: "MLS Listings", icon: <Building2 size={13} /> },
  { id: "openhouses", label: "Open Houses", icon: <Home size={13} /> },
  { id: "appfolio", label: "AppFolio", icon: <Globe size={13} /> },
] as const;
type TabId = typeof TABS[number]["id"];

export default function ListingsHubPage() {
  const [tab, setTab] = useState<TabId>("mls");
  return (
    <div className="fade-in">
      <div style={{ marginBottom: 20 }}>
        <h1 className="section-title" style={{ display: "flex", alignItems: "center", gap: 10 }}><Building2 size={22} color="#c9a96e" />Listings Hub</h1>
        <p className="section-sub">MLS listings · Open house schedule · AppFolio portal</p>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 24, borderBottom: "2px solid #e8e0d4" }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ padding: "10px 20px", background: "none", border: "none", cursor: "pointer", fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "#1a2c24" : "#7a6a5a", borderBottom: `2px solid ${tab === t.id ? "#c9a96e" : "transparent"}`, marginBottom: -2, display: "flex", alignItems: "center", gap: 6, fontSize: 13, transition: "all 0.15s" }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {tab === "mls" && <MLSTab />}
      {tab === "openhouses" && <OpenHousesTab />}
      {tab === "appfolio" && <AppFolioTab />}
    </div>
  );
}
