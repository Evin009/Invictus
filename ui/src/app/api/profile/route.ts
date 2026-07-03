import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function GET() {
  const db = createClient()
  const { data, error } = await db.from("user_profile").select("*").limit(1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0] ?? null)
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const db = createClient()
    const { data: existing } = await db.from("user_profile").select("id").limit(1)
    const id = existing?.[0]?.id

    if (id) {
      await db.from("user_profile").update(body).eq("id", id)
    } else {
      await db.from("user_profile").insert(body)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
