"use client"

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"

type View = "auth" | "forgot" | "forgot_sent"

const PARTICLE_DEFS = [
  { left: "10%", bottom: "20%", size: 8,  delay: 0,   dur: 7,   color: "#024950" },
  { left: "22%", bottom: "14%", size: 6,  delay: 1.4, dur: 6,   color: "#0FA4AF" },
  { left: "35%", bottom: "26%", size: 10, delay: 2.6, dur: 8,   color: "#964734" },
  { left: "48%", bottom: "10%", size: 7,  delay: 0.6, dur: 6.5, color: "#0FA4AF" },
  { left: "60%", bottom: "22%", size: 9,  delay: 3.4, dur: 7.5, color: "#024950" },
  { left: "72%", bottom: "16%", size: 6,  delay: 1.9, dur: 6,   color: "#964734" },
  { left: "84%", bottom: "24%", size: 8,  delay: 4.1, dur: 8.5, color: "#0FA4AF" },
  { left: "92%", bottom: "12%", size: 6,  delay: 2.3, dur: 7,   color: "#024950" },
  { left: "16%", bottom: "30%", size: 5,  delay: 5,   dur: 6.2, color: "#964734" },
]

const AGENTS = [
  { label: "◐ Search",        color: "#0FA4AF", cx: 170, cy: 60,    lx: "34%",  ly: "9.7%",  ltx: "translate(-50%,-140%)", anim: "li-floatA 4.5s ease-in-out infinite",  del: ""     },
  { label: "◔ Watchlist",     color: "#024950", cx: 330, cy: 122.5, lx: "66%",  ly: "19.8%", ltx: "translate(-50%,-140%)", anim: "li-floatB 5.2s ease-in-out infinite",  del: "0.2s" },
  { label: "⌕ Crawler",       color: "#964734", cx: 170, cy: 185,   lx: "34%",  ly: "29.8%", ltx: "translate(-50%,-140%)", anim: "li-floatA 5.8s ease-in-out infinite",  del: "0.5s" },
  { label: "◒ Resume",        color: "#0FA4AF", cx: 330, cy: 247.5, lx: "66%",  ly: "39.9%", ltx: "translate(-50%,-140%)", anim: "li-floatB 4.8s ease-in-out infinite",  del: "0.9s" },
  { label: "✎ Cover Letter",  color: "#024950", cx: 170, cy: 310,   lx: "34%",  ly: "50%",   ltx: "translate(-50%,-140%)", anim: "li-floatA 6s ease-in-out infinite",    del: "1.1s" },
  { label: "➤ Apply",         color: "#964734", cx: 330, cy: 372.5, lx: "66%",  ly: "60.1%", ltx: "translate(-50%,-140%)", anim: "li-floatB 5.4s ease-in-out infinite",  del: "0.3s" },
  { label: "◆ Outreach",      color: "#0FA4AF", cx: 170, cy: 435,   lx: "34%",  ly: "70.2%", ltx: "translate(-50%,-140%)", anim: "li-floatA 4.9s ease-in-out infinite",  del: "0.7s" },
  { label: "◈ Reply Tracking",color: "#024950", cx: 330, cy: 497.5, lx: "66%",  ly: "80.2%", ltx: "translate(-50%,-140%)", anim: "li-floatB 5.6s ease-in-out infinite",  del: "1.3s" },
  { label: "▤ Reporting",     color: "#964734", cx: 170, cy: 560,   lx: "34%",  ly: "90.3%", ltx: "translate(-50%,60%)",   anim: "li-floatA 5.1s ease-in-out infinite",  del: "0.6s" },
]

