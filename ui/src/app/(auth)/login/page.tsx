"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { gsap } from "gsap"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Envelope, Lock, Eye, EyeSlash } from "@phosphor-icons/react"

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

const TEAL    = "oklch(0.580 0.120 200)"
const DARK_BG = "oklch(0.075 0.018 228)"

// Pipeline canvas — sized for visual impact
const W = 610
const H = 570

interface GraphNode { id: string; label: string; sub: string; x: number; y: number }
interface GraphEdge { from: string; to: string; dur: number }

const GRAPH_NODES: GraphNode[] = [
  { id: "search",    label: "search",    sub: "job boards",   x: 120, y: 110 },
  { id: "watchlist", label: "watchlist", sub: "VIP radar",    x: 310, y: 64  },
  { id: "crawler",   label: "crawler",   sub: "career pages", x: 492, y: 110 },
  { id: "filter",    label: "filter",    sub: "prefs match",  x: 310, y: 220 },
  { id: "tailor",    label: "tailor",    sub: "RAG resume",   x: 310, y: 345 },
  { id: "apply",     label: "apply",     sub: "ATS submit",   x: 142, y: 452 },
  { id: "outreach",  label: "outreach",  sub: "cold email",   x: 468, y: 452 },
  { id: "reporter",  label: "reporter",  sub: "Slack alert",  x: 310, y: 530 },
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

function getNode(id: string): GraphNode { return GRAPH_NODES.find(n => n.id === id)! }

function edgePath(from: GraphNode, to: GraphNode): string {
  const mid = (from.y + to.y) / 2
  return `M ${from.x} ${from.y} C ${from.x} ${mid}, ${to.x} ${mid}, ${to.x} ${to.y}`
}

// ─────────────────────────────────────────────────────────
// AmbientOrbs — GSAP only, strict isolation
// ─────────────────────────────────────────────────────────

function AmbientOrbs() {
  const r1 = useRef<HTMLDivElement>(null)
  const r2 = useRef<HTMLDivElement>(null)
  const r3 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const t1 = gsap.to(r1.current, {
        x: -58, y: 48, scale: 1.08,
        duration: 14, repeat: -1, yoyo: true, ease: "sine.inOut",
      })
      const t2 = gsap.to(r2.current, {
        x: 52, y: -58, scale: 1.07,
        duration: 19, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 5,
      })
      const t3 = gsap.to(r3.current, {
        x: -38, y: 36, scale: 1.12,
        duration: 24, repeat: -1, yoyo: true, ease: "sine.inOut", delay: 9,
      })
      return () => { t1.kill(); t2.kill(); t3.kill() }
    })
    return () => mm.revert()
  }, [])

  return (
    <>
      {/* Teal — top-right, brand primary */}
      <div
        ref={r1}
        style={{
          position: "absolute", top: -130, right: -90,
          width: 500, height: 500,
          background: "radial-gradient(circle, oklch(0.560 0.120 200 / 0.088) 0%, transparent 65%)",
          borderRadius: "50%", pointerEvents: "none", willChange: "transform",
        }}
      />
      {/* Indigo — bottom-left, cool complement */}
      <div
        ref={r2}
        style={{
          position: "absolute", bottom: -110, left: -70,
          width: 440, height: 440,
          background: "radial-gradient(circle, oklch(0.360 0.095 262 / 0.072) 0%, transparent 65%)",
          borderRadius: "50%", pointerEvents: "none", willChange: "transform",
        }}
      />
      {/* Muted cyan — center mass, very soft */}
      <div
        ref={r3}
        style={{
          position: "absolute",
          top: "calc(40% - 150px)", left: "calc(38% - 185px)",
          width: 370, height: 300,
          background: "radial-gradient(ellipse at center, oklch(0.450 0.090 210 / 0.052) 0%, transparent 70%)",
          borderRadius: "50%", pointerEvents: "none", willChange: "transform",
        }}
      />
    </>
  )
}

// ─────────────────────────────────────────────────────────
// Framer Motion variants
// ─────────────────────────────────────────────────────────

