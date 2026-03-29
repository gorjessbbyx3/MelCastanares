// ═══════════════════════════════════════════════════════════
// Cloudflare Pages Function — GET /api/listings/detail
// Scrapes a single IDX Broker listing detail page and returns
// the full window.idxTemplateData JSON (photos, description,
// features, agent info, etc). Cached 30 minutes.
//
// Query params: ?idxId=d119&listingId=202508108
// ═══════════════════════════════════════════════════════════

const CACHE_TTL = 30 * 60;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

function extractIdxData(html) {
  const marker = "window.idxTemplateData = {";
  const idx = html.indexOf(marker);
  if (idx < 0) return null;

  const start = idx + marker.length - 1; // position of opening {
  let depth = 0;
  let end = start;
  for (let i = start; i < Math.min(start + 200000, html.length); i++) {
    if (html[i] === "{") depth++;
    else if (html[i] === "}") {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (depth !== 0) return null;
  try {
    return JSON.parse(html.slice(start, end + 1));
  } catch {
    return null;
  }
}

function buildPhotoList(imageData) {
  if (!imageData || typeof imageData !== "object") return [];
  return Object.values(imageData)
    .sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
    .map(img => img.urls?.hires?.url || img.url || "")
    .filter(Boolean);
}

function buildResponse(data) {
  const g = data.global || {};

  const photos = buildPhotoList(g.imageData);

  const features = {};
  const push = (section, label, value) => {
    if (!value || value === "" || value === 0) return;
    if (!features[section]) features[section] = [];
    features[section].push({ label, value });
  };

  if (g.view?.length)           push("exterior", "View", g.view.join(", "));
  if (g.levels?.length)         push("interior", "Levels", g.levels.join(", "));
  if (g.stories)                push("interior", "Stories", g.stories);
  if (g.flooring?.length)       push("interior", "Flooring", g.flooring.join(", "));
  if (g.inclusions)             push("interior", "Appliances", g.inclusions.replace(/,/g, ", "));
  if (g.garageYN === "yes")     push("exterior", "Garage", "Yes");
  if (g.parkingTotal)           push("exterior", "Parking Spaces", g.parkingTotal);
  if (g.parkingFeatures?.length)push("exterior", "Parking Type", g.parkingFeatures.join(", "));
  if (g.poolFeatures?.length)   push("exterior", "Pool", g.poolFeatures.filter(f => f !== "Pool").join(", ") || "Yes");
  if (g.fencing?.length)        push("exterior", "Fencing", g.fencing.join(", "));
  if (g.lotFeatures?.length)    push("exterior", "Lot Features", g.lotFeatures.join(", "));
  if (g.topography)             push("exterior", "Topography", g.topography);
  if (g.waterSource?.length)    push("utilities", "Water", g.waterSource.join(", "));
  if (g.utilities?.length)      push("utilities", "Utilities", g.utilities.join(", "));
  if (g.communityFeatures?.length) push("community", "Community", g.communityFeatures.join(", "));
  if (g.zoningDescription)      push("details", "Zoning", g.zoningDescription);
  if (g.constructionMaterials?.length) push("interior", "Construction", g.constructionMaterials.join(", "));
  if (g.architecturalStyle?.length) push("exterior", "Style", g.architecturalStyle.join(", "));
  if (g.propertyCondition?.length) push("details", "Condition", g.propertyCondition.join(", "));
  if (g.disclosures?.length)    push("details", "Disclosures", g.disclosures.join(", "));
  if (g.furnished?.length && g.furnished[0] !== "Unfurnished") push("interior", "Furnished", g.furnished.join(", "));
  if (g.petsAllowed?.length)    push("community", "Pets", g.petsAllowed.join(", "));
  if (g.newConstructionYN === "yes") push("details", "New Construction", "Yes");

  return {
    listingId: g.listingID,
    idxId: g.idxID,
    address: g.address,
    streetName: g.streetName,
    streetNumber: g.streetNumber,
    city: g.cityName,
    state: g.stateAbrv,
    zip: g.zipcode,
    lat: g.latitude,
    lng: g.longitude,
    price: g.price,
    priceFormatted: g.listingPrice,
    status: g.propStatus || g.mlsStatus?.[0] || "Active",
    propType: g.propType,
    propSubType: g.propSubType,
    subdivision: g.subdivision,
    bedrooms: g.bedrooms,
    fullBaths: g.fullBaths,
    halfBaths: g.halfBaths || g.partialBaths || 0,
    totalBaths: g.totalBaths,
    sqft: g.sqFt,
    acres: g.acres,
    yearBuilt: g.yearBuilt,
    description: g.remarksConcat,
    photos,
    photoCount: photos.length,
    listingAgentName: g.listingAgentName,
    listingAgentPhone: g.listingAgentContacts,
    listingAgentEmail: g.listingEmail,
    listingOfficeName: g.listingOfficeName,
    listingOfficeEmail: g.listingOfficeEmail,
    taxAnnualAmount: g.taxAnnualAmount,
    associationFee: g.associationFee,
    associationFeeIncludes: g.associationFeeIncludes,
    priceReductionDate: g.priceReductionDate,
    features,
    sourceUrl: g.propertyLink,
    photoGalleryLink: g.photoGalleryLink,
  };
}

export async function onRequestGet(ctx) {
  if (ctx.request.method === "OPTIONS") {
    return new Response(null, { headers: CORS });
  }

  const params = new URL(ctx.request.url).searchParams;
  const idxId = params.get("idxId");
  const listingId = params.get("listingId");

  if (!idxId || !listingId) {
    return new Response(
      JSON.stringify({ error: "idxId and listingId are required" }),
      { status: 400, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }

  const cacheKey = `https://mel-idx-detail.internal/${idxId}/${listingId}`;
  const cache = caches.default;
  const cached = await cache.match(new Request(cacheKey));
  if (cached) {
    return new Response(cached.body, {
      headers: { ...CORS, "Content-Type": "application/json", "X-Cache": "HIT" },
    });
  }

  const detailUrl = `https://shopoahuproperties.idxbroker.com/idx/details/listing/${idxId}/${listingId}`;

  try {
    const r = await fetch(detailUrl, { headers: HEADERS });
    if (!r.ok) {
      return new Response(
        JSON.stringify({ error: `IDX returned ${r.status}` }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const html = await r.text();
    const raw = extractIdxData(html);
    if (!raw) {
      return new Response(
        JSON.stringify({ error: "Could not parse listing data from IDX page" }),
        { status: 502, headers: { ...CORS, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify(buildResponse(raw));
    const response = new Response(payload, {
      headers: {
        ...CORS,
        "Content-Type": "application/json",
        "Cache-Control": `public, max-age=${CACHE_TTL}`,
        "X-Cache": "MISS",
      },
    });

    ctx.waitUntil(cache.put(new Request(cacheKey), response.clone()));
    return response;
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 502, headers: { ...CORS, "Content-Type": "application/json" } }
    );
  }
}

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}
