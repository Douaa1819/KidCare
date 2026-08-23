"use client"

import type { Dispatch, SetStateAction } from "react"
import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { MenaPhoneInput } from "@/components/ui/mena-phone-input"
import { Label } from "@/components/ui/label"
import { Baby, Check, GraduationCap, Pencil, Phone, UserPlus, Users, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DELEGATION_RELATION_CODES,
  type DelegationFormPayload,
  delegationCinMessageKey,
  delegationNomMessageKey,
  delegationPhoneMessageKey,
  delegationRelationDetailMessageKey,
  DELEGATION_PHONE_MAX_DIGITS,
  DELEGATION_PHONE_MIN_DIGITS,
  isDelegationFormValid,
  toApiDelegationBody,
} from "@/lib/delegation-form"

export type ParentChildTabChild = {
  id: string | number
  name: string
  class: string
  birthdate?: string | null
  avatar: string
  photoUrl?: string | null
  classeNbEleves?: number | null
  classeEnseignants?: { prenom?: string | null; nom?: string | null }[]
} | null

export type DelegationFormFields = DelegationFormPayload

export type AuthorizedPersonRow = { id: string; name: string; role?: string | null; phone?: string | null }

type Translate = (key: string, values?: Record<string, string | number | Date>) => string

const selectTriggerClass =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"

export type ParentChildTabPanelProps = {
  child: ParentChildTabChild | null
  dateLocale: string
  t: Translate
  formatLien: (lien?: string | null) => string
  authorizedPersons: AuthorizedPersonRow[]
  editingDelegation: string | null
  setEditingDelegation: (id: string | null) => void
  delegationForm: DelegationFormFields
  setDelegationForm: Dispatch<SetStateAction<DelegationFormFields>>
  addingDelegation: boolean
  setAddingDelegation: (v: boolean) => void
  newDelegationForm: DelegationFormFields
  setNewDelegationForm: Dispatch<SetStateAction<DelegationFormFields>>
  delegationSaving: boolean
  onStartAddDelegation: () => void
  onStartEditDelegation: (d: AuthorizedPersonRow) => void
  onSaveDelegation: (delegationId: string, body: ReturnType<typeof toApiDelegationBody>) => void | Promise<void>
  onRequestDeleteDelegation: (delegationId: string) => void
  onAddDelegation: (body: ReturnType<typeof toApiDelegationBody>) => void | Promise<void>
  onCancelAddDelegation: () => void
}

function relationLabel(t: Translate, code: DelegationFormFields["relation"]): string {
  switch (code) {
    case "Mere":
      return t("relations.Mere")
    case "Pere":
      return t("relations.Pere")
    case "Proche":
      return t("relations.Proche")
    case "Tuteur":
      return t("relations.Tuteur")
    case "Autre":
      return t("relations.Autre")
    default:
      return code
  }
}

