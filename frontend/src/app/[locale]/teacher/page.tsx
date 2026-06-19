"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { apiClient } from "@/lib/api"
import { formatLocalDateKey } from "@/lib/date-local"
import { getSessionSnapshot } from "@/lib/auth-session"
import { AlertTriangle, Camera, Check, CheckCircle, Hand, LayoutGrid, Loader2, XCircle } from "lucide-react"
import { InlineAlert } from "@/components/ui/inline-alert"
import { notifyError, notifySuccess } from "@/lib/feedback"
import { useTeacherClass } from "@/components/teacher/teacher-class-context"
import { childKey } from "@/lib/child-id"
import { saveChildDailyResume } from "@/lib/teacher-resume-sync"
import { statsFromAttendanceMap } from "@/lib/teacher-class-day-stats"
import { presenceBadgeVariant } from "@/lib/design/status-badges"
import { ResumeMetricIcon, ResumeSectionIcon } from "@/components/resume-metric-icon"

// ── Types ─────────────────────────────────────────────────────────────────────
type Enfant = {
  id: string
  prenom?: string | null
  nom?: string | null
  allergies?: string[] | null
  photoUrl?: string | null
}

type ResumeForm = {
  appetit: "Bien" | "Moyen" | "Mal"
  humeur: "Bonne" | "Moyenne" | "Mauvaise"
  sieste: "Courte" | "Moyenne" | "Longue"
  participation: "Bonne" | "Moyenne" | "Faible"
  message: string
}

const DEFAULT_FORM: ResumeForm = {
  appetit: "Bien",
  humeur: "Bonne",
  sieste: "Moyenne",
  participation: "Bonne",
  message: "",
}

// ── Enum mappers ──────────────────────────────────────────────────────────────
const toAppetitEnum     = (v: ResumeForm["appetit"])      => v === "Bien"   ? "Bon"      : v === "Moyen"    ? "Moyen"   : "Faible"
const toHumeurEnum      = (v: ResumeForm["humeur"])       => v === "Bonne"  ? "Bon"      : v === "Moyenne"  ? "Moyen"   : "Difficile"
const toSiesteEnum      = (v: ResumeForm["sieste"])       => v === "Courte" ? "Moyen"    : v === "Moyenne"  ? "Bon"     : "Excellent"
const toParticipationEnum = (v: ResumeForm["participation"]) => v === "Bonne" ? "Bon"   : v === "Moyenne"  ? "Moyen"   : "Faible"

const fromAppetitEnum     = (v?: string): ResumeForm["appetit"]      => v === "Bon" ? "Bien" : v === "Faible" ? "Mal"      : "Moyen"
const fromHumeurEnum      = (v?: string): ResumeForm["humeur"]       => v === "Bon" ? "Bonne": v === "Difficile" ? "Mauvaise" : "Moyenne"
const fromSiesteEnum      = (v?: string): ResumeForm["sieste"]       => v === "Excellent" ? "Longue" : v === "Moyen" ? "Courte" : "Moyenne"
const fromParticipationEnum = (v?: string): ResumeForm["participation"] => v === "Bon" ? "Bonne" : v === "Faible" ? "Faible" : "Moyenne"

