import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { requireAuth } from "@/lib/require-auth"

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const db = createClient()
    const { data, error } = await db
      .from("jobs_seen")
      .select("id, url, title, company, source, discovered_at")
      .order("discovered_at", { ascending: false })
      .limit(100)

    if (error) throw error
    return NextResponse.json(data ?? [])
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
