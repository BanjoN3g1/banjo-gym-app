"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── PLAN DATA ────────────────────────────────────────────────────────────────
const PLAN = {
  startDate: "2026-03-29",
  targetDate: "2026-05-15",
  targetWeight: 137,
  targetBF: 10,
  dailyCalories: 1750,
  dailyProtein: 175,
  phases: [
    { name: "RECALIBRATE", weeks: [1,2], color: "#c8f060" },
    { name: "MAIN CUT",    weeks: [3,4,5], color: "#f0a040" },
    { name: "PEAK",        weeks: [6,7], color: "#ffffff" },
  ],
  workouts: {
    D1: {
      name: "PUSH",
      sub: "Upper Chest & Shoulders",
      days: "Mon / Thu",
      color: "#c8f060",
      exercises: [
        { id: "incline_bench", name: "Incline Barbell Bench", sets: 4, repsMin: 4, repsMax: 6, startWeight: 115, increment: 2.5, note: "45° angle. Last set 1 RIR." },
        { id: "ohp", name: "Overhead Press", sets: 3, repsMin: 5, repsMax: 8, startWeight: 75, increment: 2.5, note: "Full ROM. Control negative." },
        { id: "inc_db_fly", name: "Incline DB Fly", sets: 3, repsMin: 10, repsMax: 12, startWeight: 25, increment: 2.5, note: "30° angle. Full stretch at bottom." },
        { id: "lateral_raise", name: "Cable Lateral Raise", sets: 4, repsMin: 15, repsMax: 20, startWeight: 15, increment: 2.5, note: "Lead with elbow. 45s rest. PRIORITY." },
        { id: "serratus", name: "Serratus Crunch", sets: 3, repsMin: 12, repsMax: 15, startWeight: 20, increment: 2.5, note: "Arms straight. Feel serratus fire." },
        { id: "hanging_leg", name: "Hanging Leg Raise", sets: 3, repsMin: 8, repsMax: 12, startWeight: 0, increment: 0, note: "Posterior pelvic tilt at top." },
      ]
    },
    D2: {
      name: "PULL",
      sub: "Back Width & Rear Delts",
      days: "Tue / Fri",
      color: "#60b8f0",
      exercises: [
        { id: "pullups", name: "Pull-Ups", sets: 4, repsMin: 6, repsMax: 10, startWeight: 0, increment: 0, note: "Wide grip. Dead hang. Stop 1 RIR." },
        { id: "lat_pulldown", name: "Lat Pulldown Neutral", sets: 3, repsMin: 10, repsMax: 12, startWeight: 100, increment: 5, note: "1-sec pause at chest. Elbows to hips." },
        { id: "db_row", name: "Single-Arm DB Row", sets: 3, repsMin: 8, repsMax: 12, startWeight: 55, increment: 5, note: "Elbow flared. Full ROM. Lat bias." },
        { id: "rear_delt_fly", name: "Incline Rear Delt Fly", sets: 3, repsMin: 15, repsMax: 20, startWeight: 15, increment: 2.5, note: "30° face-down. Pinch at top." },
        { id: "lateral_raise_2", name: "Lateral Raise (2nd hit)", sets: 3, repsMin: 15, repsMax: 20, startWeight: 12.5, increment: 2.5, note: "Lighter. Pure pump. 30s rest." },
        { id: "inc_curl", name: "Incline DB Curl", sets: 3, repsMin: 10, repsMax: 15, startWeight: 20, increment: 2.5, note: "Full stretch. Supinate at top." },
      ]
    },
    D3: {
      name: "LEGS",
      sub: "Squats & Aesthetics",
      days: "Wed / Sat",
      color: "#f0a040",
      exercises: [
        { id: "squat", name: "Back Squat", sets: 4, repsMin: 4, repsMax: 6, startWeight: 195, increment: 5, note: "Strength anchor. You love this." },
        { id: "rdl", name: "Romanian Deadlift", sets: 3, repsMin: 8, repsMax: 10, startWeight: 135, increment: 5, note: "Hinge deep. Feel hamstring load." },
        { id: "leg_press", name: "Leg Press", sets: 2, repsMin: 10, repsMax: 15, startWeight: 180, increment: 10, note: "High foot. Full ROM. 2 working sets." },
        { id: "ab_wheel", name: "Ab Wheel Rollout", sets: 3, repsMin: 6, repsMax: 10, startWeight: 0, increment: 0, note: "Full extension. Hollow body return." },
        { id: "cable_crunch", name: "Cable Crunch", sets: 3, repsMin: 12, repsMax: 15, startWeight: 50, increment: 5, note: "Posterior tilt at bottom." },
        { id: "side_plank", name: "Side Plank", sets: 2, repsMin: 35, repsMax: 35, startWeight: 0, increment: 0, note: "Seconds each side. Adonis belt." },
      ]
    }
  }
};

const DRINK_DAY_MACROS = { calories: 1400, protein: 160, carbs: 80, fat: 35 };
const NORMAL_MACROS = { calories: 1750, protein: 175, carbs: 140, fat: 55 };

// ─── STORAGE (localStorage) ──────────────────────────────────────────────────
const store = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
  }
};

// ─── UTILS ───────────────────────────────────────────────────────────────────
const today = () => new Date().toISOString().split("T")[0];
const fmt = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
const fmtFull = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
const daysUntil = (d) => Math.max(0, Math.ceil((new Date(d + "T12:00:00") - new Date()) / 86400000));
const weekNum = () => {
  const start = new Date(PLAN.startDate + "T12:00:00");
  const now = new Date();
  return Math.max(1, Math.min(7, Math.ceil((now - start) / (7 * 86400000))));
};
const currentPhase = () => {
  const w = weekNum();
  return PLAN.phases.find(p => p.weeks.includes(w)) || PLAN.phases[0];
};

// ─── WEEK-SPECIFIC COACHING CONTEXT ─────────────────────────────────────────
const getWeekContext = () => {
  const w = weekNum();
  const phase = currentPhase();
  const daysLeft = Math.max(0, Math.ceil((new Date(PLAN.targetDate + "T12:00:00") - new Date()) / 86400000));

  const weekGuidance = {
    1: {
      label: "Week 1 — RECALIBRATE",
      directive: "Establish baseline working weights. No failure. 3 RIR on all sets. The goal this week is finding the right starting loads and rebuilding the mind-muscle connection after any layoff. Do NOT push — we're calibrating, not testing limits.",
      overload: "Do NOT progress weight yet. Log what feels like a solid 3 RIR and use that as the baseline for week 2.",
      recovery: "High. You should feel good leaving the gym. If anything is sore beyond normal DOMS, the weight was too heavy.",
      intensity: "65-70% of max effort. Leave plenty in reserve.",
    },
    2: {
      label: "Week 2 — RECALIBRATE (final week)",
      directive: "Add reps or small weight bumps where week 1 felt very easy (3+ RIR). Still conservative — 2 RIR minimum. This week sets the floor for the cut. Anything you establish here as your 'working weight' is what we protect through weeks 3-5.",
      overload: "If you hit the top of the rep range easily in week 1, you can add the minimum increment this week. Otherwise hold and add reps.",
      recovery: "Should still feel fresh. Sleep and nutrition compliance matters now.",
      intensity: "70-75% effort. Starting to feel like real work.",
    },
    3: {
      label: "Week 3 — MAIN CUT (week 1 of deficit)",
      directive: "Caloric deficit is now in effect and glycogen will be slightly lower. HOLD week 2 weights exactly. Do not push for new reps if energy is off. This is the adaptation week — the body is adjusting to the deficit and strength may feel slightly suppressed. That is normal and expected.",
      overload: "Freeze progression this week. Holding week 2 numbers = success. If you hit top of range, note it but don't increase yet — confirm twice before progressing on a cut.",
      recovery: "Monitor carefully. HRV dip or elevated resting HR means recovery is lagging — reduce rest times, not weights.",
      intensity: "75-80% effort. Work is real but failure is never acceptable on a cut.",
    },
    4: {
      label: "Week 4 — MAIN CUT (deepest fatigue week)",
      directive: "Statistically the hardest week of any cut. Accumulated deficit, potential sleep disruption, and neuromuscular fatigue all peak here. HOLDING strength at week 2-3 numbers is a genuine achievement. Do not compare to a bulk. If you drop 1-2 reps on a set, that is acceptable — do not reduce weight, just note it.",
      overload: "Only progress if you hit top of rep range AND felt strong AND HRV/sleep were good. Otherwise hold.",
      recovery: "Critical. Sleep 8hrs minimum. Protein at 175g non-negotiable — muscle is at highest risk of catabolism this week.",
      intensity: "80% effort. RPE 7-8 on work sets. No 9s or 10s.",
    },
    5: {
      label: "Week 5 — MAIN CUT (final push before peak)",
      directive: "Last week of the deficit phase. Body composition is changing visibly now. Fatigue is accumulated but the end is in sight. Focus entirely on execution quality — slow eccentrics, peak contraction, full ROM. Volume is more important than load this week for visual conditioning.",
      overload: "No new PRs. Hold week 3-4 weights. If anything feels off, slight volume reduction (1 set per exercise) is acceptable but do NOT reduce load.",
      recovery: "Begin thinking about peak week. Sleep and steps compliance here directly impacts how you look May 15.",
      intensity: "75-80%. Back off slightly from week 4 intensity to set up a strong peak week.",
    },
    6: {
      label: "Week 6 — PEAK (begin peak protocol)",
      directive: "Shift to peak phase. Reduce total volume by 15-20% (cut 1 working set per exercise) but INCREASE relative intensity. Carbs may come up slightly this week — use that energy. Compounds stay heavy. Isolation work shifts to pump-focused higher reps for fullness. The goal is looking FULL and DRY, not just lean.",
      overload: "Hold or slightly increase compound weights if energy allows from carb increase. Isolation exercises: increase reps, not weight.",
      recovery: "Reduce steps slightly to 7-8k to reduce glycogen depletion. Prioritize sleep absolutely.",
      intensity: "85% on compounds. 70% on isolations — chase the pump, not the weight.",
    },
    7: {
      label: "Week 7 — PEAK (final week, May 15 target)",
      directive: "Final week. This is about LOOKING your best on May 15, not training progress. Volume is low. Intensity is high on compounds. No new exercises. No failure. The physique is built — this week is just manipulation. Carb cycle if possible: higher carbs 2 days out to fill muscle glycogen. Reduce sodium Thursday-Friday. Stay active but don't deplete.",
      overload: "Zero progression pressure. Maintain weights from week 6. This is a performance week, not a growth week.",
      recovery: "Everything. Sleep 9hrs if possible. Zero stress. Walk but don't exhaust yourself.",
      intensity: "Compounds: 85-90% intensity, 50-60% volume. Isolations: pure pump, moderate weight.",
    },
  };

  const wg = weekGuidance[w] || weekGuidance[1];
  return `
CURRENT WEEK: ${wg.label} | ${daysLeft} days until May 15 photo
PHASE DIRECTIVE: ${wg.directive}
PROGRESSIVE OVERLOAD THIS WEEK: ${wg.overload}
RECOVERY CONTEXT: ${wg.recovery}
INTENSITY TARGET: ${wg.intensity}
`.trim();
};

// Auto-detect workout from day of week
const getDefaultWorkout = () => {
  const day = new Date().getDay(); // 0=Sun,1=Mon,...
  if (day === 1 || day === 4) return "D1"; // Mon/Thu = PUSH
  if (day === 2 || day === 5) return "D2"; // Tue/Fri = PULL
  if (day === 3 || day === 6) return "D3"; // Wed/Sat = LEGS
  return "D1"; // Sun = rest, default to PUSH
};

// ─── BEEP SOUND ──────────────────────────────────────────────────────────────
function playBeep(freq = 880, duration = 0.3) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    osc.type = "sine";
    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch {}
}

function playAlarm() {
  playBeep(660, 0.2);
  setTimeout(() => playBeep(770, 0.2), 250);
  setTimeout(() => playBeep(880, 0.4), 500);
  try { navigator.vibrate([300, 100, 300, 100, 400]); } catch {}
}

// ─── HAPTICS ─────────────────────────────────────────────────────────────────
const haptic = {
  light:   () => { try { navigator.vibrate(18); } catch {} },
  medium:  () => { try { navigator.vibrate(42); } catch {} },
  heavy:   () => { try { navigator.vibrate(80); } catch {} },
  success: () => { try { navigator.vibrate([50, 30, 80]); } catch {} },
  tick:    () => { try { navigator.vibrate(12); } catch {} },
};

// ─── OURA ────────────────────────────────────────────────────────────────────
const OURA_CLIENT_ID = "fe301c05-aceb-4b65-8c02-263cb21a5eb3";
const OURA_REDIRECT_URI = "https://banjo-gym-app.vercel.app/oura/callback";
const OURA_SCOPES = "daily heartrate"; // daily covers sleep, activity, readiness

function getOuraToken() {
  return localStorage.getItem("oura_access_token") || "";
}

function isOuraConnected() {
  const token = getOuraToken();
  if (!token) return false;
  const expiry = parseInt(localStorage.getItem("oura_token_expiry") || "0");
  // Consider expired if within 1 hour of expiry
  return expiry === 0 || expiry > Date.now() + 3600000;
}

function connectOura() {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: OURA_CLIENT_ID,
    redirect_uri: OURA_REDIRECT_URI,
    scope: OURA_SCOPES,
  });
  window.location.href = `https://cloud.ouraring.com/oauth/authorize?${params}`;
}

function disconnectOura() {
  localStorage.removeItem("oura_access_token");
  localStorage.removeItem("oura_refresh_token");
  localStorage.removeItem("oura_token_expiry");
}

