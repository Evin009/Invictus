import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const db = createClient()

    const { data: existing } = await db.from("preferences").select("id").limit(1)
    const id = existing?.[0]?.id

    if (id) {
      await db.from("preferences").update(body).eq("id", id)
    } else {
      await db.from("preferences").insert(body)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
