import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────

const REALTY_URL = "https://www.realty.com/office/148284/hawaii_dream_realty_llc";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export interface SaleListing {
  id: string;
  type: "sale" | "rental" | "land";
  status: "active" | "pending" | "coming_soon";
  title: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  priceLabel: string;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSqft: number;
  yearBuilt: number;
  garageSpaces: number;
  description: string;
  propertyType: string;
  mlsId: string;
  featured: boolean;
  images: { url: string; isPrimary: boolean }[];
  listingUrl: string;
  openHouse?: { date: string; timeStart: string; timeEnd: string };
  daysOnMarket: number;
  pricePerSqft: number;
  source: "realty_com" | "trestle" | "manual";
  lastUpdated: string;
}

interface Cache {
  listings: SaleListing[];
  fetchedAt: string;
  expiresAt: number;
  source: string;
}

let salesCache: Cache | null = null;

// ─────────────────────────────────────────────
// Realty.com HTML Parser
// ─────────────────────────────────────────────

function parseListing(block: string, idx: number): SaleListing | null {
  // Address
  const addrMatch =
    block.match(/data-address="([^"]+)"/) ||
    block.match(/class="[^"]*address[^"]*"[^>]*>([^<]+)</) ||
    block.match(/address[^>]*>([^<]{5,80})</i);
  const fullAddress = addrMatch?.[1]?.trim() ?? "";

  // Price — look for $NNN,NNN pattern
  const priceMatch =
    block.match(/data-price="([0-9]+)"/) ||
    block.match(/\$([0-9]{2,3}(?:,[0-9]{3})+)/) ||
    block.match(/price[^>]*>\$?([0-9,]+)/i);
  const price = priceMatch
    ? parseInt(priceMatch[1].replace(/,/g, ""), 10)
    : 0;

  // Beds / baths
  const bedMatch =
    block.match(/data-beds="([0-9]+)"/) ||
    block.match(/([0-9]+)\s*(?:bd|bed|BR)/i);
  const bathMatch =
    block.match(/data-baths="([0-9.]+)"/) ||
    block.match(/([0-9.]+)\s*(?:ba|bath|bath)/i);
  const bedrooms = bedMatch ? parseInt(bedMatch[1], 10) : 0;
  const bathrooms = bathMatch ? parseFloat(bathMatch[1]) : 0;

  // Sqft
  const sqftMatch =
    block.match(/data-sqft="([0-9,]+)"/) ||
    block.match(/([0-9,]+)\s*(?:sq\.?\s*ft|sqft)/i);
  const sqft = sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, ""), 10) : 0;

  // Image
  const imgMatch =
    block.match(/data-src="(https:\/\/[^"]+(?:jpg|jpeg|webp|png)[^"]*)"/) ||
    block.match(/src="(https:\/\/[^"]+(?:jpg|jpeg|webp|png)[^"]*)"/) ||
    block.match(/srcset="(https:\/\/[^"\s]+)/) ;
  const imageUrl = imgMatch?.[1] ?? "";

  // Listing URL
  const linkMatch = block.match(/href="(\/(?:homes|property|listing)[^"]+)"/);
  const listingPath = linkMatch?.[1] ?? "";
  const listingUrl = listingPath
    ? `https://www.realty.com${listingPath}`
    : REALTY_URL;

  // MLS ID
  const mlsMatch = block.match(/(?:mls|listing)[_-]?id[^"]*"([A-Z0-9]+)"/i);
  const mlsId = mlsMatch?.[1] ?? `REALTY-${idx}`;

  // Title / property type
  const typeMatch = block.match(/(?:single.family|condo|townhouse|land|multi.family)/i);
  const propertyType = typeMatch?.[0]?.toLowerCase().replace(/[^a-z_]/g, "_") ?? "single_family";

  // Status
  const isPending = /pending|under.contract/i.test(block);
  const status: "active" | "pending" = isPending ? "pending" : "active";

  // Build address parts
  const addrParts = fullAddress.split(",").map((s) => s.trim());
  const city = addrParts[1] ?? "Oahu";
  const stateZip = addrParts[2] ?? "HI";
  const stateMatch = stateZip.match(/([A-Z]{2})\s*([0-9]{5})?/);
  const state = stateMatch?.[1] ?? "HI";
  const zip = stateMatch?.[2] ?? "96789";

  // Need at least a price or address to be a valid listing
  if (!price && !fullAddress) return null;

  const now = new Date().toISOString();
  return {
    id: `realty-${mlsId}-${idx}`,
    type: "sale",
    status,
    title: fullAddress || `O'ahu Property ${idx + 1}`,
    address: addrParts[0] ?? fullAddress,
    city,
    state,
    zip,
    price,
    priceLabel: "",
    bedrooms,
    bathrooms,
    sqft,
    lotSqft: 0,
    yearBuilt: 0,
    garageSpaces: 0,
    description: "",
    propertyType,
    mlsId,
    featured: idx < 3,
    images: imageUrl ? [{ url: imageUrl, isPrimary: true }] : [],
    listingUrl,
    daysOnMarket: 0,
    pricePerSqft: sqft > 0 && price > 0 ? Math.round(price / sqft) : 0,
    source: "realty_com",
    lastUpdated: now,
  };
}

function parseRealtyPage(html: string): SaleListing[] {
  const listings: SaleListing[] = [];

  // Try to extract JSON-LD or embedded JSON data first
  const jsonLdMatches = html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g);
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "RealEstateListing" || item["@type"] === "Product") {
          const l: SaleListing = {
            id: `jsonld-${listings.length}`,
            type: "sale",
            status: "active",
            title: item.name ?? "",
            address: item.address?.streetAddress ?? "",
            city: item.address?.addressLocality ?? "Honolulu",
            state: item.address?.addressRegion ?? "HI",
            zip: item.address?.postalCode ?? "",
            price: parseInt(String(item.offers?.price ?? "0").replace(/[^0-9]/g, ""), 10),
            priceLabel: "",
            bedrooms: item.numberOfRooms ?? 0,
            bathrooms: 0,
            sqft: parseInt(String(item.floorSize?.value ?? "0").replace(/[^0-9]/g, ""), 10),
            lotSqft: 0,
            yearBuilt: item.yearBuilt ?? 0,
            garageSpaces: 0,
            description: item.description ?? "",
            propertyType: "single_family",
            mlsId: item.productID ?? `LD-${listings.length}`,
            featured: listings.length < 3,
            images: item.image ? [{ url: item.image, isPrimary: true }] : [],
            listingUrl: item.url ?? REALTY_URL,
            daysOnMarket: 0,
            pricePerSqft: 0,
            source: "realty_com",
            lastUpdated: new Date().toISOString(),
          };
          if (l.title || l.address) listings.push(l);
        }
      }
    } catch {
      // not valid JSON-LD, skip
    }
  }

  if (listings.length > 0) return listings;

  // Fallback: split by common card delimiters and parse each block
  const cardDelimiters = [
    /(?=<(?:article|div)[^>]+class="[^"]*(?:property|listing|result|card)[^"]*")/g,
    /(?=<li[^>]+class="[^"]*(?:property|listing|result)[^"]*")/g,
  ];

  for (const delimiter of cardDelimiters) {
    const blocks = html.split(delimiter);
    if (blocks.length < 3) continue;

    for (let i = 0; i < Math.min(blocks.length, 30); i++) {
      const block = blocks[i];
      if (block.length < 100) continue;
      try {
        const listing = parseListing(block, i);
        if (listing) listings.push(listing);
      } catch {
        // skip
      }
    }
    if (listings.length > 0) break;
  }

  return listings;
}

