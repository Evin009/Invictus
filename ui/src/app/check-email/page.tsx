"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import gsap from "gsap"
import {
  EnvelopeSimple,
  ArrowRight,
  ArrowClockwise,
  CheckCircle,
  ArrowLeft,
  Confetti,
} from "@phosphor-icons/react"

const CSS = `
  @keyframes float-a { 0%,100%{transform:translateY(0) rotate(-4deg)} 50%{transform:translateY(-14px) rotate(-4deg)} }
  @keyframes float-b { 0%,100%{transform:translateY(0) rotate(6deg)} 50%{transform:translateY(-10px) rotate(6deg)} }
  @keyframes float-c { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-18px)} }
  @keyframes orbit  { from{transform:rotate(0deg) translateX(70px) rotate(0deg)} to{transform:rotate(360deg) translateX(70px) rotate(-360deg)} }
  @keyframes orbit2 { from{transform:rotate(180deg) translateX(52px) rotate(-180deg)} to{transform:rotate(540deg) translateX(52px) rotate(-540deg)} }
  @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
  @keyframes spin-slow { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
  @keyframes badge-pop { 0%{transform:scale(0) rotate(-20deg)} 70%{transform:scale(1.15) rotate(3deg)} 100%{transform:scale(1) rotate(0deg)} }
  @keyframes confirmed-in { from{transform:translateY(-100%)} to{transform:translateY(0)} }

  .ce-btn-primary {
    position: relative; overflow: hidden;
    transition: box-shadow 0.25s cubic-bezier(0.16,1,0.3,1), transform 0.18s cubic-bezier(0.16,1,0.3,1);
  }
  .ce-btn-primary::before {
    content:''; position:absolute; inset:0;
    background: #7a3a29;
    transform: translateX(-101%);
    transition: transform 0.35s cubic-bezier(0.16,1,0.3,1);
  }
  .ce-btn-primary:hover::before { transform: translateX(0); }
  .ce-btn-primary:hover { box-shadow: 0 12px 32px rgba(150,71,52,0.3); transform: translateY(-2px); }
  .ce-btn-primary:active { transform: translateY(0) scale(0.98); }

  .ce-btn-ghost {
    transition: background 0.2s ease, color 0.2s ease, transform 0.15s ease;
  }
  .ce-btn-ghost:hover { background: rgba(0,49,53,0.08) !important; transform: translateY(-1px); }
  .ce-btn-ghost:active { transform: scale(0.98); }

  .ce-step-item {
    transition: opacity 0.2s ease, transform 0.2s ease;
  }

  .ce-resend {
    transition: color 0.2s ease, opacity 0.2s ease;
  }
  .ce-resend:hover { color: #003135 !important; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
  }
  @media (max-width: 767px) {
    .ce-left-panel { display: none !important; }
    .ce-right-panel { padding: 32px 24px !important; }
  }
`