const EASE_OUT_EXPO = [0.25, 1, 0.5, 1] as [number, number, number, number]

const stageVariants = {
  hidden:   { opacity: 0, scale: 0.92, filter: "blur(8px)" },
  visible:  { opacity: 1, scale: 1,    filter: "blur(0px)",
              transition: { duration: 0.80, delay: 0.25, ease: EASE_OUT_EXPO } },
}

const nodeContainerVariants = {
  hidden:   {},
  visible:  { transition: { staggerChildren: 0.07, delayChildren: 0.55 } },
}

const nodeItemVariants = {
  hidden:   { opacity: 0, scale: 0.70, y: 12 },
  visible:  { opacity: 1, scale: 1,    y: 0,
              transition: { type: "spring" as const, stiffness: 290, damping: 24 } },
}

// ─────────────────────────────────────────────────────────
// PipelineViz — Framer Motion node stagger + FM edge draw
// ─────────────────────────────────────────────────────────

function PipelineViz() {
  return (
    <div aria-hidden style={{ position: "relative", width: W, height: H, flexShrink: 0 }}>

      {/* Center ambient glow */}
      <div style={{
        position: "absolute", left: "50%", top: "46%",
        transform: "translate(-50%, -50%)",
        width: 420, height: 360,
        background: "radial-gradient(ellipse at center, oklch(0.560 0.120 200 / 0.09) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />

      {/* SVG edges — Framer Motion path draw + SVG animateMotion dots */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <filter id="dot-glow" x="-200%" y="-200%" width="500%" height="500%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.8" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="line-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {GRAPH_EDGES.map((edge, i) => {
          const from = getNode(edge.from)
          const to   = getNode(edge.to)
          const d    = edgePath(from, to)
          // Dots begin after all edges finish drawing (~2.1s)
          const dotBegin  = 2.1 + i * 0.12
          const dotBegin2 = dotBegin + edge.dur * 0.5

          return (
            <g key={`e${i}`}>
              {/* Glow overlay — fade in first */}
              <motion.path
                d={d}
                fill="none"
                stroke="oklch(0.560 0.120 200 / 0.07)"
                strokeWidth="7"
                filter="url(#line-glow)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.2 + i * 0.07, ease: "easeOut" }}
              />
              {/* Main edge — draws in */}
              <motion.path
                id={`ep${i}`}
                d={d}
                fill="none"
                stroke="oklch(0.560 0.120 200 / 0.17)"
                strokeWidth="1.5"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.0, delay: 0.25 + i * 0.08, ease: EASE_OUT_EXPO }}
              />
              {/* Primary moving dot — starts after edges drawn */}
              <circle r="3.2" fill={TEAL} filter="url(#dot-glow)">
                <animateMotion dur={`${edge.dur}s`} repeatCount="indefinite" begin={`${dotBegin}s`}>
                  <mpath href={`#ep${i}`} />
                </animateMotion>
              </circle>
              {/* Trailing dot */}
              <circle r="2" fill="oklch(0.820 0.055 200)" filter="url(#dot-glow)" opacity="0.68">
                <animateMotion dur={`${edge.dur}s`} repeatCount="indefinite" begin={`${dotBegin2}s`}>
                  <mpath href={`#ep${i}`} />
                </animateMotion>
              </circle>
            </g>
          )
        })}
      </svg>

      {/* Agent node cards — FM stagger entrance */}
      <motion.div
        variants={nodeContainerVariants}
        initial="hidden"
        animate="visible"
        style={{ position: "absolute", inset: 0 }}
      >
        {GRAPH_NODES.map((node, i) => (
          <motion.div
            key={node.id}
            variants={nodeItemVariants}
            className="agent-node"
            style={{
              position: "absolute",
              left: node.x,
              top: node.y,
              transform: "translate(-50%, -50%)",
              padding: "8px 14px 8px 11px",
              borderRadius: "11px",
              backgroundColor: "oklch(0.118 0.024 228 / 0.97)",
              border: "1px solid oklch(0.560 0.120 200 / 0.30)",
              display: "flex",
              alignItems: "center",
              gap: "9px",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            {/* Pulsing dot — FM infinite */}
            <motion.span
              animate={{ opacity: [1, 0.15, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.38 }}
              style={{
                width: 6, height: 6, borderRadius: "50%",
                backgroundColor: TEAL,
                flexShrink: 0,
                boxShadow: `0 0 7px ${TEAL}`,
                display: "inline-block",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
              <span style={{
                fontSize: "11px", fontWeight: 600,
                fontFamily: "var(--font-mono)",
                color: "oklch(0.875 0.018 218)",
                letterSpacing: "-0.01em",
                whiteSpace: "nowrap",
              }}>
                {node.label}_agent
              </span>
              <span style={{
                fontSize: "9.5px",
                color: "oklch(0.510 0.022 222)",
                fontFamily: "var(--font-mono)",
                whiteSpace: "nowrap",
              }}>
                {node.sub}
              </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Right panel
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

      {/* GSAP orbs — isolated in their own subtree */}
      <AmbientOrbs />

      {/* Fine dot grid */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, oklch(0.560 0.120 200 / 0.048) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage: "radial-gradient(ellipse 80% 72% at 50% 46%, black 10%, transparent 82%)",
        WebkitMaskImage: "radial-gradient(ellipse 80% 72% at 50% 46%, black 10%, transparent 82%)",
      }} />

      {/* Headline — FM blur-fade entrance */}
      <div style={{ position: "relative", padding: "48px 56px 0", flexShrink: 0 }}>
        <motion.h2
          initial={{ opacity: 0, y: 18, filter: "blur(5px)" }}
          animate={{ opacity: 1, y: 0,  filter: "blur(0px)" }}
          transition={{ duration: 0.72, ease: [0.25, 1, 0.5, 1] }}
          style={{
            fontSize: "clamp(28px, 2.8vw, 44px)",
            fontWeight: 780,
            letterSpacing: "-0.04em",
            color: "oklch(0.972 0.006 218)",
            lineHeight: 1.10,
            // @ts-ignore
            textWrap: "balance",
            marginBottom: "14px",
          }}
        >
          Eight agents.<br />Running while you sleep.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 14, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0,  filter: "blur(0px)" }}
          transition={{ duration: 0.68, delay: 0.12, ease: [0.25, 1, 0.5, 1] }}
          style={{
            fontSize: "15px",
            fontWeight: 400,
            color: "oklch(0.655 0.026 220)",
            lineHeight: 1.72,
            maxWidth: "36ch",
          }}
        >
          Discovers jobs, tailors your resume, submits applications, and drafts outreach — every hour, on its own.
        </motion.p>
      </div>

      {/* Pipeline viz — FM stage entrance, CSS media query scale on wrapper */}
      <div style={{
        position: "relative", flex: 1, minHeight: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div className="stage-scale">
          <motion.div
            variants={stageVariants}
            initial="hidden"
            animate="visible"
          >
            <PipelineViz />
          </motion.div>
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
  const router  = useRouter()
  const [tab, setTab]                 = useState<"signin" | "signup">("signin")
  const [email, setEmail]             = useState("")
  const [password, setPassword]       = useState("")
  const [showPw, setShowPw]           = useState(false)
  const [loading, setLoading]         = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [message, setMessage]         = useState<string | null>(null)

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

  const focusOn  = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "oklch(0.560 0.115 200 / 0.70)"
    e.currentTarget.style.boxShadow   = "0 0 0 3px oklch(0.560 0.115 200 / 0.12)"
  }
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "oklch(0.880 0.006 218)"
    e.currentTarget.style.boxShadow   = "none"
  }

  return (
    <>
      <style>{`
        /* Node card infinite glow pulse */
        @keyframes node-pulse {
          0%, 100% { box-shadow: 0 0 0 1px oklch(0.560 0.120 200 / 0.07), 0 6px 20px oklch(0 0 0 / 0.55); }
          50%       { box-shadow: 0 0 0 1px oklch(0.560 0.120 200 / 0.24), 0 6px 20px oklch(0 0 0 / 0.55), 0 0 34px oklch(0.560 0.120 200 / 0.13); }
        }
        .agent-node { animation: node-pulse 3.2s ease-in-out infinite; }

        /* Height-responsive scale wrapper — separate from FM entrance */
        .stage-scale { display: flex; align-items: center; justify-content: center; }
        @media (max-height: 820px) { .stage-scale { transform: scale(0.82); } }
        @media (max-height: 700px) { .stage-scale { transform: scale(0.68); } }

        .right-panel { display: none; }
        @media (min-width: 900px) { .right-panel { display: flex !important; } }

        @media (prefers-reduced-motion: reduce) {
          .agent-node { animation: none !important; }
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

          {/* Form — FM entrance */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.23, 1, 0.32, 1] }}
            style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0, paddingTop: "24px", paddingBottom: "24px" }}
          >
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
                    <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="you@example.com" style={inputLight} onFocus={focusOn} onBlur={focusOff} />
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <label htmlFor="password" style={{ fontSize: "12px", fontWeight: 550, color: "oklch(0.330 0.010 224)" }}>Password</label>
                  <div style={{ position: "relative" }}>
                    <Lock size={15} weight="duotone" style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "oklch(0.550 0.010 222)", pointerEvents: "none" }} />
                    <input id="password" type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" style={{ ...inputLight, paddingRight: "40px" }} onFocus={focusOn} onBlur={focusOff} />
                    <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"} style={{ position: "absolute", right: 11, top: "50%", transform: "translateY(-50%)", color: "oklch(0.550 0.010 222)", cursor: "pointer", background: "none", border: "none", padding: 0, lineHeight: 0 }}>
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

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileHover={loading ? {} : { y: -1, filter: "brightness(1.06)" }}
                  whileTap={loading   ? {} : { scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 24 }}
                  style={{
                    marginTop: "4px",
                    width: "100%", padding: "12px",
                    borderRadius: "10px", fontSize: "13.5px", fontWeight: 600,
                    cursor: loading ? "not-allowed" : "pointer",
                    opacity: loading ? 0.7 : 1,
                    border: "none",
                    background: "linear-gradient(135deg, oklch(0.620 0.125 195), oklch(0.480 0.110 212))",
                    color: "white",
                    boxShadow: "0 6px 20px oklch(0.560 0.115 200 / 0.30), inset 0 1px 0 oklch(1 0 0 / 0.20)",
                  }}
                >
                  {loading ? "One moment..." : tab === "signin" ? "Sign in" : "Create account"}
                </motion.button>
              </form>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "12px", margin: "22px 0 18px" }}>
                <div style={{ flex: 1, height: 1, backgroundColor: "oklch(0.915 0.005 218)" }} />
                <span style={{ fontSize: "11.5px", color: "oklch(0.540 0.010 222)" }}>or continue with</span>
                <div style={{ flex: 1, height: 1, backgroundColor: "oklch(0.915 0.005 218)" }} />
              </div>

              {/* Google */}
              <div style={{ display: "flex", justifyContent: "center" }}>
                <motion.button
                  onClick={handleGoogle}
                  disabled={googleLoading}
                  aria-label="Continue with Google"
                  title="Continue with Google"
                  whileHover={googleLoading ? {} : { y: -1, boxShadow: "0 4px 14px oklch(0.118 0.010 228 / 0.10)", borderColor: "oklch(0.780 0.008 218)" }}
                  whileTap={googleLoading   ? {} : { scale: 0.96 }}
                  transition={{ type: "spring", stiffness: 400, damping: 24 }}
                  style={{
                    width: 48, height: 48, borderRadius: "14px",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: googleLoading ? "not-allowed" : "pointer",
                    opacity: googleLoading ? 0.6 : 1,
                    backgroundColor: "oklch(1 0 0)",
                    border: "1px solid oklch(0.880 0.006 218)",
                    boxShadow: "0 1px 2px oklch(0.118 0.010 228 / 0.05)",
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </motion.button>
              </div>
            </div>
          </motion.div>

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
