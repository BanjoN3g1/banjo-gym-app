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
const WORKOUT_TINTS = {
  D1: "#0b0e08", // push — warm green seeps into the dark
  D2: "#08090e", // pull — cool blue underlights
  D3: "#0e0b08", // legs — amber heat
};
// Always use LOCAL date — toISOString() gives UTC which mismatches local day-of-week
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};
const localDateStr = (d) => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
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
// Uses Personal Access Token (PAT) — simpler than OAuth2 for a personal app.
// PAT goes directly as Bearer token, no exchange/refresh flow needed.
// PAT is stored as oura_pat in localStorage; expiry set to 0 = never.

function getOuraPAT() {
  return localStorage.getItem("oura_pat") || "";
}

function saveOuraPAT(pat) {
  if (pat) {
    localStorage.setItem("oura_pat", pat.trim());
    localStorage.setItem("oura_access_token", pat.trim()); // also set as access_token for compat
    localStorage.setItem("oura_token_expiry", "0"); // 0 = never expires
  } else {
    localStorage.removeItem("oura_pat");
    localStorage.removeItem("oura_access_token");
    localStorage.removeItem("oura_token_expiry");
  }
}

function getOuraToken() {
  // PAT takes priority; fallback to OAuth access token
  return localStorage.getItem("oura_pat") || localStorage.getItem("oura_access_token") || "";
}

function isOuraConnected() {
  const pat = getOuraPAT();
  if (pat) return true; // PATs don't expire (or expire after years)
  const token = localStorage.getItem("oura_access_token") || "";
  if (!token) return false;
  const expiry = parseInt(localStorage.getItem("oura_token_expiry") || "0");
  return expiry === 0 || expiry > Date.now() + 3600000;
}

function disconnectOura() {
  localStorage.removeItem("oura_pat");
  localStorage.removeItem("oura_access_token");
  localStorage.removeItem("oura_refresh_token");
  localStorage.removeItem("oura_token_expiry");
}

async function fetchOura(endpoint, params) {
  const token = getOuraToken();
  if (!token) return null;

  try {
    const res = await fetch("/api/oura", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "fetch", token, endpoint, params }),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch { return null; }
}

async function syncOuraForDate(date) {
  // Fetch all 4 endpoints in parallel
  const [dailySleepRes, sleepRes, activityRes, readinessRes] = await Promise.all([
    fetchOura("daily_sleep",    { start_date: date, end_date: date }),
    fetchOura("sleep",          { start_date: date, end_date: date }),
    fetchOura("daily_activity", { start_date: date, end_date: date }),
    fetchOura("daily_readiness",{ start_date: date, end_date: date }),
  ]);

  const result = {};

  // Score comes from daily_sleep (authoritative), not individual sessions
  if (dailySleepRes?.data?.length) {
    result.score = dailySleepRes.data[0].score || null;
  }

  // HRV, duration, stages from the longest sleep session
  if (sleepRes?.data?.length) {
    // Filter to main sleep sessions only (exclude naps etc.)
    const sessions = sleepRes.data.filter(s => s.type !== "rest" && s.type !== "late_nap");
    const pool = sessions.length ? sessions : sleepRes.data;
    const main = pool.reduce((best, s) =>
      (s.total_sleep_duration || 0) > (best.total_sleep_duration || 0) ? s : best
    , pool[0]);
    result.hours    = Math.round((main.total_sleep_duration  || 0) / 360) / 10;
    result.hrv      = Math.round(main.average_hrv            || 0) || null;
    result.deepMins = Math.round((main.deep_sleep_duration   || 0) / 60);
    result.remMins  = Math.round((main.rem_sleep_duration    || 0) / 60);
    result.efficiency   = main.efficiency           || null;
    result.restingHR    = Math.round(main.average_heart_rate || 0) || null;
    // Fallback score if daily_sleep didn't return one
    if (!result.score) result.score = main.score || null;
  }

  // Steps + active cals from daily_activity
  if (activityRes?.data?.length) {
    const act = activityRes.data[0];
    result.steps          = act.steps           || 0;
    result.activeCalories = act.active_calories || 0;
    result.activityScore  = act.score           || null;
  }

  // Readiness score
  if (readinessRes?.data?.length) {
    result.readinessScore = readinessRes.data[0].score || null;
  }

  return Object.keys(result).length ? result : null;
}

// Batch-fetch last N days of Oura data in one API call per endpoint
async function syncOuraHistory(days = 14) {
  const endDate = today();
  const startD = new Date();
  startD.setDate(startD.getDate() - (days - 1));
  const startDate = localDateStr(startD);

  const [dailySleepRes, sleepRes, activityRes, readinessRes] = await Promise.all([
    fetchOura("daily_sleep",    { start_date: startDate, end_date: endDate }),
    fetchOura("sleep",          { start_date: startDate, end_date: endDate }),
    fetchOura("daily_activity", { start_date: startDate, end_date: endDate }),
    fetchOura("daily_readiness",{ start_date: startDate, end_date: endDate }),
  ]);

  const byDate = {};

  if (dailySleepRes?.data) {
    for (const item of dailySleepRes.data) {
      const d = item.day;
      if (!byDate[d]) byDate[d] = {};
      if (item.score) byDate[d].score = item.score;
    }
  }

  if (sleepRes?.data) {
    const sessionsByDay = {};
    for (const s of sleepRes.data) {
      const d = s.day;
      if (!sessionsByDay[d]) sessionsByDay[d] = [];
      sessionsByDay[d].push(s);
    }
    for (const [d, sessions] of Object.entries(sessionsByDay)) {
      const filtered = sessions.filter(s => s.type !== "rest" && s.type !== "late_nap");
      const pool = filtered.length ? filtered : sessions;
      const main = pool.reduce((best, s) =>
        (s.total_sleep_duration || 0) > (best.total_sleep_duration || 0) ? s : best
      , pool[0]);
      if (!byDate[d]) byDate[d] = {};
      byDate[d].hours      = Math.round((main.total_sleep_duration  || 0) / 360) / 10;
      byDate[d].hrv        = Math.round(main.average_hrv            || 0) || null;
      byDate[d].deepMins   = Math.round((main.deep_sleep_duration   || 0) / 60);
      byDate[d].remMins    = Math.round((main.rem_sleep_duration    || 0) / 60);
      byDate[d].efficiency = main.efficiency                        || null;
      byDate[d].restingHR  = Math.round(main.average_heart_rate    || 0) || null;
      if (!byDate[d].score) byDate[d].score = main.score           || null;
    }
  }

  if (activityRes?.data) {
    for (const act of activityRes.data) {
      const d = act.day;
      if (!byDate[d]) byDate[d] = {};
      byDate[d].steps          = act.steps           || 0;
      byDate[d].activeCalories = act.active_calories || 0;
      byDate[d].activityScore  = act.score           || null;
    }
  }

  if (readinessRes?.data) {
    for (const r of readinessRes.data) {
      const d = r.day;
      if (!byDate[d]) byDate[d] = {};
      byDate[d].readinessScore = r.score || null;
    }
  }

  return byDate; // { "2026-04-01": { score, hours, steps, ... }, ... }
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
  const endAtRef = useRef(Date.now() + seconds * 1000);
  const [remaining, setRemaining] = useState(seconds);
  const intervalRef = useRef(null);
  const firedRef = useRef(false);

  // Notify SW to cancel timer on unmount
  const cancelSWTimer = () => {
    navigator.serviceWorker?.ready.then(reg => {
      reg.active?.postMessage({ type: "cancelTimer" });
    }).catch(() => {});
  };

  // Fire alarm once — wall-clock safe
  const fire = useCallback(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    clearInterval(intervalRef.current);
    cancelSWTimer();
    playAlarm();
    setTimeout(onDone, 800);
  }, [onDone]);

  useEffect(() => {
    // Schedule SW notification (fires even if JS is paused in background)
    const delay = endAtRef.current - Date.now();
    if (delay > 0) {
      navigator.serviceWorker?.ready.then(reg => {
        reg.active?.postMessage({
          type: "scheduleTimer",
          delay,
          title: "Rest over — next set!",
          body: "Time to get back to it.",
        });
      }).catch(() => {});
    }

    // Wall-clock interval — ticks every 500ms so it self-corrects after backgrounding
    intervalRef.current = setInterval(() => {
      const rem = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(rem);
      if (rem > 0 && rem <= 10) haptic.tick();
      if (rem === 0) fire();
    }, 500);

    // visibilitychange — immediately catches an expired timer when you switch back
    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      const rem = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(rem);
      if (rem === 0) fire();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisible);
      cancelSWTimer();
    };
  }, [fire]);

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

// ─── NAV ICONS (SVG) ─────────────────────────────────────────────────────────
const IcoHome = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <path d="M12 3.5L4 9.5V21h5.5v-5.5h5V21H20V9.5L12 3.5z" fill={active ? "#ffffff" : "#6a6a6a"} />
    {active && <path d="M12 3.5L4 9.5V21h5.5v-5.5h5V21H20V9.5L12 3.5z" fill="#ffffff" opacity="0.15" />}
  </svg>
);
const IcoTrain = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="11" width="4" height="2" rx="1" fill={active ? "#ffffff" : "#6a6a6a"} />
    <rect x="18" y="11" width="4" height="2" rx="1" fill={active ? "#ffffff" : "#6a6a6a"} />
    <rect x="6" y="8" width="12" height="8" rx="2" fill={active ? "#ffffff" : "#6a6a6a"} />
    <rect x="9" y="5" width="2" height="4" rx="1" fill={active ? "#ffffff" : "#6a6a6a"} />
    <rect x="13" y="5" width="2" height="4" rx="1" fill={active ? "#ffffff" : "#6a6a6a"} />
    <rect x="9" y="15" width="2" height="4" rx="1" fill={active ? "#ffffff" : "#6a6a6a"} />
    <rect x="13" y="15" width="2" height="4" rx="1" fill={active ? "#ffffff" : "#6a6a6a"} />
  </svg>
);
const IcoLibrary = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="2" height="16" rx="1" fill={active ? "#ffffff" : "#6a6a6a"} />
    <rect x="7" y="6" width="2" height="14" rx="1" fill={active ? "#ffffff" : "#6a6a6a"} />
    <rect x="11" y="4" width="10" height="3" rx="1.5" fill={active ? "#ffffff" : "#6a6a6a"} />
    <rect x="11" y="9" width="10" height="3" rx="1.5" fill={active ? "#ffffff" : "#6a6a6a"} />
    <rect x="11" y="14" width="10" height="3" rx="1.5" fill={active ? "#ffffff" : "#6a6a6a"} />
    <rect x="11" y="19" width="10" height="1" rx="0.5" fill={active ? "#ffffff" : "#6a6a6a"} />
  </svg>
);
const IcoStats = ({ active }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="14" width="4" height="7" rx="1" fill={active ? "#ffffff" : "#6a6a6a"} />
    <rect x="10" y="9" width="4" height="12" rx="1" fill={active ? "#ffffff" : "#6a6a6a"} />
    <rect x="17" y="4" width="4" height="17" rx="1" fill={active ? "#ffffff" : "#6a6a6a"} />
  </svg>
);

// ─── WORKOUT COVER ART ────────────────────────────────────────────────────────
// ─── PROGRAM DEFINITIONS ──────────────────────────────────────────────────────
const PROGRAMS = {
  B0475: {
    id: "B0475",
    name: "B0475",
    tagline: "7-Week Aesthetic Cut · PPL×2",
    workoutKeys: ["D1", "D2", "D3"],
    gradient: "linear-gradient(145deg, #04111f 0%, #062444 45%, #0a3a6e 100%)",
    accent: "#4a9eff",
    coverType: "boat",
    timeline: { start: PLAN.startDate, end: PLAN.targetDate },
    goals: [`${PLAN.targetWeight}lb at ${PLAN.targetBF}% BF`, "Visible abs, adonis belt, serratus", "Capped lateral delts, bicep veins, chest separation"],
  },
  GLOW: {
    id: "GLOW",
    name: "Immediate Glow Up",
    tagline: "Aesthetic Hypertrophy Focus",
    workoutKeys: [],
    gradient: "linear-gradient(145deg, #1a0a00 0%, #4a2000 45%, #8a4400 100%)",
    accent: "#ffa42b",
    coverType: "glow",
    timeline: null,
    goals: ["Coming soon"],
  },
};