async function refreshOuraToken() {
  const refreshToken = localStorage.getItem("oura_refresh_token");
  if (!refreshToken) return false;
  try {
    const res = await fetch("/api/oura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "refresh", refresh_token: refreshToken }),
    });
    const data = await res.json();
    if (!res.ok || !data.access_token) return false;
    localStorage.setItem("oura_access_token", data.access_token);
    if (data.refresh_token) localStorage.setItem("oura_refresh_token", data.refresh_token);
    const expiry = Date.now() + (data.expires_in || 2592000) * 1000;
    localStorage.setItem("oura_token_expiry", String(expiry));
    return true;
  } catch { return false; }
}

async function fetchOura(endpoint, params) {
  let token = getOuraToken();
  if (!token) return null;

  // Auto-refresh if near expiry
  const expiry = parseInt(localStorage.getItem("oura_token_expiry") || "0");
  if (expiry > 0 && expiry < Date.now() + 3600000) {
    const refreshed = await refreshOuraToken();
    if (!refreshed) return null;
    token = getOuraToken();
  }

  try {
    const res = await fetch("/api/oura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fetch", token, endpoint, params }),
    });
    if (res.status === 401) {
      // Try refresh once
      const refreshed = await refreshOuraToken();
      if (!refreshed) return null;
      token = getOuraToken();
      const retry = await fetch("/api/oura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "fetch", token, endpoint, params }),
      });
      if (!retry.ok) return null;
      return await retry.json();
    }
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function syncOuraForDate(date) {
  // Fetch sleep, activity, readiness in parallel
  const [sleepRes, activityRes, readinessRes] = await Promise.all([
    fetchOura("sleep", { start_date: date, end_date: date }),
    fetchOura("daily_activity", { start_date: date, end_date: date }),
    fetchOura("daily_readiness", { start_date: date, end_date: date }),
  ]);

  const result = {};

  // Sleep — use longest sleep session for the night
  if (sleepRes?.data?.length) {
    const mainSleep = sleepRes.data.reduce((best, s) =>
      (s.total_sleep_duration || 0) > (best.total_sleep_duration || 0) ? s : best
    , sleepRes.data[0]);
    result.hours = Math.round((mainSleep.total_sleep_duration || 0) / 360) / 10;
    result.score = mainSleep.score || null;
    result.hrv = Math.round(mainSleep.average_hrv || 0) || null;
    result.deepMins = Math.round((mainSleep.deep_sleep_duration || 0) / 60);
    result.remMins = Math.round((mainSleep.rem_sleep_duration || 0) / 60);
    result.efficiency = mainSleep.efficiency || null;
    result.restingHR = Math.round(mainSleep.average_heart_rate || 0) || null;
  }

  // Steps + active calories
  if (activityRes?.data?.length) {
    const act = activityRes.data[0];
    result.steps = act.steps || 0;
    result.activeCalories = act.active_calories || 0;
    result.activityScore = act.score || null;
  }

  // Readiness
  if (readinessRes?.data?.length) {
    result.readinessScore = readinessRes.data[0].score || null;
  }

  return Object.keys(result).length ? result : null;
}

// ─── AI ──────────────────────────────────────────────────────────────────────
function getApiKey() {
  return localStorage.getItem("banjo_api_key") || "";
}

async function callClaude(prompt, systemExtra = "", retries = 3) {
  const key = getApiKey();
  if (!key) return "Set your API key in Settings to enable AI coaching.";
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          system: `You are an expert bodybuilding/physique coach AI for Banjo.
Client: 5'4", ~143 lbs, goal: 137 lbs at 10% BF. PPL x2 split, 6 days/week.
Goals: visible abs, adonis belt, serratus, capped lateral delts, bicep veins, chest separation.
Daily: 1750 cal, 175g protein. History: gyno surgery 2023 + flank lipo — upper chest is muscle tissue issue, not fat.

${getWeekContext()}

Progressive overload rule: add reps first → weight only when top of rep range hit 2 sessions in a row AND phase allows it.
${systemExtra}
Be SHORT and punchy. Specific numbers only. Coach-speak. No fluff.`,
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (res.status === 529 || res.status === 503) {
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 2000));
          continue;
        }
        return "API overloaded — try again in a moment.";
      }
      const data = await res.json();
      return data.content?.[0]?.text || "No response.";
    } catch {
      if (attempt < retries - 1) await new Promise(r => setTimeout(r, 1500));
    }
  }
  return "AI unavailable.";
}

// ─── CLAUDE SONNET (deep analysis) ──────────────────────────────────────────
async function callClaudeSonnet(prompt, systemPrompt, retries = 3) {
  const key = getApiKey();
  if (!key) return "Set your API key in Settings to enable AI coaching.";
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": key,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true",
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 2000,
          system: systemPrompt,
          messages: [{ role: "user", content: prompt }]
        })
      });
      if (res.status === 529 || res.status === 503) {
        if (attempt < retries - 1) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 2500));
          continue;
        }
        return "API overloaded — try again in a moment.";
      }
      const data = await res.json();
      return data.content?.[0]?.text || "No response.";
    } catch {
      if (attempt < retries - 1) await new Promise(r => setTimeout(r, 2000));
    }
  }
  return "AI unavailable.";
}