const PATHS = [
  { id: "li-path-a", d: "M 170 60 Q 250 91 330 122.5",       stroke: "#0FA4AF", pFill: "#0FA4AF", begin: "0s"   },
  { id: "li-path-b", d: "M 330 122.5 Q 250 153.75 170 185",  stroke: "#024950", pFill: "#024950", begin: "0.5s" },
  { id: "li-path-c", d: "M 170 185 Q 250 216 330 247.5",     stroke: "#964734", pFill: "#964734", begin: "1s"   },
  { id: "li-path-d", d: "M 330 247.5 Q 250 278.75 170 310",  stroke: "#0FA4AF", pFill: "#0FA4AF", begin: "1.5s" },
  { id: "li-path-e", d: "M 170 310 Q 250 341 330 372.5",     stroke: "#024950", pFill: "#024950", begin: "2s"   },
  { id: "li-path-f", d: "M 330 372.5 Q 250 403.75 170 435",  stroke: "#964734", pFill: "#964734", begin: "2.5s" },
  { id: "li-path-g", d: "M 170 435 Q 250 466 330 497.5",     stroke: "#0FA4AF", pFill: "#0FA4AF", begin: "3s"   },
  { id: "li-path-h", d: "M 330 497.5 Q 250 528.75 170 560",  stroke: "#024950", pFill: "#024950", begin: "3.5s" },
]

