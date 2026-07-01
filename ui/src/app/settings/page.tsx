export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase"
import { SettingsForm } from "@/components/settings-form"
import type { Preferences, WatchlistEntry, Seed } from "@/lib/types"

export default async function SettingsPage() {
  const db = createClient()

  const [prefsResult, watchlistResult, clSeedsResult, outreachSeedsResult] = await Promise.all([
    db.from("preferences").select("*").limit(1),
    db.from("watchlist").select("*").order("company_name"),
    db.from("cover_letter_seeds").select("*").order("label"),
    db.from("outreach_seeds").select("*").order("label"),
  ])

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-[1.875rem] font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
          Settings
        </h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--muted-foreground)" }}>
          Configure the agent's targeting, watchlist, and tone samples.
        </p>
      </div>
      <SettingsForm
        preferences={(prefsResult.data?.[0] ?? null) as Preferences | null}
        watchlist={(watchlistResult.data ?? []) as WatchlistEntry[]}
        coverLetterSeeds={(clSeedsResult.data ?? []) as Seed[]}
        outreachSeeds={(outreachSeedsResult.data ?? []) as Seed[]}
      />
    </div>
  )
}