// ─── REST TIMER ──────────────────────────────────────────────────────────────
function RestTimer({ seconds, onDone, onSkip, nextSetHint }) {
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(intervalRef.current);
          playAlarm();
          setTimeout(onDone, 800);
          return 0;
        }
        if (r <= 10) {
          haptic.tick();
          if (r === 11) playBeep(440, 0.1);
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const circumference = 2 * Math.PI * 90;
  const strokeDashoffset = circumference * (1 - remaining / seconds);
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const urgent = remaining <= 10;
  const accent = urgent ? "#f0a040" : "#c8f060";

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 999,
      background: "rgba(5,5,5,0.97)",
      backdropFilter: "blur(8px)",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      maxWidth: 480, margin: "0 auto",
    }}>
      {/* Label */}
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 4,
        color: urgent ? "#f0a04055" : "#2a2a2a",
        marginBottom: 40,
        transition: "color 0.4s",
      }}>
        {urgent ? "GET READY" : "REST"}
      </div>

      {/* Ring + countdown */}
      <div style={{ position: "relative", width: 220, height: 220, marginBottom: 40 }}>
        <svg
          width="220" height="220"
          style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}
        >
          {/* Track */}
          <circle cx="110" cy="110" r="90" fill="none" stroke="#161616" strokeWidth="6" />
          {/* Progress */}
          <circle
            cx="110" cy="110" r="90"
            fill="none"
            stroke={accent}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.4s ease" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 76,
            color: urgent ? "#f0a040" : "#f0f0f0",
            lineHeight: 1,
            letterSpacing: 2,
            textShadow: urgent ? "0 0 40px rgba(240,160,64,0.3)" : "none",
            transition: "color 0.4s, text-shadow 0.4s",
          }}>
            {mins > 0 ? `${mins}:${String(secs).padStart(2, "0")}` : secs}
          </div>
          {mins === 0 && (
            <div style={{
              fontFamily: "'DM Mono', monospace", fontSize: 8,
              color: "#2a2a2a", letterSpacing: 2, marginTop: 4,
            }}>SECONDS</div>
          )}
        </div>
      </div>

      {/* Next set hint */}
      {nextSetHint && (
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#333",
          letterSpacing: 2, marginBottom: 12, textAlign: "center",
        }}>
          {nextSetHint}
        </div>
      )}
      <div style={{
        fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#1e1e1e",
        letterSpacing: 2, marginBottom: 52,
      }}>
        NEXT SET INCOMING
      </div>

      {/* Skip */}
      <button
        onClick={onSkip}
        style={{
          background: "transparent", color: "#2a2a2a",
          border: "1px solid #1a1a1a", borderRadius: 14,
          padding: "16px 56px",
          fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2,
          transition: "color 0.2s, border-color 0.2s",
        }}
        onMouseEnter={e => { e.target.style.color = "#555"; e.target.style.borderColor = "#333"; }}
        onMouseLeave={e => { e.target.style.color = "#2a2a2a"; e.target.style.borderColor = "#1a1a1a"; }}
      >
        SKIP REST
      </button>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("workout");
  const [logs, setLogs] = useState(() => store.get("logs") || {});
  const [nutrition, setNutrition] = useState(() => store.get("nutrition") || {});
  const [sleep, setSleep] = useState(() => store.get("sleep") || {});
  const [bodyweight, setBodyweight] = useState(() => store.get("bodyweight") || {});
  const [apiKey, setApiKey] = useState(getApiKey());
  const [ouraConnected, setOuraConnected] = useState(isOuraConnected());
  const [showSettings, setShowSettings] = useState(!getApiKey());

  const saveLog = useCallback((date, workout, data) => {
    const next = { ...logs, [date]: { ...logs[date], [workout]: data } };
    setLogs(next);
    store.set("logs", next);
  }, [logs]);

  const saveNutrition = useCallback((date, data) => {
    const next = { ...nutrition, [date]: data };
    setNutrition(next);
    store.set("nutrition", next);
  }, [nutrition]);

  const saveSleep = useCallback((date, data) => {
    const next = { ...sleep, [date]: data };
    setSleep(next);
    store.set("sleep", next);
  }, [sleep]);

  const saveBW = useCallback((date, val) => {
    const next = { ...bodyweight, [date]: val };
    setBodyweight(next);
    store.set("bodyweight", next);
  }, [bodyweight]);

  const saveApiKey = (k) => {
    setApiKey(k);
    localStorage.setItem("banjo_api_key", k);
  };


  const tabs = [
    { id: "today",   label: "TODAY",   icon: "◈" },
    { id: "workout", label: "TRAIN",   icon: "⬡" },
    { id: "nutrition", label: "FOOD",  icon: "◇" },
    { id: "progress", label: "STATS",  icon: "◉" },
    { id: "plan",    label: "PLAN",    icon: "≡" },
  ];

  return (
    <div style={{ background: "#080808", minHeight: "100vh", color: "#e2e2e2", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 300, maxWidth: 480, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        input, textarea, select { background: #111; border: 1px solid #222; color: #e2e2e2; border-radius: 8px; font-family: inherit; font-size: 15px; padding: 10px 12px; width: 100%; outline: none; -webkit-appearance: none; }
        input:focus, textarea:focus, select:focus { border-color: #c8f060; box-shadow: 0 0 0 2px rgba(200,240,96,0.08); }
        button { cursor: pointer; border: none; outline: none; font-family: inherit; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        .fade-in { animation: fadeIn 0.25s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .shimmer { animation: pulse 1.2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        .set-row { transition: background 0.2s; }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
        .set-circle-done { animation: circlePop 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes circlePop { 0%{transform:scale(0.85)} 60%{transform:scale(1.08)} 100%{transform:scale(1)} }
      `}</style>

      {/* HEADER */}
      <div style={{ padding: "18px 16px 12px", borderBottom: "1px solid #131313", display: "flex", justifyContent: "space-between", alignItems: "flex-end", position: "sticky", top: 0, background: "#080808", zIndex: 50 }}>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 3, color: "#c8f060", marginBottom: 3 }}>BANJO · PPL CUT</div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, letterSpacing: 1, lineHeight: 1 }}>FITNESS OS</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 26, color: "#c8f060", lineHeight: 1 }}>{daysUntil(PLAN.targetDate)}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 1, color: "#333" }}>DAYS LEFT</div>
          </div>
          <button onClick={() => setShowSettings(!showSettings)} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 8, width: 36, height: 36, color: "#444", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>⚙</button>
        </div>
      </div>

      {/* SETTINGS PANEL */}
      {showSettings && (
        <div className="fade-in" style={{ background: "#0d0d0d", borderBottom: "1px solid #1a1a1a", padding: "14px 16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#444" }}>SETTINGS</div>
            <button onClick={() => setShowSettings(false)} style={{ background: "#c8f060", color: "#080808", padding: "5px 14px", borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1 }}>DONE</button>
          </div>

          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 1.5, color: "#333", marginBottom: 5 }}>ANTHROPIC API KEY</div>
          <input type="password" placeholder="sk-ant-..." value={apiKey} onChange={e => saveApiKey(e.target.value)} style={{ marginBottom: 10, fontSize: 13 }} />

          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 1.5, color: "#333", marginBottom: 8 }}>OURA RING</div>
          {ouraConnected ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#08100a", border: "1px solid #1a3a22", borderRadius: 10, padding: "10px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4a9a5a" }} />
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#4a9a5a", letterSpacing: 1 }}>CONNECTED</span>
              </div>
              <button onClick={() => { disconnectOura(); setOuraConnected(false); }} style={{ background: "none", color: "#444", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1 }}>DISCONNECT</button>
            </div>
          ) : (
            <button onClick={connectOura} style={{ width: "100%", background: "#08100a", border: "1px solid #1a3a22", borderRadius: 10, padding: "12px", color: "#4a9a5a", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2 }}>
              CONNECT OURA RING →
            </button>
          )}
          <div style={{ fontSize: 10, color: "#2a2a2a", marginTop: 6 }}>Syncs sleep, HRV, steps, and readiness to the TODAY tab.</div>
        </div>
      )}

      {/* PHASE BAR */}
      <div style={{ padding: "6px 16px", background: "#0d0d0d", borderBottom: "1px solid #131313", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 5, height: 5, borderRadius: "50%", background: currentPhase().color }} />
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 2, color: currentPhase().color }}>WK {weekNum()} · {currentPhase().name}</span>
        </div>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a", letterSpacing: 1 }}>TARGET MAY 15</span>
      </div>

      {/* CONTENT */}
      <div style={{ paddingBottom: 72 }}>
        {tab === "today"     && <TodayTab logs={logs} nutrition={nutrition} sleep={sleep} bodyweight={bodyweight} saveBW={saveBW} saveSleep={saveSleep} setTab={setTab} />}
        {tab === "workout"   && <WorkoutTab logs={logs} saveLog={saveLog} />}
        {tab === "nutrition" && <NutritionTab nutrition={nutrition} saveNutrition={saveNutrition} />}
        {tab === "progress"  && <ProgressTab logs={logs} nutrition={nutrition} sleep={sleep} bodyweight={bodyweight} />}
        {tab === "plan"      && <PlanTab />}
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(8,8,8,0.96)", borderTop: "1px solid #151515", display: "flex", zIndex: 100, backdropFilter: "blur(10px)" }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, padding: "10px 4px 8px",
            background: "none",
            color: tab === t.id ? "#c8f060" : "#2a2a2a",
            borderTop: `2px solid ${tab === t.id ? "#c8f060" : "transparent"}`,
            transition: "all 0.15s",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          }}>
            <span style={{ fontSize: 14 }}>{t.icon}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 1.5 }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── WORKOUT TAB ─────────────────────────────────────────────────────────────
function WorkoutTab({ logs, saveLog }) {
  const [mode, setMode] = useState("live");
  const [selectedDay, setSelectedDay] = useState(getDefaultWorkout());
  const [logDate, setLogDate] = useState(today());
  const [exerciseData, setExerciseData] = useState({});
  const [saved, setSaved] = useState(false);
  const [timer, setTimer] = useState(null);
  const [suggestions, setSuggestions] = useState({});
  const [sugLoading, setSugLoading] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");
  // Exercise swap / custom exercise library
  const [customExercises, setCustomExercises] = useState({});
  const [overrides, setOverrides] = useState({}); // { originalExId: customExObj }
  const [swapTarget, setSwapTarget] = useState(null); // originalExId being swapped
  // Post-workout analysis
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  // Session mode
  const [sessionMode, setSessionMode] = useState(false);
  const [focusedExIdx, setFocusedExIdx] = useState(0);

  const workout = PLAN.workouts[selectedDay];

  useEffect(() => {
    setCustomExercises(store.get("custom_exercises") || {});
  }, []);

  // Re-run when date or workout changes, OR when logs update from a save
  // Use a ref to avoid resetting exerciseData mid-edit on every keystroke
  const lastLoadKeyRef = useRef(null);
  useEffect(() => {
    const loadKey = `${logDate}::${selectedDay}`;
    const existing = logs[logDate]?.[selectedDay];
    // Only reload if the date/workout actually changed (not just a logs reference update)
    if (lastLoadKeyRef.current === loadKey && !existing) return;
    if (lastLoadKeyRef.current === loadKey && existing) {
      // date/workout same — only reload if we don't have unsaved edits (saved===true means just saved, safe to reload)
      // We allow reload only on initial mount for a given key
      return;
    }
    lastLoadKeyRef.current = loadKey;
    if (existing) {
      const { _notes, _overrides, ...exData } = existing;
      setOverrides(_overrides || {});
      setExerciseData(normalizeExerciseData(exData, workout, _overrides || {}));
      setSessionNotes(_notes || "");
      setSaved(true); // Mark as saved since we loaded existing data
    } else {
      setOverrides({});
      setExerciseData(buildEmptyExerciseData(workout));
      setSessionNotes("");
      setSaved(false);
    }
    setSuggestions({});
    setAnalysis("");
  }, [selectedDay, logDate, logs]);

  function buildEmptyExerciseData(wkt) {
    const data = {};
    wkt.exercises.forEach(ex => {
      data[ex.id] = { sets: Array.from({ length: ex.sets }, () => ({ weight: "", reps: "", done: false })) };
    });
    return data;
  }

  function normalizeExerciseData(raw, wkt, ovr) {
    const data = {};
    wkt.exercises.forEach(ex => {
      const effectiveId = ovr[ex.id]?.id || ex.id;
      const effectiveSets = ovr[ex.id]?.sets || ex.sets;
      const val = raw[effectiveId];
      if (!val) {
        data[effectiveId] = { sets: Array.from({ length: effectiveSets }, () => ({ weight: "", reps: "", done: false })) };
      } else if (Array.isArray(val.sets)) {
        const needed = effectiveSets - val.sets.length;
        data[effectiveId] = {
          sets: needed > 0
            ? [...val.sets, ...Array.from({ length: needed }, () => ({ weight: "", reps: "", done: false }))]
            : val.sets
        };
      } else {
        const w = val.weight || "";
        const r = val.reps || "";
        const n = parseInt(val.sets) || effectiveSets;
        data[effectiveId] = { sets: Array.from({ length: n }, () => ({ weight: w, reps: r, done: false })) };
      }
    });
    return data;
  }

  const updateSet = (exId, setIdx, field, val) => {
    setExerciseData(prev => {
      const exSets = [...(prev[exId]?.sets || [])];
      exSets[setIdx] = { ...exSets[setIdx], [field]: val };
      return { ...prev, [exId]: { ...prev[exId], sets: exSets } };
    });
    setSaved(false);
  };

  const markSetDone = (exId, setIdx) => {
    const wasDone = exerciseData[exId]?.sets[setIdx]?.done;
    setExerciseData(prev => {
      const exSets = [...(prev[exId]?.sets || [])];
      exSets[setIdx] = { ...exSets[setIdx], done: !wasDone };
      const allExDone = exSets.every(s => s.done);
      if (!wasDone) {
        if (allExDone) haptic.success();
        else haptic.medium();
      } else {
        haptic.light();
      }
      return { ...prev, [exId]: { ...prev[exId], sets: exSets } };
    });
    if (!wasDone) setTimer({ restSecs: 90 });
    setSaved(false);
  };

  const handleSave = () => {
    const payload = { ...exerciseData, _notes: sessionNotes, _overrides: overrides };
    saveLog(logDate, selectedDay, payload);
    setSaved(true);
    setAnalysis("");
  };

  // Swap handler — called from SwapModal on confirm
  const handleSwap = (originalExId, customEx) => {
    // Save to library
    const lib = { ...customExercises, [customEx.id]: customEx };
    setCustomExercises(lib);
    store.set("custom_exercises", lib);
    // Set override
    setOverrides(prev => ({ ...prev, [originalExId]: customEx }));
    // Init empty set data under custom ID
    setExerciseData(prev => ({
      ...prev,
      [customEx.id]: { sets: Array.from({ length: customEx.sets }, () => ({ weight: "", reps: "", done: false })) }
    }));
    setSaved(false);
    setSwapTarget(null);
  };

  const removeOverride = (originalExId) => {
    const removedCustomId = overrides[originalExId]?.id;
    setOverrides(prev => {
      const next = { ...prev };
      delete next[originalExId];
      return next;
    });
    // Restore original exercise empty data
    const origEx = workout.exercises.find(e => e.id === originalExId);
    if (origEx) {
      setExerciseData(prev => {
        const next = { ...prev };
        delete next[removedCustomId];
        next[origEx.id] = { sets: Array.from({ length: origEx.sets }, () => ({ weight: "", reps: "", done: false })) };
        return next;
      });
    }
    setSaved(false);
  };

  const loadSuggestions = async () => {
    setSugLoading(true);
    const newSug = {};
    for (const ex of workout.exercises) {
      const override = overrides[ex.id];
      const effectiveEx = override || ex;
      const dataKey = override ? override.id : ex.id;

      const pastSessions = Object.entries(logs)
        .filter(([, wkts]) => wkts[selectedDay])
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 3)
        .map(([date, wkts]) => {
          const sessionOverrides = wkts[selectedDay]?._overrides || {};
          const sessionDataKey = sessionOverrides[ex.id]?.id || ex.id;
          const exData = wkts[selectedDay]?.[sessionDataKey];
          if (!exData) return null;
          if (Array.isArray(exData.sets)) {
            const done = exData.sets.filter(s => s.done || s.reps);
            if (!done.length) return null;
            return `${fmt(date)}: ${done.map(s => `${s.weight || "BW"}×${s.reps}`).join(", ")}`;
          } else if (exData.weight || exData.reps) {
            return `${fmt(date)}: ${exData.sets || ex.sets}×${exData.reps} @ ${exData.weight || "BW"}lbs`;
          }
          return null;
        })
        .filter(Boolean);

      if (pastSessions.length === 0) {
        newSug[dataKey] = `Start at ${effectiveEx.startWeight > 0 ? `${effectiveEx.startWeight}lbs` : "bodyweight"}. Target ${effectiveEx.repsMin}–${effectiveEx.repsMax} reps.`;
      } else {
        const rec = await callClaude(
          `Exercise: ${effectiveEx.name} | Target: ${effectiveEx.sets}×${effectiveEx.repsMin}–${effectiveEx.repsMax} reps | Increment: ${effectiveEx.increment || 0}lbs\nHistory:\n${pastSessions.join("\n")}\n\nRecommend weight/reps for today in under 20 words.`
        );
        newSug[dataKey] = rec;
      }
    }
    setSuggestions(newSug);
    setSugLoading(false);
  };

  const analyzeSession = async () => {
    setAnalyzing(true);

    // Build exercise-by-exercise summary
    const exerciseSummaries = workout.exercises.map(ex => {
      const override = overrides[ex.id];
      const effectiveEx = override || ex;
      const dataKey = override ? override.id : ex.id;
      const exData = exerciseData[dataKey];
      const isCustom = !!override;

      const setDetails = exData?.sets?.map((s, i) =>
        `Set ${i+1}: ${s.weight || "BW"}lbs × ${s.reps || "?"} reps${s.done ? " ✓" : " (not marked done)"}`
      ).join("\n") || "No data logged";

      const totalVol = exData?.sets?.reduce((sum, s) =>
        sum + (parseFloat(s.weight || 0) * parseInt(s.reps || 0)), 0) || 0;

      return `
EXERCISE: ${effectiveEx.name}${isCustom ? " [SUBSTITUTED for " + ex.name + "]" : ""}
Target: ${effectiveEx.sets} sets × ${effectiveEx.repsMin}–${effectiveEx.repsMax} reps
${isCustom ? `Coach note: ${effectiveEx.note || "Custom exercise"}` : `Coach note: ${ex.note}`}
${setDetails}
Total volume this exercise: ${Math.round(totalVol)} lbs`;
    }).join("\n\n");

    // Last session comparison
    const lastSession = Object.entries(logs)
      .filter(([d, wkts]) => wkts[selectedDay] && d !== logDate)
      .sort(([a], [b]) => b.localeCompare(a))[0];

    const lastSessionStr = lastSession ? (() => {
      const [lastDate, lastWkts] = lastSession;
      const lastData = lastWkts[selectedDay];
      const lastOverrides = lastData._overrides || {};
      return `Last ${workout.name} session (${fmtFull(lastDate)}):\n` +
        workout.exercises.map(ex => {
          const lastKey = lastOverrides[ex.id]?.id || ex.id;
          const lastEx = lastData[lastKey];
          if (!lastEx) return null;
          if (Array.isArray(lastEx.sets)) {
            return `${(lastOverrides[ex.id] || ex).name}: ${lastEx.sets.map(s => `${s.weight || "BW"}×${s.reps}`).join(", ")}`;
          }
          return null;
        }).filter(Boolean).join("\n");
    })() : "No previous session data.";

    const weekCtx = getWeekContext();

    const systemPrompt = `You are a world-class PhD-level exercise scientist, elite bodybuilding coach, and sports nutritionist with 20+ years of applied research and coaching experience. You combine deep academic expertise in exercise physiology (hypertrophy mechanisms: mechanical tension, metabolic stress, muscle damage; motor unit recruitment; neuromuscular adaptations; energy systems; hormonal responses to training) with practical elite-level bodybuilding coaching (periodization, progressive overload, exercise selection, mind-muscle connection, intra-workout fatigue management).

CLIENT — BANJO: 5'4", ~143 lbs, targeting 137 lbs at 10% body fat. PPL x2/week, 47-day aesthetic cut. Goals: visible abs, adonis belt, visible serratus, capped lateral delts, bicep vascularity, chest separation. Daily: 1750 cal, 175g protein. History of gyno surgery 2023 + flank lipo — upper chest development is a muscle tissue limitation, not fat.

${weekCtx}

COACHING PHILOSOPHY: On a cut, HOLDING strength = success. Double progression (reps first, then weight when top of range hit 2x AND phase allows). 1 RIR minimum on all work sets. Prioritize mechanical tension over metabolic fatigue on compounds. Judge everything through the lens of where we are in the 7-week plan — what's appropriate in week 2 is very different from week 5 or week 7.

Analyze with the precision of a world-class coach reviewing competition prep data. Be direct, specific, science-backed. Use numbered sections. Be thorough but actionable.`;

    const prompt = `Analyze today's ${workout.name} session (${fmtFull(logDate)}):

${exerciseSummaries}

SESSION NOTES FROM ATHLETE: "${sessionNotes || "None provided"}"

COMPARISON DATA:
${lastSessionStr}

Provide a comprehensive post-workout analysis — judge everything through the lens of ${weekCtx.split('\n')[0]}:
1. OVERALL SESSION GRADE & SUMMARY (A-F with rationale specific to this week's goals)
2. EXERCISE-BY-EXERCISE BREAKDOWN (performance vs targets, form cues if notes suggest issues, volume adequacy for this phase)
3. PROGRESSIVE OVERLOAD STATUS (what progressed, stalled, or regressed vs last session — is that appropriate for this week or a red flag?)
4. MUSCLE GROUP STIMULUS QUALITY (rate the mechanical tension and metabolic stress for each target muscle — is it sufficient for the phase goals?)
5. RECOVERY SIGNALS (any red flags suggesting overreaching, CNS fatigue, or inadequate recovery — especially important given where we are in the cut)
6. NEXT SESSION DIRECTIVES — exact weight/rep targets for each exercise, calibrated to the phase directive above. Be specific with numbers.
7. ONE PRIORITY FOCUS for the next session based on today's data and where we are in the 7-week plan`;

    const result = await callClaudeSonnet(prompt, systemPrompt);
    setAnalysis(result);
    setAnalyzing(false);
  };

  const totalSets = workout.exercises.reduce((s, ex) => s + ex.sets, 0);
  const doneSets = Object.values(exerciseData).reduce((s, ex) => s + (ex.sets?.filter(set => set.done).length || 0), 0);
  const progressPct = totalSets > 0 ? (doneSets / totalSets) * 100 : 0;

  if (mode === "history") {
    return (
      <HistoryView
        logs={logs}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        onClose={() => setMode("live")}
        workout={workout}
        customExercises={customExercises}
      />
    );
  }

  // Build resolved exercises list (with overrides applied) for session mode
  const resolvedExercises = workout.exercises.map(ex => {
    const override = overrides[ex.id];
    return {
      planEx: ex,
      effectiveEx: override || ex,
      dataKey: override ? override.id : ex.id,
    };
  });

  return (
    <div className="fade-in">
      {timer && <RestTimer seconds={timer.restSecs} onDone={() => setTimer(null)} onSkip={() => setTimer(null)} />}

      {/* SWAP MODAL */}
      {swapTarget && (
        <SwapModal
          originalEx={workout.exercises.find(e => e.id === swapTarget)}
          customExercises={customExercises}
          onConfirm={(customEx) => handleSwap(swapTarget, customEx)}
          onCancel={() => setSwapTarget(null)}
        />
      )}

      {/* ── SESSION MODE ─────────────────────────────────────────────────────── */}
      {sessionMode ? (
        <SessionExerciseView
          resolvedExercises={resolvedExercises}
          focusedIdx={focusedExIdx}
          exerciseData={exerciseData}
          suggestions={suggestions}
          workoutColor={workout.color}
          doneSets={doneSets}
          totalSets={totalSets}
          progressPct={progressPct}
          sessionNotes={sessionNotes}
          saved={saved}
          analyzing={analyzing}
          analysis={analysis}
          onSessionNotes={v => setSessionNotes(v)}
          onUpdateSet={(dataKey, si, f, v) => updateSet(dataKey, si, f, v)}
          onMarkDone={(dataKey, si) => markSetDone(dataKey, si)}
          onSwap={(exId) => setSwapTarget(exId)}
          onNext={() => setFocusedExIdx(i => Math.min(i + 1, resolvedExercises.length - 1))}
          onPrev={() => setFocusedExIdx(i => Math.max(i - 1, 0))}
          onExit={() => setSessionMode(false)}
          onSave={handleSave}
          onAnalyze={analyzeSession}
        />
      ) : (

      /* ── LIST MODE (existing) ─────────────────────────────────────────────── */
      <div>
        <div style={{ padding: "16px 16px 0" }}>
          <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
            <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} style={{ flex: 1, fontSize: 13, padding: "9px 12px" }} />
            <button onClick={() => setMode("history")} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 8, padding: "9px 14px", color: "#555", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1.5, whiteSpace: "nowrap" }}>HISTORY</button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 14 }}>
            {Object.entries(PLAN.workouts).map(([key, wkt]) => {
              const active = selectedDay === key;
              return (
                <button key={key} onClick={() => setSelectedDay(key)} style={{ background: active ? wkt.color : "#0f0f0f", color: active ? "#080808" : "#333", border: `1px solid ${active ? wkt.color : "#1a1a1a"}`, borderRadius: 10, padding: "10px 6px", fontFamily: "'Bebas Neue', sans-serif", fontSize: 17, letterSpacing: 0.5, transition: "all 0.15s" }}>
                  {wkt.name}
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: workout.color, lineHeight: 1 }}>{workout.name}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#333", letterSpacing: 1.5, marginTop: 3 }}>{workout.sub} · {workout.days}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: progressPct === 100 ? "#c8f060" : "#333" }}>{doneSets}/{totalSets}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a", letterSpacing: 1 }}>SETS DONE</div>
            </div>
          </div>

          <div style={{ height: 3, background: "#131313", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${progressPct}%`, background: workout.color, borderRadius: 2, transition: "width 0.4s ease" }} />
          </div>

          {/* START SESSION CTA */}
          <button
            onClick={() => { setSessionMode(true); setFocusedExIdx(0); haptic.medium(); }}
            style={{
              width: "100%", marginBottom: 10,
              background: workout.color, color: "#080808",
              border: "none", borderRadius: 12,
              padding: "15px",
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 1,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            }}
          >
            START SESSION
          </button>

          {Object.keys(suggestions).length === 0 ? (
            <button onClick={loadSuggestions} disabled={sugLoading} style={{ width: "100%", marginBottom: 14, background: sugLoading ? "#0a0a0a" : "#0d1a05", border: `1px solid ${sugLoading ? "#1a1a1a" : "#1e3310"}`, color: sugLoading ? "#333" : "#c8f060", borderRadius: 10, padding: "11px", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2 }}>
              {sugLoading ? <span className="shimmer">LOADING AI TARGETS...</span> : "⚡ GET TODAY'S AI TARGETS"}
            </button>
          ) : (
            <div style={{ background: "#0d1a05", border: "1px solid #1e3310", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 2, color: "#c8f060", marginBottom: 4 }}>AI TARGETS LOADED</div>
              <div style={{ fontSize: 10, color: "#5a8a30" }}>Suggestions shown inline below each exercise</div>
            </div>
          )}
        </div>

        <div style={{ padding: "0 16px" }}>
          {workout.exercises.map((ex, i) => {
            const override = overrides[ex.id];
            const effectiveEx = override || ex;
            const dataKey = override ? override.id : ex.id;
            const exData = exerciseData[dataKey] || { sets: [] };
            const allDone = exData.sets.length > 0 && exData.sets.every(s => s.done);
            const suggestion = suggestions[dataKey];

            return (
              <ExerciseCard
                key={ex.id}
                ex={effectiveEx}
                originalExName={override ? ex.name : null}
                exData={exData}
                index={i}
                suggestion={suggestion}
                allDone={allDone}
                workoutColor={workout.color}
                onUpdateSet={(id, si, f, v) => updateSet(dataKey, si, f, v)}
                onMarkDone={(id, si) => markSetDone(dataKey, si)}
                onSwap={() => setSwapTarget(ex.id)}
                onRestoreOriginal={override ? () => removeOverride(ex.id) : null}
              />
            );
          })}

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#333", marginBottom: 6 }}>SESSION NOTES</div>
            <textarea placeholder="How'd it feel? Energy, pump, anything unusual..." rows={2} value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} style={{ resize: "none", fontSize: 13, borderRadius: 10 }} />
          </div>

          <button onClick={handleSave} style={{ width: "100%", background: saved ? "#0d1f05" : workout.color, color: saved ? workout.color : "#080808", border: saved ? `1px solid ${workout.color}33` : "none", padding: "15px", borderRadius: 12, fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, letterSpacing: 1, marginBottom: 12, transition: "all 0.25s" }}>
            {saved ? "✓ SESSION SAVED" : "SAVE SESSION"}
          </button>

          {saved && (
            <div style={{ background: "#080d14", border: "1px solid #1a2a3a", borderRadius: 14, padding: 16, marginBottom: 24 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#60b8f0", marginBottom: 10 }}>SESSION ANALYSIS</div>
              {analysis ? (
                <div style={{ fontSize: 13, color: "#a0c8e0", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{analysis}</div>
              ) : (
                <button onClick={analyzeSession} disabled={analyzing} style={{ width: "100%", background: analyzing ? "#0d0d0d" : "#60b8f0", color: analyzing ? "#333" : "#080808", padding: 13, borderRadius: 10, fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 1 }}>
                  {analyzing ? <span className="shimmer">ANALYZING SESSION...</span> : "ANALYZE MY WORKOUT"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}

// ─── SESSION EXERCISE VIEW ────────────────────────────────────────────────────
function SessionExerciseView({
  resolvedExercises, focusedIdx, exerciseData, suggestions, workoutColor,
  doneSets, totalSets, progressPct,
  sessionNotes, saved, analyzing, analysis,
  onSessionNotes, onUpdateSet, onMarkDone, onSwap,
  onNext, onPrev, onExit, onSave, onAnalyze,
}) {
  const { planEx, effectiveEx, dataKey } = resolvedExercises[focusedIdx];
  const exData = exerciseData[dataKey] || { sets: [] };
  const setsDoneForEx = exData.sets.filter(s => s.done).length;
  const allDoneForEx = setsDoneForEx === exData.sets.length && exData.sets.length > 0;
  const activeSetIdx = exData.sets.findIndex(s => !s.done);
  const suggestion = suggestions[dataKey];
  const isBodyweight = effectiveEx.startWeight === 0;
  const isLast = focusedIdx === resolvedExercises.length - 1;
  const isFirst = focusedIdx === 0;
  const allWorkoutDone = doneSets === totalSets && totalSets > 0;

  // Slide-in animation key (changes on exercise change)
  const [slideKey, setSlideKey] = useState(focusedIdx);
  useEffect(() => { setSlideKey(focusedIdx); }, [focusedIdx]);

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "calc(100vh - 140px)", padding: "0 16px 16px" }}>

      {/* ── Top bar: progress strip + exit ────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, paddingTop: 16, marginBottom: 18 }}>
        {/* Exercise dots */}
        <div style={{ display: "flex", gap: 5, flex: 1 }}>
          {resolvedExercises.map((r, i) => {
            const exD = exerciseData[r.dataKey] || { sets: [] };
            const done = exD.sets.length > 0 && exD.sets.every(s => s.done);
            const active = i === focusedIdx;
            return (
              <div
                key={r.planEx.id}
                style={{
                  flex: active ? 2 : 1,
                  height: 3,
                  borderRadius: 2,
                  background: done ? workoutColor : active ? `${workoutColor}66` : "#1e1e1e",
                  transition: "all 0.3s ease",
                }}
              />
            );
          })}
        </div>
        {/* Sets counter */}
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#333", letterSpacing: 1, whiteSpace: "nowrap" }}>
          {doneSets}/{totalSets}
        </div>
        {/* Exit to list */}
        <button
          onClick={onExit}
          style={{ background: "none", color: "#2a2a2a", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1, padding: "4px 0" }}
        >
          LIST ↗
        </button>
      </div>

      {/* ── Exercise name + meta ───────────────────────────────────────── */}
      <div key={slideKey} className="fade-in" style={{ marginBottom: 6 }}>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 3,
          color: workoutColor, marginBottom: 8,
        }}>
          {focusedIdx + 1} / {resolvedExercises.length}
        </div>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 52,
          lineHeight: 1,
          color: allDoneForEx ? "#2a2a2a" : "#ededed",
          letterSpacing: 0.5,
          transition: "color 0.4s",
          marginBottom: 8,
        }}>
          {effectiveEx.name}
        </div>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#2a2a2a",
          letterSpacing: 1.5, marginBottom: 12, lineHeight: 1.7,
        }}>
          {effectiveEx.sets} × {effectiveEx.repsMin}{effectiveEx.repsMin !== effectiveEx.repsMax ? `–${effectiveEx.repsMax}` : "s"}{" "}
          {!isBodyweight && `· ${effectiveEx.note}`}
        </div>
        {isBodyweight && (
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#2a2a2a", letterSpacing: 1, marginBottom: 12, lineHeight: 1.7 }}>
            {effectiveEx.note}
          </div>
        )}
      </div>

      {/* ── AI target ─────────────────────────────────────────────────── */}
      {suggestion && (
        <div style={{ background: "#0c1803", border: "1px solid #1a2d08", borderRadius: 10, padding: "10px 12px", marginBottom: 18 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: workoutColor === "#c8f060" ? "#c8f060" : workoutColor, letterSpacing: 1.5, marginBottom: 3 }}>AI TARGET</div>
          <div style={{ fontSize: 12, color: "#6a9a36", lineHeight: 1.6 }}>{suggestion}</div>
        </div>
      )}

      {/* ── Set circles ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24, flexWrap: "wrap" }}>
        {exData.sets.map((set, si) => {
          const isDone = set.done;
          const isActive = si === activeSetIdx;
          const hasData = set.weight || set.reps;
          return (
            <button
              key={si}
              onClick={() => onMarkDone(dataKey, si)}
              style={{
                width: 74, height: 74,
                borderRadius: "50%",
                background: isDone
                  ? workoutColor
                  : isActive ? "#141414" : "#0d0d0d",
                border: isDone
                  ? `2px solid ${workoutColor}`
                  : isActive
                  ? `2px solid ${workoutColor}44`
                  : "2px solid #181818",
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: 3,
                transition: "all 0.25s ease",
                boxShadow: isDone
                  ? `0 0 20px ${workoutColor}28`
                  : isActive
                  ? `0 0 14px ${workoutColor}12`
                  : "none",
                flexShrink: 0,
                cursor: "pointer",
              }}
            >
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: isDone ? 26 : 22,
                color: isDone ? "#080808" : isActive ? workoutColor : "#252525",
                lineHeight: 1,
                transition: "all 0.2s",
              }}>
                {isDone ? "✓" : si + 1}
              </span>
              {!isDone && hasData && (
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#333", letterSpacing: 0.5, textAlign: "center" }}>
                  {set.weight || "BW"}{!isBodyweight && "lb"}×{set.reps}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Weight + reps inputs for active set ───────────────────────── */}
      {activeSetIdx >= 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          {!isBodyweight && (
            <div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a", letterSpacing: 1.5, marginBottom: 6, textAlign: "center" }}>WEIGHT (LBS)</div>
              <input
                type="number"
                inputMode="decimal"
                placeholder={effectiveEx.startWeight > 0 ? String(effectiveEx.startWeight) : "—"}
                value={exData.sets[activeSetIdx]?.weight || ""}
                onChange={e => onUpdateSet(dataKey, activeSetIdx, "weight", e.target.value)}
                style={{ textAlign: "center", fontSize: 26, fontFamily: "'Bebas Neue', sans-serif", padding: "14px 8px", borderRadius: 12, letterSpacing: 1, background: "#0f0f0f", border: "1px solid #1e1e1e" }}
              />
            </div>
          )}
          <div style={{ gridColumn: isBodyweight ? "1 / -1" : "auto" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a", letterSpacing: 1.5, marginBottom: 6, textAlign: "center" }}>
              {isBodyweight ? "REPS / SECS" : "REPS"}
            </div>
            <input
              type="number"
              inputMode="numeric"
              placeholder={`${effectiveEx.repsMin}–${effectiveEx.repsMax}`}
              value={exData.sets[activeSetIdx]?.reps || ""}
              onChange={e => onUpdateSet(dataKey, activeSetIdx, "reps", e.target.value)}
              style={{ textAlign: "center", fontSize: 26, fontFamily: "'Bebas Neue', sans-serif", padding: "14px 8px", borderRadius: 12, letterSpacing: 1, background: "#0f0f0f", border: "1px solid #1e1e1e" }}
            />
          </div>
        </div>
      )}

      {/* ── All sets done banner ───────────────────────────────────────── */}
      {allDoneForEx && (
        <div style={{
          background: `${workoutColor}0e`,
          border: `1px solid ${workoutColor}22`,
          borderRadius: 12, padding: "14px 16px",
          display: "flex", alignItems: "center", gap: 12,
          marginBottom: 20,
        }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: workoutColor, lineHeight: 1 }}>DONE</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: `${workoutColor}88`, letterSpacing: 1 }}>
            {isLast ? "LAST EXERCISE · SAVE BELOW" : "TAP NEXT TO CONTINUE"}
          </div>
        </div>
      )}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* ── Nav buttons ───────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        <button
          onClick={() => { onPrev(); haptic.light(); }}
          disabled={isFirst}
          style={{
            background: "transparent",
            color: isFirst ? "#181818" : "#333",
            border: `1px solid ${isFirst ? "#111" : "#1e1e1e"}`,
            borderRadius: 12, padding: "14px",
            fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2,
            transition: "all 0.15s",
          }}
        >
          ← PREV
        </button>
        <button
          onClick={() => { isLast ? onSave() : (onNext(), haptic.light()); }}
          style={{
            background: isLast ? (saved ? "#0d1f05" : workoutColor) : workoutColor,
            color: isLast ? (saved ? workoutColor : "#080808") : "#080808",
            border: isLast && saved ? `1px solid ${workoutColor}33` : "none",
            borderRadius: 12, padding: "14px",
            fontFamily: isLast ? "'Bebas Neue', sans-serif" : "'DM Mono', monospace",
            fontSize: isLast ? 20 : 10,
            letterSpacing: isLast ? 1 : 2,
            transition: "all 0.25s",
          }}
        >
          {isLast ? (saved ? "✓ SAVED" : "SAVE SESSION") : "NEXT →"}
        </button>
      </div>

      {/* ── Session notes + post-workout analysis (last exercise) ─────── */}
      {isLast && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a", letterSpacing: 2, marginBottom: 6 }}>SESSION NOTES</div>
          <textarea
            placeholder="Energy, pump, anything unusual..."
            rows={2}
            value={sessionNotes}
            onChange={e => onSessionNotes(e.target.value)}
            style={{ resize: "none", fontSize: 13, borderRadius: 10 }}
          />
        </div>
      )}

      {isLast && saved && (
        <div style={{ background: "#080d14", border: "1px solid #1a2a3a", borderRadius: 14, padding: 16, marginBottom: 8 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#60b8f0", marginBottom: 10 }}>SESSION ANALYSIS</div>
          {analysis ? (
            <div style={{ fontSize: 13, color: "#a0c8e0", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{analysis}</div>
          ) : (
            <button onClick={onAnalyze} disabled={analyzing} style={{ width: "100%", background: analyzing ? "#0d0d0d" : "#60b8f0", color: analyzing ? "#333" : "#080808", padding: 13, borderRadius: 10, fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 1 }}>
              {analyzing ? <span className="shimmer">ANALYZING SESSION...</span> : "ANALYZE MY WORKOUT"}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── EXERCISE CARD ────────────────────────────────────────────────────────────
function ExerciseCard({ ex, originalExName, exData, index, suggestion, allDone, workoutColor, onUpdateSet, onMarkDone, onSwap, onRestoreOriginal }) {
  const [expanded, setExpanded] = useState(true);
  const doneSets = exData.sets.filter(s => s.done).length;
  const isBodyweight = ex.startWeight === 0;
  const isSubstituted = !!originalExName;

  return (
    <div style={{ background: allDone ? "#0a140a" : "#0f0f0f", border: `1px solid ${allDone ? `${workoutColor}33` : isSubstituted ? "#2a1f0a" : "#1a1a1a"}`, borderRadius: 14, marginBottom: 10, overflow: "hidden", transition: "all 0.2s" }}>

      {/* Substitution badge */}
      {isSubstituted && (
        <div style={{ background: "#1a1205", padding: "4px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#f0a040", letterSpacing: 1 }}>
            ⇄ SUBBED FOR: {originalExName.toUpperCase()}
          </div>
          <button onClick={onRestoreOriginal} style={{ background: "none", color: "#555", fontSize: 9, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>RESTORE</button>
        </div>
      )}

      {/* Exercise Header */}
      <div style={{ display: "flex", alignItems: "flex-start", padding: "14px 14px 12px" }}>
        <button onClick={() => setExpanded(!expanded)} style={{ flex: 1, background: "none", textAlign: "left", display: "flex", alignItems: "flex-start", gap: 0 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: allDone ? workoutColor : "#1a1a1a", color: allDone ? "#080808" : "#333", fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                {allDone ? "✓" : index + 1}
              </div>
              <span style={{ fontSize: 14, fontWeight: 500, color: allDone ? "#aaa" : "#e2e2e2" }}>{ex.name}</span>
            </div>
            <div style={{ display: "flex", gap: 8, paddingLeft: 30 }}>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#333", background: "#151515", padding: "2px 8px", borderRadius: 4 }}>
                {ex.sets} × {ex.repsMin}{ex.repsMin !== ex.repsMax ? `–${ex.repsMax}` : "s"}
              </span>
              {doneSets > 0 && !allDone && (
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: workoutColor, background: `${workoutColor}15`, padding: "2px 8px", borderRadius: 4 }}>
                  {doneSets}/{ex.sets} done
                </span>
              )}
            </div>
          </div>
          <span style={{ color: "#2a2a2a", fontSize: 11, marginTop: 4, transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "none" }}>▼</span>
        </button>

        {/* SWAP button */}
        <button
          onClick={onSwap}
          style={{ marginLeft: 8, marginTop: 2, background: "#1a1a1a", border: "1px solid #252525", borderRadius: 7, padding: "5px 10px", color: "#555", fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 1, whiteSpace: "nowrap", flexShrink: 0 }}
        >
          ⇄ SWAP
        </button>
      </div>

      {expanded && (
        <div style={{ padding: "0 14px 14px" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#3a3a3a", marginBottom: suggestion ? 8 : 12, fontStyle: "italic", paddingLeft: 2 }}>
            {ex.note}
          </div>

          {suggestion && (
            <div style={{ background: "#0d1a05", border: "1px solid #1e3310", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#c8f060", letterSpacing: 1.5, marginBottom: 3 }}>AI TARGET</div>
              <div style={{ fontSize: 12, color: "#8ac840", lineHeight: 1.5 }}>{suggestion}</div>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 48px", gap: 6, marginBottom: 6 }}>
            <div />
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a", letterSpacing: 1.5, textAlign: "center" }}>{isBodyweight ? "BW/SECS" : "LBS"}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a", letterSpacing: 1.5, textAlign: "center" }}>REPS</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a", letterSpacing: 1.5, textAlign: "center" }}>DONE</div>
          </div>

          {exData.sets.map((set, si) => {
            const hitTop = !isBodyweight && parseInt(set.reps) >= ex.repsMax;
            return (
              <div key={si} className="set-row" style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 48px", gap: 6, marginBottom: 6, alignItems: "center", opacity: set.done ? 0.6 : 1 }}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: set.done ? workoutColor : "#333", textAlign: "center", fontWeight: set.done ? 500 : 400 }}>S{si + 1}</div>
                <input type="number" placeholder={ex.startWeight > 0 ? String(ex.startWeight) : "—"} value={set.weight} min="0" step={ex.increment || 1} disabled={set.done} onChange={e => onUpdateSet(ex.id, si, "weight", e.target.value)} style={{ textAlign: "center", padding: "9px 6px", fontSize: 15, fontWeight: 500, background: set.done ? "#0a0a0a" : "#111", borderColor: hitTop && !set.done ? workoutColor : set.done ? "#0f0f0f" : "#1e1e1e", borderRadius: 8 }} />
                <input type="number" placeholder={`${ex.repsMin}–${ex.repsMax}`} value={set.reps} min="0" step="1" disabled={set.done} onChange={e => onUpdateSet(ex.id, si, "reps", e.target.value)} style={{ textAlign: "center", padding: "9px 6px", fontSize: 15, fontWeight: 500, background: set.done ? "#0a0a0a" : "#111", borderColor: hitTop && !set.done ? workoutColor : set.done ? "#0f0f0f" : "#1e1e1e", borderRadius: 8 }} />
                <button onClick={() => onMarkDone(ex.id, si)} style={{ height: 38, borderRadius: 8, background: set.done ? workoutColor : "#1a1a1a", color: set.done ? "#080808" : "#333", fontSize: 14, fontWeight: 600, border: `1px solid ${set.done ? workoutColor : "#222"}`, transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center" }}>✓</button>
              </div>
            );
          })}

          {exData.sets.some(s => s.done && parseInt(s.reps) >= ex.repsMax) && (
            <div style={{ fontSize: 10, color: workoutColor, marginTop: 4, paddingLeft: 2 }}>
              ✦ Top of range hit — ready to add {ex.increment > 0 ? `${ex.increment}lbs` : "reps"} next time
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SWAP MODAL ───────────────────────────────────────────────────────────────
function SwapModal({ originalEx, customExercises, onConfirm, onCancel }) {
  const [mode, setMode] = useState("pick"); // "pick" | "new"
  const [newName, setNewName] = useState("");
  const [newNote, setNewNote] = useState("");
  const [newSets, setNewSets] = useState(String(originalEx.sets));
  const [newRepsMin, setNewRepsMin] = useState(String(originalEx.repsMin));
  const [newRepsMax, setNewRepsMax] = useState(String(originalEx.repsMax));
  const [newStartWeight, setNewStartWeight] = useState(String(originalEx.startWeight));
  const [newIncrement, setNewIncrement] = useState(String(originalEx.increment));

  const library = Object.values(customExercises);

  const handleConfirmNew = () => {
    if (!newName.trim()) return;
    const customEx = {
      id: `custom_${Date.now()}`,
      name: newName.trim(),
      note: newNote.trim(),
      sets: parseInt(newSets) || originalEx.sets,
      repsMin: parseInt(newRepsMin) || originalEx.repsMin,
      repsMax: parseInt(newRepsMax) || originalEx.repsMax,
      startWeight: parseFloat(newStartWeight) || 0,
      increment: parseFloat(newIncrement) || 0,
      addedDate: today(),
    };
    onConfirm(customEx);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 998, display: "flex", alignItems: "flex-end" }}>
      <div className="fade-in" style={{ background: "#111", borderRadius: "18px 18px 0 0", padding: 20, width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "80vh", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "#f0a040", lineHeight: 1 }}>SWAP EXERCISE</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#444", letterSpacing: 1, marginTop: 3 }}>REPLACING: {originalEx.name.toUpperCase()}</div>
          </div>
          <button onClick={onCancel} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, width: 32, height: 32, color: "#555", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        {/* Mode toggle */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
          {[["pick", "FROM LIBRARY"], ["new", "ADD NEW"]].map(([m, label]) => (
            <button key={m} onClick={() => setMode(m)} style={{ background: mode === m ? "#f0a040" : "#1a1a1a", color: mode === m ? "#080808" : "#555", border: `1px solid ${mode === m ? "#f0a040" : "#222"}`, borderRadius: 8, padding: "9px", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1, transition: "all 0.15s" }}>
              {label}
            </button>
          ))}
        </div>

        {mode === "pick" && (
          <div>
            {library.length === 0 ? (
              <div style={{ textAlign: "center", color: "#333", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1, padding: 24 }}>
                NO SAVED EXERCISES YET<br />
                <span style={{ color: "#222", fontSize: 9 }}>Switch to ADD NEW to create one</span>
              </div>
            ) : (
              library.map(ex => (
                <button key={ex.id} onClick={() => onConfirm(ex)} style={{ width: "100%", background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 14px", marginBottom: 8, textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#e2e2e2", marginBottom: 3 }}>{ex.name}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#444" }}>
                    {ex.sets}×{ex.repsMin}–{ex.repsMax} · {ex.startWeight > 0 ? `${ex.startWeight}lbs start` : "bodyweight"}
                  </div>
                  {ex.note && <div style={{ fontSize: 11, color: "#3a3a3a", marginTop: 4, fontStyle: "italic" }}>{ex.note}</div>}
                </button>
              ))
            )}
            <button onClick={() => setMode("new")} style={{ width: "100%", background: "#0d1a05", border: "1px solid #1e3310", borderRadius: 10, padding: 11, color: "#c8f060", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2, marginTop: 4 }}>
              + ADD NEW EXERCISE
            </button>
          </div>
        )}

        {mode === "new" && (
          <div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#444", letterSpacing: 1, marginBottom: 5 }}>EXERCISE NAME *</div>
              <input placeholder="e.g. Cable Serratus Press" value={newName} onChange={e => setNewName(e.target.value)} style={{ fontSize: 14 }} />
            </div>
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#444", letterSpacing: 1, marginBottom: 5 }}>CUES / NOTES</div>
              <input placeholder="e.g. Arms straight, squeeze at peak" value={newNote} onChange={e => setNewNote(e.target.value)} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
              {[["SETS", newSets, setNewSets], ["REPS MIN", newRepsMin, setNewRepsMin], ["REPS MAX", newRepsMax, setNewRepsMax]].map(([label, val, setter]) => (
                <div key={label}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#444", letterSpacing: 1, marginBottom: 5 }}>{label}</div>
                  <input type="number" value={val} onChange={e => setter(e.target.value)} style={{ textAlign: "center" }} />
                </div>
              ))}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[["START WEIGHT (lbs)", newStartWeight, setNewStartWeight], ["INCREMENT (lbs)", newIncrement, setNewIncrement]].map(([label, val, setter]) => (
                <div key={label}>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#444", letterSpacing: 1, marginBottom: 5 }}>{label}</div>
                  <input type="number" value={val} onChange={e => setter(e.target.value)} style={{ textAlign: "center" }} />
                </div>
              ))}
            </div>
            <button onClick={handleConfirmNew} disabled={!newName.trim()} style={{ width: "100%", background: newName.trim() ? "#f0a040" : "#1a1a1a", color: newName.trim() ? "#080808" : "#444", padding: 14, borderRadius: 12, fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 1 }}>
              USE THIS EXERCISE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── HISTORY VIEW ─────────────────────────────────────────────────────────────
function HistoryView({ logs, selectedDay, onSelectDay, onClose, workout, customExercises = {} }) {
  const [activeDay, setActiveDay] = useState(selectedDay);
  const [view, setView] = useState("sessions"); // "sessions" | "progress"
  const [expandedDate, setExpandedDate] = useState(null);
  const [expandedExercise, setExpandedExercise] = useState(null);

  const wkt = PLAN.workouts[activeDay];

  const sessions = Object.entries(logs)
    .filter(([, wkts]) => wkts[activeDay])
    .sort(([a], [b]) => b.localeCompare(a));

  const sessionsAsc = [...sessions].reverse();

  const getSessionVolume = (sessionData) => {
    let vol = 0;
    Object.entries(sessionData).forEach(([key, val]) => {
      if (key.startsWith("_")) return;
      if (Array.isArray(val?.sets)) {
        val.sets.forEach(s => { if (s.weight && s.reps) vol += parseFloat(s.weight) * parseInt(s.reps); });
      }
    });
    return Math.round(vol);
  };

  // Get per-exercise history across all sessions (for progress charts)
  const getExerciseHistory = (ex) => {
    return sessionsAsc.map(([date, wkts]) => {
      const sessionData = wkts[activeDay];
      const sessionOverrides = sessionData._overrides || {};
      const override = sessionOverrides[ex.id];
      const dataKey = override?.id || ex.id;
      const val = sessionData[dataKey];
      if (!val || !Array.isArray(val.sets)) return null;
      const doneSets = val.sets.filter(s => s.reps);
      if (!doneSets.length) return null;
      const maxWeight = Math.max(...doneSets.map(s => parseFloat(s.weight || 0)));
      const totalVol = doneSets.reduce((sum, s) => sum + parseFloat(s.weight || 0) * parseInt(s.reps || 0), 0);
      const avgReps = doneSets.reduce((sum, s) => sum + parseInt(s.reps || 0), 0) / doneSets.length;
      const bestSet = doneSets.reduce((best, s) => {
        const val = parseFloat(s.weight || 0) * parseInt(s.reps || 0);
        return val > (parseFloat(best.weight || 0) * parseInt(best.reps || 0)) ? s : best;
      }, doneSets[0]);
      return { date, maxWeight, totalVol: Math.round(totalVol), avgReps: Math.round(avgReps * 10) / 10, bestSet, setsLogged: doneSets.length };
    }).filter(Boolean);
  };

  // Mini inline bar chart using CSS
  function MiniChart({ data, valueKey, color, unit = "" }) {
    if (data.length < 2) return <div style={{ fontSize: 10, color: "#2a2a2a", fontFamily: "'DM Mono', monospace" }}>Need 2+ sessions for chart</div>;
    const vals = data.map(d => d[valueKey]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const range = max - min || 1;
    const latest = vals[vals.length - 1];
    const prev = vals[vals.length - 2];
    const trend = latest > prev ? "▲" : latest < prev ? "▼" : "—";
    const trendColor = latest > prev ? "#c8f060" : latest < prev ? "#f06060" : "#555";

    return (
      <div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 44, marginBottom: 6 }}>
          {data.map((d, i) => {
            const pct = range === 0 ? 50 : ((d[valueKey] - min) / range) * 100;
            const isLast = i === data.length - 1;
            return (
              <div key={d.date} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                <div style={{ width: "100%", height: `${Math.max(8, pct)}%`, background: isLast ? color : `${color}55`, borderRadius: "2px 2px 0 0", transition: "height 0.3s" }} title={`${fmtFull(d.date)}: ${d[valueKey]}${unit}`} />
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a" }}>{data[0] ? fmt(data[0].date) : ""}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: trendColor }}>{trend} {latest}{unit}</span>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a" }}>NOW</span>
        </div>
      </div>
    );
  }

  // Volume chart across all sessions
  const volumeData = sessionsAsc.map(([date, wkts]) => ({
    date,
    vol: getSessionVolume(wkts[activeDay]),
  })).filter(d => d.vol > 0);

  return (
    <div className="fade-in" style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <button onClick={onClose} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 8, width: 36, height: 36, color: "#555", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>←</button>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: wkt.color, lineHeight: 1 }}>HISTORY</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#333", letterSpacing: 1.5 }}>{wkt.name} · {sessions.length} sessions</div>
        </div>
      </div>

      {/* Workout selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 12 }}>
        {Object.entries(PLAN.workouts).map(([key, w]) => (
          <button key={key} onClick={() => { setActiveDay(key); setExpandedDate(null); setExpandedExercise(null); }}
            style={{ background: activeDay === key ? w.color : "#0f0f0f", color: activeDay === key ? "#080808" : "#333", border: `1px solid ${activeDay === key ? w.color : "#1a1a1a"}`, borderRadius: 10, padding: "9px 6px", fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, transition: "all 0.15s" }}>
            {w.name}
          </button>
        ))}
      </div>

      {/* View toggle: Sessions vs Progress */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16 }}>
        {[["sessions", "SESSION LOG"], ["progress", "PROGRESS"]].map(([v, label]) => (
          <button key={v} onClick={() => setView(v)}
            style={{ background: view === v ? wkt.color : "#0f0f0f", color: view === v ? "#080808" : "#444", border: `1px solid ${view === v ? wkt.color : "#1a1a1a"}`, borderRadius: 10, padding: "9px", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1.5, transition: "all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {sessions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#2a2a2a", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1 }}>
          NO SESSIONS LOGGED YET
        </div>
      ) : view === "sessions" ? (
        // ── SESSION LOG ────────────────────────────────────────────
        <div>
          {sessions.map(([date, wkts]) => {
            const sessionData = wkts[activeDay];
            const isExpanded = expandedDate === date;
            const vol = getSessionVolume(sessionData);

            return (
              <div key={date} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, marginBottom: 8, overflow: "hidden" }}>
                <button onClick={() => setExpandedDate(isExpanded ? null : date)}
                  style={{ width: "100%", background: "none", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: "#e2e2e2", marginBottom: 3 }}>{fmtFull(date)}</div>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3a3a3a" }}>
                      {vol > 0 ? `${vol.toLocaleString()} lbs volume` : "Logged"}
                    </div>
                  </div>
                  <span style={{ color: "#2a2a2a", fontSize: 11, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none" }}>▼</span>
                </button>

                {isExpanded && (
                  <div style={{ padding: "0 14px 14px", borderTop: "1px solid #151515" }}>
                    {PLAN.workouts[activeDay].exercises.map(ex => {
                      const sessionOverrides = sessionData._overrides || {};
                      const override = sessionOverrides[ex.id];
                      const dataKey = override?.id || ex.id;
                      const displayName = override ? (customExercises[override.id]?.name || override.name) : ex.name;
                      const val = sessionData[dataKey];
                      if (!val) return null;
                      const sets = Array.isArray(val.sets) ? val.sets : [];
                      const flatStr = sets.length > 0
                        ? sets.map((s, i) => `S${i+1}: ${s.weight || "BW"}×${s.reps || "?"}${s.done ? " ✓" : ""}`).join("  ")
                        : val.weight ? `${val.sets}×${val.reps} @ ${val.weight}lbs` : null;
                      if (!flatStr) return null;
                      return (
                        <div key={ex.id} style={{ paddingTop: 10, paddingBottom: 10, borderBottom: "1px solid #131313" }}>
                          <div style={{ fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 4 }}>
                            {displayName}
                            {override && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#f0a04099", marginLeft: 6 }}>⇄ sub</span>}
                          </div>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#444", lineHeight: 1.8 }}>{flatStr}</div>
                        </div>
                      );
                    })}
                    {sessionData._notes && (
                      <div style={{ paddingTop: 10 }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#2a2a2a", marginBottom: 4, letterSpacing: 1 }}>NOTES</div>
                        <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>{sessionData._notes}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        // ── PROGRESS VIEW ──────────────────────────────────────────
        <div>
          {/* Total volume trend */}
          {volumeData.length >= 2 && (
            <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, padding: 14, marginBottom: 12 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#444", marginBottom: 10 }}>TOTAL SESSION VOLUME (lbs)</div>
              <MiniChart data={volumeData} valueKey="vol" color={wkt.color} unit="" />
            </div>
          )}

          {/* Per-exercise progress */}
          {PLAN.workouts[activeDay].exercises.map(ex => {
            const history = getExerciseHistory(ex);
            if (history.length === 0) return null;
            const isExpanded = expandedExercise === ex.id;
            const latest = history[history.length - 1];
            const first = history[0];
            const weightGain = latest.maxWeight - first.maxWeight;
            const volGain = latest.totalVol - first.totalVol;

            return (
              <div key={ex.id} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
                <button onClick={() => setExpandedExercise(isExpanded ? null : ex.id)}
                  style={{ width: "100%", background: "none", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: "#e2e2e2", marginBottom: 5 }}>{ex.name}</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: wkt.color, background: `${wkt.color}15`, padding: "2px 8px", borderRadius: 4 }}>
                        BEST: {latest.maxWeight > 0 ? `${latest.maxWeight}lbs` : "BW"} × {latest.bestSet?.reps || "?"}
                      </span>
                      {weightGain !== 0 && (
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: weightGain > 0 ? "#c8f060" : "#f06060", background: weightGain > 0 ? "#c8f06015" : "#f0606015", padding: "2px 8px", borderRadius: 4 }}>
                          {weightGain > 0 ? "+" : ""}{weightGain}lbs since start
                        </span>
                      )}
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#333", padding: "2px 8px", borderRadius: 4 }}>
                        {history.length} sessions
                      </span>
                    </div>
                  </div>
                  <span style={{ color: "#2a2a2a", fontSize: 11, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none", flexShrink: 0, marginLeft: 8 }}>▼</span>
                </button>

                {isExpanded && (
                  <div style={{ padding: "0 14px 14px", borderTop: "1px solid #151515" }}>
                    {/* Weight trend chart */}
                    {history.length >= 2 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#333", letterSpacing: 1.5, marginBottom: 8 }}>TOP WEIGHT PER SESSION</div>
                        <MiniChart data={history} valueKey="maxWeight" color={wkt.color} unit="lbs" />
                      </div>
                    )}

                    {/* Volume trend chart */}
                    {history.length >= 2 && (
                      <div style={{ marginBottom: 14 }}>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#333", letterSpacing: 1.5, marginBottom: 8 }}>VOLUME PER SESSION (lbs)</div>
                        <MiniChart data={history} valueKey="totalVol" color="#60b8f0" unit="" />
                      </div>
                    )}

                    {/* Session by session table */}
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#333", letterSpacing: 1.5, marginBottom: 8 }}>ALL SESSIONS</div>
                    {[...history].reverse().map((h, i) => (
                      <div key={h.date} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #131313" }}>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: i === 0 ? wkt.color : "#444" }}>{fmt(h.date)}</span>
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: i === 0 ? "#e2e2e2" : "#555" }}>
                          {h.maxWeight > 0 ? `${h.maxWeight}lbs` : "BW"} · {h.setsLogged} sets · {h.totalVol.toLocaleString()} lbs vol
                        </span>
                      </div>
                    ))}

                    {/* Overall stats */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 12 }}>
                      {[
                        { label: "WEIGHT CHANGE", val: `${weightGain >= 0 ? "+" : ""}${weightGain}lbs`, color: weightGain > 0 ? "#c8f060" : weightGain < 0 ? "#f06060" : "#555" },
                        { label: "VOL CHANGE", val: `${volGain >= 0 ? "+" : ""}${volGain.toLocaleString()}`, color: volGain > 0 ? "#c8f060" : "#555" },
                      ].map(s => (
                        <div key={s.label} style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 8, padding: "10px 10px" }}>
                          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: s.color, lineHeight: 1 }}>{s.val}</div>
                          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#2a2a2a", letterSpacing: 1, marginTop: 3 }}>{s.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── TODAY TAB ────────────────────────────────────────────────────────────────
function TodayTab({ logs, nutrition, sleep, bodyweight, saveBW, saveSleep, setTab }) {
  const d = today();
  const todayLog = logs[d] || {};
  const todayNutrition = nutrition[d] || {};
  const todaySleep = sleep[d] || {};
  const [bw, setBw] = useState(bodyweight[d] || "");
  const [sleepHrs, setSleepHrs] = useState(todaySleep.hours || "");
  const [sleepQ, setSleepQ] = useState(todaySleep.quality || "");
  const [ouraData, setOuraData] = useState(todaySleep.oura || null);
  const [ouraLoading, setOuraLoading] = useState(false);
  const [ouraError, setOuraError] = useState("");
  const [aiTip, setAiTip] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const totalCal = todayNutrition.meals?.reduce((s, m) => s + (parseInt(m.calories) || 0), 0) || 0;
  const totalProt = todayNutrition.meals?.reduce((s, m) => s + (parseInt(m.protein) || 0), 0) || 0;
  const isDrinkDay = todayNutrition.drinkDay;
  const macros = isDrinkDay ? DRINK_DAY_MACROS : NORMAL_MACROS;

  const dayWorkoutKey = getDefaultWorkout();
  const dayWorkout = PLAN.workouts[dayWorkoutKey];
  const todayLogged = todayLog[dayWorkoutKey];
  const hasOuraToken = isOuraConnected();

  const handleSaveSleep = () => saveSleep(d, { hours: parseFloat(sleepHrs) || 0, quality: sleepQ, oura: ouraData || null });
  const handleSaveBW = () => saveBW(d, parseFloat(bw) || 0);

  const syncOura = async () => {
    if (!hasOuraToken) return;
    setOuraLoading(true);
    setOuraError("");
    const data = await syncOuraForDate(d);
    if (!data) {
      setOuraError("No Oura data found for today — check your token in Settings.");
      setOuraLoading(false);
      return;
    }
    setOuraData(data);
    // Auto-fill sleep hours from Oura
    if (data.hours) setSleepHrs(String(data.hours));
    // Auto-save with Oura data
    saveSleep(d, { hours: data.hours || parseFloat(sleepHrs) || 0, quality: sleepQ, oura: data });
    setOuraLoading(false);
  };

  const getAiTip = async () => {
    setAiLoading(true);
    const recentLogs = Object.entries(logs).sort(([a], [b]) => b.localeCompare(a)).slice(0, 5)
      .map(([date, wkts]) => `${date}: ${Object.keys(wkts).map(w => PLAN.workouts[w]?.name || w).join("+")}`).join(", ");
    const ouraContext = ouraData ? `Oura: sleep ${ouraData.hours}h, score ${ouraData.score || "?"}, HRV ${ouraData.hrv || "?"}ms, readiness ${ouraData.readinessScore || "?"}, steps ${ouraData.steps?.toLocaleString() || "?"}` : "";
    const tip = await callClaude(
      `Today: ${d}. Recent workouts: ${recentLogs || "none"}. Sleep: ${sleepHrs || "?"}hrs. BW: ${bw || "?"}lbs. Cals so far: ${totalCal}/${macros.calories}. Protein: ${totalProt}/${macros.protein}g. Today's workout: ${dayWorkout.name}. ${ouraContext}. Give a short, specific coaching tip for today.`
    );
    setAiTip(tip);
    setAiLoading(false);
  };

  const od = ouraData;

  return (
    <div className="fade-in" style={{ padding: 16 }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, marginBottom: 16, color: "#555" }}>{fmtFull(d)}</div>

      {/* TODAY'S WORKOUT CARD */}
      <div style={{ background: `linear-gradient(135deg, #0f1a08, #0a0a0a)`, border: `1px solid ${dayWorkout.color}22`, borderRadius: 14, padding: 16, marginBottom: 14, cursor: "pointer" }} onClick={() => setTab("workout")}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: dayWorkout.color, letterSpacing: 2, marginBottom: 6 }}>TODAY'S WORKOUT</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: dayWorkout.color, lineHeight: 1 }}>{dayWorkout.name}</div>
            <div style={{ fontSize: 12, color: "#444", marginTop: 3 }}>{dayWorkout.sub}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            {todayLogged ? <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#c8f060" }}>✓ LOGGED</div>
              : <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "#333" }}>START →</div>}
          </div>
        </div>
      </div>

      {/* QUICK STATS — 4 stats if Oura connected */}
      <div style={{ display: "grid", gridTemplateColumns: od ? "repeat(4, 1fr)" : "repeat(3, 1fr)", gap: 6, marginBottom: 14 }}>
        {[
          { label: "CAL", val: `${totalCal}`, sub: `/ ${macros.calories}`, color: totalCal >= macros.calories * 0.9 ? "#c8f060" : "#f0a040" },
          { label: "PROTEIN", val: `${totalProt}g`, sub: `/ ${macros.protein}g`, color: totalProt >= macros.protein * 0.9 ? "#c8f060" : "#f0a040" },
          { label: "SLEEP", val: sleepHrs ? `${sleepHrs}h` : "—", sub: od?.score ? `score ${od.score}` : (sleepQ || "log it"), color: parseFloat(sleepHrs) >= 7 ? "#c8f060" : "#f06060" },
          ...(od ? [{ label: "READY", val: od.readinessScore ? `${od.readinessScore}` : "—", sub: od.steps ? `${Math.round(od.steps/1000)}k steps` : "steps —", color: od.readinessScore >= 70 ? "#c8f060" : od.readinessScore >= 50 ? "#f0a040" : "#f06060" }] : []),
        ].map(s => (
          <div key={s.label} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 8px" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, letterSpacing: 1.5, color: "#2a2a2a", marginTop: 3 }}>{s.label}</div>
            <div style={{ fontSize: 9, color: "#444", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* OURA DETAIL CARD — shown once synced */}
      {od && (
        <div style={{ background: "#08100a", border: "1px solid #1a3a22", borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#4a9a5a" }}>OURA RING</div>
            <button onClick={syncOura} disabled={ouraLoading} style={{ background: "none", color: "#2a5a3a", fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 1 }}>
              {ouraLoading ? "SYNCING..." : "↻ REFRESH"}
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: od.hrv ? 10 : 0 }}>
            {[
              { label: "SLEEP", val: od.hours ? `${od.hours}h` : "—", sub: od.efficiency ? `${od.efficiency}% eff` : "" },
              { label: "HRV", val: od.hrv ? `${od.hrv}ms` : "—", sub: od.restingHR ? `${od.restingHR} bpm RHR` : "" },
              { label: "STEPS", val: od.steps ? `${Math.round(od.steps/1000*10)/10}k` : "—", sub: od.activeCalories ? `${od.activeCalories} kcal` : "" },
            ].map(s => (
              <div key={s.label} style={{ background: "#0a1a0f", border: "1px solid #1a2a1e", borderRadius: 10, padding: "10px 8px" }}>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#5aaa6a", lineHeight: 1 }}>{s.val}</div>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#2a4a30", letterSpacing: 1, marginTop: 3 }}>{s.label}</div>
                {s.sub && <div style={{ fontSize: 9, color: "#3a6a44", marginTop: 2 }}>{s.sub}</div>}
              </div>
            ))}
          </div>
          {od.hrv && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {[
                { label: "DEEP SLEEP", val: od.deepMins ? `${od.deepMins}m` : "—" },
                { label: "REM SLEEP", val: od.remMins ? `${od.remMins}m` : "—" },
              ].map(s => (
                <div key={s.label} style={{ background: "#0a1a0f", border: "1px solid #1a2a1e", borderRadius: 8, padding: "8px 10px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a4a30", letterSpacing: 1 }}>{s.label}</span>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "#5aaa6a" }}>{s.val}</span>
                </div>
              ))}
            </div>
          )}
          {/* Steps progress toward 10k goal */}
          {od.steps > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "#2a4a30", marginBottom: 4, fontFamily: "'DM Mono', monospace" }}>
                <span>STEPS</span><span>{od.steps?.toLocaleString()} / 10,000</span>
              </div>
              <div style={{ height: 3, background: "#0f2a14", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, (od.steps / 10000) * 100)}%`, background: od.steps >= 10000 ? "#c8f060" : "#4a9a5a", borderRadius: 2 }} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* OURA SYNC BUTTON — shown if token set but not yet synced */}
      {hasOuraToken && !od && (
        <button onClick={syncOura} disabled={ouraLoading} style={{ width: "100%", background: ouraLoading ? "#0a0a0a" : "#08100a", border: "1px solid #1a3a22", borderRadius: 12, padding: "12px", marginBottom: 12, color: ouraLoading ? "#2a4a30" : "#4a9a5a", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2 }}>
          {ouraLoading ? <span className="shimmer">SYNCING OURA...</span> : "⟳ SYNC FROM OURA RING"}
        </button>
      )}
      {ouraError && <div style={{ fontSize: 11, color: "#f06060", marginBottom: 10, paddingLeft: 2 }}>{ouraError}</div>}

      {/* PROGRESS BARS */}
      <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: 14, marginBottom: 10 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#2a2a2a", marginBottom: 10 }}>TODAY'S TARGETS</div>
        {[
          { label: "Calories", val: totalCal, max: macros.calories, color: "#c8f060" },
          { label: "Protein", val: totalProt, max: macros.protein, color: "#f0a040" },
        ].map(b => (
          <div key={b.label} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#444", marginBottom: 5 }}>
              <span>{b.label}</span>
              <span style={{ color: "#555" }}>{b.val} / {b.max}{b.label === "Protein" ? "g" : ""}</span>
            </div>
            <div style={{ height: 4, background: "#1a1a1a", borderRadius: 2, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, (b.val / b.max) * 100)}%`, background: b.color, borderRadius: 2, transition: "width 0.4s ease" }} />
            </div>
          </div>
        ))}
      </div>

      {/* BODYWEIGHT */}
      <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: 14, marginBottom: 10 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#2a2a2a", marginBottom: 10 }}>BODYWEIGHT</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input type="number" placeholder="lbs" step="0.1" value={bw} onChange={e => setBw(e.target.value)} style={{ flex: 1 }} />
          <button onClick={handleSaveBW} style={{ background: "#c8f060", color: "#080808", padding: "0 18px", borderRadius: 10, fontSize: 12, fontWeight: 500, fontFamily: "inherit", whiteSpace: "nowrap" }}>SAVE</button>
        </div>
        {bodyweight[d] && <div style={{ fontSize: 11, color: "#444", marginTop: 8 }}>{bodyweight[d]} lbs · {(bodyweight[d] - PLAN.targetWeight).toFixed(1)} lbs from goal</div>}
      </div>

      {/* SLEEP — manual input (pre-filled by Oura if synced) */}
      <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: 14, marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#2a2a2a" }}>SLEEP</div>
          {od && <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#4a9a5a", letterSpacing: 1 }}>⟳ FROM OURA</div>}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <input type="number" placeholder="Hours (e.g. 7.5)" step="0.5" min="0" max="12" value={sleepHrs} onChange={e => setSleepHrs(e.target.value)} />
          <select value={sleepQ} onChange={e => setSleepQ(e.target.value)} style={{ background: "#111", border: "1px solid #222", color: sleepQ ? "#e2e2e2" : "#555", borderRadius: 10, padding: "10px 12px" }}>
            <option value="">Quality</option>
            <option>Deep / Solid</option>
            <option>OK</option>
            <option>Broken / Bad</option>
          </select>
        </div>
        <button onClick={handleSaveSleep} style={{ width: "100%", background: "#1a1a1a", color: "#555", padding: "10px", borderRadius: 10, fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2 }}>SAVE SLEEP</button>
        {parseFloat(sleepHrs) < 7 && sleepHrs && <div style={{ fontSize: 11, color: "#f06060", marginTop: 8 }}>Under 7 hrs cuts GH output and fat loss. Sleep in tonight.</div>}
      </div>

      {/* AI TIP */}
      <div style={{ background: "#0d1a05", border: "1px solid #1e3310", borderRadius: 12, padding: 14 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#c8f060", marginBottom: 10 }}>AI COACH</div>
        {aiTip ? (
          <div style={{ fontSize: 13, color: "#8ac840", lineHeight: 1.8 }}>{aiTip}</div>
        ) : (
          <button onClick={getAiTip} disabled={aiLoading} style={{ width: "100%", background: aiLoading ? "#111" : "#c8f060", color: "#080808", padding: 12, borderRadius: 10, fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>
            {aiLoading ? <span className="shimmer">ANALYZING YOUR DAY...</span> : "GET TODAY'S COACHING TIP"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── NUTRITION TAB ────────────────────────────────────────────────────────────
function NutritionTab({ nutrition, saveNutrition }) {
  const [logDate, setLogDate] = useState(today());
  const [meals, setMeals] = useState([]);
  const [drinkDay, setDrinkDay] = useState(false);
  const [newMeal, setNewMeal] = useState({ name: "", calories: "", protein: "", carbs: "", fat: "" });
  const [estimating, setEstimating] = useState(false);
  const [estimateInput, setEstimateInput] = useState("");

  useEffect(() => {
    const d = nutrition[logDate];
    setMeals(d?.meals || []);
    setDrinkDay(d?.drinkDay || false);
  }, [logDate, nutrition]);

  const macros = drinkDay ? DRINK_DAY_MACROS : NORMAL_MACROS;
  const totals = meals.reduce((s, m) => ({
    calories: s.calories + (parseInt(m.calories) || 0),
    protein: s.protein + (parseInt(m.protein) || 0),
    carbs: s.carbs + (parseInt(m.carbs) || 0),
    fat: s.fat + (parseInt(m.fat) || 0),
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 });

  const save = (updMeals, updDrink) => {
    const m = updMeals !== undefined ? updMeals : meals;
    const dd = updDrink !== undefined ? updDrink : drinkDay;
    saveNutrition(logDate, { meals: m, drinkDay: dd });
  };

  const addMeal = () => {
    if (!newMeal.name) return;
    const m = [...meals, { ...newMeal, id: Date.now() }];
    setMeals(m);
    setNewMeal({ name: "", calories: "", protein: "", carbs: "", fat: "" });
    save(m);
  };

  const removeMeal = (id) => {
    const m = meals.filter(m => m.id !== id);
    setMeals(m);
    save(m);
  };

  const estimateMacros = async () => {
    if (!estimateInput.trim()) return;
    setEstimating(true);
    const res = await callClaude(
      `Estimate macros for: "${estimateInput}". Respond ONLY with JSON: {"calories":number,"protein":number,"carbs":number,"fat":number,"name":"string"}. No other text.`
    );
    try {
      const parsed = JSON.parse(res.replace(/```json|```/g, "").trim());
      setNewMeal({ name: parsed.name || estimateInput, calories: String(parsed.calories || ""), protein: String(parsed.protein || ""), carbs: String(parsed.carbs || ""), fat: String(parsed.fat || "") });
      setEstimateInput("");
    } catch {
      setNewMeal(prev => ({ ...prev, name: estimateInput }));
    }
    setEstimating(false);
  };

  return (
    <div className="fade-in" style={{ padding: 16 }}>
      <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)} style={{ marginBottom: 12, fontSize: 13 }} />

      {/* DRINK DAY */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: drinkDay ? "#1a0f03" : "#0f0f0f", border: `1px solid ${drinkDay ? "#3a2510" : "#1a1a1a"}`, borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: drinkDay ? "#f0a040" : "#444" }}>Drinking tonight?</div>
          <div style={{ fontSize: 11, color: "#333", marginTop: 2 }}>Switches to 1,400 cal damage control macros</div>
        </div>
        <button onClick={() => { setDrinkDay(!drinkDay); save(undefined, !drinkDay); }} style={{ background: drinkDay ? "#f0a040" : "#1a1a1a", color: drinkDay ? "#080808" : "#444", padding: "6px 16px", borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1 }}>
          {drinkDay ? "YES" : "NO"}
        </button>
      </div>

      {/* MACRO TOTALS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 12 }}>
        {[
          { label: "CAL", key: "calories", color: "#c8f060" },
          { label: "PRO", key: "protein", color: "#f0a040" },
          { label: "CARB", key: "carbs", color: "#60b8f0" },
          { label: "FAT", key: "fat", color: "#888" },
        ].map(m => (
          <div key={m.label} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 10, padding: "10px 8px" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: m.color, lineHeight: 1 }}>{totals[m.key]}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a", letterSpacing: 1, marginTop: 2 }}>{m.label} / {macros[m.key]}</div>
            <div style={{ height: 2, background: "#1a1a1a", borderRadius: 1, marginTop: 5, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(100, (totals[m.key] / macros[m.key]) * 100)}%`, background: m.color }} />
            </div>
          </div>
        ))}
      </div>

      {/* AI ESTIMATOR */}
      <div style={{ background: "#0d1a05", border: "1px solid #1e3310", borderRadius: 12, padding: 12, marginBottom: 12 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#c8f060", marginBottom: 8 }}>AI MACRO ESTIMATOR</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input placeholder='e.g. "8oz ground beef + avocado"' value={estimateInput} onChange={e => setEstimateInput(e.target.value)} onKeyDown={e => e.key === "Enter" && estimateMacros()} />
          <button onClick={estimateMacros} disabled={estimating} style={{ background: estimating ? "#111" : "#c8f060", color: "#080808", padding: "0 14px", borderRadius: 10, fontSize: 11, fontWeight: 500, fontFamily: "inherit", minWidth: 70, whiteSpace: "nowrap" }}>
            {estimating ? <span className="shimmer">...</span> : "SCAN"}
          </button>
        </div>
      </div>

      {/* ADD MEAL */}
      <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: 14, marginBottom: 12 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#2a2a2a", marginBottom: 10 }}>ADD MEAL</div>
        <input placeholder="Meal name" value={newMeal.name} onChange={e => setNewMeal(p => ({ ...p, name: e.target.value }))} style={{ marginBottom: 8 }} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6, marginBottom: 10 }}>
          {["calories", "protein", "carbs", "fat"].map(f => (
            <div key={f}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a", marginBottom: 4, letterSpacing: 1 }}>{f.slice(0,3).toUpperCase()}</div>
              <input type="number" placeholder="0" value={newMeal[f]} onChange={e => setNewMeal(p => ({ ...p, [f]: e.target.value }))} style={{ padding: "8px 6px", textAlign: "center" }} />
            </div>
          ))}
        </div>
        <button onClick={addMeal} style={{ width: "100%", background: "#c8f060", color: "#080808", padding: 12, borderRadius: 10, fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, letterSpacing: 1 }}>ADD MEAL</button>
      </div>

      {/* MEAL LIST */}
      {meals.length === 0 ? (
        <div style={{ textAlign: "center", color: "#2a2a2a", fontSize: 13, padding: 24, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>NO MEALS LOGGED</div>
      ) : (
        meals.map(m => (
          <div key={m.id} style={{ display: "flex", gap: 10, background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: 12, marginBottom: 8, alignItems: "center" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3a3a3a", marginTop: 4 }}>
                {m.calories}cal · {m.protein}p · {m.carbs}c · {m.fat}f
              </div>
            </div>
            <button onClick={() => removeMeal(m.id)} style={{ background: "none", color: "#2a2a2a", fontSize: 20, padding: "4px 10px" }}>×</button>
          </div>
        ))
      )}
    </div>
  );
}

// ─── PROGRESS TAB ─────────────────────────────────────────────────────────────
function ProgressTab({ logs, nutrition, sleep, bodyweight }) {
  const [analysis, setAnalysis] = useState("");
  const [analyzing, setAnalyzing] = useState(false);

  const bwEntries = Object.entries(bodyweight).sort(([a], [b]) => a.localeCompare(b));
  const sleepEntries = Object.entries(sleep).sort(([a], [b]) => a.localeCompare(b));
  const workoutDays = Object.keys(logs).length;
  const avgSleep = sleepEntries.length ? (sleepEntries.reduce((s, [, v]) => s + (v.hours || 0), 0) / sleepEntries.length).toFixed(1) : "—";
  const startBW = bwEntries[0]?.[1];
  const currentBW = bwEntries[bwEntries.length - 1]?.[1];
  const bwChange = startBW && currentBW ? (currentBW - startBW).toFixed(1) : null;

  const getAnalysis = async () => {
    setAnalyzing(true);
    const bwHistory = bwEntries.slice(-10).map(([d, v]) => `${d}: ${v}lbs`).join(", ");
    const sleepHistory = sleepEntries.slice(-7).map(([d, v]) => `${d}: ${v.hours}h`).join(", ");
    const workoutHistory = Object.entries(logs).slice(-6).map(([d, wkts]) => `${d}: ${Object.keys(wkts).map(k => PLAN.workouts[k]?.name).join("+")}`).join(", ");
    const res = await callClaude(
      `Full progress review. BW: ${bwHistory || "none"}. Sleep: ${sleepHistory || "none"}. Workouts: ${workoutHistory || "none"}. Days to May 15: ${daysUntil(PLAN.targetDate)}. Target: ${PLAN.targetWeight}lbs at ${PLAN.targetBF}% BF. Give a direct 4-5 sentence honest assessment: fat loss trajectory, training consistency, sleep, and 1-2 specific adjustments needed NOW.`
    );
    setAnalysis(res);
    setAnalyzing(false);
  };

  return (
    <div className="fade-in" style={{ padding: 16 }}>
      {/* KEY METRICS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        {[
          { label: "WORKOUTS", val: workoutDays, sub: "sessions logged", color: "#c8f060" },
          { label: "AVG SLEEP", val: `${avgSleep}h`, sub: parseFloat(avgSleep) >= 7 ? "On track" : "Below target", color: parseFloat(avgSleep) >= 7 ? "#c8f060" : "#f06060" },
          { label: "WEIGHT NOW", val: currentBW ? `${currentBW}` : "—", sub: bwChange ? `${bwChange > 0 ? "+" : ""}${bwChange} lbs total` : "Not logged", color: "#f0a040" },
          { label: "DAYS LEFT", val: daysUntil(PLAN.targetDate), sub: "until May 15", color: "#60b8f0" },
        ].map(m => (
          <div key={m.label} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: 14 }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, color: m.color, lineHeight: 1 }}>{m.val}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a", letterSpacing: 1, marginTop: 4 }}>{m.label}</div>
            <div style={{ fontSize: 10, color: "#444", marginTop: 3 }}>{m.sub}</div>
          </div>
        ))}
      </div>

      {/* BODYWEIGHT CHART */}
      {bwEntries.length > 1 && (
        <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#2a2a2a", marginBottom: 12 }}>BODYWEIGHT TREND</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 60 }}>
            {bwEntries.slice(-14).map(([d, v]) => {
              const allVals = bwEntries.map(([,v]) => v);
              const min = Math.min(...allVals) - 1;
              const max = Math.max(...allVals) + 1;
              const pct = ((v - min) / (max - min)) * 100;
              return (
                <div key={d} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                  <div style={{ fontSize: 7, color: "#2a2a2a" }}>{v}</div>
                  <div style={{ width: "100%", height: `${pct}%`, background: v <= PLAN.targetWeight ? "#c8f060" : "#f0a040", borderRadius: "2px 2px 0 0", minHeight: 4 }} />
                </div>
              );
            })}
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a" }}>OLDEST</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#c8f060" }}>GOAL: {PLAN.targetWeight}</span>
            <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a" }}>TODAY</span>
          </div>
        </div>
      )}

      {/* SLEEP TREND */}
      {sleepEntries.length > 0 && (
        <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: 14, marginBottom: 12 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#2a2a2a", marginBottom: 10 }}>SLEEP TREND</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 44 }}>
            {sleepEntries.slice(-14).map(([d, v]) => (
              <div key={d} style={{ flex: 1, height: `${Math.min(100, ((v.hours || 0) / 10) * 100)}%`, background: v.hours >= 7 ? "#c8f060" : v.hours >= 6 ? "#f0a040" : "#f06060", borderRadius: "2px 2px 0 0", minHeight: 3 }} title={`${d}: ${v.hours}h`} />
            ))}
          </div>
        </div>
      )}

      {/* AI ANALYSIS */}
      <div style={{ background: "#0d1a05", border: "1px solid #1e3310", borderRadius: 12, padding: 14 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#c8f060", marginBottom: 10 }}>AI PROGRESS ANALYSIS</div>
        {analysis ? (
          <div style={{ fontSize: 13, color: "#8ac840", lineHeight: 1.8 }}>{analysis}</div>
        ) : (
          <button onClick={getAnalysis} disabled={analyzing} style={{ width: "100%", background: analyzing ? "#111" : "#c8f060", color: "#080808", padding: 13, borderRadius: 10, fontSize: 13, fontWeight: 500, fontFamily: "inherit" }}>
            {analyzing ? <span className="shimmer">ANALYZING ALL YOUR DATA...</span> : "RUN PROGRESS ANALYSIS"}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── PLAN TAB ─────────────────────────────────────────────────────────────────
function PlanTab() {
  const [open, setOpen] = useState(null);
  const sections = [
    {
      id: "macros", title: "DAILY NUTRITION TARGETS",
      content: () => (
        <div>
          {[["Training day", "1750 cal · 175g protein · 140g carbs · 55g fat"],["Drinking day","1400 cal · 160g protein · 80g carbs · 35g fat"]].map(([t,v]) => (
            <div key={t} style={{ padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{t}</div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#444", marginTop: 3 }}>{v}</div>
            </div>
          ))}
        </div>
      )
    },
    {
      id: "meals", title: "MEAL STRUCTURE",
      content: () => (
        <div>
          {[
            ["Pre-workout", "Coffee + 1 scoop protein", "90 cal · 20g P"],
            ["Post-workout", "2 scoops + banana + 1 tbsp PB", "380 cal · 43g P"],
            ["Afternoon", "2 scoops + banana", "280 cal · 43g P"],
            ["Dinner", "8oz 85/15 beef + cucumbers + ½ avocado", "700 cal · 52g P"],
          ].map(([t, m, mc]) => (
            <div key={t} style={{ padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#f0a040", letterSpacing: 1 }}>{t}</div>
              <div style={{ fontSize: 12, marginTop: 3 }}>{m}</div>
              <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{mc}</div>
            </div>
          ))}
        </div>
      )
    },
    {
      id: "phases", title: "PHASE OVERVIEW",
      content: () => (
        <div>
          {PLAN.phases.map(p => (
            <div key={p.name} style={{ padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: p.color }}>{p.name}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#444" }}>Weeks {p.weeks[0]}–{p.weeks[p.weeks.length-1]}</span>
              </div>
            </div>
          ))}
        </div>
      )
    },
    {
      id: "rules", title: "NON-NEGOTIABLES",
      content: () => (
        <div>
          {["Hit 175g protein every day — no exceptions","9–10k steps daily — 300-400 passive calories","7–8 hrs sleep minimum — GH output depends on it","Log every session — progression needs data","1,750 cal is the floor — never go lower","Weekly check-in photo — fasted Sunday morning"].map((r, i) => (
            <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid #1a1a1a", fontSize: 12, color: "#777" }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "#c8f060", lineHeight: 1, minWidth: 20 }}>{i+1}</span>
              <span>{r}</span>
            </div>
          ))}
        </div>
      )
    },
    {
      id: "drink", title: "DRINKING NIGHT RULES",
      content: () => (
        <div style={{ fontSize: 12, color: "#777", lineHeight: 1.9 }}>
          <p style={{ marginBottom: 8 }}><strong style={{ color: "#f0a040" }}>Before going out:</strong> Eat full protein dinner. Skip avocado. Less butter.</p>
          <p style={{ marginBottom: 8 }}><strong style={{ color: "#f0a040" }}>Drink choice:</strong> Tequila/vodka/gin + soda = ~65 cal each. No beer.</p>
          <p style={{ marginBottom: 8 }}><strong style={{ color: "#f0a040" }}>4–6 spirits:</strong> 260–390 extra cal. Manageable.</p>
          <p><strong style={{ color: "#f0a040" }}>Day after:</strong> Normal 1,750. Hydrate hard. Train if possible.</p>
        </div>
      )
    }
  ];

  return (
    <div className="fade-in" style={{ padding: 16 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#2a2a2a", marginBottom: 16 }}>REFERENCE · TAP TO EXPAND</div>
      {sections.map(s => (
        <div key={s.id} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, marginBottom: 8, overflow: "hidden" }}>
          <button onClick={() => setOpen(open === s.id ? null : s.id)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px", background: "none", color: open === s.id ? "#c8f060" : "#666" }}>
            <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, letterSpacing: 0.5 }}>{s.title}</span>
            <span style={{ transition: "transform 0.2s", transform: open === s.id ? "rotate(180deg)" : "none", fontSize: 11, color: "#333" }}>▼</span>
          </button>
          {open === s.id && <div style={{ padding: "0 14px 14px", borderTop: "1px solid #151515" }}>{s.content()}</div>}
        </div>
      ))}
    </div>
  );
}
