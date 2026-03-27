// ═══════════════════════════════════════════════
// AgentJane API Client
// All frontend data flows through these functions.
// When the backend is unreachable, the UI falls back
// to the defaults baked into each page component.
// ═══════════════════════════════════════════════

const API_BASE = import.meta.env.VITE_API_BASE || "/api";

async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T | null> {
  try {
    const url = `${API_BASE}${path}`;
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json", ...options.headers },
      ...options,
    });
    if (!res.ok) throw new Error(`API ${res.status}: ${res.statusText}`);
    return (await res.json()) as T;
  } catch (err: any) {
    console.warn(`[AgentJane API] ${path} failed:`, err.message);
    return null;
  }
}

function qs(params: Record<string, any>): string {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== "")
  ).toString();
  return q ? `?${q}` : "";
}

// ─── READ endpoints ───────────────────────────
export const getAgent         = ()            => apiFetch("/agent");
export const getStats         = ()            => apiFetch("/stats");
export const getProperties    = (params = {}) => apiFetch(`/properties${qs(params)}`);
export const getProperty      = (id: string)  => apiFetch(`/properties/${id}`);
export const getTestimonials  = ()            => apiFetch("/testimonials");
export const getNeighborhoods = ()            => apiFetch("/neighborhoods");
export const getNeighborhood  = (slug: string)=> apiFetch(`/neighborhoods/${slug}`);
export const getBlogPosts     = (params = {}) => apiFetch(`/blog${qs(params)}`);
export const getBlogPost      = (slug: string)=> apiFetch(`/blog/${slug}`);
export const getMarketData    = (params = {}) => apiFetch(`/market${qs(params)}`);
export const getPageContent   = (slug: string)=> apiFetch(`/pages/${slug}`);

// ─── WRITE endpoints ──────────────────────────
export const submitContact = (data: any) =>
  apiFetch("/contact", { method: "POST", body: JSON.stringify(data) });

export const submitValuation = (data: any) =>
  apiFetch("/home-valuation", { method: "POST", body: JSON.stringify(data) });
