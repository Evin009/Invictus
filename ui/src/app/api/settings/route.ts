import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { requireAuth } from "@/lib/require-auth"

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const db = createClient()

    if (body.preferences) {
      const { data: existing } = await db.from("preferences").select("id").limit(1)
      const id = existing?.[0]?.id
      if (id) {
        await db.from("preferences").update(body.preferences).eq("id", id)
      } else {
        await db.from("preferences").insert(body.preferences)
      }
    }

    if (body.watchlist) {
      await db.from("watchlist").delete().gte("created_at", "1970-01-01T00:00:00Z")
      if (body.watchlist.length > 0) {
        await db.from("watchlist").insert(body.watchlist)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
