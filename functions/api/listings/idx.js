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

// Extract the value text from a span with a given class (no nesting needed)
function extractSpan(html, spanClass) {
  const re = new RegExp(`class="IDX-${spanClass}[^"]*"[^>]*>([^<]*)`, "i");
  const m = html.match(re);
  return m ? m[1].replace(/&[a-z#0-9]+;/g, " ").trim() : "";
}

// Extract the value from inside an IDX field div:
// <div class="IDX-field-X ..."><span class="IDX-label">Label</span><span class="IDX-text|IDX-resultsText">VALUE</span></div>
function extractFieldValue(html, fieldClass) {
  const fieldRe = new RegExp(`class="IDX-${fieldClass}[^"]*"[^>]*>([\\s\\S]*?)</div>`, "i");
  const fieldMatch = html.match(fieldRe);
  if (!fieldMatch) return "";
  const inner = fieldMatch[1];
  const valRe = /class="IDX-(?:resultsText|text)"[^>]*>([^<]*)/i;
  const valMatch = inner.match(valRe);
  return valMatch ? valMatch[1].replace(/&[a-z#0-9]+;/g, " ").trim() : "";
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

    // Photo — src is on the img tag
    const photoMatch = cell.match(/class="IDX-resultsPhotoImg[^"]*"[\s\S]*?src="([^"]+)"/);
    const photo = photoMatch?.[1] ?? "";

    // Listing detail URL — from the photo or address link
    const linkMatch = cell.match(/class="IDX-resultsPhotoLink[^"]*"[^>]*href="([^"]+)"/)
      || cell.match(/class="IDX-resultsAddressLink[^"]*"[^>]*href="([^"]+)"/);
    const listingUrl = linkMatch?.[1] ?? "";

    // Address — IDX Broker splits into individual span classes
    const addrNum  = extractSpan(cell, "resultsAddressNumber");   // "7533 "
    const addrDir  = extractSpan(cell, "resultsAddressDirection"); // "N " or ""
    const addrName = extractSpan(cell, "resultsAddressName");      // "Kamaomao Place"
    const addrUnit = extractSpan(cell, "resultsAddressUnitNumber");// "#904" or ""
    const city     = extractSpan(cell, "resultsAddressCity");      // "Honolulu"
    const state    = extractSpan(cell, "resultsAddressStateAbrv"); // "HI"
    const zip      = extractSpan(cell, "resultsAddressZip");       // "96825"

    const streetParts = [addrNum, addrDir, addrName, addrUnit].map(s => s.trim()).filter(Boolean);
    const street = streetParts.join(" ");
    const cityLine = [city, state].filter(Boolean).join(", ") + (zip ? ` ${zip}` : "");
    const address = [street, cityLine].filter(Boolean).join(", ");

    // Beds / baths / sqft — values live in IDX-resultsText or IDX-text inside the field div
    const beds = parseInt(extractFieldValue(cell, "field-bedrooms") || "0", 10);
    const baths = parseFloat(extractFieldValue(cell, "field-totalBaths") || extractFieldValue(cell, "field-fullBaths") || "0");
    const sqftRaw = extractFieldValue(cell, "field-sqFt").replace(/,/g, "");
    const sqft = parseInt(sqftRaw || "0", 10);

    // Status
    const status = extractFieldValue(cell, "field-propStatus") || "Active";

    // MLS# — embed in listing cell as IDX-field-listingID or fallback to id
    const mlsNum = extractFieldValue(cell, "field-listingID") || listingId;

    // Courtesy — strip "Listing courtesy of" prefix if present
    const courtesyRaw = extractSpan(cell, "MLSCourtesy");
    const courtesy = courtesyRaw.replace(/^listing courtesy of\s*/i, "").trim();

    // Formatted price (data-price is raw integer)
    const priceText = price >= 1000000
      ? `$${(price / 1000000).toFixed(price % 1000000 === 0 ? 1 : 2)}M`
      : price >= 1000
        ? `$${(price / 1000).toFixed(0)}K`
        : price > 0 ? `$${price.toLocaleString()}` : "";

    const absUrl = listingUrl.startsWith("http")
      ? listingUrl
      : listingUrl
        ? `https://shopoahuproperties.idxbroker.com${listingUrl.startsWith("/") ? "" : "/"}${listingUrl}`
        : "";

    if (!address && !price) continue;

    listings.push({
      id: listingId,
      mlsNum,
      mlsNumber: mlsNum,
      price,
      priceText,
      address: street,
      city,
      state,
      zip,
      beds,
      baths,
      sqft,
      photo,
      listingUrl: absUrl,
      courtesy,
      brokerage: courtesy,
      status,
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
