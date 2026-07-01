"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Envelope, Lock, Eye, EyeSlash } from "@phosphor-icons/react"

// ─────────────────────────────────────────────────────────
// Agent Network SVG
// ─────────────────────────────────────────────────────────

const NODES = [
  { id: "search",    x: 78,  y: 100, label: "search",    sublabel: "LinkedIn · Indeed",  color: "oklch(0.62 0.120 195)" },
  { id: "watchlist", x: 78,  y: 240, label: "watchlist", sublabel: "VIP companies",       color: "oklch(0.58 0.110 200)" },
  { id: "crawler",   x: 78,  y: 380, label: "crawler",   sublabel: "Career pages",        color: "oklch(0.56 0.105 205)" },
  { id: "filter",    x: 220, y: 240, label: "filter",    sublabel: "Prefs match",         color: "oklch(0.60 0.100 165)" },
  { id: "tailor",    x: 352, y: 240, label: "tailor",    sublabel: "RAG resume",          color: "oklch(0.58 0.110 185)" },
  { id: "apply",     x: 468, y: 128, label: "apply",     sublabel: "ATS submit",          color: "oklch(0.56 0.120 215)" },
  { id: "outreach",  x: 468, y: 240, label: "outreach",  sublabel: "Cold email",          color: "oklch(0.54 0.110 225)" },
  { id: "reporter",  x: 468, y: 352, label: "reporter",  sublabel: "Slack summary",       color: "oklch(0.56 0.115 200)" },
]

// Bezier paths — id, d, dur (animation speed), delay
const EDGES = [
  { id: "e1", d: "M 106 100 C 160 100 168 240 192 240",     dur: "2.2s", delay: "0s"    },
  { id: "e2", d: "M 106 240 L 192 240",                      dur: "1.6s", delay: "0.3s"  },
  { id: "e3", d: "M 106 380 C 160 380 168 240 192 240",     dur: "2.2s", delay: "0.6s"  },
  { id: "e4", d: "M 248 240 L 324 240",                      dur: "1.4s", delay: "0.9s"  },
  { id: "e5", d: "M 380 240 C 424 240 424 128 440 128",     dur: "1.8s", delay: "1.3s"  },
  { id: "e6", d: "M 380 240 L 440 240",                      dur: "1.4s", delay: "1.6s"  },
  { id: "e7", d: "M 380 240 C 424 240 424 352 440 352",     dur: "1.8s", delay: "1.9s"  },
]

// Flat-top hex polygon (r=22) for nodes
const HEX = "22,0 11,19.05 -11,19.05 -22,0 -11,-19.05 11,-19.05"

