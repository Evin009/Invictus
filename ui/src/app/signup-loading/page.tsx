"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import gsap from "gsap"
import { OnboardedGuard } from "@/components/onboarded-guard"

/* ─── brand tokens ─── */
const BG      = "#EFF3F1"
const CYAN    = "#0FA4AF"
const RUST    = "#964734"
const MID     = "#024950"
const INK     = "#003135"
const SURFACE = "rgba(0,49,53,0.05)"
const BORDER  = "rgba(0,49,53,0.08)"

const CSS = `
  @keyframes sl-spin    { to { transform: rotate(360deg) } }
  @keyframes sl-pulse   { 0%,100%{opacity:0.3;transform:scale(1)} 50%{opacity:0.65;transform:scale(1.1)} }
  @keyframes sl-breathe { 0%,100%{transform:scale(1)} 50%{transform:scale(1.03)} }
  @keyframes sl-orb-a   { 0%,100%{transform:translate(0,0)}  50%{transform:translate(22px,-18px)} }
  @keyframes sl-orb-b   { 0%,100%{transform:translate(0,0)}  50%{transform:translate(-16px,14px)} }
  @keyframes sl-shimmer {
    0%  { background-position: -200% 0 }
    100%{ background-position:  200% 0 }
  }
  .sl-bar-track { background: rgba(0,49,53,0.08); }
  .sl-bar-fill {
    background: linear-gradient(90deg, ${CYAN} 0%, ${MID} 45%, ${CYAN} 100%);
    background-size: 200% 100%;
    animation: sl-shimmer 2.2s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
  }
`

const STEPS = [
  { label: "Account created",            sub: "Credentials secured" },
  { label: "Building your profile",      sub: "Workspace initialized" },
  { label: "Loading AI job agents",      sub: "3 agents standing by" },
  { label: "Connecting job market data", sub: "82,400 listings indexed" },
  { label: "Resume tools ready",         sub: "RAG pipeline online" },
]

const STEP_DUR = 1.9   // seconds per step — give user time to read each item

