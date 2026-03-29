import { Router, type IRouter } from "express";
import { logger } from "../lib/logger";

const router: IRouter = Router();

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