/** Composant de module (référence stable) : évite le remontage à chaque render du parent et la perte de focus dans les champs. */
export function ParentChildTabPanel({
  child,
  dateLocale,
  t,
  formatLien,
  authorizedPersons,
  editingDelegation,
  setEditingDelegation,
  delegationForm,
  setDelegationForm,
  addingDelegation,
  newDelegationForm,
  setNewDelegationForm,
  delegationSaving,
  onStartAddDelegation,
  onStartEditDelegation,
  onSaveDelegation,
  onRequestDeleteDelegation,
  onAddDelegation,
  onCancelAddDelegation,
}: ParentChildTabPanelProps) {
  const [editShowErrors, setEditShowErrors] = useState(false)
  const [addShowErrors, setAddShowErrors] = useState(false)

  const editValid = isDelegationFormValid(delegationForm)
  const addValid = isDelegationFormValid(newDelegationForm)

  const nomErrEdit = delegationNomMessageKey(delegationForm.nom)
  const phoneKeyEdit = delegationPhoneMessageKey(delegationForm.telephone)
  const cinErrEdit = delegationCinMessageKey(delegationForm.cin)
  const relationDetailErrEdit = delegationRelationDetailMessageKey(delegationForm.relation, delegationForm.relationDetail)

  const nomErrAdd = delegationNomMessageKey(newDelegationForm.nom)
  const phoneKeyAdd = delegationPhoneMessageKey(newDelegationForm.telephone)
  const cinErrAdd = delegationCinMessageKey(newDelegationForm.cin)
  const relationDetailErrAdd = delegationRelationDetailMessageKey(newDelegationForm.relation, newDelegationForm.relationDetail)

  const showEditError = (value: string | undefined, hasError: boolean) => hasError && (editShowErrors || Boolean(value?.trim()))
  const showAddError = (value: string | undefined, hasError: boolean) => hasError && (addShowErrors || Boolean(value?.trim()))

  const translatePhoneKey = (key: NonNullable<ReturnType<typeof delegationPhoneMessageKey>>) => {
    switch (key) {
      case "delegationPhoneRequiredInline":
        return t("ui.delegationPhoneRequiredInline")
      case "delegationPhoneTooShort":
        return t("ui.delegationPhoneTooShort", { min: DELEGATION_PHONE_MIN_DIGITS })
      case "delegationPhoneTooLong":
        return t("ui.delegationPhoneTooLong", { max: DELEGATION_PHONE_MAX_DIGITS })
      case "delegationPhoneInvalid":
        return t("ui.delegationPhoneInvalid")
      default:
        return ""
    }
  }

  return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      <h2 className="text-xl font-bold text-gray-900">{t("ui.profileChildTitle")}</h2>

      <Card className="border border-sky-100 bg-white shadow-sm rounded-3xl overflow-hidden">
        <CardContent className="pt-4 pb-4 px-4 sm:px-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-sky-100 bg-sky-50">
              {child?.photoUrl ? (
                <img src={child.photoUrl} alt={child.name} className="h-full w-full object-cover" />
              ) : (
                <Baby className="w-8 h-8 text-sky-700" aria-hidden />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-gray-900">{child?.name ?? ""}</p>
              <p className="text-sm text-muted-foreground">{child?.class}</p>
              {child?.birthdate && (
                <p className="mt-0.5 text-xs text-gray-500">
                  {t("ui.bornOn", {
                    date: new Date(child.birthdate).toLocaleDateString(dateLocale, {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    }),
                  })}
                </p>
              )}
            </div>
          </div>
          {(child?.classeNbEleves != null || (child?.classeEnseignants && child.classeEnseignants.length > 0)) && (
            <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
              {child?.classeNbEleves != null && (
                <p className="text-sm text-gray-700">
                  <Users className="inline w-4 h-4 mr-1 align-text-bottom text-sky-700" aria-hidden />
                  {child.classeNbEleves > 1
                    ? t("ui.studentsInClassPlural", { count: child.classeNbEleves })
                    : t("ui.studentsInClass", { count: child.classeNbEleves })}
                </p>
              )}
              {child?.classeEnseignants && child.classeEnseignants.length > 0 && (
                <p className="text-sm text-gray-700">
                  <GraduationCap className="inline w-4 h-4 mr-1 align-text-bottom text-sky-700" aria-hidden />
                  {child.classeEnseignants.map((e, i) => (
                    <span key={i}>
                      {i > 0 ? ", " : ""}
                      {[e.prenom, e.nom].filter(Boolean).join(" ") || t("ui.teacherFallback")}
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border border-sky-100 bg-white shadow-sm rounded-3xl overflow-hidden">
        <CardHeader className="space-y-1 border-b border-sky-100 bg-sky-50/45 px-4 pb-3 pt-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-gray-900">
                <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                  <Users className="h-4 w-4" aria-hidden />
                </span>
                {t("ui.authorizedTitle")}
              </CardTitle>
              <CardDescription className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                {t("ui.authorizedSectionSubtitle")}
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              className="parent-primary-button shrink-0 rounded-xl px-3.5 text-xs font-bold text-white shadow-sm"
              onClick={() => {
                setAddShowErrors(false)
                onStartAddDelegation()
              }}
            >
              <UserPlus className="mr-1.5 h-4 w-4" aria-hidden />
              {t("ui.authorizedAddCta")}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 px-4 pb-4 pt-3 sm:px-6">
          {authorizedPersons.length === 0 && !addingDelegation && (
            <div className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 px-4 py-6 text-center">
              <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                <UserPlus className="h-5 w-5" aria-hidden />
              </div>
              <p className="text-sm font-medium text-gray-700">{t("ui.noAuthorized")}</p>
            </div>
          )}
          {authorizedPersons.map(person => (
            <div
              key={person.id}
              className="parent-card-action rounded-2xl border border-sky-100 bg-white p-3 shadow-sm"
            >
              {editingDelegation === person.id ? (
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label htmlFor={`d-nom-${person.id}`} className="text-xs text-muted-foreground">
                      {t("ui.delegationNameReq")}
                    </Label>
                    <Input
                      id={`d-nom-${person.id}`}
                      value={delegationForm.nom}
                      onChange={e => setDelegationForm(prev => ({ ...prev, nom: e.target.value }))}
                      placeholder={t("ui.phFullName")}
                      className={cn("h-9 text-sm", showEditError(delegationForm.nom, Boolean(nomErrEdit)) && "border-destructive")}
                      autoComplete="name"
                    />
                    {showEditError(delegationForm.nom, Boolean(nomErrEdit)) && nomErrEdit ? (
                      <p className="text-xs text-destructive">{t(`ui.${nomErrEdit}`)}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`d-tel-${person.id}`} className="text-xs text-muted-foreground">
                      {t("ui.delegationPhoneReq")}
                    </Label>
                    <MenaPhoneInput
                      id={`d-tel-${person.id}`}
                      value={delegationForm.telephone}
                      onChange={(telephone) => setDelegationForm(prev => ({ ...prev, telephone }))}
                      inputClassName={cn("h-9 text-sm", showEditError(delegationForm.telephone, Boolean(phoneKeyEdit)) && "border-destructive")}
                    />
                    <p className="text-[11px] text-muted-foreground">{t("ui.delegationPhoneHint")}</p>
                    {showEditError(delegationForm.telephone, Boolean(phoneKeyEdit)) && phoneKeyEdit ? (
                      <p className="text-xs text-destructive">{translatePhoneKey(phoneKeyEdit)}</p>
                    ) : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`d-cin-${person.id}`} className="text-xs text-muted-foreground">
                      {t("ui.delegationCin")}
                    </Label>
                    <Input
                      id={`d-cin-${person.id}`}
                      value={delegationForm.cin}
                      onChange={e => setDelegationForm(prev => ({ ...prev, cin: e.target.value }))}
                      placeholder={t("ui.phCin")}
                      className={cn("h-9 text-sm", showEditError(delegationForm.cin, Boolean(cinErrEdit)) && "border-destructive")}
                      autoComplete="off"
                    />
                    {showEditError(delegationForm.cin, Boolean(cinErrEdit)) && cinErrEdit ? <p className="text-xs text-destructive">{t(`ui.${cinErrEdit}`)}</p> : null}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`d-rel-${person.id}`} className="text-xs text-muted-foreground">
                      {t("ui.delegationRelation")}
                    </Label>
                    <select
                      id={`d-rel-${person.id}`}
                      value={delegationForm.relation}
                      onChange={e =>
                        setDelegationForm(prev => ({
                          ...prev,
                          relation: e.target.value as DelegationFormFields["relation"],
                          relationDetail: e.target.value === "Autre" ? prev.relationDetail : "",
                        }))
                      }
                      className={selectTriggerClass}
                    >
                      {DELEGATION_RELATION_CODES.map(code => (
                        <option key={code} value={code}>
                          {relationLabel(t, code)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {delegationForm.relation === "Autre" && (
                    <div className="space-y-1.5">
                      <Label htmlFor={`d-rel-detail-${person.id}`} className="text-xs text-muted-foreground">
                        {t("ui.delegationRelationDetailReq")}
                      </Label>
                      <Input
                        id={`d-rel-detail-${person.id}`}
                        value={delegationForm.relationDetail ?? ""}
                        onChange={e => setDelegationForm(prev => ({ ...prev, relationDetail: e.target.value }))}
                        placeholder={t("ui.phRelationDetail")}
                        className={cn("h-9 text-sm", showEditError(delegationForm.relationDetail, Boolean(relationDetailErrEdit)) && "border-destructive")}
                      />
                      {showEditError(delegationForm.relationDetail, Boolean(relationDetailErrEdit)) && relationDetailErrEdit ? (
                        <p className="text-xs text-destructive">{t(`ui.${relationDetailErrEdit}`)}</p>
                      ) : null}
                    </div>
                  )}
                  <div className="flex gap-2 pt-1">
                    <Button
                      type="button"
                      size="sm"
                      className="parent-primary-button flex-1 rounded-xl text-white"
                      disabled={delegationSaving}
                      onClick={() => {
                        if (!editValid) {
                          setEditShowErrors(true)
                          return
                        }
                        void onSaveDelegation(person.id, toApiDelegationBody(delegationForm))
                      }}
                    >
                      {!delegationSaving ? <Check className="mr-1.5 h-3.5 w-3.5" aria-hidden /> : null}
                      {delegationSaving ? "…" : t("ui.save")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="parent-soft-button flex-1 rounded-xl border-sky-200"
                      disabled={delegationSaving}
                      onClick={() => setEditingDelegation(null)}
                    >
                      {t("ui.cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{person.name}</p>
                    {person.role ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">{formatLien(person.role)}</p>
                    ) : null}
                    {person.phone ? (
                      <p className="mt-0.5 text-xs font-medium text-[#8B5CF6] flex items-center gap-1">
                        <Phone className="h-3 w-3 shrink-0" aria-hidden />
                        {person.phone}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="parent-icon-button h-8 w-8 rounded-xl border-sky-200 bg-white"
                      disabled={delegationSaving}
                      onClick={() => {
                        setEditShowErrors(false)
                        onStartEditDelegation(person)
                      }}
                      aria-label={t("ui.delegationEdit")}
                    >
                      <Pencil className="h-3.5 w-3.5 text-gray-600" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="parent-danger-button h-8 w-8 rounded-xl border-red-200 bg-red-50/70"
                      disabled={delegationSaving}
                      onClick={() => onRequestDeleteDelegation(person.id)}
                      aria-label={t("ui.delegationDelete")}
                    >
                      <X className="h-3.5 w-3.5 text-red-600" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {addingDelegation && (
            <div className="space-y-3 rounded-2xl border-2 border-dashed border-[#FFB4AA] bg-[#FFF7F5] p-3 shadow-sm">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white text-[#8B5CF6] shadow-sm">
                  <UserPlus className="h-4 w-4" aria-hidden />
                </span>
                <p className="text-sm font-bold text-gray-900">{t("ui.newAuthorized")}</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-new-nom" className="text-xs text-muted-foreground">
                  {t("ui.delegationNameReq")}
                </Label>
                <Input
                  id="d-new-nom"
                  value={newDelegationForm.nom}
                  onChange={e => setNewDelegationForm(prev => ({ ...prev, nom: e.target.value }))}
                  placeholder={t("ui.phFullName")}
                  className={cn("h-9 text-sm", showAddError(newDelegationForm.nom, Boolean(nomErrAdd)) && "border-destructive")}
                  autoComplete="name"
                />
                {showAddError(newDelegationForm.nom, Boolean(nomErrAdd)) && nomErrAdd ? <p className="text-xs text-destructive">{t(`ui.${nomErrAdd}`)}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-new-tel" className="text-xs text-muted-foreground">
                  {t("ui.delegationPhoneReq")}
                </Label>
                <MenaPhoneInput
                  id="d-new-tel"
                  value={newDelegationForm.telephone}
                  onChange={(telephone) => setNewDelegationForm(prev => ({ ...prev, telephone }))}
                  inputClassName={cn("h-9 text-sm", showAddError(newDelegationForm.telephone, Boolean(phoneKeyAdd)) && "border-destructive")}
                />
                <p className="text-[11px] text-muted-foreground">{t("ui.delegationPhoneHint")}</p>
                {showAddError(newDelegationForm.telephone, Boolean(phoneKeyAdd)) && phoneKeyAdd ? (
                  <p className="text-xs text-destructive">{translatePhoneKey(phoneKeyAdd)}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-new-cin" className="text-xs text-muted-foreground">
                  {t("ui.delegationCin")}
                </Label>
                <Input
                  id="d-new-cin"
                  value={newDelegationForm.cin}
                  onChange={e => setNewDelegationForm(prev => ({ ...prev, cin: e.target.value }))}
                  placeholder={t("ui.phCin")}
                  className={cn("h-9 text-sm", showAddError(newDelegationForm.cin, Boolean(cinErrAdd)) && "border-destructive")}
                  autoComplete="off"
                />
                {showAddError(newDelegationForm.cin, Boolean(cinErrAdd)) && cinErrAdd ? <p className="text-xs text-destructive">{t(`ui.${cinErrAdd}`)}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="d-new-rel" className="text-xs text-muted-foreground">
                  {t("ui.delegationRelation")}
                </Label>
                <select
                  id="d-new-rel"
                  value={newDelegationForm.relation}
                  onChange={e =>
                    setNewDelegationForm(prev => ({
                      ...prev,
                      relation: e.target.value as DelegationFormFields["relation"],
                      relationDetail: e.target.value === "Autre" ? prev.relationDetail : "",
                    }))
                  }
                  className={selectTriggerClass}
                >
                  {DELEGATION_RELATION_CODES.map(code => (
                    <option key={code} value={code}>
                      {relationLabel(t, code)}
                    </option>
                  ))}
                </select>
              </div>
              {newDelegationForm.relation === "Autre" && (
                <div className="space-y-1.5">
                  <Label htmlFor="d-new-rel-detail" className="text-xs text-muted-foreground">
                    {t("ui.delegationRelationDetailReq")}
                  </Label>
                  <Input
                    id="d-new-rel-detail"
                    value={newDelegationForm.relationDetail ?? ""}
                    onChange={e => setNewDelegationForm(prev => ({ ...prev, relationDetail: e.target.value }))}
                    placeholder={t("ui.phRelationDetail")}
                    className={cn("h-9 text-sm", showAddError(newDelegationForm.relationDetail, Boolean(relationDetailErrAdd)) && "border-destructive")}
                  />
                  {showAddError(newDelegationForm.relationDetail, Boolean(relationDetailErrAdd)) && relationDetailErrAdd ? (
                    <p className="text-xs text-destructive">{t(`ui.${relationDetailErrAdd}`)}</p>
                  ) : null}
                </div>
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  size="sm"
                  className="parent-primary-button flex-1 rounded-xl text-white"
                  disabled={delegationSaving}
                  onClick={() => {
                    if (!addValid) {
                      setAddShowErrors(true)
                      return
                    }
                    void onAddDelegation(toApiDelegationBody(newDelegationForm))
                  }}
                >
                  {!delegationSaving ? <UserPlus className="mr-1.5 h-3.5 w-3.5" aria-hidden /> : null}
                  {delegationSaving ? "…" : t("ui.add")}
                </Button>
                <Button type="button" variant="outline" size="sm" className="parent-soft-button flex-1 rounded-xl border-sky-200" disabled={delegationSaving} onClick={onCancelAddDelegation}>
                  {t("ui.cancel")}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
