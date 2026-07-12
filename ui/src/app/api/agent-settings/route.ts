import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { requireAuth } from "@/lib/require-auth"

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createClient()
  const { data, error } = await db.from("agent_settings").select("paused,daily_cap").limit(1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const row = data?.[0] ?? { paused: false, daily_cap: null }
  return NextResponse.json(row)
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const { paused, daily_cap } = await req.json()
    const db = createClient()
    const { data: existing } = await db.from("agent_settings").select("id").limit(1)
    const id = existing?.[0]?.id
    const row = { paused: !!paused, daily_cap: daily_cap ?? null, updated_at: new Date().toISOString() }

    const { error } = id
      ? await db.from("agent_settings").update(row).eq("id", id)
      : await db.from("agent_settings").insert(row)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
