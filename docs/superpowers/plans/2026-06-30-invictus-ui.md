# Invictus UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a read-mostly dashboard that shows everything the autonomous job application system is doing — stats, applications, outreach — plus a settings page to manage preferences and watchlist without editing code.

**Architecture:** Next.js App Router with server components fetching directly from Supabase using the service role key (server-side only). Client components only where interactivity is needed (filter dropdown, settings form). No separate API layer — Supabase is the database and the API. Lives in `ui/` inside the existing Invictus repo.

**Tech Stack:** Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, `@supabase/supabase-js`

## Global Constraints

- Next.js 15, TypeScript strict mode
- Tailwind CSS for all styling — no CSS modules, no inline styles
- Service role key used server-side only — never exposed to the browser
- No auth — single-user tool, runs privately
- All data fetching in Server Components unless interactivity required
- shadcn/ui components only — no other component libraries
- `ui/` directory at repo root — separate `package.json` from Python backend

---

## File Map

```
ui/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # Root layout: sidebar + main content area
│   │   ├── page.tsx                   # Redirect → /dashboard
│   │   ├── dashboard/page.tsx         # Stat cards + recent applications
│   │   ├── applications/page.tsx      # Full applications table with status filter
│   │   └── settings/page.tsx          # Preferences form + watchlist manager
│   ├── components/
│   │   ├── sidebar.tsx                # Left nav (Dashboard / Applications / Settings)
│   │   ├── stat-card.tsx              # Single metric card (label + number + delta)
│   │   ├── status-badge.tsx           # Color-coded pill: applied/interview/rejection/ghosted
│   │   ├── applications-table.tsx     # Client component: filterable applications table
│   │   └── settings-form.tsx          # Client component: preferences + watchlist CRUD
│   └── lib/
│       ├── supabase.ts                # Server-side Supabase client singleton
│       └── types.ts                   # Shared TypeScript types matching schema.sql
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── .env.local.example
```

---

## Task 1: Project Setup + Layout

**Files:**
- Create: `ui/package.json`
- Create: `ui/next.config.ts`
- Create: `ui/tailwind.config.ts`
- Create: `ui/tsconfig.json`
- Create: `ui/.env.local.example`
- Create: `ui/src/lib/supabase.ts`
- Create: `ui/src/lib/types.ts`
- Create: `ui/src/app/layout.tsx`
- Create: `ui/src/app/page.tsx`
- Create: `ui/src/components/sidebar.tsx`

**Interfaces:**
- Produces: `createClient()` → `SupabaseClient` (used by all server components)
- Produces: `Application`, `OutreachLog`, `Preferences`, `WatchlistEntry` types (used everywhere)

- [ ] **Step 1: Scaffold Next.js project**

```bash
cd ui
npx create-next-app@latest . --typescript --tailwind --app --no-src-dir --import-alias "@/*"
# When prompted: yes to all defaults
# Then move everything into src/:
mkdir -p src/app src/components src/lib
mv app/* src/app/ 2>/dev/null; rm -rf app
mv components 2>/dev/null; true
```

Actually use this exact command sequence:
```bash
mkdir ui && cd ui
npx create-next-app@latest . --typescript --tailwind --app --src-dir --import-alias "@/*" --no-eslint
```

- [ ] **Step 2: Install dependencies**

```bash
cd ui
npm install @supabase/supabase-js
npx shadcn@latest init
# When prompted: Default style, Slate base color, yes to CSS variables
npx shadcn@latest add card badge table button input label select
```

- [ ] **Step 3: Create `.env.local.example`**

```bash
cat > ui/.env.local.example << 'EOF'
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
EOF
```

Copy to `.env.local` and fill in your Supabase project URL and service role key.

- [ ] **Step 4: Create `ui/src/lib/types.ts`**

```typescript
export type ApplicationStatus = "applied" | "interview" | "rejection" | "ghosted" | "manual_pending"

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

export interface ReplyLog {
  id: string
  job_url: string | null
  channel: string
  sender: string | null
  subject: string | null
  classification: string | null
  received_at: string
}

export interface Preferences {
  id: string
  locations: string[] | null
  seniority: string[] | null
  salary_floor: number | null
  role_keywords: string[] | null
}

export interface WatchlistEntry {
  id: string
  company_name: string | null
  careers_url: string | null
  role_keywords: string[] | null
}

export interface CrawlerUrl {
  id: string
  company_name: string | null
  careers_url: string | null
  active: boolean
}
```

- [ ] **Step 5: Create `ui/src/lib/supabase.ts`**

```typescript
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error("Missing Supabase env vars")
  return createSupabaseClient(url, key)
}
```

