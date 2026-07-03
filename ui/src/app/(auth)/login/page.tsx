"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, useReducedMotion, type Variants } from "framer-motion"
import { gsap } from "gsap"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Envelope, Lock, Eye, EyeSlash } from "@phosphor-icons/react"

// ─────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────

const TEAL    = "oklch(0.650 0.155 195)"
const DARK_BG = "oklch(0.068 0.016 228)"

// Canvas — wide, fills the panel
const W = 700
const H = 580

interface GraphNode { id: string; label: string; sub: string; x: number; y: number }
interface GraphEdge { from: string; to: string; dur: number }

// x = left edge of card (label starts here). Edge paths add CARD_HALF to reach visual center.
const CARD_HALF = 74 // half of ~148px card width

const GRAPH_NODES: GraphNode[] = [
  { id: "search",    label: "search",    sub: "job boards",   x: 26,  y: 100 },
  { id: "watchlist", label: "watchlist", sub: "VIP radar",    x: 276, y: 52  },
  { id: "crawler",   label: "crawler",   sub: "career pages", x: 526, y: 100 },
  { id: "filter",    label: "filter",    sub: "prefs match",  x: 276, y: 210 },
  { id: "tailor",    label: "tailor",    sub: "RAG resume",   x: 276, y: 335 },
  { id: "apply",     label: "apply",     sub: "ATS submit",   x: 46,  y: 448 },
  { id: "outreach",  label: "outreach",  sub: "cold email",   x: 506, y: 448 },
  { id: "reporter",  label: "reporter",  sub: "Slack alert",  x: 276, y: 536 },
]

const GRAPH_EDGES: GraphEdge[] = [
  { from: "search",    to: "filter",   dur: 2.2 },
  { from: "watchlist", to: "filter",   dur: 1.8 },
  { from: "crawler",   to: "filter",   dur: 2.5 },
  { from: "filter",    to: "tailor",   dur: 1.6 },
  { from: "tailor",    to: "apply",    dur: 2.1 },
  { from: "tailor",    to: "outreach", dur: 2.1 },
  { from: "apply",     to: "reporter", dur: 1.9 },
  { from: "outreach",  to: "reporter", dur: 1.9 },
]

function getNode(id: string): GraphNode { return GRAPH_NODES.find(n => n.id === id)! }

function edgePath(from: GraphNode, to: GraphNode): string {
  const fx = from.x + CARD_HALF
  const tx = to.x   + CARD_HALF
  const mid = (from.y + to.y) / 2
  return `M ${fx} ${from.y} C ${fx} ${mid}, ${tx} ${mid}, ${tx} ${to.y}`
}

// ─────────────────────────────────────────────────────────
// Floating particles
// ─────────────────────────────────────────────────────────

const PARTICLES = [
  { l: "7%",  t: "14%", s: 2.4, d: 0.0, teal: true  },
  { l: "18%", t: "62%", s: 1.8, d: 1.8, teal: false },
  { l: "28%", t: "27%", s: 3.0, d: 3.2, teal: true  },
  { l: "42%", t: "8%",  s: 2.0, d: 0.6, teal: false },
  { l: "55%", t: "50%", s: 2.6, d: 2.4, teal: true  },
  { l: "68%", t: "18%", s: 1.6, d: 4.1, teal: false },
  { l: "76%", t: "73%", s: 2.2, d: 1.2, teal: true  },
  { l: "85%", t: "38%", s: 1.8, d: 3.8, teal: false },
  { l: "14%", t: "84%", s: 2.4, d: 5.2, teal: true  },
  { l: "35%", t: "78%", s: 2.0, d: 2.9, teal: false },
  { l: "62%", t: "88%", s: 2.8, d: 0.4, teal: true  },
  { l: "90%", t: "55%", s: 1.6, d: 4.6, teal: false },
  { l: "50%", t: "33%", s: 1.4, d: 1.5, teal: true  },
  { l: "22%", t: "42%", s: 2.2, d: 3.5, teal: false },
]

