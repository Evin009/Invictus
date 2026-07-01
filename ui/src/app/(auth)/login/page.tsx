"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Envelope, Lock, Eye, EyeSlash } from "@phosphor-icons/react"

// ── 3D Cube sizes ──────────────────────────────────────
const S = 320   // cube edge length px
const H = S / 2 // half = translation distance for each face

const FACES: React.CSSProperties["transform"][] = [
  `translateZ(${H}px)`,
  `rotateY(180deg) translateZ(${H}px)`,
  `rotateY(90deg) translateZ(${H}px)`,
  `rotateY(-90deg) translateZ(${H}px)`,
  `rotateX(90deg) translateZ(${H}px)`,
  `rotateX(-90deg) translateZ(${H}px)`,
]

function CubeBackground() {
  const face: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    border: "1px solid oklch(0.560 0.115 200 / 0.22)",
    background: [
      "repeating-linear-gradient(0deg, transparent, transparent 79px, oklch(0.560 0.115 200 / 0.06) 80px)",
      "repeating-linear-gradient(90deg, transparent, transparent 79px, oklch(0.560 0.115 200 / 0.06) 80px)",
      "oklch(0.560 0.115 200 / 0.02)",
    ].join(", "),
    boxShadow: [
      "inset 0 0 60px oklch(0.560 0.115 200 / 0.05)",
      "0 0 1px oklch(0.560 0.115 200 / 0.35)",
    ].join(", "),
  }

  return (
    <>
      <style>{`
        @keyframes cube-spin {
          from { transform: rotateX(-22deg) rotateY(0deg); }
          to   { transform: rotateX(-22deg) rotateY(360deg); }
        }
        @keyframes orb-pulse {
          0%, 100% { opacity: 0.55; transform: translate(-50%, -50%) scale(1); }
          50%       { opacity: 0.75; transform: translate(-50%, -50%) scale(1.08); }
        }
        @keyframes card-in {
          from { opacity: 0; transform: translateY(28px); filter: blur(8px); }
          to   { opacity: 1; transform: translateY(0);    filter: blur(0); }
        }
        @keyframes logo-in {
          from { opacity: 0; transform: translateY(10px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .cube-spin   { animation: none !important; }
          .orb-pulse   { animation: none !important; }
          .card-in     { animation: none !important; }
          .logo-in     { animation: none !important; }
        }
      `}</style>

      {/* Hex-grid noise layer */}
      <div
        aria-hidden
        style={{
          position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          backgroundImage: [
            "repeating-linear-gradient(0deg, transparent, transparent 39px, oklch(1 0 0 / 0.014) 40px)",
            "repeating-linear-gradient(90deg, transparent, transparent 39px, oklch(1 0 0 / 0.014) 40px)",
          ].join(", "),
        }}
      />

      {/* Main teal orb */}
      <div
        aria-hidden
        className="orb-pulse"
        style={{
          position: "fixed", zIndex: 0, pointerEvents: "none",
          top: "50%", left: "50%",
          width: 700, height: 700,
          borderRadius: "50%",
          background: "radial-gradient(circle, oklch(0.560 0.115 200 / 0.14) 0%, transparent 68%)",
          animation: "orb-pulse 6s ease-in-out infinite",
        }}
      />

      {/* Secondary indigo orb */}
      <div
        aria-hidden
        style={{
          position: "fixed", zIndex: 0, pointerEvents: "none",
          bottom: "10%", right: "12%",
          width: 480, height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, oklch(0.420 0.090 260 / 0.10) 0%, transparent 70%)",
        }}
      />

      {/* Top-left tertiary orb */}
      <div
        aria-hidden
        style={{
          position: "fixed", zIndex: 0, pointerEvents: "none",
          top: "8%", left: "8%",
          width: 320, height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, oklch(0.560 0.115 200 / 0.07) 0%, transparent 70%)",
        }}
      />

      {/* 3D cube */}
      <div
        aria-hidden
        style={{
          position: "fixed", zIndex: 1, pointerEvents: "none",
          top: "50%", left: "50%",
          width: S, height: S,
          marginLeft: -H, marginTop: -H,
          perspective: "900px",
        }}
      >
        <div
          className="cube-spin"
          style={{
            width: S, height: S,
            position: "relative",
            transformStyle: "preserve-3d",
            animation: "cube-spin 36s linear infinite",
          }}
        >
          {FACES.map((transform, i) => (
            <div key={i} style={{ ...face, transform: transform as string }} />
          ))}
        </div>
      </div>

      {/* Small satellite cube — upper right */}
      <div
        aria-hidden
        style={{
          position: "fixed", zIndex: 1, pointerEvents: "none",
          top: "18%", right: "14%",
          width: 100, height: 100,
          marginLeft: -50, marginTop: -50,
          perspective: "400px",
        }}
      >
        <div
          className="cube-spin"
          style={{
            width: 100, height: 100,
            position: "relative",
            transformStyle: "preserve-3d",
            animation: "cube-spin 22s linear infinite reverse",
          }}
        >
          {FACES.map((transform, i) => (
            <div
              key={i}
              style={{
                position: "absolute", inset: 0,
                border: "1px solid oklch(0.560 0.115 200 / 0.28)",
                background: "oklch(0.560 0.115 200 / 0.03)",
                transform: (transform as string).replace(`${H}px`, "50px"),
              }}
            />
          ))}
        </div>
      </div>

      {/* Tiny satellite cube — lower left */}
      <div
        aria-hidden
        style={{
          position: "fixed", zIndex: 1, pointerEvents: "none",
          bottom: "22%", left: "10%",
          width: 64, height: 64,
          perspective: "260px",
        }}
      >
        <div
          className="cube-spin"
          style={{
            width: 64, height: 64,
            position: "relative",
            transformStyle: "preserve-3d",
            animation: "cube-spin 18s linear infinite",
          }}
        >
          {FACES.map((transform, i) => (
            <div
              key={i}
              style={{
                position: "absolute", inset: 0,
                border: "1px solid oklch(0.560 0.115 200 / 0.24)",
                background: "oklch(0.560 0.115 200 / 0.025)",
                transform: (transform as string).replace(`${H}px`, "32px"),
              }}
            />
          ))}
        </div>
      </div>
    </>
  )
}

