// The dashboard's "today" window resets at exactly midnight US Eastern
// (America/New_York — handles EST/EDT automatically), not on a rolling 24h
// basis. This is a display window only: jobs_seen rows are never deleted at
// the reset (discovery dedup depends on full history) — they just stop
// counting toward "today".
export function midnightEasternISO(now: Date = new Date()): string {
  // Reinterpret "now" in Eastern wall-clock terms, zero the time, then map
  // that wall-clock midnight back to a real UTC instant.
  const easternWallClock = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }))
  const utcOffsetMs = now.getTime() - easternWallClock.getTime()
  easternWallClock.setHours(0, 0, 0, 0)
  return new Date(easternWallClock.getTime() + utcOffsetMs).toISOString()
}
