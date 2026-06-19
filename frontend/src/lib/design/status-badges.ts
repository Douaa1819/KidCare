/** Petitspas semantic status styles — use with Badge variant or pp-badge-* classes */

import type { VariantProps } from "class-variance-authority"
import type { badgeVariants } from "@/components/ui/badge"

export type BadgeVariantName = NonNullable<
  VariantProps<typeof badgeVariants>["variant"]
>

export type InscriptionStatusCode =
  | "CANDIDATURE"
  | "EN_COURS"
  | "ACTIF"
  | "REJETEE"
  | null
  | undefined

export function inscriptionStatusBadgeVariant(
  code: InscriptionStatusCode,
): BadgeVariantName {
  switch (code) {
    case "CANDIDATURE":
      return "review"
    case "EN_COURS":
      return "progress"
    case "ACTIF":
      return "accepted"
    case "REJETEE":
      return "rejected"
    default:
      return "neutral"
  }
}

export const ROLE_BADGE_VARIANT: Record<string, BadgeVariantName> = {
  SUPER_ADMIN: "neutral",
  ADMIN: "review",
  ENSEIGNANT: "progress",
  PARENT: "accepted",
}

export const USER_STATUS_BADGE_VARIANT: Record<string, BadgeVariantName> = {
  ACTIVE: "accepted",
  DISABLED: "review",
  ARCHIVED: "neutral",
  INVITED: "progress",
  BLOCKED: "rejected",
}

export function presenceBadgeVariant(statut: string | null | undefined): BadgeVariantName {
  if (statut === "Present") return "present"
  if (statut === "Absent") return "rejected"
  return "neutral"
}
