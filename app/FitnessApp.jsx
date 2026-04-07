"use client";

import { useState, useEffect, useCallback, useRef } from "react";

// ─── PLAN DATA ────────────────────────────────────────────────────────────────
const PLAN = {
  startDate: "2025-03-29",
  targetDate: "2025-05-15",
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
  // Three ascending beeps
  playBeep(660, 0.2);
  setTimeout(() => playBeep(770, 0.2), 250);
  setTimeout(() => playBeep(880, 0.4), 500);
  try { navigator.vibrate([300, 100, 300, 100, 400]); } catch {}
}

// ─── AI ──────────────────────────────────────────────────────────────────────
function getApiKey() {
  return localStorage.getItem("banjo_api_key") || "";
}

async function callClaude(prompt, systemExtra = "") {
  const key = getApiKey();
  if (!key) return "Set your API key in Settings to enable AI coaching.";
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
Key context: 5'4", ~143 lbs, goal: 137 lbs at 10% BF. PPL x2 split, 6 days/week.
Goals: visible abs, adonis belt, serratus, capped lateral delts, bicep veins, chest separation.
Daily: 1750 cal, 175g protein. Week ${weekNum()} — ${currentPhase().name} phase.
Progressive overload rule: add reps first → weight when top of range hit 2 sessions in a row.
On a cut: holding strength = success. No heavy PRs in weeks 3+.
${systemExtra}
Be SHORT and punchy. Numbers only. Coach-speak. No fluff.`,
        messages: [{ role: "user", content: prompt }]
      })
    });
    const data = await res.json();
    return data.content?.[0]?.text || "No response.";
  } catch {
    return "AI unavailable.";
  }
}

// ─── REST TIMER ──────────────────────────────────────────────────────────────
function RestTimer({ seconds, onDone, onSkip }) {
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
        if (r === 11) playBeep(440, 0.1); // 10s warning beep
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const pct = ((seconds - remaining) / seconds) * 100;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const urgent = remaining <= 10;

  return (
    <div style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 999,
      background: urgent ? "#1a0a00" : "#0a1a00",
      borderBottom: `2px solid ${urgent ? "#f0a040" : "#c8f060"}`,
      padding: "10px 16px",
    }}>
      {/* Progress bar */}
      <div style={{ height: 2, background: "#111", borderRadius: 1, marginBottom: 8, overflow: "hidden" }}>
        <div style={{
          height: "100%",
          width: `${pct}%`,
          background: urgent ? "#f0a040" : "#c8f060",
          transition: "width 1s linear",
          borderRadius: 1,
        }} />
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 2, color: urgent ? "#f0a040" : "#c8f060", marginBottom: 2 }}>
            {urgent ? "GET READY" : "REST"}
          </div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 36, color: urgent ? "#f0a040" : "#ffffff", lineHeight: 1, letterSpacing: 1 }}>
            {mins > 0 ? `${mins}:${String(secs).padStart(2,"0")}` : `${secs}s`}
          </div>
        </div>
        <button
          onClick={onSkip}
          style={{ background: "#1a1a1a", color: "#555", border: "1px solid #2a2a2a", borderRadius: 6, padding: "8px 16px", fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1 }}
        >
          SKIP
        </button>
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState("workout");
  const [logs, setLogs] = useState({});
  const [nutrition, setNutrition] = useState({});
  const [sleep, setSleep] = useState({});
  const [bodyweight, setBodyweight] = useState({});
  const [apiKey, setApiKey] = useState(getApiKey());
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    setLogs(store.get("logs") || {});
    setNutrition(store.get("nutrition") || {});
    setSleep(store.get("sleep") || {});
    setBodyweight(store.get("bodyweight") || {});
    if (!getApiKey()) setShowSettings(true);
  }, []);

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
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#444", marginBottom: 8 }}>ANTHROPIC API KEY</div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="password"
              placeholder="sk-ant-..."
              value={apiKey}
              onChange={e => saveApiKey(e.target.value)}
              style={{ flex: 1, fontSize: 13 }}
            />
            <button onClick={() => setShowSettings(false)} style={{ background: "#c8f060", color: "#080808", padding: "0 16px", borderRadius: 8, fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1, whiteSpace: "nowrap" }}>DONE</button>
          </div>
          <div style={{ fontSize: 10, color: "#333", marginTop: 6 }}>Stored locally on your device. Never sent anywhere except Anthropic.</div>
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
  const [mode, setMode] = useState("live"); // "live" | "history"
  const [selectedDay, setSelectedDay] = useState(getDefaultWorkout());
  const [logDate, setLogDate] = useState(today());
  const [exerciseData, setExerciseData] = useState({});
  const [saved, setSaved] = useState(false);
  const [timer, setTimer] = useState(null); // { restSecs }
  const [suggestions, setSuggestions] = useState({});
  const [sugLoading, setSugLoading] = useState(false);
  const [sessionNotes, setSessionNotes] = useState("");

  const workout = PLAN.workouts[selectedDay];

  // Load existing log when day/date changes
  useEffect(() => {
    const existing = logs[logDate]?.[selectedDay];
    if (existing) {
      const { _notes, ...exData } = existing;
      setExerciseData(normalizeExerciseData(exData, workout));
      setSessionNotes(_notes || "");
    } else {
      setExerciseData(buildEmptyExerciseData(workout));
      setSessionNotes("");
    }
    setSaved(false);
    setSuggestions({});
  }, [selectedDay, logDate]);

  // Build empty per-set structure
  function buildEmptyExerciseData(wkt) {
    const data = {};
    wkt.exercises.forEach(ex => {
      data[ex.id] = { sets: Array.from({ length: ex.sets }, () => ({ weight: "", reps: "", done: false })) };
    });
    return data;
  }

  // Handle old flat format (weight/reps/sets as scalars) → new per-set array format
  function normalizeExerciseData(raw, wkt) {
    const data = {};
    wkt.exercises.forEach(ex => {
      const val = raw[ex.id];
      if (!val) {
        data[ex.id] = { sets: Array.from({ length: ex.sets }, () => ({ weight: "", reps: "", done: false })) };
      } else if (Array.isArray(val.sets)) {
        // Already new format
        const needed = ex.sets - val.sets.length;
        data[ex.id] = {
          sets: needed > 0
            ? [...val.sets, ...Array.from({ length: needed }, () => ({ weight: "", reps: "", done: false }))]
            : val.sets
        };
      } else {
        // Old flat format → convert
        const w = val.weight || "";
        const r = val.reps || "";
        const n = parseInt(val.sets) || ex.sets;
        data[ex.id] = {
          sets: Array.from({ length: n }, () => ({ weight: w, reps: r, done: false }))
        };
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

  const markSetDone = (exId, setIdx, restSecs = 90) => {
    setExerciseData(prev => {
      const exSets = [...(prev[exId]?.sets || [])];
      exSets[setIdx] = { ...exSets[setIdx], done: !exSets[setIdx].done };
      return { ...prev, [exId]: { ...prev[exId], sets: exSets } };
    });
    // Only start timer if marking as done (not undoing)
    const isDone = !exerciseData[exId]?.sets[setIdx]?.done;
    if (isDone) setTimer({ restSecs });
    setSaved(false);
  };

  const handleSave = () => {
    const payload = { ...exerciseData, _notes: sessionNotes };
    saveLog(logDate, selectedDay, payload);
    setSaved(true);
  };

  // Load AI suggestions for each exercise based on history
  const loadSuggestions = async () => {
    setSugLoading(true);
    const newSug = {};
    for (const ex of workout.exercises) {
      // Find last 3 sessions of this workout type
      const pastSessions = Object.entries(logs)
        .filter(([, wkts]) => wkts[selectedDay])
        .sort(([a], [b]) => b.localeCompare(a))
        .slice(0, 3)
        .map(([date, wkts]) => {
          const exData = wkts[selectedDay]?.[ex.id];
          if (!exData) return null;
          if (Array.isArray(exData.sets)) {
            const done = exData.sets.filter(s => s.done || s.reps);
            if (!done.length) return null;
            const setStr = done.map(s => `${s.weight || "BW"}×${s.reps}`).join(", ");
            return `${fmt(date)}: ${setStr}`;
          } else if (exData.weight || exData.reps) {
            return `${fmt(date)}: ${exData.sets || ex.sets}×${exData.reps} @ ${exData.weight || "BW"}lbs`;
          }
          return null;
        })
        .filter(Boolean);

      if (pastSessions.length === 0) {
        newSug[ex.id] = `Start at ${ex.startWeight > 0 ? `${ex.startWeight}lbs` : "bodyweight"}. Target ${ex.repsMin}–${ex.repsMax} reps per set.`;
      } else {
        const rec = await callClaude(
          `Exercise: ${ex.name} | Target: ${ex.sets} sets × ${ex.repsMin}–${ex.repsMax} reps | Increment: ${ex.increment}lbs\nHistory (recent first):\n${pastSessions.join("\n")}\n\nWhat weight/reps should Banjo aim for today? Give ONE specific recommendation in under 20 words. Example: "115lbs × 5-6 reps. Hit 6 on sets 1-2, may drop to 5 on sets 3-4."`
        );
        newSug[ex.id] = rec;
      }
    }
    setSuggestions(newSug);
    setSugLoading(false);
  };

  // Count completed sets across all exercises
  const totalSets = workout.exercises.reduce((s, ex) => s + ex.sets, 0);
  const doneSets = Object.values(exerciseData).reduce((s, ex) => s + (ex.sets?.filter(set => set.done).length || 0), 0);
  const progressPct = totalSets > 0 ? (doneSets / totalSets) * 100 : 0;

  // ─── HISTORY MODE ──────────────────────────────────────────────────────────
  if (mode === "history") {
    return (
      <HistoryView
        logs={logs}
        selectedDay={selectedDay}
        onSelectDay={setSelectedDay}
        onClose={() => setMode("live")}
        workout={workout}
      />
    );
  }

  // ─── LIVE MODE ─────────────────────────────────────────────────────────────
  return (
    <div className="fade-in">
      {/* REST TIMER */}
      {timer && (
        <RestTimer
          seconds={timer.restSecs}
          onDone={() => setTimer(null)}
          onSkip={() => setTimer(null)}
        />
      )}

      <div style={{ padding: "16px 16px 0" }}>
        {/* TOP ROW: Date + History toggle */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14, alignItems: "center" }}>
          <input
            type="date"
            value={logDate}
            onChange={e => setLogDate(e.target.value)}
            style={{ flex: 1, fontSize: 13, padding: "9px 12px" }}
          />
          <button
            onClick={() => setMode("history")}
            style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 8, padding: "9px 14px", color: "#555", fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1.5, whiteSpace: "nowrap" }}
          >
            HISTORY
          </button>
        </div>

        {/* WORKOUT SELECTOR */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 14 }}>
          {Object.entries(PLAN.workouts).map(([key, wkt]) => {
            const active = selectedDay === key;
            return (
              <button
                key={key}
                onClick={() => setSelectedDay(key)}
                style={{
                  background: active ? wkt.color : "#0f0f0f",
                  color: active ? "#080808" : "#333",
                  border: `1px solid ${active ? wkt.color : "#1a1a1a"}`,
                  borderRadius: 10,
                  padding: "10px 6px",
                  fontFamily: "'Bebas Neue', sans-serif",
                  fontSize: 17,
                  letterSpacing: 0.5,
                  transition: "all 0.15s",
                }}
              >
                {wkt.name}
              </button>
            );
          })}
        </div>

        {/* WORKOUT HEADER */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: workout.color, lineHeight: 1 }}>{workout.name}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#333", letterSpacing: 1.5, marginTop: 3 }}>{workout.sub} · {workout.days}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 20, color: progressPct === 100 ? "#c8f060" : "#333" }}>
              {doneSets}/{totalSets}
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a", letterSpacing: 1 }}>SETS DONE</div>
          </div>
        </div>

        {/* OVERALL PROGRESS BAR */}
        <div style={{ height: 3, background: "#131313", borderRadius: 2, marginBottom: 16, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${progressPct}%`, background: workout.color, borderRadius: 2, transition: "width 0.4s ease" }} />
        </div>

        {/* AI SUGGESTIONS BUTTON */}
        {Object.keys(suggestions).length === 0 ? (
          <button
            onClick={loadSuggestions}
            disabled={sugLoading}
            style={{
              width: "100%", marginBottom: 14,
              background: sugLoading ? "#0a0a0a" : "#0d1a05",
              border: `1px solid ${sugLoading ? "#1a1a1a" : "#1e3310"}`,
              color: sugLoading ? "#333" : "#c8f060",
              borderRadius: 10, padding: "11px",
              fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 2,
            }}
          >
            {sugLoading ? <span className="shimmer">LOADING AI TARGETS...</span> : "⚡ GET TODAY'S AI TARGETS"}
          </button>
        ) : (
          <div style={{ background: "#0d1a05", border: "1px solid #1e3310", borderRadius: 10, padding: "10px 12px", marginBottom: 14 }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, letterSpacing: 2, color: "#c8f060", marginBottom: 4 }}>AI TARGETS LOADED</div>
            <div style={{ fontSize: 10, color: "#5a8a30" }}>Suggestions shown inline below each exercise</div>
          </div>
        )}
      </div>

      {/* EXERCISE CARDS */}
      <div style={{ padding: "0 16px" }}>
        {workout.exercises.map((ex, i) => {
          const exData = exerciseData[ex.id] || { sets: [] };
          const allDone = exData.sets.length > 0 && exData.sets.every(s => s.done);
          const suggestion = suggestions[ex.id];

          return (
            <ExerciseCard
              key={ex.id}
              ex={ex}
              exData={exData}
              index={i}
              suggestion={suggestion}
              allDone={allDone}
              workoutColor={workout.color}
              onUpdateSet={updateSet}
              onMarkDone={markSetDone}
            />
          );
        })}

        {/* SESSION NOTES */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#333", marginBottom: 6 }}>SESSION NOTES</div>
          <textarea
            placeholder="How'd it feel? Energy, pump, anything off..."
            rows={2}
            value={sessionNotes}
            onChange={e => setSessionNotes(e.target.value)}
            style={{ resize: "none", fontSize: 13, borderRadius: 10 }}
          />
        </div>

        {/* SAVE BUTTON */}
        <button
          onClick={handleSave}
          style={{
            width: "100%",
            background: saved ? "#0d1f05" : workout.color,
            color: saved ? workout.color : "#080808",
            border: saved ? `1px solid ${workout.color}33` : "none",
            padding: "15px",
            borderRadius: 12,
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: 22,
            letterSpacing: 1,
            marginBottom: 24,
            transition: "all 0.25s",
          }}
        >
          {saved ? `✓ SESSION SAVED` : "SAVE SESSION"}
        </button>
      </div>
    </div>
  );
}

