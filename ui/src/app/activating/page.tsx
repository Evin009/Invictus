"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import gsap from "gsap"

const BG   = "#EFF3F1"
const INK  = "#003135"
const MID  = "#024950"
const CYAN = "#0FA4AF"
const RUST = "#964734"

const CSS = `
  @keyframes act-spin    { to { transform: rotate(360deg); } }
  @keyframes act-pulse   { 0%,100%{opacity:0.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.06)} }
  @keyframes act-orb-a   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(20px,-16px)} }
  @keyframes act-orb-b   { 0%,100%{transform:translate(0,0)} 50%{transform:translate(-14px,12px)} }
  @keyframes act-shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes act-dot-breathe { 0%,100%{transform:scale(1);opacity:0.7} 50%{transform:scale(1.35);opacity:1} }

  .act-bar-fill {
    background: linear-gradient(90deg, ${CYAN} 0%, ${MID} 45%, ${CYAN} 100%);
    background-size: 200% 100%;
    animation: act-shimmer 2.4s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
  }
`

const AGENTS = [
  { name: "Search Agent",   task: "Scanning job boards and listings",   color: CYAN },
  { name: "Tailor Agent",   task: "Mapping your resume to job signals",  color: RUST },
  { name: "Apply Agent",    task: "Configuring application forms",       color: MID  },
  { name: "Outreach Agent", task: "Preparing personalized cold emails",  color: CYAN },
  { name: "Reporter Agent", task: "Wiring up your live dashboard",       color: RUST },
]

const AGENT_DUR = 1.7  // seconds per agent — readable pace

function useCountUp(target: number, duration: number, start: boolean) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!start) return
    const t0 = performance.now()
    let raf: number
    function tick(now: number) {
      const t = Math.min((now - t0) / (duration * 1000), 1)
      const ease = 1 - Math.pow(1 - t, 3)
      setVal(Math.round(ease * target))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, start])
  return val
}

