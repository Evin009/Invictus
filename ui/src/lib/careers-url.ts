import { companyDomain } from "@/lib/company-logo"

// Real careers URLs for companies whose actual page doesn't follow the
// {domain}/careers pattern — checked by hand, since guessing would land on
// their marketing homepage instead.
const CAREERS_URL_OVERRIDES: Record<string, string> = {
  amazon: "https://www.amazon.jobs",
  meta: "https://www.metacareers.com",
  google: "https://careers.google.com",
  microsoft: "https://careers.microsoft.com",
  apple: "https://www.apple.com/careers",
  netflix: "https://jobs.netflix.com",
  tesla: "https://www.tesla.com/careers",
  spacex: "https://www.spacex.com/careers",
  "blue origin": "https://www.blueorigin.com/careers",
  servicenow: "https://careers.servicenow.com",
  bloomberg: "https://careers.bloomberg.com",
  optiver: "https://optiver.com/working-at-optiver/career-opportunities",
  coinbase: "https://www.coinbase.com/careers",
}

export function careersUrlOverride(name: string): string | null {
  return CAREERS_URL_OVERRIDES[name.trim().toLowerCase()] ?? null
}

// Ordered candidate patterns to try when there's no override — most
// specific/likely first, since the resolver takes the first one that responds.
export function guessCareersUrlCandidates(name: string): string[] {
  const domain = companyDomain(name)
  if (!domain) return []
  return [
    `https://careers.${domain}`,
    `https://${domain}/careers`,
    `https://jobs.${domain}`,
    `https://${domain}/jobs`,
  ]
}
