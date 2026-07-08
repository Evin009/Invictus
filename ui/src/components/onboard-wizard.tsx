"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = "strata-onboarding-progress-v1"

// ─── Types ────────────────────────────────────────────────────────────────────
interface WorkEntry  { employer: string; title: string; startDate: string; endDate: string; description: string }

interface Form {
  fullName: string; email: string; phone: string; currentLocation: string
  linkedin: string; github: string; portfolio: string
  school: string; major: string; degree: string; gpa: string; gradMonth: string; gradYear: string
  workAuth: string | null; sponsorship: string | null; relocate: string | null; workMode: string[]; startDate: string
  minSalary: string; desiredSalary: string
  rewriteLevel: string | null
  internshipCycle: string | null
  gender: string | null; race: string | null; veteran: string | null; disability: string | null; pronouns: string
}

interface ParsedResume {
  fullName: string; email: string; phone: string; currentLocation: string
  linkedin: string; github: string; portfolio: string
  school: string; degree: string; major: string; gpa: string; gradMonth: string; gradYear: string
  skills: string[]
  workHistory: WorkEntry[]
  projects: WorkEntry[]
}

interface WizardState {
  stage: "upload" | "extracting" | "review" | "form"
  resumeFileName: string
  step: number
  showSuccess: boolean
  uploadError: string | null
  extractError: string | null
  parsed: ParsedResume | null
  form: Form
  skills: string[]; skillInput: string
  locations: string[]; selectedState: string
  seniority: string[]
  keywords: string[]; keywordInput: string
  companies: Array<{ name: string }>; companyName: string; selectedCategory: string
  workHistory: WorkEntry[]
  emailError: boolean
}

const INITIAL_FORM: Form = {
  fullName: "", email: "", phone: "", currentLocation: "",
  linkedin: "", github: "", portfolio: "",
  school: "", major: "", degree: "", gpa: "", gradMonth: "", gradYear: "",
  workAuth: null, sponsorship: null, relocate: null, workMode: [], startDate: "",
  minSalary: "", desiredSalary: "",
  rewriteLevel: null,
  internshipCycle: null,
  gender: null, race: null, veteran: null, disability: null, pronouns: "",
}

const INITIAL_STATE: WizardState = {
  stage: "upload", resumeFileName: "", step: 0, showSuccess: false, uploadError: null, extractError: null, parsed: null,
  form: INITIAL_FORM,
  skills: [], skillInput: "",
  locations: [], selectedState: "",
  seniority: [],
  keywords: [], keywordInput: "",
  companies: [], companyName: "", selectedCategory: "",
  workHistory: [{ employer: "", title: "", startDate: "", endDate: "", description: "" }],
  emailError: false,
}

const TAB_LABELS = ["Personal", "Work Auth", "Work History", "Preferences", "Watchlist", "Demographics", "AI Settings"]
const SENIORITY_LEVELS = ["Internship", "Entry Level", "Mid Level", "Senior", "Lead", "Staff"]
const GENDER_OPTIONS = ["Woman", "Man", "Non-binary", "Prefer not to say"]
const RACE_OPTIONS = ["American Indian / Alaska Native", "Asian", "Black / African American", "Hispanic / Latino", "Native Hawaiian / Pacific Islander", "White", "Two or more races", "Prefer not to say"]
const YES_NO = ["Yes", "No"]
const VETERAN_OPTIONS = ["Yes", "No", "Prefer not to say"]
const DISABILITY_OPTIONS = ["Yes", "No", "Prefer not to say"]
const WORK_MODE_OPTIONS = ["Remote", "Hybrid", "On-site"]
const INTERNSHIP_CYCLES = ["Fall 2026", "Spring 2027", "Summer 2027", "Fall 2027", "Spring 2028", "Summer 2028"]
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const COMPANY_CATEGORIES: Record<string, string[]> = {
  "Technology":           ["Apple","Google","Microsoft","Meta","Amazon","Netflix","Nvidia","Salesforce","Adobe","Oracle","Cisco","IBM","Intel","Uber","Airbnb","Stripe","Snowflake","Databricks","OpenAI","Anthropic","Palantir","SpaceX","Robinhood","DoorDash"],
  "Finance & Banking":    ["JPMorgan Chase","Goldman Sachs","Morgan Stanley","Bank of America","Wells Fargo","Citigroup","BlackRock","Vanguard","Fidelity","Charles Schwab","American Express","Visa","Mastercard","PayPal","Capital One","Jane Street","Citadel","Two Sigma","Bloomberg","Moody's"],
  "Healthcare & Biotech": ["Johnson & Johnson","Pfizer","Moderna","Abbott Laboratories","Medtronic","UnitedHealth Group","CVS Health","Humana","Cigna","HCA Healthcare","Mayo Clinic","Kaiser Permanente","Genentech","Amgen","Gilead Sciences","Regeneron"],
  "Consulting":           ["McKinsey & Company","Boston Consulting Group","Bain & Company","Deloitte","PwC","EY","KPMG","Accenture","Oliver Wyman","Booz Allen Hamilton","Leidos","SAIC","Gartner","Capgemini"],
  "E-commerce & Retail":  ["Amazon","Walmart","Target","Costco","The Home Depot","Best Buy","Wayfair","Chewy","eBay","Shopify","Etsy","Instacart","Rakuten"],
  "Media & Entertainment":["Disney","Warner Bros. Discovery","NBCUniversal","Netflix","Spotify","Hulu","Paramount","Sony Pictures","Electronic Arts","Riot Games","Roblox","Epic Games","Activision","Take-Two Interactive"],
  "Aerospace & Defense":  ["Boeing","Lockheed Martin","Raytheon Technologies","Northrop Grumman","General Dynamics","NASA","SpaceX","Blue Origin","L3Harris","BAE Systems","Aerojet Rocketdyne"],
  "Energy & Utilities":   ["ExxonMobil","Chevron","BP","Shell","NextEra Energy","Duke Energy","Southern Company","Schlumberger","Halliburton","Baker Hughes","Enphase Energy","First Solar"],
  "Automotive":           ["Tesla","Ford","General Motors","Toyota","BMW","Mercedes-Benz","Rivian","Lucid Motors","Waymo","Zoox","Aurora Innovation","Mobileye"],
  "Startups & Unicorns":  ["OpenAI","Anthropic","Figma","Notion","Linear","Vercel","Supabase","Plaid","Scale AI","Brex","Mercury","Rippling","Ramp","Deel","Intercom","Retool"],
  "Government & Defense": ["U.S. Department of Defense","CIA","NSA","FBI","U.S. Army","U.S. Navy","U.S. Air Force","DHS","DARPA","DOE","State Department"],
  "Education & Research": ["MIT","Stanford University","Harvard University","Carnegie Mellon","Georgia Tech","Coursera","Duolingo","Chegg","2U","Khan Academy","Pearson"],
  "Real Estate & Proptech":["CBRE","JLL","Zillow","Redfin","Opendoor","WeWork","Compass","CoStar","Realogy","Invitation Homes"],
  "Telecommunications":   ["AT&T","Verizon","T-Mobile","Comcast","Charter Communications","Lumen Technologies","CrowdStrike","Palo Alto Networks","Zscaler","Cloudflare"],
}

