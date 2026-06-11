"use client"

import { Baby } from "lucide-react"

export type ParentWelcomeCardProps = {
  dateLocale: string
  parentPrenom: string
  childName: string | null
  childClass: string | null
  childPhotoUrl?: string | null
  noChildSubtitle: string
  greeting: string
  greetingNamed: string
}

/**
 * Stable module-level welcome card — must not be defined inside ParentDashboard,
 * otherwise React treats it as a new component type on every parent re-render and remounts it.
 */
export function ParentWelcomeCard({
  dateLocale,
  parentPrenom,
  childName,
  childClass,
  childPhotoUrl,
  noChildSubtitle,
  greeting,
  greetingNamed,
}: ParentWelcomeCardProps) {
  const dateLabel = new Date().toLocaleDateString(dateLocale, {
    weekday: "long",
    day: "2-digit",
    month: "long",
  })

  return (
    <div
      className="rounded-2xl p-5"
      style={{ background: "#EBF6FB", border: "1.5px solid transparent" }}
    >
      <p className="text-xs font-medium mb-1" style={{ color: "#1A1A1A", opacity: 0.65 }}>
        {dateLabel}
      </p>
      <h2 className="text-xl font-bold" style={{ color: "#1A1A1A" }}>
        {parentPrenom ? greetingNamed : greeting}
      </h2>
      {childName ? (
        <div
          className="mt-3 flex items-center gap-3 rounded-xl p-3"
          style={{ background: "rgba(255,255,255,0.45)" }}
        >
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white/60"
            style={{ background: "white" }}
          >
            {childPhotoUrl ? (
              <img src={childPhotoUrl} alt={childName} className="h-full w-full object-cover" />
            ) : (
              <Baby className="h-7 w-7 text-sky-700" aria-hidden />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold" style={{ color: "#1A1A1A" }}>
              {childName}
            </p>
            {childClass ? (
              <p className="truncate text-sm" style={{ color: "#1A1A1A", opacity: 0.65 }}>
                {childClass}
              </p>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm leading-relaxed" style={{ color: "#1A1A1A", opacity: 0.65 }}>
          {noChildSubtitle}
        </p>
      )}
    </div>
  )
}