export default function ActivatingPage() {
  const router       = useRouter()
  const rootRef      = useRef<HTMLDivElement>(null)
  const barFillRef   = useRef<HTMLDivElement>(null)
  const outerRef     = useRef<SVGPathElement>(null)
  const innerRef     = useRef<SVGPathElement>(null)
  const [countStart,   setCountStart]   = useState(false)
  const [activeAgent,  setActiveAgent]  = useState(-1)
  const [done,         setDone]         = useState(false)

  const jobCount   = useCountUp(82_419, 2.6, countStart)
  const matchCount = useCountUp(347, 2.1, countStart)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline()

      // Logo paths draw in
      if (outerRef.current) {
        const len = outerRef.current.getTotalLength()
        gsap.set(outerRef.current, { strokeDasharray: len, strokeDashoffset: len })
        tl.to(outerRef.current, { strokeDashoffset: 0, duration: 1.0, ease: "power2.inOut" }, 0)
      }
      if (innerRef.current) {
        const len2 = innerRef.current.getTotalLength()
        gsap.set(innerRef.current, { strokeDasharray: len2, strokeDashoffset: len2 })
        tl.to(innerRef.current, { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut" }, 0.9)
      }
      tl.from(".act-center-sq", { scale: 0, opacity: 0, duration: 0.4, ease: "back.out(2)" }, 1.3)

      // Copy entrance
      tl.from(".act-headline", { opacity: 0, y: 22, duration: 0.6, ease: "power3.out" }, 0.5)
      tl.from(".act-sub",      { opacity: 0, y: 12, duration: 0.5, ease: "power3.out" }, 0.78)

      // Counters
      tl.call(() => setCountStart(true), [], 0.9)
      tl.from(".act-stat",    { opacity: 0, y: 16, duration: 0.45, ease: "power3.out", stagger: 0.14 }, 1.05)

      // Divider
      tl.from(".act-divider", { scaleX: 0, duration: 0.55, ease: "power2.out", transformOrigin: "left center" }, 1.4)

      // Progress bar wrapper
      tl.from(".act-bar-wrap", { opacity: 0, duration: 0.35, ease: "power2.out" }, 1.5)

      // Agents activate one by one
      AGENTS.forEach((_, i) => {
        tl.call(() => setActiveAgent(i), [], 1.6 + i * AGENT_DUR)
      })

      // Progress bar fills over agent window
      tl.to(barFillRef.current, {
        width: "100%",
        duration: AGENTS.length * AGENT_DUR + 0.5,
        ease: "power1.inOut",
      }, 1.6)

      // All done
      const allDoneAt = 1.6 + AGENTS.length * AGENT_DUR + 0.4
      tl.call(() => setDone(true), [], allDoneAt)

      // Exit fade → dashboard
      tl.to(rootRef.current, {
        opacity: 0, y: -20, duration: 0.45, ease: "power2.in",
        onComplete: () => router.push("/dashboard"),
      }, allDoneAt + 1.1)

    }, rootRef)
    return () => ctx.revert()
  }, [router])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div ref={rootRef} style={{
        minHeight: "100dvh", width: "100%", background: BG,
        fontFamily: "var(--font-space-grotesk,'Space Grotesk',sans-serif)",
        color: INK, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "48px 24px", position: "relative", overflow: "hidden",
      }}>

        {/* Dot grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(0,49,53,0.055) 1px, transparent 1px)", backgroundSize: "26px 26px", pointerEvents: "none" }} />

        {/* Ambient orbs */}
        <div style={{ position: "absolute", top: "8%", left: "50%", transform: "translateX(-50%)", width: 520, height: 520, borderRadius: "50%", background: `radial-gradient(circle, rgba(15,164,175,0.11) 0%, transparent 65%)`, pointerEvents: "none", animation: "act-orb-a 11s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: "6%", right: "8%", width: 320, height: 320, borderRadius: "50%", background: `radial-gradient(circle, rgba(150,71,52,0.08) 0%, transparent 68%)`, pointerEvents: "none", animation: "act-orb-b 14s ease-in-out infinite" }} />

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", alignItems: "center" }}>

          {/* Logo */}
          <div style={{ position: "relative", marginBottom: 36, width: 88, height: 88 }}>
            <div style={{
              position: "absolute", inset: -22, borderRadius: "50%",
              background: `radial-gradient(ellipse at center, rgba(15,164,175,0.14) 0%, transparent 68%)`,
              animation: "act-pulse 3.5s ease-in-out infinite", pointerEvents: "none",
            }} />
            <svg viewBox="0 0 100 100" width={88} height={88} style={{ position: "relative", zIndex: 1 }}>
              <path ref={outerRef} d="M50 6 L94 50 L50 94 L6 50 Z" fill="none" stroke={INK} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
              <path ref={innerRef} d="M50 26 L74 50 L50 74 L26 50 Z" fill="none" stroke={CYAN} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
              <rect className="act-center-sq" x="42" y="42" width="16" height="16" rx="5" fill={RUST} transform="rotate(45 50 50)" />
            </svg>
          </div>

          {/* Eyebrow */}
          <div className="act-headline" style={{ marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: CYAN }}>
              {done ? "All systems live" : "Activating agents"}
            </span>
          </div>

          {/* Headline */}
          <h1 className="act-headline" style={{
            fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 800,
            letterSpacing: "-0.03em", lineHeight: 1.08,
            margin: "0 0 0", textAlign: "center", color: INK,
          }}>
            {done ? "Invictus is live" : "Your workspace is waking up"}
          </h1>

          <p className="act-sub" style={{
            margin: "10px 0 32px", fontSize: 14, lineHeight: 1.7,
            color: "rgba(0,49,53,0.48)", textAlign: "center", maxWidth: "40ch",
          }}>
            {done
              ? "Taking you to your dashboard now"
              : "Five autonomous agents are spinning up — this takes just a moment"
            }
          </p>

          {/* Stats */}
          <div style={{ display: "flex", gap: 0, marginBottom: 32, width: "100%", maxWidth: 340 }}>
            <div className="act-stat" style={{
              flex: 1, textAlign: "center", padding: "16px 0",
              background: "#fff", borderRadius: "12px 0 0 12px",
              border: "1px solid rgba(0,49,53,0.09)", borderRight: "none",
            }}>
              <p style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: CYAN, fontVariantNumeric: "tabular-nums" }}>
                {jobCount.toLocaleString()}
              </p>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(0,49,53,0.35)" }}>JOBS INDEXED</p>
            </div>
            <div style={{ width: 1, background: "rgba(0,49,53,0.09)" }} />
            <div className="act-stat" style={{
              flex: 1, textAlign: "center", padding: "16px 0",
              background: "#fff", borderRadius: "0 12px 12px 0",
              border: "1px solid rgba(0,49,53,0.09)", borderLeft: "none",
            }}>
              <p style={{ margin: "0 0 4px", fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", color: RUST, fontVariantNumeric: "tabular-nums" }}>
                {matchCount}
              </p>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(0,49,53,0.35)" }}>MATCHES FOUND</p>
            </div>
          </div>

          {/* Divider */}
          <div className="act-divider" style={{ width: "100%", height: 1, background: "rgba(0,49,53,0.08)", marginBottom: 20 }} />

          {/* Agent list */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 0 }}>
            {AGENTS.map((agent, i) => {
              const agentDone   = i < activeAgent
              const agentActive = i === activeAgent
              const visible     = i <= activeAgent
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "12px 0",
                  borderBottom: i < AGENTS.length - 1 ? "1px solid rgba(0,49,53,0.06)" : "none",
                  opacity: visible ? 1 : 0.2,
                  transition: "opacity 0.45s ease",
                }}>
                  {/* Status indicator */}
                  <div style={{
                    width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: agentDone ? "rgba(15,164,175,0.12)" : agentActive ? `rgba(${agent.color === RUST ? "150,71,52" : agent.color === CYAN ? "15,164,175" : "2,73,80"},0.1)` : "rgba(0,49,53,0.05)",
                    border: `1px solid ${agentDone ? "rgba(15,164,175,0.25)" : agentActive ? `${agent.color}40` : "rgba(0,49,53,0.08)"}`,
                    transition: "background 0.4s ease, border-color 0.4s ease",
                  }}>
                    {agentDone ? (
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                        <path d="M5 13l4 4L19 7" stroke={CYAN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : agentActive ? (
                      <div style={{ width: 11, height: 11, borderRadius: "50%", border: `2px solid ${agent.color}30`, borderTopColor: agent.color, animation: "act-spin 0.8s linear infinite" }} />
                    ) : (
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(0,49,53,0.18)" }} />
                    )}
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em",
                      color: agentDone ? INK : agentActive ? INK : "rgba(0,49,53,0.3)",
                      transition: "color 0.4s ease",
                    }}>
                      {agent.name}
                    </p>
                    {visible && (
                      <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 500, color: "rgba(0,49,53,0.4)", transition: "color 0.4s ease" }}>
                        {agent.task}
                      </p>
                    )}
                  </div>

                  {/* Badge */}
                  {agentDone && (
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: CYAN, background: "rgba(15,164,175,0.1)", padding: "3px 9px", borderRadius: 6, flexShrink: 0 }}>
                      LIVE
                    </span>
                  )}
                  {agentActive && (
                    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: agent.color, background: `${agent.color}18`, padding: "3px 9px", borderRadius: 6, flexShrink: 0 }}>
                      LOADING
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Progress bar */}
          <div className="act-bar-wrap" style={{ width: "100%", marginTop: 24 }}>
            <div style={{ width: "100%", height: 2, borderRadius: 8, overflow: "hidden", background: "rgba(0,49,53,0.08)" }}>
              <div ref={barFillRef} className="act-bar-fill" style={{ height: "100%", width: "0%", borderRadius: 8 }} />
            </div>
          </div>

          {/* Footer */}
          <p style={{ marginTop: 28, fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(0,49,53,0.22)" }}>
            Invictus · Autonomous Job Search
          </p>

        </div>
      </div>
    </>
  )
}
