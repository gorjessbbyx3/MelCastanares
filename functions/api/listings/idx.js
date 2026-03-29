// ═══════════════════════════════════════════════════════════
// Cloudflare Pages Function — GET /api/listings/idx
// Scrapes O'ahu MLS listings from IDX Broker and returns JSON.
// Cached for 20 minutes using Cloudflare's Cache API.
// ═══════════════════════════════════════════════════════════

const IDX_URL = "https://shopoahuproperties.idxbroker.com/idx/results/listings";
const CACHE_TTL = 20 * 60; // 20 minutes in seconds
const CACHE_KEY = "https://mel-idx-cache.internal/listings-v2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function extractText(html, className) {
  const re = new RegExp(
    `class="IDX-${className}[^"]*"[^>]*>([\\s\\S]*?)<\\/(?:span|div)>`,
    "i"
  );
  const m = html.match(re);
  return m ? m[1].replace(/<[^>]+>/g, "").replace(/&[a-z#0-9]+;/g, " ").trim() : "";
}

function extractAttr(html, attr) {
  const re = new RegExp(`${attr}="([^"]*)"`, "i");
  const m = html.match(re);
  return m ? m[1].trim() : "";
}

function parseListings(html) {
  const cells = html.split(/(?=<div class="IDX-resultsCell )/);
  const listings = [];

  for (const cell of cells) {
    const listingId = cell.match(/data-listingid="([^"]+)"/)?.[1];
    if (!listingId) continue;

    const price = parseInt(cell.match(/data-price="([^"]+)"/)?.[1] ?? "0", 10);
    const lat = cell.match(/data-lat="([^"]+)"/)?.[1] ?? "";
    const lng = cell.match(/data-lng="([^"]+)"/)?.[1] ?? "";
    const idxId = cell.match(/data-idxid="([^"]+)"/)?.[1] ?? "";

    // Photo
    const photoMatch = cell.match(/class="IDX-resultsPhotoImg[^"]*"[\s\S]*?src="([^"]+)"/);
    const photo = photoMatch?.[1] ?? "";

    // Listing detail URL
    const linkMatch = cell.match(/class="IDX-resultsPhotoLink[^"]*"[^>]*href="([^"]+)"/);
    const listingUrl = linkMatch?.[1] ?? "";

    // Address parts
    const street = extractText(cell, "resultsCellAddress");
    const cityStateZip = extractText(cell, "resultsCellCityStateZip");
    const address = street || cityStateZip
      ? [street, cityStateZip].filter(Boolean).join(", ")
      : "";

    // Stats
    const beds = parseInt(extractText(cell, "resultsBeds") || "0", 10);
    const baths = parseFloat(extractText(cell, "resultsBaths") || "0");
    const sqft = parseInt((extractText(cell, "resultsSqFt") || "0").replace(/,/g, ""), 10);

    // MLS# and brokerage
    const mlsMatch = cell.match(/MLS[#:\s]+([A-Z0-9]+)/i);
    const mlsNumber = mlsMatch?.[1] ?? listingId;
    const brokerage = extractText(cell, "MLSCourtesy") || extractText(cell, "resultsCourtesy") || "";

    if (!address && !price) continue;

    listings.push({
      id: listingId,
      mlsNumber,
      price,
      address,
      beds,
      baths,
      sqft,
      photo,
      listingUrl,
      brokerage,
      idxId,
      lat,
      lng,
      source: "idx-broker",
    });
  }

  return listings;
}

export async function onRequestGet(ctx) {
  // Handle CORS preflight
  if (ctx.request.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const cache = caches.default;
  const cacheReq = new Request(CACHE_KEY);

  // Try cache first
  const cached = await cache.match(cacheReq);
  if (cached) {
    return new Response(cached.body, {
      headers: { ...CORS, "Content-Type": "application/json", "X-Cache": "HIT" },
    });
  }

  // Cache miss — scrape IDX Broker
  try {
    const r = await fetch(IDX_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Referer": "https://shopoahuproperties.idxbroker.com/",
      },
    });

    if (!r.ok) {
      return new Response(
        JSON.stringify({ listings: [], count: 0, error: `IDX returned ${r.status}` }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const html = await r.text();
    const listings = parseListings(html);

    const payload = JSON.stringify({
      listings,
      count: listings.length,
      cached: false,
      source: "idx-broker",
      fetchedAt: new Date().toISOString(),
    });

    const response = new Response(payload, {
      headers: {
        ...CORS,
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_TTL}`,
        "X-Cache": "MISS",
      },
    });

    // Store in Cloudflare cache
    ctx.waitUntil(cache.put(cacheReq, response.clone()));

    return response;
  } catch (err) {
    return new Response(
      JSON.stringify({ listings: [], count: 0, error: String(err) }),
      { status: 502, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
