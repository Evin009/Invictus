function SkeletonRow() {
  return (
    <tr style={{ borderBottom: "1px solid var(--border)" }}>
      {[100, 180, 70, 60, 70, 65].map((w, i) => (
        <td key={i} className="px-4 py-3.5">
          <div className="skeleton h-3 rounded-md" style={{ width: w }} />
        </td>
      ))}
    </tr>
  )
}

export default function ApplicationsLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="skeleton h-7 w-44 rounded-md" />
        <div className="skeleton h-3 w-56 rounded-md" />
      </div>
      <div className="flex items-center justify-between">
        <div className="skeleton h-3 w-36 rounded-md" />
        <div className="skeleton h-8 w-36 rounded-md" />
      </div>
      <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--border)" }}>
        <div className="px-4 py-3" style={{ backgroundColor: "var(--muted)", borderBottom: "1px solid var(--border)" }}>
          <div className="flex gap-8">
            {[80, 140, 60, 50, 55, 60].map((w, i) => (
              <div key={i} className="skeleton h-2.5 rounded-md" style={{ width: w }} />
            ))}
          </div>
        </div>
        <table className="w-full">
          <tbody>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)}
          </tbody>
        </table>
      </div>
    </div>
  )
}
