// ═══════════════════════════════════════════════════════════════
// MEL LISTINGS — Cloudflare Worker
// Scrapes AppFolio rental listings every 5 hours via cron trigger,
// caches in KV, and serves as a JSON API with CORS.
// ═══════════════════════════════════════════════════════════════

const APPFOLIO_URL = "https://dreamhomerlty.appfolio.com/listings/listings";
const APPFOLIO_BASE = "https://dreamhomerlty.appfolio.com";
const CACHE_KEY = "rental_listings_v1";
const CACHE_TTL_SECONDS = 5 * 60 * 60; // 5 hours

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=300",
};

// ─────────────────────────────────────────────────────────────
// SCRAPE + PARSE
// ─────────────────────────────────────────────────────────────

async function scrapeAppFolio() {
  const res = await fetch(APPFOLIO_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; DreamHomeRealtyListingsBot/1.0; +https://melcastanares.com)",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    throw new Error(`AppFolio returned HTTP ${res.status}`);
  }

  const html = await res.text();
  return parseListings(html);
}

function parseListings(html) {
  const listings = [];

  // Split HTML on each listing card boundary using the id="listing_N" divs
  const blocks = html.split(/(?=<div[^>]+class="[^"]*listing-item result[^"]*")/);

  for (const block of blocks) {
    if (!block.includes('class="listing-item result')) continue;
    try {
      const listing = parseOneBlock(block);
      if (listing && listing.title) {
        listings.push(listing);
      }
    } catch {
      // skip malformed block
    }
  }

  return listings;
}

function parseOneBlock(block) {
  // UUID / slug from detail link
  const uuidMatch = block.match(/href="\/listings\/detail\/([a-f0-9-]+)"/);
  const uuid = uuidMatch ? uuidMatch[1] : null;
  if (!uuid) return null;

  // Numeric listing ID
  const numIdMatch = block.match(/id="listing_(\d+)"/);
  const numId = numIdMatch ? numIdMatch[1] : uuid;

  // Title (trim whitespace and trailing space)
  const titleMatch = block.match(/js-listing-title[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
  const title = titleMatch ? titleMatch[1].trim() : "";

  // Full address → split into street + city/state
  const addrMatch = block.match(/js-listing-address[^>]*>([^<]+)<\/span>/);
  const fullAddress = addrMatch ? addrMatch[1].trim() : "";
  const addrParts = fullAddress.split(",").map((s) => s.trim());
  const city =
    addrParts.length >= 2
      ? addrParts.slice(-2).join(", ")
      : fullAddress;
  const address =
    addrParts.length > 2
      ? addrParts.slice(0, -2).join(", ")
      : addrParts[0] || fullAddress;

  // Primary image — prefer large over medium
  const imgMatch = block.match(/data-original="([^"]+)"/);
  const imageUrl = imgMatch
    ? imgMatch[1].replace("/medium.", "/large.").replace("/thumbnail.", "/large.")
    : "";

  // Rent
  const rentMatch = block.match(/RENT<\/dt>\s*<dd[^>]*>\$([0-9,]+)<\/dd>/);
  const price = rentMatch ? parseInt(rentMatch[1].replace(/,/g, ""), 10) : 0;

  // Square feet
  const sqftMatch = block.match(/Square Feet<\/dt>\s*<dd[^>]*>([0-9,]+)<\/dd>/);
  const sqft = sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, ""), 10) : 0;

  // Bedrooms / bathrooms
  const bedBathMatch = block.match(/(\d+) bd \/ (\d+(?:\.\d+)?) ba/);
  const bedrooms = bedBathMatch ? parseInt(bedBathMatch[1], 10) : 0;
  const bathrooms = bedBathMatch ? parseFloat(bedBathMatch[2]) : 0;

  // Availability
  const availMatch = block.match(/js-listing-available[^>]*>([^<]+)<\/dd>/);
  const available = availMatch ? availMatch[1].trim() : "";

  // Description (truncated in listing view)
  const descMatch = block.match(/js-listing-description[^>]*>([^<]+)<\/p>/);
  const description = descMatch ? descMatch[1].trim() : "";

  // Amenities (text between "Amenities:</span>" and "<br>")
  const amenMatch = block.match(/Amenities:<\/span>\s*([\s\S]*?)<br>/);
  const amenities = amenMatch ? amenMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  // Pet policy
  const petMatch = block.match(/Pet Policy:<\/span>\s*([\s\S]*?)<\/span>/);
  const petPolicy = petMatch ? petMatch[1].replace(/<[^>]+>/g, "").trim() : "";

  return {
    id: uuid,
    listingId: numId,
    type: "rental",
    status: available.toLowerCase() === "now" ? "active" : "coming_soon",
    title,
    address,
    city,
    price,
    priceLabel: "/mo",
    bedrooms,
    bathrooms,
    sqft,
    available,
    description,
    amenities,
    petPolicy,
    featured: false,
    images: imageUrl ? [{ url: imageUrl, isPrimary: true }] : [],
    detailUrl: `${APPFOLIO_BASE}/listings/detail/${uuid}`,
    applyUrl: `${APPFOLIO_BASE}/listings/rental_applications/new?listable_uid=${uuid}&source=Website`,
  };
}

// ─────────────────────────────────────────────────────────────
// SCHEDULED HANDLER — runs on cron (every 5 hours)
// ─────────────────────────────────────────────────────────────

async function runScrape(env) {
  const properties = await scrapeAppFolio();
  const payload = JSON.stringify({
    properties,
    fetchedAt: new Date().toISOString(),
    source: "appfolio",
    count: properties.length,
  });
  await env.LISTINGS_CACHE.put(CACHE_KEY, payload, {
    expirationTtl: CACHE_TTL_SECONDS,
  });
  console.log(`[mel-listings] Cached ${properties.length} listings`);
  return properties.length;
}

// ─────────────────────────────────────────────────────────────
// FETCH HANDLER — serves cached listings over HTTP
// ─────────────────────────────────────────────────────────────

export default {
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScrape(env));
  },

  async fetch(request, env, ctx) {
    // CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== "GET") {
      return new Response(JSON.stringify({ error: "GET only" }), {
        status: 405,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    const url = new URL(request.url);

    // POST /scrape — manual trigger for testing (requires ?secret=...)
    if (url.pathname === "/scrape") {
      const secret = url.searchParams.get("secret");
      if (secret !== (env.SCRAPE_SECRET || "")) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      const count = await runScrape(env);
      return new Response(JSON.stringify({ ok: true, count }), {
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // GET / or /listings — serve cached data
    let cached = await env.LISTINGS_CACHE.get(CACHE_KEY);

    if (!cached) {
      // Cache miss: scrape on-demand and warm the cache
      ctx.waitUntil(runScrape(env));
      try {
        const properties = await scrapeAppFolio();
        const payload = {
          properties,
          fetchedAt: new Date().toISOString(),
          source: "appfolio",
          cached: false,
          count: properties.length,
        };
        return new Response(JSON.stringify(payload), {
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      } catch (err) {
        return new Response(
          JSON.stringify({ error: "Failed to fetch listings", detail: String(err) }),
          {
            status: 502,
            headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          }
        );
      }
    }

    const data = JSON.parse(cached);
    data.cached = true;

    return new Response(JSON.stringify(data), {
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  },
};
