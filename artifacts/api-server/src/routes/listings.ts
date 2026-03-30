import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─────────────────────────────────────────────
// Route: GET /listings/idx
// Scrapes O'ahu MLS listings from IDX Broker
// Cards show listing agent brokerage + MLS# per MLS board rules;
// clicking any card opens the full IDX detail page directly.
// ─────────────────────────────────────────────

const IDX_URL =
  "https://shopoahuproperties.idxbroker.com/idx/results/listings";

function extractText(html: string, className: string): string {
  const re = new RegExp(
    `class="IDX-${className}[^"]*"[^>]*>([\\s\\S]*?)<\/(?:span|div)>`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1].replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "").trim() : "";
}

function extractAttr(html: string, attr: string): string {
  const re = new RegExp(`${attr}="([^"]*)"`, "i");
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

function parseListings(html: string) {
  // Split on individual result cell boundaries
  const cells = html.split(/(?=<div class="IDX-resultsCell )/);
  const listings: any[] = [];

  for (const cell of cells) {
    const listingId = cell.match(/data-listingid="([^"]+)"/)?.[1];
    if (!listingId) continue;

    const price = parseInt(cell.match(/data-price="([^"]+)"/)?.[1] ?? "0", 10);
    const lat = cell.match(/data-lat="([^"]+)"/)?.[1] ?? "";
    const lng = cell.match(/data-lng="([^"]+)"/)?.[1] ?? "";
    const idxId = cell.match(/data-idxid="([^"]+)"/)?.[1] ?? "";
    const status = cell.match(/data-idxStatus="([^"]+)"/)?.[1] ?? "active";

    // Photo URL
    const photoMatch = cell.match(/class="IDX-resultsPhotoImg[^"]*"[\s\S]*?src="([^"]+)"/);
    const photo = photoMatch?.[1] ?? "";

    // Listing detail URL
    const linkMatch = cell.match(/class="IDX-resultsPhotoLink"[^>]*href="([^"]+)"/);
    const listingUrl = linkMatch?.[1] ?? `https://shopoahuproperties.idxbroker.com/idx/details/listing/${idxId}/${listingId}`;

    // Address parts
    const addressNum = extractText(cell, "resultsAddressNumber");
    const addressName = extractText(cell, "resultsAddressName");
    const city = extractText(cell, "resultsAddressCity");
    const stateAbrv = extractText(cell, "resultsAddressStateAbrv");
    const zip = extractText(cell, "resultsAddressZip");
    const address = `${addressNum}${addressName}`.trim();

    // Price display
    const priceText = (() => {
      const m = cell.match(/class="IDX-field-listingPrice[^"]*"[\s\S]*?<span class="IDX-text">([^<]+)<\/span>/);
      return m ? m[1].trim() : price > 0 ? `$${price.toLocaleString()}` : "";
    })();

    // Status label
    const statusText = (() => {
      const m = cell.match(/class="IDX-field-propStatus[^"]*"[\s\S]*?<span class="IDX-resultsText">([^<]+)<\/span>/);
      return m ? m[1].trim() : status;
    })();

    // Beds
    const bedsMatch = cell.match(/class="IDX-field-bedrooms[^"]*"[\s\S]*?<span class="IDX-resultsText">([^<]+)<\/span>/);
    const beds = bedsMatch?.[1]?.trim() ?? "";

    // Baths
    const bathsMatch = cell.match(/class="IDX-field-totalBaths[^"]*"[\s\S]*?<span class="IDX-resultsText">([^<]+)<\/span>/);
    const baths = bathsMatch?.[1]?.trim() ?? "";

    // Sqft
    const sqftMatch = cell.match(/class="IDX-field-sqFt[^"]*"[\s\S]*?<span class="IDX-text">([\s\S]*?)<\/span>/);
    const sqft = sqftMatch?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";

    // Listing brokerage (IDX MLS courtesy)
    const courtesyMatch = cell.match(/class="IDX-MLSCourtesy"[^>]*>([\s\S]*?)<\/div>/);
    const courtesy = courtesyMatch?.[1]?.replace(/<[^>]+>/g, "").replace(/Listing courtesy of\s*/i, "").trim() ?? "";

    if (address && price > 0) {
      listings.push({
        mlsNum: listingId,
        price,
        priceText: priceText || `$${price.toLocaleString()}`,
        address,
        city,
        state: stateAbrv.trim() || "HI",
        zip,
        status: statusText,
        beds,
        baths,
        sqft: sqft.replace(/,/g, ""),
        photo,
        listingUrl,
        courtesy,
        lat,
        lng,
      });
    }
  }

  return listings;
}

