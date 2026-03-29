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

let idxCache: { ts: number; listings: any[] } | null = null;
const CACHE_TTL = 20 * 60 * 1000; // 20 minutes

router.get("/listings/idx", async (_req, res) => {
  try {
    const now = Date.now();
    if (idxCache && now - idxCache.ts < CACHE_TTL) {
      res.json({ listings: idxCache.listings, count: idxCache.listings.length, cached: true, source: "idx-broker" });
      return;
    }

    const r = await fetch(IDX_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!r.ok) {
      res.status(502).json({ listings: [], count: 0, error: `IDX returned ${r.status}` });
      return;
    }

    const html = await r.text();
    const listings = parseListings(html);

    idxCache = { ts: now, listings };
    res.json({ listings, count: listings.length, cached: false, source: "idx-broker" });
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
