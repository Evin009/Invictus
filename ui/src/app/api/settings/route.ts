import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { requireAuth } from "@/lib/require-auth"

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createClient()
  const [prefsRes, watchlistRes] = await Promise.all([
    db.from("preferences").select("*").limit(1),
    db.from("watchlist").select("*"),
  ])
  return NextResponse.json({
    preferences: prefsRes.data?.[0] ?? {},
    watchlist: (watchlistRes.data ?? []).map((r: Record<string, string>) => ({ name: r.company_name, url: r.careers_url ?? r.url ?? "" })),
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const db = createClient()

    if (body.preferences) {
      const { data: existing } = await db.from("preferences").select("id").limit(1)
      const id = existing?.[0]?.id
      const { error } = id
        ? await db.from("preferences").update(body.preferences).eq("id", id)
        : await db.from("preferences").insert(body.preferences)
      if (error) return NextResponse.json({ error: `preferences: ${error.message}` }, { status: 500 })
    }

    if (body.watchlist) {
      // "id" always exists (primary key) — this filter matches every row, unlike a
      // nonexistent-column filter, which PostgREST would reject with a 400.
      const { error: delError } = await db.from("watchlist").delete().neq("id", "00000000-0000-0000-0000-000000000000")
      if (delError) return NextResponse.json({ error: `watchlist delete: ${delError.message}` }, { status: 500 })

      if (body.watchlist.length > 0) {
        const { error: insError } = await db.from("watchlist").insert(body.watchlist)
        if (insError) return NextResponse.json({ error: `watchlist insert: ${insError.message}` }, { status: 500 })
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
