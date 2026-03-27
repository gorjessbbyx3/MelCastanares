// Cloudflare Pages Function — /api/rentals
// Proxies AppFolio public listings to bypass browser CORS restrictions.
// Deployed automatically by Cloudflare Pages alongside the static SPA.

const APPFOLIO_JSON = "https://dreamhomerlty.appfolio.com/listings/public.json";
const APPFOLIO_FALLBACK = "https://dreamhomerlty.appfolio.com/listings/";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Content-Type": "application/json",
  "Cache-Control": "public, max-age=300", // cache 5 min on Cloudflare edge
};

function mapListing(l) {
  // AppFolio JSON structure varies by account — handle multiple field name patterns
  const photos = l.photos || l.images || l.photo_urls || [];
  const mappedPhotos = photos
    .slice(0, 4)
    .map(p => ({
      url: typeof p === "string" ? p : (p.large_url || p.url || p.original_url || ""),
      isPrimary: false,
    }))
    .filter(p => p.url);

  const amenitiesRaw = l.amenities || l.features || "";
  const amenities = typeof amenitiesRaw === "string"
    ? amenitiesRaw.split(/,|\n/).map(a => a.trim()).filter(Boolean)
    : Array.isArray(amenitiesRaw) ? amenitiesRaw : [];

  const id = String(l.id || l.listing_id || l.property_id || Math.random());

  return {
    id,
    title: l.headline || l.name || l.property_name || l.title || l.address || "Rental Property",
    address: l.address || l.street_address || l.street || "",
    city: l.city || "O'ahu",
    state: l.state || "HI",
    zip: String(l.zip || l.postal_code || ""),
    price: parseFloat(l.price || l.asking_rent || l.rent_price || l.monthly_rent || 0),
    bedrooms: parseInt(l.bedrooms || l.beds || 0),
    bathrooms: parseFloat(l.bathrooms || l.baths || 0),
    sqft: parseInt(l.square_feet || l.sqft || l.sq_ft || 0),
    status: l.status || "active",
    type: "rental",
    available: l.available_date || l.date_available || l.available || "Now",
    images: mappedPhotos.length > 0 ? mappedPhotos : [{
      url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80",
      isPrimary: true,
    }],
    description: l.description || l.body || l.summary || "",
    amenities,
    priceLabel: "/mo",
    listingUrl: l.url || l.listing_url || `${APPFOLIO_FALLBACK}${id}`,
    petsAllowed: l.pets_allowed || l.pet_policy || null,
  };
}

export async function onRequest() {
  try {
    const res = await fetch(APPFOLIO_JSON, {
      headers: {
        "Accept": "application/json",
        "User-Agent": "DreamHomeRealtyHawaii/1.0 ListingSync",
      },
      cf: { cacheTtl: 300, cacheEverything: false },
    });

    if (!res.ok) {
      throw new Error(`AppFolio returned HTTP ${res.status}`);
    }

    const data = await res.json();

    // AppFolio returns { listings: [...] } or directly an array
    const raw = Array.isArray(data)
      ? data
      : (data.listings || data.properties || data.rental_listings || []);

    const properties = raw.map(mapListing);

    return new Response(
      JSON.stringify({ properties, source: "appfolio", count: properties.length }),
      { headers: CORS }
    );

  } catch (err) {
    // Return structured error — client will show fallback UI
    return new Response(
      JSON.stringify({
        properties: [],
        error: `Unable to load live listings: ${err.message}`,
        fallbackUrl: APPFOLIO_FALLBACK,
        source: "appfolio",
      }),
      { status: 200, headers: CORS }
    );
  }
}
