import { NextRequest, NextResponse } from "next/server"

export const runtime = "nodejs"
export const maxDuration = 30

// ── Text extraction ───────────────────────────────────────────────────────────

async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = filename.split(".").pop()?.toLowerCase() ?? ""

  if (ext === "pdf") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { PDFParse } = require("pdf-parse")
    const parser = new PDFParse({ data: new Uint8Array(buffer) })
    const result = await parser.getText()
    return result.text
  }

  if (ext === "doc" || ext === "docx") {
    const mammoth = await import("mammoth")
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  }

  throw new Error("Unsupported file type")
}

// ── Field parsers ─────────────────────────────────────────────────────────────

function parseEmail(text: string): string {
  const m = text.match(/[\w.+\-]+@[\w\-]+\.[\w.]{2,}/i)
  return m ? m[0].toLowerCase() : ""
}

function parsePhone(text: string): string {
  const m = text.match(/(?:\+1[\s.\-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/)
  return m ? m[0] : ""
}

function parseLinkedIn(text: string): string {
  const m = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([\w\-]+)\/?/i)
  return m ? `linkedin.com/in/${m[1]}` : ""
}

function parseGitHub(text: string): string {
  const m = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([\w\-]+)\/?/i)
  return m ? `github.com/${m[1]}` : ""
}

