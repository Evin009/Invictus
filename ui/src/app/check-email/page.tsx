"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import gsap from "gsap"
import { ArrowRight, ArrowClockwise, CheckCircle, ArrowLeft } from "@phosphor-icons/react"

const CSS = `
  @keyframes char-float  { 0%,100%{transform:translateY(0)}     50%{transform:translateY(-12px)} }
  @keyframes badge-pulse { 0%,100%{transform:scale(1) rotate(-8deg)} 50%{transform:scale(1.1) rotate(-8deg)} }
  @keyframes orb-drift-a { 0%,100%{transform:translate(0,0)}   50%{transform:translate(18px,-14px)} }
  @keyframes orb-drift-b { 0%,100%{transform:translate(0,0)}   50%{transform:translate(-12px,10px)} }
  @keyframes sparkle-a   { 0%,100%{opacity:0;transform:scale(0.3) rotate(0deg)}  55%{opacity:1;transform:scale(1) rotate(180deg)} }
  @keyframes sparkle-b   { 0%,100%{opacity:0;transform:scale(0.2)}               50%{opacity:0.8;transform:scale(1)} }
  @keyframes spin-slow   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes shimmer-bar { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes step-line   { from{width:0} to{width:100%} }

  .ce-btn {
    position:relative; overflow:hidden;
    transition: box-shadow 0.28s cubic-bezier(0.16,1,0.3,1), transform 0.18s cubic-bezier(0.16,1,0.3,1);
  }
  .ce-btn::before {
    content:''; position:absolute; inset:0;
    background:#7a3a29;
    transform:translateX(-101%);
    transition:transform 0.38s cubic-bezier(0.16,1,0.3,1);
  }
  .ce-btn:hover::before { transform:translateX(0); }
  .ce-btn:hover { box-shadow:0 14px 36px rgba(150,71,52,0.28); transform:translateY(-2px); }
  .ce-btn:active { transform:translateY(0) scale(0.98); }

  .ce-resend {
    transition: color 0.2s ease, opacity 0.2s ease;
  }
  .ce-resend:hover:not(:disabled) { color:#003135 !important; }

  .ce-back {
    transition: color 0.2s ease, gap 0.2s ease;
  }
  .ce-back:hover { color:rgba(0,49,53,0.7) !important; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
  }
`

