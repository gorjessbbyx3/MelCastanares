import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─────────────────────────────────────────────
// Config — IDX Broker (shopoahuproperties account)
// This is the HI Central MLS feed powering Dream Home Realty's IDX search
// ─────────────────────────────────────────────

const IDX_BASE = "https://shopoahuproperties.idxbroker.com/idx";
const IDX_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://shopoahuproperties.idxbroker.com/",
};

const CACHE_ACTIVE_MS  = 60 * 60 * 1000;       // 1 hour
const CACHE_SOLD_MS    = 4 * 60 * 60 * 1000;    // 4 hours
const MAX_PAGES        = 5;                       // 50 listings/page × 5 = 250 max
const DREAM_HOME_OFFICE = "Dream Home Realty";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface MlsListing {
  id: string;
  listingId: string;
  idxId: string;
  type: "sale" | "rental" | "land";
  status: "active" | "active_under_contract" | "pending" | "sold" | "coming_soon";
  title: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  price: number;
  priceLabel: string;
  priceReduced: boolean;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  acres: string;
  subdivision: string;
  propertyType: string;
  propStatus: string;
  featured: boolean;
  images: { url: string; isPrimary: boolean }[];
  listingUrl: string;
  source: "idx_broker";
  lastUpdated: string;
}

interface Cache {
  listings: MlsListing[];
  fetchedAt: string;
  expiresAt: number;
  total: number;
}

let activeCache: Cache | null = null;
let soldCache:   Cache | null = null;

// ─────────────────────────────────────────────
// HTML Parser — IDX Broker card structure
// ─────────────────────────────────────────────

