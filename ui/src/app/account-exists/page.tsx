"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import gsap from "gsap"

const CSS = `
  @keyframes ae-pulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.07)} }
  @keyframes ae-bob   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
  .ae-cta-primary:hover  { background: #7a3a29 !important; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(150,71,52,0.28); }
  .ae-cta-primary:active { transform: translateY(0) !important; }
  .ae-cta-ghost:hover    { background: rgba(0,49,53,0.06) !important; }
  .ae-cta-primary, .ae-cta-ghost { transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease; }
`

export default function AccountExistsPage() {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState("")

  useEffect(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search).get("email") ?? ""
      setEmail(decodeURIComponent(p))
    }
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".ae-item", {
        opacity: 0, y: 18, duration: 0.52, ease: "power3.out",
        stagger: 0.07, delay: 0.08, clearProps: "transform,opacity",
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  function goSignIn() {
    router.push("/login")
  }

  function goForgotPassword() {
    router.push("/login?forgot=1")
  }

  function tryDifferentEmail() {
    router.push("/login?signup=1")
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div ref={containerRef} style={{
        minHeight: "100dvh", width: "100%", background: "#EFF3F1",
        fontFamily: "var(--font-space-grotesk,'Space Grotesk',sans-serif)",
        color: "#003135", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "40px 24px",
        position: "relative", overflow: "hidden",
      }}>

        {/* Dot grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(0,49,53,0.055) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />

        {/* Ambient orbs */}
        <div style={{ position: "absolute", top: -160, right: -130, width: 420, height: 420, borderRadius: "50%", background: "radial-gradient(circle, rgba(150,71,52,0.12), transparent 70%)", pointerEvents: "none", animation: "ae-pulse 6s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: -180, left: -150, width: 460, height: 460, borderRadius: "50%", background: "radial-gradient(circle, rgba(15,164,175,0.10), transparent 70%)", pointerEvents: "none", animation: "ae-pulse 7s ease-in-out infinite", animationDelay: "1s" }} />

        <div style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 1 }}>

          {/* Logo */}
          <div className="ae-item" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
            <svg viewBox="0 0 100 100" width={26} height={26}>
              <path d="M50 6 L94 50 L50 94 L6 50 Z" fill="none" stroke="#003135" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
              <path d="M50 26 L74 50 L50 74 L26 50 Z" fill="none" stroke="#0FA4AF" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
              <rect x="42" y="42" width="16" height="16" rx="5" fill="#964734" transform="rotate(45 50 50)" />
            </svg>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Invictus</span>
          </div>

          {/* Icon */}
          <div className="ae-item" style={{ display: "flex", justifyContent: "center", marginBottom: 32 }}>
            <div style={{ position: "relative", width: 90, height: 90 }}>
              <div style={{ position: "absolute", inset: -16, borderRadius: "50%", background: "radial-gradient(circle, rgba(150,71,52,0.15), transparent 70%)", animation: "ae-pulse 3.5s ease-in-out infinite" }} />
              <div style={{
                width: 90, height: 90, borderRadius: 22, background: "#003135",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", animation: "ae-bob 4s ease-in-out infinite",
                boxShadow: "0 20px 40px rgba(0,49,53,0.18)",
              }}>
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="8" r="4" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" />
                  <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" strokeLinecap="round" />
                  {/* Shield checkmark badge */}
                  <circle cx="19" cy="5" r="4.5" fill="#964734" />
                  <path d="M17.5 5l1 1.2 2-2" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Heading */}
          <h1 className="ae-item" style={{ fontSize: 28, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.02em", textAlign: "center" }}>
            Account already exists
          </h1>

          {email ? (
            <p className="ae-item" style={{ margin: "0 0 32px", fontSize: 14, color: "rgba(0,49,53,0.55)", textAlign: "center", lineHeight: 1.6 }}>
              An Invictus account is already registered to{" "}
              <strong style={{ color: "#003135", fontWeight: 700 }}>{email}</strong>.
              <br />Sign in to pick up where you left off.
            </p>
          ) : (
            <p className="ae-item" style={{ margin: "0 0 32px", fontSize: 14, color: "rgba(0,49,53,0.55)", textAlign: "center", lineHeight: 1.6 }}>
              An account with that email already exists.
              <br />Sign in to pick up where you left off.
            </p>
          )}

          {/* Actions */}
          <div className="ae-item" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              className="ae-cta-primary"
              onClick={goSignIn}
              style={{
                width: "100%", padding: "15px", background: "#964734", color: "#fff",
                border: "none", borderRadius: 14, fontFamily: "inherit",
                fontSize: 15, fontWeight: 700, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              }}
            >
              Sign in to my account
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>

            <button
              className="ae-cta-ghost"
              onClick={goForgotPassword}
              style={{
                width: "100%", padding: "14px", background: "#fff", color: "#003135",
                border: "1px solid rgba(0,49,53,0.14)", borderRadius: 14, fontFamily: "inherit",
                fontSize: 14, fontWeight: 600, cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
                <path d="M8 11V7a4 4 0 118 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              Forgot my password
            </button>
          </div>

          <div className="ae-item" style={{ textAlign: "center", marginTop: 22 }}>
            <span
              onClick={tryDifferentEmail}
              style={{ fontSize: 13, color: "rgba(0,49,53,0.45)", cursor: "pointer", fontWeight: 600 }}
            >
              Use a different email instead
            </span>
          </div>

        </div>
      </div>
    </>
  )
}
