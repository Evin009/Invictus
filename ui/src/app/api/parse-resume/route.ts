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
    const result = await parser.getText({ cellSeparator: "\n" })
    // Normalize middle-dot separators and collapse excessive blank lines
    return result.text
      .replace(/ [·•‧] /g, "\n")   // · • ‧ used as cell separators
      .replace(/\t/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
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

  // School: line with university/college/institute — strip dates and anything after them
  for (const line of slice) {
    if (/university|college|institute|polytechnic|academy|school of/i.test(line) && !school) {
      school = line
        .replace(/[|\-–—].*/g, "")
        .replace(/\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*[.,]?\s+(?:20|19)\d{2}.*/gi, "")
        .replace(/\s+(?:20|19)\d{2}.*/g, "")
        .trim()
    }
  }

  // Degree
  const degreeRe = /\b(B\.?S\.?|B\.?A\.?|M\.?S\.?|M\.?A\.?|Ph\.?D\.?|bachelor(?:'s)?|master(?:'s)?|associate(?:'s)?|doctor)(?![a-zA-Z])/i
  for (const line of slice) {
    const dm = line.match(degreeRe)
    if (dm && !degree) {
      const short = dm[1].toUpperCase().replace(/['"']/g, "").replace("BACHELOR", "B.S.").replace("MASTER", "M.S.").replace("ASSOCIATE", "A.S.").replace("DOCTOR", "Ph.D.")
      degree = short.length <= 5 ? short : dm[1].charAt(0).toUpperCase() + dm[1].slice(1).toLowerCase()

      // Extract major from same line — strip GPA, dates, city/state first
      const afterDegree = line.replace(degreeRe, "").replace(/^[\s,in]+/i, "").trim()
      const cleanedForMajor = afterDegree
        .replace(/\bGPA[:\s]+[\d.\/]+/gi, "")
        .replace(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s+(?:20|19)\d{2}\b.*/gi, "")
        .replace(/[–—]\s*(?:Present|\w+\s+\d{4}).*/g, "")
        .replace(/,\s*[A-Z]{2}\b.*/g, "")
        .replace(/[,|;].*/g, "")
        .replace(/\s+/g, " ")
        .trim()
      if (cleanedForMajor && cleanedForMajor.length > 1 && cleanedForMajor.length < 80) {
        major = cleanedForMajor
      }
    }
  }

  // GPA
  const gpaM = text.match(/GPA[:\s]+(\d+(?:\.\d+)?)/i)
  if (gpaM) gpa = gpaM[1]

  // Grad date — pick the END of a date range (graduation), not the start (enrollment)
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    "January", "February", "March", "April", "June", "July", "August", "September", "October", "November", "December"]
  const monthPattern = months.join("|")
  const dateRe = new RegExp(`(${monthPattern})[.,]?\\s*(20\\d{2}|19\\d{2})`, "i")
  // Matches "Month Year – Month Year" — capture group 3+4 is the END date
  const rangeRe = new RegExp(
    `(?:${monthPattern})[.,]?\\s*(?:20|19)\\d{2}\\s*[–—\\-]\\s*(${monthPattern})[.,]?\\s*(20\\d{2}|19\\d{2})`,
    "i"
  )

  let foundDegreeIdx = -1
  for (let i = 0; i < slice.length; i++) {
    if (degreeRe.test(slice[i]) || /expected|graduating|graduation|grad/i.test(slice[i])) {
      foundDegreeIdx = i; break
    }
  }
  const dateSearchSlice = foundDegreeIdx >= 0 ? slice.slice(Math.max(0, foundDegreeIdx - 2), foundDegreeIdx + 4) : slice

  // Prefer explicit "Expected Month Year" first
  for (const line of dateSearchSlice) {
    const expM = line.match(new RegExp(`[Ee]xpected\\s+(${monthPattern})[.,]?\\s*(20\\d{2}|19\\d{2})`, "i"))
    if (expM) { gradMonth = expM[1].slice(0, 3); gradYear = expM[2]; break }
  }

  // Next: try to find end of a date range (e.g. "Aug 2022 – May 2026")
  if (!gradYear) {
    for (const line of dateSearchSlice) {
      const rm = line.match(rangeRe)
      if (rm) { gradMonth = rm[1].slice(0, 3); gradYear = rm[2]; break }
    }
  }

  // Fallback: last date found in search slice (end date appears later in text than start)
  if (!gradYear) {
    let lastMonth = "", lastYear = ""
    for (const line of dateSearchSlice) {
      const allDates = [...line.matchAll(new RegExp(dateRe.source, "gi"))]
      if (allDates.length > 0) {
        const last = allDates[allDates.length - 1]
        lastMonth = last[1]
        lastYear = last[2]
      }
    }
    if (lastYear) { gradMonth = lastMonth.slice(0, 3); gradYear = lastYear }
  }

  // Fallback: just find a year in the edu section
  if (!gradYear) {
    const allYears: string[] = []
    for (const line of slice.slice(0, 10)) {
      const ym = line.match(/(?:20|19)(\d{2})/g)
      if (ym) allYears.push(...ym)
    }
    if (allYears.length > 0) gradYear = allYears[allYears.length - 1]
  }

  return { school, degree, major, gpa, gradMonth, gradYear }
}

function parseSkills(text: string): string[] {
  // Step 1: find skills section header line index
  const lines = text.split("\n")
  let sectionLine = -1
  const skillHeaderRe = /^(technical\s+skills?|skills?|core\s+competencies|technologies|tech\s+stack|tools(?:\s*[&\/]\s*technologies)?|expertise|proficiencies?)\s*:?\s*$/i
  for (let i = 0; i < lines.length; i++) {
    if (skillHeaderRe.test(lines[i].trim())) { sectionLine = i; break }
  }
  if (sectionLine < 0) return []

  // Step 2: collect lines until we hit a clear non-skills section header
  // Only stop on these — do NOT stop on Languages/Frameworks/Tools (those are skill categories)
  const hardStopRe = /^(experience|work\s+experience|professional\s+experience|employment(?:\s+history)?|education|projects?|certifications?|awards?|publications?|volunteer|activities|leadership|honors?|references?|summary|objective)\s*:?\s*$/i
  const collected: string[] = []
  for (let i = sectionLine + 1; i < lines.length; i++) {
    const t = lines[i].trim()
    if (hardStopRe.test(t)) break
    collected.push(t)
  }

  const raw = collected.join("\n")

  // Step 3: extract every skill token from collected lines
  const seen   = new Set<string>()
  const skills: string[] = []

  for (const line of collected) {
    if (!line) continue

    // "Category: skill1, skill2" — strip category label, keep values only
    const catMatch = line.match(/^[A-Za-z &\/\-]{2,40}:\s*(.+)/)
    const content  = catMatch ? catMatch[1] : line

    // Split on all common delimiters: comma, pipe, bullet, middle-dot, semicolon, tab
    for (const part of content.split(/[,|•·;\t]+/)) {
      const s = part
        .trim()
        .replace(/^[\-\*\s]+/, "")
        .replace(/[\-\*\s]+$/, "")
        .replace(/\s*\(.*?\)\s*$/, "")  // strip "(proficient)" / "(3 yrs)"
        .trim()
      if (s.length > 1 && s.length < 60 && !/^\d+$/.test(s) && !seen.has(s.toLowerCase())) {
        seen.add(s.toLowerCase())
        skills.push(s)
      }
    }
  }

  // suppress unused variable warning
  void raw
  return skills
}

interface WorkEntry {
  employer: string
  title: string
  startDate: string
  endDate: string
  description: string
}

function parseWorkHistory(text: string): WorkEntry[] {
  const expIdx = text.search(/(?:^|\n)(experience|work experience|employment history|professional experience)[:\s]*\n/i)
  if (expIdx < 0) return []

  const afterExp = text.slice(expIdx)
  const nextSection = afterExp.search(/\n\s*(?:education|skills|technical skills|projects|certifications|awards|publications|volunteer|activities|leadership|honors?|interests|summary|objective)\s*\n/i)
  const section = nextSection > 0 ? afterExp.slice(0, nextSection) : afterExp.slice(0, 6000)

  const dateRe = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[.,]?\s*(?:20|19)\d{2}/gi
  const entries: WorkEntry[] = []
  // Strip leading bullet/dot chars but keep line content
  const lines = section.split("\n").map(l => l.replace(/^[·•\-\*\s]+/, "").trim()).filter(Boolean)

  let current: WorkEntry | null = null
  let employerLineIdx = -1  // tracks line consumed by forward-look so it's not re-added as description

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const dates = line.match(dateRe)

    if (dates && dates.length >= 1) {
      if (current) entries.push(current)

      // Case 1: title embedded in the date line ("Technical Lead  Aug 2025 – May 2026")
      // Strip dates first, then strip anything after a company separator (|, ·, •, /) or remaining dash
      const stripped = line.replace(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[.,]?\s*(?:20|19)\d{2}/gi, "")
      const beforeDates = stripped
        .replace(/\s*[|·•\/]\s*.*/g, "")  // strip company part after common separators
        .replace(/\s*[–—]\s*.*/g, "")      // strip remaining dashes (date range dashes already removed)
        .replace(/[-,]+\s*$/, "")          // trailing punctuation
        .trim()
        .replace(/\s+/g, " ")
      let title = ""
      let employer = ""
      employerLineIdx = -1

      if (beforeDates.length > 2 && beforeDates.length <= 80) {
        // Pre-date text = job title; next non-date line = employer/company
        title = beforeDates
        for (let fwd = i + 1; fwd < Math.min(lines.length, i + 4); fwd++) {
          const next = lines[fwd]
          if (!next || next.match(dateRe)) break
          // Skip bullet-point description lines; company names are short and title-case
          if (next.length <= 80 && !/^(scaled|built|led|managed|developed|designed|created|implemented|improved)/i.test(next)) {
            employer = next
              .replace(/[,|·–—].*/g, "")
              .replace(/\s+(?:Remote|Hybrid|Onsite|On-?site|In-?person)\s*$/i, "")
              .replace(/\s+(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+)?[A-Z]{2}\s*$/, "")
              .replace(/\s+([A-Z][a-z]+)\s*$/, (m, word) =>
                /^(Inc|LLC|Ltd|Corp|Co|Group|Labs?|Technologies|Solutions|Systems|Studios?|Foundation|Institute|University|College|Agency|Partners|Ventures|Capital|Consulting|Services|Software|Digital|Global|International|National|Associates|Alliance|Networks?|Cent(?:er|re))\.?$/i.test(word) ? m : ""
              )
              .trim()
            employerLineIdx = fwd  // mark so main loop skips it
            break
          }
        }
      } else {
        // Case 2: date-only line — title was on a previous line
        for (let back = i - 1; back >= Math.max(0, i - 3); back--) {
          const prev = lines[back]
          if (!prev || /^(experience|work experience|employment|professional experience|education|skills|projects?|certifications?|awards?|leadership|volunteer|activities|honors?|interests|summary|objective)/i.test(prev)) continue
          if (prev.match(dateRe)) continue
          title = prev.replace(/[|,\-–—·].*/g, "").trim()
          break
        }
      }

      current = {
        employer,
        title,
        startDate: dates[0] ?? "",
        endDate: dates[1] ?? "Present",
        description: "",
      }
    } else if (current) {
      if (i === employerLineIdx) continue  // skip — already used as employer name
      // Accumulate ALL bullet lines — skip only all-caps section headers and section dividers
      const isHeader = /^[A-Z\s]{5,}$/.test(line) || /^(experience|education|skills|projects|certifications|awards|leadership|volunteer|activities|honors?|publications?|interests|summary|objective)/i.test(line)
      if (!isHeader && line.length > 3) {
        current.description += (current.description ? "\n" : "") + "• " + line
      }
    }
  }

  if (current) entries.push(current)
  return entries.slice(0, 10)
}