export default function CheckEmailPage() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const rightRef = useRef<HTMLDivElement>(null)
  const confirmedBarRef = useRef<HTMLDivElement>(null)

  const [pendingEmail, setPendingEmail] = useState("")
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resent, setResent] = useState(false)
  const [autoChecking, setAutoChecking] = useState(false)

  useEffect(() => {
    try { setPendingEmail(localStorage.getItem("invictus-pending-email") ?? "") } catch {}
  }, [])

  // GSAP entrance
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".ce-stagger", { opacity: 0, y: 22 })
      gsap.to(".ce-stagger", {
        opacity: 1, y: 0, duration: 0.6,
        ease: "power3.out", stagger: 0.08, delay: 0.1,
        clearProps: "transform,opacity",
      })
    }, rightRef)
    return () => ctx.revert()
  }, [])

  // Auto-navigate on Supabase SIGNED_IN
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        try { localStorage.removeItem("invictus-pending-email") } catch {}
        setAutoChecking(true)
        setTimeout(() => router.push("/login?confirmed=1"), 1800)
      }
    })
    return () => subscription.unsubscribe()
  }, [router, supabase])

  // Animate confirmed bar in when autoChecking
  useEffect(() => {
    if (autoChecking && confirmedBarRef.current) {
      gsap.fromTo(confirmedBarRef.current,
        { y: -64, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
      )
    }
  }, [autoChecking])

  async function handleContinue() {
    setChecking(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        try { localStorage.removeItem("invictus-pending-email") } catch {}
        setAutoChecking(true)
        setTimeout(() => router.push("/login?confirmed=1"), 1400)
      } else {
        setError("Still waiting — click the confirmation link in your email first.")
      }
    } finally {
      setChecking(false)
    }
  }

  async function handleResend() {
    if (!pendingEmail || resent) return
    const { error } = await supabase.auth.resend({ type: "signup", email: pendingEmail })
    if (error) {
      setError(error.message.toLowerCase().includes("rate") ? "Too many attempts — wait a few minutes." : error.message)
      return
    }
    setResent(true)
    setTimeout(() => setResent(false), 6000)
  }

  const steps = [
    { n: "01", label: "Open email from Invictus" },
    { n: "02", label: "Click the confirmation link" },
    { n: "03", label: "Return here and press continue" },
  ]

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      {/* Confirmed banner */}
      {autoChecking && (
        <div
          ref={confirmedBarRef}
          style={{
            position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
            background: "#0FA4AF", color: "#fff",
            padding: "14px 24px",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            fontFamily: "var(--font-space-grotesk,'Space Grotesk',sans-serif)",
            fontSize: 14, fontWeight: 700,
            boxShadow: "0 4px 24px rgba(15,164,175,0.35)",
          }}
        >
          <Confetti size={18} weight="fill" />
          Email confirmed — taking you to setup…
          <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", animation: "spin-slow 0.75s linear infinite", marginLeft: 4 }} />
        </div>
      )}

      <div style={{
        minHeight: "100dvh", width: "100%", display: "flex",
        fontFamily: "var(--font-space-grotesk,'Space Grotesk',sans-serif)",
        color: "#003135",
      }}>

        {/* ── LEFT PANEL ── */}
        <div className="ce-left-panel" style={{
          width: "44%", background: "#003135", position: "relative",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          padding: "60px 40px", overflow: "hidden", flexShrink: 0,
        }}>

          {/* Subtle mesh dots */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(15,164,175,0.12) 1px, transparent 1px)", backgroundSize: "32px 32px", pointerEvents: "none" }} />

          {/* Ambient orbs */}
          <div style={{ position: "absolute", top: -120, right: -80, width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, rgba(15,164,175,0.18), transparent 70%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -100, left: -80, width: 280, height: 280, borderRadius: "50%", background: "radial-gradient(circle, rgba(150,71,52,0.14), transparent 70%)", pointerEvents: "none" }} />

          {/* Central envelope composition */}
          <div style={{ position: "relative", width: 200, height: 200, zIndex: 1 }}>

            {/* Orbiting dots */}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ position: "absolute", width: 8, height: 8, borderRadius: "50%", background: "#0FA4AF", animation: "orbit 4.5s linear infinite" }} />
              <div style={{ position: "absolute", width: 6, height: 6, borderRadius: "50%", background: "#964734", animation: "orbit2 6s linear infinite" }} />
            </div>

            {/* Ring */}
            <div style={{
              position: "absolute", inset: 10, borderRadius: "50%",
              border: "1px solid rgba(15,164,175,0.2)",
              animation: "spin-slow 24s linear infinite",
            }} />
            <div style={{
              position: "absolute", inset: 28, borderRadius: "50%",
              border: "1px dashed rgba(255,255,255,0.08)",
              animation: "spin-slow 16s linear infinite reverse",
            }} />

            {/* Main icon */}
            <div style={{
              position: "absolute", inset: 40, borderRadius: 28,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "float-c 5s ease-in-out infinite",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
            }}>
              <EnvelopeSimple size={48} color="#fff" weight="thin" />
            </div>

            {/* Notification badge */}
            {!autoChecking && (
              <div style={{
                position: "absolute", top: 36, right: 30,
                width: 24, height: 24, borderRadius: "50%",
                background: "#964734", border: "2px solid #003135",
                display: "flex", alignItems: "center", justifyContent: "center",
                animation: "badge-pop 0.45s cubic-bezier(0.16,1,0.3,1) 0.6s both",
              }}>
                <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", lineHeight: 1 }}>1</span>
              </div>
            )}
          </div>

          {/* Floating mini cards */}
          <div style={{
            position: "absolute", left: 32, top: "28%",
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 12, padding: "10px 14px",
            animation: "float-a 6s ease-in-out infinite",
            backdropFilter: "blur(4px)",
          }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", fontWeight: 600, marginBottom: 4 }}>FROM</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>no-reply@invictus.ai</div>
          </div>

          <div style={{
            position: "absolute", right: 24, bottom: "30%",
            background: "rgba(15,164,175,0.12)", border: "1px solid rgba(15,164,175,0.25)",
            borderRadius: 12, padding: "10px 14px",
            animation: "float-b 7s ease-in-out infinite",
          }}>
            <div style={{ fontSize: 11, color: "#0FA4AF", fontWeight: 700 }}>Awaiting confirmation</div>
          </div>

          {/* Brand mark at bottom */}
          <div style={{ position: "absolute", bottom: 36, left: 0, right: 0, display: "flex", justifyContent: "center", alignItems: "center", gap: 8, opacity: 0.4 }}>
            <svg viewBox="0 0 100 100" width={16} height={16}>
              <path d="M50 6 L94 50 L50 94 L6 50 Z" fill="none" stroke="#fff" strokeWidth="10" strokeLinejoin="round" />
              <path d="M50 26 L74 50 L50 74 L26 50 Z" fill="none" stroke="#0FA4AF" strokeWidth="10" strokeLinejoin="round" />
              <rect x="42" y="42" width="16" height="16" rx="5" fill="#964734" transform="rotate(45 50 50)" />
            </svg>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>Invictus</span>
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div
          className="ce-right-panel"
          ref={rightRef}
          style={{
            flex: 1, background: "#EFF3F1", display: "flex", flexDirection: "column",
            justifyContent: "center", padding: "60px 64px",
            position: "relative", overflow: "hidden",
          }}
        >
          {/* Subtle bg texture */}
          <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(0,49,53,0.04) 1px, transparent 1px)", backgroundSize: "24px 24px", pointerEvents: "none" }} />

          <div style={{ maxWidth: 460, position: "relative", zIndex: 1 }}>

            {/* Logo */}
            <div className="ce-stagger" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 56 }}>
              <svg viewBox="0 0 100 100" width={22} height={22}>
                <path d="M50 6 L94 50 L50 94 L6 50 Z" fill="none" stroke="#003135" strokeWidth="10" strokeLinejoin="round" />
                <path d="M50 26 L74 50 L50 74 L26 50 Z" fill="none" stroke="#0FA4AF" strokeWidth="10" strokeLinejoin="round" />
                <rect x="42" y="42" width="16" height="16" rx="5" fill="#964734" transform="rotate(45 50 50)" />
              </svg>
              <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>Invictus</span>
            </div>

            {/* Heading */}
            <div className="ce-stagger" style={{ marginBottom: 8 }}>
              <span style={{
                display: "inline-block", fontSize: 11, fontWeight: 700,
                letterSpacing: "0.12em", textTransform: "uppercase",
                color: "#0FA4AF", marginBottom: 12,
              }}>
                One more step
              </span>
              <h1 style={{
                fontSize: "clamp(28px, 4vw, 42px)", fontWeight: 800,
                lineHeight: 1.08, letterSpacing: "-0.03em",
                margin: 0, color: "#003135",
              }}>
                Check your inbox
              </h1>
            </div>

            {/* Description */}
            <p className="ce-stagger" style={{
              fontSize: 15, lineHeight: 1.65, color: "rgba(0,49,53,0.56)",
              margin: "14px 0 0", maxWidth: "52ch",
            }}>
              {pendingEmail ? (
                <>Confirmation sent to <strong style={{ color: "#003135", fontWeight: 700 }}>{pendingEmail}</strong>. Click the link inside, then return here.</>
              ) : (
                <>Confirmation sent. Click the link in your email, then return here.</>
              )}
            </p>

            {/* Steps — timeline style */}
            <div className="ce-stagger" style={{ margin: "36px 0 0", position: "relative" }}>
              {/* Vertical connector line */}
              <div style={{
                position: "absolute", left: 18, top: 32, bottom: 32,
                width: 1, background: "linear-gradient(to bottom, rgba(0,49,53,0.15), rgba(0,49,53,0.04))",
              }} />

              {steps.map((step, i) => (
                <div key={i} className="ce-step-item" style={{
                  display: "flex", alignItems: "center", gap: 20,
                  padding: "14px 0",
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: "50%", flexShrink: 0,
                    background: i === 0 ? "#003135" : "#fff",
                    border: `1px solid ${i === 0 ? "transparent" : "rgba(0,49,53,0.12)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    position: "relative", zIndex: 1,
                    boxShadow: i === 0 ? "0 4px 12px rgba(0,49,53,0.2)" : "none",
                    transition: "background 0.2s ease",
                  }}>
                    <span style={{
                      fontSize: 10, fontWeight: 800,
                      color: i === 0 ? "#0FA4AF" : "rgba(0,49,53,0.35)",
                      letterSpacing: "0.04em",
                    }}>
                      {step.n}
                    </span>
                  </div>
                  <span style={{
                    fontSize: 14, fontWeight: i === 0 ? 700 : 500,
                    color: i === 0 ? "#003135" : "rgba(0,49,53,0.45)",
                    letterSpacing: "-0.01em",
                  }}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>

            {/* Error */}
            {error && (
              <div className="ce-stagger" style={{
                marginTop: 24, padding: "12px 16px", borderRadius: 10,
                background: "rgba(150,71,52,0.07)", border: "1px solid rgba(150,71,52,0.18)",
                display: "flex", gap: 10, alignItems: "flex-start",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
                  <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#964734" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#964734", lineHeight: 1.5 }}>{error}</span>
              </div>
            )}

            {/* CTA */}
            <div className="ce-stagger" style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
              <button
                className="ce-btn-primary"
                onClick={handleContinue}
                disabled={checking || autoChecking}
                style={{
                  width: "100%", padding: "15px 24px",
                  background: "#964734", color: "#fff", border: "none",
                  borderRadius: 14, fontFamily: "inherit",
                  fontSize: 15, fontWeight: 700, cursor: checking ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  opacity: checking || autoChecking ? 0.75 : 1,
                  position: "relative", zIndex: 0,
                }}
              >
                <span style={{ position: "relative", zIndex: 1 }}>
                  {checking ? "Checking…" : autoChecking ? "Confirmed!" : "I confirmed my email"}
                </span>
                <span style={{
                  width: 32, height: 32, borderRadius: "50%",
                  background: "rgba(0,0,0,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", zIndex: 1, flexShrink: 0,
                }}>
                  {checking ? (
                    <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin-slow 0.75s linear infinite" }} />
                  ) : autoChecking ? (
                    <CheckCircle size={16} color="#fff" weight="fill" />
                  ) : (
                    <ArrowRight size={16} color="#fff" weight="bold" />
                  )}
                </span>
              </button>

              {/* Resend */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "2px 0" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(0,49,53,0.08)" }} />
                <button
                  className="ce-resend"
                  onClick={handleResend}
                  disabled={resent || !pendingEmail}
                  style={{
                    background: "none", border: "none", padding: "8px 12px",
                    borderRadius: 8, cursor: resent ? "default" : "pointer",
                    fontSize: 13, fontWeight: 600,
                    color: resent ? "#0FA4AF" : "rgba(0,49,53,0.45)",
                    display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit",
                    opacity: resent ? 1 : 1,
                  }}
                >
                  {resent ? (
                    <><CheckCircle size={14} weight="fill" color="#0FA4AF" /> Sent!</>
                  ) : (
                    <><ArrowClockwise size={14} weight="bold" /> Resend email</>
                  )}
                </button>
                <div style={{ flex: 1, height: 1, background: "rgba(0,49,53,0.08)" }} />
              </div>
            </div>

            {/* Back link */}
            <div className="ce-stagger" style={{ marginTop: 8 }}>
              <button
                className="ce-btn-ghost"
                onClick={() => router.push("/login")}
                style={{
                  background: "none", border: "none", padding: "8px 0",
                  cursor: "pointer", fontFamily: "inherit",
                  fontSize: 13, color: "rgba(0,49,53,0.38)", fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 6,
                }}
              >
                <ArrowLeft size={13} weight="bold" />
                Back to sign in
              </button>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}
