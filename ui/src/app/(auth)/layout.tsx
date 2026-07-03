export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-dvh overflow-hidden" style={{ backgroundColor: "oklch(1 0 0)" }}>
      {children}
    </div>
  )
}
