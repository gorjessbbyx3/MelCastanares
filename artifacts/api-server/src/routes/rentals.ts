import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const APPFOLIO_URL = "https://dreamhomerlty.appfolio.com/listings/listings";
const APPFOLIO_BASE = "https://dreamhomerlty.appfolio.com";
const CACHE_TTL_MS = 5 * 60 * 60 * 1000; // 5 hours

// ─────────────────────────────────────────────
// In-memory cache
// ─────────────────────────────────────────────

interface CachedListings {
  properties: RentalProperty[];
  fetchedAt: string;
  expiresAt: number;
}

interface RentalProperty {
  id: string;
  listingId: string;
  type: "rental";
  status: "active" | "coming_soon";
  title: string;
  address: string;
  city: string;
  price: number;
  priceLabel: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  available: string;
  description: string;
  amenities: string;
  petPolicy: string;
  featured: boolean;
  images: { url: string; isPrimary: boolean }[];
  detailUrl: string;
  applyUrl: string;
}

let cache: CachedListings | null = null;

// ─────────────────────────────────────────────
// HTML Parser (mirrors workers/mel-listings)
// ─────────────────────────────────────────────

function parseOne(block: string): RentalProperty | null {
  const uuidMatch = block.match(/href="\/listings\/detail\/([a-f0-9-]+)"/);
  const uuid = uuidMatch?.[1];
  if (!uuid) return null;

  const numIdMatch = block.match(/id="listing_(\d+)"/);
  const numId = numIdMatch?.[1] ?? uuid;

  const titleMatch = block.match(/js-listing-title[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
  const title = titleMatch?.[1]?.trim() ?? "";

  const addrMatch = block.match(/js-listing-address[^>]*>([^<]+)<\/span>/);
  const fullAddress = addrMatch?.[1]?.trim() ?? "";
  const addrParts = fullAddress.split(",").map((s) => s.trim());
  const city = addrParts.length >= 2 ? addrParts.slice(-2).join(", ") : fullAddress;
  const address = addrParts.length > 2 ? addrParts.slice(0, -2).join(", ") : addrParts[0] ?? fullAddress;

  const imgMatch = block.match(/data-original="([^"]+)"/);
  const imageUrl = imgMatch?.[1]
    ?.replace("/medium.", "/large.")
    .replace("/thumbnail.", "/large.");

  const rentMatch = block.match(/RENT<\/dt>\s*<dd[^>]*>\$([0-9,]+)<\/dd>/);
  const price = rentMatch ? parseInt(rentMatch[1].replace(/,/g, ""), 10) : 0;

  const sqftMatch = block.match(/Square Feet<\/dt>\s*<dd[^>]*>([0-9,]+)<\/dd>/);
  const sqft = sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, ""), 10) : 0;

  const bedBathMatch = block.match(/(\d+) bd \/ (\d+(?:\.\d+)?) ba/);
  const bedrooms = bedBathMatch ? parseInt(bedBathMatch[1], 10) : 0;
  const bathrooms = bedBathMatch ? parseFloat(bedBathMatch[2]) : 0;

  const availMatch = block.match(/js-listing-available[^>]*>([^<]+)<\/dd>/);
  const available = availMatch?.[1]?.trim() ?? "";

  const descMatch = block.match(/js-listing-description[^>]*>([^<]+)<\/p>/);
  const description = descMatch?.[1]?.trim() ?? "";

  const amenMatch = block.match(/Amenities:<\/span>\s*([\s\S]*?)<br>/);
  const amenities = amenMatch?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";

  const petMatch = block.match(/Pet Policy:<\/span>\s*([\s\S]*?)<\/span>/);
  const petPolicy = petMatch?.[1]?.replace(/<[^>]+>/g, "").trim() ?? "";

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

function parseListings(html: string): RentalProperty[] {
  const blocks = html.split(/(?=<div[^>]+class="[^"]*listing-item result[^"]*")/);
  const listings: RentalProperty[] = [];
  for (const block of blocks) {
    if (!block.includes('class="listing-item result')) continue;
    try {
      const listing = parseOne(block);
      if (listing?.title) listings.push(listing);
    } catch {
      // skip malformed block
    }
  }
  return listings;
}

async function fetchListings(): Promise<RentalProperty[]> {
  const res = await fetch(APPFOLIO_URL, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; DreamHomeRealtyListingsBot/1.0)",
      Accept: "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) throw new Error(`AppFolio HTTP ${res.status}`);
  const html = await res.text();
  return parseListings(html);
}

// ─────────────────────────────────────────────
// Route: GET /rentals
// ─────────────────────────────────────────────

router.get("/rentals", async (_req, res) => {
  const now = Date.now();

  if (cache && cache.expiresAt > now) {
    res.json({
      properties: cache.properties,
      fetchedAt: cache.fetchedAt,
      source: "appfolio",
      cached: true,
      count: cache.properties.length,
    });
    return;
  }

  try {
    const properties = await fetchListings();
    const fetchedAt = new Date().toISOString();

    cache = { properties, fetchedAt, expiresAt: now + CACHE_TTL_MS };
    logger.info({ count: properties.length }, "AppFolio listings refreshed");

    res.json({
      properties,
      fetchedAt,
      source: "appfolio",
      cached: false,
      count: properties.length,
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch AppFolio listings");

    if (cache) {
      res.json({
        properties: cache.properties,
        fetchedAt: cache.fetchedAt,
        source: "appfolio",
        cached: true,
        stale: true,
        count: cache.properties.length,
      });
      return;
    }

    res.status(502).json({
      error: "Could not load rental listings",
      properties: [],
    });
  }
});

export default router;
