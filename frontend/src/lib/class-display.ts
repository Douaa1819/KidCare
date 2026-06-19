import type { LucideIcon } from "lucide-react"
import { Baby, Blocks, GraduationCap, School } from "lucide-react"

export type ClassLevelKey = "TPS" | "PS" | "MS" | "GS" | "DEFAULT"

export type ClassLevelStyle = {
  key: ClassLevelKey
  label: string
  icon: LucideIcon
  chipClass: string
  iconClass: string
}

const LEVEL_STYLES: Record<ClassLevelKey, Omit<ClassLevelStyle, "label">> = {
  TPS: {
    key: "TPS",
    icon: Baby,
    chipClass: "bg-[#FFF7ED] text-[#b85c52] ring-[#FF6F61]/20",
    iconClass: "text-[#FF6F61]",
  },
  PS: {
    key: "PS",
    icon: Blocks,
    chipClass: "bg-[var(--primary-light)] text-[var(--status-progress-text)] ring-[var(--status-progress-border)]/80",
    iconClass: "text-[var(--status-progress-text)]",
  },
  MS: {
    key: "MS",
    icon: GraduationCap,
    chipClass: "bg-[var(--status-accepted-bg)] text-[var(--status-accepted-text)] ring-[var(--status-accepted-border)]/70",
    iconClass: "text-[var(--status-accepted-text)]",
  },
  GS: {
    key: "GS",
    icon: GraduationCap,
    chipClass: "bg-violet-50 text-violet-900 ring-violet-200/70",
    iconClass: "text-violet-700",
  },
  DEFAULT: {
    key: "DEFAULT",
    icon: School,
    chipClass: "bg-gray-50 text-gray-800 ring-gray-200/80",
    iconClass: "text-sky-700",
  },
}

function detectLevelKey(niveau?: string | null, nom?: string | null): ClassLevelKey {
  const n = (niveau ?? "").trim().toUpperCase()
  if (n === "TPS" || n === "PS" || n === "MS" || n === "GS") return n
  const fromNom = (nom ?? "").toUpperCase()
  const match = fromNom.match(/\b(TPS|PS|MS|GS)\b/)
  if (match?.[1] === "TPS" || match?.[1] === "PS" || match?.[1] === "MS" || match?.[1] === "GS") {
    return match[1]
  }
  return "DEFAULT"
}

export function resolveClassLevelStyle(
  niveau?: string | null,
  nom?: string | null,
): ClassLevelStyle {
  const key = detectLevelKey(niveau, nom)
  const label =
    key !== "DEFAULT"
      ? key
      : (niveau?.trim() || nom?.trim() || "")
  return {
    ...LEVEL_STYLES[key],
    label: label || "Classe",
  }
}
