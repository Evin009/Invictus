import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { requireAuth } from "@/lib/require-auth"

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const db = createClient()

    // Fetch every discovered job, paging past PostgREST's per-request row
    // limit — the browse page does its own client-side batching, so a flat
    // cap here silently hid jobs once discovery volume grew.
    const PAGE = 1000
    const all: unknown[] = []
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await db
        .from("jobs_seen")
        .select("id, url:job_url, title, company, source, location, job_type, workplace, degree_level, visa_sponsorship, role_category, discovered_at:created_at")
        .order("created_at", { ascending: false })
        .range(from, from + PAGE - 1)
      if (error) throw error
      all.push(...(data ?? []))
      if (!data || data.length < PAGE) break
    }

    return NextResponse.json(all)
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
