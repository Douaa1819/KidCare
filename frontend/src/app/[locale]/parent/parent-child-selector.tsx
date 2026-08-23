"use client"

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"
import { Check, ChevronDown, UserRound, Users } from "lucide-react"
import { apiClient } from "@/lib/api"
import { resolveClassLevelStyle } from "@/lib/class-display"
import { cn } from "@/lib/utils"
import {
  readStoredEnfantId,
  useParentSelectedChild,
} from "./parent-selected-child-context"

export const PARENT_STORAGE_ENFANT_ID = "kidcare-parent-selected-enfant-id"
export const PARENT_CHILD_SELECT_EVENT = "kidcare-parent-child-select"

export type ParentChildSelectDetail = { id: string }

type EnfantOption = {
  id: string
  prenom?: string | null
  nom?: string | null
  classeNom?: string | null
  classeNiveau?: string | null
  photoUrl?: string | null
}

let enfantsCache: EnfantOption[] | null = null
let enfantsLoadPromise: Promise<EnfantOption[]> | null = null

export function invalidateParentEnfantsCache() {
  enfantsCache = null
  enfantsLoadPromise = null
}

function mapEnfantsFromProfile(data: unknown): EnfantOption[] {
  const list = Array.isArray((data as { enfants?: unknown })?.enfants)
    ? (data as { enfants: EnfantOption[] }).enfants
    : []
  return list.map(e => ({
    id: String(e.id),
    prenom: e.prenom,
    nom: e.nom,
    classeNom: e.classeNom,
    classeNiveau: e.classeNiveau ?? null,
    photoUrl: e.photoUrl,
  }))
}

async function fetchEnfantsOnce(): Promise<EnfantOption[]> {
  if (enfantsCache) return enfantsCache
  if (!enfantsLoadPromise) {
    enfantsLoadPromise = apiClient
      .getParentProfile()
      .then(res => {
        enfantsCache = mapEnfantsFromProfile(res.data)
        return enfantsCache
      })
      .catch(() => {
        enfantsCache = []
        return enfantsCache
      })
      .finally(() => {
        enfantsLoadPromise = null
      })
  }
  return enfantsLoadPromise
}

function childDisplayName(e: EnfantOption, fallback: string): string {
  return `${e.prenom ?? ""} ${e.nom ?? ""}`.trim() || fallback
}

const ChildAvatar = memo(function ChildAvatar({
  enfant,
  className,
}: {
  enfant: EnfantOption
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-sky-100 bg-sky-50",
        className,
      )}
    >
      {enfant.photoUrl ? (
        <img src={enfant.photoUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <UserRound className="h-4 w-4 text-sky-700" aria-hidden />
      )}
    </span>
  )
})

const ClasseChip = memo(function ClasseChip({
  niveau,
  nom,
}: {
  niveau?: string | null
  nom?: string | null
}) {
  const style = resolveClassLevelStyle(niveau, nom)
  const Icon = style.icon

  return (
    <span
      className={cn(
        "inline-flex max-w-[5.5rem] shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1",
        style.chipClass,
      )}
      title={nom?.trim() || style.label}
    >
      <Icon className={cn("h-3 w-3 shrink-0", style.iconClass)} aria-hidden />
      <span className="truncate">{style.label}</span>
    </span>
  )
})

const ChildSelectorContent = memo(function ChildSelectorContent({
  enfant,
  name,
}: {
  enfant: EnfantOption
  name: string
}) {
  const hasClass = Boolean(enfant.classeNom?.trim() || enfant.classeNiveau?.trim())

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <ChildAvatar enfant={enfant} />
      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <span className="truncate text-sm font-semibold text-gray-900">{name}</span>
        {hasClass ? <ClasseChip niveau={enfant.classeNiveau} nom={enfant.classeNom} /> : null}
      </div>
    </div>
  )
})

function SelectorSkeleton() {
  return (
    <div className="mx-auto max-w-lg border-b border-sky-100 bg-white px-3 py-2 md:max-w-3xl">
      <div className="mb-1.5 h-2.5 w-20 rounded bg-sky-50" />
      <div className="flex h-10 items-center gap-2 rounded-xl border border-sky-100 bg-white px-2.5">
        <div className="h-9 w-9 rounded-lg bg-sky-50" />
        <div className="h-3.5 flex-1 rounded bg-gray-100" />
      </div>
    </div>
  )
}

