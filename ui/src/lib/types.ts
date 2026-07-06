export type ApplicationStatus =
  | "applied"
  | "interview"
  | "rejection"
  | "ghosted"
  | "manual_pending"

export interface Application {
  id: string
  job_url: string
  title: string | null
  company: string | null
  ats_platform: string | null
  status: ApplicationStatus
  submission_type: string | null
  resume_pdf_path: string | null
  cover_letter_path: string | null
  submitted_at: string
}

export interface OutreachLog {
  id: string
  job_url: string | null
  company: string | null
  contact_name: string | null
  contact_email: string | null
  contact_linkedin: string | null
  channel: "email" | "linkedin"
  message_text: string | null
  sent_at: string
  reply_received: boolean
}

export interface Preferences {
  id: string
  locations: string[] | null
  seniority: string[] | null
  salary_floor: number | null
  desired_salary: number | null
  role_keywords: string[] | null
}

export interface UserProfile {
  id: string
  full_name: string | null
  email: string | null
  phone: string | null
  linkedin_url: string | null
  github_url: string | null
  education: Record<string, unknown>[] | null
  work_history: Record<string, unknown>[] | null
  skills: string[] | null
  current_location: string | null
  portfolio: string | null
  major: string | null
  gpa: string | null
  grad_month: string | null
  grad_year: string | null
  work_auth: string | null
  sponsorship: string | null
  relocate: string | null
  work_mode: string | null
  start_date: string | null
  gender: string | null
  race: string | null
  veteran: string | null
  disability: string | null
  pronouns: string | null
}

export interface Seed {
  id: string
  content: string | null
  label: string | null
}

export interface DiscoveredJob {
  id: string
  url: string
  title: string | null
  company: string | null
  source: string | null
  created_at: string
}

export interface WatchlistEntry {
  id: string
  company_name: string | null
  careers_url: string | null
  role_keywords: string[] | null
}