export default function CheckEmailPage() {
  const router   = useRouter()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const rootRef  = useRef<HTMLDivElement>(null)
  const barRef   = useRef<HTMLDivElement>(null)

  const [pendingEmail, setPendingEmail] = useState("")
  const [checking,     setChecking]     = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [resent,       setResent]       = useState(false)
  const [confirmed,    setConfirmed]    = useState(false)

  useEffect(() => {
    try { setPendingEmail(localStorage.getItem("invictus-pending-email") ?? "") } catch {}
  }, [])

  // GSAP entrance — character drops from slight above, content staggers up
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".ce-char",    { opacity: 0, y: -24 })
      gsap.set(".ce-stagger", { opacity: 0, y: 20 })

      gsap.to(".ce-char", {
        opacity: 1, y: 0, duration: 0.72, ease: "power3.out", delay: 0.05,
        clearProps: "transform,opacity",
      })
      gsap.to(".ce-stagger", {
        opacity: 1, y: 0, duration: 0.58, ease: "power3.out",
        stagger: 0.07, delay: 0.2, clearProps: "transform,opacity",
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  // Supabase auto-detect confirmation
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        try { localStorage.removeItem("invictus-pending-email") } catch {}
        setConfirmed(true)
        if (barRef.current) {
          gsap.fromTo(barRef.current,
            { y: -56, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
          )
        }
        setTimeout(() => router.push("/login?confirmed=1"), 1800)
      }
    })
    return () => subscription.unsubscribe()
  }, [router, supabase])

  async function handleContinue() {
    setChecking(true); setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        try { localStorage.removeItem("invictus-pending-email") } catch {}
        setConfirmed(true)
        if (barRef.current) {
          gsap.fromTo(barRef.current,
            { y: -56, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
          )
        }
        setTimeout(() => router.push("/login?confirmed=1"), 1400)
      } else {
        setError("Still waiting — click the confirmation link in your email first.")
      }
    } finally { setChecking(false) }
  }

  async function handleResend() {
    if (!pendingEmail || resent) return
    const { error } = await supabase.auth.resend({ type: "signup", email: pendingEmail })
    if (error) {
      setError(error.message.toLowerCase().includes("rate")
        ? "Too many attempts — wait a few minutes."
        : error.message)
      return
    }
    setResent(true)
    setTimeout(() => setResent(false), 6000)
  }

  const steps = [
    { n: "01", label: "Open the Invictus email" },
    { n: "02", label: "Click the confirmation link" },
    { n: "03", label: "Return here and continue" },
  ]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Confirmed bar */}
      {confirmed && (
        <div ref={barRef} style={{
          position: "fixed", top: 0, left: 0, right: 0, zIndex: 200,
          background: "#0FA4AF", color: "#fff", padding: "13px 24px",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
          fontFamily: "var(--font-space-grotesk,'Space Grotesk',sans-serif)",
          fontSize: 14, fontWeight: 700,
          boxShadow: "0 4px 20px rgba(15,164,175,0.3)",
        }}>
          <CheckCircle size={18} weight="fill" />
          Email confirmed — heading to setup…
          <div style={{ width: 15, height: 15, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin-slow 0.75s linear infinite", marginLeft: 4 }} />
        </div>
      )}

      <div
        ref={rootRef}
        style={{
          minHeight: "100dvh", width: "100%", background: "#EFF3F1",
          fontFamily: "var(--font-space-grotesk,'Space Grotesk',sans-serif)",
          color: "#003135", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "48px 24px", position: "relative", overflow: "hidden",
        }}
      >

        {/* ── BACKGROUND ── */}
        {/* Dot grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(0,49,53,0.055) 1px, transparent 1px)", backgroundSize: "26px 26px", pointerEvents: "none" }} />

        {/* Ambient orbs */}
        <div style={{
          position: "absolute", top: "10%", left: "50%",
          transform: "translateX(-50%)",
          width: 560, height: 560, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(15,164,175,0.13) 0%, transparent 68%)",
          pointerEvents: "none",
          animation: "orb-drift-a 9s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: "5%", right: "10%",
          width: 340, height: 340, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(150,71,52,0.1) 0%, transparent 70%)",
          pointerEvents: "none",
          animation: "orb-drift-b 11s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", top: "5%", left: "8%",
          width: 240, height: 240, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(2,73,80,0.08) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* ── MAIN CONTENT ── */}
        <div style={{
          position: "relative", zIndex: 1,
          width: "100%", maxWidth: 480,
          display: "flex", flexDirection: "column",
          alignItems: "center", gap: 0,
        }}>

          {/* Logo */}
          <div className="ce-stagger" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 48, alignSelf: "flex-start" }}>
            <svg viewBox="0 0 100 100" width={22} height={22}>
              <path d="M50 6 L94 50 L50 94 L6 50 Z" fill="none" stroke="#003135" strokeWidth="10" strokeLinejoin="round" />
              <path d="M50 26 L74 50 L50 74 L26 50 Z" fill="none" stroke="#0FA4AF" strokeWidth="10" strokeLinejoin="round" />
              <rect x="42" y="42" width="16" height="16" rx="5" fill="#964734" transform="rotate(45 50 50)" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>Invictus</span>
          </div>

          {/* ── CHARACTER ZONE ── */}
          <div className="ce-char" style={{ position: "relative", width: "100%", display: "flex", justifyContent: "center", marginBottom: 8 }}>

            {/* Glow ring behind character */}
            <div style={{
              position: "absolute", top: "50%", left: "50%",
              transform: "translate(-50%, -50%)",
              width: 300, height: 300, borderRadius: "50%",
              background: "radial-gradient(circle, rgba(15,164,175,0.12) 0%, transparent 70%)",
              pointerEvents: "none",
            }} />

            {/* Character image */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/q1.png"
              alt=""
              aria-hidden
              style={{
                width: "82%", maxWidth: 320, height: "auto",
                animation: "char-float 5.5s ease-in-out infinite",
                mixBlendMode: "multiply",
                userSelect: "none", pointerEvents: "none",
                position: "relative", zIndex: 1,
              }}
            />

            {/* Rust badge — top right */}
            <div style={{
              position: "absolute", top: "6%", right: "4%", zIndex: 2,
              width: 50, height: 50, borderRadius: "50%",
              background: "#964734",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 20px rgba(150,71,52,0.35)",
              animation: "badge-pulse 3.5s ease-in-out infinite",
              border: "2px solid rgba(255,255,255,0.2)",
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 12l5 5L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Sparkles */}
            <div style={{ position: "absolute", top: "2%",  right: "20%", zIndex: 2, width: 9,  height: 9,  borderRadius: "50%", background: "#0FA4AF",  animation: "sparkle-a 2.8s ease-in-out infinite" }} />
            <div style={{ position: "absolute", top: "12%", right: "8%",  zIndex: 2, width: 6,  height: 6,  borderRadius: "50%", background: "#fff", opacity: 0.7, animation: "sparkle-b 3.4s ease-in-out infinite 0.7s" }} />
            <div style={{ position: "absolute", top: "18%", right: "22%", zIndex: 2, width: 5,  height: 5,  borderRadius: "50%", background: "#964734", opacity: 0.65, animation: "sparkle-a 4s ease-in-out infinite 1.3s" }} />
            <div style={{ position: "absolute", top: "8%",  left:  "16%", zIndex: 2, width: 7,  height: 7,  borderRadius: "50%", background: "#0FA4AF", opacity: 0.5, animation: "sparkle-b 3.1s ease-in-out infinite 0.4s" }} />
          </div>

          {/* ── COPY ── */}
          <div className="ce-stagger" style={{ textAlign: "center", marginBottom: 6 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: "0.14em",
              textTransform: "uppercase", color: "#0FA4AF",
            }}>
              One more step
            </span>
          </div>

          <h1 className="ce-stagger" style={{
            fontSize: "clamp(26px, 5vw, 38px)", fontWeight: 800,
            letterSpacing: "-0.03em", lineHeight: 1.08,
            margin: "6px 0 0", textAlign: "center", color: "#003135",
          }}>
            Check your inbox
          </h1>

          <p className="ce-stagger" style={{
            fontSize: 14, lineHeight: 1.7, color: "rgba(0,49,53,0.52)",
            margin: "12px 0 0", textAlign: "center", maxWidth: "44ch",
          }}>
            {pendingEmail
              ? <>Sent to <strong style={{ color: "#003135", fontWeight: 700 }}>{pendingEmail}</strong>. Click the link inside, then come back here.</>
              : <>Confirmation sent. Click the link in your email, then return here.</>
            }
          </p>

          {/* ── STEPS (horizontal) ── */}
          <div className="ce-stagger" style={{
            display: "flex", alignItems: "flex-start", gap: 0,
            margin: "32px 0 0", width: "100%",
          }}>
            {steps.map((step, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", position: "relative" }}>
                {/* Connector line */}
                {i < steps.length - 1 && (
                  <div style={{
                    position: "absolute", top: 18, left: "50%", right: "-50%",
                    height: 1,
                    background: "rgba(0,49,53,0.1)",
                    zIndex: 0,
                  }} />
                )}
                {/* Circle */}
                <div style={{
                  width: 36, height: 36, borderRadius: "50%",
                  background: i === 0 ? "#003135" : "#fff",
                  border: `1px solid ${i === 0 ? "transparent" : "rgba(0,49,53,0.12)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", zIndex: 1,
                  boxShadow: i === 0 ? "0 4px 14px rgba(0,49,53,0.18)" : "none",
                  marginBottom: 10,
                }}>
                  <span style={{
                    fontSize: 9, fontWeight: 800, letterSpacing: "0.05em",
                    color: i === 0 ? "#0FA4AF" : "rgba(0,49,53,0.3)",
                  }}>
                    {step.n}
                  </span>
                </div>
                {/* Label */}
                <span style={{
                  fontSize: 11, fontWeight: i === 0 ? 700 : 500,
                  color: i === 0 ? "#003135" : "rgba(0,49,53,0.4)",
                  textAlign: "center", lineHeight: 1.4, padding: "0 4px",
                }}>
                  {step.label}
                </span>
              </div>
            ))}
          </div>

          {/* ── ERROR ── */}
          {error && (
            <div className="ce-stagger" style={{
              marginTop: 20, width: "100%", padding: "12px 16px", borderRadius: 10,
              background: "rgba(150,71,52,0.07)", border: "1px solid rgba(150,71,52,0.18)",
              display: "flex", gap: 10, alignItems: "flex-start",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#964734" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 13, fontWeight: 600, color: "#964734", lineHeight: 1.5 }}>{error}</span>
            </div>
          )}

          {/* ── CTA ── */}
          <div className="ce-stagger" style={{ marginTop: 28, width: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
            <button
              className="ce-btn"
              onClick={handleContinue}
              disabled={checking || confirmed}
              style={{
                width: "100%", padding: "15px 24px",
                background: "#964734", color: "#fff", border: "none",
                borderRadius: 14, fontFamily: "inherit",
                fontSize: 15, fontWeight: 700,
                cursor: checking || confirmed ? "default" : "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                opacity: checking || confirmed ? 0.72 : 1,
                position: "relative", zIndex: 0,
              }}
            >
              <span style={{ position: "relative", zIndex: 1 }}>
                {checking ? "Checking…" : confirmed ? "Confirmed!" : "I confirmed my email"}
              </span>
              <span style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(0,0,0,0.14)",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", zIndex: 1, flexShrink: 0,
              }}>
                {checking ? (
                  <div style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin-slow 0.75s linear infinite" }} />
                ) : confirmed ? (
                  <CheckCircle size={15} color="#fff" weight="fill" />
                ) : (
                  <ArrowRight size={15} color="#fff" weight="bold" />
                )}
              </span>
            </button>

            {/* Resend row */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ flex: 1, height: 1, background: "rgba(0,49,53,0.08)" }} />
              <button
                className="ce-resend"
                onClick={handleResend}
                disabled={resent || !pendingEmail}
                style={{
                  background: "none", border: "none", padding: "6px 10px",
                  borderRadius: 8, fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                  color: resent ? "#0FA4AF" : "rgba(0,49,53,0.42)",
                  cursor: resent ? "default" : "pointer",
                  display: "flex", alignItems: "center", gap: 5,
                }}
              >
                {resent
                  ? <><CheckCircle size={13} weight="fill" color="#0FA4AF" /> Sent!</>
                  : <><ArrowClockwise size={13} weight="bold" /> Resend email</>
                }
              </button>
              <div style={{ flex: 1, height: 1, background: "rgba(0,49,53,0.08)" }} />
            </div>
          </div>

          {/* Back */}
          <div className="ce-stagger" style={{ marginTop: 4 }}>
            <button
              className="ce-back"
              onClick={() => router.push("/login")}
              style={{
                background: "none", border: "none", padding: "8px 0",
                cursor: "pointer", fontFamily: "inherit",
                fontSize: 12, color: "rgba(0,49,53,0.35)", fontWeight: 600,
                display: "flex", alignItems: "center", gap: 5,
              }}
            >
              <ArrowLeft size={12} weight="bold" />
              Back to sign in
            </button>
          </div>

        </div>
      </div>
    </>
  )
}