// ─── COVER ART SVGs ───────────────────────────────────────────────────────────
function CoverArt({ type, size = 80 }) {
  const s = size;
  if (type === "boat") return (
    <svg viewBox="0 0 100 90" width={s} height={s * 0.9} fill="none">
      {/* Water */}
      <path d="M8 74 Q20 69 32 74 Q44 79 56 74 Q68 69 80 74 Q88 77 92 74" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <path d="M4 80 Q18 75 32 80 Q46 85 60 80 Q74 75 88 80" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      {/* Hull */}
      <path d="M22 64 Q50 74 78 64 L72 70 Q50 80 28 70Z" fill="rgba(255,255,255,0.85)" />
      {/* Hull keel line */}
      <line x1="50" y1="74" x2="50" y2="70" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      {/* Mast */}
      <line x1="50" y1="8" x2="50" y2="65" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Main sail */}
      <path d="M50 12 L50 63 L24 63Z" fill="rgba(255,255,255,0.92)" />
      {/* Jib sail */}
      <path d="M50 24 L50 63 L72 58Z" fill="rgba(255,255,255,0.55)" />
      {/* Boom */}
      <line x1="50" y1="63" x2="74" y2="60" stroke="rgba(255,255,255,0.45)" strokeWidth="1.2" strokeLinecap="round" />
      {/* Mast head flag */}
      <path d="M50 8 L58 12 L50 16Z" fill="rgba(255,255,255,0.7)" />
      {/* Rigging */}
      <line x1="50" y1="10" x2="24" y2="63" stroke="rgba(255,255,255,0.2)" strokeWidth="0.8" />
      <line x1="50" y1="10" x2="72" y2="58" stroke="rgba(255,255,255,0.15)" strokeWidth="0.8" />
    </svg>
  );
  if (type === "glow") return (
    <svg viewBox="0 0 100 100" width={s} height={s} fill="none">
      {/* Central star burst */}
      {[0,30,60,90,120,150,180,210,240,270,300,330].map((deg, i) => (
        <line key={i} x1="50" y1="50"
          x2={50 + Math.cos(deg*Math.PI/180) * (i%2===0 ? 36 : 22)}
          y2={50 + Math.sin(deg*Math.PI/180) * (i%2===0 ? 36 : 22)}
          stroke="rgba(255,255,255,0.6)" strokeWidth={i%2===0 ? 1.5 : 0.8} strokeLinecap="round" />
      ))}
      {/* Inner glow ring */}
      <circle cx="50" cy="50" r="14" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" />
      {/* Center dot */}
      <circle cx="50" cy="50" r="5" fill="rgba(255,255,255,0.9)" />
      {/* Outer sparkles */}
      {[[15,20],[82,18],[88,75],[12,78],[50,8],[90,45],[50,92],[10,45]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r={1.5} fill="rgba(255,255,255,0.5)" />
      ))}
    </svg>
  );
  if (type === "push") return (
    <svg viewBox="0 0 100 100" width={s} height={s} fill="none">
      {/* Lightning bolt */}
      <path d="M58 8 L32 52 L48 52 L42 92 L68 48 L52 48Z" fill="rgba(255,255,255,0.88)" />
      {/* Glow halos */}
      <path d="M58 8 L32 52 L48 52 L42 92 L68 48 L52 48Z" fill="rgba(255,255,255,0.15)" transform="scale(1.15) translate(-7,-7)" />
      {/* Speed lines */}
      <line x1="10" y1="30" x2="26" y2="30" stroke="rgba(255,255,255,0.3)" strokeWidth="2" strokeLinecap="round" />
      <line x1="6" y1="42" x2="26" y2="42" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="12" y1="54" x2="28" y2="54" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
  if (type === "pull") return (
    <svg viewBox="0 0 100 100" width={s} height={s} fill="none">
      {/* Concentric arcs - sonar/radar style */}
      {[42, 30, 20, 12].map((r, i) => (
        <path key={i} d={`M${50-r} 50 A${r} ${r} 0 0 1 ${50+r} 50`}
          stroke="rgba(255,255,255,0.9)" strokeWidth={i===0 ? 2 : 1.5}
          fill="none" opacity={0.9 - i*0.18} strokeLinecap="round" />
      ))}
      {/* Vertical axis line */}
      <line x1="50" y1="8" x2="50" y2="50" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      {/* Horizontal base */}
      <line x1="8" y1="50" x2="92" y2="50" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
      {/* Cross-hair dot */}
      <circle cx="50" cy="50" r="3.5" fill="rgba(255,255,255,0.9)" />
      {/* Signal dots */}
      <circle cx="20" cy="32" r="2" fill="rgba(255,255,255,0.5)" />
      <circle cx="74" cy="28" r="2.5" fill="rgba(255,255,255,0.7)" />
      <circle cx="82" cy="50" r="1.5" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
  if (type === "legs") return (
    <svg viewBox="0 0 100 100" width={s} height={s} fill="none">
      {/* Faceted mountain / prism */}
      <path d="M50 10 L80 75 L20 75Z" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.6)" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M50 10 L80 75 L65 75 L50 40Z" fill="rgba(255,255,255,0.35)" />
      <path d="M50 10 L20 75 L35 75 L50 40Z" fill="rgba(255,255,255,0.15)" />
      {/* Secondary smaller peak */}
      <path d="M72 40 L90 75 L54 75Z" fill="rgba(255,255,255,0.1)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" strokeLinejoin="round" />
      {/* Ground line */}
      <line x1="10" y1="75" x2="90" y2="75" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
      {/* Snow cap */}
      <path d="M50 10 L42 28 L50 24 L58 28Z" fill="rgba(255,255,255,0.85)" />
    </svg>
  );
  return null;
}

