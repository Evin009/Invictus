// Backend agents tag each job with a technical source ("watchlist", "crawler",
// "greenhouse", "lever", "github") — map those to the three user-facing
// categories so the UI never leaks internal agent/ATS names.
const SOURCE_CATEGORY: Record<string, "Career page" | "Job board" | "GitHub repo"> = {
  watchlist: "Career page",
  crawler: "Career page",
  greenhouse: "Job board",
  lever: "Job board",
  search: "Job board",
  github: "GitHub repo",
}

export function sourceCategory(source: string | null | undefined): string {
  if (!source) return "Discovery"
  return SOURCE_CATEGORY[source.toLowerCase()] ?? "Discovery"
}
