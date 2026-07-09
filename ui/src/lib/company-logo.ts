// Maps a company name to its website domain for logo lookup.
// Irregular names are mapped explicitly; everything else guesses
// "<name-stripped>.com", which covers most brands (apple.com, stripe.com…).
const DOMAIN_OVERRIDES: Record<string, string> = {
  "mckinsey & company": "mckinsey.com",
  "boston consulting group": "bcg.com",
  "bain & company": "bain.com",
  "the home depot": "homedepot.com",
  "warner bros. discovery": "wbd.com",
  "u.s. department of defense": "defense.gov",
  "cia": "cia.gov",
  "nsa": "nsa.gov",
  "fbi": "fbi.gov",
  "u.s. army": "army.mil",
  "u.s. navy": "navy.mil",
  "u.s. air force": "af.mil",
  "dhs": "dhs.gov",
  "darpa": "darpa.mil",
  "doe": "energy.gov",
  "state department": "state.gov",
  "nasa": "nasa.gov",
  "mit": "mit.edu",
  "stanford university": "stanford.edu",
  "harvard university": "harvard.edu",
  "carnegie mellon": "cmu.edu",
  "georgia tech": "gatech.edu",
  "johnson & johnson": "jnj.com",
  "abbott laboratories": "abbott.com",
  "mayo clinic": "mayoclinic.org",
  "kaiser permanente": "kaiserpermanente.org",
  "gilead sciences": "gilead.com",
  "genentech": "gene.com",
  "booz allen hamilton": "boozallen.com",
  "charles schwab": "schwab.com",
  "moody's": "moodys.com",
  "electronic arts": "ea.com",
  "take-two interactive": "take2games.com",
  "raytheon technologies": "rtx.com",
  "general dynamics": "gd.com",
  "general motors": "gm.com",
  "mercedes-benz": "mercedes-benz.com",
  "aurora innovation": "aurora.tech",
  "notion": "notion.so",
  "linear": "linear.app",
  "scale ai": "scale.com",
  "at&t": "att.com",
  "t-mobile": "t-mobile.com",
  "charter communications": "charter.com",
  "lumen technologies": "lumen.com",
  "khan academy": "khanacademy.org",
  "schlumberger": "slb.com",
  "duke energy": "duke-energy.com",
  "enphase energy": "enphase.com",
  "netflix": "netflix.com",
}

export function companyDomain(name: string): string | null {
  const key = name.trim().toLowerCase()
  if (!key) return null
  if (DOMAIN_OVERRIDES[key]) return DOMAIN_OVERRIDES[key]
  const stripped = key.replace(/[^a-z0-9]/g, "")
  if (!stripped) return null
  return `${stripped}.com`
}

export function companyLogoUrl(name: string): string | null {
  const domain = companyDomain(name)
  return domain ? `https://logo.clearbit.com/${domain}` : null
}