const STATE_ABBREV: Record<string, string> = {
  "Alabama":"AL","Alaska":"AK","Arizona":"AZ","Arkansas":"AR","California":"CA",
  "Colorado":"CO","Connecticut":"CT","Delaware":"DE","Florida":"FL","Georgia":"GA",
  "Hawaii":"HI","Idaho":"ID","Illinois":"IL","Indiana":"IN","Iowa":"IA",
  "Kansas":"KS","Kentucky":"KY","Louisiana":"LA","Maine":"ME","Maryland":"MD",
  "Massachusetts":"MA","Michigan":"MI","Minnesota":"MN","Mississippi":"MS","Missouri":"MO",
  "Montana":"MT","Nebraska":"NE","Nevada":"NV","New Hampshire":"NH","New Jersey":"NJ",
  "New Mexico":"NM","New York":"NY","North Carolina":"NC","North Dakota":"ND","Ohio":"OH",
  "Oklahoma":"OK","Oregon":"OR","Pennsylvania":"PA","Rhode Island":"RI","South Carolina":"SC",
  "South Dakota":"SD","Tennessee":"TN","Texas":"TX","Utah":"UT","Vermont":"VT",
  "Virginia":"VA","Washington":"WA","West Virginia":"WV","Wisconsin":"WI","Wyoming":"WY",
}

const STATE_CITIES: Record<string, string[]> = {
  "Alabama":       ["Birmingham","Huntsville","Mobile","Montgomery"],
  "Alaska":        ["Anchorage","Fairbanks","Juneau"],
  "Arizona":       ["Chandler","Mesa","Phoenix","Scottsdale","Tempe","Tucson"],
  "Arkansas":      ["Fayetteville","Fort Smith","Little Rock"],
  "California":    ["Irvine","Los Angeles","Oakland","Sacramento","San Diego","San Francisco","San Jose","Santa Clara"],
  "Colorado":      ["Aurora","Boulder","Colorado Springs","Denver","Fort Collins"],
  "Connecticut":   ["Bridgeport","Hartford","New Haven","Stamford"],
  "Delaware":      ["Dover","Newark","Wilmington"],
  "Florida":       ["Fort Lauderdale","Jacksonville","Miami","Orlando","St. Petersburg","Tallahassee","Tampa"],
  "Georgia":       ["Atlanta","Augusta","Columbus","Savannah"],
  "Hawaii":        ["Hilo","Honolulu","Kailua"],
  "Idaho":         ["Boise","Idaho Falls","Nampa"],
  "Illinois":      ["Aurora","Chicago","Naperville","Rockford"],
  "Indiana":       ["Fort Wayne","Indianapolis","South Bend"],
  "Iowa":          ["Cedar Rapids","Des Moines","Sioux City"],
  "Kansas":        ["Kansas City","Olathe","Overland Park","Wichita"],
  "Kentucky":      ["Bowling Green","Lexington","Louisville"],
  "Louisiana":     ["Baton Rouge","New Orleans","Shreveport"],
  "Maine":         ["Bangor","Portland"],
  "Maryland":      ["Annapolis","Baltimore","Frederick","Rockville"],
  "Massachusetts": ["Boston","Cambridge","Lowell","Springfield","Worcester"],
  "Michigan":      ["Ann Arbor","Detroit","Grand Rapids","Lansing"],
  "Minnesota":     ["Minneapolis","Rochester","St. Paul"],
  "Mississippi":   ["Gulfport","Jackson","Southaven"],
  "Missouri":      ["Columbia","Kansas City","Springfield","St. Louis"],
  "Montana":       ["Billings","Bozeman","Great Falls","Missoula"],
  "Nebraska":      ["Lincoln","Omaha"],
  "Nevada":        ["Henderson","Las Vegas","Reno"],
  "New Hampshire": ["Concord","Manchester","Nashua"],
  "New Jersey":    ["Edison","Jersey City","Newark","Trenton"],
  "New Mexico":    ["Albuquerque","Rio Rancho","Santa Fe"],
  "New York":      ["Albany","Buffalo","New York City","Rochester","Syracuse","Yonkers"],
  "North Carolina":["Charlotte","Durham","Greensboro","Raleigh","Winston-Salem"],
  "North Dakota":  ["Bismarck","Fargo","Grand Forks"],
  "Ohio":          ["Cincinnati","Cleveland","Columbus","Dayton","Toledo"],
  "Oklahoma":      ["Norman","Oklahoma City","Tulsa"],
  "Oregon":        ["Eugene","Portland","Salem"],
  "Pennsylvania":  ["Allentown","Philadelphia","Pittsburgh","Reading"],
  "Rhode Island":  ["Cranston","Providence","Warwick"],
  "South Carolina":["Charleston","Columbia","Greenville"],
  "South Dakota":  ["Rapid City","Sioux Falls"],
  "Tennessee":     ["Chattanooga","Knoxville","Memphis","Nashville"],
  "Texas":         ["Austin","Dallas","El Paso","Fort Worth","Houston","San Antonio"],
  "Utah":          ["Ogden","Provo","Salt Lake City","West Valley City"],
  "Vermont":       ["Burlington","Essex","Montpelier"],
  "Virginia":      ["Arlington","Chesapeake","Norfolk","Richmond","Virginia Beach"],
  "Washington":    ["Bellevue","Seattle","Spokane","Tacoma"],
  "West Virginia": ["Charleston","Huntington","Morgantown"],
  "Wisconsin":     ["Green Bay","Madison","Milwaukee"],
  "Wyoming":       ["Casper","Cheyenne","Laramie"],
}

// ─── Injected CSS ─────────────────────────────────────────────────────────────
const CSS = `
  *{box-sizing:border-box}
  body{margin:0}
  .ob-input{width:100%;padding:13px 14px;font-size:14px;font-family:'Space Grotesk',sans-serif;border-radius:8px;border:1px solid rgba(0,49,53,0.14);outline:none;background:#F5F8F7;color:#003135;}
  .ob-input::placeholder{color:rgba(0,49,53,0.4)}
  .ob-input:focus{border-color:#0FA4AF;background:#fff;box-shadow:0 0 0 3px rgba(15,164,175,0.15);}
  .ob-select{width:100%;padding:13px 14px;font-size:14px;font-family:'Space Grotesk',sans-serif;border-radius:8px;border:1px solid rgba(0,49,53,0.14);outline:none;background:#F5F8F7;color:#003135;appearance:none;cursor:pointer;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23003135' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 14px center;}
  .ob-select:focus{border-color:#0FA4AF;background-color:#fff;box-shadow:0 0 0 3px rgba(15,164,175,0.15);}
  .ob-select option{background:#fff;color:#003135;}
  .ob-textarea{width:100%;padding:13px 14px;font-size:14px;font-family:'Space Grotesk',sans-serif;border-radius:8px;border:1px solid rgba(0,49,53,0.14);outline:none;background:#F5F8F7;color:#003135;resize:vertical;min-height:110px;margin-top:10px;}
  .ob-textarea::placeholder{color:rgba(0,49,53,0.4)}
  .ob-textarea:focus{border-color:#0FA4AF;background:#fff;box-shadow:0 0 0 3px rgba(15,164,175,0.15);}
  @keyframes ob-logo-arc{0%{stroke-dashoffset:0}100%{stroke-dashoffset:-249}}
  @keyframes ob-logo-done{from{stroke-dashoffset:249;opacity:0}to{stroke-dashoffset:0;opacity:1}}
  @keyframes ob-inner-pulse{0%,100%{opacity:0.18}50%{opacity:0.55}}
  @keyframes ob-center-pulse{0%,100%{opacity:0.6}50%{opacity:1}}
  @keyframes ob-parse-bar{0%{background-position:-200% 0}100%{background-position:200% 0}}
  @keyframes ob-parse-dot{0%,80%,100%{transform:scale(0.6);opacity:0.3}40%{transform:scale(1);opacity:1}}
  @keyframes ob-parse-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
  .ob-parse-shimmer{
    background:linear-gradient(90deg,#0FA4AF 0%,#024950 45%,#0FA4AF 100%);
    background-size:200% 100%;
    animation:ob-parse-bar 1.8s ease-in-out infinite;
  }
  @media (prefers-reduced-motion: reduce){
    *{animation:none !important;}
  }
`

