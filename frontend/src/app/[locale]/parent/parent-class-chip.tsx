import type { LucideIcon } from "lucide-react"
import { Baby, Blocks, BookOpen, GraduationCap, School } from "lucide-react"
import { cn } from "@/lib/utils"

export type ClassVisual = {
  Icon: LucideIcon
  label: string
  chipClass: string
  iconClass: string
}

/** Libellé court (TPS, PS…) + icône selon le niveau / nom de classe */
export function resolveClassVisual(
  niveau?: string | null,
  nom?: string | null,
): ClassVisual | null {
  const key = `${niveau ?? ""} ${nom ?? ""}`.toUpperCase().trim()
  if (!key) return null

  let label = niveau?.trim().toUpperCase() ?? ""
  if (!label && nom) {
    const match = nom.toUpperCase().match(/\b(TPS|PS|MS|GS)\b/)
    label = match?.[1] ?? (nom.length > 14 ? `${nom.slice(0, 14)}…` : nom)
  }

  if (key.includes("TPS")) {
    return {
      label,
      Icon: Baby,
      chipClass: "bg-[var(--primary-light)] text-[var(--status-progress-text)] ring-[var(--status-progress-border)]/80",
      iconClass: "text-[var(--status-progress-text)]",
    }
  }
  if (/\bPS\b/.test(key) || key.includes("PETITE SECTION")) {
    return {
      label,
      Icon: Blocks,
      chipClass: "bg-[var(--status-accepted-bg)] text-[var(--status-accepted-text)] ring-[var(--status-accepted-border)]/80",
      iconClass: "text-[var(--status-accepted-text)]",
    }
  }
  if (/\bMS\b/.test(key) || key.includes("MOYENNE")) {
    return {
      label,
      Icon: BookOpen,
      chipClass: "bg-amber-50 text-amber-900 ring-amber-200/80",
      iconClass: "text-amber-700",
    }
  }
  if (/\bGS\b/.test(key) || key.includes("GRANDE")) {
    return {
      label,
      Icon: GraduationCap,
      chipClass: "bg-violet-50 text-violet-900 ring-violet-200/80",
      iconClass: "text-violet-700",
    }
  }

  return {
    label,
    Icon: School,
    chipClass: "bg-[#FFF7ED] text-gray-800 ring-[#8B5CF6]/20",
    iconClass: "text-[#8B5CF6]",
  }
}

type ClasseChipProps = {
  niveau?: string | null
  nom?: string | null
  size?: "sm" | "md"
  className?: string
}

export function ClasseChip({ niveau, nom, size = "md", className }: ClasseChipProps) {
  const visual = resolveClassVisual(niveau, nom)
  if (!visual) return null

  const { Icon, label, chipClass, iconClass } = visual
  const compact = size === "sm"

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1 rounded-lg font-semibold ring-1",
        compact ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-0.5 text-xs",
        chipClass,
        className,
      )}
      title={nom ?? label}
    >
      <Icon className={cn(compact ? "h-3 w-3" : "h-3.5 w-3.5", "shrink-0", iconClass)} aria-hidden />
      <span className="truncate">{label}</span>
    </span>
  )
}
