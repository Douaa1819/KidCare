"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { apiClient } from "@/lib/api"
import { renderReglementContent } from "@/lib/rich-text"

interface Step5Props {
  formData: { regulationsAccepted: boolean; confirmationExacte?: boolean }
  updateFormData: (data: Partial<{ regulationsAccepted: boolean; confirmationExacte: boolean }>) => void
}

export default function Step5Regulations({ formData, updateFormData }: Step5Props) {
  const t = useTranslations("registration.regulations")
  const [reglement, setReglement] = useState<{ contenu: string; version: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchReglement() {
      try {
        const res = await apiClient.getPublicReglement()
        if (!cancelled) setReglement(res.data)
      } catch {
        if (!cancelled) setReglement(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchReglement()
    return () => { cancelled = true }
  }, [])

  const defaultContent = `## KidCare - Crèche Maternelle

KidCare est une plateforme moderne de gestion de crèche. Les enfants y trouvent un accueil bienveillant et chaleureux, entourés par des adultes passionnés et dévoués.

## Les horaires de l'école

Horaires des classes : 8h30 à 11h30 et de 14h à 16h15, du lundi au vendredi. Un service de garde gratuit est assuré à partir de 7h45 le matin et jusqu'à 16h45 le soir.

## La scolarité

Les frais de scolarité sont à régler par trimestre. Toute absence (même prévisible) durant les périodes scolaires ne pourra faire l'objet de réduction sur les frais de scolarité mensuels.

## Vaccination & Maladie

Chaque enfant doit être à jour de ses vaccinations. Un enfant fiévreux ou nauséeux ne peut être accepté à l'école.

## Sécurité

Je reconnais avoir pris connaissance du règlement intérieur et m'engage à le respecter sans réserve.`

  const content = reglement?.contenu ?? defaultContent

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-1">
          <svg className="w-5 h-5 text-accent shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("readHint")}</p>
        {reglement?.version && (
          <p className="text-xs text-muted-foreground mt-0.5">{t("version", { version: reglement.version })}</p>
        )}
      </div>

      <div className="bg-white/60 border border-border rounded-xl p-6 max-h-96 overflow-y-auto text-sm">
        {loading ? (
          <p className="text-muted-foreground text-center py-8">{t("loading")}</p>
        ) : (
          <div
            className="space-y-2 text-muted-foreground leading-relaxed"
            dangerouslySetInnerHTML={{ __html: renderReglementContent(content) }}
          />
        )}
      </div>

      <div className="space-y-3">
        <label
          className={`flex items-start gap-3 p-4 rounded-xl border-2 bg-white/80 transition-colors cursor-pointer ${
            formData.regulationsAccepted
              ? "border-[var(--status-accepted-border)] bg-[var(--status-accepted-bg)]/40"
              : "border-border hover:border-[var(--status-accepted-border)]/60"
          }`}
        >
          <input
            type="checkbox"
            checked={formData.regulationsAccepted}
            onChange={(e) => updateFormData({ regulationsAccepted: e.target.checked })}
            className="w-5 h-5 rounded mt-0.5 shrink-0 accent-[var(--pp-secondary)]"
          />
          <span className="text-sm font-medium text-foreground leading-relaxed">
            {t("acceptRegulations")} <span className="text-destructive">*</span>
          </span>
        </label>

        <label
          className={`flex items-start gap-3 p-4 rounded-xl border-2 bg-white/80 transition-colors cursor-pointer ${
            formData.confirmationExacte
              ? "border-[var(--status-accepted-border)] bg-[var(--status-accepted-bg)]/40"
              : "border-border hover:border-[var(--status-accepted-border)]/60"
          }`}
        >
          <input
            type="checkbox"
            checked={formData.confirmationExacte ?? false}
            onChange={(e) => updateFormData({ confirmationExacte: e.target.checked })}
            className="w-5 h-5 rounded mt-0.5 shrink-0 accent-[var(--pp-secondary)]"
          />
          <span className="text-sm font-medium text-foreground leading-relaxed">
            {t("confirmExact")} <span className="text-destructive">*</span>
          </span>
        </label>
      </div>
    </div>
  )
}