function FloatingParticles() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const els  = container.querySelectorAll<HTMLElement>(".fp")
    const mm   = gsap.matchMedia()
    const tweens: gsap.core.Tween[] = []

    mm.add("(prefers-reduced-motion: no-preference)", () => {
      els.forEach((el, i) => {
        tweens.push(gsap.to(el, {
          x: ((i % 3) - 1) * 16, y: -20 - (i % 4) * 8,
          opacity: 0.07 + (i % 3) * 0.04,
          duration: 7 + (i % 5) * 2.2,
          delay: PARTICLES[i].d,
          repeat: -1, yoyo: true, ease: "sine.inOut",
        }))
      })
      return () => tweens.forEach(t => t.kill())
    })
    return () => { tweens.forEach(t => t.kill()); mm.revert() }
  }, [])

  return (
    <div ref={containerRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
      {PARTICLES.map((p, i) => (
        <div key={i} className="fp" style={{
          position: "absolute", left: p.l, top: p.t,
          width: p.s, height: p.s, borderRadius: "50%",
          backgroundColor: p.teal ? "oklch(0.650 0.155 195)" : "oklch(0.700 0.065 245)",
          opacity: 0.10,
          boxShadow: p.teal
            ? `0 0 ${p.s * 4}px oklch(0.650 0.155 195 / 0.55)`
            : `0 0 ${p.s * 3}px oklch(0.700 0.065 245 / 0.40)`,
          willChange: "transform, opacity",
        }} />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// AmbientOrbs — GSAP timeline
// ─────────────────────────────────────────────────────────

function AmbientOrbs() {
  const r1 = useRef<HTMLDivElement>(null)
  const r2 = useRef<HTMLDivElement>(null)
  const r3 = useRef<HTMLDivElement>(null)
  const r4 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mm = gsap.matchMedia()
    mm.add("(prefers-reduced-motion: no-preference)", () => {
      const tl1 = gsap.timeline({ repeat: -1 })
      tl1.to(r1.current, { x: -70, y:  55, scale: 1.12, duration: 13, ease: "sine.inOut" })
         .to(r1.current, { x:  30, y: -30, scale: 0.94, duration: 11, ease: "sine.inOut" })
         .to(r1.current, { x: -20, y:  70, scale: 1.06, duration: 15, ease: "sine.inOut" })
         .to(r1.current, { x:   0, y:   0, scale:    1, duration: 12, ease: "sine.inOut" })

      const tl2 = gsap.timeline({ repeat: -1, delay: 4 })
      tl2.to(r2.current, { x:  62, y: -65, scale: 1.10, duration: 17, ease: "sine.inOut" })
         .to(r2.current, { x: -25, y: -20, scale: 0.92, duration: 12, ease: "sine.inOut" })
         .to(r2.current, { x:  45, y: -80, scale: 1.08, duration: 14, ease: "sine.inOut" })
         .to(r2.current, { x:   0, y:   0, scale:    1, duration: 11, ease: "sine.inOut" })

      const tl3 = gsap.timeline({ repeat: -1, delay: 8 })
      tl3.to(r3.current, { x: -50, y:  42, scale: 1.14, duration: 20, ease: "sine.inOut" })
         .to(r3.current, { x:  30, y:  60, scale: 0.90, duration: 16, ease: "sine.inOut" })
         .to(r3.current, { x:   0, y:   0, scale:    1, duration: 18, ease: "sine.inOut" })

      const tl4 = gsap.timeline({ repeat: -1, delay: 11 })
      tl4.to(r4.current, { x:  40, y: -35, scale: 1.08, duration: 14, ease: "sine.inOut" })
         .to(r4.current, { x: -30, y:  20, scale: 0.94, duration: 12, ease: "sine.inOut" })
         .to(r4.current, { x:   0, y:   0, scale:    1, duration: 16, ease: "sine.inOut" })

      return () => { tl1.kill(); tl2.kill(); tl3.kill(); tl4.kill() }
    })
    return () => mm.revert()
  }, [])

  return (
    <>
      <div ref={r1} style={{
        position: "absolute", top: -160, right: -120,
        width: 620, height: 620,
        background: "radial-gradient(circle, oklch(0.610 0.148 195 / 0.18) 0%, transparent 62%)",
        borderRadius: "50%", pointerEvents: "none", willChange: "transform",
      }} />
      <div ref={r2} style={{
        position: "absolute", bottom: -140, left: -100,
        width: 560, height: 560,
        background: "radial-gradient(circle, oklch(0.380 0.100 262 / 0.14) 0%, transparent 62%)",
        borderRadius: "50%", pointerEvents: "none", willChange: "transform",
      }} />
      <div ref={r3} style={{
        position: "absolute",
        top: "calc(38% - 200px)", left: "calc(28% - 220px)",
        width: 480, height: 440,
        background: "radial-gradient(ellipse at center, oklch(0.480 0.100 210 / 0.12) 0%, transparent 68%)",
        borderRadius: "50%", pointerEvents: "none", willChange: "transform",
      }} />
      <div ref={r4} style={{
        position: "absolute", top: -70, left: "28%",
        width: 360, height: 320,
        background: "radial-gradient(ellipse at center, oklch(0.540 0.120 195 / 0.10) 0%, transparent 70%)",
        borderRadius: "50%", pointerEvents: "none", willChange: "transform",
      }} />
    </>
  )
}

// ─────────────────────────────────────────────────────────
// Framer Motion variants
// ─────────────────────────────────────────────────────────

const EASE_OUT_EXPO = [0.25, 1, 0.5, 1] as [number, number, number, number]

const stageVariants = {
  hidden:  { opacity: 0, scale: 0.90, filter: "blur(10px)" },
  visible: { opacity: 1, scale: 1,    filter: "blur(0px)",
             transition: { duration: 0.90, delay: 0.20, ease: EASE_OUT_EXPO } },
}

const nodeContainerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.50 } },
}

