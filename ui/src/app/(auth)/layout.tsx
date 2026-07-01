export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-[100dvh] flex items-center justify-center overflow-hidden relative"
      style={{ backgroundColor: "oklch(0.085 0.014 230)" }}
    >
      {children}
    </div>
  )
}
