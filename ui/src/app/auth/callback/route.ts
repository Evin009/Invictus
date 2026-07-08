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
      // Password reset or other explicit destinations — honour directly
      if (next && next !== "/signup-loading") {
        return NextResponse.redirect(`${origin}${next}`)
      }
      // Email confirmation: send user back to check-email to manually continue
      return NextResponse.redirect(`${origin}/check-email?verified=1`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