const nodeItemVariants = {
  hidden:  { opacity: 0, scale: 0.60, y: 18 },
  visible: { opacity: 1, scale: 1,    y: 0,
             transition: { type: "spring" as const, stiffness: 280, damping: 24 } },
}

// ─────────────────────────────────────────────────────────
// PipelineViz — bold glossy redesign
// ─────────────────────────────────────────────────────────

function PipelineViz({ nodeItemVariants: nodeItemV }: { nodeItemVariants: Variants }) {
  return (
    <div aria-hidden style={{ position: "relative", width: W, height: H, flexShrink: 0 }}>

      {/* Large deep center glow */}
      <div style={{
        position: "absolute", left: "calc(50% - 74px)", top: "47%",
        transform: "translate(-50%, -50%)",
        width: 560, height: 460,
        background: "radial-gradient(ellipse at center, oklch(0.580 0.138 195 / 0.18) 0%, transparent 65%)",
        borderRadius: "50%", pointerEvents: "none",
      }} />

      {/* SVG edges */}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <defs>
          <filter id="dot-glow" x="-250%" y="-250%" width="600%" height="600%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="line-glow" x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="edge-core-glow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        {GRAPH_EDGES.map((edge, i) => {
          const from = getNode(edge.from)
          const to   = getNode(edge.to)
          const d    = edgePath(from, to)
          const begin  = 2.1 + i * 0.14
          const begin2 = begin + edge.dur * 0.45
          const begin3 = begin + edge.dur * 0.72

          return (
            <g key={`e${i}`}>
              {/* Outermost soft bloom */}
              <motion.path d={d} fill="none"
                stroke="oklch(0.620 0.148 195 / 0.08)"
                strokeWidth="22"
                filter="url(#line-glow)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.15 + i * 0.06, ease: "easeOut" }}
              />
              {/* Mid glow halo */}
              <motion.path d={d} fill="none"
                stroke="oklch(0.620 0.148 195 / 0.16)"
                strokeWidth="9"
                filter="url(#edge-core-glow)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.18 + i * 0.06, ease: "easeOut" }}
              />
              {/* Main edge line */}
              <motion.path
                id={`ep${i}`}
                d={d} fill="none"
                stroke="oklch(0.640 0.152 195 / 0.52)"
                strokeWidth="2"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.0, delay: 0.22 + i * 0.08, ease: EASE_OUT_EXPO }}
              />
              {/* Primary data packet */}
              <circle r="5" fill={TEAL} filter="url(#dot-glow)">
                <animateMotion dur={`${edge.dur}s`} repeatCount="indefinite" begin={`${begin}s`}>
                  <mpath href={`#ep${i}`} />
                </animateMotion>
              </circle>
              {/* Second packet */}
              <circle r="3" fill="oklch(0.880 0.050 200)" filter="url(#dot-glow)" opacity="0.80">
                <animateMotion dur={`${edge.dur}s`} repeatCount="indefinite" begin={`${begin2}s`}>
                  <mpath href={`#ep${i}`} />
                </animateMotion>
              </circle>
              {/* Ghost trail */}
              <circle r="1.8" fill="oklch(0.780 0.040 210)" filter="url(#dot-glow)" opacity="0.45">
                <animateMotion dur={`${edge.dur}s`} repeatCount="indefinite" begin={`${begin3}s`}>
                  <mpath href={`#ep${i}`} />
                </animateMotion>
              </circle>
            </g>
          )
        })}
      </svg>

      {/* Agent node cards — glossy bold */}
      <motion.div
        variants={nodeContainerVariants}
        initial="hidden"
        animate="visible"
        style={{ position: "absolute", inset: 0 }}
      >
        {GRAPH_NODES.map((node, i) => (
          <motion.div
            key={node.id}
            variants={nodeItemV}
            className="agent-node"
            style={{
              position: "absolute",
              left: node.x, top: node.y,
              transform: "translate(0, -50%)",
              minWidth: "138px",
              padding: "11px 22px 11px 15px",
              borderRadius: "16px",
              // Glossy gradient background
              background: "linear-gradient(160deg, oklch(0.215 0.042 228 / 0.97) 0%, oklch(0.170 0.030 230 / 0.97) 100%)",
              border: "1.5px solid oklch(0.650 0.148 195 / 0.68)",
              display: "flex", alignItems: "center", gap: "12px",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              // Glass top-edge highlight
              boxShadow: [
                "inset 0 1px 0 oklch(1 0 0 / 0.22)",
                "inset 0 -1px 0 oklch(0 0 0 / 0.18)",
              ].join(", "),
            }}
          >
            {/* Status dot */}
            <motion.span
              animate={{ opacity: [1, 0.10, 1], scale: [1, 0.80, 1] }}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: i * 0.32 }}
              style={{
                width: 9, height: 9, borderRadius: "50%",
                backgroundColor: TEAL, flexShrink: 0,
                boxShadow: `0 0 12px ${TEAL}, 0 0 24px oklch(0.650 0.155 195 / 0.50)`,
                display: "inline-block",
              }}
            />
            {/* Label */}
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.25 }}>
              <span style={{
                fontSize: "13.5px", fontWeight: 700,
                fontFamily: "var(--font-mono)",
                color: "oklch(0.968 0.008 218)",
                letterSpacing: "-0.01em", whiteSpace: "nowrap",
              }}>
                {node.label}_agent
              </span>
              <span style={{
                fontSize: "11px", fontWeight: 500,
                color: "oklch(0.660 0.038 218)",
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
  const rm = useReducedMotion()

  const stageV: Variants = rm
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.25 } } }
    : stageVariants

  const nodeItemV: Variants = rm
    ? { hidden: { opacity: 0, scale: 1, y: 0 }, visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.20 } } }
    : nodeItemVariants

  return (
    <div style={{
      position: "relative",
      width: "100%", height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden",
      backgroundColor: DARK_BG,
    }}>

      {/* GSAP layers — isolated subtrees */}
      <AmbientOrbs />
      <FloatingParticles />

      {/* Dot grid texture */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        backgroundImage: "radial-gradient(circle, oklch(0.620 0.148 195 / 0.055) 1px, transparent 1px)",
        backgroundSize: "28px 28px",
        maskImage: "radial-gradient(ellipse 85% 78% at 50% 48%, black 0%, transparent 78%)",
        WebkitMaskImage: "radial-gradient(ellipse 85% 78% at 50% 48%, black 0%, transparent 78%)",
      }} />

      {/* Headline — top-left overlay */}
      <div style={{ position: "absolute", top: 44, left: 52, zIndex: 10, pointerEvents: "none" }}>
        <motion.h2
          initial={{ opacity: 0, y: rm ? 0 : 16, filter: rm ? "none" : "blur(5px)" }}
          animate={{ opacity: 1, y: 0,  filter: "none" }}
          transition={{ duration: rm ? 0.20 : 0.72, ease: [0.25, 1, 0.5, 1] }}
          style={{
            fontSize: "clamp(22px, 2.2vw, 36px)",
            fontWeight: 780,
            letterSpacing: "-0.04em",
            color: "oklch(0.972 0.006 218)",
            lineHeight: 1.10,
            marginBottom: "10px",
          }}
        >
          Eight agents.<br />Running while you sleep.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: rm ? 0 : 12, filter: rm ? "none" : "blur(4px)" }}
          animate={{ opacity: 1, y: 0,  filter: "none" }}
          transition={{ duration: rm ? 0.20 : 0.68, delay: rm ? 0 : 0.14, ease: [0.25, 1, 0.5, 1] }}
          style={{
            fontSize: "13px", fontWeight: 400,
            color: "oklch(0.580 0.024 220)",
            lineHeight: 1.65, maxWidth: "30ch",
          }}
        >
          Discovers jobs, tailors resumes, submits applications, and drafts outreach — every hour.
        </motion.p>
      </div>

      {/* Pipeline viz — full center */}
      <div className="stage-scale">
        <motion.div variants={stageV} initial="hidden" animate="visible">
          <PipelineViz nodeItemVariants={nodeItemV} />
        </motion.div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Login page