// ─── Shared small components ──────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.03em", color: "rgba(0,49,53,0.6)", marginBottom: 8 }}>
      {children}
    </label>
  )
}

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "6px 12px", background: "rgba(150,71,52,0.14)", color: "#964734", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
      {label}
      <span onClick={onRemove} style={{ cursor: "pointer", opacity: 0.6, marginLeft: 6 }}>×</span>
    </span>
  )
}

function Pill({ label, selected, onClick }: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ padding: "10px 18px", borderRadius: 20, border: "none", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, cursor: "pointer", background: selected ? "#964734" : "#EDF2F1", color: selected ? "#fff" : "rgba(0,49,53,0.7)" }}>
      {label}
    </button>
  )
}

function PlusBtn({ onClick }: { onClick: () => void }) {
  return (
    <button onClick={onClick} style={{ width: 44, flexShrink: 0, borderRadius: 8, border: "none", background: "rgba(15,164,175,0.14)", color: "#024950", fontSize: 18, cursor: "pointer", height: 47 }}>+</button>
  )
}

function ChipRow({ chips }: { chips: string[]; }) {
  return chips.length > 0
    ? <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>{chips.map((c, i) => <Chip key={i} label={c} onRemove={() => {}} />)}</div>
    : null
}

// ─── Main component ───────────────────────────────────────────────────────────
const PARSE_STEPS = [
  "Scanning document",
  "Extracting work history",
  "Mapping skills & education",
  "Finalizing your profile",
]
const MIN_PARSE_MS = 3500

