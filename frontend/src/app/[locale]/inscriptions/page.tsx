"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { AuthShell } from "@/components/auth/auth-shell"
import type { Locale } from "@/lib/i18n/config"
import StepIndicator from "@/components/inscriptions/step-indicator"
import Step1ChildInfo, { validateStep1Fields, type Step1FormData } from "@/components/inscriptions/step-1-child-info"
import Step2ParentInfo, { validateStep2Fields, type Step2FormData } from "@/components/inscriptions/step-2-parent-info"
import Step3AuthorizedPersons, { RELATION_OTHER, validateStep3Fields } from "@/components/inscriptions/step-3-authorized-persons"
import Step4HealthInfo from "@/components/inscriptions/step-4-health-info"
import Step5Regulations from "@/components/inscriptions/step-5-regulations"
import SuccessScreen from "@/components/inscriptions/success-screen"
import { apiClient } from "@/lib/api"
import { focusFirstFormError } from "@/lib/form-error-focus"
import { getDefaultChildAgePolicy } from "@/lib/child-age-policy"
import { PROFESSION_OTHER } from "@/lib/inscription-constants"
import { resolveCityValue } from "@/lib/inscription-locations"

type FormData = Step1FormData & Step2FormData & {
  sansRestriction: boolean
  authorizedPersons: { name: string; relationship: string; otherRelationship?: string; phone: string; cin: string }[]
  height: string
  weight: string
  familyHistory: string
  tagsMaladies: string[]
  tagsAllergies: string[]
  tagsIntolerances: string[]
  healthTags: string[]
  restrictionAlimentaire: string
  restrictionDetails: string
  surgicalInterventions: string
  remarks: string
  regulationsAccepted: boolean
  confirmationExacte: boolean
}

const INITIAL_FORM: FormData = {
  childFirstName: "",
  childLastName: "",
  dateOfBirth: "",
  nationalityCountry: "",
  nationalityCity: "",
  nationalityCityOther: "",
  birthCountry: "",
  birthCity: "",
  birthCityOther: "",
  currentAddress: "",
  currentAddressLine2: "",
  currentCountry: "",
  currentCity: "",
  currentCityOther: "",
  gender: "",
  fraternity: "",
  rankInFraternity: "",
  selectedActivities: [],
  classeIdSouhaitee: "",
  childPhotoBase64: "",
  childPhotoFile: "",
  motherFirstName: "",
  motherLastName: "",
  motherPhone: "",
  motherEmail: "",
  motherAddress: "",
  motherProfession: "",
  motherProfessionOther: "",
  motherCin: "",
  fatherFirstName: "",
  fatherLastName: "",
  fatherPhone: "",
  fatherEmail: "",
  fatherAddress: "",
  fatherProfession: "",
  fatherProfessionOther: "",
  fatherCin: "",
  familySituation: "",
  responsablePrincipal: "mother",
  declarationHonneur: false,
  sansRestriction: false,
  authorizedPersons: [],
  height: "",
  weight: "",
  familyHistory: "",
  tagsMaladies: [],
  tagsAllergies: [],
  tagsIntolerances: [],
  healthTags: [],
  restrictionAlimentaire: "sans_restriction",
  restrictionDetails: "",
  surgicalInterventions: "",
  remarks: "",
  regulationsAccepted: false,
  confirmationExacte: false,
}

function resolveProfession(profession: string, other: string, tp: (key: string) => string): string | undefined {
  if (!profession) return undefined
  if (profession === PROFESSION_OTHER) return other.trim() || undefined
  return tp(profession)
}

