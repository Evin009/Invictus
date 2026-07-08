"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import gsap from "gsap"
import LoginScene from "@/components/login-scene"

type View = "auth" | "forgot" | "forgot_sent"

function passwordScore(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

const STRENGTH_META = [
  { label: "Too weak",  color: "#C4573F" },
  { label: "Weak",      color: "#E39C88" },
  { label: "Okay",      color: "#D9B25C" },
  { label: "Good",      color: "#0FA4AF" },
  { label: "Strong",    color: "#4FD1B5" },
]

const PW_REQS = [
  { label: "8+ characters",    test: (pw: string) => pw.length >= 8 },
  { label: "Uppercase letter", test: (pw: string) => /[A-Z]/.test(pw) },
  { label: "Number",           test: (pw: string) => /[0-9]/.test(pw) },
  { label: "Special character",test: (pw: string) => /[^A-Za-z0-9]/.test(pw) },
]

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const INJECTED_CSS = `
  *{box-sizing:border-box}
  body{margin:0}
  input::placeholder{color:rgba(255,255,255,0.35)}
  .li-input{outline:none !important;box-shadow:none !important;background:transparent;border:none;color:#fff;font-family:'Space Grotesk',sans-serif;font-size:14px;padding:14px 0;flex:1;width:100%;}
  .li-input::selection{background:rgba(15,164,175,0.4);color:#fff;}
  .li-input:focus-visible{outline:none;}
  .li-field:focus-within{border-color:#0FA4AF !important;background:rgba(255,255,255,0.09) !important;}
  .li-submit:hover:not(:disabled){background:#A85A41 !important;transform:translateY(-1px);box-shadow:0 8px 20px rgba(150,71,52,0.35);}
  .li-submit:active:not(:disabled){transform:translateY(0);}
  .li-submit{display:flex;align-items:center;justify-content:center;gap:8px;background:#964734;color:#fff;border:none;border-radius:26px;padding:15px;font-family:'Space Grotesk',sans-serif;font-size:14px;font-weight:700;cursor:pointer;margin-top:4px;transition:background 0.15s ease,transform 0.15s ease,box-shadow 0.15s ease;width:100%;}
  .li-submit:disabled{opacity:0.85;cursor:default;}

  .li-eye { background: none; border: none; cursor: pointer; padding: 0; color: rgba(255,255,255,0.35); display: flex; align-items: center; flex-shrink: 0; transition: color 0.15s ease; }
  .li-eye:hover { color: rgba(255,255,255,0.7); }
  .li-pw-seg { transition: background 0.3s ease, transform 0.2s ease; }
  .li-pw-req { transition: opacity 0.25s ease, color 0.25s ease; }
  .li-panel-scroll::-webkit-scrollbar { width: 3px; }
  .li-panel-scroll::-webkit-scrollbar-track { background: transparent; }
  .li-panel-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 4px; }
  .li-panel-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.28); }
  @keyframes li-pulse{0%,100%{opacity:0.55;transform:scale(1)}50%{opacity:0.9;transform:scale(1.08)}}
  @keyframes li-slide{from{background-position:0 0}to{background-position:160px 160px}}
  @keyframes li-spin-btn{to{transform:rotate(360deg)}}

  @media (prefers-reduced-motion: reduce) {
    .li-field,.li-submit,[style*="li-pulse"],[style*="li-slide"]{animation:none !important;}
  }
`

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])
  const formPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    if (params.get("confirmed") === "1") setEmailConfirmed(true)
    if (params.get("forgot") === "1") setView("forgot")
    if (params.get("signup") === "1") setIsSignUp(true)
  }, [])

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".li-form-item", {
        opacity: 0, y: 16, duration: 0.52, ease: "power3.out",
        stagger: 0.07, delay: 0.1, clearProps: "transform,opacity",
      })
    }, formPanelRef)
    return () => ctx.revert()
  }, [])

  const [emailConfirmed, setEmailConfirmed]        = useState(false)
  const [view, setView]                           = useState<View>("auth")
  const [isSignUp, setIsSignUp]                   = useState(false)
  const [email, setEmail]                         = useState("")
  const [emailTouched, setEmailTouched]           = useState(false)
  const [password, setPassword]                   = useState("")
  const [passwordTouched, setPasswordTouched]     = useState(false)
  const [confirmPassword, setConfirmPassword]     = useState("")
  const [confirmTouched, setConfirmTouched]       = useState(false)
  const [isLoading, setIsLoading]                 = useState(false)
  const [authError, setAuthError]                 = useState<string | null>(null)
  const [showPassword, setShowPassword]           = useState(false)
  const [showConfirm, setShowConfirm]             = useState(false)
  const [resetEmail, setResetEmail]               = useState("")
  const [resetEmailTouched, setResetEmailTouched] = useState(false)
  const [isResetLoading, setIsResetLoading]       = useState(false)
  const [resetError, setResetError]               = useState<string | null>(null)

  const hasEmailError      = emailTouched && email.trim().length > 0 && !EMAIL_RE.test(email.trim())
  const hasMinLenError     = passwordTouched && password.length > 0 && password.length < 8
  const hasConfirmError    = confirmTouched && confirmPassword.length > 0 && confirmPassword !== password
  const confirmMatches     = confirmTouched && confirmPassword.length > 0 && confirmPassword === password
  const hasResetEmailError = resetEmailTouched && resetEmail.trim().length > 0 && !EMAIL_RE.test(resetEmail.trim())

  const score        = passwordScore(password)
  const strengthMeta = STRENGTH_META[score]

  const fieldBase: React.CSSProperties = {
    display: "flex", alignItems: "center", gap: 10,
    background: "rgba(255,255,255,0.06)",
    border: "1px solid rgba(255,255,255,0.12)",
    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.12)",
    borderRadius: 14, padding: "0 18px",
  }

  async function handleSubmit() {
    setEmailTouched(true)
    setPasswordTouched(true)
    setConfirmTouched(true)
    setAuthError(null)
    if (!EMAIL_RE.test(email.trim())) return
    if (isSignUp && password.length < 8) return
    if (isSignUp && score < 2) return
    if (isSignUp && confirmPassword !== password) return
    setIsLoading(true)
    try {
      if (isSignUp) {
        const { data: signUpData, error } = await supabase.auth.signUp({
          email: email.trim(), password,
          options: { emailRedirectTo: `${location.origin}/auth/callback` },
        })
        // "User already registered" error
        if (error) {
          const msg = error.message.toLowerCase()
          if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
            router.push(`/account-exists?email=${encodeURIComponent(email.trim())}`)
            return
          }
          if (msg.includes("rate limit") || msg.includes("too many") || msg.includes("exceeded")) {
            setAuthError("Too many attempts — wait a few minutes and try again.")
            return
          }
          setAuthError(error.message)
          return
        }
        // Supabase returns identities=[] when email already taken (email-confirm mode)
        if (signUpData.user && (signUpData.user.identities?.length === 0)) {
          router.push(`/account-exists?email=${encodeURIComponent(email.trim())}`)
          return
        }
        try { localStorage.setItem("invictus-pending-email", email.trim()) } catch {}
        router.push("/check-email")
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) { setAuthError(error.message); return }
        // New user (no profile yet) → onboarding loading page. Returning user → dashboard.
        try {
          const profileRes = await fetch("/api/profile")
          const profileData = await profileRes.json()
          if (profileData && profileData.full_name) {
            router.push("/dashboard")
          } else {
            router.push("/signup-loading")
          }
        } catch {
          router.push("/signup-loading")
        }
      }
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSendReset() {
    setResetEmailTouched(true)
    setResetError(null)
    if (!EMAIL_RE.test(resetEmail.trim())) return
    setIsResetLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${location.origin}/auth/callback?next=/reset-password`,
      })
      if (error) { setResetError(error.message); return }
      setView("forgot_sent")
    } finally {
      setIsResetLoading(false)
    }
  }

  function toggleMode() {
    setIsSignUp(p => !p)
    setEmail(""); setEmailTouched(false)
    setPassword(""); setPasswordTouched(false)
    setConfirmPassword(""); setConfirmTouched(false)
    setAuthError(null)
  }

  const Spinner = () => (
    <span style={{
      width: 16, height: 16, borderRadius: "50%",
      border: "2px solid rgba(255,255,255,0.35)", borderTopColor: "#fff",
      animation: "li-spin-btn 0.7s linear infinite", display: "inline-block",
    }} />
  )

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: INJECTED_CSS }} />

      {/* ── Outer page bg ── */}
      <div style={{
        minHeight: "100vh", width: "100%", background: "#EFF3F1",
        fontFamily: "'Space Grotesk', sans-serif",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 32, position: "relative", overflow: "hidden",
      }}>

        {/* Animated crosshatch grids */}
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(45deg, rgba(2,73,80,0.06) 0px, rgba(2,73,80,0.06) 2px, transparent 2px, transparent 32px)", animation: "li-slide 6s linear infinite", pointerEvents: "none" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-linear-gradient(-45deg, rgba(150,71,52,0.05) 0px, rgba(150,71,52,0.05) 2px, transparent 2px, transparent 46px)", animation: "li-slide 9s linear infinite reverse", pointerEvents: "none" }} />

        {/* Ambient orbs */}
        <div style={{ position: "absolute", top: -220, right: -160, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(15,164,175,0.14), rgba(15,164,175,0) 70%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: -240, left: -180, width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, rgba(150,71,52,0.12), rgba(150,71,52,0) 70%)", pointerEvents: "none" }} />

        {/* ── Main card ── */}
        <div style={{
          width: "100%", maxWidth: 1080, height: 640,
          background: "#003135", borderRadius: 32,
          boxShadow: "0 30px 80px rgba(0,49,53,0.28)",
          display: "flex", overflow: "hidden", position: "relative", zIndex: 1,
        }}>

          {/* ── Left: form panel ── */}
          <div ref={formPanelRef} className="li-panel-scroll" style={{ width: "44%", flexShrink: 0, padding: "48px 52px", display: "flex", flexDirection: "column", color: "#fff", position: "relative", overflowY: "auto" }}>

            {/* Logo */}
            <div className="li-form-item" style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <svg viewBox="0 0 100 100" width={26} height={26} style={{ flexShrink: 0 }}>
                <path d="M50 6 L94 50 L50 94 L6 50 Z" fill="none" stroke="#fff" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
                <path d="M50 26 L74 50 L50 74 L26 50 Z" fill="none" stroke="#0FA4AF" strokeWidth="8" strokeLinejoin="round" strokeLinecap="round" />
                <rect x="42" y="42" width="16" height="16" rx="5" fill="#964734" transform="rotate(45 50 50)" />
              </svg>
              <span style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.02em" }}>Invictus</span>
            </div>

            {/* Form content vertically centered */}
            <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>

              {/* ── Auth view ── */}
              {view === "auth" && (
                <>
                  {/* Email confirmed banner */}
                  {emailConfirmed && (
                    <div className="li-form-item" style={{
                      display: "flex", alignItems: "center", gap: 10,
                      background: "rgba(15,164,175,0.14)", border: "1px solid rgba(15,164,175,0.3)",
                      borderRadius: 12, padding: "11px 14px", marginBottom: 20,
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                        <circle cx="12" cy="12" r="10" stroke="#0FA4AF" strokeWidth="2" />
                        <path d="M8 12l3 3 5-5" stroke="#0FA4AF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#0FA4AF" }}>
                        Email confirmed — sign in to continue
                      </span>
                    </div>
                  )}

                  <h1 className="li-form-item" style={{ fontSize: 28, fontWeight: 800, margin: "0 0 6px", letterSpacing: "-0.02em" }}>
                    {isSignUp ? "Create your account" : "Welcome back"}
                  </h1>
                  <p className="li-form-item" style={{ fontSize: 13, color: "rgba(255,255,255,0.45)", margin: "0 0 28px", lineHeight: 1.6 }}>
                    {isSignUp
                      ? "Set up your profile and let the agent start working for you."
                      : "Sign in to pick up where you left off."}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                    {/* Full name */}
                    {isSignUp && (
                      <div className="li-form-item">
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.38)", letterSpacing: "0.08em", marginBottom: 7 }}>FULL NAME</label>
                        <div className="li-field" style={{ ...fieldBase }}>
                          <NameIcon />
                          <input className="li-input" type="text" placeholder="Your name" />
                        </div>
                      </div>
                    )}

                    {/* Email */}
                    <div className="li-form-item">
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.38)", letterSpacing: "0.08em", marginBottom: 7 }}>EMAIL</label>
                      <div className="li-field" style={{ ...fieldBase, borderColor: hasEmailError ? "#E39C88" : "rgba(255,255,255,0.12)" }}>
                        <EmailIcon />
                        <input
                          className="li-input" type="email" placeholder="you@example.com"
                          value={email}
                          onChange={e => { setEmail(e.target.value); setAuthError(null) }}
                          onBlur={() => setEmailTouched(true)}
                        />
                      </div>
                      {hasEmailError && <p style={{ margin: "6px 0 0 4px", fontSize: 12, color: "#E39C88" }}>Enter a valid email address</p>}
                    </div>

                    {/* Password */}
                    <div className="li-form-item">
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.38)", letterSpacing: "0.08em", marginBottom: 7 }}>PASSWORD</label>
                      <div className="li-field" style={{
                        ...fieldBase,
                        borderColor: isSignUp && passwordTouched && score < 2 && password.length > 0
                          ? "#E39C88"
                          : isSignUp && score >= 3
                          ? "rgba(15,164,175,0.5)"
                          : "rgba(255,255,255,0.12)",
                      }}>
                        <LockIcon />
                        <input
                          className="li-input" type={showPassword ? "text" : "password"} placeholder="Password"
                          value={password}
                          onChange={e => { setPassword(e.target.value); setAuthError(null) }}
                          onBlur={() => setPasswordTouched(true)}
                        />
                        <button className="li-eye" type="button" onClick={() => setShowPassword(p => !p)} tabIndex={-1}>
                          {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                        </button>
                      </div>

                      {/* Strength bar — visible in signup as soon as typing starts */}
                      {isSignUp && password.length > 0 && (
                        <div style={{ margin: "10px 0 0 2px" }}>
                          {/* 4 segments */}
                          <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                            {[0,1,2,3].map(i => (
                              <div
                                key={i}
                                className="li-pw-seg"
                                style={{
                                  flex: 1, height: 4, borderRadius: 3,
                                  background: i < score ? strengthMeta.color : "rgba(255,255,255,0.12)",
                                  transform: i < score ? "scaleY(1.25)" : "scaleY(1)",
                                }}
                              />
                            ))}
                          </div>
                          {/* Label + strength text */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em" }}>STRENGTH</span>
                            <span className="li-pw-req" style={{ fontSize: 11, fontWeight: 700, color: strengthMeta.color }}>
                              {strengthMeta.label}
                            </span>
                          </div>
                          {/* Requirements checklist */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            {PW_REQS.map((req, i) => {
                              const met = req.test(password)
                              return (
                                <div key={i} className="li-pw-req" style={{ display: "flex", alignItems: "center", gap: 8, opacity: met ? 1 : 0.45 }}>
                                  <div style={{
                                    width: 16, height: 16, borderRadius: "50%", flexShrink: 0,
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    background: met ? "rgba(15,164,175,0.18)" : "rgba(255,255,255,0.08)",
                                    transition: "background 0.25s ease",
                                  }}>
                                    {met ? (
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none">
                                        <path d="M5 13l4 4L19 7" stroke="#0FA4AF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    ) : (
                                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: "rgba(255,255,255,0.25)" }} />
                                    )}
                                  </div>
                                  <span style={{ fontSize: 11, fontWeight: 600, color: met ? "rgba(255,255,255,0.75)" : "rgba(255,255,255,0.38)" }}>
                                    {req.label}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm password */}
                    {isSignUp && (
                      <div className="li-form-item">
                        <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.38)", letterSpacing: "0.08em", marginBottom: 7 }}>CONFIRM PASSWORD</label>
                        <div className="li-field" style={{ ...fieldBase, borderColor: hasConfirmError ? "#E39C88" : confirmMatches ? "#4FD1B5" : "rgba(255,255,255,0.12)" }}>
                          <LockIcon />
                          <input
                            className="li-input" type={showConfirm ? "text" : "password"} placeholder="Confirm password"
                            value={confirmPassword}
                            onChange={e => { setConfirmPassword(e.target.value); setConfirmTouched(true) }}
                          />
                          <button className="li-eye" type="button" onClick={() => setShowConfirm(p => !p)} tabIndex={-1}>
                            {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                          </button>
                        </div>
                        {hasConfirmError && <p style={{ margin: "6px 0 0 18px", fontSize: 12, color: "#E39C88" }}>Passwords don{"'"}t match</p>}
                        {confirmMatches && <p style={{ margin: "6px 0 0 18px", fontSize: 12, color: "#4FD1B5" }}>Passwords match</p>}
                      </div>
                    )}

                    {/* Forgot link */}
                    {!isSignUp && (
                      <div className="li-form-item" style={{ textAlign: "right", marginTop: -2 }}>
                        <span
                          onClick={() => { setView("forgot"); setResetEmail(email); setResetEmailTouched(false); setResetError(null) }}
                          style={{ fontSize: 12, color: "rgba(255,255,255,0.45)", cursor: "pointer" }}
                        >
                          Forgot password?
                        </span>
                      </div>
                    )}

                    {/* Auth error */}
                    {authError && (
                      <div className="li-form-item" style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(227,156,136,0.12)", border: "1px solid rgba(227,156,136,0.35)", borderRadius: 14, padding: "10px 14px", marginTop: -2 }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#E39C88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span style={{ fontSize: 12, color: "#E39C88" }}>{authError}</span>
                      </div>
                    )}

                    {/* Submit */}
                    <button className="li-submit li-form-item" onClick={handleSubmit} disabled={isLoading}>
                      {isLoading ? <Spinner /> : (
                        <>
                          <span>{isSignUp ? "Create account" : "Sign in"}</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </>
                      )}
                    </button>

                    {/* Toggle */}
                    <p className="li-form-item" style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "6px 0 0" }}>
                      {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                      <span onClick={toggleMode} style={{ color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                        {isSignUp ? "Sign in" : "Sign up"}
                      </span>
                    </p>
                  </div>
                </>
              )}

              {/* ── Forgot password view ── */}
              {view === "forgot" && (
                <>
                  <h1 style={{ fontSize: 30, fontWeight: 700, margin: "0 0 8px" }}>Reset your password</h1>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 32px" }}>
                    Enter the email on your account and we{"'"}ll send a reset link.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div>
                      <div className="li-field" style={{ ...fieldBase, borderColor: hasResetEmailError ? "#E39C88" : "rgba(255,255,255,0.12)" }}>
                        <EmailIcon />
                        <input
                          className="li-input" type="email" placeholder="Email"
                          value={resetEmail}
                          onChange={e => { setResetEmail(e.target.value); setResetError(null) }}
                          onBlur={() => setResetEmailTouched(true)}
                        />
                      </div>
                      {hasResetEmailError && <p style={{ margin: "6px 0 0 18px", fontSize: 12, color: "#E39C88" }}>Enter a valid email address</p>}
                    </div>
                    {resetError && (
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(227,156,136,0.12)", border: "1px solid rgba(227,156,136,0.35)", borderRadius: 14, padding: "10px 14px" }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" stroke="#E39C88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        <span style={{ fontSize: 12, color: "#E39C88" }}>{resetError}</span>
                      </div>
                    )}
                    <button className="li-submit" onClick={handleSendReset} disabled={isResetLoading}>
                      {isResetLoading ? <Spinner /> : (
                        <>
                          <span>Send reset link</span>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                            <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </>
                      )}
                    </button>
                    <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "6px 0 0" }}>
                      <span onClick={() => setView("auth")} style={{ color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                        Back to sign in
                      </span>
                    </p>
                  </div>
                </>
              )}

              {/* ── Forgot sent view ── */}
              {view === "forgot_sent" && (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(15,164,175,0.16)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#0FA4AF" strokeWidth="2"/>
                      <path d="M3 6l9 7 9-7" stroke="#0FA4AF" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 8px" }}>Check your email</h1>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 32px", lineHeight: 1.6 }}>
                    We{"'"}ve sent a password reset link to{" "}
                    <span style={{ color: "#fff", fontWeight: 700 }}>{resetEmail}</span>. It{"'"}ll expire in 30 minutes.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <button className="li-submit" onClick={() => setView("auth")}>
                      <span>Back to sign in</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                    <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "6px 0 0" }}>
                      Didn{"'"}t get it?{" "}
                      <span onClick={handleSendReset} style={{ color: "#fff", fontWeight: 700, cursor: "pointer" }}>Resend</span>
                    </p>
                  </div>
                </>
              )}

            </div>
          </div>

          {/* ── Right: animated pipeline panel ── */}
          <div style={{
            flex: 1, position: "relative", margin: "14px 14px 14px 0",
            borderRadius: 24, overflow: "hidden",
            background: "radial-gradient(circle at 50% 34%, #F4FBFB 0%, #DCEEEF 45%, #C7E4E6 100%)",
          }}>

            {/* Dot grid */}
            <div style={{ position: "absolute", inset: 0, backgroundImage: "radial-gradient(rgba(2,73,80,0.13) 1.5px, transparent 1.5px)", backgroundSize: "26px 26px" }} />

            {/* Ambient glows */}
            <div style={{ position: "absolute", top: "12%", left: "10%", width: 170, height: 170, borderRadius: "50%", background: "radial-gradient(circle, rgba(15,164,175,0.22), rgba(15,164,175,0) 70%)", animation: "li-pulse 6s ease-in-out infinite" }} />
            <div style={{ position: "absolute", bottom: "8%", right: "8%", width: 190, height: 190, borderRadius: "50%", background: "radial-gradient(circle, rgba(150,71,52,0.2), rgba(150,71,52,0) 70%)", animation: "li-pulse 7s ease-in-out infinite", animationDelay: "1.5s" }} />

            {/* ── Animated desk scene: student studies, agents apply ── */}
            <LoginScene />

            {/* Caption */}
            <div style={{ position: "absolute", left: 0, right: 0, top: 24, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(2,49,53,0.5)" }}>
                YOU STUDY. YOUR AGENTS APPLY.
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  )
}

function NameIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.45 }}>
      <circle cx="12" cy="8" r="4" stroke="#fff" strokeWidth="2" />
      <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function EmailIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.45 }}>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="#fff" strokeWidth="2" />
      <path d="M3 6l9 7 9-7" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function LockIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: 0.45 }}>
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="#fff" strokeWidth="2" />
      <path d="M8 11V7a4 4 0 118 0v4" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M14.12 14.12a3 3 0 11-4.24-4.24" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}
