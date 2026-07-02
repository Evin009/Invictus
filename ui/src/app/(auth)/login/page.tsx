"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Envelope, Lock, Eye, EyeSlash } from "@phosphor-icons/react"

// ─────────────────────────────────────────────────────────
// Dark pipeline graph — agent network visualization
// ─────────────────────────────────────────────────────────

const TEAL = "oklch(0.580 0.120 200)"
const DARK_BG = "oklch(0.068 0.018 230)"

const W = 520
const H = 490

interface GraphNode { id: string; label: string; sub: string; x: number; y: number }
interface GraphEdge { from: string; to: string; dur: number }

const GRAPH_NODES: GraphNode[] = [
  { id: "search",    label: "search",    sub: "job boards",   x: 100, y: 95  },
  { id: "watchlist", label: "watchlist", sub: "VIP radar",    x: 260, y: 55  },
  { id: "crawler",   label: "crawler",   sub: "career pages", x: 420, y: 95  },
  { id: "filter",    label: "filter",    sub: "prefs match",  x: 260, y: 190 },
  { id: "tailor",    label: "tailor",    sub: "RAG resume",   x: 260, y: 295 },
  { id: "apply",     label: "apply",     sub: "ATS submit",   x: 120, y: 390 },
  { id: "outreach",  label: "outreach",  sub: "cold email",   x: 400, y: 390 },
  { id: "reporter",  label: "reporter",  sub: "Slack alert",  x: 260, y: 465 },
]

const GRAPH_EDGES: GraphEdge[] = [
  { from: "search",    to: "filter",   dur: 2.2 },
  { from: "watchlist", to: "filter",   dur: 1.8 },
  { from: "crawler",   to: "filter",   dur: 2.5 },
  { from: "filter",    to: "tailor",   dur: 1.6 },
  { from: "tailor",    to: "apply",    dur: 2.0 },
  { from: "tailor",    to: "outreach", dur: 2.0 },
  { from: "apply",     to: "reporter", dur: 1.8 },
  { from: "outreach",  to: "reporter", dur: 1.8 },
]

function getNode(id: string): GraphNode {
  return GRAPH_NODES.find(n => n.id === id)!
}

function edgePath(from: GraphNode, to: GraphNode): string {
  const mid = (from.y + to.y) / 2
  return `M ${from.x} ${from.y} C ${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${to.y}`
}

