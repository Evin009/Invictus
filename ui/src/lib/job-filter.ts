import { locationMatches } from "@/lib/location-match"

// Shared between browse-jobs and the dashboard's Top jobs filter bar so the
// two never drift apart on what's filterable or what options are shown.

export const JOB_FILTER_KEYS = ["Date", "Location", "Workplace", "Companies", "Degree Level", "Sponsors Visa", "Role", "Job Type"]
export const POSTED_DATE_OPTIONS = ["Any time", "Past 24 hours"]

// Fixed-vocabulary fields come from job_meta.py's own enums (the backend's
// full possible value set), so the dropdown always shows every value the
// backend can ever produce — not just what happens to appear in the current
// job pool. Companies stays fully dynamic (unbounded real names); Location
// gets a common-hubs baseline merged with whatever real locations show up.
export const WORKPLACE_OPTIONS = ["Remote", "Hybrid", "Onsite"]
export const DEGREE_LEVEL_OPTIONS = ["High school", "Associate", "Bachelor's", "Master's", "PhD"]
export const VISA_SPONSORSHIP_OPTIONS = ["Yes", "No"]
export const ROLE_OPTIONS = ["Engineering", "Design", "Product", "Data", "Marketing"]
export const JOB_TYPE_OPTIONS = ["Full-time", "Part-time", "Internship", "Contract"]
export const COMMON_LOCATION_OPTIONS = [
  "Remote", "San Francisco, CA", "New York, NY", "Seattle, WA", "Austin, TX",
  "Boston, MA", "Los Angeles, CA", "Chicago, IL", "Washington, DC", "Denver, CO",
]

export interface FilterableJob {
  company: string | null
  location?: string | null
  workplace?: string | null
  job_type?: string | null
  degree_level?: string | null
  visa_sponsorship?: string | null
  role_category?: string | null
  discovered_at: string | null
}

export function withinPostedDate(iso: string | null | undefined, bucket: string): boolean {
  if (bucket === "Any time" || !iso) return true
  const hours = (Date.now() - new Date(iso).getTime()) / 3600000
  if (bucket === "Past 24 hours") return hours <= 24
  return true
}

function uniqueOf<T extends FilterableJob>(jobs: T[], get: (j: T) => string | null | undefined): string[] {
  return Array.from(new Set(jobs.map(get).filter((v): v is string => !!v))).sort()
}

function withRealExtras<T extends FilterableJob>(fixed: string[], jobs: T[], get: (j: T) => string | null | undefined): string[] {
  return Array.from(new Set([...fixed, ...uniqueOf(jobs, get)]))
}

export function buildJobFilterOptions<T extends FilterableJob>(jobs: T[]): Record<string, string[]> {
  return {
    "Date": POSTED_DATE_OPTIONS,
    "Location": withRealExtras(COMMON_LOCATION_OPTIONS, jobs, j => j.location),
    "Workplace": withRealExtras(WORKPLACE_OPTIONS, jobs, j => j.workplace),
    "Companies": uniqueOf(jobs, j => j.company),
    "Degree Level": withRealExtras(DEGREE_LEVEL_OPTIONS, jobs, j => j.degree_level),
    "Sponsors Visa": withRealExtras(VISA_SPONSORSHIP_OPTIONS, jobs, j => j.visa_sponsorship),
    "Role": withRealExtras(ROLE_OPTIONS, jobs, j => j.role_category),
    "Job Type": withRealExtras(JOB_TYPE_OPTIONS, jobs, j => j.job_type),
  }
}

export function jobMatchesFilters(j: FilterableJob, filterValues: Record<string, string>): boolean {
  if (filterValues["Job Type"] && j.job_type !== filterValues["Job Type"]) return false
  if (filterValues["Location"] && !locationMatches(j.location, filterValues["Location"])) return false
  if (filterValues["Workplace"] && j.workplace !== filterValues["Workplace"]) return false
  if (filterValues["Companies"] && j.company !== filterValues["Companies"]) return false
  if (filterValues["Degree Level"] && j.degree_level !== filterValues["Degree Level"]) return false
  if (filterValues["Sponsors Visa"] && j.visa_sponsorship !== filterValues["Sponsors Visa"]) return false
  if (filterValues["Role"] && j.role_category !== filterValues["Role"]) return false
  if (filterValues["Date"] && !withinPostedDate(j.discovered_at, filterValues["Date"])) return false
  return true
}
