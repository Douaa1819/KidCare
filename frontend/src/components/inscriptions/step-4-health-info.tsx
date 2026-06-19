"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { X, Plus } from "lucide-react"
import { getHealthTags } from "@/lib/inscription-health-tags"

interface Step4Props {
  formData: any
  updateFormData: (data: any) => void
}

function TagSelector({
  label,
  description,
  predefined,
  selected,
  onToggle,
  onAddCustom,
  onRemoveCustom,
  addLabel,
  addPlaceholder,
}: {
  label: string
  description?: string
  predefined: string[]
  selected: string[]
  onToggle: (tag: string) => void
  onAddCustom: (tag: string) => void
  onRemoveCustom: (tag: string) => void
  addLabel: string
  addPlaceholder: string
}) {
  const [customInput, setCustomInput] = useState("")

  const handleAdd = () => {
    const trimmed = customInput.trim()
    if (!trimmed || selected.includes(trimmed)) return
    onAddCustom(trimmed)
    setCustomInput("")
  }

  const customTags = selected.filter((tag) => !predefined.includes(tag))

  return (
    <div className="p-4 rounded-xl border border-border bg-white/60 space-y-3">
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>

      <div className="flex flex-wrap gap-2">
        {predefined.map((tag) => {
          const isSelected = selected.includes(tag)
          return (
            <button
              key={tag}
              type="button"
              onClick={() => onToggle(tag)}
              className={`px-3 py-1.5 text-xs rounded-full border transition-all font-medium ${
                isSelected
                  ? "bg-accent text-accent-foreground border-accent shadow-sm"
                  : "bg-white/80 border-border text-foreground hover:border-accent/50 hover:bg-accent/5"
              }`}
            >
              {isSelected && <span className="me-1">✓</span>}
              {tag}
            </button>
          )
        })}
      </div>

      {customTags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {customTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs rounded-full bg-accent/10 border border-accent/30 text-foreground font-medium"
            >
              {tag}
              <button
                type="button"
                onClick={() => onRemoveCustom(tag)}
                className="text-muted-foreground hover:text-destructive ms-1 transition-colors"
                aria-label={addLabel}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Input
          placeholder={addPlaceholder}
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAdd())}
          className="h-8 text-xs"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!customInput.trim()}
          className="flex items-center gap-1 px-3 h-8 text-xs rounded-md bg-accent text-accent-foreground disabled:opacity-40 hover:bg-accent/90 transition-colors shrink-0"
        >
          <Plus className="w-3 h-3" aria-hidden />
          {addLabel}
        </button>
      </div>
    </div>
  )
}

