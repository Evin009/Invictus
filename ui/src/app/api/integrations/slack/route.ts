import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"
import { requireAuth } from "@/lib/require-auth"

export async function GET() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createClient()
  const { data, error } = await db
    .from("slack_integration")
    .select("team_name,channel_name,connected_at")
    .limit(1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ connection: data?.[0] ?? null })
}

export async function DELETE() {
  const auth = await requireAuth()
  if (auth instanceof NextResponse) return auth

  const db = createClient()
  const { error } = await db
    .from("slack_integration")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000")
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