// ─── WORKOUT COVERS (per day) ─────────────────────────────────────────────────
const COVERS = {
  D1: {
    gradient: "linear-gradient(145deg, #2d0505 0%, #6b0f0f 35%, #c41a1a 100%)",
    label: "PUSH", accent: "#e84040", coverType: "push",
  },
  D2: {
    gradient: "linear-gradient(145deg, #020d1a 0%, #063360 40%, #0a5a99 100%)",
    label: "PULL", accent: "#3a8fff", coverType: "pull",
  },
  D3: {
    gradient: "linear-gradient(145deg, #1a0f00 0%, #5a3500 40%, #9a6500 100%)",
    label: "LEGS", accent: "#d4880a", coverType: "legs",
  },
};

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("home");
  const [trainDay, setTrainDay] = useState(null); // lifted so Library can navigate to Train
  const [logs, setLogs] = useState(() => store.get("logs") || {});
  const [nutrition, setNutrition] = useState(() => store.get("nutrition") || {});
  const [sleep, setSleep] = useState(() => store.get("sleep") || {});
  const [bodyweight, setBodyweight] = useState(() => store.get("bodyweight") || {});
  const [apiKey, setApiKey] = useState(getApiKey());
  const [ouraConnected, setOuraConnected] = useState(isOuraConnected());
  const [showSettings, setShowSettings] = useState(!getApiKey());
  const [ouraPATInput, setOuraPATInput] = useState("");

  // Register service worker + request notification permission on mount
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Auto-sync Oura on mount: full 14-day history if connected
  useEffect(() => {
    if (!isOuraConnected()) return;
    const hour = new Date().getHours();
    if (hour < 6) return;
    syncOuraHistory(14).then(byDate => {
      if (!byDate || !Object.keys(byDate).length) return;
      setSleep(prev => {
        const next = { ...prev };
        for (const [d, data] of Object.entries(byDate)) {
          if (Object.keys(data).length) {
            next[d] = { ...(prev[d] || {}), ...data };
          }
        }
        store.set("sleep", next);
        return next;
      });
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  const saveSleepAll = useCallback((byDate) => {
    setSleep(prev => {
      const next = { ...prev };
      for (const [d, data] of Object.entries(byDate)) {
        if (Object.keys(data).length) next[d] = { ...(prev[d] || {}), ...data };
      }
      store.set("sleep", next);
      return next;
    });
  }, []);

  const saveBW = useCallback((date, val) => {
    const next = { ...bodyweight, [date]: val };
    setBodyweight(next);
    store.set("bodyweight", next);
  }, [bodyweight]);

  const saveApiKey = (k) => {
    setApiKey(k);
    localStorage.setItem("banjo_api_key", k);
  };

  // Navigate to Train tab with a pre-selected program day
  const goTrain = (day) => {
    setTrainDay(day);
    setTab("train");
  };

  const NAV = [
    { id: "home",    label: "Home",    Icon: IcoHome },
    { id: "train",   label: "Train",   Icon: IcoTrain },
    { id: "library", label: "Library", Icon: IcoLibrary },
    { id: "stats",   label: "Stats",   Icon: IcoStats },
  ];

  return (
    <div style={{ background: "#121212", minHeight: "100vh", color: "#ffffff", fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 400, maxWidth: 480, margin: "0 auto" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        input, textarea, select { background: #2a2a2a; border: none; color: #ffffff; border-radius: 8px; font-family: inherit; font-size: 15px; padding: 10px 12px; width: 100%; outline: none; -webkit-appearance: none; box-shadow: rgb(18,18,18) 0px 1px 0px, rgb(90,90,90) 0px 0px 0px 1px inset; }
        input:focus, textarea:focus, select:focus { box-shadow: rgb(18,18,18) 0px 1px 0px, rgb(200,240,96) 0px 0px 0px 2px inset; }
        button { cursor: pointer; border: none; outline: none; font-family: inherit; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 0; height: 0; }
        .fade-in { animation: fadeIn 0.22s ease; }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:translateY(0)} }
        .shimmer { animation: pulse 1.2s ease-in-out infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        input[type=number]::-webkit-inner-spin-button { opacity: 0.4; }
        .set-circle-done { animation: circlePop 0.3s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes circlePop { 0%{transform:scale(0.85)} 60%{transform:scale(1.08)} 100%{transform:scale(1)} }
        .sp-card:hover { background: #282828 !important; }
        .sp-pill-active { background: #ffffff !important; color: #000000 !important; }
      `}</style>

      {/* SETTINGS DRAWER */}
      {showSettings && (
        <div className="fade-in" style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) setShowSettings(false); }}>
          <div style={{ background: "#181818", borderRadius: "20px 20px 0 0", padding: "20px 20px 48px", width: "100%", maxWidth: 480, margin: "0 auto", boxShadow: "rgba(0,0,0,0.5) 0px -8px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <span style={{ fontWeight: 700, fontSize: 18 }}>Settings</span>
              <button onClick={() => setShowSettings(false)} style={{ background: "#2a2a2a", color: "#b3b3b3", borderRadius: "50%", width: 32, height: 32, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
            </div>
            <div style={{ fontSize: 11, color: "#b3b3b3", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Anthropic API Key</div>
            <input type="password" placeholder="sk-ant-..." value={apiKey} onChange={e => saveApiKey(e.target.value)} style={{ marginBottom: 16, fontSize: 13 }} />
            <div style={{ fontSize: 11, color: "#b3b3b3", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 6 }}>Oura Ring</div>
            {ouraConnected ? (
              <div style={{ background: "#1a2a1a", borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#1ed760" }} />
                    <span style={{ fontSize: 13, color: "#1ed760", fontWeight: 700 }}>Connected</span>
                  </div>
                  <button onClick={() => { disconnectOura(); setOuraConnected(false); setOuraPATInput(""); }} style={{ background: "none", color: "#b3b3b3", fontSize: 12 }}>Disconnect</button>
                </div>
                <div style={{ fontSize: 11, color: "#6a6a6a", letterSpacing: 0.2 }}>Auto-syncs sleep, activity & readiness each morning after 6 AM</div>
              </div>
            ) : (
              <div>
                <input
                  type="password"
                  placeholder="Paste your Personal Access Token..."
                  value={ouraPATInput}
                  onChange={e => setOuraPATInput(e.target.value)}
                  style={{ marginBottom: 8, fontSize: 13 }}
                />
                <button
                  onClick={() => {
                    const pat = ouraPATInput.trim();
                    if (!pat) return;
                    saveOuraPAT(pat);
                    setOuraConnected(true);
                    setOuraPATInput("");
                  }}
                  style={{ width: "100%", background: "#1a2a1a", borderRadius: 12, padding: "13px", color: "#1ed760", fontSize: 13, fontWeight: 700 }}
                >
                  Save Token →
                </button>
                <div style={{ fontSize: 11, color: "#6a6a6a", marginTop: 8, letterSpacing: 0.2 }}>
                  Get your token at cloud.ouraring.com → Personal Access Tokens
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONTENT */}
      <div style={{ paddingBottom: 80 }}>
        {tab === "home"    && <HomeTab logs={logs} nutrition={nutrition} sleep={sleep} bodyweight={bodyweight} saveBW={saveBW} saveSleep={saveSleep} saveSleepAll={saveSleepAll} saveNutrition={saveNutrition} goTrain={goTrain} onSettings={() => setShowSettings(true)} />}
        {tab === "train"   && <WorkoutTab logs={logs} saveLog={saveLog} initialDay={trainDay} />}
        {tab === "library" && <LibraryTab logs={logs} goTrain={goTrain} />}
        {tab === "stats"   && <ProgressTab logs={logs} nutrition={nutrition} sleep={sleep} bodyweight={bodyweight} />}
      </div>

      {/* BOTTOM NAV — Spotify style */}
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(18,18,18,0.97)", borderTop: "1px solid #282828", display: "flex", zIndex: 100, backdropFilter: "blur(20px)", paddingBottom: "env(safe-area-inset-bottom)" }}>
        {NAV.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1, padding: "10px 0 8px",
              background: "none",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
              color: tab === id ? "#ffffff" : "#6a6a6a",
              transition: "color 0.15s",
            }}
          >
            <Icon active={tab === id} />
            <span style={{ fontSize: 10, fontWeight: tab === id ? 700 : 400, letterSpacing: 0.2 }}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── HOME TAB ─────────────────────────────────────────────────────────────────
function HomeTab({ logs, nutrition, sleep, bodyweight, saveBW, saveSleep, saveSleepAll, saveNutrition, goTrain, onSettings }) {
  const d = today();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const todayWorkout = getDefaultWorkout();
  const todayCover = COVERS[todayWorkout];
  const workout = PLAN.workouts[todayWorkout];
  const todayNutrition = nutrition[d] || {};
  const calTarget = todayNutrition.drinkDay ? DRINK_DAY_MACROS.calories : PLAN.dailyCalories;
  const proTarget = todayNutrition.drinkDay ? DRINK_DAY_MACROS.protein : PLAN.dailyProtein;
  const phase = currentPhase();
  const days = daysUntil(PLAN.targetDate);
  const todaySleep = sleep[d] || {};

  // Today's workout progress — check ALL workout keys for today, not just default
  const todayLoggedKey = Object.keys(PLAN.workouts).find(k => {
    const dat = logs[d]?.[k];
    return dat && Object.values(dat).some(ex => Array.isArray(ex?.sets) && ex.sets.some(s => s.weight || s.reps || s.done));
  });
  const todayLog = todayLoggedKey ? logs[d]?.[todayLoggedKey] : logs[d]?.[todayWorkout];
  const actualWorkoutToday = todayLoggedKey ? PLAN.workouts[todayLoggedKey] : workout;
  const actualCoverToday = todayLoggedKey ? COVERS[todayLoggedKey] : todayCover;
  const totalSetsToday = todayLog
    ? Object.values(todayLog).reduce((s, ex) => s + (Array.isArray(ex?.sets) ? ex.sets.length : 0), 0) : 0;
  const doneSetsToday = todayLog
    ? Object.values(todayLog).reduce((s, ex) => s + (Array.isArray(ex?.sets) ? ex.sets.filter(set => set.done).length : 0), 0) : 0;
  const workoutStarted = totalSetsToday > 0;
  const workoutDone = workoutStarted && doneSetsToday === totalSetsToday;

  // Bodyweight entries sorted
  const bwEntries = Object.entries(bodyweight).sort((a, b) => a[0].localeCompare(b[0]));
  const lastBW = bwEntries.length > 0 ? bwEntries[bwEntries.length - 1] : null;

  // Weight pace calculation
  const startW = 143; // user's starting weight
  const startDate = new Date(PLAN.startDate + "T12:00:00");
  const targetDate2 = new Date(PLAN.targetDate + "T12:00:00");
  const totalDays = Math.round((targetDate2 - startDate) / 86400000);
  const daysElapsed = Math.round((new Date() - startDate) / 86400000);
  const expectedNow = startW - ((startW - PLAN.targetWeight) / totalDays) * daysElapsed;
  const currentW = lastBW ? parseFloat(lastBW[1]) : null;
  const paceDelta = currentW !== null ? currentW - expectedNow : null; // positive = heavier than expected
  const paceOk = paceDelta !== null && paceDelta <= 0.5;

  // Weekly training adherence (Mon–Sun)
  const expectedByDow = { 1: "D1", 2: "D2", 3: "D3", 4: "D1", 5: "D2", 6: "D3", 0: null };
  const now2 = new Date();
  const dow = now2.getDay();
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(now2.getFullYear(), now2.getMonth(), now2.getDate() + mondayOffset);
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i);
    const dateStr = localDateStr(day);
    const dayDow = day.getDay();
    const expected = expectedByDow[dayDow];
    const loggedKey = Object.keys(PLAN.workouts).find(k => {
      const dat = logs[dateStr]?.[k];
      return dat && Object.values(dat).some(ex => Array.isArray(ex?.sets) && ex.sets.some(s => s.weight || s.reps || s.done));
    });
    const isToday2 = dateStr === d;
    const isPast = day < new Date(now2.getFullYear(), now2.getMonth(), now2.getDate());
    return { dateStr, dayDow, expected, loggedKey, isToday2, isPast, dayNum: day.getDate() };
  });

  // Weight sparkline data (last 10 entries)
  const sparkEntries = bwEntries.slice(-10);

  // Inline food log state
  const [showFood, setShowFood] = useState(false);
  const [foodForm, setFoodForm] = useState({ calories: "", protein: "" });
  const addMeals = () => {
    if (!foodForm.calories && !foodForm.protein) return;
    const prev = nutrition[d] || {};
    saveNutrition(d, { calories: (prev.calories || 0) + (parseInt(foodForm.calories) || 0), protein: (prev.protein || 0) + (parseInt(foodForm.protein) || 0), drinkDay: prev.drinkDay || false });
    setFoodForm({ calories: "", protein: "" });
    setShowFood(false);
  };

  const calPct = Math.min(100, ((todayNutrition.calories || 0) / calTarget) * 100);
  const proPct = Math.min(100, ((todayNutrition.protein || 0) / proTarget) * 100);
  const calColor = calPct >= 90 ? "#1ed760" : calPct >= 60 ? "#ffa42b" : "#b3b3b3";
  const proColor = proPct >= 90 ? "#1ed760" : proPct >= 60 ? "#ffa42b" : "#f3727f";

  return (
    <div className="fade-in" style={{ paddingBottom: 16 }}>

      {/* ── TOP BAR — respects Dynamic Island / notch safe area ────── */}
      <div style={{ padding: "max(52px, calc(env(safe-area-inset-top) + 12px)) 16px 14px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 12, color: "#6a6a6a", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>{greeting}</div>
            <div style={{ fontSize: 26, fontWeight: 700, lineHeight: 1.1 }}>Banjo</div>
            <div style={{ fontSize: 12, color: "#b3b3b3", marginTop: 3 }}>Wk {weekNum()} · {phase.name} · {days}d to May 15</div>
          </div>
          <button onClick={onSettings} style={{ background: "#1f1f1f", borderRadius: "50%", width: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#b3b3b3", flexShrink: 0, marginTop: 4 }}>⚙</button>
        </div>
      </div>

      {/* ── TODAY CARD ───────────────────────────────────────────────── */}
      <div style={{ margin: "0 16px 12px", background: "#181818", borderRadius: 16, overflow: "hidden", boxShadow: "rgba(0,0,0,0.3) 0px 8px 16px" }}>

        {/* Training row */}
        <button onClick={() => goTrain(todayLoggedKey || todayWorkout)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 14px 12px", textAlign: "left", borderBottom: "1px solid #212121" }}>
          <div style={{ width: 46, height: 46, borderRadius: 8, flexShrink: 0, background: actualCoverToday.gradient, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <CoverArt type={actualCoverToday.coverType} size={42} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
              <span style={{ fontWeight: 700, fontSize: 14 }}>{actualWorkoutToday.name}</span>
              <span style={{ fontSize: 10, color: "#6a6a6a" }}>{actualWorkoutToday.sub}</span>
            </div>
            {workoutDone && <div style={{ fontSize: 11, color: "#1ed760", fontWeight: 700 }}>✓ Done · {doneSetsToday} sets logged</div>}
            {workoutStarted && !workoutDone && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ flex: 1, height: 3, background: "#282828", borderRadius: 9999 }}>
                  <div style={{ height: "100%", width: `${(doneSetsToday/totalSetsToday)*100}%`, background: actualCoverToday.accent, borderRadius: 9999 }} />
                </div>
                <span style={{ fontSize: 10, color: "#b3b3b3", whiteSpace: "nowrap" }}>{doneSetsToday}/{totalSetsToday}</span>
              </div>
            )}
            {!workoutStarted && <div style={{ fontSize: 11, color: "#6a6a6a" }}>Not logged yet · tap to open</div>}
          </div>
          <div style={{ width: 28, height: 28, borderRadius: "50%", background: workoutDone ? "#1ed76022" : actualCoverToday.accent, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {workoutDone
              ? <span style={{ fontSize: 12, color: "#1ed760" }}>✓</span>
              : <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 1L8.5 5L2 9V1Z" fill="#000" /></svg>
            }
          </div>
        </button>

        {/* Nutrition rows */}
        <div style={{ padding: "12px 14px 0" }}>
          <div style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "#6a6a6a", fontWeight: 700, letterSpacing: 0.5 }}>CALORIES</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: calColor }}>{todayNutrition.calories || 0} <span style={{ color: "#3a3a3a", fontWeight: 400 }}>/ {calTarget}</span></span>
            </div>
            <div style={{ height: 4, background: "#252525", borderRadius: 9999 }}>
              <div style={{ height: "100%", width: `${calPct}%`, background: calColor, borderRadius: 9999, transition: "width 0.4s" }} />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
              <span style={{ fontSize: 11, color: "#6a6a6a", fontWeight: 700, letterSpacing: 0.5 }}>PROTEIN</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: proColor }}>{todayNutrition.protein || 0}g <span style={{ color: "#3a3a3a", fontWeight: 400 }}>/ {proTarget}g</span></span>
            </div>
            <div style={{ height: 4, background: "#252525", borderRadius: 9999 }}>
              <div style={{ height: "100%", width: `${proPct}%`, background: proColor, borderRadius: 9999, transition: "width 0.4s" }} />
            </div>
          </div>
        </div>

        {/* Log buttons row */}
        <div style={{ display: "flex", borderTop: "1px solid #212121" }}>
          <button onClick={() => setShowFood(!showFood)} style={{ flex: 1, padding: "10px", fontSize: 11, fontWeight: 700, color: "#1ed760", letterSpacing: 0.5, borderRight: "1px solid #212121" }}>
            + Log Food
          </button>
          <button
            onClick={() => {
              const v = prompt("Bodyweight (lbs)?");
              if (v && !isNaN(parseFloat(v))) saveBW(d, parseFloat(v));
            }}
            style={{ flex: 1, padding: "10px", fontSize: 11, fontWeight: 700, color: "#b3b3b3", letterSpacing: 0.5 }}
          >
            {lastBW ? `${lastBW[1]}lb · Update` : "+ Log Weight"}
          </button>
        </div>
        {showFood && (
          <div className="fade-in" style={{ padding: "12px 14px 14px", borderTop: "1px solid #212121" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
              <div>
                <div style={{ fontSize: 10, color: "#b3b3b3", marginBottom: 4 }}>Calories</div>
                <input type="number" inputMode="numeric" placeholder="0" value={foodForm.calories} onChange={e => setFoodForm(f => ({...f, calories: e.target.value}))} />
              </div>
              <div>
                <div style={{ fontSize: 10, color: "#b3b3b3", marginBottom: 4 }}>Protein (g)</div>
                <input type="number" inputMode="numeric" placeholder="0" value={foodForm.protein} onChange={e => setFoodForm(f => ({...f, protein: e.target.value}))} />
              </div>
            </div>
            <button onClick={addMeals} style={{ width: "100%", background: "#1ed760", color: "#000", borderRadius: 9999, padding: "10px", fontWeight: 700, fontSize: 13 }}>Add</button>
          </div>
        )}
      </div>

      {/* ── RECOVERY ──────────────────────────────────────────────────── */}
      <div style={{ marginTop: 0, padding: "0 16px 12px" }}>
        <OuraDashboard sleep={sleep} saveSleep={saveSleep} saveSleepAll={saveSleepAll} date={d} />
      </div>

      {/* ── WEIGHT TREND + PACE ───────────────────────────────────────── */}
      <div style={{ margin: "0 16px 12px", background: "#181818", borderRadius: 16, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 11, color: "#6a6a6a", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 3 }}>Body Weight</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
              <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 32, lineHeight: 1, color: "#ffffff" }}>
                {currentW !== null ? currentW : "—"}
              </span>
              <span style={{ fontSize: 12, color: "#b3b3b3" }}>lb</span>
              <span style={{ fontSize: 11, color: "#6a6a6a" }}>→ {PLAN.targetWeight}lb</span>
            </div>
          </div>
          {paceDelta !== null && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: "#6a6a6a", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>Pace</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: paceOk ? "#1ed760" : "#ffa42b" }}>
                {paceOk ? "On track" : `+${paceDelta.toFixed(1)}lb behind`}
              </div>
              <div style={{ fontSize: 10, color: "#6a6a6a" }}>
                target {expectedNow.toFixed(1)}lb
              </div>
            </div>
          )}
        </div>

        {/* SVG sparkline */}
        {sparkEntries.length >= 2 ? (() => {
          const weights = sparkEntries.map(([, w]) => parseFloat(w));
          const dates = sparkEntries.map(([dt]) => dt);
          const allW = [...weights, PLAN.targetWeight, startW];
          const minW = Math.min(...allW) - 0.3;
          const maxW = Math.max(...allW) + 0.3;
          const W = 280, H = 56, pL = 2, pR = 2, pT = 6, pB = 6;
          const toX = i => pL + (i / (sparkEntries.length - 1)) * (W - pL - pR);
          const toY = w => pT + (1 - (w - minW) / (maxW - minW)) * (H - pT - pB);
          const actualPath = weights.map((w, i) => `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(w).toFixed(1)}`).join(" ");
          const targetPts = dates.map((dt, i) => {
            const el = Math.round((new Date(dt + "T12:00:00") - startDate) / 86400000);
            const tw = startW - ((startW - PLAN.targetWeight) / totalDays) * Math.max(0, el);
            return `${i === 0 ? "M" : "L"}${toX(i).toFixed(1)},${toY(tw).toFixed(1)}`;
          }).join(" ");
          const dotColor = paceOk ? "#1ed760" : "#ffa42b";
          return (
            <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", display: "block" }} preserveAspectRatio="none">
              <path d={targetPts} stroke="#1ed76030" strokeWidth="1.5" fill="none" strokeDasharray="4 3" />
              <path d={actualPath} stroke={dotColor} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx={toX(weights.length - 1).toFixed(1)} cy={toY(weights[weights.length - 1]).toFixed(1)} r="3.5" fill={dotColor} />
            </svg>
          );
        })() : (
          <div style={{ height: 40, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 11, color: "#3a3a3a" }}>Log weight to see trend</span>
          </div>
        )}
      </div>

      {/* ── THIS WEEK ─────────────────────────────────────────────────── */}
      <div style={{ margin: "0 16px 12px", background: "#181818", borderRadius: 16, padding: "14px 14px" }}>
        <div style={{ fontSize: 11, color: "#6a6a6a", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>This Week</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
          {weekDays.map(({ dayDow, dayNum, expected, loggedKey, isToday2, isPast }) => {
            const cover = loggedKey ? COVERS[loggedKey] : (expected ? COVERS[expected] : null);
            const done = !!loggedKey;
            const isRest = !expected;
            const missed = isPast && !isRest && !done && !isToday2;
            return (
              <div key={dayDow} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                <span style={{ fontSize: 9, fontWeight: 700, color: isToday2 ? "#ffffff" : "#3a3a3a", fontFamily: "'DM Mono', monospace" }}>
                  {["S","M","T","W","T","F","S"][dayDow]}
                </span>
                <div style={{
                  width: 34, height: 34, borderRadius: 9,
                  background: done ? `${cover?.accent}22` : isToday2 ? "#282828" : "transparent",
                  border: done ? `1px solid ${cover?.accent}55` : isToday2 ? "1px solid #444" : missed ? "1px solid #2a1a1a" : "1px solid #1a1a1a",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                  transition: "all 0.15s",
                }}>
                  <span style={{ fontSize: 11, fontWeight: isToday2 ? 700 : 400, color: done ? cover?.accent : missed ? "#3a2020" : isToday2 ? "#ffffff" : "#3a3a3a" }}>
                    {dayNum}
                  </span>
                  {done && <div style={{ width: 4, height: 4, borderRadius: "50%", background: cover?.accent }} />}
                  {missed && <div style={{ width: 4, height: 4, borderRadius: "50%", background: "#3a2020" }} />}
                </div>
                <span style={{ fontSize: 8, color: done ? cover?.accent : isRest ? "#2a2a2a" : "#2a2a2a", fontFamily: "'DM Mono', monospace", fontWeight: 700, letterSpacing: 0.3 }}>
                  {done ? PLAN.workouts[loggedKey]?.name?.slice(0,3) : isRest ? "REST" : expected ? PLAN.workouts[expected]?.name?.slice(0,3) : ""}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── PHASE PROGRESS ──────────────────────────────────────────── */}
      <div style={{ margin: "0 16px 12px", background: "#181818", borderRadius: 16, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13 }}>{phase.name}</div>
            <div style={{ fontSize: 11, color: "#b3b3b3" }}>Week {weekNum()} · {days} days remaining</div>
          </div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: phase.color, lineHeight: 1 }}>{days}</div>
        </div>
        <div style={{ height: 4, background: "#252525", borderRadius: 9999 }}>
          <div style={{ height: "100%", width: `${Math.max(0, Math.min(100, 100 - (days / 49) * 100))}%`, background: phase.color, borderRadius: 9999, transition: "width 0.4s" }} />
        </div>
        <div style={{ fontSize: 10, color: "#6a6a6a", marginTop: 6 }}>{PLAN.targetWeight}lb at {PLAN.targetBF}% BF · May 15</div>
      </div>

      {/* ── WORKOUT CALENDAR ──────────────────────────────────────────── */}
      <div style={{ margin: "0 16px 12px" }}>
        <div style={{ fontSize: 11, color: "#6a6a6a", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10, paddingLeft: 2 }}>This Month</div>
        <WorkoutCalendar logs={logs} />
      </div>

    </div>
  );
}

// ─── OURA DASHBOARD ───────────────────────────────────────────────────────────
function OuraDashboard({ sleep, saveSleep, saveSleepAll, date }) {
  const [syncing, setSyncing] = useState(false);
  const [showDrill, setShowDrill] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const ouraOn = isOuraConnected();

  const scoreColor = (s) => !s ? "#3a3a3a" : s >= 85 ? "#1ed760" : s >= 70 ? "#ffa42b" : "#f3727f";

  // Compact card shows YESTERDAY — sleep is last night, steps are yesterday's complete count
  const ystD = (() => { const d2 = new Date(); d2.setDate(d2.getDate() - 1); return localDateStr(d2); })();
  const yst = sleep[ystD] || {};
  const tod = sleep[date] || {};
  // Use yesterday for compact display; fall back to today if yesterday has no data
  const cardData = (yst.hours > 0 || yst.score > 0 || yst.steps > 0) ? yst : tod;
  const cardDate = cardData === yst ? ystD : date;
  const hasCardData = (cardData.hours > 0) || (cardData.score > 0) || (cardData.steps > 0);

  // Full history sync (14 days)
  const doSyncHistory = async () => {
    if (!ouraOn) return;
    setSyncing(true);
    try {
      const byDate = await syncOuraHistory(14);
      if (byDate && Object.keys(byDate).length) saveSleepAll(byDate);
    } catch {}
    setSyncing(false);
  };

  // Last 14 days for history
  const last14 = Array.from({ length: 14 }, (_, i) => {
    const d2 = new Date();
    d2.setDate(d2.getDate() - 13 + i);
    const ds = localDateStr(d2);
    return { ds, data: sleep[ds] || {}, isToday: ds === date, dayLabel: ["Su","Mo","Tu","We","Th","Fr","Sa"][d2.getDay()] };
  });

  const sleepScore = cardData.score;
  const steps = cardData.steps;
  const miles = steps ? (steps / 2000).toFixed(1) : null;

  if (!ouraOn && !hasCardData) return (
    <>
      <div style={{ background: "#181818", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 13 }}>Recovery & Activity</div>
          <div style={{ fontSize: 11, color: "#6a6a6a", marginTop: 2 }}>No Oura — log manually</div>
        </div>
        <button onClick={() => setShowManual(true)} style={{ background: "#282828", borderRadius: 9999, padding: "7px 14px", fontSize: 11, fontWeight: 700, color: "#ffffff" }}>Log</button>
      </div>
      {showManual && <ManualSleepSheet tod={tod} date={date} saveSleep={saveSleep} onClose={() => setShowManual(false)} />}
    </>
  );

  return (
    <>
      {/* ── COMPACT CARD ─────────────────────────────────────────────── */}
      <button
        onClick={() => setShowDrill(true)}
        style={{ width: "100%", background: "#181818", borderRadius: 16, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, textAlign: "left" }}
      >
        {/* Sleep score ring */}
        <div style={{ width: 54, height: 54, position: "relative", flexShrink: 0 }}>
          <svg width="54" height="54" style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }}>
            <circle cx="27" cy="27" r="23" fill="none" stroke="#252525" strokeWidth="3.5" />
            {sleepScore && (
              <circle cx="27" cy="27" r="23" fill="none" stroke={scoreColor(sleepScore)} strokeWidth="3.5" strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 23}`}
                strokeDashoffset={`${2 * Math.PI * 23 * (1 - sleepScore / 100)}`}
                style={{ transition: "stroke-dashoffset 0.6s ease" }}
              />
            )}
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            {sleepScore ? (
              <>
                <span style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 17, color: "#ffffff", lineHeight: 1 }}>{sleepScore}</span>
                <span style={{ fontSize: 7, color: "#6a6a6a", fontWeight: 700, letterSpacing: 0.5 }}>SLEEP</span>
              </>
            ) : (
              <span style={{ fontSize: 20 }}>🌙</span>
            )}
          </div>
        </div>

        {/* Metrics: sleep hours + steps/miles */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6 }}>Last Night</div>
          <div style={{ display: "flex", gap: 14 }}>
            {/* Sleep */}
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: sleepScore ? scoreColor(sleepScore) : "#ffffff", lineHeight: 1 }}>
                {cardData.hours > 0 ? `${cardData.hours}h` : "—"}
              </div>
              <div style={{ fontSize: 9, color: "#6a6a6a", fontWeight: 700, letterSpacing: 0.5, marginTop: 1 }}>SLEEP</div>
            </div>
            {/* Divider */}
            <div style={{ width: 1, background: "#252525", alignSelf: "stretch" }} />
            {/* Steps + miles */}
            <div>
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "#ffffff", lineHeight: 1 }}>
                {steps > 0 ? `${(steps / 1000).toFixed(1)}k` : "—"}
              </div>
              <div style={{ fontSize: 9, color: "#6a6a6a", fontWeight: 700, letterSpacing: 0.5, marginTop: 1 }}>
                {miles ? `${miles} MI` : "STEPS"}
              </div>
            </div>
          </div>
        </div>

        {/* Sync + chevron */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          <button
            onClick={e => { e.stopPropagation(); ouraOn ? doSyncHistory() : setShowManual(true); }}
            style={{ background: syncing ? "#252525" : "#1ed76018", color: syncing ? "#6a6a6a" : "#1ed760", borderRadius: 9999, padding: "4px 10px", fontSize: 10, fontWeight: 700 }}
          >
            {syncing ? "…" : ouraOn ? "Sync" : "Log"}
          </button>
          <svg width="8" height="12" viewBox="0 0 8 12"><path d="M1 1L7 6L1 11" stroke="#3a3a3a" strokeWidth="1.5" strokeLinecap="round" fill="none" /></svg>
        </div>
      </button>

      {/* ── DRILL-DOWN SHEET ──────────────────────────────────────────── */}
      {showDrill && (
        <div
          className="fade-in"
          style={{ position: "fixed", inset: 0, zIndex: 300, background: "rgba(0,0,0,0.92)", display: "flex", flexDirection: "column", justifyContent: "flex-end" }}
          onClick={e => { if (e.target === e.currentTarget) setShowDrill(false); }}
        >
          <div style={{ background: "#121212", borderRadius: "24px 24px 0 0", maxHeight: "92vh", overflowY: "auto", width: "100%", maxWidth: 480, margin: "0 auto", paddingBottom: 48 }}>
            {/* Handle */}
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 6 }}>
              <div style={{ width: 36, height: 4, background: "#282828", borderRadius: 9999 }} />
            </div>

            {/* Sheet header */}
            <div style={{ padding: "8px 20px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 20 }}>Recovery</div>
                <div style={{ fontSize: 11, color: "#6a6a6a", marginTop: 2 }}>
                  {new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {ouraOn && (
                  <button onClick={() => doSyncHistory()} style={{ background: "#1ed76018", color: "#1ed760", borderRadius: 9999, padding: "7px 14px", fontSize: 11, fontWeight: 700 }}>
                    {syncing ? "Syncing…" : "Sync 14d"}
                  </button>
                )}
                <button onClick={() => { setShowDrill(false); setShowManual(true); }} style={{ background: "#282828", color: "#ffffff", borderRadius: 9999, padding: "7px 14px", fontSize: 11, fontWeight: 700 }}>
                  Edit
                </button>
              </div>
            </div>

            {/* Score trilogy — uses cardData (yesterday) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "0 20px 16px" }}>
              {[
                { label: "SLEEP", val: cardData.score, sub: cardData.hours ? `${cardData.hours}h` : null },
                { label: "READINESS", val: cardData.readinessScore, sub: null },
                { label: "ACTIVITY", val: cardData.activityScore, sub: steps ? `${(steps / 1000).toFixed(1)}k steps` : null },
              ].map(({ label, val, sub }) => (
                <div key={label} style={{ background: "#181818", borderRadius: 14, padding: "14px 10px", textAlign: "center" }}>
                  <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 38, color: val ? scoreColor(val) : "#2a2a2a", lineHeight: 1 }}>{val || "—"}</div>
                  <div style={{ fontSize: 8, fontWeight: 700, color: "#6a6a6a", letterSpacing: 1, marginTop: 4 }}>{label}</div>
                  {sub && <div style={{ fontSize: 10, color: "#b3b3b3", marginTop: 3 }}>{sub}</div>}
                </div>
              ))}
            </div>

            {/* Sleep detail grid */}
            {hasCardData && (
              <div style={{ margin: "0 20px 12px", background: "#181818", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, color: "#6a6a6a", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>Sleep Detail</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  {[
                    { label: "Deep", val: cardData.deepMins ? `${cardData.deepMins}m` : "—" },
                    { label: "REM", val: cardData.remMins ? `${cardData.remMins}m` : "—" },
                    { label: "Light", val: (cardData.hours && cardData.deepMins != null && cardData.remMins != null) ? `${Math.max(0, Math.round(cardData.hours * 60 - cardData.deepMins - cardData.remMins))}m` : "—" },
                    { label: "HRV", val: cardData.hrv ? `${cardData.hrv}ms` : "—" },
                    { label: "Resting HR", val: cardData.restingHR ? `${cardData.restingHR}bpm` : "—" },
                    { label: "Efficiency", val: cardData.efficiency ? `${cardData.efficiency}%` : "—" },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#ffffff", lineHeight: 1 }}>{val}</div>
                      <div style={{ fontSize: 9, color: "#6a6a6a", marginTop: 3 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Activity detail */}
            {(steps > 0 || cardData.activeCalories > 0) && (
              <div style={{ margin: "0 20px 12px", background: "#181818", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ fontSize: 10, color: "#6a6a6a", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>Activity</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14 }}>
                  {[
                    { label: "Steps", val: steps ? steps.toLocaleString() : "—" },
                    { label: "Distance", val: miles ? `${miles} mi` : "—" },
                    { label: "Active Cal", val: cardData.activeCalories ? `${cardData.activeCalories}` : "—" },
                  ].map(({ label, val }) => (
                    <div key={label} style={{ textAlign: "center" }}>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: "#ffffff", lineHeight: 1 }}>{val}</div>
                      <div style={{ fontSize: 9, color: "#6a6a6a", marginTop: 3 }}>{label}</div>
                    </div>
                  ))}
                </div>
                {steps > 0 && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ height: 4, background: "#252525", borderRadius: 9999 }}>
                      <div style={{ height: "100%", width: `${Math.min(100, (steps / 8000) * 100)}%`, background: steps >= 8000 ? "#1ed760" : "#ffa42b", borderRadius: 9999, transition: "width 0.4s" }} />
                    </div>
                    <div style={{ fontSize: 9, color: "#6a6a6a", marginTop: 4 }}>{steps >= 8000 ? "Goal met" : `${(8000 - steps).toLocaleString()} steps to 8k goal`}</div>
                  </div>
                )}
              </div>
            )}

            {/* ── 14-DAY HISTORY ──────────────────────────────────────── */}
            <div style={{ padding: "0 20px" }}>
              <div style={{ fontSize: 10, color: "#6a6a6a", fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", marginBottom: 12 }}>14-Day History</div>

              {/* Sleep score bars */}
              <div style={{ background: "#181818", borderRadius: 14, padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "#b3b3b3", fontWeight: 700 }}>Sleep Score</span>
                  {cardData.score ? <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor(cardData.score) }}>{cardData.score} last night</span> : null}
                </div>
                <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 48 }}>
                  {last14.map(({ ds, data, isToday }) => {
                    const s = data.score;
                    const h = s ? Math.max(5, (s / 100) * 44) : 4;
                    return (
                      <div key={ds} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <div style={{ width: "100%", height: h, background: s ? (isToday ? scoreColor(s) : `${scoreColor(s)}55`) : "#252525", borderRadius: "3px 3px 0 0", transition: "height 0.3s" }} />
                        {isToday && <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#ffffff", flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 9, color: "#3a3a3a" }}>{last14[0].dayLabel}</span>
                  <span style={{ fontSize: 9, color: "#3a3a3a" }}>Today</span>
                </div>
              </div>

              {/* Steps bars */}
              <div style={{ background: "#181818", borderRadius: 14, padding: "14px 16px", marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "#b3b3b3", fontWeight: 700 }}>Steps & Distance</span>
                  {steps ? <span style={{ fontSize: 11, fontWeight: 700, color: steps >= 8000 ? "#1ed760" : "#ffa42b" }}>{miles}mi today</span> : null}
                </div>
                <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 48 }}>
                  {last14.map(({ ds, data, isToday }) => {
                    const s = data.steps || 0;
                    const maxS = Math.max(...last14.map(x => x.data.steps || 0), 10000);
                    const h = s ? Math.max(5, (s / maxS) * 44) : 4;
                    const goalMet = s >= 8000;
                    const bar = isToday ? (goalMet ? "#1ed760" : "#ffa42b") : (s ? (goalMet ? "#1ed76055" : "#ffa42b44") : "#252525");
                    return (
                      <div key={ds} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <div style={{ width: "100%", height: s ? h : 4, background: bar, borderRadius: "3px 3px 0 0" }} />
                        {isToday && <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#ffffff", flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 9, color: "#3a3a3a" }}>{last14[0].dayLabel}</span>
                  <span style={{ fontSize: 9, color: "#3a3a3a" }}>Goal: 8k</span>
                </div>
              </div>

              {/* Readiness bars */}
              <div style={{ background: "#181818", borderRadius: 14, padding: "14px 16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontSize: 11, color: "#b3b3b3", fontWeight: 700 }}>Readiness</span>
                  {readinessScore ? <span style={{ fontSize: 11, fontWeight: 700, color: scoreColor(readinessScore) }}>{readinessScore} today</span> : null}
                </div>
                <div style={{ display: "flex", gap: 3, alignItems: "flex-end", height: 48 }}>
                  {last14.map(({ ds, data, isToday }) => {
                    const s = data.readinessScore;
                    const h = s ? Math.max(5, (s / 100) * 44) : 4;
                    return (
                      <div key={ds} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                        <div style={{ width: "100%", height: h, background: s ? (isToday ? scoreColor(s) : `${scoreColor(s)}55`) : "#252525", borderRadius: "3px 3px 0 0", transition: "height 0.3s" }} />
                        {isToday && <div style={{ width: 3, height: 3, borderRadius: "50%", background: "#ffffff", flexShrink: 0 }} />}
                      </div>
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                  <span style={{ fontSize: 9, color: "#3a3a3a" }}>{last14[0].dayLabel}</span>
                  <span style={{ fontSize: 9, color: "#3a3a3a" }}>Today</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual log sheet */}
      {showManual && <ManualSleepSheet tod={tod} date={date} saveSleep={saveSleep} onClose={() => setShowManual(false)} />}
    </>
  );
}

function ManualSleepSheet({ tod, date, saveSleep, onClose }) {
  const [form, setForm] = useState({ hours: tod.hours ? String(tod.hours) : "", score: tod.score ? String(tod.score) : "" });
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{ background: "#181818", borderRadius: "20px 20px 0 0", padding: "20px 20px 48px", width: "100%", maxWidth: 480, margin: "0 auto" }}>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Log Recovery</div>
        <div style={{ fontSize: 11, color: "#b3b3b3", marginBottom: 6 }}>Hours slept</div>
        <input type="number" inputMode="decimal" placeholder="7.5" value={form.hours} onChange={e => setForm(f => ({ ...f, hours: e.target.value }))} style={{ marginBottom: 12 }} />
        <div style={{ fontSize: 11, color: "#b3b3b3", marginBottom: 6 }}>Sleep score (optional)</div>
        <input type="number" inputMode="numeric" placeholder="78" value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))} style={{ marginBottom: 16 }} />
        <button
          onClick={() => {
            if (!form.hours) return;
            saveSleep(date, { ...tod, hours: parseFloat(form.hours), ...(form.score ? { score: parseInt(form.score) } : {}) });
            onClose();
          }}
          style={{ width: "100%", background: "#1ed760", color: "#000", borderRadius: 9999, padding: 12, fontWeight: 700, fontSize: 14 }}
        >Save</button>
      </div>
    </div>
  );
}

// ─── LIBRARY TAB ──────────────────────────────────────────────────────────────
function LibraryTab({ logs, goTrain }) {
  const [filter, setFilter] = useState("programs");
  const [selectedProgram, setSelectedProgram] = useState("B0475");
  const [selectedEx, setSelectedEx] = useState(null);

  // Build exercise history index across all logs
  const exerciseHistory = {};
  Object.entries(logs).forEach(([date, dayData]) => {
    Object.entries(dayData || {}).forEach(([wktKey, wktData]) => {
      if (!PLAN.workouts[wktKey]) return;
      PLAN.workouts[wktKey].exercises.forEach(ex => {
        const data = wktData[ex.id];
        const sets = Array.isArray(data?.sets) ? data.sets : [];
        const doneSets = sets.filter(s => s.done);
        if (!exerciseHistory[ex.name]) {
          exerciseHistory[ex.name] = { ex, wktKey, sessions: [] };
        }
        // Always record session (even if 0 done sets) so we know it was attempted
        if (doneSets.length > 0 || sets.length > 0) {
          exerciseHistory[ex.name].sessions.push({ date, sets: doneSets.length > 0 ? doneSets : sets, attempted: true });
        }
      });
    });
  });

  const allExercises = Object.values(PLAN.workouts).flatMap(wkt =>
    wkt.exercises.map(ex => ({ ex, wktKey: Object.entries(PLAN.workouts).find(([, w]) => w === wkt)?.[0] }))
  );
  const exerciseList = allExercises
    .map(({ ex, wktKey }) => ({ name: ex.name, ex, wktKey, history: exerciseHistory[ex.name] || { ex, wktKey, sessions: [] } }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const prog = PROGRAMS[selectedProgram] || PROGRAMS.B0475;

  return (
    <div className="fade-in" style={{ padding: "20px 0 0" }}>

      <div style={{ padding: "0 16px 14px" }}>
        <div style={{ fontSize: 22, fontWeight: 700 }}>Your Library</div>
      </div>

      {/* Filter pills */}
      <div style={{ display: "flex", gap: 8, padding: "0 16px 16px", overflowX: "auto", scrollbarWidth: "none" }}>
        {[["programs","Programs"],["exercises","Exercises"]].map(([f, label]) => (
          <button key={f} onClick={() => setFilter(f)} style={{ flexShrink: 0, background: filter === f ? "#ffffff" : "#282828", color: filter === f ? "#000000" : "#ffffff", borderRadius: 9999, padding: "6px 16px", fontSize: 13, fontWeight: 700, transition: "all 0.15s" }}>
            {label}
          </button>
        ))}
      </div>

      {/* ── PROGRAMS VIEW ─────────────────────────────────────────────── */}
      {filter === "programs" && (
        <div>
          {/* Program cards */}
          <div style={{ display: "flex", gap: 12, padding: "0 16px 20px", overflowX: "auto", scrollbarWidth: "none" }}>
            {Object.values(PROGRAMS).map(p => {
              const active = selectedProgram === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedProgram(p.id)}
                  style={{
                    flexShrink: 0, width: 160, borderRadius: 10, overflow: "hidden",
                    background: "#181818", textAlign: "left",
                    border: active ? `2px solid ${p.accent}` : "2px solid transparent",
                    boxShadow: active ? `0 4px 20px ${p.accent}33` : "rgba(0,0,0,0.3) 0px 4px 12px",
                    transition: "all 0.2s",
                  }}
                >
                  {/* Album art */}
                  <div style={{ width: "100%", aspectRatio: "1", background: p.gradient, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    <CoverArt type={p.coverType} size={120} />
                  </div>
                  <div style={{ padding: "10px 12px 12px" }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 2 }}>{p.name}</div>
                    <div style={{ fontSize: 10, color: "#b3b3b3" }}>{p.tagline}</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Selected program detail */}
          {prog.workoutKeys.length > 0 ? (
            <div style={{ padding: "0 16px" }}>
              {/* Program header */}
              <div style={{ background: "#181818", borderRadius: 14, padding: "16px", marginBottom: 16, boxShadow: "rgba(0,0,0,0.3) 0px 4px 12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: prog.timeline ? 12 : 0 }}>
                  <div style={{ width: 56, height: 56, borderRadius: 8, background: prog.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <CoverArt type={prog.coverType} size={50} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 16 }}>{prog.name}</div>
                    <div style={{ fontSize: 12, color: "#b3b3b3" }}>{prog.tagline}</div>
                  </div>
                </div>
                {prog.timeline && (
                  <>
                    <div style={{ height: 1, background: "#282828", marginBottom: 10 }} />
                    <div style={{ fontSize: 11, color: "#b3b3b3", fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Goals</div>
                    {prog.goals.map((g, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <div style={{ width: 4, height: 4, borderRadius: "50%", background: prog.accent, flexShrink: 0 }} />
                        <div style={{ fontSize: 12, color: "#b3b3b3" }}>{g}</div>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Workout days */}
              {prog.workoutKeys.map(dayKey => {
                const wkt = PLAN.workouts[dayKey];
                const cover = COVERS[dayKey];
                if (!wkt) return null;
                const recentSession = Object.entries(logs).filter(([,d]) => d[dayKey]).sort((a,b) => b[0].localeCompare(a[0]))[0];
                const totalSets = wkt.exercises.reduce((s, ex) => s + ex.sets, 0);
                return (
                  <button key={dayKey} onClick={() => goTrain(dayKey)} className="sp-card"
                    style={{ width: "100%", background: "#181818", borderRadius: 12, padding: 12, marginBottom: 10, display: "flex", alignItems: "center", gap: 12, textAlign: "left", transition: "background 0.15s", boxShadow: "rgba(0,0,0,0.3) 0px 4px 8px" }}>
                    <div style={{ width: 60, height: 60, borderRadius: 8, background: cover.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                      <CoverArt type={cover.coverType} size={52} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{wkt.name}</div>
                      <div style={{ fontSize: 11, color: "#b3b3b3", marginBottom: 2 }}>{wkt.exercises.length} exercises · {totalSets} sets</div>
                      {recentSession && <div style={{ fontSize: 10, color: "#6a6a6a" }}>Last: {recentSession[0]}</div>}
                    </div>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: cover.accent, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 1.5L10 6L2 10.5V1.5Z" fill="#000" /></svg>
                    </div>
                  </button>
                );
              })}

              {/* Exercise tracklist */}
              <div style={{ marginTop: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#b3b3b3", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Tracklist</div>
                {prog.workoutKeys.flatMap(dayKey => {
                  const wkt = PLAN.workouts[dayKey];
                  const cover = COVERS[dayKey];
                  if (!wkt) return [];
                  return wkt.exercises.map((ex, idx) => {
                    const hist = exerciseHistory[ex.name];
                    const lastDone = hist?.sessions.sort((a,b)=>b.date.localeCompare(a.date))[0];
                    const lastW = lastDone?.sets.filter(s=>s.weight).slice(-1)[0]?.weight;
                    return (
                      <button key={ex.id} onClick={() => setSelectedEx(ex.name)} className="sp-card"
                        style={{ width: "100%", background: "transparent", padding: "9px 0", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #1e1e1e", textAlign: "left" }}>
                        <div style={{ width: 32, height: 32, borderRadius: 4, background: `${cover.accent}1a`, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Bebas Neue', sans-serif", fontSize: 13, color: cover.accent, flexShrink: 0 }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 1 }}>{ex.name}</div>
                          <div style={{ fontSize: 10, color: "#6a6a6a" }}>{cover.label} · {ex.sets}×{ex.repsMin}{ex.repsMin!==ex.repsMax?`–${ex.repsMax}`:""}</div>
                        </div>
                        {lastW ? (
                          <div style={{ textAlign: "right", flexShrink: 0 }}>
                            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: cover.accent }}>{lastW}lb</div>
                            <div style={{ fontSize: 9, color: "#6a6a6a" }}>last</div>
                          </div>
                        ) : (
                          <div style={{ fontSize: 10, color: "#444" }}>—</div>
                        )}
                      </button>
                    );
                  });
                })}
              </div>
            </div>
          ) : (
            <div style={{ padding: "40px 16px", textAlign: "center" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
              <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 6 }}>{prog.name}</div>
              <div style={{ fontSize: 13, color: "#b3b3b3" }}>Program coming soon. Workouts will appear here once built out.</div>
            </div>
          )}
        </div>
      )}

      {/* ── EXERCISES VIEW ────────────────────────────────────────────── */}
      {filter === "exercises" && (
        <div style={{ padding: "0 16px" }}>
          <div style={{ fontSize: 11, color: "#b3b3b3", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 12 }}>{exerciseList.length} Exercises</div>
          {exerciseList.map(({ name, ex, wktKey, history }) => {
            const cover = COVERS[wktKey] || COVERS.D1;
            const sorted = [...(history.sessions || [])].sort((a,b) => b.date.localeCompare(a.date));
            const last = sorted[0];
            const lastW = last?.sets.filter(s => s.weight).slice(-1)[0]?.weight;
            const lastR = last?.sets.filter(s => s.reps).slice(-1)[0]?.reps;
            const sessionCount = sorted.filter(s => s.attempted).length;
            return (
              <button key={name} onClick={() => setSelectedEx(name)} className="sp-card"
                style={{ width: "100%", background: "transparent", padding: "10px 0", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid #1e1e1e", textAlign: "left" }}>
                <div style={{ width: 44, height: 44, borderRadius: 6, background: cover.gradient, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
                  <CoverArt type={cover.coverType} size={36} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 2 }}>{name}</div>
                  <div style={{ fontSize: 11, color: "#6a6a6a" }}>{cover.label} · {sessionCount} session{sessionCount !== 1 ? "s" : ""}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {lastW ? (
                    <>
                      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "#ffffff" }}>{lastW}×{lastR}</div>
                      <div style={{ fontSize: 9, color: "#6a6a6a" }}>{last.date.slice(5)}</div>
                    </>
                  ) : <div style={{ fontSize: 11, color: "#444" }}>No data</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ── EXERCISE DETAIL SHEET ─────────────────────────────────────── */}
      {selectedEx && (() => {
        const hist = exerciseHistory[selectedEx] || { ex: null, sessions: [] };
        const cover = COVERS[hist.wktKey] || COVERS.D1;
        const sorted = [...(hist.sessions || [])].sort((a,b) => b.date.localeCompare(a.date));
        const allWeights = sorted.flatMap(s => s.sets.map(set => parseFloat(set.weight)).filter(w => !isNaN(w) && w > 0));
        const maxWeight = allWeights.length ? Math.max(...allWeights) : null;
        const avgWeight = allWeights.length ? Math.round(allWeights.reduce((a,b) => a+b, 0) / allWeights.length * 10) / 10 : null;
        return (
          <div style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "flex-end" }} onClick={e => { if (e.target === e.currentTarget) setSelectedEx(null); }}>
            <div style={{ background: "#181818", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, margin: "0 auto", maxHeight: "82vh", display: "flex", flexDirection: "column", boxShadow: "rgba(0,0,0,0.5) 0px -8px 24px" }}>
              {/* Sheet header with gradient art */}
              <div style={{ background: cover.gradient, padding: "20px 20px 16px", borderRadius: "20px 20px 0 0", flexShrink: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>{cover.label}</div>
                    <div style={{ fontWeight: 700, fontSize: 22, color: "#fff", lineHeight: 1.1 }}>{selectedEx}</div>
                  </div>
                  <button onClick={() => setSelectedEx(null)} style={{ background: "rgba(0,0,0,0.4)", borderRadius: "50%", width: 32, height: 32, color: "#fff", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
                </div>
                {/* PR stats row */}
                <div style={{ display: "flex", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>SESSIONS</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "#fff" }}>{sorted.length}</div>
                  </div>
                  {maxWeight && <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>PR</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "#fff" }}>{maxWeight}lb</div>
                  </div>}
                  {avgWeight && <div>
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", marginBottom: 2 }}>AVG</div>
                    <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: "#fff" }}>{avgWeight}lb</div>
                  </div>}
                </div>
              </div>

              {/* Session history */}
              <div style={{ overflowY: "auto", padding: "16px 20px 48px", flex: 1 }}>
                {sorted.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "#6a6a6a" }}>
                    <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
                    <div style={{ fontWeight: 700, marginBottom: 4 }}>No sessions logged yet</div>
                    <div style={{ fontSize: 12 }}>Start a workout to track this exercise</div>
                  </div>
                ) : sorted.map(({ date, sets }) => (
                  <div key={date} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 11, color: "#b3b3b3", fontWeight: 700, marginBottom: 8 }}>{date}</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {sets.map((s, i) => (
                        <div key={i} style={{ background: "#282828", borderRadius: 8, padding: "6px 12px", fontSize: 13, fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 0.5, color: s.done ? cover.accent : "#b3b3b3" }}>
                          {s.weight ? `${s.weight}×${s.reps}` : `${s.reps} reps`}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ─── WORKOUT CALENDAR ────────────────────────────────────────────────────────
function WorkoutCalendar({ logs, compact = false, onDayPress }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = localDateStr(new Date()); // local date, not UTC
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

  // Build a map of date → { dayKey, cover, hasDone }
  const workoutMap = {};
  Object.entries(logs).forEach(([date, dayData]) => {
    if (!date.startsWith(`${year}-${String(month+1).padStart(2,"0")}`)) return;
    // Detect any workout data (weight/reps entered or sets marked done)
    const dayKey = Object.keys(dayData).find(k =>
      PLAN.workouts[k] && Object.values(dayData[k] || {}).some(ex =>
        Array.isArray(ex?.sets) && ex.sets.some(s => s.weight || s.reps || s.done)
      )
    );
    if (dayKey) {
      const hasDone = Object.values(dayData[dayKey] || {}).some(ex =>
        Array.isArray(ex?.sets) && ex.sets.some(s => s.done)
      );
      workoutMap[date] = { dayKey, cover: COVERS[dayKey], hasDone };
    }
  });

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const cellSize = compact ? 34 : 48;

  return (
    <div style={{ background: "#181818", borderRadius: 14, padding: compact ? "12px 12px" : "16px" }}>
      {!compact && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#b3b3b3", letterSpacing: 1.5, textTransform: "uppercase" }}>
            {monthNames[month]} {year}
          </div>
          <div style={{ fontSize: 11, color: "#6a6a6a" }}>
            {Object.keys(workoutMap).length} sessions
          </div>
        </div>
      )}
      {compact && (
        <div style={{ fontSize: 10, fontWeight: 700, color: "#6a6a6a", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
          {monthNames[month]}
        </div>
      )}
      {/* Day labels */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3, marginBottom: 3 }}>
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 9, color: "#3a3a3a", fontWeight: 700, fontFamily: "'DM Mono', monospace", letterSpacing: 1 }}>{d}</div>
        ))}
      </div>
      {/* Day cells */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 3 }}>
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
          const workout = workoutMap[dateStr];
          const isToday = dateStr === todayStr;
          const accent = workout?.cover?.accent;
          return (
            <button
              key={i}
              onClick={() => workout && onDayPress && onDayPress(dateStr, workout.dayKey)}
              style={{
                height: cellSize, borderRadius: 8,
                background: workout ? (compact ? `${accent}22` : `${accent}18`) : isToday ? "#282828" : "transparent",
                border: isToday ? "1px solid #444" : workout ? `1px solid ${accent}${compact ? "44" : "55"}` : "1px solid transparent",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2,
                cursor: workout ? "pointer" : "default",
                transition: "all 0.15s",
              }}
            >
              <span style={{ fontSize: compact ? 10 : 11, fontWeight: isToday ? 700 : 400, color: workout ? accent : isToday ? "#ffffff" : "#4a4a4a" }}>
                {day}
              </span>
              {workout && !compact && (
                <span style={{ fontSize: 7, fontWeight: 700, color: accent, fontFamily: "'DM Mono', monospace", letterSpacing: 0.3, lineHeight: 1, opacity: workout.hasDone ? 1 : 0.5 }}>
                  {PLAN.workouts[workout.dayKey]?.name?.slice(0,4) || ""}
                </span>
              )}
              {workout && compact && (
                <div style={{ width: 4, height: 4, borderRadius: "50%", background: accent, flexShrink: 0, opacity: workout.hasDone ? 1 : 0.4 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── WORKOUT TAB ─────────────────────────────────────────────────────────────
function WorkoutTab({ logs, saveLog, initialDay }) {
  const [mode, setMode] = useState("live");
  const [selectedDay, setSelectedDay] = useState(initialDay || getDefaultWorkout());
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
  // Program filter
  const [selectedProgram, setSelectedProgram] = useState("B0475");

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

  // Auto-select the day that has saved data when logDate changes
  useEffect(() => {
    const loggedDay = Object.keys(PLAN.workouts).find(key => {
      const d = logs[logDate]?.[key];
      return d && Object.values(d).some(ex => Array.isArray(ex?.sets) && ex.sets.some(s => s.weight || s.reps || s.done));
    });
    if (loggedDay) setSelectedDay(loggedDay);
  }, [logDate, logs]);

  // Project weight for an exercise based on recent history + progressive overload
  function projectWeight(exId, ex, dayKey) {
    const sessions = Object.entries(logs)
      .sort((a, b) => b[0].localeCompare(a[0])) // newest first
      .map(([date, dayData]) => dayData?.[dayKey]?.[exId])
      .filter(d => d?.sets?.some(s => s.done));
    if (sessions.length === 0) return ex.startWeight > 0 ? String(ex.startWeight) : "";
    const lastSets = sessions[0].sets.filter(s => s.done && s.weight);
    if (lastSets.length === 0) return ex.startWeight > 0 ? String(ex.startWeight) : "";
    const lastWeight = parseFloat(lastSets[lastSets.length - 1].weight);
    // Progressive overload: if last session had all sets done at rep max → +2.5lb
    const lastReps = sessions[0].sets.filter(s => s.done).map(s => parseInt(s.reps) || 0);
    const allAtRepMax = lastReps.length === ex.sets && lastReps.every(r => r >= ex.repsMax);
    return isNaN(lastWeight) ? "" : String(allAtRepMax ? lastWeight + 2.5 : lastWeight);
  }

  function buildEmptyExerciseData(wkt) {
    const data = {};
    wkt.exercises.forEach(ex => {
      const projected = projectWeight(ex.id, ex, selectedDay);
      data[ex.id] = {
        sets: Array.from({ length: ex.sets }, () => ({
          weight: projected, reps: "", done: false, _projected: !!projected,
        })),
      };
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
    const exSets = [...(exerciseData[exId]?.sets || [])];
    exSets[setIdx] = { ...exSets[setIdx], done: !wasDone };
    const newExData = { ...exerciseData, [exId]: { ...exerciseData[exId], sets: exSets } };
    setExerciseData(newExData);
    if (!wasDone) {
      if (exSets.every(s => s.done)) haptic.success();
      else haptic.medium();
      // Auto-save on every set completion
      saveLog(logDate, selectedDay, { ...newExData, _notes: sessionNotes, _overrides: overrides });
      setSaved(true);
      setTimer({ restSecs: 90 });
    } else {
      haptic.light();
      setSaved(false);
    }
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

      <div>
        {/* Spotify-style album header */}
        {(() => {
          const cover = COVERS[selectedDay] || COVERS.D1;
          return (
            <div style={{ padding: "0 0 0", background: `linear-gradient(180deg, ${cover.accent}22 0%, #121212 100%)` }}>
              <div style={{ padding: "20px 16px 16px", display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 90, height: 90, borderRadius: 10, flexShrink: 0, background: cover.gradient, display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", boxShadow: `0 8px 24px ${cover.accent}44` }}>
                  <CoverArt type={cover.coverType} size={82} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, color: "#b3b3b3", fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>Workout</div>
                  <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 3, lineHeight: 1.1 }}>{workout.name}</div>
                  <div style={{ fontSize: 12, color: "#b3b3b3" }}>{workout.exercises.length} exercises · PPL Split</div>
                </div>
              </div>

              {/* Program filter pills */}
              <div style={{ display: "flex", gap: 8, padding: "0 16px 8px", overflowX: "auto", scrollbarWidth: "none" }}>
                {[{ id: "B0475", label: "B0475" }, { id: "GLOW", label: "Glow Up" }].map(p => (
                  <button key={p.id} onClick={() => setSelectedProgram(p.id)} style={{
                    flexShrink: 0,
                    background: selectedProgram === p.id ? "#1ed76022" : "transparent",
                    color: selectedProgram === p.id ? "#1ed760" : "#6a6a6a",
                    border: `1px solid ${selectedProgram === p.id ? "#1ed76044" : "#2a2a2a"}`,
                    borderRadius: 9999, padding: "4px 12px", fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
                    transition: "all 0.15s",
                  }}>
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Day selector pills — logged day highlighted, others greyed */}
              <div style={{ display: "flex", gap: 8, padding: "0 16px 12px", overflowX: "auto", scrollbarWidth: "none" }}>
                {Object.entries(PLAN.workouts).map(([key, wkt]) => {
                  const active = selectedDay === key;
                  const dayLog = logs[logDate]?.[key];
                  // Logged = any exercise has weight/reps entered or done (not just done)
                  const isLogged = dayLog
                    ? Object.values(dayLog).some(ex => Array.isArray(ex?.sets) && ex.sets.some(s => s.weight || s.reps || s.done))
                    : false;
                  // If any day is logged on this date, dim the non-logged days
                  const anyDayLogged = Object.keys(PLAN.workouts).some(k => {
                    const d = logs[logDate]?.[k];
                    return d && Object.values(d).some(ex => Array.isArray(ex?.sets) && ex.sets.some(s => s.weight || s.reps || s.done));
                  });
                  const dimmed = anyDayLogged && !isLogged && !active;
                  const accentColor = COVERS[key]?.accent || "#1ed760";
                  return (
                    <button key={key} onClick={() => setSelectedDay(key)} style={{
                      flexShrink: 0,
                      background: active ? "#ffffff" : isLogged ? "#1a2a1a" : "#282828",
                      color: active ? "#000000" : isLogged ? accentColor : dimmed ? "#444" : "#b3b3b3",
                      borderRadius: 9999, padding: "6px 16px", fontSize: 12, fontWeight: 700,
                      border: isLogged && !active ? `1px solid ${accentColor}44` : "1px solid transparent",
                      transition: "all 0.15s",
                      opacity: dimmed ? 0.5 : 1,
                    }}>
                      {isLogged ? `✓ ${wkt.name}` : wkt.name}
                    </button>
                  );
                })}
                <button onClick={() => setMode("history")} style={{ flexShrink: 0, background: "transparent", color: "#b3b3b3", borderRadius: 9999, padding: "6px 16px", fontSize: 12, fontWeight: 400, border: "1px solid #4d4d4d" }}>History</button>
              </div>

              {/* 14-day date scroller with workout dots */}
              {(() => {
                const now = new Date();
                // Use local midnight as base to avoid UTC/local day-of-week mismatch
                const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                const todayLocal = localDateStr(base);
                const dayLetters = ["S","M","T","W","T","F","S"];
                const days14 = Array.from({ length: 14 }, (_, i) => {
                  const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() - (13 - i));
                  const dateStr = localDateStr(d);
                  const dayLetter = dayLetters[d.getDay()]; // consistent — both local
                  const dayNum = d.getDate();
                  // Show dot for any saved workout data (done or not)
                  const loggedKey = Object.keys(PLAN.workouts).find(k => {
                    const dat = logs[dateStr]?.[k];
                    if (!dat) return false;
                    return Object.values(dat).some(ex =>
                      Array.isArray(ex?.sets) && ex.sets.some(s => s.weight || s.reps || s.done)
                    );
                  });
                  const dotColor = loggedKey ? COVERS[loggedKey]?.accent : null;
                  const hasDone = loggedKey ? Object.values(logs[dateStr]?.[loggedKey] || {}).some(ex =>
                    Array.isArray(ex?.sets) && ex.sets.some(s => s.done)
                  ) : false;
                  return { dateStr, dayLetter, dayNum, dotColor, hasDone };
                });
                return (
                  <div
                    ref={el => { if (el) el.scrollLeft = el.scrollWidth; }}
                    style={{ display: "flex", gap: 4, padding: "0 16px 12px", overflowX: "auto", scrollbarWidth: "none" }}
                  >
                    {days14.map(({ dateStr, dayLetter, dayNum, dotColor, hasDone }) => {
                      const isSelected = dateStr === logDate;
                      const isToday = dateStr === todayLocal;
                      return (
                        <button
                          key={dateStr}
                          onClick={() => setLogDate(dateStr)}
                          style={{
                            flexShrink: 0, width: 38,
                            background: isSelected ? (COVERS[selectedDay]?.accent || "#ffffff") + "22" : "transparent",
                            border: isSelected ? `1px solid ${COVERS[selectedDay]?.accent || "#ffffff"}44` : "1px solid transparent",
                            borderRadius: 10, padding: "6px 0",
                            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                            transition: "all 0.15s",
                          }}
                        >
                          <span style={{ fontSize: 9, fontWeight: 700, color: isSelected ? "#ffffff" : "#4a4a4a", fontFamily: "'DM Mono', monospace", letterSpacing: 0.5 }}>{dayLetter}</span>
                          <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isSelected ? "#ffffff" : isToday ? "#ffffff" : "#6a6a6a" }}>{dayNum}</span>
                          {dotColor
                            ? <div style={{ width: 5, height: 5, borderRadius: "50%", background: dotColor, opacity: hasDone ? 1 : 0.4 }} />
                            : <div style={{ width: 5, height: 5 }} />
                          }
                        </button>
                      );
                    })}
                  </div>
                );
              })()}

              {/* Progress row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 16px 6px" }}>
                <div style={{ flex: 1, fontSize: 12, color: "#b3b3b3" }}>{fmtFull(logDate)}</div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 16, color: progressPct === 100 ? "#1ed760" : "#b3b3b3", whiteSpace: "nowrap" }}>{doneSets}/{totalSets}</div>
              </div>
              {progressPct > 0 && (
                <div style={{ height: 3, background: "#282828", margin: "0 16px 14px", borderRadius: 9999, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${progressPct}%`, background: cover.accent, borderRadius: 9999, transition: "width 0.4s" }} />
                </div>
              )}
            </div>
          );
        })()}

        <div style={{ padding: "0 16px 0" }}>
          {/* AI targets row */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>
                {workout.name} · {workout.sub}
              </div>
              <div style={{ fontSize: 11, color: "#b3b3b3" }}>{workout.exercises.length} exercises · {totalSets} total sets</div>
            </div>
            <button
              onClick={loadSuggestions}
              disabled={sugLoading || Object.keys(suggestions).length > 0}
              style={{
                flexShrink: 0,
                background: Object.keys(suggestions).length > 0 ? "#1ed76022" : "#282828",
                color: Object.keys(suggestions).length > 0 ? "#1ed760" : "#b3b3b3",
                borderRadius: 9999, padding: "8px 14px", fontSize: 11, fontWeight: 700,
              }}
            >
              {sugLoading ? "…" : Object.keys(suggestions).length > 0 ? "✓ AI Targets" : "AI Targets"}
            </button>
          </div>
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
                onAddSet={() => {
                  const sets = exerciseData[dataKey]?.sets || [];
                  const lastSet = sets[sets.length - 1];
                  const newSet = { weight: lastSet?.weight || "", reps: "", done: false };
                  setExerciseData(prev => ({
                    ...prev,
                    [dataKey]: { ...prev[dataKey], sets: [...(prev[dataKey]?.sets || []), newSet] }
                  }));
                  setSaved(false);
                }}
              />
            );
          })}

          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#b3b3b3", letterSpacing: 1, textTransform: "uppercase", marginBottom: 6 }}>Session Notes</div>
            <textarea placeholder="How'd it feel? Energy, pump, anything unusual..." rows={2} value={sessionNotes} onChange={e => setSessionNotes(e.target.value)} style={{ resize: "none", fontSize: 13, borderRadius: 10 }} />
          </div>

          <button onClick={handleSave} style={{ width: "100%", background: saved ? "#1ed76022" : COVERS[selectedDay]?.accent || "#1ed760", color: saved ? "#1ed760" : "#000000", padding: "15px", borderRadius: 9999, fontWeight: 700, fontSize: 16, letterSpacing: 0.5, marginBottom: 12, transition: "all 0.25s" }}>
            {saved ? "✓ Session Saved" : "Save Session"}
          </button>

          {saved && (
            <div style={{ background: "#181818", borderRadius: 14, padding: 16, marginBottom: 24, boxShadow: "rgba(0,0,0,0.3) 0px 8px 8px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#b3b3b3", letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 10 }}>Session Analysis</div>
              {analysis ? (
                <div style={{ fontSize: 13, color: "#b3b3b3", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{analysis}</div>
              ) : (
                <button onClick={analyzeSession} disabled={analyzing} style={{ width: "100%", background: analyzing ? "#282828" : "#539df5", color: analyzing ? "#6a6a6a" : "#000000", padding: 13, borderRadius: 9999, fontWeight: 700, fontSize: 14 }}>
                  {analyzing ? <span className="shimmer">Analyzing session...</span> : "Analyze My Workout"}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── PERFORMANCE HUD ─────────────────────────────────────────────────────────
function PerformanceHUD({
  resolvedExercises, activeExIdx, setActiveExIdx, exerciseData, suggestions,
  workoutColor, workoutBg, workoutName,
  doneSets, totalSets, sessionNotes, saved, analyzing, analysis,
  logs, logDate, selectedDay,
  onSessionNotes, onUpdateSet, onMarkDone, onSwap, onExit, onSave, onAnalyze,
}) {
  const [confirmFlash, setConfirmFlash] = useState(null); // { weight, reps, setNum }
  const queueRef = useRef(null);

  const { effectiveEx, dataKey } = resolvedExercises[activeExIdx];
  const exData = exerciseData[dataKey] || { sets: [] };
  const activeSetIdx = exData.sets.findIndex(s => !s.done);
  const setsDoneForEx = exData.sets.filter(s => s.done).length;
  const allDoneForEx = setsDoneForEx === exData.sets.length && exData.sets.length > 0;
  const isBodyweight = effectiveEx.startWeight === 0;
  const allWorkoutDone = doneSets === totalSets && totalSets > 0;
  const suggestion = suggestions[dataKey];

  // Pre-fill: same-session prev done set → last session → startWeight / repsMin
  const getPrefill = (field) => {
    const prevDone = [...exData.sets].reverse().find(s => s.done && s[field]);
    if (prevDone) return String(prevDone[field]);
    if (logs && field === "weight") {
      const sortedDates = Object.keys(logs).sort().reverse();
      for (const d of sortedDates) {
        if (d === logDate) continue;
        const entry = logs[d]?.[selectedDay]?.[dataKey];
        if (!entry?.sets) continue;
        const hit = [...entry.sets].reverse().find(s => s.done && s[field]);
        if (hit) return String(hit[field]);
      }
    }
    if (field === "weight" && effectiveEx.startWeight > 0) return String(effectiveEx.startWeight);
    if (field === "reps" && effectiveEx.repsMin) return String(effectiveEx.repsMin);
    return "";
  };

  // Scroll queue strip to active exercise
  useEffect(() => {
    if (!queueRef.current) return;
    const el = queueRef.current.querySelector(`[data-qidx="${activeExIdx}"]`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [activeExIdx]);

  const handleLogSet = () => {
    if (activeSetIdx < 0) return;
    const currentSet = exData.sets[activeSetIdx];
    // Auto-fill blanks from prefill before logging
    const w = currentSet?.weight || getPrefill("weight");
    const r = currentSet?.reps || getPrefill("reps");
    if (!currentSet?.weight && w) onUpdateSet(dataKey, activeSetIdx, "weight", w);
    if (!currentSet?.reps && r) onUpdateSet(dataKey, activeSetIdx, "reps", r);
    // Stripe confirmation flash
    setConfirmFlash({ weight: w, reps: r, setNum: activeSetIdx + 1 });
    setTimeout(() => setConfirmFlash(null), 650);
    // Mark done + auto-save (parent handles haptic + timer)
    onMarkDone(dataKey, activeSetIdx);
  };

  // Jump to next incomplete exercise
  const goNextIncomplete = () => {
    const next = resolvedExercises.findIndex((r, i) => {
      const exD = exerciseData[r.dataKey] || { sets: [] };
      return i !== activeExIdx && exD.sets.some(s => !s.done);
    });
    if (next >= 0) { setActiveExIdx(next); haptic.light(); }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      background: workoutBg,
      display: "flex", flexDirection: "column",
      overflowY: "auto",
    }}>

      {/* ── TOP BAR ─────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "20px 20px 0" }}>
        <div style={{ display: "flex", gap: 4, flex: 1 }}>
          {resolvedExercises.map((r, i) => {
            const exD = exerciseData[r.dataKey] || { sets: [] };
            const done = exD.sets.length > 0 && exD.sets.every(s => s.done);
            const active = i === activeExIdx;
            return (
              <div key={r.planEx.id} style={{
                flex: active ? 2.5 : 1, height: 3, borderRadius: 2,
                background: done ? workoutColor : active ? `${workoutColor}55` : "#1a1a1a",
                transition: "all 0.35s ease",
              }} />
            );
          })}
        </div>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#252525", letterSpacing: 1, whiteSpace: "nowrap" }}>
          {doneSets}<span style={{ color: "#181818" }}>/{totalSets}</span>
        </div>
        <button onClick={onExit} style={{ background: "none", color: "#252525", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1 }}>
          LIST ↗
        </button>
      </div>

      {/* ── EXERCISE QUEUE STRIP ────────────────────────────────────────── */}
      <div
        ref={queueRef}
        style={{
          display: "flex", gap: 8, overflowX: "auto",
          padding: "16px 20px 0",
          scrollbarWidth: "none", WebkitOverflowScrolling: "touch",
        }}
      >
        {resolvedExercises.map((r, i) => {
          const exD = exerciseData[r.dataKey] || { sets: [] };
          const done = exD.sets.length > 0 && exD.sets.every(s => s.done);
          const active = i === activeExIdx;
          return (
            <button
              key={r.planEx.id}
              data-qidx={i}
              onClick={() => { setActiveExIdx(i); haptic.light(); }}
              style={{
                flexShrink: 0,
                background: active ? workoutColor : done ? "#111" : "#0c0c0c",
                border: active ? "none" : `1px solid ${done ? "#1e1e1e" : "#141414"}`,
                borderRadius: 20, padding: "6px 14px",
                fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 1.5,
                color: active ? "#080808" : done ? `${workoutColor}55` : "#252525",
                whiteSpace: "nowrap",
                transition: "all 0.2s",
              }}
            >
              {done && !active ? "✓ " : ""}{r.effectiveEx.name.toUpperCase()}
            </button>
          );
        })}
      </div>

      {/* ── EXERCISE NAME + CONTEXT ─────────────────────────────────────── */}
      <div style={{ padding: "22px 20px 0" }}>
        <div style={{
          fontFamily: "'DM Mono', monospace", fontSize: 8,
          color: `${workoutColor}77`, letterSpacing: 2.5, marginBottom: 6,
        }}>
          {workoutName} · {activeExIdx + 1} OF {resolvedExercises.length}
        </div>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: 50, lineHeight: 1,
          color: allDoneForEx ? "#252525" : "#f0f0f0",
          letterSpacing: 0.5, transition: "color 0.4s",
        }}>
          {effectiveEx.name}
        </div>
        {activeSetIdx >= 0 && (
          <div style={{
            fontFamily: "'DM Mono', monospace", fontSize: 9,
            color: workoutColor, letterSpacing: 2, marginTop: 8,
            display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap",
          }}>
            <span>SET {activeSetIdx + 1} OF {exData.sets.length}</span>
            {suggestion && <span style={{ color: "#252525" }}>· {suggestion}</span>}
          </div>
        )}
      </div>

      {/* ── DIGITAL READOUTS ────────────────────────────────────────────── */}
      {activeSetIdx >= 0 ? (
        <div style={{
          display: "grid",
          gridTemplateColumns: isBodyweight ? "1fr" : "1fr 1fr",
          gap: 10, padding: "22px 20px 0",
        }}>
          {!isBodyweight && (
            <div style={{
              background: "#080808", border: "1px solid #181818",
              borderRadius: 16, padding: "16px 12px 12px",
              display: "flex", flexDirection: "column", alignItems: "center",
            }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#222", letterSpacing: 2.5, marginBottom: 6 }}>LBS</div>
              <input
                type="number" inputMode="decimal"
                placeholder={getPrefill("weight") || "—"}
                value={exData.sets[activeSetIdx]?.weight || ""}
                onChange={e => onUpdateSet(dataKey, activeSetIdx, "weight", e.target.value)}
                style={{
                  width: "100%", textAlign: "center",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 58, lineHeight: 1, letterSpacing: 1,
                  color: "#efefef",
                  background: "transparent", border: "none", outline: "none",
                  caretColor: workoutColor,
                }}
              />
              <div style={{ width: "60%", height: 1, background: "#1c1c1c", marginTop: 10 }} />
            </div>
          )}
          <div style={{
            background: "#080808", border: "1px solid #181818",
            borderRadius: 16, padding: "16px 12px 12px",
            display: "flex", flexDirection: "column", alignItems: "center",
            gridColumn: isBodyweight ? "1 / -1" : "auto",
          }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, color: "#222", letterSpacing: 2.5, marginBottom: 6 }}>
              {isBodyweight ? "REPS / SECS" : "REPS"}
            </div>
            <input
              type="number" inputMode="numeric"
              placeholder={getPrefill("reps") || String(effectiveEx.repsMin || "")}
              value={exData.sets[activeSetIdx]?.reps || ""}
              onChange={e => onUpdateSet(dataKey, activeSetIdx, "reps", e.target.value)}
              style={{
                width: "100%", textAlign: "center",
                fontFamily: "'Bebas Neue', sans-serif",
                fontSize: 58, lineHeight: 1, letterSpacing: 1,
                color: "#efefef",
                background: "transparent", border: "none", outline: "none",
                caretColor: workoutColor,
              }}
            />
            <div style={{ width: "60%", height: 1, background: "#1c1c1c", marginTop: 10 }} />
          </div>
        </div>
      ) : allDoneForEx ? (
        <div style={{
          margin: "22px 20px 0",
          background: `${workoutColor}0a`, border: `1px solid ${workoutColor}1e`,
          borderRadius: 14, padding: "18px 16px",
          display: "flex", alignItems: "center", gap: 14,
        }}>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 30, color: workoutColor, lineHeight: 1 }}>DONE</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: `${workoutColor}55`, letterSpacing: 1 }}>
            {allWorkoutDone ? "ALL SETS COMPLETE" : "TAP QUEUE TO JUMP"}
          </div>
        </div>
      ) : null}

      {/* ── SET STATUS DOTS ─────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 8, padding: "18px 20px 0", flexWrap: "wrap" }}>
        {exData.sets.map((set, si) => {
          const isDone = set.done;
          const isActiveSi = si === activeSetIdx;
          return (
            <button
              key={si}
              onClick={() => onMarkDone(dataKey, si)}
              style={{
                width: 38, height: 38, borderRadius: "50%", flexShrink: 0,
                background: isDone ? workoutColor : isActiveSi ? "#141414" : "#0d0d0d",
                border: isDone
                  ? `2px solid ${workoutColor}`
                  : isActiveSi ? `2px solid ${workoutColor}44` : "2px solid #161616",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "all 0.2s", cursor: "pointer",
              }}
            >
              <span style={{
                fontFamily: "'Bebas Neue', sans-serif", fontSize: 15, lineHeight: 1,
                color: isDone ? "#080808" : isActiveSi ? workoutColor : "#1e1e1e",
              }}>
                {isDone ? "✓" : si + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* Spacer */}
      <div style={{ flex: 1, minHeight: 20 }} />

      {/* ── POST-WORKOUT: notes + analysis ──────────────────────────────── */}
      {allWorkoutDone && (
        <div style={{ padding: "0 20px 14px" }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#252525", letterSpacing: 2, marginBottom: 6 }}>SESSION NOTES</div>
          <textarea
            placeholder="Energy, pump, anything unusual..."
            rows={2}
            value={sessionNotes}
            onChange={e => onSessionNotes(e.target.value)}
            style={{ resize: "none", fontSize: 13, borderRadius: 10, marginBottom: 12 }}
          />
          {saved && (
            <div style={{ background: "#080d14", border: "1px solid #1a2a3a", borderRadius: 14, padding: 16, marginBottom: 4 }}>
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
      )}

      {/* ── PRIMARY ACTION BUTTON ────────────────────────────────────────── */}
      <div style={{ padding: "0 20px 44px" }}>
        {activeSetIdx >= 0 ? (
          /* LOG SET — the main CTA */
          <button
            onClick={handleLogSet}
            style={{
              width: "100%", height: 68,
              background: confirmFlash ? "#0c180a" : workoutColor,
              color: confirmFlash ? workoutColor : "#080808",
              border: confirmFlash ? `1px solid ${workoutColor}33` : "none",
              borderRadius: 16,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: confirmFlash ? 15 : 30,
              letterSpacing: confirmFlash ? 1 : 3,
              transition: "background 0.12s, color 0.12s, font-size 0.12s",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            {confirmFlash
              ? `✓ ${confirmFlash.weight || "BW"}${!isBodyweight ? "lb" : ""} × ${confirmFlash.reps || "—"} · SET ${confirmFlash.setNum} LOGGED`
              : "LOG SET"
            }
          </button>
        ) : allWorkoutDone ? (
          /* Save session */
          <button
            onClick={onSave}
            style={{
              width: "100%", height: 68,
              background: saved ? "#0d1f05" : workoutColor,
              color: saved ? workoutColor : "#080808",
              border: saved ? `1px solid ${workoutColor}33` : "none",
              borderRadius: 16,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 28, letterSpacing: 2,
              transition: "all 0.25s",
            }}
          >
            {saved ? "✓ SESSION SAVED" : "SAVE SESSION"}
          </button>
        ) : (
          /* Current exercise done — jump to next incomplete */
          <button
            onClick={goNextIncomplete}
            style={{
              width: "100%", height: 68,
              background: "#0e0e0e", border: `1px solid ${workoutColor}2a`,
              borderRadius: 16,
              fontFamily: "'Bebas Neue', sans-serif",
              fontSize: 24, letterSpacing: 2,
              color: workoutColor,
            }}
          >
            NEXT EXERCISE →
          </button>
        )}
      </div>
    </div>
  );
}

// ─── EXERCISE CARD ────────────────────────────────────────────────────────────
function ExerciseCard({ ex, originalExName, exData, index, suggestion, allDone, workoutColor, onUpdateSet, onMarkDone, onSwap, onRestoreOriginal, onAddSet }) {
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

          <button
            onClick={onAddSet}
            style={{
              marginTop: 10, width: "100%",
              background: "transparent", border: `1px dashed #2a2a2a`,
              borderRadius: 8, padding: "7px", fontSize: 11, fontWeight: 700,
              color: "#3a3a3a", letterSpacing: 0.5,
              transition: "all 0.15s",
            }}
          >
            + Add Set
          </button>
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