function AgentNetwork() {
  return (
    <svg
      viewBox="0 0 556 480"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
      aria-hidden
    >
      <defs>
        {/* Edge paths for animateMotion */}
        {EDGES.map(({ id, d }) => <path key={id} id={id} d={d} fill="none" />)}

        {/* Glow filter */}
        <filter id="node-glow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <filter id="edge-glow" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>

        {/* Gradient for edges */}
        <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stopColor="oklch(0.56 0.115 200)" stopOpacity="0.08" />
          <stop offset="50%"  stopColor="oklch(0.56 0.115 200)" stopOpacity="0.30" />
          <stop offset="100%" stopColor="oklch(0.56 0.115 200)" stopOpacity="0.08" />
        </linearGradient>
      </defs>

      {/* ── Edge strokes ── */}
      {EDGES.map(({ id, d }) => (
        <path
          key={id}
          d={d}
          fill="none"
          stroke="oklch(0.56 0.115 200 / 0.18)"
          strokeWidth="1"
          filter="url(#edge-glow)"
        />
      ))}

      {/* ── Traveling data packets ── */}
      {EDGES.map(({ id, dur, delay }) => (
        <circle key={`dot-${id}`} r="3.5" fill="oklch(0.72 0.130 195)" filter="url(#edge-glow)">
          <animateMotion
            dur={dur}
            begin={delay}
            repeatCount="indefinite"
            rotate="none"
          >
            <mpath href={`#${id}`} />
          </animateMotion>
          <animate attributeName="opacity" values="0;1;1;0" dur={dur} begin={delay} repeatCount="indefinite" />
        </circle>
      ))}

      {/* ── Nodes ── */}
      {NODES.map(({ id, x, y, label, sublabel, color }, i) => (
        <g key={id} transform={`translate(${x},${y})`} filter="url(#node-glow)">
          {/* Outer pulse ring */}
          <polygon
            points={HEX}
            fill="none"
            stroke={color}
            strokeWidth="1"
            opacity="0.15"
            transform="scale(1.65)"
          >
            <animate
              attributeName="opacity"
              values="0.15;0.05;0.15"
              dur={`${3.2 + i * 0.4}s`}
              repeatCount="indefinite"
            />
            <animateTransform
              attributeName="transform"
              type="scale"
              values="1.55;1.75;1.55"
              dur={`${3.2 + i * 0.4}s`}
              repeatCount="indefinite"
            />
          </polygon>

          {/* Mid ring */}
          <polygon
            points={HEX}
            fill="none"
            stroke={color}
            strokeWidth="0.8"
            opacity="0.22"
            transform="scale(1.28)"
          />

          {/* Main hex fill */}
          <polygon
            points={HEX}
            fill={`${color.replace(")", " / 0.12)").replace("oklch(", "oklch(")}`}
            stroke={color}
            strokeWidth="1.2"
          />

          {/* Inner hex accent */}
          <polygon
            points={HEX}
            fill="none"
            stroke="oklch(1 0 0 / 0.08)"
            strokeWidth="0.5"
            transform="scale(0.65)"
          />

          {/* Status dot */}
          <circle cx="14" cy="-14" r="3.5" fill="oklch(0.62 0.130 160)">
            <animate attributeName="opacity" values="1;0.4;1" dur={`${2 + i * 0.3}s`} repeatCount="indefinite" />
          </circle>

          {/* Label */}
          <text
            x={id === "search" || id === "watchlist" || id === "crawler" ? -32 : 32}
            y="-6"
            textAnchor={id === "search" || id === "watchlist" || id === "crawler" ? "end" : "start"}
            fill="oklch(0.820 0.010 228)"
            fontSize="11"
            fontFamily="var(--font-mono, monospace)"
            fontWeight="500"
          >
            {label}_agent
          </text>
          <text
            x={id === "search" || id === "watchlist" || id === "crawler" ? -32 : 32}
            y="8"
            textAnchor={id === "search" || id === "watchlist" || id === "crawler" ? "end" : "start"}
            fill="oklch(0.440 0.010 228)"
            fontSize="9"
            fontFamily="var(--font-mono, monospace)"
          >
            {sublabel}
          </text>
        </g>
      ))}
    </svg>
  )
}

// ─────────────────────────────────────────────────────────
// Terminal log
// ─────────────────────────────────────────────────────────

const LOG_LINES = [
  { time: "09:00:01", agent: "search_agent",    msg: "8 new jobs found on LinkedIn" },
  { time: "09:00:03", agent: "watchlist_agent", msg: "Stripe · Vercel checked" },
  { time: "09:00:05", agent: "crawler_agent",   msg: "14 career pages crawled" },
  { time: "09:00:07", agent: "filter_node",     msg: "5 jobs match preferences" },
  { time: "09:00:09", agent: "tailor_agent",    msg: "resume tailored for Stripe" },
  { time: "09:00:14", agent: "apply_agent",     msg: "submitted to Stripe · confirmed" },
  { time: "09:00:18", agent: "outreach_agent",  msg: "drafted msg for 2 contacts" },
  { time: "09:00:21", agent: "reporter_agent",  msg: "Slack summary posted ✓" },
]