function parsePortfolio(text: string, email: string, linkedin: string, github: string): string {
  const urlRe = /(?:https?:\/\/|www\.)[\w\-]+\.[\w.\-\/]+/gi
  const all = text.match(urlRe) ?? []
  for (const url of all) {
    const clean = url.replace(/^https?:\/\//, "").replace(/^www\./, "").toLowerCase()
    if (clean.includes("linkedin.com") || clean.includes("github.com")) continue
    const emailDomain = email.split("@")[1] ?? ""
    if (emailDomain && clean.includes(emailDomain.split(".")[0])) return clean
    if (clean.includes("portfolio") || clean.includes("personal") || /\.(me|io|dev|co|com|net|xyz)/.test(clean)) {
      return clean
    }
  }
  return ""
}

function parseName(text: string, email: string): string {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)

  for (let i = 0; i < Math.min(6, lines.length); i++) {
    const line = lines[i]
    // Skip lines that look like contact info, headers, or addresses
    if (/[@|\d{3}|http|linkedin|github|resume|curriculum|vitae|objective|summary|education|experience|skills]/i.test(line)) continue
    // Must be 2–4 words, all letter or hyphen, no punctuation except hyphen/period
    const words = line.split(/\s+/)
    if (words.length < 2 || words.length > 4) continue
    if (words.every(w => /^[A-Za-z\-.']+$/.test(w) && w.length > 1)) {
      // Looks like a name
      return line
    }
  }
  return ""
}

function parseLocation(text: string): string {
  // Look for "City, ST" or "City, State" patterns
  const m = text.match(/([A-Z][a-zA-Z\s]+),\s*([A-Z]{2}|[A-Z][a-zA-Z]+)(?:\s|$)/)
  if (m) return m[0].trim()
  return ""
}

interface EducationResult {
  school: string
  degree: string
  major: string
  gpa: string
  gradMonth: string
  gradYear: string
}

function parseEducation(text: string): EducationResult {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean)

  let school = "", degree = "", major = "", gpa = "", gradMonth = "", gradYear = ""

  // Find education section
  const eduIdx = lines.findIndex(l => /^education$/i.test(l) || /^education\s*:/i.test(l))
  const slice = eduIdx >= 0 ? lines.slice(eduIdx, eduIdx + 20) : lines

  // School: line with university/college/institute
  for (const line of slice) {
    if (/university|college|institute|polytechnic|academy|school of/i.test(line) && !school) {
      school = line.replace(/[|\-–—].*/g, "").trim()
    }
  }

  // Degree
  const degreeRe = /\b(B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|Ph\.?D\.?|bachelor(?:'s)?|master(?:'s)?|associate(?:'s)?|doctor)/i
  for (const line of slice) {
    const dm = line.match(degreeRe)
    if (dm && !degree) {
      const short = dm[1].toUpperCase().replace(/['"']/g, "").replace("BACHELOR", "B.S.").replace("MASTER", "M.S.").replace("ASSOCIATE", "A.S.").replace("DOCTOR", "Ph.D.")
      degree = short.length <= 5 ? short : dm[1].charAt(0).toUpperCase() + dm[1].slice(1).toLowerCase()

      // Try to extract major from same line
      const afterDegree = line.replace(degreeRe, "").replace(/^[\s,in]+/i, "").trim()
      if (afterDegree && afterDegree.length < 60) {
        major = afterDegree.replace(/[,|;].*/g, "").trim()
      }
    }
  }

  // GPA
  const gpaM = text.match(/GPA[:\s]+(\d+(?:\.\d+)?)/i)
  if (gpaM) gpa = gpaM[1]

  // Grad date
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    "January", "February", "March", "April", "June", "July", "August", "September", "October", "November", "December"]
  const monthPattern = months.join("|")
  const dateRe = new RegExp(`(${monthPattern})[.,]?\\s*(20\\d{2}|19\\d{2})`, "i")

  // Look near degree or "Expected" keyword
  for (const line of slice) {
    if (/expected|graduating|graduation|grad/i.test(line) || degreeRe.test(line)) {
      const dm = line.match(dateRe)
      if (dm) {
        gradMonth = dm[1].slice(0, 3)
        gradYear = dm[2]
        break
      }
    }
  }

  // Fallback: just find a year in the edu section
  if (!gradYear) {
    for (const line of slice.slice(0, 10)) {
      const ym = line.match(/20(\d{2})/)
      if (ym) { gradYear = "20" + ym[1]; break }
    }
  }

  return { school, degree, major, gpa, gradMonth, gradYear }
}

function parseSkills(text: string): string[] {
  const skillSectionRe = /(?:^|\n)(technical skills?|skills?|core competencies|technologies|tech stack|tools)[:\s]*\n?([\s\S]{1,600}?)(?=\n[A-Z][A-Z\s]{3,}:|\n\n[A-Z]|$)/i
  const m = text.match(skillSectionRe)
  if (!m) return []

  const raw = m[2]
  const skills: string[] = []
  const delimiters = /[,|•·\n\/]+/
  for (const part of raw.split(delimiters)) {
    const s = part.trim().replace(/[\-\*\s]+$/, "").trim()
    if (s.length > 1 && s.length < 40 && !/^\d+$/.test(s)) {
      skills.push(s)
    }
  }
  return skills.slice(0, 20)
}

interface WorkEntry {
  employer: string
  title: string
  startDate: string
  endDate: string
  description: string
}

function parseWorkHistory(text: string): WorkEntry[] {
  const expIdx = text.search(/(?:^|\n)(experience|work experience|employment|professional experience)[:\s]*\n/i)
  if (expIdx < 0) return []

  const afterExp = text.slice(expIdx)
  const nextSection = afterExp.search(/\n(education|skills|projects|certifications|awards|publications)\s*\n/i)
  const section = nextSection > 0 ? afterExp.slice(0, nextSection) : afterExp.slice(0, 2000)

  const dateRe = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[.,]?\s*(?:20|19)\d{2}/gi
  const entries: WorkEntry[] = []
  const lines = section.split("\n").map(l => l.trim()).filter(Boolean)

  let current: WorkEntry | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const dates = line.match(dateRe)

    if (dates && dates.length >= 1) {
      if (current) entries.push(current)
      const title = i > 0 ? lines[i - 1].replace(/[|,\-–—].*/g, "").trim() : ""
      const employer = line.replace(dateRe, "").replace(/[|\-–—,]/g, " ").trim().replace(/\s+/g, " ")
      current = {
        employer: employer.length > 60 ? "" : employer,
        title,
        startDate: dates[0] ?? "",
        endDate: dates[1] ?? "Present",
        description: "",
      }
    } else if (current && !dates && line.length > 20 && /[a-z]/.test(line)) {
      current.description += (current.description ? " " : "") + line
    }
  }

  if (current) entries.push(current)
  return entries.slice(0, 5)
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get("file") as File | null
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const text = await extractText(buffer, file.name)

    const email = parseEmail(text)
    const linkedin = parseLinkedIn(text)
    const github = parseGitHub(text)
    const edu = parseEducation(text)

    return NextResponse.json({
      fullName: parseName(text, email),
      email,
      phone: parsePhone(text),
      currentLocation: parseLocation(text),
      linkedin,
      github,
      portfolio: parsePortfolio(text, email, linkedin, github),
      school: edu.school,
      degree: edu.degree,
      major: edu.major,
      gpa: edu.gpa,
      gradMonth: edu.gradMonth,
      gradYear: edu.gradYear,
      skills: parseSkills(text),
      workHistory: parseWorkHistory(text),
    })
  } catch (err) {
    console.error("parse-resume error:", err)
    return NextResponse.json({ error: "Failed to parse resume" }, { status: 500 })
  }
}
