// Server-side proxy for all Oura API interactions
// Handles: token exchange, token refresh, and data fetching
// Client secret never leaves the server

const CLIENT_ID = "fe301c05-aceb-4b65-8c02-263cb21a5eb3";
const CLIENT_SECRET = process.env.OURA_CLIENT_SECRET;
const REDIRECT_URI = "https://banjo-gym-app.vercel.app/oura/callback";

const ALLOWED_ENDPOINTS = [
  "daily_sleep",
  "sleep",
  "daily_activity",
  "daily_readiness",
];

export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    // ── Exchange auth code for tokens ────────────────────────────
    if (action === "exchange") {
      const { code } = body;
      if (!code) return Response.json({ error: "Missing code" }, { status: 400 });

      const res = await fetch("https://api.ouraring.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
        }),
      });

      console.log("Using client_id:", CLIENT_ID, "secret length:", CLIENT_SECRET?.length ?? "UNDEFINED");
      const rawText = await res.text();
      console.log("Oura exchange status:", res.status, "body:", rawText);
      let data;
      try { data = JSON.parse(rawText); } catch { data = { raw: rawText }; }
      if (!res.ok) return Response.json({ error: "Token exchange failed", oura_status: res.status, detail: data }, { status: 400 });
      return Response.json(data);
    }

    // ── Refresh an expired token ──────────────────────────────────
    if (action === "refresh") {
      const { refresh_token } = body;
      if (!refresh_token) return Response.json({ error: "Missing refresh_token" }, { status: 400 });

      const res = await fetch("https://api.ouraring.com/oauth/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
        }),
      });

      const data = await res.json();
      if (!res.ok) return Response.json({ error: "Token refresh failed", detail: data }, { status: 400 });
      return Response.json(data);
    }

    // ── Fetch Oura data ───────────────────────────────────────────
    if (action === "fetch") {
      const { token, endpoint, params } = body;
      if (!token || !endpoint) return Response.json({ error: "Missing token or endpoint" }, { status: 400 });
      if (!ALLOWED_ENDPOINTS.includes(endpoint)) return Response.json({ error: "Endpoint not allowed" }, { status: 403 });

      const qs = params ? "?" + new URLSearchParams(params).toString() : "";
      const res = await fetch(`https://api.ouraring.com/v2/usercollection/${endpoint}${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) return Response.json({ error: "token_expired" }, { status: 401 });
      if (!res.ok) return Response.json({ error: `Oura error ${res.status}` }, { status: res.status });
      return Response.json(await res.json());
    }

    return Response.json({ error: "Unknown action" }, { status: 400 });
  } catch (err) {
    return Response.json({ error: "Server error", detail: String(err) }, { status: 500 });
  }
}
