"use client"

import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { useTeacherClass } from "./teacher-class-context"

type Props = {
  className?: string
  /** Afficher le libellé au-dessus du select (mobile-friendly). */
  showLabel?: boolean
}

/**
 * Liste déroulante des classes — visible uniquement si l’enseignant en a plusieurs.
 */
export function TeacherClassSelect({ className, showLabel = true }: Props) {
  const t = useTranslations("teacher.dashboard")
  const { classes, selectedClassId, selectClass, hasMultipleClasses, loading } = useTeacherClass()

  if (!hasMultipleClasses || loading) return null

  return (
    <label
      className={cn(
        "flex flex-col gap-1 min-w-0",
        showLabel ? "w-full sm:w-auto" : "",
        className,
      )}
    >
      {showLabel ? (
        <span className="text-xs font-medium text-gray-600">{t("classSelectLabel")}</span>
      ) : null}
      <select
        value={selectedClassId ?? ""}
        onChange={e => selectClass(e.target.value)}
        className={cn(
          "h-9 w-full min-w-0 rounded-xl border border-sky-200 bg-white px-3 text-sm text-gray-900 shadow-sm",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1",
          "sm:min-w-[11rem] sm:max-w-[16rem]",
        )}
        aria-label={t("classSelectLabel")}
      >
        {classes.map(c => (
          <option key={c.id} value={c.id}>
            {c.nom}
          </option>
        ))}
      </select>
    </label>
  )
}
