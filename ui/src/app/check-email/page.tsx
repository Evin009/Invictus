"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import gsap from "gsap"

const CSS = `
  @keyframes ce-float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
  @keyframes ce-pulse { 0%,100%{opacity:0.4;transform:scale(1)} 50%{opacity:0.8;transform:scale(1.07)} }
  @keyframes ce-spin  { to{transform:rotate(360deg)} }
  @keyframes ce-dot   { 0%,100%{opacity:0.3} 50%{opacity:1} }
  .ce-cta:hover:not(:disabled) { background: #7a3a29 !important; transform: translateY(-1px); box-shadow: 0 8px 20px rgba(150,71,52,0.3); }
  .ce-cta:active:not(:disabled) { transform: translateY(0); }
  .ce-cta { transition: background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease; }
`

export default function CheckEmailPage() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const containerRef = useRef<HTMLDivElement>(null)

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
      gsap.from(".ce-item", {
        opacity: 0, y: 18, duration: 0.55, ease: "power3.out",
        stagger: 0.07, delay: 0.08, clearProps: "transform,opacity",
      })
    }, containerRef)
    return () => ctx.revert()
  }, [])

  // Auto-navigate when Supabase fires SIGNED_IN after confirmation click
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session) {
        setAutoChecking(true)
        try { localStorage.removeItem("invictus-pending-email") } catch {}
        // Brief pause so user sees the state change, then fire loading page
        setTimeout(() => router.push("/signup-loading"), 600)
      }
    })
    return () => subscription.unsubscribe()
  }, [router, supabase])

  async function handleContinue() {
    setChecking(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        try { localStorage.removeItem("invictus-pending-email") } catch {}
        router.push("/signup-loading")
      } else {
        setError("Still waiting for confirmation — click the link in your email, then try again.")
      }
    } finally {
      setChecking(false)
    }
  }

  async function handleResend() {
    if (!pendingEmail || resent) return
    await supabase.auth.resend({ type: "signup", email: pendingEmail })
    setResent(true)
    setTimeout(() => setResent(false), 5000)
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

        {/* Background dot grid */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(0,49,53,0.055) 1px, transparent 1px)", backgroundSize: "28px 28px", pointerEvents: "none" }} />

        {/* Orbs */}
        <div style={{ position: "absolute", top: -180, right: -140, width: 440, height: 440, borderRadius: "50%", background: "radial-gradient(circle, rgba(15,164,175,0.13), transparent 70%)", pointerEvents: "none", animation: "ce-pulse 6s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: -200, left: -160, width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(150,71,52,0.10), transparent 70%)", pointerEvents: "none", animation: "ce-pulse 7s ease-in-out infinite", animationDelay: "1.2s" }} />

        <div style={{ width: "100%", maxWidth: 460, position: "relative", zIndex: 1 }}>

          {/* Logo */}
          <div className="ce-item" style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
            <svg viewBox="0 0 100 100" width={26} height={26}>
              <path d="M50 6 L94 50 L50 94 L6 50 Z" fill="none" stroke="#003135" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
              <path d="M50 26 L74 50 L50 74 L26 50 Z" fill="none" stroke="#0FA4AF" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
              <rect x="42" y="42" width="16" height="16" rx="5" fill="#964734" transform="rotate(45 50 50)" />
            </svg>
            <span style={{ fontSize: 15, fontWeight: 700 }}>Invictus</span>
          </div>

          {/* Envelope icon */}
          <div className="ce-item" style={{ display: "flex", justifyContent: "center", marginBottom: 34 }}>
            <div style={{ position: "relative", width: 90, height: 90 }}>
              <div style={{ position: "absolute", inset: -16, borderRadius: "50%", background: "radial-gradient(circle, rgba(15,164,175,0.15), transparent 70%)", animation: "ce-pulse 3.5s ease-in-out infinite", pointerEvents: "none" }} />
              <div style={{
                width: 90, height: 90, borderRadius: 22, background: "#003135",
                display: "flex", alignItems: "center", justifyContent: "center",
                position: "relative", animation: "ce-float 4.2s ease-in-out infinite",
                boxShadow: "0 20px 40px rgba(0,49,53,0.18)",
              }}>
                <svg width="42" height="42" viewBox="0 0 24 24" fill="none">
                  <rect x="2" y="4" width="20" height="16" rx="2.5" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="1.8" />
                  <path d="M2 6l10 8 10-8" stroke="#0FA4AF" strokeWidth="1.8" strokeLinecap="round" />
                </svg>
                {/* Notification badge */}
                {!autoChecking && (
                  <div style={{
                    position: "absolute", top: -6, right: -6, width: 20, height: 20,
                    borderRadius: "50%", background: "#964734", border: "2px solid #EFF3F1",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <span style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>1</span>
                  </div>
                )}
                {/* Auto-check spinner overlay */}
                {autoChecking && (
                  <div style={{
                    position: "absolute", inset: 0, borderRadius: 22,
                    background: "rgba(15,164,175,0.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.3)", borderTopColor: "#0FA4AF", animation: "ce-spin 0.75s linear infinite" }} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Heading */}
          <h1 className="ce-item" style={{ fontSize: 30, fontWeight: 800, margin: "0 0 10px", letterSpacing: "-0.02em", textAlign: "center" }}>
            {autoChecking ? "Confirmed!" : "Check your inbox"}
          </h1>
          <p className="ce-item" style={{ margin: "0 0 6px", fontSize: 14, color: "rgba(0,49,53,0.55)", textAlign: "center", lineHeight: 1.6 }}>
            {autoChecking ? "Taking you to setup now…" : "Confirmation email sent to"}
          </p>
          {pendingEmail && !autoChecking && (
            <p className="ce-item" style={{ margin: "0 0 36px", fontSize: 15, fontWeight: 700, color: "#003135", textAlign: "center" }}>
              {pendingEmail}
            </p>
          )}
          {autoChecking && <div style={{ height: 36 }} />}

          {!autoChecking && (
            <>
              {/* 3-step instructions */}
              <div className="ce-item" style={{ background: "#fff", borderRadius: 14, padding: "4px 20px", marginBottom: 20, boxShadow: "0 1px 3px rgba(0,49,53,0.06)" }}>
                {[
                  { n: "1", text: "Open the email from Invictus" },
                  { n: "2", text: "Click the confirmation link inside" },
                  { n: "3", text: "Return here and press Continue" },
                ].map((step, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderBottom: i < 2 ? "1px solid rgba(0,49,53,0.06)" : "none" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(2,73,80,0.09)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <span style={{ fontSize: 12, fontWeight: 800, color: "#024950" }}>{step.n}</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(0,49,53,0.68)" }}>{step.text}</span>
                  </div>
                ))}
              </div>

              {/* Error */}
              {error && (
                <div className="ce-item" style={{ background: "rgba(150,71,52,0.07)", border: "1px solid rgba(150,71,52,0.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 14, display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                    <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#964734" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#964734", lineHeight: 1.5 }}>{error}</span>
                </div>
              )}

              {/* CTA */}
              <button
                className="ce-item ce-cta"
                onClick={handleContinue}
                disabled={checking}
                style={{
                  width: "100%", padding: "15px", background: "#964734", color: "#fff", border: "none",
                  borderRadius: 14, fontFamily: "inherit", fontSize: 15, fontWeight: 700,
                  cursor: checking ? "default" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                  opacity: checking ? 0.82 : 1,
                }}
              >
                {checking ? (
                  <>
                    <div style={{ width: 16, height: 16, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff", animation: "ce-spin 0.75s linear infinite" }} />
                    Checking…
                  </>
                ) : (
                  <>
                    I confirmed my email
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </>
                )}
              </button>

              {/* Resend */}
              <div className="ce-item" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 20, fontSize: 13, color: "rgba(0,49,53,0.5)" }}>
                Didn&apos;t get it?{" "}
                <span
                  onClick={handleResend}
                  style={{ fontWeight: 700, color: resent ? "#0FA4AF" : "#003135", cursor: resent ? "default" : "pointer", transition: "color 0.2s ease" }}
                >
                  {resent ? "Sent!" : "Resend email"}
                </span>
              </div>

              <div className="ce-item" style={{ textAlign: "center", marginTop: 14 }}>
                <span onClick={() => router.push("/login")} style={{ fontSize: 13, color: "rgba(0,49,53,0.4)", cursor: "pointer", fontWeight: 600 }}>
                  ← Back to sign in
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}
