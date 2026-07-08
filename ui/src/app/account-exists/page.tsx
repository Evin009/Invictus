"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import gsap from "gsap"
import { ArrowRight, LockSimple, ArrowLeft, EnvelopeSimple } from "@phosphor-icons/react"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"

const CSS = `
  @keyframes orb-drift-a { 0%,100%{transform:translate(0,0)}  50%{transform:translate(16px,-12px)} }
  @keyframes orb-drift-b { 0%,100%{transform:translate(0,0)}  50%{transform:translate(-10px,8px)} }
  @keyframes sparkle-a   { 0%,100%{opacity:0;transform:scale(0.3)} 55%{opacity:1;transform:scale(1)} }
  @keyframes sparkle-b   { 0%,100%{opacity:0;transform:scale(0.2)} 50%{opacity:0.75;transform:scale(1)} }
  @keyframes spin-slow   { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }

  .ae-btn-primary {
    position:relative; overflow:hidden;
    transition: box-shadow 0.28s cubic-bezier(0.16,1,0.3,1), transform 0.18s cubic-bezier(0.16,1,0.3,1);
  }
  .ae-btn-primary::before {
    content:''; position:absolute; inset:0;
    background:#7a3a29;
    transform:translateX(-101%);
    transition:transform 0.38s cubic-bezier(0.16,1,0.3,1);
  }
  .ae-btn-primary:hover::before { transform:translateX(0); }
  .ae-btn-primary:hover { box-shadow:0 14px 36px rgba(150,71,52,0.28); transform:translateY(-2px); }
  .ae-btn-primary:active { transform:translateY(0) scale(0.98); }

  .ae-btn-ghost {
    transition: background 0.2s ease, transform 0.18s cubic-bezier(0.16,1,0.3,1);
  }
  .ae-btn-ghost:hover { background:rgba(0,49,53,0.07) !important; transform:translateY(-1px); }
  .ae-btn-ghost:active { transform:scale(0.98); }

  .ae-link { transition: color 0.2s ease; }
  .ae-link:hover { color:rgba(0,49,53,0.7) !important; }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after { animation-duration:0.01ms !important; transition-duration:0.01ms !important; }
  }
`