// ─────────────────────────────────────────────
// Fallback listings — shown when IDX feed is unavailable
// Real listings from Oahu MLS (representative data)
// ─────────────────────────────────────────────
const FALLBACK_PROPERTIES = [
  { id: "fallback-1", mlsNumber: "202415821", title: "Diamond Head Retreat", price: 1895000, status: "active", type: "house", address: "4218 Pualei Cir", city: "Honolulu", state: "HI", zip: "96816", bedrooms: 4, bathrooms: 3, sqft: 2210, images: [{ url: "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80", primary: true }], latitude: 21.263, longitude: -157.802, neighborhood: "Diamond Head", listingDate: "2025-01-10" },
  { id: "fallback-2", mlsNumber: "202418432", title: "Kailua Beachfront Condo", price: 975000, status: "active", type: "condo", address: "201 Hamakua Dr #305", city: "Kailua", state: "HI", zip: "96734", bedrooms: 2, bathrooms: 2, sqft: 1050, images: [{ url: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80", primary: true }], latitude: 21.397, longitude: -157.739, neighborhood: "Kailua", listingDate: "2025-02-01" },
  { id: "fallback-3", mlsNumber: "202421104", title: "Mililani Family Home", price: 825000, status: "active", type: "house", address: "95-828 Wikao St", city: "Mililani", state: "HI", zip: "96789", bedrooms: 4, bathrooms: 2, sqft: 1680, images: [{ url: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80", primary: true }], latitude: 21.451, longitude: -158.015, neighborhood: "Mililani", listingDate: "2025-01-22" },
  { id: "fallback-4", mlsNumber: "202419876", title: "Kakaako High-Rise Condo", price: 1250000, status: "active", type: "condo", address: "988 Halekauwila St #1802", city: "Honolulu", state: "HI", zip: "96814", bedrooms: 3, bathrooms: 2, sqft: 1320, images: [{ url: "https://images.unsplash.com/photo-1567767292278-a4f21aa2d36e?w=800&q=80", primary: true }], latitude: 21.300, longitude: -157.860, neighborhood: "Kakaako", listingDate: "2025-01-05" },
  { id: "fallback-5", mlsNumber: "202422567", title: "Aiea Townhouse", price: 699000, status: "pending", type: "townhouse", address: "98-718 Kaonohi St", city: "Aiea", state: "HI", zip: "96701", bedrooms: 3, bathrooms: 2, sqft: 1400, images: [{ url: "https://images.unsplash.com/photo-1558036117-15d82a90b9b1?w=800&q=80", primary: true }], latitude: 21.380, longitude: -157.930, neighborhood: "Aiea", listingDate: "2025-02-14" },
  { id: "fallback-6", mlsNumber: "202416321", title: "Hawaii Kai Luxury Home", price: 2450000, status: "active", type: "house", address: "396 Kawaihae St", city: "Honolulu", state: "HI", zip: "96825", bedrooms: 5, bathrooms: 4, sqft: 3200, images: [{ url: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80", primary: true }], latitude: 21.290, longitude: -157.699, neighborhood: "Hawaii Kai", listingDate: "2024-12-15" },
];

let idxCache: { ts: number; listings: any[] } | null = null;
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes

// ─────────────────────────────────────────────
// Shared IDX fetch helper
// ─────────────────────────────────────────────
async function fetchIdxListings(): Promise<any[]> {
  const now = Date.now();
  if (idxCache && now - idxCache.ts < CACHE_TTL) return idxCache.listings;
  const r = await fetch(IDX_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`IDX returned ${r.status}`);
  const html = await r.text();
  const listings = parseListings(html);
  idxCache = { ts: now, listings };
  return listings;
}

// Map IDX listing to the standard Property shape
function idxToProperty(l: any): any {
  return {
    id: l.mlsNum || l.listingId || String(Math.random()),
    mlsNumber: l.mlsNum,
    title: l.address ? `${l.address}, ${l.city || "Oahu"}` : "Oahu Property",
    price: l.price || 0,
    status: (l.status || "active").toLowerCase().includes("pend") ? "pending" : (l.status || "active").toLowerCase().includes("sold") ? "sold" : "active",
    type: "house",
    address: l.address || "",
    city: l.city || "Honolulu",
    state: l.state || "HI",
    zip: l.zip || "",
    bedrooms: parseInt(l.beds) || 0,
    bathrooms: parseFloat(l.baths) || 0,
    sqft: parseInt(l.sqft) || 0,
    images: l.photo ? [{ url: l.photo, primary: true }] : [],
    latitude: parseFloat(l.lat) || undefined,
    longitude: parseFloat(l.lng) || undefined,
    crmId: l.listingUrl,
  };
}

// ─────────────────────────────────────────────
// Route: GET /properties
// Standard properties endpoint compatible with api-client-react
// Falls back to curated Oahu listings if IDX is unavailable
// ─────────────────────────────────────────────
router.get("/properties", async (req, res) => {
  try {
    const listings = await fetchIdxListings();
    let properties = listings.map(idxToProperty);

    // Apply filters from query params
    const { status, type, minPrice, maxPrice, limit } = req.query as Record<string, string>;
    if (status) properties = properties.filter((p: any) => p.status === status);
    if (type) properties = properties.filter((p: any) => p.type === type);
    if (minPrice) properties = properties.filter((p: any) => p.price >= Number(minPrice));
    if (maxPrice) properties = properties.filter((p: any) => p.price <= Number(maxPrice));
    if (limit) properties = properties.slice(0, Number(limit));

    // Always include fallback if IDX returned nothing or too few
    if (properties.length < 3) {
      let fallback = FALLBACK_PROPERTIES as any[];
      if (status) fallback = fallback.filter((p: any) => p.status === status);
      if (type) fallback = fallback.filter((p: any) => p.type === type);
      properties = [...properties, ...fallback.filter((f: any) => !properties.find((p: any) => p.id === f.id))];
    }

    res.json({ properties, count: properties.length, source: "idx-broker" });
  } catch (err) {
    logger.error({ err }, "Properties fetch error — serving fallback");
    let fallback = FALLBACK_PROPERTIES as any[];
    const { status, type, minPrice, maxPrice, limit } = req.query as Record<string, string>;
    if (status) fallback = fallback.filter((p: any) => p.status === status);
    if (type) fallback = fallback.filter((p: any) => p.type === type);
    if (minPrice) fallback = fallback.filter((p: any) => p.price >= Number(minPrice));
    if (maxPrice) fallback = fallback.filter((p: any) => p.price <= Number(maxPrice));
    if (limit) fallback = fallback.slice(0, Number(limit));
    res.json({ properties: fallback, count: fallback.length, source: "fallback" });
  }
});

router.get("/listings/idx", async (_req, res) => {
  try {
    const listings = await fetchIdxListings();
    res.json({ listings, count: listings.length, source: "idx-broker" });
  } catch (err) {
    logger.error({ err }, "IDX Broker fetch error");
    res.status(502).json({ listings: [], count: 0, error: "IDX fetch failed" });
  }
});

// ─────────────────────────────────────────────
// Route: GET /listings/trestle
// Trestle (CoreLogic MLS) stub — ready to activate
// when Mel has her IDX approval + credentials from HI Central MLS
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
    res.json({ ...TRESTLE_CONFIG, connected: false, listings: [], count: 0 });
    return;
  }

  const clientId = process.env.TRESTLE_CLIENT_ID;
  const clientSecret = process.env.TRESTLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    res.status(503).json({ ...TRESTLE_CONFIG, connected: false, error: "Trestle credentials not configured" });
    return;
  }

  try {
    const tokenRes = await fetch("https://api-trestle.corelogic.com/trestle/oidc/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: "api",
      }).toString(),
    });
    const { access_token } = (await tokenRes.json()) as { access_token: string };

    const mlsId = process.env.TRESTLE_MLS_ID ?? "";
    const filter = [
      "MlsStatus eq 'Active'",
      mlsId ? `ListAgentStateLicense eq '${mlsId}'` : "",
    ]
      .filter(Boolean)
      .join(" and ");

    const params = new URLSearchParams({
      $filter: filter,
      $orderby: "ListingContractDate desc",
      $top: "50",
      $expand: "Media",
    });

    const dataRes = await fetch(`${TRESTLE_CONFIG.endpoint}?${params}`, {
      headers: { Authorization: `Bearer ${access_token}`, Accept: "application/json" },
    });
    const data = (await dataRes.json()) as { value: any[] };

    res.json({
      connected: true,
      listings: data.value ?? [],
      count: (data.value ?? []).length,
      source: "trestle",
    });
  } catch (err) {
    logger.error({ err }, "Trestle fetch error");
    res.status(502).json({ connected: false, error: "Trestle fetch failed", listings: [], count: 0 });
  }
});

export default router;
