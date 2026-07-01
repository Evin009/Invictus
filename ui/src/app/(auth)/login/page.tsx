"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserSupabaseClient } from "@/lib/supabase-browser"
import { Envelope, Lock, Eye, EyeSlash } from "@phosphor-icons/react"

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
    setError(null)
    setMessage(null)
    setLoading(true)

    if (tab === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      router.push("/dashboard")
      router.refresh()
    } else {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) { setError(error.message); setLoading(false); return }
      setMessage("Account created — redirecting to setup...")
      setTimeout(() => { router.push("/onboard"); router.refresh() }, 1200)
    }
    setLoading(false)
  }

  return (
    <div style={{ width: "100%", maxWidth: "400px" }}>
      {/* Logo */}
      <div className="flex items-center gap-3 mb-8 justify-center">
        <div
          className="shrink-0 rounded-xl flex items-center justify-center p-[2px]"
          style={{
            width: "34px", height: "34px",
            background: "linear-gradient(145deg, oklch(0.660 0.125 200), oklch(0.480 0.100 210))",
            boxShadow: "0 2px 8px oklch(0.560 0.115 200 / 0.45)",
          }}
        >
          <div
            className="w-full h-full rounded-[calc(0.75rem-2px)] flex items-center justify-center"
            style={{ background: "linear-gradient(145deg, oklch(0.600 0.115 200), oklch(0.455 0.095 212))" }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 1.5L12.5 4.75V10.25L7 13.5L1.5 10.25V4.75L7 1.5Z"
                stroke="white" strokeWidth="1.6" strokeLinejoin="round" />
              <path d="M7 1.5V13.5M1.5 4.75L12.5 4.75M1.5 10.25L12.5 10.25"
                stroke="white" strokeWidth="1.1" />
            </svg>
          </div>
        </div>
        <span className="text-[18px] font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
          Invictus
        </span>
      </div>

      {/* Card */}
      <div className="bezel-shell">
        <div className="bezel-core" style={{ padding: "28px" }}>
          {/* Tabs */}
          <div
            className="flex mb-6 p-1 rounded-xl"
            style={{ backgroundColor: "var(--muted)", gap: "2px" }}
          >
            {(["signin", "signup"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(null); setMessage(null) }}
                className="flex-1 text-[13px] font-medium py-2 rounded-lg transition-premium"
                style={{
                  backgroundColor: tab === t ? "var(--card)" : "transparent",
                  color: tab === t ? "var(--foreground)" : "var(--muted-foreground)",
                  boxShadow: tab === t ? "var(--shadow-sm)" : "none",
                }}
              >
                {t === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {/* Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label className="text-[12px] font-medium" style={{ color: "var(--muted-foreground)" }}>
                Email
              </label>
              <div className="relative">
                <Envelope
                  size={14}
                  weight="duotone"
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--muted-foreground)" }}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl pl-9 pr-4 py-2.5 text-[13px] outline-none transition-premium"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.560 0.115 200)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label className="text-[12px] font-medium" style={{ color: "var(--muted-foreground)" }}>
                Password
              </label>
              <div className="relative">
                <Lock
                  size={14}
                  weight="duotone"
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--muted-foreground)" }}
                />
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl pl-9 pr-10 py-2.5 text-[13px] outline-none transition-premium"
                  style={{
                    backgroundColor: "var(--muted)",
                    border: "1px solid var(--border)",
                    color: "var(--foreground)",
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.560 0.115 200)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  {showPw ? <EyeSlash size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-[12px] rounded-lg px-3 py-2"
                style={{ backgroundColor: "oklch(0.971 0.013 17.38)", color: "oklch(0.577 0.245 27.33)", border: "1px solid oklch(0.936 0.032 17.72)" }}>
                {error}
              </p>
            )}
            {message && (
              <p className="text-[12px] rounded-lg px-3 py-2"
                style={{ backgroundColor: "oklch(0.962 0.044 156.74)", color: "oklch(0.448 0.119 151.33)", border: "1px solid oklch(0.905 0.093 164.15)" }}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-[13px] font-semibold transition-premium active:scale-[0.98]"
              style={{
                backgroundColor: "oklch(0.560 0.115 200)",
                color: "white",
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "..." : tab === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>
        </div>
      </div>

      <p className="text-center text-[11px] mt-6" style={{ color: "var(--muted-foreground)" }}>
        Invictus · Autonomous Job Application System
      </p>
    </div>
  )
}