// ── Form inputs ────────────────────────────────────────

const darkInput: React.CSSProperties = {
  width: "100%",
  padding: "11px 12px 11px 38px",
  borderRadius: "10px",
  fontSize: "13px",
  outline: "none",
  backgroundColor: "oklch(0.09 0.012 230 / 0.80)",
  border: "1px solid oklch(0.280 0.014 228)",
  color: "oklch(0.900 0.008 228)",
  transition: "border-color 0.18s cubic-bezier(0.23,1,0.32,1)",
}

// ── Page ───────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<"signin" | "signup">("signin")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const supabase = createBrowserSupabaseClient()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setMessage(null); setLoading(true)

    if (tab === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push("/dashboard"); router.refresh()
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      setMessage("Account created — taking you to setup...")
      setTimeout(() => { router.push("/onboard"); router.refresh() }, 1000)
    }
    setLoading(false)
  }

  return (
    <>
      <CubeBackground />

      {/* Card */}
      <div
        className="card-in relative"
        style={{
          zIndex: 10,
          width: "100%",
          maxWidth: "480px",
          padding: "0 16px",
          animation: "card-in 0.70s cubic-bezier(0.23,1,0.32,1) both",
        }}
      >
        {/* Logo mark */}
        <div
          className="logo-in flex items-center gap-3 mb-8 justify-center"
          style={{ animation: "logo-in 0.55s cubic-bezier(0.23,1,0.32,1) 0.08s both" }}
        >
          <div
            className="shrink-0 rounded-2xl flex items-center justify-center"
            style={{
              width: "42px", height: "42px",
              background: "linear-gradient(145deg, oklch(0.660 0.125 200), oklch(0.440 0.100 210))",
              boxShadow: "0 4px 20px oklch(0.560 0.115 200 / 0.55), inset 0 1px 0 oklch(1 0 0 / 0.22)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5L12.5 4.75V10.25L7 13.5L1.5 10.25V4.75L7 1.5Z"
                stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M7 1.5V13.5M1.5 4.75L12.5 4.75M1.5 10.25L12.5 10.25"
                stroke="white" strokeWidth="1.1" />
            </svg>
          </div>
          <div>
            <span
              className="text-[22px] font-semibold tracking-tight block leading-tight"
              style={{ color: "oklch(0.930 0.008 228)" }}
            >
              Invictus
            </span>
            <span
              className="text-[11px] font-medium"
              style={{ color: "oklch(0.480 0.012 228)" }}
            >
              Autonomous job application system
            </span>
          </div>
        </div>

        {/* Glass card */}
        <div
          style={{
            background: "oklch(0.12 0.014 228 / 0.78)",
            backdropFilter: "blur(24px) saturate(1.5)",
            WebkitBackdropFilter: "blur(24px) saturate(1.5)",
            border: "1px solid oklch(0.560 0.115 200 / 0.16)",
            borderTop: "1px solid oklch(1 0 0 / 0.09)",
            borderRadius: "22px",
            boxShadow: [
              "0 0 0 1px oklch(0.14 0.014 228 / 0.90)",
              "0 32px 80px oklch(0.04 0.010 230 / 0.65)",
              "inset 0 1px 0 oklch(1 0 0 / 0.06)",
            ].join(", "),
            padding: "36px",
          }}
        >
          {/* Tab switcher */}
          <div
            className="flex mb-7 p-1 rounded-xl"
            style={{ backgroundColor: "oklch(0.09 0.012 228 / 0.70)", gap: "3px" }}
          >
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setMessage(null) }}
                className="flex-1 py-2 rounded-xl text-[13px] font-medium transition-premium"
                style={{
                  backgroundColor: tab === t
                    ? "oklch(0.19 0.016 228)"
                    : "transparent",
                  color: tab === t
                    ? "oklch(0.900 0.008 228)"
                    : "oklch(0.420 0.010 228)",
                  boxShadow: tab === t
                    ? "0 1px 3px oklch(0.04 0.010 230 / 0.50), inset 0 1px 0 oklch(1 0 0 / 0.06)"
                    : "none",
                }}
              >
                {t === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              <label
                className="text-[11.5px] font-medium tracking-wide"
                style={{ color: "oklch(0.520 0.012 228)", letterSpacing: "0.04em" }}
              >
                EMAIL
              </label>
              <div style={{ position: "relative" }}>
                <Envelope
                  size={14}
                  weight="duotone"
                  style={{
                    position: "absolute", left: 12, top: "50%",
                    transform: "translateY(-50%)",
                    color: "oklch(0.420 0.010 228)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  style={darkInput}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.560 0.115 200 / 0.70)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "oklch(0.280 0.014 228)")}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              <label
                className="text-[11.5px] font-medium"
                style={{ color: "oklch(0.520 0.012 228)", letterSpacing: "0.04em" }}
              >
                PASSWORD
              </label>
              <div style={{ position: "relative" }}>
                <Lock
                  size={14}
                  weight="duotone"
                  style={{
                    position: "absolute", left: 12, top: "50%",
                    transform: "translateY(-50%)",
                    color: "oklch(0.420 0.010 228)",
                    pointerEvents: "none",
                  }}
                />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  style={{ ...darkInput, paddingRight: "42px" }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.560 0.115 200 / 0.70)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "oklch(0.280 0.014 228)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  style={{
                    position: "absolute", right: 12, top: "50%",
                    transform: "translateY(-50%)",
                    color: "oklch(0.420 0.010 228)",
                    cursor: "pointer",
                    lineHeight: 0,
                    background: "none", border: "none", padding: 0,
                  }}
                >
                  {showPw ? <EyeSlash size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Feedback */}
            {error && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  backgroundColor: "oklch(0.35 0.120 15 / 0.18)",
                  border: "1px solid oklch(0.520 0.200 15 / 0.30)",
                  color: "oklch(0.720 0.150 20)",
                  fontSize: "12px",
                }}
              >
                {error}
              </div>
            )}
            {message && (
              <div
                style={{
                  padding: "10px 12px",
                  borderRadius: "10px",
                  backgroundColor: "oklch(0.35 0.090 150 / 0.20)",
                  border: "1px solid oklch(0.560 0.115 200 / 0.30)",
                  color: "oklch(0.720 0.100 170)",
                  fontSize: "12px",
                }}
              >
                {message}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="transition-premium active:scale-[0.97]"
              style={{
                marginTop: "4px",
                width: "100%",
                padding: "12px",
                borderRadius: "12px",
                fontSize: "13px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
                background: "linear-gradient(135deg, oklch(0.620 0.125 195), oklch(0.490 0.110 210))",
                color: "white",
                border: "none",
                boxShadow: [
                  "0 1px 0 oklch(1 0 0 / 0.14) inset",
                  "0 8px 24px oklch(0.560 0.115 200 / 0.38)",
                  "0 2px 6px oklch(0.560 0.115 200 / 0.22)",
                ].join(", "),
              }}
            >
              {loading
                ? <span style={{ opacity: 0.7 }}>...</span>
                : tab === "signin" ? "Sign in" : "Create account"
              }
            </button>
          </form>
        </div>

        {/* Footer */}
        <p
          className="text-center mt-5 text-[11px]"
          style={{ color: "oklch(0.340 0.008 228)" }}
        >
          {tab === "signin"
            ? <>No account? <button onClick={() => setTab("signup")} style={{ color: "oklch(0.560 0.115 200)", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "11px" }}>Create one</button></>
            : <>Already have one? <button onClick={() => setTab("signin")} style={{ color: "oklch(0.560 0.115 200)", background: "none", border: "none", cursor: "pointer", padding: 0, fontSize: "11px" }}>Sign in</button></>
          }
        </p>
      </div>
    </>
  )
}