export function OnboardWizard() {
  const router = useRouter()
  const [s, setS] = useState<WizardState>(INITIAL_STATE)
  const [isSaving, setIsSaving] = useState(false)
  const [parseStep, setParseStep] = useState(0)
  const isFirstMount = useRef(true)
  const parseStartRef = useRef<number>(0)
  const pendingParseData = useRef<Record<string, unknown> | null>(null)

  // Load persisted progress
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        if (saved && typeof saved === "object") setS(saved)
      }
    } catch {}
  }, [])

  // Persist on every change (skip first mount to avoid overwriting loaded state)
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)) } catch {}
  }, [s])

  function upd(patch: Partial<WizardState>) { setS(p => ({ ...p, ...patch })) }
  function updForm(key: keyof Form, val: string | null) { setS(p => ({ ...p, form: { ...p.form, [key]: val } })) }
  function toggleForm(key: keyof Form, val: string) { setS(p => ({ ...p, form: { ...p.form, [key]: p.form[key] === val ? null : val } })) }
  function toggleSeniority(label: string) { setS(p => ({ ...p, seniority: p.seniority.includes(label) ? p.seniority.filter(x => x !== label) : [...p.seniority, label] })) }

  function applyParsedData(data: Record<string, unknown>) {
    // Flash all checkmarks done (including last), then transition after brief hold
    setParseStep(PARSE_STEPS.length)
    setTimeout(() => setS(p => ({
      ...p, stage: "form", parsed: data as never,
      form: {
        ...p.form,
        fullName:        (data.fullName        as string) ?? p.form.fullName,
        email:           (data.email           as string) ?? p.form.email,
        phone:           (data.phone           as string) ?? p.form.phone,
        currentLocation: (data.currentLocation as string) ?? p.form.currentLocation,
        linkedin:        (data.linkedin        as string) ?? p.form.linkedin,
        github:          (data.github          as string) ?? p.form.github,
        portfolio:       (data.portfolio       as string) ?? p.form.portfolio,
        school:          (data.school          as string) ?? p.form.school,
        degree:          (data.degree          as string) ?? p.form.degree,
        major:           (data.major           as string) ?? p.form.major,
        gpa:             (data.gpa             as string) ?? p.form.gpa,
        gradMonth:       (data.gradMonth       as string) ?? p.form.gradMonth,
        gradYear:        (data.gradYear        as string) ?? p.form.gradYear,
      },
      skills:      (data.skills as string[])?.length > 0 ? (data.skills as string[]) : p.skills,
      workHistory: [...((data.workHistory as never[]) ?? []), ...((data.projects as never[]) ?? [])].length > 0
        ? [...((data.workHistory as never[]) ?? []), ...((data.projects as never[]) ?? [])]
        : p.workHistory,
    })), 550)
  }

  // Resume upload
  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = "." + file.name.toLowerCase().split(".").pop()
    if (![".pdf", ".doc", ".docx"].includes(ext)) { upd({ uploadError: "Please upload a PDF, DOC, or DOCX file." }); e.target.value = ""; return }
    if (file.size > 8 * 1024 * 1024) { upd({ uploadError: "File is too large — max 8MB." }); e.target.value = ""; return }

    parseStartRef.current = Date.now()
    pendingParseData.current = null
    setParseStep(0)
    upd({ stage: "extracting", resumeFileName: file.name, uploadError: null, extractError: null })

    // Step ticker — advances label every ~800ms
    let step = 0
    const ticker = setInterval(() => {
      step = Math.min(step + 1, PARSE_STEPS.length - 1)
      setParseStep(step)
    }, 850)

    const fd = new FormData()
    fd.append("file", file)
    fetch("/api/parse-resume", { method: "POST", body: fd })
      .then(r => r.json())
      .then(data => {
        clearInterval(ticker)
        if (data.error) { upd({ stage: "upload", extractError: data.error }); return }
        const elapsed = Date.now() - parseStartRef.current
        const remaining = MIN_PARSE_MS - elapsed
        if (remaining > 0) {
          pendingParseData.current = data
          setParseStep(PARSE_STEPS.length - 1)
          setTimeout(() => { applyParsedData(data) }, remaining)
        } else {
          applyParsedData(data)
        }
      })
      .catch(() => { clearInterval(ticker); upd({ stage: "upload", extractError: "Could not read resume — check the file and try again." }) })
    e.target.value = ""
  }

  function confirmExtracted() {
    const p0 = s.parsed
    setS(p => ({
      ...p, stage: "form",
      form: {
        ...p.form,
        fullName:        p0?.fullName        ?? p.form.fullName,
        email:           p0?.email           ?? p.form.email,
        phone:           p0?.phone           ?? p.form.phone,
        currentLocation: p0?.currentLocation ?? p.form.currentLocation,
        linkedin:        p0?.linkedin        ?? p.form.linkedin,
        github:          p0?.github          ?? p.form.github,
        portfolio:       p0?.portfolio       ?? p.form.portfolio,
        school:          p0?.school          ?? p.form.school,
        degree:          p0?.degree          ?? p.form.degree,
        major:           p0?.major           ?? p.form.major,
        gpa:             p0?.gpa             ?? p.form.gpa,
        gradMonth:       p0?.gradMonth       ?? p.form.gradMonth,
        gradYear:        p0?.gradYear        ?? p.form.gradYear,
      },
      skills:      p0?.skills?.length      ? p0.skills      : p.skills,
      workHistory: [...(p0?.workHistory ?? []), ...(p0?.projects ?? [])].length > 0
        ? [...(p0?.workHistory ?? []), ...(p0?.projects ?? [])]
        : p.workHistory,
    }))
  }

  // Chip helpers
  function addSkill() { const v = s.skillInput.trim(); if (!v) return; setS(p => ({ ...p, skills: [...p.skills, v], skillInput: "" })) }
  function removeSkill(i: number) { setS(p => ({ ...p, skills: p.skills.filter((_, idx) => idx !== i) })) }
  function toggleCity(city: string, state: string) {
    const abbr = STATE_ABBREV[state] ?? state
    const tag = `${city}, ${abbr}`
    setS(p => ({
      ...p,
      locations: p.locations.includes(tag) ? p.locations.filter(l => l !== tag) : [...p.locations, tag],
    }))
  }
  function removeLocation(i: number) { setS(p => ({ ...p, locations: p.locations.filter((_, idx) => idx !== i) })) }
  function addKeyword() { const v = s.keywordInput.trim(); if (!v) return; setS(p => ({ ...p, keywords: [...p.keywords, v], keywordInput: "" })) }
  function removeKeyword(i: number) { setS(p => ({ ...p, keywords: p.keywords.filter((_, idx) => idx !== i) })) }

  function addCompany() {
    const name = s.companyName.trim()
    if (!name) return
    if (s.companies.some(c => c.name.toLowerCase() === name.toLowerCase())) { setS(p => ({ ...p, companyName: "" })); return }
    setS(p => ({ ...p, companies: [...p.companies, { name }], companyName: "" }))
  }
  function toggleCompany(name: string) {
    setS(p => ({
      ...p,
      companies: p.companies.some(c => c.name === name)
        ? p.companies.filter(c => c.name !== name)
        : [...p.companies, { name }],
    }))
  }
  function removeCompany(i: number) { setS(p => ({ ...p, companies: p.companies.filter((_, idx) => idx !== i) })) }

  function addWorkEntry() { setS(p => ({ ...p, workHistory: [...p.workHistory, { employer: "", title: "", startDate: "", endDate: "", description: "" }] })) }
  function removeWorkEntry(i: number) { setS(p => ({ ...p, workHistory: p.workHistory.filter((_, idx) => idx !== i) })) }
  function updateWork(i: number, key: keyof WorkEntry, val: string) { setS(p => ({ ...p, workHistory: p.workHistory.map((w, idx) => idx === i ? { ...w, [key]: val } : w) })) }

  function goBack() { upd({ step: Math.max(0, s.step - 1) }) }

  async function goNext() {
    if (s.step === 0) {
      if (s.form.email.trim() && !EMAIL_RE.test(s.form.email.trim())) { upd({ emailError: true }); return }
      upd({ emailError: false })
    }
    if (s.step < 6) { upd({ step: s.step + 1 }); return }

    // Final step — save to Supabase
    setIsSaving(true)
    try {
      await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: s.form.fullName, email: s.form.email, phone: s.form.phone,
          linkedin_url: s.form.linkedin, github_url: s.form.github,
          skills: s.skills, work_history: s.workHistory,
          current_location: s.form.currentLocation, portfolio: s.form.portfolio,
          major: s.form.major, gpa: s.form.gpa, grad_month: s.form.gradMonth, grad_year: s.form.gradYear,
          education: s.form.school ? [{ institution: s.form.school, degree: s.form.degree, field: s.form.major, grad_month: s.form.gradMonth, grad_year: s.form.gradYear, gpa: s.form.gpa }] : null,
          work_auth: s.form.workAuth, sponsorship: s.form.sponsorship,
          relocate: s.form.relocate, work_mode: s.form.workMode.join(", ") || null, start_date: s.form.startDate,
          gender: s.form.gender, race: s.form.race, veteran: s.form.veteran,
          disability: s.form.disability, pronouns: s.form.pronouns,
          rewrite_level: s.form.rewriteLevel,
        }),
      })

      await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: {
            locations: s.locations,
            seniority: s.seniority,
            salary_floor: s.form.minSalary ? Number(s.form.minSalary) : null,
            desired_salary: s.form.desiredSalary ? Number(s.form.desiredSalary) : null,
            role_keywords: s.keywords,
            internship_cycle: s.form.internshipCycle,
          },
          watchlist: s.companies.map(c => ({ company_name: c.name, careers_url: "" })),
        }),
      })

      try { localStorage.removeItem(STORAGE_KEY) } catch {}
      upd({ showSuccess: true })
    } finally {
      setIsSaving(false)
    }
  }

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const ctaStyle: React.CSSProperties = { background: "#024950", color: "#fff", border: "none", borderRadius: 20, padding: "13px 26px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 700, cursor: "pointer" }
  const backBtnStyle: React.CSSProperties = { background: "#EDF2F1", border: "none", borderRadius: 20, fontFamily: "'Space Grotesk', sans-serif", fontSize: 14, fontWeight: 600, color: "rgba(0,49,53,0.6)", cursor: "pointer", padding: "12px 22px" }
  const cardStyle: React.CSSProperties = { background: "#fff", borderRadius: 14, padding: 32, boxShadow: "0 1px 2px rgba(0,49,53,0.06)" }

  const extractedRows = s.parsed ? [
    { label: "Full Name",    value: s.parsed.fullName        },
    { label: "Email",        value: s.parsed.email           },
    { label: "Phone",        value: s.parsed.phone           },
    { label: "Location",     value: s.parsed.currentLocation },
    { label: "LinkedIn",     value: s.parsed.linkedin        },
    { label: "GitHub",       value: s.parsed.github          },
    { label: "Portfolio",    value: s.parsed.portfolio       },
    { label: "School",       value: s.parsed.school          },
    { label: "Degree",       value: [s.parsed.degree, s.parsed.major].filter(Boolean).join(" — ")  },
    { label: "Grad Date",    value: [s.parsed.gradMonth, s.parsed.gradYear].filter(Boolean).join(" ") },
    { label: "GPA",          value: s.parsed.gpa             },
    { label: "Skills",       value: s.parsed.skills.slice(0, 8).join(", ") },
  ].filter(r => r.value) : []

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />

      <div style={{ minHeight: "100vh", width: "100%", background: "#F5F8F7", fontFamily: "var(--font-space-grotesk,'Space Grotesk',sans-serif)", color: "#003135", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: s.stage !== "form" ? "center" : "flex-start", padding: "48px 24px", position: "relative", overflowX: "hidden", overflowY: "auto" }}>

        {/* Dot grid */}
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "radial-gradient(rgba(0,49,53,0.06) 1px, transparent 1px)", backgroundSize: "26px 26px", WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 20%, #000 40%, transparent 85%)", maskImage: "radial-gradient(ellipse 70% 60% at 50% 20%, #000 40%, transparent 85%)" }} />

        {/* Decorative orbs */}
        <div style={{ position: "absolute", top: -220, right: -180, width: 520, height: 520, borderRadius: "50%", background: "radial-gradient(circle, rgba(150,71,52,0.16) 0%, rgba(150,71,52,0) 70%)", pointerEvents: "none", filter: "blur(2px)" }} />
        <div style={{ position: "absolute", bottom: -260, left: -200, width: 560, height: 560, borderRadius: "50%", background: "radial-gradient(circle, rgba(2,73,80,0.14) 0%, rgba(2,73,80,0) 70%)", pointerEvents: "none", filter: "blur(2px)" }} />
        <div style={{ position: "absolute", top: 120, left: "6%", width: 120, height: 120, border: "1px solid rgba(0,49,53,0.08)", borderRadius: 16, transform: "rotate(18deg)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 80, right: "8%", width: 90, height: 90, border: "1px solid rgba(150,71,52,0.18)", borderRadius: "50%", pointerEvents: "none" }} />

        <div style={{ width: "100%", maxWidth: 780, position: "relative", zIndex: 1 }}>

          {/* ── Stage: Upload ── */}
          {s.stage === "upload" && (
            <div style={{ ...cardStyle, padding: 48, textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(150,71,52,0.12)", color: "#964734", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 22px" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 15V3m0 0L8 7m4-4 4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M3 17v1a3 3 0 003 3h12a3 3 0 003-3v-1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
              </div>
              <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 8px" }}>Upload your resume</h1>
              <p style={{ fontSize: 14, color: "rgba(0,49,53,0.55)", margin: "0 0 28px", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
                We'll pull your details automatically so you can skip the typing. You can review and edit everything after.
              </p>
              <label style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "22px 40px", borderRadius: 10, border: "2px dashed rgba(150,71,52,0.32)", background: "rgba(150,71,52,0.06)", cursor: "pointer" }}>
                <input type="file" accept=".pdf,.doc,.docx" onChange={onFileSelected} style={{ display: "none" }} />
                <span style={{ fontSize: 14, fontWeight: 700, color: "#964734" }}>Choose file</span>
                <span style={{ fontSize: 12, color: "rgba(0,49,53,0.45)" }}>PDF, DOC, or DOCX — max 8 MB</span>
              </label>
              {(s.uploadError || s.extractError) && (
                <p style={{ margin: "14px 0 0", fontSize: 13, fontWeight: 600, color: "#964734" }}>
                  {s.uploadError ?? s.extractError}
                </p>
              )}
              <p onClick={() => upd({ stage: "form" })} style={{ margin: "24px 0 0", fontSize: 13, fontWeight: 600, color: "rgba(0,49,53,0.45)", cursor: "pointer" }}>
                Skip for now, I'll enter details manually
              </p>
            </div>
          )}

          {/* ── Stage: Extracting ── */}
          {s.stage === "extracting" && (() => {
            const allDone = parseStep >= PARSE_STEPS.length
            const pct = allDone ? 100 : Math.round(((parseStep + 1) / PARSE_STEPS.length) * 100)
            return (
              <div style={{ ...cardStyle, padding: "52px 40px", textAlign: "center" }}>

                {/* ── Logo as loader ── */}
                <div style={{ position: "relative", width: 88, height: 88, margin: "0 auto 32px" }}>
                  {/* Ambient glow behind logo */}
                  <div style={{
                    position: "absolute", inset: -18, borderRadius: "50%",
                    background: `radial-gradient(ellipse at center, rgba(15,164,175,${allDone ? "0.18" : "0.1"}) 0%, transparent 70%)`,
                    transition: "background 0.5s ease",
                    pointerEvents: "none",
                  }} />
                  <svg viewBox="0 0 100 100" width={88} height={88} style={{ position: "relative", zIndex: 1 }}>
                    {/* Outer diamond track */}
                    <path d="M50 6 L94 50 L50 94 L6 50 Z" fill="none" stroke="rgba(0,49,53,0.07)" strokeWidth="6" strokeLinejoin="round" />
                    {/* Outer diamond — arc chasing during load, full solid on done */}
                    {allDone ? (
                      <path
                        d="M50 6 L94 50 L50 94 L6 50 Z"
                        fill="none" stroke="#0FA4AF" strokeWidth="6" strokeLinejoin="round"
                        style={{ strokeDasharray: 249, strokeDashoffset: 249, animation: "ob-logo-done 0.5s cubic-bezier(0.16,1,0.3,1) forwards" }}
                      />
                    ) : (
                      <path
                        d="M50 6 L94 50 L50 94 L6 50 Z"
                        fill="none" stroke="#0FA4AF" strokeWidth="6" strokeLinejoin="round" strokeLinecap="round"
                        style={{ strokeDasharray: "62 187", animation: "ob-logo-arc 1.5s linear infinite" }}
                      />
                    )}
                    {/* Inner diamond — pulses while loading, stays bright on done */}
                    <path
                      d="M50 26 L74 50 L50 74 L26 50 Z"
                      fill="none"
                      stroke={allDone ? "#0FA4AF" : "rgba(15,164,175,0.35)"}
                      strokeWidth="5" strokeLinejoin="round"
                      style={{
                        animation: allDone ? "none" : "ob-inner-pulse 2s ease-in-out infinite",
                        opacity: allDone ? 0.85 : undefined,
                        transition: "stroke 0.4s ease, opacity 0.4s ease",
                      }}
                    />
                    {/* Center square */}
                    <rect
                      x="42" y="42" width="16" height="16" rx="5"
                      fill={allDone ? "#964734" : "#964734"}
                      transform="rotate(45 50 50)"
                      style={{ animation: "ob-center-pulse 2s ease-in-out infinite" }}
                    />
                  </svg>
                </div>

                <h1 style={{ fontSize: 17, fontWeight: 700, margin: "0 0 5px", color: "#003135", letterSpacing: "-0.01em" }}>
                  {allDone ? "Done" : "Reading your resume"}
                </h1>
                <p style={{ fontSize: 11, color: "rgba(0,49,53,0.38)", margin: "0 0 30px", fontWeight: 500, letterSpacing: "0.01em" }}>
                  {s.resumeFileName}
                </p>

                {/* Step list */}
                <div style={{ display: "flex", flexDirection: "column", gap: 9, maxWidth: 272, margin: "0 auto 26px", textAlign: "left" }}>
                  {PARSE_STEPS.map((label, i) => {
                    const done   = i < parseStep
                    const active = i === parseStep && !allDone
                    const visible = i <= parseStep
                    return (
                      <div key={i} style={{
                        display: "flex", alignItems: "center", gap: 10,
                        opacity: !visible ? 0.22 : 1,
                        transition: "opacity 0.45s ease",
                        animation: active ? "ob-parse-fadein 0.35s ease" : "none",
                      }}>
                        <div style={{
                          width: 19, height: 19, borderRadius: "50%", flexShrink: 0,
                          background: done ? "rgba(15,164,175,0.14)" : active ? "rgba(2,73,80,0.08)" : "rgba(0,49,53,0.04)",
                          border: `1.5px solid ${done ? "rgba(15,164,175,0.38)" : active ? "rgba(2,73,80,0.22)" : "rgba(0,49,53,0.1)"}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.35s cubic-bezier(0.16,1,0.3,1)",
                        }}>
                          {done ? (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" style={{ animation: "ob-parse-fadein 0.25s ease" }}>
                              <path d="M5 13l4 4L19 7" stroke="#0FA4AF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          ) : active ? (
                            <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#024950", animation: "ob-parse-dot 1.2s ease-in-out infinite" }} />
                          ) : (
                            <div style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(0,49,53,0.18)" }} />
                          )}
                        </div>
                        <span style={{
                          fontSize: 12, fontWeight: done ? 600 : active ? 700 : 500,
                          color: done ? "#0FA4AF" : active ? "#003135" : "rgba(0,49,53,0.28)",
                          transition: "color 0.35s ease",
                          letterSpacing: "-0.005em",
                        }}>
                          {label}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Progress bar */}
                <div style={{ width: "100%", maxWidth: 272, margin: "0 auto", height: 2, borderRadius: 4, background: "rgba(0,49,53,0.07)", overflow: "hidden" }}>
                  <div
                    className={pct < 100 ? "ob-parse-shimmer" : ""}
                    style={{
                      height: "100%", borderRadius: 4,
                      width: `${pct}%`,
                      transition: "width 0.65s cubic-bezier(0.16,1,0.3,1)",
                      background: pct === 100 ? "#0FA4AF" : undefined,
                    }}
                  />
                </div>
              </div>
            )
          })()}

          {/* ── Stage: Review extracted ── */}
          {s.stage === "review" && (
            <div style={{ ...cardStyle, padding: 36 }}>
              <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>Here's what we found</h1>
              <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 24px" }}>
                Extracted from <strong style={{ color: "#003135" }}>{s.resumeFileName}</strong> — you can edit everything on the next screen
              </p>
              {extractedRows.length === 0 ? (
                <p style={{ fontSize: 14, color: "rgba(0,49,53,0.5)", marginBottom: 24 }}>
                  Couldn't extract structured data — you can fill in your details manually.
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 28 }}>
                  {extractedRows.map((row, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 16, padding: "12px 16px", background: i % 2 === 0 ? "#F5F8F7" : "transparent", borderRadius: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(0,49,53,0.42)", flexShrink: 0, width: 100 }}>{row.label}</span>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "#003135", wordBreak: "break-word" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              )}
              {s.parsed?.workHistory && s.parsed.workHistory.length > 0 && (
                <div style={{ marginBottom: 16, padding: "12px 16px", background: "rgba(15,164,175,0.06)", borderRadius: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(0,49,53,0.42)", margin: "0 0 8px" }}>Work history</p>
                  {s.parsed.workHistory.map((job, i) => (
                    <p key={i} style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#003135" }}>
                      {job.title}{job.employer ? ` · ${job.employer}` : ""}{job.startDate ? ` (${job.startDate}${job.endDate ? ` – ${job.endDate}` : ""})` : ""}
                    </p>
                  ))}
                </div>
              )}
              {s.parsed?.projects && s.parsed.projects.length > 0 && (
                <div style={{ marginBottom: 24, padding: "12px 16px", background: "rgba(150,71,52,0.05)", borderRadius: 8 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "rgba(0,49,53,0.42)", margin: "0 0 8px" }}>Projects</p>
                  {s.parsed.projects.map((proj, i) => (
                    <p key={i} style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, color: "#003135" }}>
                      {proj.title}{proj.startDate ? ` (${proj.startDate}${proj.endDate ? ` – ${proj.endDate}` : ""})` : ""}
                    </p>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span onClick={() => upd({ stage: "upload", parsed: null })} style={{ fontSize: 13, fontWeight: 600, color: "rgba(0,49,53,0.45)", cursor: "pointer" }}>Start over</span>
                <button onClick={confirmExtracted} style={ctaStyle}>Looks good, continue →</button>
              </div>
            </div>
          )}

          {/* ── Stage: Form ── */}
          {s.stage === "form" && !s.showSuccess && (
            <>
              {/* Header */}
              <div style={{ textAlign: "center", marginBottom: 28 }}>
                <h1 style={{ fontSize: 26, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.01em" }}>Set up your profile</h1>
                <p style={{ fontSize: 14, color: "rgba(0,49,53,0.55)", margin: 0 }}>Configure the agent before it starts applying on your behalf</p>
              </div>

              {/* Tab bar */}
              <div style={{ display: "flex", gap: 8, marginBottom: 22, flexWrap: "wrap" }}>
                {TAB_LABELS.map((label, i) => {
                  const done = i < s.step; const active = i === s.step
                  return (
                    <div key={i} onClick={() => upd({ step: i })} style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 14px", borderRadius: 10, flex: 1, minWidth: 100, background: done ? "rgba(150,71,52,0.14)" : active ? "rgba(150,71,52,0.08)" : "#EDF2F1", color: done ? "#964734" : active ? "#7a3a29" : "rgba(0,49,53,0.55)", fontWeight: done ? 700 : 600, cursor: "pointer", fontSize: 13 }}>
                      {label}
                    </div>
                  )
                })}
              </div>

              {/* Form card */}
              <div style={cardStyle}>

                {/* ── Step 0: Personal ── */}
                {s.step === 0 && (
                  <div>
                    <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Personal info</h2>
                    <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 24px" }}>Used by the agent to fill ATS forms</p>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                      <div><Label>Full name</Label><input className="ob-input" type="text" placeholder="Full name" value={s.form.fullName} onChange={e => updForm("fullName", e.target.value)} /></div>
                      <div>
                        <Label>Email</Label>
                        <input className="ob-input" type="email" placeholder="you@example.com" value={s.form.email} onChange={e => { updForm("email", e.target.value); upd({ emailError: false }) }} style={s.emailError ? { borderColor: "#964734" } : {}} />
                        {s.emailError && <p style={{ fontSize: 12, color: "#964734", margin: "6px 0 0" }}>Enter a valid email</p>}
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                      <div><Label>Phone</Label><input className="ob-input" type="text" placeholder="+1 (555) 000-0000" value={s.form.phone} onChange={e => updForm("phone", e.target.value)} /></div>
                      <div><Label>Current location</Label><input className="ob-input" type="text" placeholder="Tampa, FL" value={s.form.currentLocation} onChange={e => updForm("currentLocation", e.target.value)} /></div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                      <div><Label>LinkedIn URL</Label><input className="ob-input" type="text" placeholder="linkedin.com/in/…" value={s.form.linkedin} onChange={e => updForm("linkedin", e.target.value)} /></div>
                      <div><Label>GitHub URL</Label><input className="ob-input" type="text" placeholder="github.com/…" value={s.form.github} onChange={e => updForm("github", e.target.value)} /></div>
                    </div>

                    <div style={{ marginBottom: 20 }}>
                      <Label>Portfolio / personal website</Label>
                      <input className="ob-input" type="text" placeholder="yoursite.com" value={s.form.portfolio} onChange={e => updForm("portfolio", e.target.value)} />
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                      <div><Label>School</Label><input className="ob-input" type="text" placeholder="University of…" value={s.form.school} onChange={e => updForm("school", e.target.value)} /></div>
                      <div><Label>Major / field of study</Label><input className="ob-input" type="text" placeholder="Computer Science" value={s.form.major} onChange={e => updForm("major", e.target.value)} /></div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 20, marginBottom: 20 }}>
                      <div><Label>Degree</Label><input className="ob-input" type="text" placeholder="B.S." value={s.form.degree} onChange={e => updForm("degree", e.target.value)} /></div>
                      <div><Label>GPA</Label><input className="ob-input" type="text" placeholder="3.8" value={s.form.gpa} onChange={e => updForm("gpa", e.target.value)} /></div>
                      <div><Label>Grad month</Label><input className="ob-input" type="text" placeholder="May" value={s.form.gradMonth} onChange={e => updForm("gradMonth", e.target.value)} /></div>
                      <div><Label>Grad year</Label><input className="ob-input" type="text" placeholder="2027" value={s.form.gradYear} onChange={e => updForm("gradYear", e.target.value)} /></div>
                    </div>

                    <div>
                      <Label>Skills</Label>
                      {s.skills.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                          {s.skills.map((sk, i) => <Chip key={i} label={sk} onRemove={() => removeSkill(i)} />)}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 10 }}>
                        <input className="ob-input" type="text" placeholder="Add skill, press Enter" value={s.skillInput} onChange={e => upd({ skillInput: e.target.value })} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addSkill() } }} />
                        <PlusBtn onClick={addSkill} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 1: Work Auth ── */}
                {s.step === 1 && (
                  <div>
                    <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Work authorization</h2>
                    <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 24px" }}>Asked on nearly every application — answer once, reuse everywhere</p>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Are you legally authorized to work in the US?</Label>
                      <div style={{ display: "flex", gap: 10 }}>
                        {YES_NO.map(o => <Pill key={o} label={o} selected={s.form.workAuth === o} onClick={() => toggleForm("workAuth", o)} />)}
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Will you now or in the future require visa sponsorship?</Label>
                      <div style={{ display: "flex", gap: 10 }}>
                        {YES_NO.map(o => <Pill key={o} label={o} selected={s.form.sponsorship === o} onClick={() => toggleForm("sponsorship", o)} />)}
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Willing to relocate?</Label>
                      <div style={{ display: "flex", gap: 10 }}>
                        {YES_NO.map(o => <Pill key={o} label={o} selected={s.form.relocate === o} onClick={() => toggleForm("relocate", o)} />)}
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Work mode preference</Label>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {WORK_MODE_OPTIONS.map(o => <Pill key={o} label={o} selected={s.form.workMode.includes(o)} onClick={() => setS(p => ({ ...p, form: { ...p.form, workMode: p.form.workMode.includes(o) ? p.form.workMode.filter(m => m !== o) : [...p.form.workMode, o] } }))} />)}
                      </div>
                    </div>

                    <div>
                      <Label>Available start date</Label>
                      <input className="ob-input" type="text" placeholder="Immediately, or a date" value={s.form.startDate} onChange={e => updForm("startDate", e.target.value)} />
                    </div>
                  </div>
                )}

                {/* ── Step 2: Work History ── */}
                {s.step === 2 && (
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <h2 style={{ fontSize: 19, fontWeight: 700, margin: 0 }}>Work history</h2>
                      <span onClick={addWorkEntry} style={{ fontSize: 13, fontWeight: 600, color: "#024950", cursor: "pointer" }}>+ Add position</span>
                    </div>
                    <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 20px" }}>Structured so the agent can fill multi-row work history sections</p>
                    {s.workHistory.map((job, i) => (
                      <div key={i} style={{ border: "1px solid rgba(0,49,53,0.12)", borderRadius: 10, padding: 18, marginBottom: 14 }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 4 }}>
                          <span onClick={() => removeWorkEntry(i)} style={{ cursor: "pointer", opacity: 0.45, fontSize: 14 }}>Remove</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                          <div><Label>Employer</Label><input className="ob-input" type="text" placeholder="Acme Inc." value={job.employer} onChange={e => updateWork(i, "employer", e.target.value)} /></div>
                          <div><Label>Job title</Label><input className="ob-input" type="text" placeholder="Product Designer" value={job.title} onChange={e => updateWork(i, "title", e.target.value)} /></div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 14 }}>
                          <div><Label>Start date</Label><input className="ob-input" type="text" placeholder="Jun 2022" value={job.startDate} onChange={e => updateWork(i, "startDate", e.target.value)} /></div>
                          <div><Label>End date</Label><input className="ob-input" type="text" placeholder="Present" value={job.endDate} onChange={e => updateWork(i, "endDate", e.target.value)} /></div>
                        </div>
                        <div>
                          <Label>Description</Label>
                          <textarea className="ob-textarea" placeholder="What you did in this role…" value={job.description} onChange={e => updateWork(i, "description", e.target.value)} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ── Step 3: Preferences ── */}
                {s.step === 3 && (
                  <div>
                    <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Job preferences</h2>
                    <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 24px" }}>Controls which jobs the agent pursues</p>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Target state</Label>
                      <div style={{ position: "relative" }}>
                        <select
                          className="ob-select"
                          value={s.selectedState}
                          onChange={e => upd({ selectedState: e.target.value })}
                        >
                          <option value="">Select a state…</option>
                          {Object.keys(STATE_CITIES).sort().map(st => (
                            <option key={st} value={st}>{st}</option>
                          ))}
                        </select>
                      </div>

                      {s.selectedState && (
                        <div style={{ marginTop: 14 }}>
                          <Label>Targeted cities</Label>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                            {STATE_CITIES[s.selectedState]?.map(city => {
                              const tag = `${city}, ${STATE_ABBREV[s.selectedState] ?? s.selectedState}`
                              const selected = s.locations.includes(tag)
                              return (
                                <button
                                  key={city}
                                  type="button"
                                  onClick={() => toggleCity(city, s.selectedState)}
                                  style={{
                                    padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                                    fontFamily: "var(--font-space-grotesk,'Space Grotesk',sans-serif)",
                                    cursor: "pointer", border: "1.5px solid",
                                    borderColor: selected ? "#0FA4AF" : "rgba(0,49,53,0.14)",
                                    background: selected ? "rgba(15,164,175,0.1)" : "#F5F8F7",
                                    color: selected ? "#0FA4AF" : "rgba(0,49,53,0.6)",
                                    transition: "all 0.18s ease",
                                  }}
                                >
                                  {city}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {s.locations.length > 0 && (
                        <div style={{ marginTop: 14 }}>
                          <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,49,53,0.4)", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px" }}>Selected</p>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                            {s.locations.map((loc, i) => <Chip key={i} label={loc} onRemove={() => removeLocation(i)} />)}
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Seniority levels</Label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {SENIORITY_LEVELS.map(o => <Pill key={o} label={o} selected={s.seniority.includes(o)} onClick={() => toggleSeniority(o)} />)}
                      </div>
                    </div>

                    {s.seniority.includes("Internship") && (
                      <div style={{ marginBottom: 24 }}>
                        <Label>Target internship cycle</Label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                          {INTERNSHIP_CYCLES.map(o => <Pill key={o} label={o} selected={s.form.internshipCycle === o} onClick={() => toggleForm("internshipCycle", o)} />)}
                        </div>
                      </div>
                    )}

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 24 }}>
                      <div><Label>Minimum salary (USD/yr)</Label><input className="ob-input" type="text" placeholder="80000" value={s.form.minSalary} onChange={e => updForm("minSalary", e.target.value)} /></div>
                      <div><Label>Desired salary (USD/yr)</Label><input className="ob-input" type="text" placeholder="110000" value={s.form.desiredSalary} onChange={e => updForm("desiredSalary", e.target.value)} /></div>
                    </div>

                    <div>
                      <Label>Role keywords</Label>
                      {s.keywords.length > 0 && (
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
                          {s.keywords.map((kw, i) => <Chip key={i} label={kw} onRemove={() => removeKeyword(i)} />)}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 10 }}>
                        <input className="ob-input" type="text" placeholder="Software Engineer, SWE, Backend" value={s.keywordInput} onChange={e => upd({ keywordInput: e.target.value })} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addKeyword() } }} />
                        <PlusBtn onClick={addKeyword} />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Step 4: Watchlist ── */}
                {s.step === 4 && (
                  <div>
                    <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Company watchlist</h2>
                    <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 24px" }}>Agent checks these companies every run — pick from popular lists or type your own</p>

                    {/* Category picker */}
                    <div style={{ marginBottom: 20 }}>
                      <Label>Industry</Label>
                      <select
                        className="ob-select"
                        value={s.selectedCategory}
                        onChange={e => upd({ selectedCategory: e.target.value })}
                      >
                        <option value="">Select an industry…</option>
                        {Object.keys(COMPANY_CATEGORIES).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    {/* Company pills for selected category */}
                    {s.selectedCategory && (
                      <div style={{ marginBottom: 20 }}>
                        <Label>Popular companies</Label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                          {COMPANY_CATEGORIES[s.selectedCategory]?.map(name => {
                            const selected = s.companies.some(c => c.name === name)
                            return (
                              <button
                                key={name}
                                type="button"
                                onClick={() => toggleCompany(name)}
                                style={{
                                  padding: "7px 14px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                                  fontFamily: "var(--font-space-grotesk,'Space Grotesk',sans-serif)",
                                  cursor: "pointer", border: "1.5px solid",
                                  borderColor: selected ? "#0FA4AF" : "rgba(0,49,53,0.14)",
                                  background: selected ? "rgba(15,164,175,0.1)" : "#F5F8F7",
                                  color: selected ? "#0FA4AF" : "rgba(0,49,53,0.6)",
                                  transition: "all 0.18s ease",
                                }}
                              >
                                {name}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Manual add */}
                    <div style={{ marginBottom: 20 }}>
                      <Label>Add a company manually</Label>
                      <div style={{ display: "flex", gap: 10 }}>
                        <input
                          className="ob-input"
                          type="text"
                          placeholder="e.g. Stripe"
                          value={s.companyName}
                          onChange={e => upd({ companyName: e.target.value })}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addCompany() } }}
                        />
                        <PlusBtn onClick={addCompany} />
                      </div>
                    </div>

                    {/* Selected companies */}
                    {s.companies.length > 0 ? (
                      <div style={{ marginTop: 4 }}>
                        <p style={{ fontSize: 11, fontWeight: 600, color: "rgba(0,49,53,0.4)", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px" }}>
                          Watchlist ({s.companies.length})
                        </p>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                          {s.companies.map((co, i) => (
                            <Chip key={i} label={co.name} onRemove={() => removeCompany(i)} />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p style={{ textAlign: "center", fontSize: 13, color: "rgba(0,49,53,0.4)", margin: "8px 0 0" }}>No companies added yet — you can skip this and add later in Settings</p>
                    )}
                  </div>
                )}

                {/* ── Step 5: Demographics ── */}
                {s.step === 5 && (
                  <div>
                    <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>Demographic info</h2>
                    <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 24px" }}>Required by law on most Greenhouse/Lever forms — answering is always voluntary and never affects scoring</p>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Gender</Label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {GENDER_OPTIONS.map(o => <Pill key={o} label={o} selected={s.form.gender === o} onClick={() => toggleForm("gender", o)} />)}
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Race / ethnicity</Label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {RACE_OPTIONS.map(o => <Pill key={o} label={o} selected={s.form.race === o} onClick={() => toggleForm("race", o)} />)}
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Veteran status</Label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {VETERAN_OPTIONS.map(o => <Pill key={o} label={o} selected={s.form.veteran === o} onClick={() => toggleForm("veteran", o)} />)}
                      </div>
                    </div>

                    <div style={{ marginBottom: 24 }}>
                      <Label>Disability status</Label>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                        {DISABILITY_OPTIONS.map(o => <Pill key={o} label={o} selected={s.form.disability === o} onClick={() => toggleForm("disability", o)} />)}
                      </div>
                    </div>

                    <div>
                      <Label>Pronouns</Label>
                      <input className="ob-input" type="text" placeholder="she/her, he/him, they/them…" value={s.form.pronouns} onChange={e => updForm("pronouns", e.target.value)} />
                    </div>
                  </div>
                )}

                {/* ── Step 6: AI Settings ── */}
                {s.step === 6 && (
                  <div>
                    <h2 style={{ fontSize: 19, fontWeight: 700, margin: "0 0 4px" }}>AI rewrite settings</h2>
                    <p style={{ fontSize: 13, color: "rgba(0,49,53,0.5)", margin: "0 0 28px" }}>How aggressively should Invictus rewrite your resume and cover letter for each job?</p>

                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      {([
                        { value: "minimal",    label: "Minimal",    desc: "Keep your exact wording — only insert missing keywords and fill gaps" },
                        { value: "balanced",   label: "Balanced",   desc: "Tailor bullet emphasis and keyword density while preserving your voice" },
                        { value: "aggressive", label: "Aggressive", desc: "Fully rewrite each section to match the job description as closely as possible" },
                      ] as const).map(opt => {
                        const active = s.form.rewriteLevel === opt.value
                        return (
                          <div
                            key={opt.value}
                            onClick={() => updForm("rewriteLevel", opt.value)}
                            style={{
                              border: `1.5px solid ${active ? "#0FA4AF" : "rgba(0,49,53,0.12)"}`,
                              borderRadius: 12,
                              padding: "16px 18px",
                              cursor: "pointer",
                              background: active ? "rgba(15,164,175,0.06)" : "#F5F8F7",
                              display: "flex", alignItems: "flex-start", gap: 14,
                              transition: "border-color 0.2s, background 0.2s",
                            }}
                          >
                            <div style={{
                              width: 18, height: 18, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                              border: `2px solid ${active ? "#0FA4AF" : "rgba(0,49,53,0.25)"}`,
                              background: active ? "#0FA4AF" : "transparent",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff" }} />}
                            </div>
                            <div>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "#003135" }}>{opt.label}</p>
                              <p style={{ margin: "3px 0 0", fontSize: 12, color: "rgba(0,49,53,0.55)", lineHeight: 1.5 }}>{opt.desc}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

              </div>

              {/* Nav row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 24 }}>
                {s.step > 0 ? <button onClick={goBack} style={backBtnStyle}>← Back</button> : <span />}
                <button onClick={goNext} disabled={isSaving} style={{ ...ctaStyle, opacity: isSaving ? 0.7 : 1 }}>
                  {isSaving ? "Saving…" : s.step === 6 ? "Finish setup →" : "Next →"}
                </button>
              </div>

              {(s.step >= 4) && (
                <p style={{ textAlign: "center", fontSize: 12, color: "rgba(0,49,53,0.4)", margin: "16px 0 0" }}>
                  All fields optional — you can update everything later in Settings
                </p>
              )}
            </>
          )}

          {/* ── Success ── */}
          {s.showSuccess && (
            <div style={{ ...cardStyle, padding: 40 }}>
              <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#024950", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 24, color: "#fff", fontSize: 20 }}>✓</div>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 10px" }}>You're all set</h1>
              <p style={{ fontSize: 14, lineHeight: 1.6, color: "rgba(0,49,53,0.55)", margin: "0 0 28px" }}>Your profile is ready. You can update any of this later in Settings.</p>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button onClick={() => { try { localStorage.removeItem(STORAGE_KEY) } catch {}; upd({ ...INITIAL_STATE }) }} style={backBtnStyle}>Start over</button>
                <button onClick={() => router.push("/activating")} style={ctaStyle}>Go to dashboard →</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}