// ─────────────────────────────────────────────────────────

const inputLight: React.CSSProperties = {
  width: "100%",
  padding: "12px 12px 12px 40px",
  borderRadius: "12px",
  fontSize: "14px",
  outline: "none",
  backgroundColor: "oklch(0.994 0.003 218)",
  border: "1px solid oklch(0.872 0.008 218)",
  color: "oklch(0.140 0.012 226)",
  boxShadow: "inset 0 1px 2px oklch(0.118 0.010 228 / 0.04)",
  transition: "border-color 0.18s cubic-bezier(0.23,1,0.32,1), box-shadow 0.18s cubic-bezier(0.23,1,0.32,1)",
}

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab]                     = useState<"signin" | "signup">("signin")
  const [email, setEmail]                 = useState("")
  const [password, setPassword]           = useState("")
  const [showPw, setShowPw]               = useState(false)
  const [loading, setLoading]             = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]                 = useState<string | null>(null)
  const [message, setMessage]             = useState<string | null>(null)

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
    e.currentTarget.style.borderColor = "oklch(0.600 0.138 195)"
    e.currentTarget.style.boxShadow   = "0 0 0 3.5px oklch(0.600 0.138 195 / 0.14), inset 0 1px 2px oklch(0.118 0.010 228 / 0.04)"
    e.currentTarget.style.backgroundColor = "oklch(1 0 0)"
  }
  const focusOff = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = "oklch(0.872 0.008 218)"
    e.currentTarget.style.boxShadow   = "inset 0 1px 2px oklch(0.118 0.010 228 / 0.04)"
    e.currentTarget.style.backgroundColor = "oklch(0.994 0.003 218)"
  }

  return (
    <>
      <style>{`
        /* Bold glossy node pulse */
        @keyframes node-pulse {
          0%, 100% {
            box-shadow:
              inset 0 1px 0 oklch(1 0 0 / 0.22),
              inset 0 -1px 0 oklch(0 0 0 / 0.18),
              0 0 0 1.5px oklch(0.650 0.148 195 / 0.25),
              0 10px 34px oklch(0 0 0 / 0.70),
              0 0 28px oklch(0.650 0.148 195 / 0.24);
          }
          50% {
            box-shadow:
              inset 0 1px 0 oklch(1 0 0 / 0.22),
              inset 0 -1px 0 oklch(0 0 0 / 0.18),
              0 0 0 1.5px oklch(0.650 0.148 195 / 0.65),
              0 10px 34px oklch(0 0 0 / 0.70),
              0 0 55px oklch(0.650 0.148 195 / 0.42);
          }
        }
        .agent-node { animation: node-pulse 2.8s ease-in-out infinite; }

        .stage-scale { display: flex; align-items: center; justify-content: center; }
        @media (max-height: 820px) { .stage-scale { transform: scale(0.80); } }
        @media (max-height: 700px) { .stage-scale { transform: scale(0.65); } }

        .right-panel { display: none; }
        @media (min-width: 900px) { .right-panel { display: flex !important; } }

        @media (prefers-reduced-motion: reduce) {
          .agent-node { animation: none !important; }
          .fp { animation: none !important; }
        }

        /* Placeholder contrast — meets 4.5:1 on the tinted input bg */
        input::placeholder { color: oklch(0.420 0.008 222); opacity: 1; }

        /* Focus-visible rings — all custom buttons */
        .auth-btn:focus-visible,
        button[type="submit"]:focus-visible,
        button[type="button"]:focus-visible {
          outline: 2px solid oklch(0.600 0.138 195);
          outline-offset: 2px;
        }
        input:focus-visible { outline: none; }
      `}</style>

      <div style={{ display: "flex", width: "100%", height: "100dvh", overflow: "hidden", backgroundColor: "oklch(1 0 0)" }}>

        {/* ── Left: auth form ─────────────────────── */}
        <div style={{
          width: "100%", maxWidth: "460px", flexShrink: 0, height: "100%",
          display: "flex", flexDirection: "column",
          padding: "0",
          position: "relative",
          borderRight: "1px solid oklch(0.888 0.010 218)",
          background: "linear-gradient(170deg, oklch(1 0 0) 0%, oklch(0.978 0.006 218) 100%)",
          overflowY: "auto",
        }}>
          {/* Teal accent bar — top edge */}
          <div style={{
            height: 3, width: "100%", flexShrink: 0,
            background: "linear-gradient(90deg, oklch(0.640 0.148 195), oklch(0.520 0.120 212), oklch(0.640 0.148 195 / 0))",
          }} />

          {/* Inner padding wrapper */}
          <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "32px 48px 36px", minHeight: 0 }}>

            {/* Brand */}
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
              style={{ display: "flex", alignItems: "center", gap: "12px", flexShrink: 0 }}
            >
              {/* Double-bezel logo mark */}
              <div style={{
                padding: "3px", borderRadius: "13px", flexShrink: 0,
                background: "oklch(0.955 0.008 218)",
                border: "1px solid oklch(0.895 0.010 218)",
                boxShadow: "0 2px 8px oklch(0.118 0.010 228 / 0.06)",
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: "10px",
                  background: "linear-gradient(145deg, oklch(0.650 0.148 193), oklch(0.470 0.108 212))",
                  boxShadow: "inset 0 1px 0 oklch(1 0 0 / 0.28), 0 4px 14px oklch(0.580 0.130 195 / 0.40)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="17" height="17" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1.5L12.5 4.75V10.25L7 13.5L1.5 10.25V4.75L7 1.5Z" stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
                    <path d="M7 1.5V13.5M1.5 4.75L12.5 4.75M1.5 10.25L12.5 10.25" stroke="white" strokeWidth="1.1" />
                  </svg>
                </div>
              </div>
              <div>
                <span style={{ fontSize: "16px", fontWeight: 700, letterSpacing: "-0.03em", color: "oklch(0.130 0.014 226)", display: "block", lineHeight: 1.15 }}>Invictus</span>
                <span style={{ fontSize: "10.5px", fontWeight: 500, color: "oklch(0.560 0.014 220)", letterSpacing: "0.01em" }}>Autonomous job search</span>
              </div>
            </motion.div>

            {/* Form content */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.58, delay: 0.06, ease: [0.23, 1, 0.32, 1] }}
              style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", minHeight: 0, paddingTop: "20px", paddingBottom: "20px" }}
            >
              <div style={{ width: "100%" }}>
                {/* Heading */}
                <h1 style={{
                  fontSize: "28px", fontWeight: 720, letterSpacing: "-0.04em",
                  color: "oklch(0.118 0.014 226)", marginBottom: "6px", lineHeight: 1.12,
                }}>
                  {tab === "signin" ? "Welcome back" : "Create account"}
                </h1>
                <p style={{ fontSize: "13.5px", fontWeight: 400, color: "oklch(0.440 0.012 222)", marginBottom: "28px", lineHeight: 1.55 }}>
                  {tab === "signin" ? "Sign in to your control room." : "Get the agents running in two minutes."}
                </p>

                {/* Tab switcher — pill style */}
                <div style={{
                  display: "flex", marginBottom: "24px",
                  padding: "4px", borderRadius: "12px",
                  backgroundColor: "oklch(0.950 0.006 218)",
                  border: "1px solid oklch(0.900 0.008 218)",
                  gap: "3px",
                }}>
                  {(["signin", "signup"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => { setTab(t); setError(null); setMessage(null) }}
                      style={{
                        flex: 1, padding: "9px 12px", borderRadius: "9px",
                        fontSize: "13px", fontWeight: 580,
                        cursor: "pointer", border: "none",
                        transition: "all 0.20s cubic-bezier(0.23,1,0.32,1)",
                        background: tab === t
                          ? "oklch(1 0 0)"
                          : "transparent",
                        color: tab === t ? "oklch(0.130 0.014 226)" : "oklch(0.440 0.010 222)",
                        boxShadow: tab === t
                          ? "0 1px 4px oklch(0.118 0.010 228 / 0.12), 0 0 0 1px oklch(0.895 0.008 218)"
                          : "none",
                      }}
                    >
                      {t === "signin" ? "Sign in" : "Sign up"}
                    </button>
                  ))}
                </div>

                {/* Google button — full width, prominent */}
                <motion.button
                  onClick={handleGoogle} disabled={googleLoading}
                  whileHover={googleLoading ? {} : { y: -1, boxShadow: "0 6px 20px oklch(0.118 0.010 228 / 0.10), 0 0 0 1px oklch(0.860 0.008 218)" }}
                  whileTap={googleLoading   ? {} : { scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 400, damping: 26 }}
                  style={{
                    width: "100%", padding: "11px 16px",
                    borderRadius: "12px",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
                    cursor: googleLoading ? "not-allowed" : "pointer",
                    opacity: googleLoading ? 0.6 : 1,
                    background: "oklch(1 0 0)",
                    border: "1px solid oklch(0.878 0.008 218)",
                    boxShadow: "0 1px 3px oklch(0.118 0.010 228 / 0.06), inset 0 1px 0 oklch(1 0 0 / 0.80)",
                    fontSize: "13.5px", fontWeight: 580,
                    color: "oklch(0.200 0.014 226)",
                    marginBottom: "18px",
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {googleLoading ? "Redirecting..." : "Continue with Google"}
                </motion.button>

                {/* Divider */}
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                  <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, transparent, oklch(0.900 0.008 218))" }} />
                  <span style={{
                    fontSize: "11px", fontWeight: 550, letterSpacing: "0.06em",
                    color: "oklch(0.600 0.010 222)", textTransform: "uppercase",
                    padding: "4px 10px", borderRadius: "99px",
                    backgroundColor: "oklch(0.950 0.006 218)",
                    border: "1px solid oklch(0.908 0.008 218)",
                  }}>or</span>
                  <div style={{ flex: 1, height: "1px", background: "linear-gradient(90deg, oklch(0.900 0.008 218), transparent)" }} />
                </div>

                {/* Email / password form */}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    <label htmlFor="email" style={{ fontSize: "12.5px", fontWeight: 600, color: "oklch(0.320 0.012 224)", letterSpacing: "-0.005em" }}>Email address</label>
                    <div style={{ position: "relative" }}>
                      <Envelope size={15} weight="duotone" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "oklch(0.560 0.012 220)", pointerEvents: "none" }} />
                      <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required autoFocus aria-required="true" placeholder="you@example.com" style={inputLight} onFocus={focusOn} onBlur={focusOff} />
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
                    <label htmlFor="password" style={{ fontSize: "12.5px", fontWeight: 600, color: "oklch(0.320 0.012 224)", letterSpacing: "-0.005em" }}>Password</label>
                    <div style={{ position: "relative" }}>
                      <Lock size={15} weight="duotone" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "oklch(0.560 0.012 220)", pointerEvents: "none" }} />
                      <input id="password" type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required aria-required="true" placeholder="••••••••" style={{ ...inputLight, paddingRight: "42px" }} onFocus={focusOn} onBlur={focusOff} />
                      <button type="button" onClick={() => setShowPw(!showPw)} aria-label={showPw ? "Hide password" : "Show password"} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "oklch(0.560 0.012 220)", cursor: "pointer", background: "none", border: "none", padding: 0, lineHeight: 0 }}>
                        {showPw ? <EyeSlash size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.div
                      role="alert"
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                      style={{ padding: "10px 14px", borderRadius: "10px", backgroundColor: "oklch(0.962 0.022 15)", border: "1px solid oklch(0.858 0.065 15)", color: "oklch(0.400 0.155 20)", fontSize: "12.5px" }}
                    >
                      {error}
                    </motion.div>
                  )}
                  {message && (
                    <motion.div
                      role="status"
                      initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.22 }}
                      style={{ padding: "10px 14px", borderRadius: "10px", backgroundColor: "oklch(0.956 0.028 175)", border: "1px solid oklch(0.842 0.065 178)", color: "oklch(0.355 0.088 188)", fontSize: "12.5px" }}
                    >
                      {message}
                    </motion.div>
                  )}

                  <motion.button
                    type="submit" disabled={loading}
                    whileHover={loading ? {} : { y: -1.5, filter: "brightness(1.07)" }}
                    whileTap={loading   ? {} : { scale: 0.975 }}
                    transition={{ type: "spring", stiffness: 420, damping: 26 }}
                    style={{
                      marginTop: "2px", width: "100%", padding: "13px",
                      borderRadius: "12px", fontSize: "14px", fontWeight: 640,
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.72 : 1, border: "none",
                      background: "linear-gradient(135deg, oklch(0.648 0.148 192) 0%, oklch(0.495 0.118 210) 100%)",
                      color: "white", letterSpacing: "-0.01em",
                      boxShadow: "0 8px 24px oklch(0.580 0.135 195 / 0.32), inset 0 1px 0 oklch(1 0 0 / 0.22)",
                    }}
                  >
                    {loading ? "One moment..." : tab === "signin" ? "Sign in" : "Create account"}
                  </motion.button>
                </form>
              </div>
            </motion.div>

            {/* Footer */}
            <p style={{ textAlign: "center", fontSize: "12.5px", color: "oklch(0.520 0.010 222)", flexShrink: 0 }}>
              {tab === "signin"
                ? <>No account?{" "}<button onClick={() => setTab("signup")} style={{ color: "oklch(0.610 0.140 195)", fontWeight: 620, background: "none", border: "none", cursor: "pointer", fontSize: "12.5px", padding: 0, letterSpacing: "-0.01em" }}>Sign up free</button></>
                : <>Already have an account?{" "}<button onClick={() => setTab("signin")} style={{ color: "oklch(0.610 0.140 195)", fontWeight: 620, background: "none", border: "none", cursor: "pointer", fontSize: "12.5px", padding: 0, letterSpacing: "-0.01em" }}>Sign in</button></>
              }
            </p>
          </div>
        </div>

        {/* ── Right: pipeline network ──────────── */}
        <div className="right-panel" style={{ flex: "1 1 0", minWidth: 0, height: "100%" }}>
          <RightPanel />
        </div>
      </div>
    </>
  )
}
