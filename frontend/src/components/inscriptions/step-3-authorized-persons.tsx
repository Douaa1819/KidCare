"use client"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, UserCheck } from "lucide-react"
import { isValidCin, isValidName, isValidPhone, normalizePhone } from "@/lib/form-validation"

interface AuthorizedPerson {
  name: string
  relationship: string
  otherRelationship?: string
  phone: string
  cin: string
}

interface Step3Props {
  formData: { authorizedPersons?: AuthorizedPerson[]; sansRestriction?: boolean }
  updateFormData: (data: Partial<{ authorizedPersons: AuthorizedPerson[]; sansRestriction: boolean }>) => void
  showErrors?: boolean
}

const RELATION_OPTIONS = [
  "Grand-mère", "Grand-père", "Tante", "Oncle",
  "Frère aîné", "Sœur aînée", "Cousin(e)", "Voisin(e)", "Employé(e) de maison", "Autre",
]

export default function Step3AuthorizedPersons({ formData, updateFormData, showErrors }: Step3Props) {
  const persons: AuthorizedPerson[] = formData.authorizedPersons ?? []
  const sansRestriction: boolean = formData.sansRestriction ?? false
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({})

  const fieldKey = (index: number, field: keyof AuthorizedPerson) => `${index}.${field}`
  const shouldShowError = (index: number, field: keyof AuthorizedPerson) => Boolean(showErrors || touchedFields[fieldKey(index, field)])

  const handlePersonChange = (index: number, field: keyof AuthorizedPerson, value: string) => {
    const updated = [...persons]
    const nextPerson = { ...updated[index], [field]: value }
    if (field === "relationship" && value !== "Autre") {
      nextPerson.otherRelationship = ""
    }
    updated[index] = nextPerson
    setTouchedFields(prev => ({ ...prev, [fieldKey(index, field)]: true }))
    updateFormData({ authorizedPersons: updated })
  }

  const handleAddPerson = () => {
    updateFormData({
      authorizedPersons: [
        ...persons,
        { name: "", relationship: "", otherRelationship: "", phone: "", cin: "" },
      ],
    })
  }

  const errorFor = (person: AuthorizedPerson, field: keyof AuthorizedPerson, index: number) => {
    if (!shouldShowError(index, field)) return null
    if (field === "name") {
      if (!person.name.trim()) return "Nom complet obligatoire."
      if (!isValidName(person.name)) return "Lettres uniquement, sans chiffres."
    }
    if (field === "relationship" && !person.relationship.trim()) return "Lien obligatoire."
    if (field === "otherRelationship" && person.relationship === "Autre") {
      if (!person.otherRelationship?.trim()) return "Précisez la relation."
      if (!isValidName(person.otherRelationship)) return "Relation invalide — lettres uniquement, sans chiffres."
    }
    if (field === "phone") {
      if (!person.phone.trim()) return "Téléphone obligatoire."
      if (!isValidPhone(person.phone)) return "Téléphone invalide (ex : 0612345678)."
    }
    if (field === "cin") {
      if (!person.cin.trim()) return "CIN obligatoire."
      if (!isValidCin(person.cin)) return "CIN invalide (ex : AB123456 ou A123456)."
    }
    return null
  }

  const handleRemovePerson = (index: number) => {
    updateFormData({
      authorizedPersons: persons.filter((_, i) => i !== index),
    })
    setTouchedFields(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(key => {
        if (key.startsWith(`${index}.`)) delete next[key]
      })
      return next
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground mb-1">
          <UserCheck className="w-5 h-5 text-primary" />
          Restrictions de récupération
        </h2>
        <p className="text-sm text-muted-foreground">
          Personnes autorisées à récupérer l&apos;enfant en dehors des parents / tuteurs légaux.
        </p>
      </div>

      {/* Sans restriction toggle */}
      <div className={`p-4 rounded-xl border-2 transition-colors ${
        sansRestriction
          ? "border-green-400 bg-green-50 dark:border-green-700 dark:bg-green-950/20"
          : "border-border bg-muted/20"
      }`}>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={sansRestriction}
            onChange={(e) => updateFormData({ sansRestriction: e.target.checked })}
            className="w-5 h-5 rounded accent-green-600 mt-0.5 flex-shrink-0"
          />
          <div>
            <span className={`text-sm font-semibold ${sansRestriction ? "text-green-800 dark:text-green-400" : "text-foreground"}`}>
              Sans restriction — Toute personne peut récupérer l&apos;enfant
            </span>
            <p className="text-xs text-muted-foreground mt-0.5">
              Si cochée, aucune liste de délégation n&apos;est requise.
            </p>
          </div>
        </label>
      </div>

      {/* Delegation list */}
      {!sansRestriction && (
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-sm font-semibold text-foreground">
              Liste des personnes autorisées
            </p>
            <button
              type="button"
              onClick={handleAddPerson}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition-colors font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Ajouter une personne
            </button>
          </div>

          {persons.length === 0 ? (
            <div className="text-center py-8 rounded-xl border-2 border-dashed border-border text-muted-foreground">
              <UserCheck className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Aucune personne autorisée ajoutée.</p>
              <p className="text-xs mt-1">Cliquez sur &quot;Ajouter une personne&quot; pour commencer.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {persons.map((person, index) => (
                <div key={index} className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">
                      Personne autorisée {index + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemovePerson(index)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium">Nom complet <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="Ex : Fatima Bennani"
                        value={person.name}
                        onChange={(e) => handlePersonChange(index, "name", e.target.value)}
                        onBlur={() => setTouchedFields(prev => ({ ...prev, [fieldKey(index, "name")]: true }))}
                        className={`mt-1 h-9 text-sm ${errorFor(person, "name", index) ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                      />
                      {errorFor(person, "name", index) && <p className="mt-1 text-xs text-red-500">{errorFor(person, "name", index)}</p>}
                    </div>
                    <div>
                      <Label className="text-xs font-medium">Lien avec l&apos;enfant <span className="text-red-500">*</span></Label>
                      <select
                        value={person.relationship}
                        onChange={(e) => handlePersonChange(index, "relationship", e.target.value)}
                        onBlur={() => setTouchedFields(prev => ({ ...prev, [fieldKey(index, "relationship")]: true }))}
                        className={`mt-1 w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 ${
                          errorFor(person, "relationship", index) ? "border-red-400" : "border-border"
                        }`}
                      >
                        <option value="">— Choisir —</option>
                        {RELATION_OPTIONS.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                      {errorFor(person, "relationship", index) && <p className="mt-1 text-xs text-red-500">{errorFor(person, "relationship", index)}</p>}
                    </div>
                  </div>

                  {person.relationship === "Autre" && (
                    <div>
                      <Label className="text-xs font-medium">Précisez la relation <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="Ex : Nounou, ami de la famille..."
                        value={person.otherRelationship ?? ""}
                        onChange={(e) => handlePersonChange(index, "otherRelationship", e.target.value)}
                        onBlur={() => setTouchedFields(prev => ({ ...prev, [fieldKey(index, "otherRelationship")]: true }))}
                        className={`mt-1 h-9 text-sm ${errorFor(person, "otherRelationship", index) ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                      />
                      {errorFor(person, "otherRelationship", index) && <p className="mt-1 text-xs text-red-500">{errorFor(person, "otherRelationship", index)}</p>}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium">Téléphone <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="Ex : 0634567890"
                        inputMode="tel"
                        value={person.phone}
                        onChange={(e) => handlePersonChange(index, "phone", normalizePhone(e.target.value))}
                        onBlur={() => setTouchedFields(prev => ({ ...prev, [fieldKey(index, "phone")]: true }))}
                        className={`mt-1 h-9 text-sm ${errorFor(person, "phone", index) ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                      />
                      {errorFor(person, "phone", index) && <p className="mt-1 text-xs text-red-500">{errorFor(person, "phone", index)}</p>}
                    </div>
                    <div>
                      <Label className="text-xs font-medium">CIN <span className="text-red-500">*</span></Label>
                      <Input
                        placeholder="Ex : AB123456"
                        value={person.cin}
                        onChange={(e) => handlePersonChange(index, "cin", e.target.value)}
                        onBlur={() => setTouchedFields(prev => ({ ...prev, [fieldKey(index, "cin")]: true }))}
                        className={`mt-1 h-9 text-sm ${errorFor(person, "cin", index) ? "border-red-400 focus-visible:ring-red-300" : ""}`}
                      />
                      {errorFor(person, "cin", index) && <p className="mt-1 text-xs text-red-500">{errorFor(person, "cin", index)}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-muted-foreground italic">
            Seules les personnes listées seront autorisées à récupérer l&apos;enfant. Une pièce d&apos;identité sera exigée.
          </p>
        </div>
      )}
    </div>
  )
}
