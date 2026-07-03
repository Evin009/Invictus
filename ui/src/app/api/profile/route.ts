import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { requireAuth } from "@/lib/require-auth"

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createClient()
  const { data, error } = await db.from("user_profile").select("*").limit(1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data?.[0] ?? null)
}

export async function PATCH(req: NextRequest) {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  try {
    const body = await req.json()
    const {
      full_name, email, phone, linkedin_url, github_url,
      education, work_history, skills,
    } = body
    const allowed = { full_name, email, phone, linkedin_url, github_url, education, work_history, skills }

    const db = createClient()
    const { data: existing } = await db.from("user_profile").select("id").limit(1)
    const id = existing?.[0]?.id

    if (id) {
      await db.from("user_profile").update(allowed).eq("id", id)
    } else {
      await db.from("user_profile").insert(allowed)
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
