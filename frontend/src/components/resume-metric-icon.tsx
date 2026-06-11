"use client"

import type { LucideIcon } from "lucide-react"
import {
  AlertTriangle,
  Ban,
  Frown,
  HelpCircle,
  Meh,
  Moon,
  Smile,
  SmilePlus,
  Sparkles,
  Star,
  Utensils,
  BedDouble,
  Home,
} from "lucide-react"
import { cn } from "@/lib/utils"

type MetricKind = "appetit" | "humeur" | "sieste" | "participation"

const appetitIcons: Record<string, LucideIcon> = {
  Excellent: SmilePlus,
  Bon: Smile,
  Bien: Smile,
  Moyen: Meh,
  Faible: Frown,
  Mal: Frown,
  Refus: Ban,
}

const humeurIcons: Record<string, LucideIcon> = {
  Excellent: SmilePlus,
  Bon: Smile,
  Bonne: Smile,
  Moyen: Meh,
  Moyenne: Meh,
  Difficile: Frown,
  Tres_difficile: Frown,
  Mauvaise: Frown,
}

const siesteIcons: Record<string, LucideIcon> = {
  Excellent: BedDouble,
  Bon: Moon,
  Moyen: Moon,
  Moyenne: Moon,
  Longue: BedDouble,
  Courte: Moon,
  Difficile: AlertTriangle,
  Pas_de_sieste: Ban,
}

const participationIcons: Record<string, LucideIcon> = {
  Excellent: Star,
  Bon: Sparkles,
  Bonne: Sparkles,
  Moyen: Meh,
  Moyenne: Meh,
  Faible: Moon,
  Absent: Ban,
}

export function ResumeMetricIcon({
  kind,
  value,
  className,
}: {
  kind: MetricKind
  value?: string | null
  className?: string
}) {
  const v = value?.trim() ?? ""
  let Icon: LucideIcon = HelpCircle
  if (kind === "appetit") Icon = appetitIcons[v] ?? Utensils
  else if (kind === "humeur") Icon = humeurIcons[v] ?? Smile
  else if (kind === "sieste") Icon = siesteIcons[v] ?? Moon
  else Icon = participationIcons[v] ?? Star

  return <Icon className={cn("h-8 w-8", className)} aria-hidden />
}

export function ResumeSectionIcon({
  name,
  className,
}: {
  name: "home" | "allergy"
  className?: string
}) {
  const Icon = name === "home" ? Home : AlertTriangle
  return <Icon className={cn("h-8 w-8", className)} aria-hidden />
}
