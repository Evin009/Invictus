"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import gsap from "gsap"

const CSS = `
  @keyframes sl-spin { to { transform: rotate(360deg); } }
  @keyframes sl-pulse { 0%,100% { opacity: 0.4; transform: scale(1); } 50% { opacity: 0.8; transform: scale(1.06); } }
`

const STEPS = [
  { label: "Account created", sub: "Credentials secured" },
  { label: "Building your profile", sub: "Workspace initialized" },
  { label: "Loading AI job agents", sub: "3 agents standing by" },
  { label: "Connecting job market data", sub: "82,400 listings indexed" },
  { label: "Smart resume tools ready", sub: "RAG pipeline online" },
]

export default function SignupLoadingPage() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const barFillRef = useRef<HTMLDivElement>(null)
  const outerPathRef = useRef<SVGPathElement>(null)
  const innerPathRef = useRef<SVGPathElement>(null)
  const [activeStep, setActiveStep] = useState(-1)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline()

      // Logo outer diamond stroke draw
      if (outerPathRef.current) {
        const len = outerPathRef.current.getTotalLength()
        gsap.set(outerPathRef.current, { strokeDasharray: len, strokeDashoffset: len })
        tl.to(outerPathRef.current, { strokeDashoffset: 0, duration: 0.9, ease: "power2.inOut" }, 0)
      }

      // Logo inner diamond stroke draw (delayed)
      if (innerPathRef.current) {
        const len2 = innerPathRef.current.getTotalLength()
        gsap.set(innerPathRef.current, { strokeDasharray: len2, strokeDashoffset: len2 })
        tl.to(innerPathRef.current, { strokeDashoffset: 0, duration: 0.7, ease: "power2.inOut" }, 0.4)
      }

      // Center square pop
      tl.from(".sl-center-sq", { scale: 0, opacity: 0, duration: 0.4, ease: "back.out(2)" }, 0.85)

      // Headline + subline
      tl.from(".sl-headline", { opacity: 0, y: 18, duration: 0.5, ease: "power3.out" }, 0.7)
      tl.from(".sl-subline", { opacity: 0, y: 10, duration: 0.4, ease: "power3.out" }, 0.9)

      // Steps appear and check one by one
      STEPS.forEach((_, i) => {
        tl.call(() => setActiveStep(i), [], 1.1 + i * 0.42)
      })

      // Progress bar
      tl.to(barFillRef.current, { width: "100%", duration: STEPS.length * 0.42 + 0.8, ease: "power1.inOut" }, 1.0)

      // Exit
      const exitAt = 1.1 + STEPS.length * 0.42 + 0.55
      tl.to(containerRef.current, {
        opacity: 0, y: -22, duration: 0.38, ease: "power2.in",
        onComplete: () => router.push("/onboard"),
      }, exitAt)
    }, containerRef)
    return () => ctx.revert()
  }, [router])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={containerRef} style={{
        minHeight: "100dvh", width: "100%", background: "#EFF3F1",
        fontFamily: "var(--font-space-grotesk,'Space Grotesk',sans-serif)",
        color: "#003135", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "40px 24px",
      }}>

        {/* Logo */}
        <div style={{ position: "relative", width: 88, height: 88, marginBottom: 36 }}>
          {/* Soft glow behind */}
          <div style={{
            position: "absolute", inset: -20,
            background: "radial-gradient(ellipse at center, rgba(15,164,175,0.18) 0%, transparent 70%)",
            animation: "sl-pulse 2.5s ease-in-out infinite",
          }} />
          <svg viewBox="0 0 100 100" width={88} height={88} style={{ position: "relative", zIndex: 1 }}>
            <path
              ref={outerPathRef}
              d="M50 6 L94 50 L50 94 L6 50 Z"
              fill="none" stroke="#003135" strokeWidth="7"
              strokeLinejoin="round" strokeLinecap="round"
            />
            <path
              ref={innerPathRef}
              d="M50 26 L74 50 L50 74 L26 50 Z"
              fill="none" stroke="#0FA4AF" strokeWidth="7"
              strokeLinejoin="round" strokeLinecap="round"
            />
            <rect
              className="sl-center-sq"
              x="42" y="42" width="16" height="16" rx="5"
              fill="#964734"
              transform="rotate(45 50 50)"
            />
          </svg>
        </div>

        {/* Text */}
        <h1 className="sl-headline" style={{ fontSize: 28, fontWeight: 800, margin: "0 0 8px", letterSpacing: "-0.02em", textAlign: "center" }}>
          Building your workspace
        </h1>
        <p className="sl-subline" style={{ margin: "0 0 40px", fontSize: 14, color: "rgba(0,49,53,0.5)", textAlign: "center" }}>
          Invictus agents are initializing — takes just a moment
        </p>

        {/* Checklist */}
        <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", gap: 0, marginBottom: 32 }}>
          {STEPS.map((step, i) => {
            const done = i < activeStep
            const active = i === activeStep
            return (
              <div
                key={i}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "11px 0",
                  borderBottom: i < STEPS.length - 1 ? "1px solid rgba(0,49,53,0.07)" : "none",
                  opacity: i > activeStep ? 0.28 : 1,
                  transition: "opacity 0.35s ease",
                }}
              >
                {/* Icon */}
                <div style={{
                  width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: done ? "rgba(15,164,175,0.15)" : active ? "rgba(150,71,52,0.12)" : "rgba(0,49,53,0.06)",
                  transition: "background 0.3s ease",
                }}>
                  {done ? (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M5 13l4 4L19 7" stroke="#0FA4AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : active ? (
                    <div style={{
                      width: 10, height: 10, borderRadius: "50%",
                      border: "2px solid rgba(150,71,52,0.3)", borderTopColor: "#964734",
                      animation: "sl-spin 0.8s linear infinite",
                    }} />
                  ) : (
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(0,49,53,0.2)" }} />
                  )}
                </div>
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{
                    margin: 0, fontSize: 13, fontWeight: 700,
                    color: done ? "#003135" : active ? "#964734" : "rgba(0,49,53,0.45)",
                    transition: "color 0.3s ease",
                  }}>{step.label}</p>
                  {(done || active) && (
                    <p style={{ margin: "2px 0 0", fontSize: 11, color: done ? "#0FA4AF" : "rgba(0,49,53,0.4)", fontWeight: 600 }}>
                      {step.sub}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Progress bar */}
        <div style={{ width: "100%", maxWidth: 360, height: 3, background: "rgba(0,49,53,0.1)", borderRadius: 8, overflow: "hidden" }}>
          <div ref={barFillRef} style={{ height: "100%", width: "0%", background: "linear-gradient(90deg,#0FA4AF,#024950)", borderRadius: 8 }} />
        </div>

        {/* Footer brand */}
        <p style={{ marginTop: 24, fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "rgba(0,49,53,0.28)" }}>
          INVICTUS · AUTONOMOUS JOB SEARCH
        </p>
      </div>
    </>
  )
}
