// Scraped location strings are wildly inconsistent ("SF", "San Francisco,
// CA", "Remote - US", "NYC (hybrid)"), so the Location filter matches by
// normalized substring + known-abbreviation aliases instead of exact string
// equality — selecting "San Francisco, CA" should catch all of them.

// Short abbreviations need word-boundary matching ("SF" must not match
// "Jobs FSF Team"); full names are safe as plain substrings.
const CITY_ALIASES: Record<string, string[]> = {
  "san francisco": ["sf", "bay area", "south san francisco"],
  "new york": ["nyc", "new york city"],
  "los angeles": ["la"],
  "washington": ["dc", "d.c."],
  "seattle": ["sea"],
  "austin": [],
  "boston": [],
  "chicago": [],
  "denver": [],
  "remote": ["work from home", "wfh", "anywhere"],
}

function hasWord(haystack: string, word: string): boolean {
  return new RegExp(`(^|[^a-z])${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z]|$)`, "i").test(haystack)
}

export function locationMatches(jobLocation: string | null | undefined, selected: string): boolean {
  if (!jobLocation) return false
  const loc = jobLocation.toLowerCase()
  // "San Francisco, CA" → primary term "san francisco"
  const primary = selected.split(",")[0].trim().toLowerCase()
  if (loc.includes(primary)) return true
  for (const alias of CITY_ALIASES[primary] ?? []) {
    if (alias.length <= 3 ? hasWord(loc, alias) : loc.includes(alias)) return true
  }
  return false
}