export default function SignupLoadingPage() {
  const router       = useRouter()
  const wrapRef      = useRef<HTMLDivElement>(null)   // outer (unclipped) shell
  const pageRef      = useRef<HTMLDivElement>(null)   // clipped content
  const stripeRef    = useRef<HTMLDivElement>(null)   // racing entry stripe
  const stripeOutRef = useRef<HTMLDivElement>(null)   // racing exit  stripe
  const outerPathRef = useRef<SVGPathElement>(null)
  const innerPathRef = useRef<SVGPathElement>(null)
  const barFillRef   = useRef<HTMLDivElement>(null)
  const [activeStep, setActiveStep] = useState(-1)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline()

      /* ─────────────────────────────────────────────────────
         SWISH IN
         1. Thin cyan stripe races left→right across screen
         2. Page clips in from left, riding just behind the stripe
         ───────────────────────────────────────────────────── */
      tl.set(pageRef.current, { clipPath: "inset(0 100% 0 0)" })
      tl.set(stripeRef.current, { x: "-100%", opacity: 1 })

      // Stripe races first
      tl.to(stripeRef.current, {
        x: "100vw",
        duration: 0.45,
        ease: "power4.in",
      }, 0)
      // Fade stripe out as it exits
      tl.to(stripeRef.current, { opacity: 0, duration: 0.15 }, 0.38)

      // Page reveals behind stripe — slightly delayed so stripe leads
      tl.to(pageRef.current, {
        clipPath: "inset(0 0% 0 0)",
        duration: 0.55,
        ease: "power4.inOut",
      }, 0.08)

      /* ─── CONTENT ENTRANCE (after reveal) ─── */
      // Logo outer stroke draw
      if (outerPathRef.current) {
        const len = outerPathRef.current.getTotalLength()
        gsap.set(outerPathRef.current, { strokeDasharray: len, strokeDashoffset: len })
        tl.to(outerPathRef.current, { strokeDashoffset: 0, duration: 1.0, ease: "power2.inOut" }, 0.5)
      }
      // Logo inner stroke
      if (innerPathRef.current) {
        const len2 = innerPathRef.current.getTotalLength()
        gsap.set(innerPathRef.current, { strokeDasharray: len2, strokeDashoffset: len2 })
        tl.to(innerPathRef.current, { strokeDashoffset: 0, duration: 0.75, ease: "power2.inOut" }, 0.95)
      }
      // Center square
      tl.from(".sl-center-sq", { scale: 0, opacity: 0, duration: 0.42, ease: "back.out(1.8)" }, 1.38)

      // Text
      tl.from(".sl-headline", { opacity: 0, y: 22, duration: 0.6, ease: "power3.out" }, 0.72)
      tl.from(".sl-subline",  { opacity: 0, y: 12, duration: 0.5, ease: "power3.out" }, 0.92)
      tl.from(".sl-list",     { opacity: 0, y: 18, duration: 0.5, ease: "power3.out" }, 1.05)
      tl.from(".sl-bar-wrap", { opacity: 0,         duration: 0.4, ease: "power2.out"  }, 1.25)

      /* ─── STEPS — each one activates, user reads before next ─── */
      const stepsStart = 1.5
      STEPS.forEach((_, i) => {
        tl.call(() => setActiveStep(i), [], stepsStart + i * STEP_DUR)
      })

      /* ─── PROGRESS BAR fills over same window ─── */
      tl.to(barFillRef.current, {
        width: "100%",
        duration: STEPS.length * STEP_DUR + 0.3,
        ease: "power1.inOut",
      }, stepsStart)

      /* ─────────────────────────────────────────────────────
         SWISH OUT
         1. Thin rust stripe races left→right
         2. Page clips away from right, content disappears behind stripe
         3. Navigate on complete
         ───────────────────────────────────────────────────── */
      const outroAt = stepsStart + STEPS.length * STEP_DUR + 0.55
      tl.set(stripeOutRef.current, { x: "-100%", opacity: 1 }, outroAt - 0.01)

      // Stripe races out
      tl.to(stripeOutRef.current, {
        x: "100vw",
        duration: 0.42,
        ease: "power4.in",
      }, outroAt)
      tl.to(stripeOutRef.current, { opacity: 0, duration: 0.14 }, outroAt + 0.36)

      // Page clips away — left edge chases right, content disappears
      tl.to(pageRef.current, {
        clipPath: "inset(0 0 0 100%)",
        duration: 0.52,
        ease: "power4.inOut",
        onComplete: () => router.push("/onboard"),
      }, outroAt + 0.06)

    }, wrapRef)
    return () => ctx.revert()
  }, [router])

  return (
    <>
      <OnboardedGuard />
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* ── OUTER WRAPPER — unclipped, holds the racing stripes ── */}
      <div ref={wrapRef} style={{ position: "relative", minHeight: "100dvh", overflow: "hidden" }}>

        {/* ENTRY stripe — thin cyan bar races left→right */}
        <div ref={stripeRef} style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          height: "100%", width: "5px",
          background: `linear-gradient(to bottom, ${CYAN}, rgba(15,164,175,0.4))`,
          zIndex: 300, pointerEvents: "none", opacity: 0,
          boxShadow: `0 0 20px 4px ${CYAN}`,
          willChange: "transform",
        }} />

        {/* EXIT stripe — thin rust bar races left→right */}
        <div ref={stripeOutRef} style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          height: "100%", width: "5px",
          background: `linear-gradient(to bottom, ${RUST}, rgba(150,71,52,0.4))`,
          zIndex: 300, pointerEvents: "none", opacity: 0,
          boxShadow: `0 0 20px 4px ${RUST}`,
          willChange: "transform",
        }} />

        {/* ── PAGE (clipped during swish) ── */}
        <div ref={pageRef} style={{
          minHeight: "100dvh", width: "100%", background: BG,
          fontFamily: "var(--font-space-grotesk,'Space Grotesk',sans-serif)",
          color: INK, display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "48px 24px", position: "relative", overflow: "hidden",
          willChange: "clip-path",
        }}>

          {/* ── BACKGROUND ambience ── */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: `radial-gradient(rgba(0,49,53,0.055) 1px, transparent 1px)`, backgroundSize: "28px 28px", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: "5%", left: "50%", transform: "translateX(-50%)", width: 520, height: 520, borderRadius: "50%", background: `radial-gradient(circle, rgba(15,164,175,0.1) 0%, transparent 65%)`, pointerEvents: "none", animation: "sl-orb-a 11s ease-in-out infinite" }} />
          <div style={{ position: "absolute", bottom: "8%", right: "10%", width: 300, height: 300, borderRadius: "50%", background: `radial-gradient(circle, rgba(150,71,52,0.08) 0%, transparent 70%)`, pointerEvents: "none", animation: "sl-orb-b 14s ease-in-out infinite" }} />

          <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", alignItems: "center" }}>

            {/* ── LOGO ── */}
            <div style={{ position: "relative", width: 96, height: 96, marginBottom: 40 }}>
              <div style={{ position: "absolute", inset: -28, borderRadius: "50%", background: `radial-gradient(ellipse at center, rgba(15,164,175,0.18) 0%, transparent 68%)`, animation: "sl-pulse 3s ease-in-out infinite", pointerEvents: "none" }} />
              <svg viewBox="0 0 100 100" width={96} height={96} style={{ position: "relative", zIndex: 1, animation: "sl-breathe 4.5s ease-in-out infinite" }}>
                <path ref={outerPathRef} d="M50 6 L94 50 L50 94 L6 50 Z" fill="none" stroke={INK} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
                <path ref={innerPathRef} d="M50 26 L74 50 L50 74 L26 50 Z" fill="none" stroke={CYAN} strokeWidth="7" strokeLinejoin="round" strokeLinecap="round" />
                <rect className="sl-center-sq" x="42" y="42" width="16" height="16" rx="5" fill={RUST} transform="rotate(45 50 50)" />
              </svg>
            </div>

            {/* ── COPY ── */}
            <h1 className="sl-headline" style={{
              fontSize: "clamp(22px, 5vw, 32px)", fontWeight: 800,
              letterSpacing: "-0.03em", lineHeight: 1.1,
              margin: 0, textAlign: "center", color: INK,
            }}>
              Building your workspace
            </h1>
            <p className="sl-subline" style={{
              margin: "10px 0 0", fontSize: 13, lineHeight: 1.7,
              color: "rgba(0,49,53,0.48)", textAlign: "center", maxWidth: "38ch",
            }}>
              Invictus agents are initializing — takes just a moment
            </p>

            {/* ── STEPS ── */}
            <div className="sl-list" style={{ width: "100%", marginTop: 36, display: "flex", flexDirection: "column", gap: 0 }}>
              {STEPS.map((step, i) => {
                const done   = i < activeStep
                const active = i === activeStep
                return (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: 14,
                    padding: "13px 0",
                    borderBottom: i < STEPS.length - 1 ? `1px solid ${BORDER}` : "none",
                    opacity: i > activeStep ? 0.18 : 1,
                    transition: "opacity 0.55s ease",
                  }}>
                    {/* Icon */}
                    <div style={{
                      width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: done ? "rgba(15,164,175,0.16)" : active ? "rgba(150,71,52,0.14)" : SURFACE,
                      border: `1px solid ${done ? "rgba(15,164,175,0.3)" : active ? "rgba(150,71,52,0.25)" : BORDER}`,
                      transition: "background 0.45s ease, border-color 0.45s ease",
                    }}>
                      {done ? (
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                          <path d="M5 13l4 4L19 7" stroke={CYAN} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : active ? (
                        <div style={{ width: 11, height: 11, borderRadius: "50%", border: `2px solid rgba(150,71,52,0.25)`, borderTopColor: RUST, animation: "sl-spin 0.85s linear infinite" }} />
                      ) : (
                        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "rgba(0,49,53,0.18)" }} />
                      )}
                    </div>

                    {/* Text */}
                    <div style={{ flex: 1 }}>
                      <p style={{
                        margin: 0, fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em",
                        color: done ? INK : active ? RUST : "rgba(0,49,53,0.28)",
                        transition: "color 0.45s ease",
                      }}>
                        {step.label}
                      </p>
                      {(done || active) && (
                        <p style={{
                          margin: "3px 0 0", fontSize: 11, fontWeight: 600, letterSpacing: "0.01em",
                          color: done ? CYAN : "rgba(0,49,53,0.32)",
                          transition: "color 0.45s ease",
                        }}>
                          {step.sub}
                        </p>
                      )}
                    </div>

                    {/* Index */}
                    <span style={{
                      fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", flexShrink: 0,
                      color: done ? `rgba(15,164,175,0.55)` : "rgba(0,49,53,0.15)",
                      transition: "color 0.45s ease",
                    }}>
                      0{i + 1}
                    </span>
                  </div>
                )
              })}
            </div>

            {/* ── PROGRESS BAR ── */}
            <div className="sl-bar-wrap" style={{ width: "100%", marginTop: 28 }}>
              <div className="sl-bar-track" style={{ width: "100%", height: 2, borderRadius: 8, overflow: "hidden" }}>
                <div ref={barFillRef} className="sl-bar-fill" style={{ height: "100%", width: "0%", borderRadius: 8 }} />
              </div>
            </div>

            {/* ── FOOTER ── */}
            <p style={{
              marginTop: 28, fontSize: 10, fontWeight: 700,
              letterSpacing: "0.14em", textTransform: "uppercase",
              color: "rgba(0,49,53,0.22)",
            }}>
              Invictus · Autonomous Job Search
            </p>

          </div>
        </div>
      </div>
    </>
  )
}