function passwordScore(pw: string) {
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

const STRENGTH_META = [
  { label: "Too weak", color: "#E39C88" },
  { label: "Weak",     color: "#E39C88" },
  { label: "Okay",     color: "#D9B25C" },
  { label: "Good",     color: "#0FA4AF" },
  { label: "Strong",   color: "#4FD1B5" },
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

  @keyframes li-floatA{0%,100%{transform:translateY(0px)}50%{transform:translateY(-16px)}}
  @keyframes li-floatB{0%,100%{transform:translateY(0px)}50%{transform:translateY(-9px)}}
  @keyframes li-rise{0%{transform:translateY(0) rotate(0deg);opacity:0;}12%{opacity:0.9;}85%{opacity:0.5;}100%{transform:translateY(-340px) rotate(70deg);opacity:0;}}
  @keyframes li-pulse{0%,100%{opacity:0.55;transform:scale(1)}50%{opacity:0.9;transform:scale(1.08)}}
  @keyframes li-slide{from{background-position:0 0}to{background-position:160px 160px}}
  @keyframes li-spin-btn{to{transform:rotate(360deg)}}

  @media (prefers-reduced-motion: reduce) {
    .li-field,.li-submit,[style*="li-floatA"],[style*="li-floatB"],[style*="li-rise"],[style*="li-pulse"],[style*="li-slide"]{animation:none !important;}
  }
`

export default function LoginPage() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])

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
    borderRadius: 26, padding: "0 18px",
  }

  async function handleSubmit() {
    setEmailTouched(true)
    setPasswordTouched(true)
    setConfirmTouched(true)
    setAuthError(null)
    if (!EMAIL_RE.test(email.trim())) return
    if (isSignUp && password.length < 8) return
    if (isSignUp && confirmPassword !== password) return
    setIsLoading(true)
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email: email.trim(), password })
        if (error) { setAuthError(error.message); return }
        router.push("/onboard")
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) { setAuthError(error.message); return }
        router.push("/dashboard")
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
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <style dangerouslySetInnerHTML={{ __html: INJECTED_CSS }} />
      {/* Space Grotesk via Google Fonts link */}
      {/* eslint-disable-next-line @next/next/google-font-display */}
      <style dangerouslySetInnerHTML={{ __html: `@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');` }} />

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
          <div style={{ width: "44%", flexShrink: 0, padding: "48px 52px", display: "flex", flexDirection: "column", color: "#fff", position: "relative" }}>

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
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
                  <h1 style={{ fontSize: 30, fontWeight: 700, margin: "0 0 8px" }}>
                    {isSignUp ? "Create your account" : "Welcome back"}
                  </h1>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 32px" }}>
                    {isSignUp
                      ? "Set up your profile and let the agent start working for you."
                      : "Sign in to pick up where you left off."}
                  </p>

                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

                    {/* Full name */}
                    {isSignUp && (
                      <div className="li-field" style={{ ...fieldBase }}>
                        <NameIcon />
                        <input className="li-input" type="text" placeholder="Full name" />
                      </div>
                    )}

                    {/* Email */}
                    <div>
                      <div className="li-field" style={{ ...fieldBase, borderColor: hasEmailError ? "#E39C88" : "rgba(255,255,255,0.12)" }}>
                        <EmailIcon />
                        <input
                          className="li-input" type="email" placeholder="Email"
                          value={email}
                          onChange={e => { setEmail(e.target.value); setAuthError(null) }}
                          onBlur={() => setEmailTouched(true)}
                        />
                      </div>
                      {hasEmailError && <p style={{ margin: "6px 0 0 18px", fontSize: 12, color: "#E39C88" }}>Enter a valid email address</p>}
                    </div>

                    {/* Password */}
                    <div>
                      <div className="li-field" style={{ ...fieldBase, borderColor: hasMinLenError ? "#E39C88" : "rgba(255,255,255,0.12)" }}>
                        <LockIcon />
                        <input
                          className="li-input" type="password" placeholder="Password"
                          value={password}
                          onChange={e => { setPassword(e.target.value); setAuthError(null) }}
                          onBlur={() => setPasswordTouched(true)}
                        />
                      </div>
                      {isSignUp && hasMinLenError && (
                        <p style={{ margin: "6px 0 0 18px", fontSize: 12, color: "#E39C88" }}>Password must be at least 8 characters</p>
                      )}
                      {isSignUp && password.length >= 8 && (
                        <>
                          <div style={{ display: "flex", gap: 4, margin: "8px 0 4px 18px" }}>
                            {[0,1,2,3].map(i => (
                              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: i < score ? strengthMeta.color : "rgba(255,255,255,0.14)" }} />
                            ))}
                          </div>
                          <p style={{ margin: "0 0 0 18px", fontSize: 11, fontWeight: 600, color: strengthMeta.color }}>{strengthMeta.label}</p>
                        </>
                      )}
                    </div>

                    {/* Confirm password */}
                    {isSignUp && (
                      <div>
                        <div className="li-field" style={{ ...fieldBase, borderColor: hasConfirmError ? "#E39C88" : confirmMatches ? "#4FD1B5" : "rgba(255,255,255,0.12)" }}>
                          <LockIcon />
                          <input
                            className="li-input" type="password" placeholder="Confirm password"
                            value={confirmPassword}
                            onChange={e => { setConfirmPassword(e.target.value); setConfirmTouched(true) }}
                          />
                        </div>
                        {hasConfirmError && <p style={{ margin: "6px 0 0 18px", fontSize: 12, color: "#E39C88" }}>Passwords don{"'"}t match</p>}
                        {confirmMatches && <p style={{ margin: "6px 0 0 18px", fontSize: 12, color: "#4FD1B5" }}>Passwords match</p>}
                      </div>
                    )}

                    {/* Forgot link */}
                    {!isSignUp && (
                      <div style={{ textAlign: "right", marginTop: -2 }}>
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
                      <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(227,156,136,0.12)", border: "1px solid rgba(227,156,136,0.35)", borderRadius: 14, padding: "10px 14px", marginTop: -2 }}>
                        <span style={{ fontSize: 13 }}>⚠</span>
                        <span style={{ fontSize: 12, color: "#E39C88" }}>{authError}</span>
                      </div>
                    )}

                    {/* Submit */}
                    <button className="li-submit" onClick={handleSubmit} disabled={isLoading}>
                      {isLoading ? <Spinner /> : <><span>{isSignUp ? "Sign Up" : "Log In"}</span><span style={{ fontSize: 13 }}>▶</span></>}
                    </button>

                    {/* Toggle */}
                    <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "6px 0 0" }}>
                      {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
                      <span onClick={toggleMode} style={{ color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                        {isSignUp ? "Sign In" : "Sign Up"}
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
                        <span style={{ fontSize: 13 }}>⚠</span>
                        <span style={{ fontSize: 12, color: "#E39C88" }}>{resetError}</span>
                      </div>
                    )}
                    <button className="li-submit" onClick={handleSendReset} disabled={isResetLoading}>
                      {isResetLoading ? <Spinner /> : <><span>Send reset link</span><span style={{ fontSize: 13 }}>▶</span></>}
                    </button>
                    <p style={{ textAlign: "center", fontSize: 13, color: "rgba(255,255,255,0.4)", margin: "6px 0 0" }}>
                      <span onClick={() => setView("auth")} style={{ color: "#fff", fontWeight: 700, cursor: "pointer" }}>
                        ← Back to sign in
                      </span>
                    </p>
                  </div>
                </>
              )}

              {/* ── Forgot sent view ── */}
              {view === "forgot_sent" && (
                <>
                  <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(15,164,175,0.16)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 22, color: "#0FA4AF", fontSize: 20 }}>
                    ✉
                  </div>
                  <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 8px" }}>Check your email</h1>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.5)", margin: "0 0 32px", lineHeight: 1.6 }}>
                    We{"'"}ve sent a password reset link to{" "}
                    <span style={{ color: "#fff", fontWeight: 700 }}>{resetEmail}</span>. It{"'"}ll expire in 30 minutes.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <button className="li-submit" onClick={() => setView("auth")}>
                      <span>Back to sign in</span>
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

            {/* SVG pipeline */}
            <svg viewBox="0 0 500 620" preserveAspectRatio="none" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>

              {/* Connector paths */}
              {PATHS.map(p => (
                <path key={p.id} id={p.id} d={p.d} fill="none" stroke={p.stroke} strokeWidth="1.5" opacity="0.3" />
              ))}

              {/* Animated data packets */}
              {PATHS.map(p => (
                <circle key={`pkt-${p.id}`} r="4" fill={p.pFill}>
                  <animateMotion dur="1.6s" repeatCount="indefinite" begin={p.begin}>
                    <mpath href={`#${p.id}`} />
                  </animateMotion>
                </circle>
              ))}

              {/* Agent nodes with float animation */}
              {AGENTS.map((a, i) => (
                <g key={i} style={{ animation: a.anim, animationDelay: a.del || "0s" }}>
                  <circle cx={a.cx} cy={a.cy} r="19" fill={a.color} opacity="0.18" />
                  <circle cx={a.cx} cy={a.cy} r="10" fill={a.color} />
                </g>
              ))}
            </svg>

            {/* Agent name tags */}
            {AGENTS.map((a, i) => (
              <div key={i} style={{
                position: "absolute", left: a.lx, top: a.ly,
                transform: a.ltx,
                animation: a.anim, animationDelay: a.del || "0s",
              }}>
                <span style={{
                  display: "inline-flex", alignItems: "center", gap: 5,
                  color: "#fff", fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: 11, fontWeight: 700, padding: "5px 10px",
                  borderRadius: 14, background: a.color,
                  boxShadow: "0 4px 10px rgba(2,49,53,0.18)",
                  whiteSpace: "nowrap", position: "relative", zIndex: 2,
                }}>
                  {a.label}
                </span>
              </div>
            ))}

            {/* Goal marker */}
            <div style={{ position: "absolute", top: "96%", left: "66%", transform: "translate(-50%,-50%)", width: 70, height: 70, borderRadius: "50%", border: "1.5px solid rgba(2,73,80,0.18)", animation: "li-pulse 4s ease-in-out infinite" }} />
            <div style={{ position: "absolute", top: "96%", left: "66%", transform: "translate(-50%,-50%)", width: 46, height: 46, borderRadius: "50%", background: "radial-gradient(circle, rgba(150,71,52,0.32), rgba(150,71,52,0) 72%)", animation: "li-pulse 3.2s ease-in-out infinite", animationDelay: "0.3s" }} />
            <div style={{ position: "absolute", top: "96%", left: "66%", transform: "translate(-50%,-50%)", width: 22, height: 22, borderRadius: "50%", background: "linear-gradient(135deg,#964734,#003135)", boxShadow: "0 0 18px rgba(150,71,52,0.55)" }} />

            {/* Rising diamond particles */}
            {PARTICLE_DEFS.map((p, i) => (
              <div key={i} style={{
                position: "absolute", left: p.left, bottom: p.bottom,
                width: p.size, height: p.size, borderRadius: 2,
                background: p.color, transform: "rotate(45deg)",
                animation: `li-rise ${p.dur}s ease-in-out infinite`,
                animationDelay: `${p.delay}s`,
              }} />
            ))}

            {/* Caption */}
            <div style={{ position: "absolute", left: 0, right: 0, top: 24, textAlign: "center" }}>
              <p style={{ margin: 0, fontSize: 12, fontWeight: 700, letterSpacing: "0.1em", color: "rgba(2,49,53,0.5)" }}>
                NINE AGENTS. ONE GOAL. YOUR NEXT ROLE.
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
