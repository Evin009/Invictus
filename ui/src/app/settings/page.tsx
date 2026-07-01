export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase"
import { SettingsForm } from "@/components/settings-form"
import type { Preferences, WatchlistEntry } from "@/lib/types"

export default async function SettingsPage() {
  const db = createClient()

  const [prefsResult, watchlistResult] = await Promise.all([
    db.from("preferences").select("*").limit(1),
    db.from("watchlist").select("*").order("company_name"),
  ])

  const preferences = (prefsResult.data?.[0] ?? null) as Preferences | null
  const watchlist = (watchlistResult.data ?? []) as WatchlistEntry[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
          Settings
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          Configure the agent's targeting and watchlist
        </p>
      </div>
      <SettingsForm preferences={preferences} watchlist={watchlist} />
    </div>
  )
}