export default function AccountExistsPage() {
  const router   = useRouter()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const rootRef  = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("email") ?? ""
      setEmail(decodeURIComponent(p))
    }
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set(".ae-char",    { opacity: 0, y: -20 })
      gsap.set(".ae-stagger", { opacity: 0, y: 20 })
      gsap.to(".ae-char", {
        opacity: 1, y: 0, duration: 0.7, ease: "power3.out", delay: 0.05,
        clearProps: "transform,opacity",
      })
      gsap.to(".ae-stagger", {
        opacity: 1, y: 0, duration: 0.56, ease: "power3.out",
        stagger: 0.07, delay: 0.18, clearProps: "transform,opacity",
      })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

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
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(0,49,53,0.055) 1px, transparent 1px)", backgroundSize: "26px 26px", pointerEvents: "none" }} />
        <div style={{
          position: "absolute", top: "8%", left: "50%", transform: "translateX(-50%)",
          width: 520, height: 520, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(150,71,52,0.1) 0%, transparent 68%)",
          pointerEvents: "none", animation: "orb-drift-a 10s ease-in-out infinite",
        }} />
        <div style={{
          position: "absolute", bottom: "6%", left: "12%",
          width: 300, height: 300, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(15,164,175,0.09) 0%, transparent 70%)",
          pointerEvents: "none", animation: "orb-drift-b 12s ease-in-out infinite",
        }} />

        {/* ── CONTENT ── */}
        <div style={{
          position: "relative", zIndex: 1, width: "100%", maxWidth: 460,
          display: "flex", flexDirection: "column", alignItems: "center",
        }}>

          {/* Logo */}
          <div className="ae-stagger" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 48, alignSelf: "flex-start" }}>
            <svg viewBox="0 0 100 100" width={22} height={22}>
              <path d="M50 6 L94 50 L50 94 L6 50 Z" fill="none" stroke="#003135" strokeWidth="10" strokeLinejoin="round" />
              <path d="M50 26 L74 50 L50 74 L26 50 Z" fill="none" stroke="#0FA4AF" strokeWidth="10" strokeLinejoin="round" />
              <rect x="42" y="42" width="16" height="16" rx="5" fill="#964734" transform="rotate(45 50 50)" />
            </svg>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: "-0.01em" }}>Invictus</span>
          </div>

          {/* ── ICON ── */}
          <div className="ae-char" style={{ marginBottom: 20 }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "#964734",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 24px rgba(150,71,52,0.3)",
            }}>
              <LockSimple size={28} color="white" weight="fill" />
            </div>
          </div>

          {/* ── COPY ── */}
          <div className="ae-stagger" style={{ textAlign: "center", marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#964734" }}>
              Already registered
            </span>
          </div>

          <h1 className="ae-stagger" style={{
            fontSize: "clamp(24px, 5vw, 36px)", fontWeight: 800,
            letterSpacing: "-0.03em", lineHeight: 1.1,
            margin: "6px 0 0", textAlign: "center", color: "#003135",
          }}>
            Account already exists
          </h1>

          <p className="ae-stagger" style={{
            fontSize: 14, lineHeight: 1.7, color: "rgba(0,49,53,0.52)",
            margin: "12px 0 0", textAlign: "center", maxWidth: "42ch",
          }}>
            {email
              ? <><strong style={{ color: "#003135", fontWeight: 700 }}>{email}</strong> is already registered. Sign in to pick up where you left off.</>
              : <>An account with that email already exists. Sign in to continue.</>
            }
          </p>

          {/* ── ACTIONS ── */}
          <div className="ae-stagger" style={{ marginTop: 32, width: "100%", display: "flex", flexDirection: "column", gap: 10 }}>

            {/* Sign in — primary */}
            <button
              className="ae-btn-primary"
              onClick={() => router.push("/login")}
              style={{
                width: "100%", padding: "15px 24px",
                background: "#964734", color: "#fff", border: "none",
                borderRadius: 14, fontFamily: "inherit",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
                position: "relative", zIndex: 0,
              }}
            >
              <span style={{ position: "relative", zIndex: 1 }}>Sign in to my account</span>
              <span style={{
                width: 32, height: 32, borderRadius: "50%",
                background: "rgba(0,0,0,0.14)",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", zIndex: 1, flexShrink: 0,
              }}>
                <ArrowRight size={15} color="#fff" weight="bold" />
              </span>
            </button>

            {/* Forgot password — ghost */}
            <button
              className="ae-btn-ghost"
              onClick={() => router.push("/login?forgot=1")}
              style={{
                width: "100%", padding: "14px 24px",
                background: "#fff", color: "#003135",
                border: "1px solid rgba(0,49,53,0.1)", borderRadius: 14,
                fontFamily: "inherit", fontSize: 14, fontWeight: 600,
                cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}
            >
              <span>Forgot my password</span>
              <LockSimple size={15} color="rgba(0,49,53,0.4)" weight="regular" />
            </button>

          </div>

          {/* Divider */}
          <div className="ae-stagger" style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 18, width: "100%" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(0,49,53,0.08)" }} />
            <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,49,53,0.3)" }}>or</span>
            <div style={{ flex: 1, height: 1, background: "rgba(0,49,53,0.08)" }} />
          </div>

          {/* Different email */}
          <div className="ae-stagger" style={{ marginTop: 14, textAlign: "center" }}>
            <button
              className="ae-link"
              onClick={async () => { await supabase.auth.signOut(); router.push("/login?signup=1") }}
              style={{
                background: "none", border: "none", padding: "6px 8px",
                fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                color: "rgba(0,49,53,0.38)", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              <EnvelopeSimple size={13} weight="bold" />
              Use a different email
            </button>
          </div>

          {/* Back */}
          <div className="ae-stagger" style={{ marginTop: 6 }}>
            <button
              className="ae-link"
              onClick={() => router.push("/login")}
              style={{
                background: "none", border: "none", padding: "6px 0",
                fontFamily: "inherit", fontSize: 12, fontWeight: 600,
                color: "rgba(0,49,53,0.3)", cursor: "pointer",
                display: "inline-flex", alignItems: "center", gap: 5,
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