export default function InscriptionsPage() {
  const t = useTranslations("registration")
  const tv = useTranslations("registration.validation")
  const te = useTranslations("registration.errors")
  const tp = useTranslations("registration.professions")
  const tr = useTranslations("registration.pickup.relations")
  const pathname = usePathname()
  const locale: Locale = pathname?.startsWith("/ar") ? "ar" : "fr"

  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [showStepErrors, setShowStepErrors] = useState(false)
  const [stepErrors, setStepErrors] = useState<Record<string, string>>({})
  const [classes, setClasses] = useState<{ id: string; nom: string; complet?: boolean; nbEnfants?: number; capacite?: number }[]>([])
  const [classesError, setClassesError] = useState<string | null>(null)
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM)
  const agePolicyRef = useRef(getDefaultChildAgePolicy())

  useEffect(() => {
    let cancelled = false
    async function fetchClasses() {
      try {
        setClassesError(null)
        const res = await apiClient.listPublicClasses()
        const data = Array.isArray(res.data?.items)
          ? res.data.items
          : Array.isArray(res.data?.data)
          ? res.data.data
          : Array.isArray(res.data)
          ? res.data
          : []
        if (!cancelled) {
          setClasses(data.map((c: any) => ({ id: c.id, nom: c.nom, complet: c.complet, nbEnfants: c.nbEnfants, capacite: c.capacite })))
        }
      } catch (err) {
        console.error("[Inscriptions] Error loading classes", err)
        if (!cancelled) setClassesError(te("classesLoad"))
      }
    }
    fetchClasses()
    return () => { cancelled = true }
  }, [te])

  useEffect(() => {
    if (!showStepErrors) return
    focusFirstFormError(Object.keys(stepErrors))
  }, [showStepErrors, stepErrors, currentStep])

  const handleStepErrors = useCallback((errors: Record<string, string>) => {
    setStepErrors(errors)
  }, [])

  const step1ValidationMessages = {
    childFirstNameRequired: tv("childFirstNameRequired"),
    childFirstNameInvalid: tv("childFirstNameInvalid"),
    childLastNameRequired: tv("childLastNameRequired"),
    childLastNameInvalid: tv("childLastNameInvalid"),
    birthCountryRequired: tv("birthCountryRequired"),
    birthCityRequired: tv("birthCityRequired"),
    birthCityInvalid: tv("birthCityInvalid"),
    nationalityCountryRequired: tv("nationalityCountryRequired"),
    nationalityCityRequired: tv("nationalityCityRequired"),
    nationalityCityInvalid: tv("nationalityCityInvalid"),
    currentCountryRequired: tv("currentCountryRequired"),
    currentAddressRequired: tv("currentAddressRequired"),
    currentCityRequired: tv("currentCityRequired"),
    currentCityInvalid: tv("currentCityInvalid"),
    classRequired: tv("classRequired"),
    fraternityMustBeNumber: tv("fraternityMustBeNumber"),
    rankMustBeNumber: tv("rankMustBeNumber"),
    rankExceedsFraternity: (max: string) => tv("rankExceedsFraternity", { max }),
    dateRequired: tv("dateRequired"),
    dateInvalidFormat: tv("dateInvalidFormat"),
    dateInvalid: tv("dateInvalid"),
    dateTooYoung: (min: string, age: string) => tv("dateTooYoung", { min, age }),
    dateTooOld: (max: string, age: string) => tv("dateTooOld", { max, age }),
  }

  const step2ValidationMessages = {
    firstNameInvalid: tv("firstNameInvalid"),
    lastNameInvalid: tv("lastNameInvalid"),
    emailInvalid: tv("emailInvalid"),
    phoneInvalid: tv("phoneInvalid"),
    cinInvalid: tv("cinInvalid"),
    professionOtherRequired: tv("professionOtherRequired"),
    emailRequired: tv("emailRequired"),
    declarationRequired: tv("declarationRequired"),
  }

  const validateCurrentStep = (): Record<string, string> => {
    if (currentStep === 1) return validateStep1Fields(formData, agePolicyRef.current, step1ValidationMessages)
    if (currentStep === 2) return validateStep2Fields(formData, step2ValidationMessages)
    if (currentStep === 3) return validateStep3Fields(formData.authorizedPersons, formData.sansRestriction, tv)
    return {}
  }

  const handleNext = () => {
    setSubmitError(null)
    const errs = validateCurrentStep()
    setStepErrors(errs)
    if (Object.keys(errs).length > 0) {
      setShowStepErrors(true)
      return
    }
    setShowStepErrors(false)
    if (currentStep < 5) setCurrentStep(currentStep + 1)
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
      setShowStepErrors(false)
      setSubmitError(null)
    }
  }

  const handleSubmit = async () => {
    if (!formData.regulationsAccepted || !formData.confirmationExacte) {
      setSubmitError(tv("regulationsRequired"))
      return
    }
    if (!formData.declarationHonneur) {
      setSubmitError(tv("declarationRequired"))
      return
    }

    const primaryEmail = formData.motherEmail || formData.fatherEmail
    if (!primaryEmail) {
      setSubmitError(tv("emailRequired"))
      return
    }
    if (!formData.classeIdSouhaitee) {
      setSubmitError(tv("classRequired"))
      return
    }

    setSubmitError(null)

    try {
      const isArabic = pathname?.startsWith("/ar")
      const locale = isArabic ? "ar" : "fr"

      const tuteurs: any[] = []

      if (formData.motherFirstName || formData.motherLastName || formData.motherEmail) {
        tuteurs.push({
          lien: "Mere",
          prenom: formData.motherFirstName,
          nom: formData.motherLastName,
          email: formData.motherEmail || undefined,
          telephone: formData.motherPhone || undefined,
          cin: formData.motherCin || undefined,
          adresse: formData.motherAddress || undefined,
          profession: resolveProfession(formData.motherProfession, formData.motherProfessionOther, tp),
          principal: formData.responsablePrincipal === "mother",
        })
      }

      if (formData.fatherFirstName || formData.fatherLastName || formData.fatherEmail) {
        tuteurs.push({
          lien: "Pere",
          prenom: formData.fatherFirstName,
          nom: formData.fatherLastName,
          email: formData.fatherEmail || undefined,
          telephone: formData.fatherPhone || undefined,
          cin: formData.fatherCin || undefined,
          adresse: formData.fatherAddress || undefined,
          profession: resolveProfession(formData.fatherProfession, formData.fatherProfessionOther, tp),
          principal: formData.responsablePrincipal === "father",
        })
      }

      const familySituationLabel = formData.familySituation
        ? t(`parents.situations.${formData.familySituation}` as any)
        : undefined

      const payload = {
        famille: {
          emailPrincipal: primaryEmail,
          languePreferee: locale,
          adresseFacturation: formData.motherAddress || formData.fatherAddress || undefined,
          situationFamiliale: familySituationLabel,
        },
        tuteurs,
        enfant: {
          prenom: formData.childFirstName,
          nom: formData.childLastName,
          dateNaissance: formData.dateOfBirth,
          genre: formData.gender || undefined,
          nationalitePays: formData.nationalityCountry || undefined,
          nationaliteVille: resolveCityValue(
            formData.nationalityCountry,
            formData.nationalityCity,
            formData.nationalityCityOther,
          ) || undefined,
          paysNaissance: formData.birthCountry || undefined,
          villeNaissance: resolveCityValue(
            formData.birthCountry,
            formData.birthCity,
            formData.birthCityOther,
          ) || undefined,
          adresseActuelle: formData.currentAddressLine2
            ? `${formData.currentAddress}\n${formData.currentAddressLine2}`
            : formData.currentAddress,
          paysActuel: formData.currentCountry || undefined,
          villeActuelle: resolveCityValue(
            formData.currentCountry,
            formData.currentCity,
            formData.currentCityOther,
          ) || undefined,
          photoUrl: formData.childPhotoBase64 || undefined,
          fraternity: formData.fraternity || undefined,
          rankInFraternity: formData.rankInFraternity || undefined,
        },
        classeIdSouhaitee: formData.classeIdSouhaitee,
        sante: {
          taille: formData.height || undefined,
          poids: formData.weight || undefined,
          antecedentsFamiliaux: formData.familyHistory || undefined,
          tagsMaladies: formData.tagsMaladies,
          tagsAllergies: formData.tagsAllergies,
          tagsIntolerances: formData.tagsIntolerances,
          tags: formData.healthTags,
          restrictionAlimentaire: formData.restrictionAlimentaire || "sans_restriction",
          restrictionDetails: formData.restrictionDetails || undefined,
          interventionsChirurgicales: formData.surgicalInterventions || undefined,
        },
        restrictions: {
          sansRestriction: formData.sansRestriction,
          personnesAutorisees: formData.sansRestriction
            ? []
            : formData.authorizedPersons
                .filter((p) => p.name)
                .map((p) => ({
                  name: p.name,
                  relationship:
                    p.relationship === RELATION_OTHER && p.otherRelationship?.trim()
                      ? `${tr("other")} - ${p.otherRelationship.trim()}`
                      : tr(p.relationship as any),
                  phone: p.phone,
                  cin: p.cin,
                })),
        },
        commentaire: formData.remarks || undefined,
        declarationHonneur: formData.declarationHonneur,
        confirmationExacte: formData.confirmationExacte,
      }

      await apiClient.createPublicInscription(payload)
      setIsSubmitted(true)
    } catch (error: any) {
      console.error("[Inscriptions] Error submitting inscription", error)
      const status = error?.response?.status
      const raw = error?.response?.data?.message

      if (status === 413 || (typeof raw === "string" && raw.toLowerCase().includes("too large"))) {
        setSubmitError(te("photoTooLarge"))
      } else if (status === 409 || (typeof raw === "string" && raw.toLowerCase().includes("already exist"))) {
        setSubmitError(te("emailExists"))
      } else if (Array.isArray(raw)) {
        const friendly = raw.map((m: string) => {
          if (m.includes("should not exist")) return null
          if (m.includes("must be an email")) return tv("emailInvalid")
          if (m.includes("must be a valid ISO 8601")) return tv("childLastNameInvalid")
          return m
        }).filter(Boolean)
        setSubmitError(friendly.length > 0 ? friendly.join(" ") : te("checkFields"))
      } else if (typeof raw === "string") {
        setSubmitError(raw)
      } else if (!navigator.onLine) {
        setSubmitError(te("offline"))
      } else {
        setSubmitError(te("generic"))
      }
    }
  }

  const updateFormData = (data: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...data }))
  }

  const canSubmit = formData.regulationsAccepted && formData.confirmationExacte

  if (isSubmitted) return <SuccessScreen />

  return (
    <AuthShell
      locale={locale}
      title={t("title")}
      subtitle={t("subtitle")}
      maxWidth="lg"
      bareContent
      backHref={`/${locale}`}
      backLabel={t("backToLogin")}
    >
      <div className="mb-6 md:mb-8">
        <StepIndicator currentStep={currentStep} totalSteps={5} />
      </div>

      <div className="auth-card !p-4 md:!p-8">
        {submitError && (
          <div className="mb-4 p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-sm text-destructive" role="alert">
            {submitError}
          </div>
        )}
        {classesError && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900" role="status">
            {classesError}
          </div>
        )}

        {currentStep === 1 && (
          <Step1ChildInfo
            formData={formData}
            updateFormData={updateFormData}
            classes={classes}
            showErrors={showStepErrors}
            onValidationErrors={handleStepErrors}
          />
        )}
        {currentStep === 2 && (
          <Step2ParentInfo
            formData={formData}
            updateFormData={updateFormData}
            showErrors={showStepErrors}
            onValidationErrors={handleStepErrors}
          />
        )}
        {currentStep === 3 && (
          <Step3AuthorizedPersons
            formData={formData}
            updateFormData={updateFormData}
            showErrors={showStepErrors}
            onValidationErrors={handleStepErrors}
          />
        )}
        {currentStep === 4 && (
          <Step4HealthInfo formData={formData} updateFormData={updateFormData} />
        )}
        {currentStep === 5 && (
          <Step5Regulations formData={formData} updateFormData={updateFormData} />
        )}

        <div className="flex gap-3 justify-between mt-8 pt-6 border-t border-[#e8f0f6]">
          {currentStep > 1 ? (
            <Button variant="outline" onClick={handlePrevious} className="px-5 rounded-xl">
              {t("previous")}
            </Button>
          ) : (
            <span />
          )}

          {currentStep < 5 ? (
            <Button variant="auth" onClick={handleNext} className="px-6 font-semibold">
              {t("next")}
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={!canSubmit} variant="secondary" className="px-6 font-semibold rounded-xl">
              {t("submit")}
            </Button>
          )}
        </div>
      </div>

      <p className="text-center auth-footer-text mt-4">
        {t("progressHint", { current: currentStep, total: 5 })}
      </p>
    </AuthShell>
  )
}