function parseProjects(text: string): WorkEntry[] {
  const projIdx = text.search(/(?:^|\n)(projects?|personal projects?|side projects?|academic projects?|notable projects?)[:\s]*\n/i)
  if (projIdx < 0) return []

  const afterProj = text.slice(projIdx)
  const nextSection = afterProj.search(/\n(?:experience|education|skills|technical skills|certifications|awards|publications|volunteer|activities|interests)\s*\n/i)
  const section = nextSection > 0 ? afterProj.slice(0, nextSection) : afterProj.slice(0, 5000)

  const dateRe = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[.,]?\s*(?:20|19)\d{2}/gi
  const entries: WorkEntry[] = []
  const lines = section.split("\n").map(l => l.replace(/^[·•\-\*\s]+/, "").trim()).filter(Boolean)

  let current: WorkEntry | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (/^(projects?|personal projects?|side projects?|academic projects?)/i.test(line)) continue

    const dates = line.match(dateRe)

    if (dates) {
      if (current) entries.push(current)
      const beforeDates = line.replace(dateRe, "").replace(/[–—\-|·,•]+/g, " ").trim().replace(/\s+/g, " ")
      // title from before dates, or from previous line
      const title = beforeDates.length > 2 && beforeDates.length <= 80
        ? beforeDates
        : (i > 0 ? lines[i - 1].replace(/[|,\-–—·].*/g, "").trim() : "")
      current = {
        employer: "",
        title,
        startDate: dates[0] ?? "",
        endDate: dates[1] ?? "",
        description: "",
      }
    } else {
      // No dates — check if this looks like a new project title
      // (short, starts with capital, not a bullet description)
      const looksLikeTitle = /^[A-Z]/.test(line) && line.length <= 80 && line.split(" ").length <= 8 && !/^[a-z]/.test(line)
      if (looksLikeTitle && (!current || current.description.length > 0)) {
        if (current) entries.push(current)
        current = { employer: "", title: line, startDate: "", endDate: "", description: "" }
      } else if (current) {
        const isHeader = /^[A-Z\s]{5,}$/.test(line)
        if (!isHeader && line.length > 3) {
          current.description += (current.description ? "\n" : "") + "• " + line
        }
      }
    }
  }

  if (current) entries.push(current)
  return entries.slice(0, 10)
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
      projects: parseProjects(text),
    })
  } catch (err) {
    console.error("parse-resume error:", err)
    return NextResponse.json({ error: "Failed to parse resume" }, { status: 500 })
  }
}