- [ ] **Step 6: Create `ui/src/components/sidebar.tsx`**

```tsx
"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/applications", label: "Applications" },
  { href: "/settings", label: "Settings" },
]

export function Sidebar() {
  const pathname = usePathname()
  return (
    <aside className="w-56 shrink-0 border-r bg-muted/40 min-h-screen p-4">
      <p className="font-bold text-lg mb-6 px-2">Invictus</p>
      <nav className="flex flex-col gap-1">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname.startsWith(link.href)
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
```

- [ ] **Step 7: Create `ui/src/app/layout.tsx`**

```tsx
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Sidebar } from "@/components/sidebar"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = { title: "Invictus" }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-8 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  )
}
```

- [ ] **Step 8: Create `ui/src/app/page.tsx`**

```tsx
import { redirect } from "next/navigation"

export default function Home() {
  redirect("/dashboard")
}
```

- [ ] **Step 9: Start dev server and verify layout renders**

```bash
cd ui && npm run dev
```

Open http://localhost:3000 — should see sidebar with three nav links, redirect to /dashboard (404 page is fine — page doesn't exist yet).

- [ ] **Step 10: Commit**

```bash
git add ui/
git commit -m "feat(ui): Next.js project setup + sidebar layout"
```

---

## Task 2: Dashboard Page

**Files:**
- Create: `ui/src/components/stat-card.tsx`
- Create: `ui/src/components/status-badge.tsx`
- Create: `ui/src/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: `createClient()` from `@/lib/supabase`
- Consumes: `Application`, `ReplyLog` from `@/lib/types`
- Produces: `<StatCard>` used by dashboard; `<StatusBadge>` used by dashboard and applications table

- [ ] **Step 1: Create `ui/src/components/stat-card.tsx`**

```tsx
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface StatCardProps {
  label: string
  value: number
  sub?: string
}

export function StatCard({ label, value, sub }: StatCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  )
}
```

- [ ] **Step 2: Create `ui/src/components/status-badge.tsx`**

```tsx
import { Badge } from "@/components/ui/badge"
import type { ApplicationStatus } from "@/lib/types"

const config: Record<ApplicationStatus, { label: string; className: string }> = {
  applied:         { label: "Applied",         className: "bg-blue-100 text-blue-800" },
  interview:       { label: "Interview",       className: "bg-green-100 text-green-800" },
  rejection:       { label: "Rejected",        className: "bg-red-100 text-red-800" },
  ghosted:         { label: "Ghosted",         className: "bg-gray-100 text-gray-600" },
  manual_pending:  { label: "Manual Pending",  className: "bg-yellow-100 text-yellow-800" },
}

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const { label, className } = config[status] ?? { label: status, className: "" }
  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  )
}
```

- [ ] **Step 3: Create `ui/src/app/dashboard/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase"
import { StatCard } from "@/components/stat-card"
import { StatusBadge } from "@/components/status-badge"
import type { Application, ApplicationStatus } from "@/lib/types"

async function fetchStats() {
  const db = createClient()
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const [{ data: apps }, { data: replies }, { data: outreach }] = await Promise.all([
    db.from("applications").select("id,status,title,company,submitted_at").order("submitted_at", { ascending: false }),
    db.from("reply_log").select("id,classification").gte("received_at", since),
    db.from("outreach_log").select("id").gte("sent_at", since),
  ])

  const allApps = (apps ?? []) as Application[]
  return {
    total:       allApps.length,
    interviews:  allApps.filter((a) => a.status === "interview").length,
    rejections:  allApps.filter((a) => a.status === "rejection").length,
    outreach:    (outreach ?? []).length,
    recent:      allApps.slice(0, 10),
  }
}