export function ParentChildSelector() {
  const pathname = usePathname() || ""
  const { selectedEnfantId, setSelectedEnfantId } = useParentSelectedChild()
  const t = useTranslations("parent")
  const [enfants, setEnfants] = useState<EnfantOption[]>(() => enfantsCache ?? [])
  const [loading, setLoading] = useState(() => !enfantsCache)
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const defaultName = t("ui.defaultChildName")
  const initializedRef = useRef(false)

  const isParentArea = /\/parent(\/|$)/.test(pathname)

  useEffect(() => {
    if (!isParentArea) return
    let cancelled = false
    void fetchEnfantsOnce().then(list => {
      if (!cancelled) {
        setEnfants(list)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [isParentArea])

  const validIds = useMemo(() => enfants.map(e => e.id), [enfants])

  useEffect(() => {
    if (!enfants.length || initializedRef.current) return
    const stored = readStoredEnfantId(validIds)
    if (stored && stored !== selectedEnfantId) {
      setSelectedEnfantId(stored)
    }
    initializedRef.current = true
  }, [enfants.length, validIds, selectedEnfantId, setSelectedEnfantId])

  const selectedId = useMemo(() => {
    if (!enfants.length) return ""
    if (selectedEnfantId && enfants.some(e => e.id === selectedEnfantId)) {
      return selectedEnfantId
    }
    return readStoredEnfantId(validIds)
  }, [enfants, selectedEnfantId, validIds])

  const selected = useMemo(
    () => enfants.find(e => e.id === selectedId) ?? enfants[0],
    [enfants, selectedId],
  )

  const selectedName = useMemo(
    () => (selected ? childDisplayName(selected, defaultName) : defaultName),
    [selected, defaultName],
  )

  const canSwitch = enfants.length > 1

  const handleChange = useCallback(
    (id: string) => {
      if (!id || id === selectedId) {
        setOpen(false)
        return
      }
      setSelectedEnfantId(id)
      setOpen(false)
    },
    [selectedId, setSelectedEnfantId],
  )

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: MouseEvent) => {
      if (containerRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onPointerDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onPointerDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  if (!isParentArea) return null
  if (loading && enfants.length === 0) return <SelectorSkeleton />
  if (enfants.length === 0) return null

  return (
    <div className="sticky top-12 z-50 border-b border-sky-100 bg-white">
      <div ref={containerRef} className="relative mx-auto max-w-lg px-3 py-2 md:max-w-3xl">
        <div className="mb-1.5 flex items-center gap-1">
          <Users className="h-3 w-3 text-sky-700" aria-hidden />
          <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-800">
            {t("ui.selectChild")}
          </p>
          {canSwitch ? (
            <span className="ml-auto rounded-full bg-sky-100 px-1.5 py-px text-[9px] font-bold text-sky-800">
              {enfants.length}
            </span>
          ) : null}
        </div>

        {canSwitch ? (
          <>
            <button
              type="button"
              onClick={() => setOpen(v => !v)}
              aria-expanded={open}
              aria-haspopup="listbox"
              aria-label={`${t("ui.selectChild")}: ${selectedName}`}
              className={cn(
                "flex w-full items-center gap-1 rounded-xl border bg-white py-1.5 pl-2 pr-1.5 text-left",
                open ? "border-sky-300" : "border-sky-200",
              )}
            >
              {selected ? <ChildSelectorContent enfant={selected} name={selectedName} /> : null}
              <ChevronDown
                className={cn("h-4 w-4 shrink-0 text-[#8B5CF6]", open && "rotate-180")}
                style={{ transition: "transform 0.15s ease" }}
                aria-hidden
              />
            </button>

            {open ? (
              <ul
                role="listbox"
                aria-label={t("ui.selectChild")}
                className="absolute left-3 right-3 top-full z-10 mt-1 overflow-hidden rounded-xl border border-sky-200 bg-white"
              >
                {enfants.map((e, index) => {
                  const isSelected = e.id === selectedId
                  const name = childDisplayName(e, defaultName)
                  return (
                    <li
                      key={e.id}
                      role="option"
                      aria-selected={isSelected}
                      className={cn(index > 0 && "border-t border-gray-100")}
                    >
                      <button
                        type="button"
                        onClick={() => handleChange(e.id)}
                        className={cn(
                          "flex w-full items-center gap-1 px-2 py-2 text-left",
                          isSelected ? "bg-sky-50" : "hover:bg-gray-50",
                        )}
                      >
                        <ChildSelectorContent enfant={e} name={name} />
                        {isSelected ? (
                          <Check className="h-3.5 w-3.5 shrink-0 text-[#8B5CF6]" aria-hidden />
                        ) : (
                          <span className="w-3.5 shrink-0" aria-hidden />
                        )}
                      </button>
                    </li>
                  )
                })}
              </ul>
            ) : null}
          </>
        ) : selected ? (
          <div className="flex items-center rounded-xl border border-sky-200 bg-white px-2 py-1.5">
            <ChildSelectorContent enfant={selected} name={selectedName} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