// ─── EXERCISE CARD ────────────────────────────────────────────────────────────
function ExerciseCard({ ex, exData, index, suggestion, allDone, workoutColor, onUpdateSet, onMarkDone }) {
  const [expanded, setExpanded] = useState(true);

  const doneSets = exData.sets.filter(s => s.done).length;
  const isBodyweight = ex.startWeight === 0;

  return (
    <div style={{
      background: allDone ? "#0a140a" : "#0f0f0f",
      border: `1px solid ${allDone ? `${workoutColor}33` : "#1a1a1a"}`,
      borderRadius: 14,
      marginBottom: 10,
      overflow: "hidden",
      transition: "all 0.2s",
    }}>
      {/* Exercise Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%", background: "none", padding: "14px 14px 12px",
          display: "flex", justifyContent: "space-between", alignItems: "flex-start", textAlign: "left",
        }}
      >
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%",
              background: allDone ? workoutColor : "#1a1a1a",
              color: allDone ? "#080808" : "#333",
              fontFamily: "'DM Mono', monospace", fontSize: 9, fontWeight: 500,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
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

      {expanded && (
        <div style={{ padding: "0 14px 14px" }}>
          {/* Coach note */}
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#3a3a3a", marginBottom: suggestion ? 8 : 12, fontStyle: "italic", paddingLeft: 2 }}>
            {ex.note}
          </div>

          {/* AI Suggestion */}
          {suggestion && (
            <div style={{ background: "#0d1a05", border: "1px solid #1e3310", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#c8f060", letterSpacing: 1.5, marginBottom: 3 }}>AI TARGET</div>
              <div style={{ fontSize: 12, color: "#8ac840", lineHeight: 1.5 }}>{suggestion}</div>
            </div>
          )}

          {/* Column headers */}
          <div style={{ display: "grid", gridTemplateColumns: "32px 1fr 1fr 48px", gap: 6, marginBottom: 6 }}>
            <div />
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a", letterSpacing: 1.5, textAlign: "center" }}>
              {isBodyweight ? "BW/SECS" : "LBS"}
            </div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a", letterSpacing: 1.5, textAlign: "center" }}>REPS</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 8, color: "#2a2a2a", letterSpacing: 1.5, textAlign: "center" }}>DONE</div>
          </div>

          {/* Per-set rows */}
          {exData.sets.map((set, si) => {
            const hitTop = !isBodyweight && parseInt(set.reps) >= ex.repsMax;
            return (
              <div
                key={si}
                className="set-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr 1fr 48px",
                  gap: 6,
                  marginBottom: 6,
                  alignItems: "center",
                  opacity: set.done ? 0.6 : 1,
                }}
              >
                {/* Set label */}
                <div style={{
                  fontFamily: "'DM Mono', monospace", fontSize: 10, color: set.done ? workoutColor : "#333",
                  textAlign: "center", fontWeight: set.done ? 500 : 400,
                }}>
                  S{si + 1}
                </div>

                {/* Weight input */}
                <input
                  type="number"
                  placeholder={ex.startWeight > 0 ? String(ex.startWeight) : "—"}
                  value={set.weight}
                  min="0"
                  step={ex.increment || 1}
                  disabled={set.done}
                  onChange={e => onUpdateSet(ex.id, si, "weight", e.target.value)}
                  style={{
                    textAlign: "center", padding: "9px 6px", fontSize: 15, fontWeight: 500,
                    background: set.done ? "#0a0a0a" : "#111",
                    borderColor: hitTop && !set.done ? workoutColor : set.done ? "#0f0f0f" : "#1e1e1e",
                    borderRadius: 8,
                  }}
                />

                {/* Reps input */}
                <input
                  type="number"
                  placeholder={`${ex.repsMin}–${ex.repsMax}`}
                  value={set.reps}
                  min="0"
                  step="1"
                  disabled={set.done}
                  onChange={e => onUpdateSet(ex.id, si, "reps", e.target.value)}
                  style={{
                    textAlign: "center", padding: "9px 6px", fontSize: 15, fontWeight: 500,
                    background: set.done ? "#0a0a0a" : "#111",
                    borderColor: hitTop && !set.done ? workoutColor : set.done ? "#0f0f0f" : "#1e1e1e",
                    borderRadius: 8,
                  }}
                />

                {/* Done button */}
                <button
                  onClick={() => onMarkDone(ex.id, si, 90)}
                  style={{
                    height: 38, borderRadius: 8,
                    background: set.done ? workoutColor : "#1a1a1a",
                    color: set.done ? "#080808" : "#333",
                    fontSize: 14, fontWeight: 600,
                    border: `1px solid ${set.done ? workoutColor : "#222"}`,
                    transition: "all 0.15s",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  ✓
                </button>
              </div>
            );
          })}

          {/* Hit top-of-range hint */}
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

// ─── HISTORY VIEW ─────────────────────────────────────────────────────────────
function HistoryView({ logs, selectedDay, onSelectDay, onClose, workout }) {
  const [activeDay, setActiveDay] = useState(selectedDay);
  const [expandedDate, setExpandedDate] = useState(null);

  const wkt = PLAN.workouts[activeDay];

  // Get all sessions for this workout type, newest first
  const sessions = Object.entries(logs)
    .filter(([, wkts]) => wkts[activeDay])
    .sort(([a], [b]) => b.localeCompare(a));

  const getVolumeLabel = (sessionData) => {
    let totalVolume = 0;
    let hasData = false;
    Object.entries(sessionData).forEach(([key, val]) => {
      if (key.startsWith("_")) return;
      if (Array.isArray(val?.sets)) {
        val.sets.forEach(s => {
          if (s.weight && s.reps) {
            totalVolume += parseFloat(s.weight) * parseInt(s.reps);
            hasData = true;
          }
        });
      }
    });
    return hasData ? `${Math.round(totalVolume).toLocaleString()} lbs vol` : "Logged";
  };

  return (
    <div className="fade-in" style={{ padding: 16 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <button
          onClick={onClose}
          style={{ background: "#111", border: "1px solid #1a1a1a", borderRadius: 8, width: 36, height: 36, color: "#555", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          ←
        </button>
        <div>
          <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 22, color: wkt.color, lineHeight: 1 }}>HISTORY</div>
          <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#333", letterSpacing: 1.5 }}>{wkt.name} · {sessions.length} sessions logged</div>
        </div>
      </div>

      {/* Workout selector */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginBottom: 16 }}>
        {Object.entries(PLAN.workouts).map(([key, w]) => (
          <button
            key={key}
            onClick={() => { setActiveDay(key); setExpandedDate(null); }}
            style={{
              background: activeDay === key ? w.color : "#0f0f0f",
              color: activeDay === key ? "#080808" : "#333",
              border: `1px solid ${activeDay === key ? w.color : "#1a1a1a"}`,
              borderRadius: 10, padding: "9px 6px",
              fontFamily: "'Bebas Neue', sans-serif", fontSize: 16,
              transition: "all 0.15s",
            }}
          >
            {w.name}
          </button>
        ))}
      </div>

      {/* Session list */}
      {sessions.length === 0 ? (
        <div style={{ textAlign: "center", padding: 40, color: "#2a2a2a", fontFamily: "'DM Mono', monospace", fontSize: 11, letterSpacing: 1 }}>
          NO SESSIONS LOGGED YET
        </div>
      ) : (
        sessions.map(([date, wkts]) => {
          const sessionData = wkts[activeDay];
          const isExpanded = expandedDate === date;

          return (
            <div key={date} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 14, marginBottom: 8, overflow: "hidden" }}>
              {/* Session row */}
              <button
                onClick={() => setExpandedDate(isExpanded ? null : date)}
                style={{ width: "100%", background: "none", padding: "14px", display: "flex", justifyContent: "space-between", alignItems: "center", textAlign: "left" }}
              >
                <div>
                  <div style={{ fontSize: 14, fontWeight: 500, color: "#e2e2e2", marginBottom: 3 }}>{fmtFull(date)}</div>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#3a3a3a" }}>{getVolumeLabel(sessionData)}</div>
                </div>
                <span style={{ color: "#2a2a2a", fontSize: 11, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "none" }}>▼</span>
              </button>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ padding: "0 14px 14px", borderTop: "1px solid #151515" }}>
                  {PLAN.workouts[activeDay].exercises.map(ex => {
                    const val = sessionData[ex.id];
                    if (!val) return null;
                    const sets = Array.isArray(val.sets) ? val.sets : [];
                    const flatStr = sets.length > 0
                      ? sets.map((s, i) => `S${i+1}: ${s.weight || "BW"}×${s.reps || "?"}${s.done ? "" : " (⚪)"}`).join("  ")
                      : val.weight ? `${val.sets}×${val.reps} @ ${val.weight}lbs` : null;
                    if (!flatStr) return null;
                    return (
                      <div key={ex.id} style={{ paddingTop: 10, paddingBottom: 10, borderBottom: "1px solid #131313" }}>
                        <div style={{ fontSize: 12, fontWeight: 500, color: "#888", marginBottom: 4 }}>{ex.name}</div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#444", lineHeight: 1.7 }}>{flatStr}</div>
                      </div>
                    );
                  })}
                  {sessionData._notes && (
                    <div style={{ paddingTop: 10 }}>
                      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: "#333", marginBottom: 4, letterSpacing: 1 }}>NOTES</div>
                      <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6 }}>{sessionData._notes}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
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
  const [aiTip, setAiTip] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const totalCal = todayNutrition.meals?.reduce((s, m) => s + (parseInt(m.calories) || 0), 0) || 0;
  const totalProt = todayNutrition.meals?.reduce((s, m) => s + (parseInt(m.protein) || 0), 0) || 0;
  const isDrinkDay = todayNutrition.drinkDay;
  const macros = isDrinkDay ? DRINK_DAY_MACROS : NORMAL_MACROS;

  // Detect today's workout
  const dayWorkoutKey = getDefaultWorkout();
  const dayWorkout = PLAN.workouts[dayWorkoutKey];
  const todayLogged = todayLog[dayWorkoutKey];

  const handleSaveSleep = () => saveSleep(d, { hours: parseFloat(sleepHrs) || 0, quality: sleepQ });
  const handleSaveBW = () => saveBW(d, parseFloat(bw) || 0);

  const getAiTip = async () => {
    setAiLoading(true);
    const recentLogs = Object.entries(logs).sort(([a], [b]) => b.localeCompare(a)).slice(0, 5)
      .map(([date, wkts]) => `${date}: ${Object.keys(wkts).map(w => PLAN.workouts[w]?.name || w).join("+")}`).join(", ");
    const tip = await callClaude(
      `Today: ${d}. Recent workouts: ${recentLogs || "none"}. Sleep: ${sleepHrs || "?"}hrs. BW: ${bw || "?"}lbs. Cals so far: ${totalCal}/${macros.calories}. Protein: ${totalProt}/${macros.protein}g. Today's workout: ${dayWorkout.name}. Give a short, specific coaching tip for today.`
    );
    setAiTip(tip);
    setAiLoading(false);
  };

  return (
    <div className="fade-in" style={{ padding: 16 }}>
      <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, marginBottom: 16, color: "#555" }}>{fmtFull(d)}</div>

      {/* TODAY'S WORKOUT CARD */}
      <div
        style={{ background: `linear-gradient(135deg, #0f1a08, #0a0a0a)`, border: `1px solid ${dayWorkout.color}22`, borderRadius: 14, padding: 16, marginBottom: 14, cursor: "pointer" }}
        onClick={() => setTab("workout")}
      >
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, color: dayWorkout.color, letterSpacing: 2, marginBottom: 6 }}>TODAY'S WORKOUT</div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 28, color: dayWorkout.color, lineHeight: 1 }}>{dayWorkout.name}</div>
            <div style={{ fontSize: 12, color: "#444", marginTop: 3 }}>{dayWorkout.sub}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            {todayLogged ? (
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "#c8f060" }}>✓ LOGGED</div>
            ) : (
              <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 18, color: "#333" }}>START →</div>
            )}
          </div>
        </div>
      </div>

      {/* QUICK STATS */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { label: "CALORIES", val: `${totalCal}`, sub: `/ ${macros.calories}`, color: totalCal >= macros.calories * 0.9 ? "#c8f060" : "#f0a040" },
          { label: "PROTEIN", val: `${totalProt}g`, sub: `/ ${macros.protein}g`, color: totalProt >= macros.protein * 0.9 ? "#c8f060" : "#f0a040" },
          { label: "SLEEP", val: sleepHrs ? `${sleepHrs}h` : "—", sub: sleepQ || "log it", color: parseFloat(sleepHrs) >= 7 ? "#c8f060" : "#f06060" },
        ].map(s => (
          <div key={s.label} style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: "12px 10px" }}>
            <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: 24, color: s.color, lineHeight: 1 }}>{s.val}</div>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 7, letterSpacing: 1.5, color: "#2a2a2a", marginTop: 3 }}>{s.label}</div>
            <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{s.sub}</div>
          </div>
        ))}
      </div>

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
        {bodyweight[d] && (
          <div style={{ fontSize: 11, color: "#444", marginTop: 8 }}>
            {bodyweight[d]} lbs · {(bodyweight[d] - PLAN.targetWeight).toFixed(1)} lbs from goal
          </div>
        )}
      </div>

      {/* SLEEP LOG */}
      <div style={{ background: "#0f0f0f", border: "1px solid #1a1a1a", borderRadius: 12, padding: 14, marginBottom: 10 }}>
        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 2, color: "#2a2a2a", marginBottom: 10 }}>SLEEP</div>
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