function TerminalLog() {
  const [visibleLines, setVisibleLines] = useState(1)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (visibleLines >= LOG_LINES.length) return
    const t = setTimeout(() => setVisibleLines((v) => v + 1), 900)
    return () => clearTimeout(t)
  }, [visibleLines])

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight
  }, [visibleLines])

  return (
    <div
      ref={ref}
      style={{
        fontFamily: "var(--font-mono, monospace)",
        fontSize: "10px",
        lineHeight: "1.7",
        color: "oklch(0.500 0.010 228)",
        overflow: "hidden",
        maxHeight: "138px",
        display: "flex",
        flexDirection: "column",
        gap: "1px",
      }}
    >
      {LOG_LINES.slice(0, visibleLines).map((l, i) => (
        <div key={i} style={{ display: "flex", gap: "10px", opacity: i < visibleLines - 1 ? 0.6 : 1, transition: "opacity 0.4s" }}>
          <span style={{ color: "oklch(0.360 0.008 228)", flexShrink: 0 }}>{l.time}</span>
          <span style={{ color: "oklch(0.620 0.115 195)", flexShrink: 0 }}>{l.agent}</span>
          <span style={{ color: "oklch(0.580 0.010 228)" }}>{l.msg}</span>
        </div>
      ))}
      {/* Blinking cursor */}
      <span
        style={{ display: "inline-block", width: "6px", height: "10px", backgroundColor: "oklch(0.560 0.115 200)", marginLeft: "2px", verticalAlign: "middle" }}
      >
        <animate attributeName="opacity" values="1;0;1" dur="1s" repeatCount="indefinite" />
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Left panel
// ─────────────────────────────────────────────────────────

function LeftPanel() {
  return (
    <>
      <style>{`
        @keyframes cube-spin {
          from { transform: rotateX(-18deg) rotateY(0deg); }
          to   { transform: rotateX(-18deg) rotateY(360deg); }
        }
        @keyframes float-badge {
          0%, 100% { transform: translateY(0px); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes blink-cur {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cube-spin    { animation: none !important; }
          .float-badge  { animation: none !important; }
        }
      `}</style>

      {/* Deep bg gradient */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 70% at 55% 50%, oklch(0.560 0.115 200 / 0.09) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Hex grid texture */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: [
          "repeating-linear-gradient(0deg, transparent, transparent 39px, oklch(1 0 0 / 0.016) 40px)",
          "repeating-linear-gradient(90deg, transparent, transparent 39px, oklch(1 0 0 / 0.016) 40px)",
        ].join(", "),
      }} />

      {/* 3D cube — centered bg */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: 240, height: 240,
        marginLeft: -120, marginTop: -120,
        perspective: "700px",
        pointerEvents: "none", zIndex: 0,
      }}>
        <div
          className="cube-spin"
          style={{
            width: 240, height: 240,
            position: "relative",
            transformStyle: "preserve-3d",
            animation: "cube-spin 40s linear infinite",
          }}
        >
          {["translateZ(120px)", "rotateY(180deg) translateZ(120px)", "rotateY(90deg) translateZ(120px)", "rotateY(-90deg) translateZ(120px)", "rotateX(90deg) translateZ(120px)", "rotateX(-90deg) translateZ(120px)"].map((t, i) => (
            <div
              key={i}
              style={{
                position: "absolute", inset: 0,
                border: "1px solid oklch(0.560 0.115 200 / 0.14)",
                background: [
                  "repeating-linear-gradient(0deg,transparent,transparent 59px,oklch(0.560 0.115 200 / 0.05) 60px)",
                  "repeating-linear-gradient(90deg,transparent,transparent 59px,oklch(0.560 0.115 200 / 0.05) 60px)",
                  "oklch(0.560 0.115 200 / 0.02)",
                ].join(", "),
                transform: t,
              }}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1, width: "100%", height: "100%", display: "flex", flexDirection: "column", padding: "48px 44px" }}>

        {/* Logo + brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "auto" }}>
          <div style={{
            width: 36, height: 36, borderRadius: "10px", flexShrink: 0,
            background: "linear-gradient(145deg, oklch(0.66 0.125 200), oklch(0.44 0.100 210))",
            boxShadow: "0 4px 16px oklch(0.560 0.115 200 / 0.50), inset 0 1px 0 oklch(1 0 0 / 0.22)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="17" height="17" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5L12.5 4.75V10.25L7 13.5L1.5 10.25V4.75L7 1.5Z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M7 1.5V13.5M1.5 4.75L12.5 4.75M1.5 10.25L12.5 10.25" stroke="white" strokeWidth="1.1" />
            </svg>
          </div>
          <div>
            <span style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "-0.02em", color: "oklch(0.880 0.008 228)", display: "block", lineHeight: 1 }}>Invictus</span>
            <span style={{ fontSize: "10px", color: "oklch(0.380 0.008 228)", letterSpacing: "0.03em" }}>AUTONOMOUS JOB SYSTEM</span>
          </div>
        </div>

        {/* Hero text */}
        <div style={{ marginTop: "36px" }}>
          <p style={{ fontSize: "10px", fontFamily: "var(--font-mono)", color: "oklch(0.560 0.115 200)", letterSpacing: "0.14em", marginBottom: "10px" }}>
            MULTI-AGENT PIPELINE
          </p>
          <h1 style={{
            fontSize: "clamp(28px, 3.2vw, 38px)",
            fontWeight: 700,
            letterSpacing: "-0.03em",
            lineHeight: 1.08,
            color: "oklch(0.900 0.008 228)",
            marginBottom: "12px",
            textWrap: "balance",
          }}>
            8 agents.<br />
            Running while<br />
            you sleep.
          </h1>
          <p style={{ fontSize: "13px", color: "oklch(0.440 0.010 228)", lineHeight: 1.6, maxWidth: "300px" }}>
            Discovers jobs, tailors your resume, submits applications, and drafts outreach — every hour, automatically.
          </p>
        </div>

        {/* Agent network SVG */}
        <div style={{ flex: 1, minHeight: 0, marginTop: "28px", marginLeft: "-8px", marginRight: "-8px" }}>
          <AgentNetwork />
        </div>

        {/* Terminal card */}
        <div style={{
          marginTop: "16px",
          borderRadius: "14px",
          padding: "16px 18px",
          background: "oklch(0.10 0.013 228 / 0.70)",
          border: "1px solid oklch(0.220 0.014 228)",
          backdropFilter: "blur(12px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
            <div style={{ display: "flex", gap: "5px" }}>
              {["oklch(0.65 0.18 25)", "oklch(0.72 0.16 80)", "oklch(0.62 0.14 155)"].map((c) => (
                <div key={c} style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: c }} />
              ))}
            </div>
            <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "oklch(0.360 0.008 228)", letterSpacing: "0.08em" }}>
              run · hourly · live
            </span>
            <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "5px" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "oklch(0.62 0.130 160)", display: "inline-block" }}>
              </span>
              <span style={{ fontSize: "9px", fontFamily: "var(--font-mono)", color: "oklch(0.500 0.010 228)" }}>active</span>
            </div>
          </div>
          <TerminalLog />
        </div>

        {/* Stats row */}
        <div style={{ display: "flex", gap: "20px", marginTop: "16px" }}>
          {[
            { val: "47", label: "applications" },
            { val: "8",  label: "interviews" },
            { val: "3h", label: "saved / day" },
          ].map(({ val, label }) => (
            <div key={label}>
              <div style={{ fontSize: "18px", fontWeight: 700, fontFamily: "var(--font-mono)", color: "oklch(0.820 0.010 228)", letterSpacing: "-0.02em", lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: "9.5px", color: "oklch(0.380 0.008 228)", marginTop: "2px", letterSpacing: "0.04em" }}>{label}</div>
            </div>
          ))}
        </div>

      </div>
    </>
  )
}

