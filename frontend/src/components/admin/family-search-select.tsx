"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { Check, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type FamilyOption = {
  id: string
  emailPrincipal: string
}

type FamilySearchSelectProps = {
  families: FamilyOption[]
  value: string
  onChange: (familleId: string) => void
  placeholder?: string
  emptyLabel?: string
  noResultsLabel?: string
}

export function FamilySearchSelect({
  families,
  value,
  onChange,
  placeholder,
  emptyLabel,
  noResultsLabel,
}: FamilySearchSelectProps) {
  const t = useTranslations("admin.children.familySearch")
  const [query, setQuery] = useState("")
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const selected = families.find(f => f.id === value)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return families
    return families.filter(f => f.emailPrincipal.toLowerCase().includes(q))
  }, [families, query])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onPointerDown)
    return () => document.removeEventListener("mousedown", onPointerDown)
  }, [open])

  const handleSelect = (familleId: string) => {
    onChange(familleId)
    setQuery("")
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="space-y-2">
      <div className="relative">
        <Search
          className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground pointer-events-none"
          aria-hidden
        />
        <Input
          type="search"
          value={open ? query : selected?.emailPrincipal ?? query}
          onChange={e => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => {
            setOpen(true)
            if (selected) setQuery("")
          }}
          placeholder={placeholder ?? t("placeholder")}
          className="ps-9"
          autoComplete="off"
          aria-expanded={open}
          aria-haspopup="listbox"
        />
      </div>

      {open && (
        <div
          className="max-h-44 overflow-y-auto rounded-md border border-input bg-background shadow-sm"
          role="listbox"
          aria-label={t("placeholder")}
        >
          {families.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{emptyLabel ?? t("empty")}</p>
          ) : filtered.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">{noResultsLabel ?? t("noResults")}</p>
          ) : (
            filtered.map(fam => {
              const isSelected = fam.id === value
              return (
                <button
                  key={fam.id}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(fam.id)}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-2 text-start text-sm hover:bg-muted/80 transition-colors",
                    isSelected && "bg-sky-50 text-sky-900",
                  )}
                >
                  <span className="truncate">{fam.emailPrincipal}</span>
                  {isSelected && <Check className="h-4 w-4 shrink-0 text-sky-700" aria-hidden />}
                </button>
              )
            })
          )}
        </div>
      )}

      <input type="hidden" name="familleId" value={value} required />
    </div>
  )
}