// ── Component ─────────────────────────────────────────────────────────────────
export default function TeacherDashboard() {
  const t = useTranslations("teacher.dashboard")
  const params = useParams()
  const locale = (params?.locale as string) ?? "fr"

  const { selectedClass: teacherClass, selectedClassId, teacherName } = useTeacherClass()
  const [children,      setChildren]      = useState<Enfant[]>([])
  const [currentChildIndex, setCurrentChildIndex] = useState(0)
  const [attendanceData, setAttendanceData] = useState<Record<string, "Present" | "Absent">>({})
  const [childResumes,  setChildResumes]  = useState<Record<string, { id: string }>>({})

  // FIX: per-child form state — prevents values leaking between children
  const [childForms, setChildForms] = useState<Record<string, ResumeForm>>({})

  const [dataLoading,   setDataLoading]   = useState(false)
  const [loadError,     setLoadError]     = useState<string | null>(null)   // blocks page
  const [navHint, setNavHint] = useState<string | null>(null)
  const [savingResume,  setSavingResume]  = useState(false)
  const [viewMode, setViewMode] = useState<"individual" | "overview">("individual")

  const currentChild = children[currentChildIndex] ?? null
  const today = formatLocalDateKey(new Date())
  const now   = new Date()

  // Per-child form helpers
  const getForm = (childId: string): ResumeForm => childForms[childKey(childId)] ?? DEFAULT_FORM
  const patchForm = (childId: string, patch: Partial<ResumeForm>) => {
    const ck = childKey(childId)
    setChildForms(prev => ({ ...prev, [ck]: { ...(prev[ck] ?? DEFAULT_FORM), ...patch } }))
  }

  // ── Load data for selected class ───────────────────────────────────────────
  useEffect(() => {
    if (!selectedClassId) return
    const classeId = selectedClassId
    let cancelled = false

    async function loadClassData() {
      try {
        setDataLoading(true)
        setLoadError(null)
        setCurrentChildIndex(0)
        setChildren([])
        setAttendanceData({})
        setChildResumes({})
        setChildForms({})

        const enfantsRes = await apiClient.getClassWithChildren(classeId)
        const enfants = enfantsRes.data?.enfants ?? []
        if (!cancelled) setChildren(enfants)

        let allPresences: any[] = []
        let page = 1
        let hasMore = true
        while (hasMore && !cancelled) {
          const presRes = await apiClient.getPresences(classeId, today, page, 100)
          const items = presRes.data?.items ?? presRes.data?.data ?? []
          if (!Array.isArray(items) || items.length === 0) {
            hasMore = false
            break
          }
          allPresences = [...allPresences, ...items]
          if (!(presRes.data?.hasNext ?? false) || items.length < 100) hasMore = false
          else page++
        }
        if (!cancelled) {
          const map: Record<string, "Present" | "Absent"> = {}
          for (const p of allPresences) {
            const id = p.enfantId || p.enfant?.id
            if (id && p.statut) map[childKey(id)] = p.statut
          }
          setAttendanceData(map)
        }

        const resumesRes = await apiClient.getResumes(classeId, today)
        const resumes = resumesRes.data?.data ?? resumesRes.data ?? []
        if (!cancelled && Array.isArray(resumes)) {
          const resumeMap: Record<string, { id: string }> = {}
          const formsMap: Record<string, ResumeForm> = {}
          for (const r of resumes) {
            const eid = r.enfantId ?? r.enfant?.id
            if (eid == null || !r.id) continue
            const key = childKey(eid)
            resumeMap[key] = { id: String(r.id) }
            formsMap[key] = {
              appetit: fromAppetitEnum(r.appetit),
              humeur: fromHumeurEnum(r.humeur),
              sieste: fromSiesteEnum(r.sieste),
              participation: fromParticipationEnum(r.participation),
              message:
                Array.isArray(r.observations) && r.observations.length > 0
                  ? typeof r.observations[0] === "string"
                    ? r.observations[0]
                    : (r.observations[0]?.observation ?? "")
                  : "",
            }
          }
          setChildResumes(resumeMap)
          setChildForms(formsMap)
        }
      } catch (e: any) {
        console.error("[Teacher] loadClassData error", e)
        console.error("[Teacher] impossible_to_load_data_context", {
          locale,
          today,
          classeId,
          auth: getSessionSnapshot(),
          status: e?.response?.status ?? null,
          endpoint: e?.config?.url ?? null,
        })
        if (!cancelled) {
          if (e?.response?.status === 401) {
            setLoadError("Session expirée. Merci de vous reconnecter.")
            if (typeof window !== "undefined") {
              const pathname = window.location.pathname || ""
              window.location.href = `/${pathname.startsWith("/ar") ? "ar" : "fr"}`
            }
          } else {
            setLoadError("Impossible de charger les données")
          }
        }
      } finally {
        if (!cancelled) setDataLoading(false)
      }
    }

    void loadClassData()
    return () => {
      cancelled = true
    }
  }, [selectedClassId, today, locale])

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handlePresence = async (presence: "Present" | "Absent") => {
    if (!currentChild || !teacherClass) return
    const ck = childKey(currentChild.id)
    if (attendanceData[ck] !== undefined) {
      notifyError("La présence a déjà été enregistrée pour cet enfant aujourd'hui.")
      return
    }
    setNavHint(null)
    try {
      await apiClient.recordPresences({
        classeId: teacherClass.id,
        date: today,
        presences: [{
          enfantId: currentChild.id,
          statut: presence,
          arriveeA: presence === "Present" ? new Date().toTimeString().slice(0, 5) : null,
          departA: null,
        }],
      })
      setAttendanceData(prev => ({ ...prev, [ck]: presence }))
      notifySuccess(`Présence enregistrée — ${currentChild.prenom ?? ""} ${currentChild.nom ?? ""}`.trim())
    } catch (e) {
      console.error("[Teacher] handlePresence error", e)
      notifyError("Erreur lors de l'enregistrement de la présence")
    }
  }

  const handleSaveDailySummary = async () => {
    if (!teacherClass || !currentChild) return
    const ck = childKey(currentChild.id)
    const form = getForm(ck)
    const resumePayload = {
      appetit:       toAppetitEnum(form.appetit),
      humeur:        toHumeurEnum(form.humeur),
      sieste:        toSiesteEnum(form.sieste),
      participation: toParticipationEnum(form.participation),
      observations:  form.message ? [form.message] : [],
    }
    setSavingResume(true)
    setNavHint(null)
    try {
      const resumeId = await saveChildDailyResume({
        classeId: teacherClass.id,
        enfantId: String(currentChild.id),
        dateYmd: today,
        existingResumeId: childResumes[ck]?.id ?? null,
        payload: resumePayload,
      })
      setChildResumes(prev => ({ ...prev, [ck]: { id: resumeId } }))
      notifySuccess("Résumé de journée enregistré avec succès")
    } catch (e: unknown) {
      console.error("[Teacher] handleSaveDailySummary error", e)
      const ax = e as { response?: { data?: { message?: unknown } }; message?: string }
      const msg = ax?.response?.data?.message || ax?.message || "Erreur lors de l'enregistrement"
      const msgStr = Array.isArray(msg) ? msg.join(", ") : String(msg)
      notifyError(msgStr)
    } finally {
      setSavingResume(false)
    }
  }

  const handleNext = () => {
    if (!currentChild) return
    if (!canLeaveCurrentChild) {
      const ck = childKey(currentChild.id)
      if (attendanceData[ck] === undefined) setNavHint(t("reviewNavNeedPresence"))
      else setNavHint(t("reviewNavNeedResume"))
      return
    }
    if (currentChildIndex < children.length - 1) {
      setCurrentChildIndex(i => i + 1)
      setNavHint(null)
    }
  }

  const handlePrevious = () => {
    if (currentChildIndex > 0) setCurrentChildIndex(i => i - 1)
  }

  // ── Derived state ─────────────────────────────────────────────────────────
  const isAllProcessed       = children.length > 0 && children.every(e => {
    const ck = childKey(e.id)
    const att = attendanceData[ck]
    if (att === undefined) return false
    if (att === "Absent") return true
    return !!childResumes[ck]
  })
  const currentCk             = currentChild ? childKey(currentChild.id) : ""
  const hasPresenceForCurrent = !!(currentChild && attendanceData[currentCk] !== undefined)
  const hasResumeForCurrent   = !!(currentChild && childResumes[currentCk])
  const attCurrent            = currentChild ? attendanceData[currentCk] : undefined
  const canLeaveCurrentChild  = !!currentChild && attCurrent !== undefined && (attCurrent === "Absent" || !!childResumes[currentCk])
  const progressPercent       = children.length > 0 ? ((currentChildIndex + 1) / children.length) * 100 : 0
  /** Résumé journée uniquement lorsque chaque enfant a été traité (présence + résumé si présent). */
  const canNavigateToSummary  = isAllProcessed
  const reviewNavHint         = !currentChild ? null
    : attCurrent === undefined ? t("reviewNavNeedPresence")
    : attCurrent === "Present" && !childResumes[currentCk] ? t("reviewNavNeedResume")
    : isAllProcessed ? t("reviewNavAllDone")
    : null
  const currentForm           = currentChild ? getForm(currentCk) : DEFAULT_FORM

  // ── Guards ────────────────────────────────────────────────────────────────
  if (dataLoading) return <p className="p-6 text-sm text-gray-600">{t("loading")}</p>
  if (loadError) return <p className="p-6 text-sm text-red-600">{loadError}</p>
  if (!teacherClass) return null
  if (!children.length) {
    return <p className="p-6 text-sm text-gray-600">{t("noChildrenInClass", { className: teacherClass.nom })}</p>
  }

  const dateLabel = now.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  // ── Overview mode ─────────────────────────────────────────────────────────
  if (viewMode === "overview") {
    const { present: nbPresent, absent: nbAbsent, resumes: nbResumes } =
      statsFromAttendanceMap(attendanceData, childResumes)

    return (
      <div className="space-y-6 max-w-6xl mx-auto px-4 md:px-6 lg:px-0 py-6 md:py-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <div>
            {teacherName && (
              <p className="text-sm font-bold text-gray-900 mb-0.5 flex items-center gap-1.5">
                <Hand className="h-4 w-4 text-sky-600 shrink-0" aria-hidden />
                Bonjour, {teacherName} !
              </p>
            )}
            <h1 className="text-2xl font-bold text-gray-900">{teacherClass.nom}</h1>
            <p className="text-xs text-gray-500 mt-0.5 capitalize">{dateLabel}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <Button variant="outline" size="sm" onClick={() => { setViewMode("individual"); setNavHint(null) }} className="text-xs">
              Vue individuelle
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
            <p className="text-2xl font-bold pp-text-success">{nbPresent}</p>
            <p className="text-xs text-gray-500 mt-0.5">Présents</p>
          </div>
          <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-[var(--status-rejected-text)]">{nbAbsent}</p>
            <p className="text-xs text-gray-500 mt-0.5">Absents</p>
          </div>
          <div className="rounded-xl border bg-white p-3 text-center shadow-sm">
            <p className="text-2xl font-bold text-sky-600">{nbResumes}</p>
            <p className="text-xs text-gray-500 mt-0.5">Résumés faits</p>
          </div>
        </div>

        {/* Children grid — click to jump to individual view */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {children.map((child, idx) => {
            const ck = childKey(child.id)
            const presence  = attendanceData[ck]
            const hasResume = !!childResumes[ck]
            const presenceLabel = presence === "Present" ? "Présent" : presence === "Absent" ? "Absent" : "Non marqué"

            return (
              <div
                key={child.id}
                className="rounded-xl border bg-white p-3 shadow-sm flex flex-col items-center gap-2 cursor-pointer hover:border-sky-300 hover:shadow-md transition-all"
                onClick={() => { setCurrentChildIndex(idx); setViewMode("individual"); setNavHint(null) }}
              >
                <div className="h-10 w-10 rounded-full bg-sky-500 text-white flex items-center justify-center text-lg font-bold flex-shrink-0 overflow-hidden">
                  {(child as any).photoUrl
                    ? <img src={(child as any).photoUrl} alt="" className="w-full h-full object-cover" />
                    : child.prenom?.[0] ?? "?"
                  }
                </div>
                <p className="text-xs font-semibold text-center text-gray-900 leading-tight line-clamp-2">
                  {`${child.prenom ?? ""} ${child.nom ?? ""}`.trim()}
                </p>
                <Badge variant={presenceBadgeVariant(presence)} className="text-[10px]">
                  {presenceLabel}
                </Badge>
                {presence !== "Absent" && hasResume && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full border bg-sky-50 text-sky-700 border-sky-200 font-medium inline-flex items-center gap-0.5">
                    Résumé <Check className="w-3 h-3" aria-hidden />
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {canNavigateToSummary && (
          <div className="flex justify-end">
            <Link href={`/${locale}/teacher/summary`}>
              <Button className="flex-1">{t("summaryCta")} →</Button>
            </Link>
          </div>
        )}
      </div>
    )
  }

  // ── Individual mode ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-6xl mx-auto px-4 md:px-6 lg:px-0 py-6 md:py-8">

      {/* Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          {teacherName && (
            <p className="text-base font-bold text-gray-900 mb-0.5 flex items-center gap-1.5">
              <Hand className="h-4 w-4 text-sky-600 shrink-0" aria-hidden />
              Bonjour, {teacherName} !
            </p>
          )}
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{teacherClass.nom}</h1>
          <p className="text-xs text-gray-600 mt-0.5">{children.length} {children.length > 1 ? "élèves" : "élève"}</p>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{dateLabel}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Link href={`/${locale}/teacher/summary`}>
            <Button variant="outline" size="sm" className="text-xs gap-1.5 border-sky-200 text-sky-800">
              <Camera className="w-3.5 h-3.5" aria-hidden />
              <span className="hidden sm:inline">{t("photosCta")}</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setViewMode("overview"); setNavHint(null) }}
            className="text-xs gap-1.5"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Vue classe</span>
          </Button>
          <Button
            variant="outline"
            className="rounded-lg bg-transparent border border-gray-300 font-medium text-xs md:text-sm"
            onClick={() => setViewMode("overview")}
          >
            ← Retour
          </Button>
        </div>
      </div>

      {navHint ? (
        <InlineAlert variant="info" onDismiss={() => setNavHint(null)}>
          {navHint}
        </InlineAlert>
      ) : null}

      {/* Main layout */}
      <div className="mt-2 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Child card */}
        <Card className="border border-gray-200 shadow-sm rounded-2xl lg:col-span-1">
          <CardContent className="pt-4 flex flex-col gap-4">
            {/* Avatar + name */}
            <div className="flex flex-col items-center gap-2 pb-2">
              <div className="h-24 w-24 rounded-full overflow-hidden bg-sky-500 text-white flex items-center justify-center text-3xl font-bold flex-shrink-0 border-4 border-sky-100 shadow-sm">
                {(currentChild as any)?.photoUrl
                  ? <img src={(currentChild as any).photoUrl} alt={currentChild?.prenom ?? ""} className="w-full h-full object-cover" />
                  : currentChild?.prenom?.[0]?.toUpperCase() ?? "?"
                }
              </div>
              <div className="text-center">
                <h2 className="text-lg font-bold text-gray-900">
                  {`${currentChild?.prenom ?? ""} ${currentChild?.nom ?? ""}`.trim()}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{teacherClass.nom}</p>
              </div>
            </div>

            {currentChild && (
              <>
                {/* Presence buttons */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="success"
                    onClick={() => handlePresence("Present")}
                    disabled={attendanceData[currentCk] !== undefined}
                    className="flex-1 text-sm font-semibold py-2 rounded-lg"
                  >
                    <CheckCircle className="w-4 h-4 mr-1.5" />{t("presentButton")}
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => handlePresence("Absent")}
                    disabled={attendanceData[currentCk] !== undefined}
                    className="flex-1 text-sm font-semibold py-2 rounded-lg"
                  >
                    <XCircle className="w-4 h-4 mr-1.5" />{t("absentButton")}
                  </Button>
                </div>

                {/* Status badge */}
                <div className="text-xs">
                  {attendanceData[currentCk] === "Absent" ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border pp-surface-rejected text-xs">
                      Absent — pas de résumé requis
                    </span>
                  ) : attendanceData[currentCk] !== undefined && childResumes[currentCk] ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border pp-surface-success text-xs">
                      <Check className="w-3 h-3" aria-hidden /> Présence & résumé faits
                    </span>
                  ) : attendanceData[currentCk] !== undefined ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border pp-surface-review text-xs">
                      Présence faite — résumé à renseigner
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)] border-[var(--status-neutral-border)] text-xs">
                      Présence à enregistrer
                    </span>
                  )}
                </div>
              </>
            )}

            {/* Allergies warning */}
            {Array.isArray(currentChild?.allergies) && currentChild.allergies.length > 0 && (
              <p className="text-xs font-bold text-red-600 flex items-start gap-1.5">
                <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
                {currentChild.allergies.join(", ")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Resume card */}
        <Card className="border border-gray-200 shadow-sm rounded-2xl lg:col-span-2">
          <CardContent className="pt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base md:text-lg font-bold text-gray-900">{t("daySummaryTitle")}</h2>
              {hasResumeForCurrent && attendanceData[currentCk] !== "Absent" && (
                <span className="text-xs bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded-full font-medium">
                  Modifiable
                </span>
              )}
            </div>

            {/* Absent — no resume */}
            {currentChild && attendanceData[currentCk] === "Absent" ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-center">
                <ResumeSectionIcon name="home" className="text-gray-400" />
                <p className="text-sm font-semibold text-gray-700">
                  {currentChild.prenom} est absent(e) aujourd'hui
                </p>
                <p className="text-xs text-gray-400">Le résumé journalier ne s'applique pas aux enfants absents.</p>
              </div>
            ) : (<>

            {/* 4 metric cards — each reads from per-child form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Appétit */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col items-center gap-2">
                <ResumeMetricIcon kind="appetit" value={currentForm.appetit} className="text-emerald-600" />
                <p className="text-xs text-gray-500">Appétit</p>
                <p className="text-lg font-bold text-emerald-600">{currentForm.appetit}</p>
                <div className="mt-1 flex gap-2">
                  {(["Bien", "Moyen", "Mal"] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => currentChild && patchForm(currentChild.id, { appetit: opt })}
                      className={`px-2 py-1 text-xs rounded-full border ${currentForm.appetit === opt ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-gray-700 border-gray-300"}`}
                    >{opt}</button>
                  ))}
                </div>
              </div>

              {/* Humeur */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col items-center gap-2">
                <ResumeMetricIcon kind="humeur" value={currentForm.humeur} className="text-sky-600" />
                <p className="text-xs text-gray-500">Humeur</p>
                <p className="text-lg font-bold text-sky-600">{currentForm.humeur}</p>
                <div className="mt-1 flex gap-2">
                  {(["Bonne", "Moyenne", "Mauvaise"] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => currentChild && patchForm(currentChild.id, { humeur: opt })}
                      className={`px-2 py-1 text-xs rounded-full border ${currentForm.humeur === opt ? "bg-sky-500 text-white border-sky-500" : "bg-white text-gray-700 border-gray-300"}`}
                    >{opt}</button>
                  ))}
                </div>
              </div>

              {/* Sieste */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col items-center gap-2">
                <ResumeMetricIcon kind="sieste" value={currentForm.sieste} className="text-gray-700" />
                <p className="text-xs text-gray-500">Sieste</p>
                <p className="text-lg font-bold text-gray-700">{currentForm.sieste}</p>
                <div className="mt-1 flex gap-2">
                  {(["Courte", "Moyenne", "Longue"] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => currentChild && patchForm(currentChild.id, { sieste: opt })}
                      className={`px-2 py-1 text-xs rounded-full border ${currentForm.sieste === opt ? "bg-gray-700 text-white border-gray-700" : "bg-white text-gray-700 border-gray-300"}`}
                    >{opt}</button>
                  ))}
                </div>
              </div>

              {/* Participation */}
              <div className="rounded-2xl border border-gray-100 bg-white p-4 flex flex-col items-center gap-2">
                <ResumeMetricIcon kind="participation" value={currentForm.participation} className="text-emerald-600" />
                <p className="text-xs text-gray-500">Participation</p>
                <p className="text-lg font-bold text-emerald-600">{currentForm.participation}</p>
                <div className="mt-1 flex gap-2">
                  {(["Bonne", "Moyenne", "Faible"] as const).map(opt => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => currentChild && patchForm(currentChild.id, { participation: opt })}
                      className={`px-2 py-1 text-xs rounded-full border ${currentForm.participation === opt ? "bg-emerald-500 text-white border-emerald-500" : "bg-white text-gray-700 border-gray-300"}`}
                    >{opt}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* Observation */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Observation (optionnel)</label>
              <Input
                value={currentForm.message}
                onChange={e => currentChild && patchForm(currentChild.id, { message: e.target.value })}
                placeholder="Message pour les parents…"
                className="text-sm"
              />
            </div>

            {/* Save footer */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-gray-400">
                {hasResumeForCurrent
                  ? "Résumé déjà enregistré — modification possible"
                  : hasPresenceForCurrent
                  ? "Prêt à enregistrer"
                  : "Enregistrez la présence d'abord"}
              </span>
              <Button
                variant="primary"
                onClick={handleSaveDailySummary}
                disabled={savingResume || !hasPresenceForCurrent}
                className="gap-2"
              >
                {savingResume ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {savingResume ? "Enregistrement…" : hasResumeForCurrent ? "Mettre à jour" : "Valider le résumé"}
              </Button>
            </div>
            </>)}
          </CardContent>
        </Card>
      </div>

      {/* Navigation & Progress */}
      <div className="flex items-center justify-between pt-6 border-t border-gray-200 gap-2">
        <Button
          onClick={handlePrevious}
          disabled={currentChildIndex === 0}
          className="text-gray-700 border border-gray-300 rounded-lg px-3 sm:px-5 py-2 font-medium text-xs sm:text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          ← <span className="hidden sm:inline">{t("prev")}</span>
        </Button>

        <div className="flex-1 mx-2 sm:mx-8 flex items-center gap-3">
          <div className="flex-1">
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
          <span className="text-xs font-semibold text-gray-600 whitespace-nowrap">{currentChildIndex + 1} / {children.length}</span>
        </div>

        {canNavigateToSummary ? (
          <Link href={`/${locale}/teacher/summary`}>
            <Button className="rounded-lg px-4 sm:px-9 py-2 sm:py-3 font-semibold text-xs sm:text-sm flex-shrink-0">
              <span className="hidden sm:inline">{t("summaryCta")} </span>→
            </Button>
          </Link>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!canLeaveCurrentChild}
            className="rounded-lg px-4 sm:px-7 py-2 font-semibold text-xs sm:text-sm flex-shrink-0"
          >
            <span className="hidden sm:inline">{t("next")} </span>→
          </Button>
        )}
      </div>
      {viewMode === "individual" && reviewNavHint && (
        <p className={`text-center text-xs mt-2 px-2 ${isAllProcessed ? "pp-text-success" : "text-[var(--status-review-text)]"}`}>
          {reviewNavHint}
        </p>
      )}
    </div>
  )
}
