import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function PATCH(req: NextRequest) {
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
      await db.from("watchlist").delete().neq("id", 0)
      if (body.watchlist.length > 0) {
        await db.from("watchlist").insert(body.watchlist)
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