function PipelineViz() {
  return (
    <div aria-hidden style={{ position: "relative", width: W, height: H, flexShrink: 0 }}>

      {/* Ambient center glow */}
      <div style={{
        position: "absolute",
        left: "50%", top: "44%",
        transform: "translate(-50%, -50%)",
        width: 340, height: 300,
        background: "radial-gradient(ellipse at center, oklch(0.560 0.120 200 / 0.10) 0%, transparent 70%)",
        borderRadius: "50%",
        pointerEvents: "none",
      }} />

      {/* SVG connection layer */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <filter id="dot-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="line-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {GRAPH_EDGES.map((edge, i) => {
          const from = getNode(edge.from)
          const to   = getNode(edge.to)
          const d    = edgePath(from, to)
          return (
            <g key={`e${i}`}>
              {/* Base dim line */}
              <path
                id={`ep${i}`}
                d={d}
                fill="none"
                stroke="oklch(0.560 0.120 200 / 0.14)"
                strokeWidth="1.5"
              />
              {/* Soft glow overlay */}
              <path
                d={d}
                fill="none"
                stroke="oklch(0.560 0.120 200 / 0.07)"
                strokeWidth="5"
                filter="url(#line-glow)"
              />
              {/* Primary moving dot */}
              <circle r="3" fill={TEAL} filter="url(#dot-glow)">
                <animateMotion dur={`${edge.dur}s`} repeatCount="indefinite" begin={`${-(i * 0.55)}s`}>
                  <mpath href={`#ep${i}`} />
                </animateMotion>
              </circle>
              {/* Secondary dot offset by half period */}
              <circle r="1.8" fill="oklch(0.820 0.055 200)" filter="url(#dot-glow)" opacity="0.70">
                <animateMotion dur={`${edge.dur}s`} repeatCount="indefinite" begin={`${-(i * 0.55 + edge.dur * 0.5)}s`}>
                  <mpath href={`#ep${i}`} />
                </animateMotion>
              </circle>
            </g>
          )
        })}
      </svg>

      {/* Agent node cards */}
      {GRAPH_NODES.map((node, i) => (
        <div
          key={node.id}
          className="agent-node"
          style={{
            position: "absolute",
            left: node.x,
            top: node.y,
            transform: "translate(-50%, -50%)",
            padding: "7px 12px 7px 10px",
            borderRadius: "10px",
            backgroundColor: "oklch(0.110 0.022 228 / 0.96)",
            border: "1px solid oklch(0.560 0.120 200 / 0.28)",
            boxShadow: "0 0 0 1px oklch(0.560 0.120 200 / 0.06), 0 4px 16px oklch(0 0 0 / 0.55)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            animationDelay: `${i * 0.22}s`,
          }}
        >
          <span
            className="node-dot"
            style={{
              width: 5, height: 5, borderRadius: "50%",
              backgroundColor: TEAL,
              flexShrink: 0,
              boxShadow: `0 0 6px ${TEAL}`,
              animationDelay: `${i * 0.40}s`,
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
            <span style={{
              fontSize: "10.5px", fontWeight: 600,
              fontFamily: "var(--font-mono)",
              color: "oklch(0.860 0.018 218)",
              letterSpacing: "-0.01em",
              whiteSpace: "nowrap",
            }}>
              {node.label}_agent
            </span>
            <span style={{
              fontSize: "9px",
              color: "oklch(0.500 0.022 222)",
              fontFamily: "var(--font-mono)",
              whiteSpace: "nowrap",
            }}>
              {node.sub}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Right panel — dark theme
// ─────────────────────────────────────────────────────────

function RightPanel() {
  return (
    <div style={{
      position: "relative",
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      backgroundColor: DARK_BG,
    }}>

      {/* Fine teal dot grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, oklch(0.560 0.120 200 / 0.055) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage: "radial-gradient(ellipse 82% 72% at 50% 46%, black 12%, transparent 82%)",
        WebkitMaskImage: "radial-gradient(ellipse 82% 72% at 50% 46%, black 12%, transparent 82%)",
      }} />

      {/* Top-right accent glow */}
      <div style={{
        position: "absolute", top: -100, right: -100,
        width: 320, height: 320,
        background: "radial-gradient(circle, oklch(0.560 0.120 200 / 0.07) 0%, transparent 70%)",
        borderRadius: "50%",
        pointerEvents: "none",
      }} />

      {/* Bottom-left accent glow */}
      <div style={{
        position: "absolute", bottom: -80, left: -80,
        width: 260, height: 260,
        background: "radial-gradient(circle, oklch(0.420 0.090 240 / 0.06) 0%, transparent 70%)",
        borderRadius: "50%",
        pointerEvents: "none",
      }} />

      {/* Headline */}
      <div style={{ position: "relative", padding: "44px 52px 0", flexShrink: 0 }}>
        <h2 style={{
          fontSize: "clamp(20px, 1.8vw, 26px)",
          fontWeight: 650,
          letterSpacing: "-0.03em",
          color: "oklch(0.920 0.012 218)",
          lineHeight: 1.2,
          // @ts-ignore
          textWrap: "balance",
        }}>
          Eight agents. Running while you sleep.
        </h2>
        <p style={{
          fontSize: "13px",
          color: "oklch(0.505 0.018 222)",
          marginTop: "6px",
          maxWidth: "44ch",
          lineHeight: 1.55,
        }}>
          Discovers jobs, tailors your resume, submits applications, and drafts outreach — every hour, on its own.
        </p>
      </div>

      {/* Pipeline visualization */}
      <div style={{
        position: "relative", flex: 1, minHeight: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div className="stage-fit">
          <PipelineViz />
        </div>
      </div>

    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Login page
// ─────────────────────────────────────────────────────────

const inputLight: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px 11px 38px",
  borderRadius: "10px",
  fontSize: "13.5px",
  outline: "none",
  backgroundColor: "oklch(1 0 0)",
  border: "1px solid oklch(0.880 0.006 218)",
  color: "oklch(0.150 0.012 226)",
  transition: "border-color 0.18s cubic-bezier(0.23,1,0.32,1), box-shadow 0.18s cubic-bezier(0.23,1,0.32,1)",
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
      options: { redirectTo: `${window.location.origin}/auth/callback` },
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

  const focusOn = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "oklch(0.560 0.115 200 / 0.70)"
    e.currentTarget.style.boxShadow = "0 0 0 3px oklch(0.560 0.115 200 / 0.12)"
  }
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "oklch(0.880 0.006 218)"
    e.currentTarget.style.boxShadow = "none"
  }

  return (
    <>
      <style>{`
        @keyframes node-pulse {
          0%, 100% { box-shadow: 0 0 0 1px oklch(0.560 0.120 200 / 0.06), 0 4px 16px oklch(0 0 0 / 0.55); }
          50%       { box-shadow: 0 0 0 1px oklch(0.560 0.120 200 / 0.20), 0 4px 16px oklch(0 0 0 / 0.55), 0 0 30px oklch(0.560 0.120 200 / 0.12); }
        }
        @keyframes node-dot-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.20; }
        }
        @keyframes chip-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.30; }
        }
        @keyframes form-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes stage-in {
          from { opacity: 0; transform: scale(0.94); }
          to   { opacity: 1; transform: scale(1); }
        }

        .agent-node { animation: node-pulse 3.2s cubic-bezier(0.45,0,0.55,1) infinite; }
        .node-dot   { animation: node-dot-pulse 2.5s cubic-bezier(0.45,0,0.55,1) infinite; }
        .chip-dot   { animation: chip-pulse 2.6s cubic-bezier(0.45,0,0.55,1) infinite; }
        .form-in    { animation: form-in 0.5s cubic-bezier(0.23,1,0.32,1) both; }
        .stage-fit  { animation: stage-in 0.7s cubic-bezier(0.23,1,0.32,1) 0.1s both; }

        @media (max-height: 780px) { .stage-fit { transform: scale(0.85); } }
        @media (max-height: 680px) { .stage-fit { transform: scale(0.72); } }

        .right-panel { display: none; }
        @media (min-width: 900px) { .right-panel { display: flex !important; } }

        @media (prefers-reduced-motion: reduce) {
          .agent-node, .node-dot, .chip-dot { animation: none !important; }
          .form-in, .stage-fit { animation: form-in 0.15s ease both; }
        }
      `}</style>

      <div style={{ display: "flex", width: "100%", height: "100dvh", overflow: "hidden", backgroundColor: "oklch(1 0 0)" }}>

        {/* ── Left: auth form ─────────────────────── */}
        <div style={{
          width: "100%", maxWidth: "460px", flexShrink: 0, height: "100%",
          display: "flex", flexDirection: "column",
          padding: "36px 48px",
          borderRight: "1px solid oklch(0.14 0.020 228)",
          overflowY: "auto",
        }}>

          {/* Brand */}
          <div style={{ display: "flex", alignItems: "center", gap: "11px", flexShrink: 0 }}>
            <div style={{
              width: 34, height: 34, borderRadius: "10px", flexShrink: 0,
              background: "linear-gradient(145deg, oklch(0.640 0.125 197), oklch(0.470 0.105 210))",
              boxShadow: "0 3px 12px oklch(0.560 0.115 200 / 0.35), inset 0 1px 0 oklch(1 0 0 / 0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none">
                <path d="M7 1.5L12.5 4.75V10.25L7 13.5L1.5 10.25V4.75L7 1.5Z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
                <path d="M7 1.5V13.5M1.5 4.75L12.5 4.75M1.5 10.25L12.5 10.25" stroke="white" strokeWidth="1.1" />
              </svg>
            </div>
            <div>
              <span style={{ fontSize: "15px", fontWeight: 650, letterSpacing: "-0.02em", color: "oklch(0.140 0.012 226)", display: "block", lineHeight: 1.15 }}>Invictus</span>
              <span style={{ fontSize: "10.5px", color: "oklch(0.520 0.010 222)" }}>Autonomous job system</span>
            </div>
          </div>

          {/* Form — vertically centered */}
          <div className="form-in" style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0, paddingTop: "24px", paddingBottom: "24px" }}>
            <div style={{ width: "100%" }}>

              <h1 style={{ fontSize: "24px", fontWeight: 650, letterSpacing: "-0.03em", color: "oklch(0.130 0.012 226)", marginBottom: "5px" }}>
                {tab === "signin" ? "Welcome back" : "Create your account"}
              </h1>
              <p style={{ fontSize: "13px", color: "oklch(0.480 0.010 222)", marginBottom: "26px" }}>
                {tab === "signin" ? "Sign in to your control room." : "Set up the agents in two minutes."}
              </p>

              {/* Tab switcher */}
              <div style={{ display: "flex", marginBottom: "22px", padding: "3px", borderRadius: "10px", backgroundColor: "oklch(0.955 0.004 218)", gap: "3px" }}>
                {(["signin", "signup"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => { setTab(t); setError(null); setMessage(null) }}
                    style={{
                      flex: 1, padding: "8px", borderRadius: "8px",
                      fontSize: "12.5px", fontWeight: 550,
                      cursor: "pointer", border: "none",
                      transition: "background 0.18s cubic-bezier(0.23,1,0.32,1), color 0.18s cubic-bezier(0.23,1,0.32,1), box-shadow 0.18s cubic-bezier(0.23,1,0.32,1)",
                      background: tab === t ? "oklch(1 0 0)" : "transparent",
                      color: tab === t ? "oklch(0.140 0.012 226)" : "oklch(0.480 0.010 222)",
                      boxShadow: tab === t ? "0 1px 3px oklch(0.118 0.010 228 / 0.10), 0 0 0 1px oklch(0.905 0.005 218)" : "none",
                    }}
                  >
                    {t === "signin" ? "Sign in" : "Sign up"}
                  </button>
                ))}
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label htmlFor="email" style={{ fontSize: "12px", fontWeight: 550, color: "oklch(0.330 0.010 224)" }}>Email</label>
                  <div style={{ position: "relative" }}>
                    <Envelope size={15} weight="duotone" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "oklch(0.550 0.010 222)", pointerEvents: "none" }} />
                    <input
                      id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                      required placeholder="you@example.com"
                      style={inputLight} onFocus={focusOn} onBlur={focusOff}
                    />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label htmlFor="password" style={{ fontSize: "12px", fontWeight: 550, color: "oklch(0.330 0.010 224)" }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <Lock size={15} weight="duotone" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "oklch(0.550 0.010 222)", pointerEvents: "none" }} />
                    <input
                      id="password" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                      required placeholder="••••••••"
                      style={{ ...inputLight, paddingRight: "40px" }} onFocus={focusOn} onBlur={focusOff}
                    />
                    <button
                      type="button" onClick={() => setShowPw(!showPw)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", color: "oklch(0.550 0.010 222)", cursor: "pointer", background: "none", border: "none", padding: 0, lineHeight: 0 }}
                    >
                      {showPw ? <EyeSlash size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {error && (
                  <div role="alert" style={{ padding: "9px 12px", borderRadius: "9px", backgroundColor: "oklch(0.960 0.025 15)", border: "1px solid oklch(0.850 0.070 15)", color: "oklch(0.420 0.160 20)", fontSize: "12.5px" }}>
                    {error}
                  </div>
                )}
                {message && (
                  <div role="status" style={{ padding: "9px 12px", borderRadius: "9px", backgroundColor: "oklch(0.955 0.030 175)", border: "1px solid oklch(0.840 0.070 180)", color: "oklch(0.360 0.090 190)", fontSize: "12.5px" }}>
                    {message}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{
                    marginTop: "4px",
                    width: "100%", padding: "12px",
                    borderRadius: "10px", fontSize: "13.5px", fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                    border: "none",
                    background: "linear-gradient(135deg, oklch(0.620 0.125 195), oklch(0.480 0.110 212))",
                    color: "white",
                    transition: "filter 0.18s cubic-bezier(0.23,1,0.32,1), transform 0.14s cubic-bezier(0.23,1,0.32,1)",
                    boxShadow: "0 6px 20px oklch(0.560 0.115 200 / 0.30), inset 0 1px 0 oklch(1 0 0 / 0.20)",
                  }}
                  onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.filter = "brightness(1.05)" } }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.filter = "none" }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.98)" }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(-1px)" }}
                >
                  {loading ? "One moment..." : tab === "signin" ? "Sign in" : "Create account"}
                </button>
              </form>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "22px 0 18px" }}>
                <div style={{ flex: 1, height: 1, backgroundColor: "oklch(0.915 0.005 218)" }} />
                <span style={{ fontSize: "11.5px", color: "oklch(0.540 0.010 222)" }}>or continue with</span>
                <div style={{ flex: 1, height: 1, backgroundColor: "oklch(0.915 0.005 218)" }} />
              </div>

              {/* Google */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  aria-label="Continue with Google"
                  title="Continue with Google"
                  style={{
                    width: 48, height: 48, borderRadius: "14px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: googleLoading ? "not-allowed" : "pointer",
                    opacity: googleLoading ? 0.6 : 1,
                    backgroundColor: "oklch(1 0 0)",
                    border: "1px solid oklch(0.880 0.006 218)",
                    boxShadow: "0 1px 2px oklch(0.118 0.010 228 / 0.05)",
                    transition: "border-color 0.18s cubic-bezier(0.23,1,0.32,1), box-shadow 0.18s cubic-bezier(0.23,1,0.32,1), transform 0.14s cubic-bezier(0.23,1,0.32,1)",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "oklch(0.780 0.008 218)"; e.currentTarget.style.boxShadow = "0 4px 14px oklch(0.118 0.010 228 / 0.10)"; e.currentTarget.style.transform = "translateY(-1px)" }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(0.880 0.006 218)"; e.currentTarget.style.boxShadow = "0 1px 2px oklch(0.118 0.010 228 / 0.05)"; e.currentTarget.style.transform = "translateY(0)" }}
                  onMouseDown={(e) => { e.currentTarget.style.transform = "scale(0.96)" }}
                  onMouseUp={(e) => { e.currentTarget.style.transform = "translateY(-1px)" }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>

          {/* Footer switch */}
          <p style={{ textAlign: "center", fontSize: "12px", color: "oklch(0.500 0.010 222)", flexShrink: 0 }}>
            {tab === "signin"
              ? <>No account?{" "}<button onClick={() => setTab("signup")} style={{ color: "oklch(0.580 0.120 200)", fontWeight: 550, background: "none", border: "none", cursor: "pointer", fontSize: "12px", padding: 0 }}>Create one</button></>
              : <>Already registered?{" "}<button onClick={() => setTab("signin")} style={{ color: "oklch(0.580 0.120 200)", fontWeight: 550, background: "none", border: "none", cursor: "pointer", fontSize: "12px", padding: 0 }}>Sign in</button></>
            }
          </p>
        </div>

        {/* ── Right: dark pipeline graph ─────────── */}
        <div className="right-panel" style={{ flex: "1 1 0", minWidth: 0, height: "100%" }}>
          <RightPanel />
        </div>
      </div>
    </>
  )
}