export default function Step4HealthInfo({ formData, updateFormData }: Step4Props) {
  const t = useTranslations("registration.health")
  const locale = useLocale()
  const tags = getHealthTags(locale)

  const makeToggle = (field: string) => (tag: string) => {
    const current: string[] = formData[field] ?? []
    updateFormData({
      [field]: current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    })
  }

  const makeAddCustom = (field: string) => (tag: string) => {
    const current: string[] = formData[field] ?? []
    if (!current.includes(tag)) updateFormData({ [field]: [...current, tag] })
  }

  const makeRemoveCustom = (field: string) => (tag: string) => {
    const current: string[] = formData[field] ?? []
    updateFormData({ [field]: current.filter((item) => item !== tag) })
  }

  const restrictionOptions = [
    { value: "sans_restriction", label: t("restrictions.none") },
    { value: "sans_porc", label: t("restrictions.halal") },
    { value: "vegetarien", label: t("restrictions.vegetarian") },
    { value: "sans_gluten", label: t("restrictions.glutenFree") },
    { value: "autre", label: t("restrictions.other") },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-1">
          <svg className="w-5 h-5 text-accent shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
            <path d="M10.5 1.5H9.5a.5.5 0 00-.5.5v1H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2h-4V2a.5.5 0 00-.5-.5zM5 5h10v10H5V5z" />
          </svg>
          {t("title")}
        </h2>
        <p className="text-sm text-muted-foreground">{t("intro")}</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="height" className="text-sm font-medium">{t("height")}</Label>
          <Input id="height" value={formData.height ?? ""} onChange={(e) => updateFormData({ height: e.target.value })} className="mt-2" />
        </div>
        <div>
          <Label htmlFor="weight" className="text-sm font-medium">{t("weight")}</Label>
          <Input id="weight" value={formData.weight ?? ""} onChange={(e) => updateFormData({ weight: e.target.value })} className="mt-2" />
        </div>
      </div>

      <div>
        <Label htmlFor="familyHistory" className="text-sm font-medium">{t("familyHistory")}</Label>
        <textarea
          id="familyHistory"
          value={formData.familyHistory ?? ""}
          onChange={(e) => updateFormData({ familyHistory: e.target.value })}
          className="w-full mt-2 p-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
        />
      </div>

      <div className="space-y-4">
        <p className="text-sm font-semibold text-foreground border-b border-border pb-2">{t("tagsSection")}</p>

        <TagSelector
          label={t("diseases")}
          description={t("diseasesHint")}
          predefined={[...tags.maladies]}
          selected={formData.tagsMaladies ?? []}
          onToggle={makeToggle("tagsMaladies")}
          onAddCustom={makeAddCustom("tagsMaladies")}
          onRemoveCustom={makeRemoveCustom("tagsMaladies")}
          addLabel={t("addTag")}
          addPlaceholder={t("addTagPlaceholder")}
        />

        <TagSelector
          label={t("allergies")}
          description={t("allergiesHint")}
          predefined={[...tags.allergies]}
          selected={formData.tagsAllergies ?? []}
          onToggle={makeToggle("tagsAllergies")}
          onAddCustom={makeAddCustom("tagsAllergies")}
          onRemoveCustom={makeRemoveCustom("tagsAllergies")}
          addLabel={t("addTag")}
          addPlaceholder={t("addTagPlaceholder")}
        />

        <TagSelector
          label={t("intolerances")}
          description={t("intolerancesHint")}
          predefined={[...tags.intolerances]}
          selected={formData.tagsIntolerances ?? []}
          onToggle={makeToggle("tagsIntolerances")}
          onAddCustom={makeAddCustom("tagsIntolerances")}
          onRemoveCustom={makeRemoveCustom("tagsIntolerances")}
          addLabel={t("addTag")}
          addPlaceholder={t("addTagPlaceholder")}
        />

        <TagSelector
          label={t("healthTags")}
          description={t("healthTagsHint")}
          predefined={[...tags.suivi]}
          selected={formData.healthTags ?? []}
          onToggle={makeToggle("healthTags")}
          onAddCustom={makeAddCustom("healthTags")}
          onRemoveCustom={makeRemoveCustom("healthTags")}
          addLabel={t("addTag")}
          addPlaceholder={t("addTagPlaceholder")}
        />
      </div>

      <div className="p-4 rounded-xl border border-border bg-white/60 space-y-3">
        <p className="text-sm font-semibold text-foreground">{t("dietaryRestriction")}</p>
        <div className="space-y-2">
          {restrictionOptions.map((opt) => (
            <label key={opt.value} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="restrictionAlimentaire"
                value={opt.value}
                checked={formData.restrictionAlimentaire === opt.value}
                onChange={() => updateFormData({ restrictionAlimentaire: opt.value })}
                className="w-4 h-4 accent-accent"
              />
              <span className="text-sm group-hover:text-accent transition-colors">{opt.label}</span>
            </label>
          ))}
        </div>
        {formData.restrictionAlimentaire === "autre" && (
          <Input
            placeholder={t("restrictionDetails")}
            value={formData.restrictionDetails ?? ""}
            onChange={(e) => updateFormData({ restrictionDetails: e.target.value })}
            className="mt-2"
          />
        )}
      </div>

      <div>
        <Label htmlFor="surgicalInterventions" className="text-sm font-medium">{t("surgicalInterventions")}</Label>
        <Input
          id="surgicalInterventions"
          value={formData.surgicalInterventions ?? ""}
          onChange={(e) => updateFormData({ surgicalInterventions: e.target.value })}
          className="mt-2"
        />
      </div>

      <div>
        <Label htmlFor="remarks" className="text-sm font-medium">{t("remarks")}</Label>
        <textarea
          id="remarks"
          value={formData.remarks ?? ""}
          onChange={(e) => updateFormData({ remarks: e.target.value })}
          className="w-full mt-2 p-3 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring min-h-[80px] resize-none"
        />
      </div>
    </div>
  )
}