function extractText(block: string, className: string): string {
  // Matches <span class="IDX-resultsText">VALUE</span> or <span class="IDX-text">VALUE</span>
  // after the field class
  const fieldIdx = block.indexOf(`IDX-field-${className}`);
  if (fieldIdx < 0) return "";
  const chunk = block.slice(fieldIdx, fieldIdx + 300);
  const textMatch =
    chunk.match(/IDX-resultsText">([^<]+)</) ||
    chunk.match(/IDX-text">\s*([^<]+)\s*</);
  return textMatch?.[1]?.trim() ?? "";
}

function parseListingCard(block: string): MlsListing | null {
  // All key data is in data-* attributes on the outer div
  const price    = parseInt(block.match(/data-price="(\d+)"/)?.[1] ?? "0", 10);
  const listingId = block.match(/data-listingid="([^"]+)"/)?.[1] ?? "";
  const idxId     = block.match(/data-idxid="([^"]+)"/)?.[1] ?? "";
  const lat       = parseFloat(block.match(/data-lat="([^"]+)"/)?.[1] ?? "0");
  const lng       = parseFloat(block.match(/data-lng="([^"]+)"/)?.[1] ?? "0");
  const propCat   = block.match(/data-propCat="([^"]+)"/)?.[1] ?? "";
  const idxStatus = block.match(/data-idxStatus="([^"]+)"/)?.[1]?.toLowerCase() ?? "active";

  if (!listingId) return null;

  // Address parts from spans
  const num  = block.match(/IDX-resultsAddressNumber">([^<]*)</)?.[1]?.trim() ?? "";
  const dir  = block.match(/IDX-resultsAddressDirection">([^<]*)</)?.[1]?.trim() ?? "";
  const name = block.match(/IDX-resultsAddressName">([^<]*)</)?.[1]?.trim() ?? "";
  const city = block.match(/IDX-resultsAddressCity">([^<]*)</)?.[1]?.trim() ?? "";
  const zip  = block.match(/IDX-resultsAddressZip">([^<]*)</)?.[1]?.trim() ?? "";
  const address = [num, dir, name].filter(Boolean).join(" ").trim();
  const imgAlt = block.match(/img alt="([^"]+)"/)?.[1] ?? `${address}, ${city}`;

  // Image
  const imgSrc = block.match(/IDX-resultsPhotoImg[^>]+src="([^"]+)"/)?.[1] ?? "";

  // Detail URL
  const detailUrl =
    block.match(/IDX-resultsPhotoLink[^>]+href="([^"]+)"/)?.[1] ??
    block.match(/IDX-resultsAddressLink[^>]+href="([^"]+)"/)?.[1] ?? "";

  // Beds / baths / sqft / acres
  const beds  = extractText(block, "bedrooms");
  const baths = extractText(block, "totalBaths");
  const sqftRaw = extractText(block, "sqFt").replace(/,/g, "");
  const acres   = extractText(block, "acres");
  const propStatus  = extractText(block, "propStatus");
  const subdivision = block.match(/IDX-field-subdivision[^>]*>[\s\S]*?IDX-resultsText">([^<]+)</)?.[1]?.trim() ?? "";
  const priceReduced = block.includes("IDX-badge--success") || block.includes("fa-arrow-down");

  // Normalise status
  const normalStatus = ((): MlsListing["status"] => {
    const s = (propStatus + idxStatus).toLowerCase();
    if (s.includes("sold")) return "sold";
    if (s.includes("pending")) return "pending";
    if (s.includes("under contract") || s.includes("under_contract")) return "active_under_contract";
    if (s.includes("coming")) return "coming_soon";
    return "active";
  })();

  if (!address && !price) return null;

  return {
    id: `idx-${idxId}-${listingId}`,
    listingId,
    idxId,
    type: "sale",
    status: normalStatus,
    title: imgAlt || `${address}, ${city}, HI`,
    address,
    city,
    state: "HI",
    zip,
    lat,
    lng,
    price,
    priceLabel: "",
    priceReduced,
    bedrooms: beds ? parseInt(beds, 10) : 0,
    bathrooms: baths ? parseFloat(baths) : 0,
    sqft: sqftRaw ? parseInt(sqftRaw, 10) : 0,
    acres,
    subdivision,
    propertyType: "single_family",
    propStatus,
    featured: propCat === "featured",
    images: imgSrc ? [{ url: imgSrc, isPrimary: true }] : [],
    listingUrl: detailUrl || `${IDX_BASE}/results/listings`,
    source: "idx_broker",
    lastUpdated: new Date().toISOString(),
  };
}

function parsePage(html: string): { listings: MlsListing[]; total: number } {
  const totalMatch = html.match(/IDX-totalResults-(\d+)/);
  const total = totalMatch ? parseInt(totalMatch[1], 10) : 0;

  const blocks = html.split(/(?=<div[^>]*class="IDX-resultsCell)/);
  const listings: MlsListing[] = [];

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    if (!block.includes("data-listingid")) continue;
    try {
      const listing = parseListingCard(block);
      if (listing) listings.push(listing);
    } catch {
      // skip malformed block
    }
  }

  return { listings, total };
}

// ─────────────────────────────────────────────
// Fetch helpers
// ─────────────────────────────────────────────

async function fetchPage(
  url: string,
  page = 1,
): Promise<{ listings: MlsListing[]; total: number }> {
  const sep = url.includes("?") ? "&" : "?";
  const fullUrl = page > 1 ? `${url}${sep}pg=${page}` : url;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const res = await fetch(fullUrl, { headers: IDX_HEADERS, signal: controller.signal, redirect: "follow" });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    return parsePage(html);
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchAllPages(
  url: string,
  maxPages = MAX_PAGES,
): Promise<{ listings: MlsListing[]; total: number }> {
  const first = await fetchPage(url, 1);
  const all = [...first.listings];
  const total = first.total;

  const pages = Math.min(Math.ceil(total / 50), maxPages);

  // Fetch remaining pages in parallel (2 at a time to be polite)
  for (let p = 2; p <= pages; p += 2) {
    const batch = await Promise.allSettled([
      fetchPage(url, p),
      p + 1 <= pages ? fetchPage(url, p + 1) : null,
    ]);
    for (const result of batch) {
      if (result?.status === "fulfilled" && result.value) {
        all.push(...result.value.listings);
      }
    }
  }

  // Deduplicate by listingId
  const seen = new Set<string>();
  const deduped = all.filter(l => {
    if (seen.has(l.listingId)) return false;
    seen.add(l.listingId);
    return true;
  });

  return { listings: deduped, total };
}

// ─────────────────────────────────────────────
// Route: GET /listings/sales
// Active O'ahu MLS listings via IDX Broker
// ─────────────────────────────────────────────

router.get("/listings/sales", async (req, res) => {
  const now = Date.now();

  // Optional query filters forwarded to IDX
  const { city, minPrice, maxPrice, beds, baths, status } = req.query as Record<string, string>;

  // Only use cache for unfiltered requests
  const isFiltered = city || minPrice || maxPrice || beds || baths || status;

  if (!isFiltered && activeCache && activeCache.expiresAt > now) {
    res.json({
      listings: activeCache.listings,
      fetchedAt: activeCache.fetchedAt,
      count: activeCache.listings.length,
      total: activeCache.total,
      source: "idx_broker",
      cached: true,
    });
    return;
  }

  try {
    // Build IDX Broker search URL with optional filters
    const params = new URLSearchParams({ pt: "1" });
    if (city)     params.set("a", "city");
    if (minPrice) params.set("lp", minPrice);
    if (maxPrice) params.set("hp", maxPrice);
    if (beds)     params.set("bd", beds);
    if (baths)    params.set("ba", baths);

    const url = `${IDX_BASE}/results/listings?${params}`;
    const { listings, total } = await fetchAllPages(url, isFiltered ? 2 : MAX_PAGES);
    const fetchedAt = new Date().toISOString();

    if (!isFiltered) {
      activeCache = { listings, fetchedAt, expiresAt: now + CACHE_ACTIVE_MS, total };
    }

    logger.info({ count: listings.length, total }, "IDX active listings fetched");

    res.json({ listings, fetchedAt, count: listings.length, total, source: "idx_broker", cached: false });
  } catch (err) {
    logger.error({ err }, "Failed to fetch IDX active listings");

    if (!isFiltered && activeCache) {
      res.json({ listings: activeCache.listings, fetchedAt: activeCache.fetchedAt, count: activeCache.listings.length, total: activeCache.total, source: "idx_broker", cached: true, stale: true });
      return;
    }

    res.status(502).json({ listings: [], count: 0, error: "Could not load listings" });
  }
});

// ─────────────────────────────────────────────
// Route: GET /listings/sold
// Recently sold O'ahu properties via IDX Broker
// ─────────────────────────────────────────────

router.get("/listings/sold", async (_req, res) => {
  const now = Date.now();

  if (soldCache && soldCache.expiresAt > now) {
    res.json({ listings: soldCache.listings, fetchedAt: soldCache.fetchedAt, count: soldCache.listings.length, total: soldCache.total, source: "idx_broker", cached: true });
    return;
  }

  try {
    const url = `${IDX_BASE}/results/listings?idxStatus=sold`;
    const { listings, total } = await fetchAllPages(url, 2);
    const fetchedAt = new Date().toISOString();

    // Mark all as sold
    listings.forEach(l => { l.status = "sold"; });

    soldCache = { listings, fetchedAt, expiresAt: now + CACHE_SOLD_MS, total };
    logger.info({ count: listings.length }, "IDX sold listings fetched");

    res.json({ listings, fetchedAt, count: listings.length, total, source: "idx_broker", cached: false });
  } catch (err) {
    logger.error({ err }, "Failed to fetch IDX sold listings");

    if (soldCache) {
      res.json({ listings: soldCache.listings, fetchedAt: soldCache.fetchedAt, count: soldCache.listings.length, total: soldCache.total, source: "idx_broker", cached: true, stale: true });
      return;
    }

    res.status(502).json({ listings: [], count: 0, error: "Could not load sold listings" });
  }
});

// ─────────────────────────────────────────────
// Route: GET /listings/featured
// Featured / highlighted listings from IDX Broker
// ─────────────────────────────────────────────

router.get("/listings/featured", async (_req, res) => {
  try {
    const url = `${IDX_BASE}/featured`;
    const { listings } = await fetchPage(url, 1);
    listings.forEach(l => { l.featured = true; });
    res.json({ listings, count: listings.length, source: "idx_broker" });
  } catch (err) {
    logger.error({ err }, "Failed to fetch IDX featured listings");
    res.status(502).json({ listings: [], count: 0, error: "Could not load featured listings" });
  }
});

// ─────────────────────────────────────────────
// Route: POST /listings/refresh
// Bust both caches (admin / cron use)
// ─────────────────────────────────────────────

router.post("/listings/refresh", async (_req, res) => {
  activeCache = null;
  soldCache = null;
  res.json({ refreshed: true, message: "Cache cleared — next request will fetch fresh data" });
});

// ─────────────────────────────────────────────
// Route: GET /listings/trestle
// Trestle (CoreLogic MLS) stub — ready to connect
// when Mel has her IDX approval + credentials
// ─────────────────────────────────────────────

const TRESTLE_CONFIG = {
  connected: false,
  provider: "CoreLogic Trestle",
  mls: "HI Central (HICMLS)",
  endpoint: "https://api-trestle.corelogic.com/trestle/odata/Property",
  credentialsNeeded: ["TRESTLE_CLIENT_ID", "TRESTLE_CLIENT_SECRET", "TRESTLE_MLS_ID"],
  docsUrl: "https://trestle.corelogic.com",
  statusMessage:
    "Trestle integration is ready to activate. IDX approval from HI Central MLS + CoreLogic credentials required.",
};

router.get("/listings/trestle", async (_req, res) => {
  if (!TRESTLE_CONFIG.connected) {
    res.json({ connected: false, listings: [], count: 0, ...TRESTLE_CONFIG });
    return;
  }

  const clientId = process.env.TRESTLE_CLIENT_ID;
  const clientSecret = process.env.TRESTLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(503).json({ connected: false, error: "Trestle credentials not configured", ...TRESTLE_CONFIG });
    return;
  }

  try {
    const tokenRes = await fetch("https://api-trestle.corelogic.com/trestle/oidc/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret, scope: "api" }).toString(),
    });
    const { access_token } = await tokenRes.json() as { access_token: string };

    const mlsId = process.env.TRESTLE_MLS_ID ?? "";
    const filter = ["MlsStatus eq 'Active'", mlsId ? `ListAgentMlsId eq '${mlsId}'` : ""].filter(Boolean).join(" and ");
    const params = new URLSearchParams({
      $filter: filter,
      $orderby: "ListingContractDate desc",
      $top: "50",
      $expand: "Media",
    });

    const dataRes = await fetch(`${TRESTLE_CONFIG.endpoint}?${params}`, {
      headers: { Authorization: `Bearer ${access_token}`, Accept: "application/json" },
    });
    const data = await dataRes.json() as { value: any[] };

    res.json({ connected: true, listings: data.value ?? [], count: (data.value ?? []).length, source: "trestle" });
  } catch (err) {
    logger.error({ err }, "Trestle fetch error");
    res.status(502).json({ connected: false, error: "Trestle fetch failed", listings: [], count: 0 });
  }
});

export default router;
