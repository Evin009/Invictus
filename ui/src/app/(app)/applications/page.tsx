export const dynamic = "force-dynamic"

import { createClient } from "@/lib/supabase"
import { ApplicationsTable } from "@/components/applications-table"
import type { Application } from "@/lib/types"

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function ApplicationsPage({ searchParams }: Props) {
  const { q } = await searchParams
  const db = createClient()

  let query = db
    .from("applications")
    .select("id,job_url,title,company,ats_platform,status,submission_type,resume_pdf_path,cover_letter_path,submitted_at")
    .order("submitted_at", { ascending: false })

  if (q && q.length < 200) {
    query = query.or(`company.ilike.%${q}%,title.ilike.%${q}%`)
  }

  const { data } = await query
  const applications = (data ?? []) as Application[]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-[1.875rem] font-semibold tracking-tight" style={{ color: "var(--foreground)" }}>
            Applications
          </h1>
          <p className="text-[13px] mt-1" style={{ color: "var(--muted-foreground)" }}>
            {q ? `Results for "${q}" — ` : ""}
            {applications.length} {applications.length === 1 ? "record" : "records"}
          </p>
        </div>
      </div>
      <ApplicationsTable applications={applications} initialSearch={q ?? ""} />
    </div>
  )
}
