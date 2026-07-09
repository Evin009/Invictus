"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

/**
 * Bounces users who already finished onboarding straight to the dashboard.
 * Drop into pages that should only ever be seen on the first sign-in
 * (/signup-loading, /onboard) — routine sign-ins get redirected even if
 * they land here via a stale link or a misroute.
 */
export function OnboardedGuard() {
  const router = useRouter()

  useEffect(() => {
    let cancelled = false
    fetch("/api/profile")
      .then(r => (r.ok ? r.json() : null))
      .then(profile => {
        if (!cancelled && profile?.full_name) router.replace("/dashboard")
      })
      .catch(() => {}) // network error: stay put, page works as normal
    return () => { cancelled = true }
  }, [router])

  return null
}