// ─────────────────────────────────────────────
// Fetch realty.com with retries
// ─────────────────────────────────────────────

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
  Connection: "keep-alive",
};

async function fetchRealtyListings(): Promise<{ listings: SaleListing[]; blocked: boolean }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(REALTY_URL, {
      headers: BROWSER_HEADERS,
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timer);

    if (res.status === 403 || res.status === 429) {
      return { listings: [], blocked: true };
    }
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const html = await res.text();
    const listings = parseRealtyPage(html);
    return { listings, blocked: false };
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

// ─────────────────────────────────────────────
// Route: GET /listings/sales
// ─────────────────────────────────────────────

router.get("/listings/sales", async (_req, res) => {
  const now = Date.now();

  // Serve from cache if fresh
  if (salesCache && salesCache.expiresAt > now) {
    res.json({
      listings: salesCache.listings,
      fetchedAt: salesCache.fetchedAt,
      count: salesCache.listings.length,
      source: salesCache.source,
      cached: true,
      connected: true,
    });
    return;
  }

  try {
    const { listings, blocked } = await fetchRealtyListings();
    const fetchedAt = new Date().toISOString();

    if (blocked) {
      logger.warn("realty.com blocked server request (Cloudflare)");
      // Serve stale cache if available
      if (salesCache) {
        res.json({
          listings: salesCache.listings,
          fetchedAt: salesCache.fetchedAt,
          count: salesCache.listings.length,
          source: salesCache.source,
          cached: true,
          stale: true,
          blocked: true,
        });
        return;
      }
      res.json({
        listings: [],
        fetchedAt,
        count: 0,
        source: "realty_com",
        cached: false,
        blocked: true,
        message: "realty.com is blocking automated requests from this server. Try embedding or use Trestle for live MLS data.",
      });
      return;
    }

    salesCache = {
      listings,
      fetchedAt,
      expiresAt: now + CACHE_TTL_MS,
      source: "realty_com",
    };

    logger.info({ count: listings.length }, "realty.com listings refreshed");

    res.json({
      listings,
      fetchedAt,
      count: listings.length,
      source: "realty_com",
      cached: false,
      connected: true,
    });
  } catch (err) {
    logger.error({ err }, "Failed to fetch realty.com listings");

    if (salesCache) {
      res.json({
        listings: salesCache.listings,
        fetchedAt: salesCache.fetchedAt,
        count: salesCache.listings.length,
        source: salesCache.source,
        cached: true,
        stale: true,
      });
      return;
    }

    res.status(502).json({
      listings: [],
      count: 0,
      source: "realty_com",
      error: "Could not load listings from realty.com",
      message: "The realty.com scraper is ready but could not connect. Data will appear here once the server can reach realty.com.",
    });
  }
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
  credentialsNeeded: [
    "TRESTLE_CLIENT_ID",
    "TRESTLE_CLIENT_SECRET",
    "TRESTLE_MLS_ID",
  ],
  docsUrl: "https://trestle.corelogic.com",
  statusMessage:
    "Trestle integration is ready to activate. Provide IDX approval credentials from HI Central MLS and Dream Home Realty's CoreLogic account to enable live listing data.",
};

// Trestle field shape — matches what the frontend PropertyCard expects
interface TrestleProperty {
  ListingKey: string;
  ListingId: string;
  StandardStatus: "Active" | "Pending" | "Closed" | "ComingSoon";
  PropertyType: string;
  PropertySubType: string;
  UnparsedAddress: string;
  City: string;
  StateOrProvince: string;
  PostalCode: string;
  ListPrice: number;
  BedroomsTotal: number;
  BathroomsTotalDecimal: number;
  LivingArea: number;
  LotSizeSquareFeet: number;
  YearBuilt: number;
  GarageSpaces: number;
  PublicRemarks: string;
  Media: { MediaURL: string; Order: number }[];
  ListingUrl: string;
  DaysOnMarket: number;
  ModificationTimestamp: string;
  AgentKey: string;
  OfficeKey: string;
  Latitude: number;
  Longitude: number;
}

function trestleToListing(t: TrestleProperty): SaleListing {
  return {
    id: t.ListingKey,
    type: t.PropertyType === "ResidentialLease" ? "rental" : "sale",
    status:
      t.StandardStatus === "Active"
        ? "active"
        : t.StandardStatus === "Pending"
        ? "pending"
        : "active",
    title: t.UnparsedAddress,
    address: t.UnparsedAddress,
    city: t.City,
    state: t.StateOrProvince,
    zip: t.PostalCode,
    price: t.ListPrice,
    priceLabel: t.PropertyType === "ResidentialLease" ? "/mo" : "",
    bedrooms: t.BedroomsTotal,
    bathrooms: t.BathroomsTotalDecimal,
    sqft: t.LivingArea,
    lotSqft: t.LotSizeSquareFeet,
    yearBuilt: t.YearBuilt,
    garageSpaces: t.GarageSpaces,
    description: t.PublicRemarks,
    propertyType: t.PropertySubType,
    mlsId: t.ListingId,
    featured: false,
    images: (t.Media ?? [])
      .sort((a, b) => a.Order - b.Order)
      .map((m, i) => ({ url: m.MediaURL, isPrimary: i === 0 })),
    listingUrl: t.ListingUrl ?? REALTY_URL,
    daysOnMarket: t.DaysOnMarket,
    pricePerSqft:
      t.LivingArea > 0 ? Math.round(t.ListPrice / t.LivingArea) : 0,
    source: "trestle",
    lastUpdated: t.ModificationTimestamp,
  };
}

router.get("/listings/trestle", async (req, res) => {
  // When connected, this will:
  // 1. Fetch OAuth2 token from Trestle
  // 2. Query OData API: /Property?$filter=MlsStatus eq 'Active' and ListAgentMlsId eq 'MEL_MLS_ID'
  // 3. Transform results with trestleToListing()
  // 4. Cache for 15 minutes

  if (!TRESTLE_CONFIG.connected) {
    res.json({
      connected: false,
      listings: [],
      count: 0,
      ...TRESTLE_CONFIG,
    });
    return;
  }

  // ── Active connection code (runs once credentials are in env) ──
  const clientId = process.env.TRESTLE_CLIENT_ID;
  const clientSecret = process.env.TRESTLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    res.status(503).json({
      connected: false,
      error: "Trestle credentials not configured",
      ...TRESTLE_CONFIG,
    });
    return;
  }

  try {
    // 1. Get OAuth2 token
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
    const { access_token } = await tokenRes.json() as { access_token: string };

    // 2. Query Property endpoint — filter to Mel's active listings
    const mlsId = process.env.TRESTLE_MLS_ID ?? "";
    const filter = [
      "MlsStatus eq 'Active'",
      mlsId ? `ListAgentMlsId eq '${mlsId}'` : "",
    ]
      .filter(Boolean)
      .join(" and ");

    const params = new URLSearchParams({
      $filter: filter,
      $orderby: "ListingContractDate desc",
      $top: "50",
      $expand: "Media",
      $select: [
        "ListingKey", "ListingId", "StandardStatus", "PropertyType", "PropertySubType",
        "UnparsedAddress", "City", "StateOrProvince", "PostalCode",
        "ListPrice", "BedroomsTotal", "BathroomsTotalDecimal", "LivingArea",
        "LotSizeSquareFeet", "YearBuilt", "GarageSpaces", "PublicRemarks",
        "DaysOnMarket", "ModificationTimestamp", "Latitude", "Longitude",
      ].join(","),
    });

    const dataRes = await fetch(
      `${TRESTLE_CONFIG.endpoint}?${params}`,
      { headers: { Authorization: `Bearer ${access_token}`, Accept: "application/json" } }
    );
    const data = await dataRes.json() as { value: TrestleProperty[] };
    const listings = (data.value ?? []).map(trestleToListing);

    logger.info({ count: listings.length }, "Trestle listings fetched");

    res.json({
      connected: true,
      listings,
      count: listings.length,
      source: "trestle",
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, "Trestle fetch error");
    res.status(502).json({ connected: false, error: "Trestle fetch failed", listings: [], count: 0 });
  }
});

// ─────────────────────────────────────────────
// Route: POST /listings/sales/refresh
// Force a cache refresh (for cron / admin use)
// ─────────────────────────────────────────────

router.post("/listings/sales/refresh", async (_req, res) => {
  salesCache = null; // bust cache
  try {
    const { listings, blocked } = await fetchRealtyListings();
    const fetchedAt = new Date().toISOString();

    if (!blocked) {
      salesCache = {
        listings,
        fetchedAt,
        expiresAt: Date.now() + CACHE_TTL_MS,
        source: "realty_com",
      };
    }

    res.json({
      refreshed: !blocked,
      blocked,
      count: listings.length,
      fetchedAt,
    });
  } catch (err: any) {
    res.status(502).json({ refreshed: false, error: err.message });
  }
});

export default router;
