function SkeletonField() {
  return (
    <div className="space-y-2">
      <div className="skeleton h-3 w-32 rounded-md" />
      <div className="skeleton h-9 w-full rounded-md" />
    </div>
  )
}

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-7 w-32 rounded-md" />
        <div className="skeleton h-3 w-64 rounded-md" />
      </div>
      <div className="space-y-10 max-w-2xl">
        {/* Preferences skeleton */}
        <div className="rounded-xl p-6 space-y-4" style={{ border: "1px solid var(--border)" }}>
          <div className="skeleton h-4 w-36 rounded-md" />
          <SkeletonField />
          <SkeletonField />
          <SkeletonField />
          <div className="skeleton h-9 w-32 rounded-md mt-2" />
        </div>
        {/* Watchlist skeleton */}
        <div className="rounded-xl p-6 space-y-4" style={{ border: "1px solid var(--border)" }}>
          <div className="skeleton h-4 w-36 rounded-md" />
          <div className="skeleton h-3 w-64 rounded-md" />
          <div className="rounded-md overflow-hidden" style={{ border: "1px solid var(--border)" }}>
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center justify-between px-4 py-3"
                style={{ borderBottom: i < 2 ? "1px solid var(--border)" : "none" }}
              >
                <div className="space-y-1.5">
                  <div className="skeleton h-3 w-28 rounded-md" />
                  <div className="skeleton h-2.5 w-48 rounded-md" />
                </div>
                <div className="skeleton h-6 w-16 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
