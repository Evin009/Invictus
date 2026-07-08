import { NextResponse } from "next/server"
import { createAuthServerClient } from "@/lib/supabase-server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const rawNext = searchParams.get("next") ?? ""
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : ""

  if (code) {
    const supabase = await createAuthServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // For explicit next (e.g. password reset), honour it directly
      if (next && next !== "/signup-loading") {
        return NextResponse.redirect(`${origin}${next}`)
      }
      // For signup confirmation / unknown: check profile to decide destination
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase
          .from("user_profile")
          .select("full_name")
          .eq("user_id", user.id)
          .maybeSingle()
        if (profile?.full_name) {
          return NextResponse.redirect(`${origin}/dashboard`)
        }
      }
      return NextResponse.redirect(`${origin}/signup-loading`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
