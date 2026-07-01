function SkeletonCard({ height = "h-[120px]" }: { height?: string }) {
  return (
    <div
      className={`rounded-xl ${height}`}
      style={{ border: "1px solid var(--border)" }}
    >
      <div className="p-5 flex flex-col gap-4">
        <div className="skeleton h-3 w-20 rounded-md" />
        <div className="skeleton h-10 w-24 rounded-md" />
      </div>
    </div>
  )
}

function SkeletonRow() {
  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      {[140, 180, 80, 70].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`skeleton h-3 rounded-md`} style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

export default function DashboardLoading() {
  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="skeleton h-2.5 w-16 rounded-md" />
          <div className="skeleton h-7 w-36 rounded-md" />
        </div>
        <div className="skeleton h-7 w-32 rounded-full" />
      </div>

      <div className="grid gap-3" style={{ gridTemplateColumns: "2fr 1fr 1fr" }}>
        <SkeletonCard height="h-[140px]" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <SkeletonCard />
        <SkeletonCard />
      </div>

      <div>
        <div className="skeleton h-3 w-40 rounded-md mb-3" />
        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
          <div className="px-4 py-3" style={{ backgroundColor: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
            <div className="flex gap-8">
              {[80, 120, 60, 50].map((w, i) => (
                <div key={i} className="skeleton h-2.5 rounded-md" style={{ width: w }} />
              ))}
            </div>
          </div>
          <table className="w-full">
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
