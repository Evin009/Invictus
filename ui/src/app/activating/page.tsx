"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import gsap from "gsap"

const CSS = `
  @keyframes act-spin { to { transform: rotate(360deg); } }
`

const AGENTS = [
  { name: "Search Agent", task: "Scanning job boards", color: "#0FA4AF" },
  { name: "Tailor Agent", task: "Analyzing your resume", color: "#964734" },
  { name: "Apply Agent", task: "Configuring ATS forms", color: "#024950" },
  { name: "Outreach Agent", task: "Preparing cold contacts", color: "#0FA4AF" },
  { name: "Reporter Agent", task: "Building your dashboard", color: "#964734" },
]

function useCountUp(target: number, duration: number, start: boolean) {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!start) return
    const startTime = performance.now()
    let raf: number
    function tick(now: number) {
      const t = Math.min((now - startTime) / (duration * 1000), 1)
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
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [countStart, setCountStart] = useState(false)
  const [activeAgent, setActiveAgent] = useState(-1)
  const [done, setDone] = useState(false)

  const jobCount   = useCountUp(82_419, 2.2, countStart)
  const matchCount = useCountUp(347, 1.8, countStart)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline()

      // Radar rings expand outward, staggered
      tl.from(".act-ring", {
        scale: 0, opacity: 0, duration: 0.7, ease: "power3.out",
        stagger: 0.15, transformOrigin: "center center",
      }, 0)

      // Logo pop
      tl.from(".act-logo", {
        scale: 0.5, opacity: 0, duration: 0.55, ease: "back.out(2)",
      }, 0.3)

      // Headline
      tl.from(".act-headline", { opacity: 0, y: 20, duration: 0.5, ease: "power3.out" }, 0.6)
      tl.from(".act-subline", { opacity: 0, y: 12, duration: 0.4, ease: "power3.out" }, 0.8)

      // Start counters
      tl.call(() => setCountStart(true), [], 0.9)

      // Stats row
      tl.from(".act-stat", { opacity: 0, y: 14, duration: 0.4, ease: "power3.out", stagger: 0.12 }, 1.0)

      // Divider line
      tl.from(".act-divider", { scaleX: 0, duration: 0.5, ease: "power2.out", transformOrigin: "left center" }, 1.3)

      // Agent rows
      AGENTS.forEach((_, i) => {
        tl.call(() => setActiveAgent(i), [], 1.5 + i * 0.38)
      })

      // All done signal
      const allDoneAt = 1.5 + AGENTS.length * 0.38 + 0.3
      tl.call(() => setDone(true), [], allDoneAt)

      // Exit
      tl.to(containerRef.current, {
        opacity: 0, y: -24, duration: 0.42, ease: "power2.in",
        onComplete: () => router.push("/dashboard"),
      }, allDoneAt + 0.9)

    }, containerRef)
    return () => ctx.revert()
  }, [router])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={containerRef} style={{
        minHeight: "100dvh", width: "100%", background: "#003135",
        fontFamily: "var(--font-space-grotesk,'Space Grotesk',sans-serif)",
        color: "#fff", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "40px 24px",
        position: "relative", overflow: "hidden",
      }}>

        {/* Radar rings */}
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
          {[260, 360, 460, 560, 660].map((r, i) => (
            <div
              key={i}
              className="act-ring"
              style={{
                position: "absolute",
                width: r, height: r,
                borderRadius: "50%",
                border: `1px solid rgba(15,164,175,${0.22 - i * 0.038})`,
                flexShrink: 0,
              }}
            />
          ))}
          {/* Rotating scanner line */}
          <div style={{
            position: "absolute", width: 460, height: 460,
            borderRadius: "50%",
            background: "conic-gradient(from 0deg, rgba(15,164,175,0.18) 0deg, transparent 60deg)",
            animation: "act-spin 3s linear infinite",
          }} />
        </div>

        {/* Logo */}
        <div className="act-logo" style={{ position: "relative", zIndex: 2, marginBottom: 32 }}>
          <div style={{
            position: "absolute", inset: -18,
            background: "radial-gradient(ellipse at center, rgba(15,164,175,0.22) 0%, transparent 70%)",
            borderRadius: "50%",
          }} />
          <svg viewBox="0 0 100 100" width={72} height={72} style={{ position: "relative" }}>
            <path d="M50 6 L94 50 L50 94 L6 50 Z" fill="none" stroke="rgba(255,255,255,0.8)" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
            <path d="M50 26 L74 50 L50 74 L26 50 Z" fill="none" stroke="#0FA4AF" strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
            <rect x="42" y="42" width="16" height="16" rx="5" fill="#964734" transform="rotate(45 50 50)" />
          </svg>
        </div>

        {/* Headline */}
        <h1 className="act-headline" style={{ fontSize: 32, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.025em", textAlign: "center", position: "relative", zIndex: 2 }}>
          {done ? "Invictus is live" : "Activating your agents"}
        </h1>
        <p className="act-subline" style={{ margin: "0 0 36px", fontSize: 14, color: "rgba(255,255,255,0.45)", textAlign: "center", position: "relative", zIndex: 2 }}>
          {done ? "Taking you to your dashboard now" : "Bootstrapping the full autonomous pipeline"}
        </p>

        {/* Stats */}
        <div style={{ display: "flex", gap: 40, marginBottom: 36, position: "relative", zIndex: 2 }}>
          <div className="act-stat" style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#0FA4AF", fontVariantNumeric: "tabular-nums" }}>
              {jobCount.toLocaleString()}
            </p>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)" }}>JOBS INDEXED</p>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.1)" }} />
          <div className="act-stat" style={{ textAlign: "center" }}>
            <p style={{ margin: "0 0 4px", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", color: "#964734", fontVariantNumeric: "tabular-nums" }}>
              {matchCount}
            </p>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(255,255,255,0.35)" }}>MATCHES FOUND</p>
          </div>
        </div>

        {/* Divider */}
        <div className="act-divider" style={{ width: "100%", maxWidth: 400, height: 1, background: "rgba(255,255,255,0.09)", marginBottom: 24, position: "relative", zIndex: 2 }} />

        {/* Agent list */}
        <div style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 0, position: "relative", zIndex: 2 }}>
          {AGENTS.map((agent, i) => {
            const agentDone = i < activeAgent
            const agentActive = i === activeAgent
            const visible = i <= activeAgent
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "10px 0",
                  borderBottom: i < AGENTS.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none",
                  opacity: visible ? 1 : 0.18,
                  transition: "opacity 0.4s ease",
                }}
              >
                {/* Status dot */}
                <div style={{
                  width: 8, height: 8, borderRadius: "50%", flexShrink: 0,
                  background: agentDone ? "#0FA4AF" : agentActive ? agent.color : "rgba(255,255,255,0.2)",
                  boxShadow: (agentDone || agentActive) ? `0 0 8px ${agentDone ? "#0FA4AF" : agent.color}` : "none",
                  transition: "background 0.3s ease, box-shadow 0.3s ease",
                }} />

                {/* Text */}
                <div style={{ flex: 1 }}>
                  <span style={{
                    fontSize: 13, fontWeight: 700,
                    color: agentDone ? "rgba(255,255,255,0.7)" : agentActive ? "#fff" : "rgba(255,255,255,0.3)",
                    transition: "color 0.3s ease",
                  }}>
                    {agent.name}
                  </span>
                  {visible && (
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginLeft: 10, fontWeight: 500 }}>
                      — {agent.task}
                    </span>
                  )}
                </div>

                {/* Status badge */}
                {agentDone && (
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: "#0FA4AF", background: "rgba(15,164,175,0.12)", padding: "2px 8px", borderRadius: 6 }}>
                    READY
                  </span>
                )}
                {agentActive && (
                  <div style={{
                    width: 14, height: 14, borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.15)", borderTopColor: agent.color,
                    animation: "act-spin 0.75s linear infinite", flexShrink: 0,
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Footer */}
        <p style={{ marginTop: 36, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(255,255,255,0.18)", position: "relative", zIndex: 2 }}>
          INVICTUS · AUTONOMOUS JOB SEARCH
        </p>
      </div>
    </>
  )
}
