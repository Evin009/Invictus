import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { requireAuth } from "@/lib/require-auth"

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createClient()
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()

  // Stat cards always reflect a live trailing-24h window computed at request
  // time — not whatever the last cron run happened to snapshot, which could
  // be up to an hour (or longer, if a run failed) out of date.
  const [jobsDiscovered, applied, interviews, outreachSent, lastRunRow] = await Promise.all([
    db.from("jobs_seen").select("id", { count: "exact", head: true }).gte("created_at", since),
    db.from("applications").select("id", { count: "exact", head: true }).neq("status", "manual_pending").gte("submitted_at", since),
    db.from("applications").select("id", { count: "exact", head: true }).eq("status", "interview").gte("submitted_at", since),
    db.from("outreach_log").select("id", { count: "exact", head: true }).gte("sent_at", since),
    db.from("run_log").select("run_at").order("run_at", { ascending: false }).limit(1),
  ])

  return NextResponse.json({
    stats: {
      jobs_discovered: jobsDiscovered.count ?? 0,
      applied: applied.count ?? 0,
      interviews: interviews.count ?? 0,
      outreach_sent: outreachSent.count ?? 0,
    },
    lastRunAt: lastRunRow.data?.[0]?.run_at ?? null,
  })
}
