export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase"
import { ProfileForm } from "@/components/profile-form"
import type { UserProfile } from "@/lib/types"

export default async function ProfilePage() {
  const db = createClient()
  const { data } = await db.from("user_profile").select("*").limit(1)
  const profile = (data?.[0] ?? null) as UserProfile | null

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="text-center">
        <h1 className="text-[1.875rem] font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
          Profile
        </h1>
        <p className="text-[13px] mt-1" style={{ color: "var(--muted-foreground)" }}>
          Your identity data — used by the agent to fill ATS forms.
        </p>
      </div>
      <ProfileForm profile={profile} />
    </div>
  )
}
