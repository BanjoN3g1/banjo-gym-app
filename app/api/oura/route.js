// Server-side proxy for Oura API — avoids CORS issues with direct browser calls
// Token is passed per-request in the Authorization header, never stored server-side

export async function POST(request) {
  try {
    const { token, endpoint, params } = await request.json();

    if (!token || !endpoint) {
      return Response.json({ error: "Missing token or endpoint" }, { status: 400 });
    }

    // Only allow specific Oura endpoints
    const allowed = [
      "daily_sleep",
      "sleep",
      "daily_activity",
      "daily_readiness",
    ];
    if (!allowed.includes(endpoint)) {
      return Response.json({ error: "Endpoint not allowed" }, { status: 403 });
    }

    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    const url = `https://api.ouraring.com/v2/usercollection/${endpoint}${qs}`;

    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      const text = await res.text();
      return Response.json({ error: `Oura API error ${res.status}`, detail: text }, { status: res.status });
    }

    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    return Response.json({ error: "Proxy error", detail: String(err) }, { status: 500 });
  }
}
