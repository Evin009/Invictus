export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase"
import { ApplicationsTable } from "@/components/applications-table"
import type { Application } from "@/lib/types"

export default async function ApplicationsPage() {
  const db = createClient()
  const { data } = await db
    .from("applications")
    .select(
      "id,job_url,title,company,ats_platform,status,submission_type,resume_pdf_path,cover_letter_path,submitted_at"
    )
    .order("submitted_at", { ascending: false })

  const applications = (data ?? []) as Application[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--foreground)" }}>
          Applications
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted-foreground)" }}>
          All jobs the agent has applied to
        </p>
      </div>
      <ApplicationsTable applications={applications} />
    </div>
  )
}