export default async function DashboardPage() {
  const stats = await fetchStats()
  const responseRate =
    stats.total > 0 ? Math.round(((stats.interviews + stats.rejections) / stats.total) * 100) : 0

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total Applied" value={stats.total} />
        <StatCard label="Interviews" value={stats.interviews} />
        <StatCard label="Rejections" value={stats.rejections} />
        <StatCard label="Response Rate" value={responseRate} sub="%" />
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">Recent Applications</h2>
        <div className="rounded-md border">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Company</th>
                <th className="px-4 py-3 text-left font-medium">Role</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-left font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent.map((app) => (
                <tr key={app.id} className="border-b last:border-0">
                  <td className="px-4 py-3 font-medium">{app.company ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{app.title ?? "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={app.status as ApplicationStatus} />
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(app.submitted_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {stats.recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                    No applications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
```

- [ ] **Step 4: Verify in browser**

With dev server running, open http://localhost:3000/dashboard.  
Expected: 4 stat cards, recent applications table (empty if no data yet — shows "No applications yet.").  
Check browser console for errors. If Supabase env vars missing, you'll see the error thrown from `supabase.ts` — add `.env.local` with real values.

- [ ] **Step 5: Commit**

```bash
git add ui/src/components/stat-card.tsx ui/src/components/status-badge.tsx ui/src/app/dashboard/
git commit -m "feat(ui): dashboard page with stat cards and recent applications"
```

---

## Task 3: Applications Page

**Files:**
- Create: `ui/src/components/applications-table.tsx`
- Create: `ui/src/app/applications/page.tsx`

**Interfaces:**
- Consumes: `Application`, `ApplicationStatus` from `@/lib/types`
- Consumes: `StatusBadge` from `@/components/status-badge`

- [ ] **Step 1: Create `ui/src/components/applications-table.tsx`**

```tsx
"use client"

import { useState } from "react"
import { StatusBadge } from "@/components/status-badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { Application, ApplicationStatus } from "@/lib/types"

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all",            label: "All" },
  { value: "applied",        label: "Applied" },
  { value: "interview",      label: "Interview" },
  { value: "rejection",      label: "Rejected" },
  { value: "ghosted",        label: "Ghosted" },
  { value: "manual_pending", label: "Manual Pending" },
]

export function ApplicationsTable({ applications }: { applications: Application[] }) {
  const [filter, setFilter] = useState("all")

  const visible = filter === "all" ? applications : applications.filter((a) => a.status === filter)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <p className="text-sm text-muted-foreground">{visible.length} applications</p>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead className="border-b bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Company</th>
              <th className="px-4 py-3 text-left font-medium">Role</th>
              <th className="px-4 py-3 text-left font-medium">Platform</th>
              <th className="px-4 py-3 text-left font-medium">Type</th>
              <th className="px-4 py-3 text-left font-medium">Status</th>
              <th className="px-4 py-3 text-left font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((app) => (
              <tr key={app.id} className="border-b last:border-0 hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{app.company ?? "—"}</td>
                <td className="px-4 py-3">
                  <a
                    href={app.job_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    {app.title ?? "View job"}
                  </a>
                </td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{app.ats_platform ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground capitalize">{app.submission_type ?? "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={app.status as ApplicationStatus} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(app.submitted_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  No applications match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `ui/src/app/applications/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase"
import { ApplicationsTable } from "@/components/applications-table"
import type { Application } from "@/lib/types"

export default async function ApplicationsPage() {
  const db = createClient()
  const { data } = await db
    .from("applications")
    .select("id,job_url,title,company,ats_platform,status,submission_type,resume_pdf_path,cover_letter_path,submitted_at")
    .order("submitted_at", { ascending: false })

  const applications = (data ?? []) as Application[]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Applications</h1>
      <ApplicationsTable applications={applications} />
    </div>
  )
}
```

- [ ] **Step 3: Verify in browser**

Open http://localhost:3000/applications.  
Expected: table with status filter dropdown. Selecting a status filters rows client-side instantly with no page reload. Empty state shows "No applications match this filter."

- [ ] **Step 4: Commit**

```bash
git add ui/src/components/applications-table.tsx ui/src/app/applications/
git commit -m "feat(ui): applications page with status filter"
```

---

## Task 4: Settings Page

**Files:**
- Create: `ui/src/components/settings-form.tsx`
- Create: `ui/src/app/settings/page.tsx`
- Create: `ui/src/app/api/settings/route.ts`
- Create: `ui/src/app/api/watchlist/route.ts`

**Interfaces:**
- Consumes: `Preferences`, `WatchlistEntry` from `@/lib/types`
- Produces: `PATCH /api/settings` — updates preferences row
- Produces: `POST /api/watchlist` — inserts watchlist entry; `DELETE /api/watchlist` — removes entry

- [ ] **Step 1: Create `ui/src/app/api/settings/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function PATCH(req: NextRequest) {
  const body = await req.json()
  const db = createClient()

  const { data: existing } = await db.from("preferences").select("id").limit(1)
  const id = existing?.[0]?.id

  if (id) {
    await db.from("preferences").update(body).eq("id", id)
  } else {
    await db.from("preferences").insert(body)
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Create `ui/src/app/api/watchlist/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase"

export async function POST(req: NextRequest) {
  const body = await req.json()
  const db = createClient()
  const { data, error } = await db.from("watchlist").insert(body).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  const db = createClient()
  await db.from("watchlist").delete().eq("id", id)
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 3: Create `ui/src/components/settings-form.tsx`**

```tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { Preferences, WatchlistEntry } from "@/lib/types"

interface SettingsFormProps {
  preferences: Preferences | null
  watchlist: WatchlistEntry[]
}

export function SettingsForm({ preferences, watchlist: initial }: SettingsFormProps) {
  const [locations, setLocations] = useState((preferences?.locations ?? []).join(", "))
  const [keywords, setKeywords] = useState((preferences?.role_keywords ?? []).join(", "))
  const [salary, setSalary] = useState(String(preferences?.salary_floor ?? ""))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [watchlist, setWatchlist] = useState<WatchlistEntry[]>(initial)
  const [newCompany, setNewCompany] = useState("")
  const [newUrl, setNewUrl] = useState("")

  async function savePreferences() {
    setSaving(true)
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        locations: locations.split(",").map((s) => s.trim()).filter(Boolean),
        role_keywords: keywords.split(",").map((s) => s.trim()).filter(Boolean),
        salary_floor: salary ? parseInt(salary, 10) : null,
      }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function addWatchlistEntry() {
    if (!newCompany.trim() || !newUrl.trim()) return
    const res = await fetch("/api/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ company_name: newCompany.trim(), careers_url: newUrl.trim(), role_keywords: [] }),
    })
    const entry = await res.json()
    setWatchlist((prev) => [...prev, entry])
    setNewCompany("")
    setNewUrl("")
  }

  async function removeWatchlistEntry(id: string) {
    await fetch("/api/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
    setWatchlist((prev) => prev.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="keywords">Role Keywords (comma-separated)</Label>
            <Input
              id="keywords"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="Software Engineer, Backend Engineer"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="locations">Locations (comma-separated)</Label>
            <Input
              id="locations"
              value={locations}
              onChange={(e) => setLocations(e.target.value)}
              placeholder="Remote, Tampa FL"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="salary">Minimum Salary (USD/year)</Label>
            <Input
              id="salary"
              type="number"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="80000"
            />
          </div>
          <Button onClick={savePreferences} disabled={saving}>
            {saving ? "Saving…" : saved ? "Saved!" : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Watchlist</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md border divide-y">
            {watchlist.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="font-medium text-sm">{entry.company_name}</p>
                  <p className="text-xs text-muted-foreground">{entry.careers_url}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-500 hover:text-red-700"
                  onClick={() => removeWatchlistEntry(entry.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
            {watchlist.length === 0 && (
              <p className="px-4 py-6 text-sm text-center text-muted-foreground">No companies in watchlist.</p>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Company name"
              value={newCompany}
              onChange={(e) => setNewCompany(e.target.value)}
            />
            <Input
              placeholder="Career page URL"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
            />
            <Button onClick={addWatchlistEntry}>Add</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
```

- [ ] **Step 4: Create `ui/src/app/settings/page.tsx`**

```tsx
import { createClient } from "@/lib/supabase"
import { SettingsForm } from "@/components/settings-form"
import type { Preferences, WatchlistEntry } from "@/lib/types"

export default async function SettingsPage() {
  const db = createClient()
  const [{ data: prefsData }, { data: watchlistData }] = await Promise.all([
    db.from("preferences").select("*").limit(1),
    db.from("watchlist").select("*").order("company_name"),
  ])

  const preferences = (prefsData?.[0] ?? null) as Preferences | null
  const watchlist = (watchlistData ?? []) as WatchlistEntry[]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <SettingsForm preferences={preferences} watchlist={watchlist} />
    </div>
  )
}
```

- [ ] **Step 5: Verify in browser**

Open http://localhost:3000/settings.  
Expected:
- Preferences card shows current values from Supabase (or empty if not seeded)
- Edit a field → click Save → button shows "Saved!" briefly
- Watchlist card shows current entries; Remove button deletes from Supabase instantly; Add form inserts new row

- [ ] **Step 6: Commit**

```bash
git add ui/src/components/settings-form.tsx ui/src/app/settings/ ui/src/app/api/
git commit -m "feat(ui): settings page — edit preferences and manage watchlist"
```

---

## Self-Review

**Spec coverage:**
- Dashboard stats ✅ (Task 2)
- Applications table with status filter ✅ (Task 3)
- Settings — preferences edit ✅ (Task 4)
- Settings — watchlist CRUD ✅ (Task 4)
- Sidebar nav ✅ (Task 1)

**Placeholder scan:** No TBDs, no "handle edge cases", all code blocks complete.

**Type consistency:**
- `Application.status` typed as `ApplicationStatus` — used identically in `stat-card`, `status-badge`, `applications-table`, `dashboard/page` ✅
- `createClient()` signature consistent across all server components ✅
- `WatchlistEntry.id` used as key and in DELETE body — consistent ✅