// ─────────────────────────────────────────────────────────
// Right panel — sign in form
// ─────────────────────────────────────────────────────────

const inputDark: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px 11px 38px",
  borderRadius: "10px",
  fontSize: "13px",
  outline: "none",
  backgroundColor: "oklch(0.09 0.012 230 / 0.80)",
  border: "1px solid oklch(0.260 0.014 228)",
  color: "oklch(0.880 0.008 228)",
  transition: "border-color 0.18s cubic-bezier(0.23,1,0.32,1)",
}

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const supabase = createBrowserSupabaseClient()

  async function handleGoogle() {
    setGoogleLoading(true); setError(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) { setError(error.message); setGoogleLoading(false) }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setMessage(null); setLoading(true)

    if (tab === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push("/dashboard"); router.refresh()
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      setMessage("Account created — taking you to setup...")
      setTimeout(() => { router.push("/onboard"); router.refresh() }, 1000)
    }
    setLoading(false)
  }

  return (
    <>
      <style>{`
        @keyframes panel-in {
          from { opacity: 0; transform: translateX(20px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes left-in {
          from { opacity: 0; transform: translateX(-16px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @media (prefers-reduced-motion: reduce) {
          .panel-in { animation: none !important; }
          .left-in  { animation: none !important; }
        }
      `}</style>

      <div style={{ display: "flex", width: "100%", minHeight: "100dvh" }}>

        {/* ── Left: visualization (hidden on mobile) ──── */}
        <style>{`
          @media (min-width: 768px) {
            .left-panel { display: block !important; }
          }
        `}</style>
        <div
          className="left-panel"
          style={{
            display: "none",
            flex: "1 1 0",
            position: "relative",
            overflow: "hidden",
            borderRight: "1px solid oklch(0.200 0.014 228)",
            animation: "left-in 0.65s cubic-bezier(0.23,1,0.32,1) both",
          }}
        >
          <LeftPanel />
        </div>

        {/* ── Right: sign in ───────────────────────── */}
        <div
          className="panel-in"
          style={{
            width: "100%",
            maxWidth: "440px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 36px",
            position: "relative",
            animation: "panel-in 0.55s cubic-bezier(0.23,1,0.32,1) 0.12s both",
            borderLeft: "1px solid oklch(0.140 0.014 228 / 0)",
          }}
        >
          {/* Subtle inner glow */}
          <div style={{
            position: "absolute", top: 0, right: 0, width: "100%", height: "100%",
            background: "radial-gradient(ellipse 90% 60% at 60% 30%, oklch(0.560 0.115 200 / 0.05) 0%, transparent 70%)",
            pointerEvents: "none",
          }} />

          <div style={{ width: "100%", maxWidth: "360px", position: "relative" }}>

            {/* Logo — mobile only */}
            <div className="md-hide" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "28px", justifyContent: "center" }}>
              <style>{`@media (min-width: 768px) { .md-hide { display: none !important; } }`}</style>
              <div style={{ width: 30, height: 30, borderRadius: "8px", background: "linear-gradient(145deg, oklch(0.66 0.125 200), oklch(0.44 0.100 210))", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 12px oklch(0.560 0.115 200 / 0.45)" }}>
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1.5L12.5 4.75V10.25L7 13.5L1.5 10.25V4.75L7 1.5Z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
                  <path d="M7 1.5V13.5M1.5 4.75L12.5 4.75M1.5 10.25L12.5 10.25" stroke="white" strokeWidth="1.1" />
                </svg>
              </div>
              <span style={{ fontSize: "16px", fontWeight: 600, color: "oklch(0.880 0.008 228)" }}>Invictus</span>
            </div>

            {/* Heading */}
            <h2 style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "-0.03em", color: "oklch(0.900 0.008 228)", marginBottom: "4px" }}>
              {tab === "signin" ? "Welcome back" : "Get started"}
            </h2>
            <p style={{ fontSize: "13px", color: "oklch(0.420 0.010 228)", marginBottom: "28px" }}>
              {tab === "signin" ? "Sign in to your dashboard" : "Create your Invictus account"}
            </p>

            {/* Google OAuth */}
            <button
              onClick={handleGoogle}
              disabled={googleLoading}
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "10px",
                padding: "11px 16px",
                borderRadius: "10px",
                fontSize: "13px",
                fontWeight: 500,
                cursor: googleLoading ? "not-allowed" : "pointer",
                opacity: googleLoading ? 0.7 : 1,
                background: "oklch(0.15 0.016 228)",
                border: "1px solid oklch(0.260 0.014 228)",
                color: "oklch(0.840 0.008 228)",
                transition: "background 0.18s cubic-bezier(0.23,1,0.32,1), border-color 0.18s cubic-bezier(0.23,1,0.32,1)",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "oklch(0.18 0.016 228)"; e.currentTarget.style.borderColor = "oklch(0.320 0.014 228)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "oklch(0.15 0.016 228)"; e.currentTarget.style.borderColor = "oklch(0.260 0.014 228)" }}
            >
              {/* Google G logo */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {googleLoading ? "Redirecting..." : "Continue with Google"}
            </button>

            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "20px 0" }}>
              <div style={{ flex: 1, height: 1, backgroundColor: "oklch(0.220 0.014 228)" }} />
              <span style={{ fontSize: "11px", color: "oklch(0.360 0.008 228)", letterSpacing: "0.06em" }}>OR</span>
              <div style={{ flex: 1, height: 1, backgroundColor: "oklch(0.220 0.014 228)" }} />
            </div>

            {/* Tab switcher */}
            <div style={{ display: "flex", marginBottom: "22px", padding: "3px", borderRadius: "10px", backgroundColor: "oklch(0.10 0.012 228)", gap: "3px" }}>
              {(["signin", "signup"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(null); setMessage(null) }}
                  style={{
                    flex: 1, padding: "8px", borderRadius: "8px",
                    fontSize: "12px", fontWeight: 500,
                    cursor: "pointer", border: "none",
                    transition: "background 0.18s cubic-bezier(0.23,1,0.32,1), color 0.18s cubic-bezier(0.23,1,0.32,1), box-shadow 0.18s cubic-bezier(0.23,1,0.32,1)",
                    background: tab === t ? "oklch(0.18 0.016 228)" : "transparent",
                    color: tab === t ? "oklch(0.880 0.008 228)" : "oklch(0.400 0.010 228)",
                    boxShadow: tab === t ? "0 1px 3px oklch(0.04 0.010 230 / 0.60), inset 0 1px 0 oklch(1 0 0 / 0.05)" : "none",
                  }}
                >
                  {t === "signin" ? "Sign in" : "Sign up"}
                </button>
              ))}
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Email */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", color: "oklch(0.460 0.010 228)" }}>
                  EMAIL
                </label>
                <div style={{ position: "relative" }}>
                  <Envelope size={14} weight="duotone" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "oklch(0.380 0.008 228)", pointerEvents: "none" }} />
                  <input
                    type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    required placeholder="you@example.com"
                    style={inputDark}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "oklch(0.560 0.115 200 / 0.65)"; e.currentTarget.style.boxShadow = "0 0 0 3px oklch(0.560 0.115 200 / 0.10)" }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "oklch(0.260 0.014 228)"; e.currentTarget.style.boxShadow = "none" }}
                  />
                </div>
              </div>

              {/* Password */}
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <label style={{ fontSize: "11px", fontWeight: 500, letterSpacing: "0.06em", color: "oklch(0.460 0.010 228)" }}>
                  PASSWORD
                </label>
                <div style={{ position: "relative" }}>
                  <Lock size={14} weight="duotone" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "oklch(0.380 0.008 228)", pointerEvents: "none" }} />
                  <input
                    type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                    required placeholder="••••••••"
                    style={{ ...inputDark, paddingRight: "40px" }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "oklch(0.560 0.115 200 / 0.65)"; e.currentTarget.style.boxShadow = "0 0 0 3px oklch(0.560 0.115 200 / 0.10)" }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "oklch(0.260 0.014 228)"; e.currentTarget.style.boxShadow = "none" }}
                  />
                  <button
                    type="button" onClick={() => setShowPw(!showPw)}
                    style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", color: "oklch(0.380 0.008 228)", cursor: "pointer", background: "none", border: "none", padding: 0, lineHeight: 0 }}
                  >
                    {showPw ? <EyeSlash size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Feedback */}
              {error && (
                <div style={{ padding: "9px 12px", borderRadius: "9px", backgroundColor: "oklch(0.32 0.110 15 / 0.18)", border: "1px solid oklch(0.520 0.200 15 / 0.28)", color: "oklch(0.700 0.140 20)", fontSize: "12px" }}>
                  {error}
                </div>
              )}
              {message && (
                <div style={{ padding: "9px 12px", borderRadius: "9px", backgroundColor: "oklch(0.30 0.090 150 / 0.20)", border: "1px solid oklch(0.560 0.115 200 / 0.28)", color: "oklch(0.680 0.100 170)", fontSize: "12px" }}>
                  {message}
                </div>
              )}

              {/* Submit */}
              <button
                type="submit" disabled={loading}
                style={{
                  marginTop: "2px",
                  width: "100%", padding: "12px",
                  borderRadius: "10px", fontSize: "13px", fontWeight: 600,
                  cursor: loading ? "not-allowed" : "pointer",
                  opacity: loading ? 0.7 : 1,
                  border: "none",
                  background: "linear-gradient(135deg, oklch(0.640 0.128 193), oklch(0.490 0.112 212))",
                  color: "white",
                  transition: "opacity 0.18s, transform 0.14s cubic-bezier(0.23,1,0.32,1)",
                  boxShadow: "0 8px 24px oklch(0.560 0.115 200 / 0.35), 0 1px 0 oklch(1 0 0 / 0.12) inset",
                }}
                onMouseEnter={(e) => { if (!loading) e.currentTarget.style.transform = "translateY(-1px)" }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)" }}
                onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.97)" }}
                onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(-1px)" }}
              >
                {loading ? "..." : tab === "signin" ? "Sign in" : "Create account"}
              </button>
            </form>

            {/* Footer link */}
            <p style={{ textAlign: "center", fontSize: "11.5px", marginTop: "20px", color: "oklch(0.360 0.008 228)" }}>
              {tab === "signin"
                ? <>No account?{" "}<button onClick={() => setTab("signup")} style={{ color: "oklch(0.620 0.115 195)", background: "none", border: "none", cursor: "pointer", fontSize: "11.5px", padding: 0 }}>Create one</button></>
                : <>Have one?{" "}<button onClick={() => setTab("signin")} style={{ color: "oklch(0.620 0.115 195)", background: "none", border: "none", cursor: "pointer", fontSize: "11.5px", padding: 0 }}>Sign in</button></>
              }
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
