"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { MagnifyingGlass } from "@phosphor-icons/react"

export function SearchBar() {
  const [query, setQuery] = useState("")
  const [focused, setFocused] = useState(false)
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const q = query.trim()
    if (q) router.push(`/applications?q=${encodeURIComponent(q)}`)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div
        className="flex items-center gap-2.5 px-3 py-2 rounded-xl transition-premium"
        style={{
          border: `1px solid ${focused ? "var(--primary)" : "var(--border)"}`,
          backgroundColor: "var(--background)",
          boxShadow: focused ? "0 0 0 3px oklch(0.560 0.115 200 / 0.10)" : "none",
        }}
        onClick={() => inputRef.current?.focus()}
      >
        <MagnifyingGlass
          size={14}
          style={{
            color: focused ? "var(--primary)" : "var(--muted-foreground)",
            flexShrink: 0,
            transition: "color 0.2s ease",
          }}
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="Search by company or role..."
          className="flex-1 bg-transparent outline-none text-[13px]"
          style={{ color: "var(--foreground)" }}
        />
        {query && (
          <kbd
            className="text-[10px] font-medium px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: "var(--muted)",
              color: "var(--muted-foreground)",
              border: "1px solid var(--border)",
            }}
          >
            ↵
          </kbd>
        )}
      </div>
    </form>
  )
}
