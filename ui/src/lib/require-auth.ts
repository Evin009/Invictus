import { NextResponse } from "next/server"
import { createAuthServerClient } from "@/lib/supabase-server"

export async function requireAuth(): Promise<{ userId: string } | NextResponse> {
  const supabase = await createAuthServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  return { userId: user.id }
}
