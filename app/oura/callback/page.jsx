"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function OuraCallbackInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState("Connecting to Oura...");
  const [error, setError] = useState("");

  useEffect(() => {
    const code = searchParams.get("code");
    const err = searchParams.get("error");

    if (err) {
      setError(`Oura denied access: ${err}`);
      return;
    }
    if (!code) {
      setError("No authorization code received.");
      return;
    }

    (async () => {
      try {
        setStatus("Exchanging token...");
        const res = await fetch("/api/oura", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "exchange", code }),
        });

        const data = await res.json();
        if (!res.ok || !data.access_token) {
          setError(`${data.error || "Token exchange failed"} — ${JSON.stringify(data.detail || data)}`);
          return;
        }

        // Store tokens in localStorage
        localStorage.setItem("oura_access_token", data.access_token);
        if (data.refresh_token) localStorage.setItem("oura_refresh_token", data.refresh_token);
        // Store expiry (expires_in is in seconds)
        const expiry = Date.now() + (data.expires_in || 2592000) * 1000;
        localStorage.setItem("oura_token_expiry", String(expiry));

        setStatus("Connected! Returning to app...");
        setTimeout(() => router.push("/"), 1000);
      } catch (e) {
        setError("Connection failed. Please try again.");
      }
    })();
  }, []);

  return (
    <div style={{
      background: "#080808", minHeight: "100vh", display: "flex", alignItems: "center",
      justifyContent: "center", fontFamily: "'DM Sans', system-ui, sans-serif",
    }}>
      <div style={{ textAlign: "center", padding: 32 }}>
        {error ? (
          <>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#f06060", marginBottom: 12 }}>
              CONNECTION FAILED
            </div>
            <div style={{ fontSize: 13, color: "#555", marginBottom: 24, maxWidth: 280 }}>{error}</div>
            <button
              onClick={() => router.push("/")}
              style={{ background: "#1a1a1a", color: "#888", border: "1px solid #222", borderRadius: 10, padding: "12px 24px", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2 }}
            >
              BACK TO APP
            </button>
          </>
        ) : (
          <>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, color: "#4a9a5a", marginBottom: 12 }}>
              OURA RING
            </div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: "#e2e2e2", marginBottom: 8 }}>
              {status}
            </div>
            <div style={{ width: 40, height: 3, background: "#4a9a5a", borderRadius: 2, margin: "0 auto", animation: "pulse 1.2s ease-in-out infinite" }} />
            <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
          </>
        )}
      </div>
    </div>
  );
}

export default function OuraCallback() {
  return (
    <Suspense fallback={
      <div style={{ background: "#080808", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, color: "#4a9a5a" }}>LOADING...</div>
      </div>
    }>
      <OuraCallbackInner />
    </Suspense>
  );
}
