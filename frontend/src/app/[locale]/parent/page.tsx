"use client"

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useTranslations } from "next-intl"
import { use } from "react"
import { Locale } from "@/lib/i18n/config"
import { apiClient } from "@/lib/api"
import { isAxiosError } from "axios"
import { isDelegationRelationCode, normalizeDelegationRelation, toApiDelegationBody, type DelegationFormPayload } from "@/lib/delegation-form"
import {
  mapEnfantDelegations,
  parseDelegationFromResponse,
  type DelegationRow,
} from "@/lib/delegation-api"
import { SimpleConfirmDialog } from "@/components/ui/simple-confirm-dialog"
import { ParentChildTabPanel } from "./parent-child-tab-panel"
import { ParentWelcomeCard } from "./parent-welcome-card"
import {
  readStoredEnfantId,
  useParentSelectedChild,
} from "./parent-selected-child-context"
import { RichTextDisplay } from "@/components/rich-text/rich-text-display"
import { ActivityPhotoFromApi } from "@/components/activity-photo-from-api"
import { DailyResume } from "@/types/domain"
import { formatLocalDateKey, safeDateForLocaleDisplay } from "@/lib/date-local"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Home, CheckCircle2, Baby, Utensils, CalendarDays, ChevronLeft, ChevronRight, RefreshCw, XCircle, HelpCircle, Camera, Clock, MessageSquare, Calendar, Milk, Cookie, ClipboardList, UserRound, History, Archive } from "lucide-react"
import { ResumeMetricIcon } from "@/components/resume-metric-icon"
import { presenceBadgeVariant } from "@/lib/design/status-badges"
import { toast } from "sonner"

const EMPTY_DELEGATION_FORM: DelegationFormPayload = { nom: "", telephone: "", cin: "", relation: "Autre", relationDetail: "" }

const RESUME_DAYS_PAGE_SIZE = 7
const MAX_RESUME_DAY_PAGE = 52
const TAB_IDS: Tab[] = ["home", "photos", "presence", "child", "menu", "events"]

function buildRecentMonthOptions(dateLocale: string, count = 12): { value: string; label: string }[] {
  const now = new Date()
  const options: { value: string; label: string }[] = []
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
    const label = d.toLocaleDateString(dateLocale, { month: "long", year: "numeric" })
    options.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) })
  }
  return options
}

function daysFromTodayLocal(d: Date): number {
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return Math.round((t.getTime() - x.getTime()) / 86400000)
}

type Tab = "home" | "photos" | "presence" | "child" | "menu" | "events"
type ParentEventView = "simple" | "calendar"
type ParentEventItem = {
  id: string
  date: string
  rawDate?: string | null
  title: string
  time?: string | null
  description?: string | null
  classeId?: string | null
  cost?: number | null
  currency?: string | null
}

function parentEventDateKey(ev: ParentEventItem): string {
  if (!ev.rawDate) return ""
  return formatLocalDateKey(new Date(ev.rawDate))
}
type ChildTodaySummary = {
  resume: DailyResume | null
  presenceStatus?: string | null
}

type MenuDay = {
  date: string
  entree?: string | null
  plat?: string | null
  dessert?: string | null
}

function resolveClasseId(raw: string | number | null | undefined): string | null {
  if (raw == null || String(raw).trim() === "") return null
  return String(raw)
}

/** Without a class, show nothing — avoids leaking events from another child's class. */
function filterEventsForClasse(events: ParentEventItem[], classeId: string | null): ParentEventItem[] {
  if (!classeId) return []
  return events.filter(ev => ev.classeId != null && String(ev.classeId) === classeId)
}

function buildMenusStateFromApi(rawMenus: unknown[]): {
  weekMenus: Record<string, MenuDay>
  todayMenu: MenuDay | null
} {
  const menusByDate: Record<string, MenuDay> = {}
  rawMenus.forEach((m: any) => {
    const iso = (typeof m.date === "string" ? m.date : "")?.slice(0, 10)
    if (iso) {
      menusByDate[iso] = {
        date: iso,
        entree: m.collationMatin ?? null,
        plat: m.repas ?? null,
        dessert: m.gouter ?? null,
      }
    }
  })
  const todayKey = formatLocalDateKey(new Date())
  const todayTime = new Date(`${todayKey}T12:00:00`).getTime()
  let todayMenu: MenuDay | null = menusByDate[todayKey] ?? null
  if (!todayMenu) {
    const entries = Object.values(menusByDate)
    if (entries.length > 0) {
      todayMenu = entries.reduce((best, cur) => {
        const curDist = Math.abs(new Date(`${cur.date}T12:00:00`).getTime() - todayTime)
        const bestDist = Math.abs(new Date(`${best.date}T12:00:00`).getTime() - todayTime)
        return curDist < bestDist ? cur : best
      })
    }
  }
  return { weekMenus: menusByDate, todayMenu }
}

function ParentNoClassEmpty({ message }: { message: string }) {
  return (
    <Card className="border shadow-sm rounded-2xl" style={{ borderColor: "#AEDFF7" }}>
      <CardContent className="py-10 px-4 text-center text-sm text-muted-foreground leading-relaxed">
        {message}
      </CardContent>
    </Card>
  )
}

function childAgeLabel(birthdate?: string | null): string {
  if (!birthdate) return ""
  const dob = new Date(`${birthdate.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(dob.getTime())) return ""
  const today = new Date()
  let years = today.getFullYear() - dob.getFullYear()
  let months = today.getMonth() - dob.getMonth()
  if (today.getDate() < dob.getDate()) months -= 1
  if (months < 0) { years -= 1; months += 12 }
  if (years <= 0) return `${Math.max(1, months)} mois`
  return `${years} an${years > 1 ? "s" : ""}${months > 0 ? ` ${months} mois` : ""}`
}

/** Libellés affichés (enums API ↔ saisie enseignant). */
function parentResumeAppetit(v?: string | null): string {
  switch (v) {
    case "Excellent": return "Excellent"
    case "Bon": return "Bien"
    case "Moyen": return "Moyen"
    case "Faible": return "Mal"
    case "Refus": return "Refus"
    default: return v && String(v).trim() ? String(v) : "—"
  }
}

function parentResumeHumeur(v?: string | null): string {
  switch (v) {
    case "Excellent": return "Excellente"
    case "Bon": return "Bonne"
    case "Moyen": return "Moyenne"
    case "Difficile":
    case "Tres_difficile": return "Difficile"
    default: return v && String(v).trim() ? String(v) : "—"
  }
}

function parentResumeSieste(v?: string | null): string {
  switch (v) {
    case "Excellent": return "Longue"
    case "Bon": return "Moyenne"
    case "Moyen": return "Courte"
    case "Difficile": return "Difficile"
    case "Pas_de_sieste": return "Pas de sieste"
    default: return v && String(v).trim() ? String(v) : "—"
  }
}

function parentResumeParticipation(v?: string | null): string {
  switch (v) {
    case "Excellent": return "Excellente"
    case "Bon": return "Bonne"
    case "Moyen": return "Moyenne"
    case "Faible": return "Faible"
    case "Absent": return "Absent"
    default: return v && String(v).trim() ? String(v) : "—"
  }
}

export default function ParentDashboard({ params }: { params: Promise<{ locale: Locale }> }) {
  const resolvedParams = use(params)
  const locale = resolvedParams.locale
  const dateLocale = locale === "ar" ? "ar-MA" : "fr-FR"
  const t = useTranslations("parent")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { selectedEnfantId, setSelectedEnfantId } = useParentSelectedChild()
  const [childSwitchLoading, setChildSwitchLoading] = useState(false)
  const formatLien = (lien?: string | null): string => {
    if (!lien) return "—"
    switch (lien) {
      case "Mere": return t("relations.Mere")
      case "Pere": return t("relations.Pere")
      case "Tuteur": return t("relations.Tuteur")
      case "Proche": return t("relations.Proche")
      case "GrandMere": return t("relations.GrandMere")
      case "GrandPere": return t("relations.GrandPere")
      case "Autre": return t("relations.Autre")
      default: return lien
    }
  }
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tab = searchParams.get("tab")
    return TAB_IDS.includes(tab as Tab) ? (tab as Tab) : "home"
  })

  const [child, setChild] = useState<{
    id: string | number; classeId?: string | null; name: string; class: string
    birthdate?: string | null; age?: string; avatar: string; photoUrl?: string | null
    status?: string; allergies: string[]
    classeEnseignants?: { prenom?: string | null; nom?: string | null }[]
    classeNbEleves?: number | null
  } | null>(null)

  const [parentPrenom, setParentPrenom] = useState("")
  const [tuteurs, setTuteurs] = useState<{
    id: string; prenom?: string | null; nom?: string | null; telephone?: string | null
    adresse?: string | null; email?: string | null; lien?: string | null
  }[]>([])
  const [editingProfile, setEditingProfile] = useState(false)
  const [editTelephone, setEditTelephone] = useState("")
  const [editAdresse, setEditAdresse] = useState("")
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaveMsg, setProfileSaveMsg] = useState<string | null>(null)
  const [profileSaveErr, setProfileSaveErr] = useState<string | null>(null)

  // Health state
  const [sante, setSante] = useState<Record<string, unknown> | null>(null)
  const [santeLoading, setSanteLoading] = useState(false)
  const [editingSante, setEditingSante] = useState(false)
  const [santeForm, setSanteForm] = useState<{
    medecin: string; notes: string; restrictionAlimentaire: string; tags: string[]
    allergies: { nom: string; severite?: string }[]; intolerances: { nom: string }[]
  }>({ medecin: "", notes: "", restrictionAlimentaire: "", tags: [], allergies: [], intolerances: [] })
  const [santeSaving, setSanteSaving] = useState(false)
  const [santeSaveMsg, setSanteSaveMsg] = useState<string | null>(null)
  const [santeDeleting, setSanteDeleting] = useState(false)
  // Delegation edit state
  const [editingDelegation, setEditingDelegation] = useState<string | null>(null)
  const [delegationForm, setDelegationForm] = useState<DelegationFormPayload>({ ...EMPTY_DELEGATION_FORM })
  const [addingDelegation, setAddingDelegation] = useState(false)
  const [newDelegationForm, setNewDelegationForm] = useState<DelegationFormPayload>({ ...EMPTY_DELEGATION_FORM })
  const [delegationSaving, setDelegationSaving] = useState(false)
  const [delegationDeleteTarget, setDelegationDeleteTarget] = useState<{
    enfantId: string
    delegationId: string
  } | null>(null)
  const [santeDeleteOpen, setSanteDeleteOpen] = useState(false)

  const [todayMenu, setTodayMenu] = useState<{ date: string; entree?: string | null; plat?: string | null; dessert?: string | null } | null>(null)
  const [weekMenus, setWeekMenus] = useState<Record<string, { date: string; entree?: string | null; plat?: string | null; dessert?: string | null }>>({})
  const [showMenuHistory, setShowMenuHistory] = useState(false)
  const [menuHistoryPage, setMenuHistoryPage] = useState(1)
  const [menuHistoryFilterMonth, setMenuHistoryFilterMonth] = useState("")
  const [upcomingEvents, setUpcomingEvents] = useState<ParentEventItem[]>([])
  const [pastEvents, setPastEvents] = useState<ParentEventItem[]>([])
  const [authorizedPersons, setAuthorizedPersons] = useState<DelegationRow[]>([])
  const [profileLoading, setProfileLoading] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profilIncomplet, setProfilIncomplet] = useState(false)
  const [profileIncompleteMessage, setProfileIncompleteMessage] = useState<string | null>(null)
  const [dailyMessage, setDailyMessage] = useState<string | null>(null)
  const [dailyResumeToday, setDailyResumeToday] = useState<DailyResume | null>(null)
  const [presenceOnToday, setPresenceOnToday] = useState<{ statut: string } | null>(null)
  const [presences, setPresences] = useState<any[]>([])
  const [presencePage, setPresencePage] = useState(1)
  const [presenceTotal, setPresenceTotal] = useState(0)
  const [presenceLoading, setPresenceLoading] = useState(false)
  const presencePageSize = 20
  // Filter: YYYY-MM (e.g. "2026-03"), empty = all
  const now = new Date()
  const [presenceFilterMonth, setPresenceFilterMonth] = useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,"0")}`)

  const [todayResumeLoading, setTodayResumeLoading] = useState(false)
  const [resumeRefreshTick, setResumeRefreshTick] = useState(0)

  /** Jour affiché dans l’onglet Présence (résumé + alignement filtre historique) — toujours en date locale */
  const [presenceViewDate, setPresenceViewDate] = useState(() => {
    const requested = searchParams.get("date")
    const d = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested)
      ? new Date(`${requested}T12:00:00`)
      : new Date()
    d.setHours(0, 0, 0, 0)
    return d
  })
  const presenceViewDateKey = formatLocalDateKey(presenceViewDate)
  const [dailyResumePresenceDay, setDailyResumePresenceDay] = useState<DailyResume | null>(null)
  const [presenceStatForSelectedDay, setPresenceStatForSelectedDay] = useState<{ statut: string } | null>(null)
  const [presenceDayResumeLoading, setPresenceDayResumeLoading] = useState(false)

  const [parentActivityPhotoDay, setParentActivityPhotoDay] = useState(() => {
    const requested = searchParams.get("photoDate")
    return requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? requested : formatLocalDateKey(new Date())
  })
  const [parentEventsView, setParentEventsView] = useState<ParentEventView>("simple")
  const [pastEventsPage, setPastEventsPage] = useState(1)
  const [pastEventsFilterMonth, setPastEventsFilterMonth] = useState("")
  const [parentEventsMonth, setParentEventsMonth] = useState(() => {
    const d = new Date()
    return new Date(d.getFullYear(), d.getMonth(), 1)
  })
  const [parentClassActivityPhotos, setParentClassActivityPhotos] = useState<
    { id: string; mimeType?: string; legende?: string | null }[]
  >([])
  const [parentClassActivityPhotosLoading, setParentClassActivityPhotosLoading] = useState(false)
  const [childrenTodaySummaries, setChildrenTodaySummaries] = useState<Record<string, ChildTodaySummary>>({})
  const [childrenTodayLoading, setChildrenTodayLoading] = useState(false)

  const [enfantsInFamily, setEnfantsInFamily] = useState<any[]>([])
  const [enfantsArchives, setEnfantsArchives] = useState<any[]>([])
  const enfantsInFamilyKey = enfantsInFamily.map((e: any) => String(e.id)).join("|")
  const [selectedParentEvent, setSelectedParentEvent] = useState<ParentEventItem | null>(null)
  const [parentEventDayPicker, setParentEventDayPicker] = useState<ParentEventItem[] | null>(null)

  const searchParamsRef = useRef(searchParams)
  searchParamsRef.current = searchParams

  const [parentEventsLoaded, setParentEventsLoaded] = useState(false)

  // Événements : chargement différé (ne bloque pas l'affichage du dashboard)
  useEffect(() => {
    if (profileLoading) return
    if (parentEventsLoaded && activeTab !== "events") return

    let cancelled = false
    async function loadParentEvents() {
      try {
        const eventsRes = await apiClient.listParentEvents({ page: 1, pageSize: 50 })
        const payload = eventsRes.data
        const rawEvents: any[] = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload?.items) ? payload.items : Array.isArray(payload) ? payload : []
        const nowTs = Date.now()
        const normalizedEvents = rawEvents.map((ev: { id?: string; startAt?: string; endAt?: string; titre?: string; title?: string; description?: string; classeId?: string | null }) => {
          const start = ev.startAt ? new Date(ev.startAt) : null
          const end   = ev.endAt   ? new Date(ev.endAt)   : null
          let timeLabel: string | null = null
          if (start) { const st = start.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" }); timeLabel = end ? `${st} – ${end.toLocaleTimeString(dateLocale, { hour: "2-digit", minute: "2-digit" })}` : st }
          const costVal =
            typeof (ev as { cost?: unknown }).cost === "number"
              ? (ev as { cost?: number }).cost
              : typeof (ev as { cout?: unknown }).cout === "number"
                ? (ev as { cout?: number }).cout
                : null
          const currencyVal =
            typeof (ev as { currency?: unknown }).currency === "string"
              ? (ev as { currency?: string }).currency
              : typeof (ev as { devise?: unknown }).devise === "string"
                ? (ev as { devise?: string }).devise
                : null
          return {
            id: ev.id ?? String(Math.random()),
            date: start ? start.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" }).toUpperCase() : "",
            rawDate: ev.startAt ?? null,
            title: ev.titre ?? ev.title ?? "",
            time: timeLabel,
            description: ev.description ?? null,
            classeId: ev.classeId ?? null,
            cost: costVal,
            currency: currencyVal,
            sortTs: start?.getTime() ?? 0,
            endTs: end?.getTime() ?? start?.getTime() ?? nowTs,
          }
        })
        if (!cancelled) {
          setUpcomingEvents(
            normalizedEvents
              .filter(ev => ev.endTs >= nowTs)
              .sort((a, b) => a.sortTs - b.sortTs)
              .map(ev => ({
                id: ev.id,
                date: ev.date,
                rawDate: ev.rawDate,
                title: ev.title,
                time: ev.time,
                description: ev.description,
                classeId: ev.classeId,
                cost: ev.cost,
                currency: ev.currency,
              })),
          )
          setPastEvents(
            normalizedEvents
              .filter(ev => ev.endTs < nowTs)
              .sort((a, b) => b.sortTs - a.sortTs)
              .map(ev => ({
                id: ev.id,
                date: ev.date,
                rawDate: ev.rawDate,
                title: ev.title,
                time: ev.time,
                description: ev.description,
                classeId: ev.classeId,
                cost: ev.cost,
                currency: ev.currency,
              })),
          )
          setParentEventsLoaded(true)
        }
      } catch { /* ignore */ }
    }
    void loadParentEvents()
    return () => { cancelled = true }
  }, [profileLoading, activeTab, parentEventsLoaded, dateLocale])

  // Tab/date query params only — selected child id stays in context + localStorage (not the URL).
  useEffect(() => {
    const params = new URLSearchParams(searchParamsRef.current.toString())
    params.set("tab", activeTab)
    params.delete("child")
    if (activeTab === "photos") {
      params.set("photoDate", parentActivityPhotoDay)
      params.delete("date")
    } else if (activeTab === "presence") {
      params.set("date", presenceViewDateKey)
      params.delete("photoDate")
    } else {
      params.delete("date")
      params.delete("photoDate")
    }
    const next = params.toString()
    const current = searchParamsRef.current.toString()
    if (next !== current) {
      router.replace(`/${locale}/parent?${next}`, { scroll: false })
    }
  }, [activeTab, presenceViewDateKey, parentActivityPhotoDay, locale, router])

  const prevSelectedEnfantIdRef = useRef<string | null>(null)

  const resetChildScopedTabData = (resetDates: boolean) => {
    setDailyResumeToday(null)
    setPresenceOnToday(null)
    setDailyMessage(null)
    setDailyResumePresenceDay(null)
    setPresenceStatForSelectedDay(null)
    setPresences([])
    setPresenceTotal(0)
    setParentClassActivityPhotos([])
    setTodayMenu(null)
    setWeekMenus({})
    setChildrenTodaySummaries({})
    setPastEventsPage(1)
    setMenuHistoryFilterMonth("")
    setPastEventsFilterMonth("")
    setEditingDelegation(null)
    setAddingDelegation(false)
    setDelegationForm({ ...EMPTY_DELEGATION_FORM })
    setNewDelegationForm({ ...EMPTY_DELEGATION_FORM })
    if (resetDates) {
      setPresenceViewDate(() => {
        const d = new Date()
        d.setHours(0, 0, 0, 0)
        return d
      })
      setParentActivityPhotoDay(formatLocalDateKey(new Date()))
    }
  }

  // Single source: context selectedEnfantId → page child model (no URL round-trip).
  useEffect(() => {
    if (!selectedEnfantId || enfantsInFamily.length === 0) return
    const enfant = enfantsInFamily.find(
      (e: { id?: string | number }) => String(e.id) === selectedEnfantId,
    )
    if (!enfant) return

    const prev = prevSelectedEnfantIdRef.current
    const switched = prev != null && prev !== selectedEnfantId
    prevSelectedEnfantIdRef.current = selectedEnfantId

    if (switched) {
      resetChildScopedTabData(false)
    }
    if (String(child?.id) === selectedEnfantId) {
      if (switched) setResumeRefreshTick(tk => tk + 1)
      return
    }

    setChildSwitchLoading(true)
    applyEnfantFromServer(enfant)
    setResumeRefreshTick(tk => tk + 1)
    setChildSwitchLoading(false)
  }, [selectedEnfantId, enfantsInFamilyKey])

  const applyEnfantFromServer = (enfant: any) => {
    setChild({
      id: enfant.id,
      classeId: enfant.classeId ?? null,
      name: `${enfant.prenom ?? ""} ${enfant.nom ?? ""}`.trim() || t("ui.defaultChildName"),
      class: enfant.classeNom ?? "",
      birthdate: enfant.dateNaissance ?? null,
      age: undefined,
      avatar: "",
      photoUrl: enfant.photoUrl ?? null,
      status: undefined,
      allergies: Array.isArray(enfant.allergies) ? enfant.allergies : [],
      classeEnseignants: Array.isArray(enfant.classeEnseignants) ? enfant.classeEnseignants : [],
      classeNbEleves: enfant.classeNbEleves ?? null,
    })
    if (enfant.profilSante) {
      setSante(enfant.profilSante)
      setSanteForm({
        medecin: enfant.profilSante.medecin ?? "",
        notes: enfant.profilSante.notes ?? "",
        restrictionAlimentaire: enfant.profilSante.restrictionAlimentaire ?? "",
        tags: Array.isArray(enfant.profilSante.tags) ? enfant.profilSante.tags : [],
        allergies: Array.isArray(enfant.profilSante.allergies) ? enfant.profilSante.allergies.map((a: { nom: string; severite?: string }) => ({ nom: a.nom, severite: a.severite ?? "" })) : [],
        intolerances: Array.isArray(enfant.profilSante.intolerances) ? enfant.profilSante.intolerances.map((i: { nom: string }) => ({ nom: i.nom })) : [],
      })
    } else {
      setSante(null)
      setSanteForm({ medecin: "", notes: "", restrictionAlimentaire: "", tags: [], allergies: [], intolerances: [] })
    }
    setAuthorizedPersons(mapEnfantDelegations(enfant))
  }

  const reloadDelegationsForCurrentChild = async () => {
    if (!child?.id) return
    try {
      const profileRes = await apiClient.getParentProfile()
      const enfants = Array.isArray(profileRes.data?.enfants) ? profileRes.data.enfants : []
      setEnfantsInFamily(enfants)
      const enfant = enfants.find((e: { id?: string | number }) => String(e.id) === String(child.id))
      if (enfant) setAuthorizedPersons(mapEnfantDelegations(enfant))
    } catch {
      /* garde la liste locale */
    }
  }

  const handleSelectChild = (id: string, options?: { resetDates?: boolean }) => {
    if (!enfantsInFamily.some((e: any) => String(e.id) === id)) return
    if (options?.resetDates ?? false) {
      resetChildScopedTabData(true)
    }
    setSelectedEnfantId(id)
  }

  /** Header + class id from context (same render as selector — avoids stale child state). */
  const selectedChildHeader = useMemo(() => {
    if (!selectedEnfantId) return null
    const enfant = enfantsInFamily.find((e: any) => String(e.id) === selectedEnfantId)
    if (!enfant) return null
    const name = `${enfant.prenom ?? ""} ${enfant.nom ?? ""}`.trim() || t("ui.defaultChildName")
    const classe = enfant.classeNom ?? ""
    const classeId = resolveClasseId(enfant.classeId)
    return { name, classe, classeId }
  }, [selectedEnfantId, enfantsInFamilyKey, t])

  const activeClasseId = useMemo(
    () => selectedChildHeader?.classeId ?? null,
    [selectedChildHeader],
  )

  useEffect(() => {
    let cancelled = false
    async function loadProfileAndResume() {
      try {
        setProfileLoading(true); setProfileError(null)
        const profileRes = await apiClient.getParentProfile()
        const profile = profileRes.data
        const enfants = Array.isArray(profile?.enfants) ? profile.enfants : []
        setEnfantsInFamily(enfants)
        if (!cancelled) {
          setEnfantsArchives(Array.isArray(profile?.enfantsArchives) ? profile.enfantsArchives : [])
          setProfilIncomplet(Boolean(profile?.profilIncomplet))
          setProfileIncompleteMessage(
            typeof profile?.message === "string" ? profile.message : null,
          )
        }

        const applyCommonProfileFields = () => {
          const prenom = profile?.prenom ?? profile?.tuteurs?.[0]?.prenom ?? ""
          setParentPrenom(prenom)
          const tts = Array.isArray(profile?.tuteurs) ? profile.tuteurs : []
          setTuteurs(tts)
          setEditTelephone(profile?.telephone ?? tts[0]?.telephone ?? "")
          setEditAdresse(profile?.adresse ?? tts[0]?.adresse ?? "")
        }

        if (!enfants.length) {
          if (!cancelled) {
            applyCommonProfileFields()
            setChild(null)
            setAuthorizedPersons([])
            setSante(null)
            setSanteForm({ medecin: "", notes: "", restrictionAlimentaire: "", tags: [], allergies: [], intolerances: [] })
            setWeekMenus({})
            setTodayMenu(null)
            setUpcomingEvents([])
            setPastEvents([])
          }
          return
        }

        const ids = enfants.map((e: any) => String(e.id))
        const storedId = readStoredEnfantId(ids)
        const enfant = enfants.find((e: any) => String(e.id) === storedId) ?? enfants[0]
        if (!cancelled) {
          applyCommonProfileFields()
          prevSelectedEnfantIdRef.current = null
          setSelectedEnfantId(String(enfant.id))
        }
      } catch (err: unknown) {
        if (cancelled) return
        if (isAxiosError(err)) {
          const status = err.response?.status
          const apiMessage =
            typeof err.response?.data === "object" &&
            err.response?.data !== null &&
            "message" in err.response.data &&
            typeof (err.response.data as { message?: unknown }).message === "string"
              ? (err.response.data as { message: string }).message
              : null

          if (status === 403 || status === 404) {
            setProfilIncomplet(true)
            setProfileIncompleteMessage(apiMessage ?? t("ui.profileIncomplete"))
            setEnfantsInFamily([])
            setChild(null)
            return
          }
        }
        if (process.env.NODE_ENV !== "production") {
          console.error("[parent dashboard] getParentProfile failed", err)
        }
        setProfileError(t("ui.profileLoadError"))
      } finally { if (!cancelled) setProfileLoading(false) }
    }
    loadProfileAndResume()
    return () => { cancelled = true }
  }, [locale, t, dateLocale])

  // Menus: only when selected child has a class; cleared immediately when class is missing.
  useEffect(() => {
    if (profileLoading) return
    if (!activeClasseId) {
      setTodayMenu(null)
      setWeekMenus({})
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const menusRes = await apiClient.listMenus(1, 100)
        const rawMenus: unknown[] =
          menusRes.data?.data ??
          menusRes.data?.items ??
          (Array.isArray(menusRes.data) ? menusRes.data : [])
        if (!cancelled) {
          const { weekMenus, todayMenu } = buildMenusStateFromApi(rawMenus)
          setWeekMenus(weekMenus)
          setTodayMenu(todayMenu)
        }
      } catch {
        if (!cancelled) {
          setWeekMenus({})
          setTodayMenu(null)
        }
      }
    })()
    return () => { cancelled = true }
  }, [activeClasseId, profileLoading])

  // Journal de classe du jour (carte Accueil) — rechargé au refresh / poll
  useEffect(() => {
    if (activeTab !== "home") return
    const classeId = activeClasseId
    if (!classeId) {
      setDailyMessage(null)
      return
    }
    let cancelled = false
    const todayKey = formatLocalDateKey(new Date())
    async function loadTodayClassMessage() {
      try {
        const res = await apiClient.getClassJournal(classeId as string, todayKey)
        const raw = res.data as Record<string, unknown> | null
        if (raw && typeof raw === "object" && "empty" in raw && raw.empty === true) {
          if (!cancelled) setDailyMessage(null)
          return
        }
        const journal = (raw && typeof raw === "object" && "data" in raw && raw.data && typeof raw.data === "object" ? raw.data : raw) as {
          observations?: string; activites?: string; apprentissages?: string
        } | null
        const fromObs = typeof journal?.observations === "string" ? journal.observations : ""
        const combined = [journal?.activites, journal?.apprentissages]
          .filter((p: any) => typeof p === "string" && p.trim().length > 0)
          .join(". ")
        if (!cancelled) setDailyMessage(fromObs || combined || null)
      } catch {
        if (!cancelled) setDailyMessage(null)
      }
    }
    void loadTodayClassMessage()
    return () => { cancelled = true }
  }, [activeTab, activeClasseId, resumeRefreshTick])

  const refreshResumeRef = useRef<ReturnType<typeof setInterval> | null>(null)

  function parseResumeBody(data: unknown): DailyResume | null {
    if (data == null || typeof data !== "object") return null
    let cur: unknown = data
    for (let depth = 0; depth < 8; depth++) {
      if (!cur || typeof cur !== "object") return null
      const layer = cur as Record<string, unknown>
      if (layer.empty === true) return null

      const hasMetric =
        layer.humeur != null ||
        layer.appetit != null ||
        layer.sieste != null ||
        layer.participation != null
      const hasObs = Array.isArray(layer.observations) || typeof layer.observations === "string"
      if (hasMetric || hasObs) break

      let inner: unknown
      for (const key of ["data", "resume", "payload", "result"] as const) {
        const v = layer[key]
        if (v != null && typeof v === "object" && !Array.isArray(v)) {
          inner = v
          break
        }
      }
      if (inner !== undefined) {
        cur = inner
        continue
      }
      break
    }
    if (!cur || typeof cur !== "object" || Array.isArray(cur)) return null
    const o = cur as Record<string, unknown>
    if (o.empty === true) return null

    // Normaliser observations (string, objets { observation }, etc.)
    let obsList: string[] = []
    if (Array.isArray(o.observations)) {
      obsList = o.observations.map((item: unknown) => {
        if (typeof item === "string") return item
        if (item && typeof item === "object" && "observation" in (item as object)) {
          const ob = (item as { observation?: unknown }).observation
          return typeof ob === "string" ? ob : ""
        }
        return ""
      }).filter((s: string) => s.trim().length > 0)
    } else if (typeof o.observations === "string" && o.observations.trim()) {
      obsList = [o.observations.trim()]
    }
    o.observations = obsList

    const hasContent =
      o.humeur != null ||
      o.appetit != null ||
      o.sieste != null ||
      o.participation != null ||
      obsList.length > 0
    if (!hasContent) return null
    return cur as unknown as DailyResume
  }

  const childResumePreview = (resume: DailyResume | null): string | null => {
    if (!resume) return null
    const parts = [
      resume.humeur ? `${t("ui.mood")}: ${parentResumeHumeur(resume.humeur as string)}` : null,
      resume.appetit ? `${t("ui.appetite")}: ${parentResumeAppetit(resume.appetit as string)}` : null,
      resume.sieste ? `${t("ui.nap")}: ${parentResumeSieste(resume.sieste as string)}` : null,
    ].filter(Boolean)
    if (parts.length > 0) return parts.join(" / ")
    const observation = Array.isArray(resume.observations) ? resume.observations[0] : null
    return observation ?? null
  }

  useEffect(() => {
    if (activeTab !== "home") return
    if (enfantsInFamily.length === 0) {
      setChildrenTodaySummaries({})
      return
    }
    let cancelled = false
    const todayKey = formatLocalDateKey(new Date())

    async function loadChildSummary(enfant: { id?: string | number }) {
      const enfantId = String(enfant.id)
      try {
        const [resumeRes, presRes] = await Promise.all([
          apiClient.getChildResume(enfantId, todayKey),
          apiClient.getChildPresences(enfantId, 1, 1, todayKey, todayKey).catch(() => null),
        ])
        const payload = presRes?.data as { data?: unknown[] } | undefined
        const items = Array.isArray(payload?.data) ? payload.data : []
        const row = items[0] as { statut?: string } | undefined
        return [enfantId, { resume: parseResumeBody(resumeRes.data), presenceStatus: row?.statut ?? null }] as const
      } catch {
        return [enfantId, { resume: null, presenceStatus: null }] as const
      }
    }

    async function loadChildrenTodaySummaries() {
      setChildrenTodayLoading(true)
      const primaryId = selectedEnfantId ?? String(enfantsInFamily[0]?.id ?? "")
      const primary = enfantsInFamily.filter((e: any) => String(e.id) === primaryId)
      const primaryList = primary.length > 0 ? primary : enfantsInFamily.slice(0, 1)

      const entries = await Promise.all(primaryList.map(loadChildSummary))
      if (!cancelled) {
        setChildrenTodaySummaries(Object.fromEntries(entries))
        setChildrenTodayLoading(false)
      }

      const rest = enfantsInFamily.filter(
        (e: any) => !primaryList.some((p: any) => String(p.id) === String(e.id)),
      )
      if (rest.length > 0 && !cancelled) {
        const more = await Promise.all(rest.map(loadChildSummary))
        if (!cancelled) {
          setChildrenTodaySummaries((prev) => ({ ...prev, ...Object.fromEntries(more) }))
        }
      }
    }

    void loadChildrenTodaySummaries()
    return () => {
      cancelled = true
    }
  }, [activeTab, enfantsInFamilyKey, selectedEnfantId, resumeRefreshTick, t])

  // Résumé du jour (Accueil) — même source que Présence pour « aujourd’hui »
  useEffect(() => {
    if (activeTab !== "home") return
    if (!child?.id) return
    let cancelled = false
    async function loadTodayResume() {
      setTodayResumeLoading(true)
      const enfantId = String(child!.id)
      const todayKey = formatLocalDateKey(new Date())
      try {
        const [resumeRes, presRes] = await Promise.all([
          apiClient.getChildResume(enfantId, todayKey),
          apiClient.getChildPresences(enfantId, 1, 1, todayKey, todayKey).catch(() => null),
        ])
        if (cancelled) return
        setDailyResumeToday(parseResumeBody(resumeRes.data))
        const payload = presRes?.data as { data?: unknown[] } | undefined
        const items = Array.isArray(payload?.data) ? payload.data : []
        const row = items[0] as { statut?: string } | undefined
        setPresenceOnToday(row?.statut ? { statut: row.statut } : null)
      } catch {
        if (!cancelled) {
          setDailyResumeToday(null)
          setPresenceOnToday(null)
        }
      } finally {
        if (!cancelled) setTodayResumeLoading(false)
      }
    }
    void loadTodayResume()
    return () => { cancelled = true }
  }, [activeTab, child?.id, resumeRefreshTick])

  // Photos d’activités (album de la classe — partagé pour tous les parents)
  useEffect(() => {
    if (activeTab !== "photos") return
    if (!activeClasseId) {
      setParentClassActivityPhotos([])
      return
    }
    let cancelled = false
    ;(async () => {
      setParentClassActivityPhotosLoading(true)
      setParentClassActivityPhotos([])
      try {
        const res = await apiClient.listParentClassActivityPhotos(activeClasseId, {
          date: parentActivityPhotoDay,
        })
        const data = (res.data as { data?: { id: string; mimeType?: string; legende?: string | null }[] })?.data
        if (!cancelled) setParentClassActivityPhotos(Array.isArray(data) ? data : [])
      } catch {
        if (!cancelled) setParentClassActivityPhotos([])
      } finally {
        if (!cancelled) setParentClassActivityPhotosLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [activeTab, activeClasseId, parentActivityPhotoDay])

  const photoDayTodayStr = formatLocalDateKey(new Date())
  const shiftParentActivityPhotoDay = (delta: number) => {
    setParentActivityPhotoDay(prev => {
      const d = new Date(`${prev}T12:00:00`)
      if (Number.isNaN(d.getTime())) return prev
      d.setDate(d.getDate() + delta)
      const ymd = formatLocalDateKey(d)
      if (delta > 0 && ymd > photoDayTodayStr) return photoDayTodayStr
      return ymd
    })
  }
  const goParentActivityPhotoToday = () => setParentActivityPhotoDay(photoDayTodayStr)


  // Résumé + présence pour le jour choisi dans l’onglet Présence (jours précédents inclus)
  useEffect(() => {
    if (activeTab !== "presence") return
    if (!child?.id) return
    let cancelled = false
    async function loadPresenceDay() {
      setPresenceDayResumeLoading(true)
      const enfantId = String(child!.id)
      const ymd = presenceViewDateKey
      try {
        const [resumeRes, presRes] = await Promise.all([
          apiClient.getChildResume(enfantId, ymd),
          apiClient.getChildPresences(enfantId, 1, 1, ymd, ymd).catch(() => null),
        ])
        if (cancelled) return
        setDailyResumePresenceDay(parseResumeBody(resumeRes.data))
        const payload = presRes?.data as { data?: unknown[] } | undefined
        const items = Array.isArray(payload?.data) ? payload.data : []
        const row = items[0] as { statut?: string } | undefined
        setPresenceStatForSelectedDay(row?.statut ? { statut: row.statut } : null)
      } catch {
        if (!cancelled) {
          setDailyResumePresenceDay(null)
          setPresenceStatForSelectedDay(null)
        }
      } finally {
        if (!cancelled) setPresenceDayResumeLoading(false)
      }
    }
    void loadPresenceDay()
    return () => { cancelled = true }
  }, [activeTab, child?.id, presenceViewDateKey, resumeRefreshTick])

  // Liste d’historique : même mois que le jour consulté (navigation par flèches)
  useEffect(() => {
    const [y, m] = presenceViewDateKey.split("-")
    if (y && m) {
      setPresenceFilterMonth(`${y}-${m}`)
      setPresencePage(1)
    }
  }, [presenceViewDateKey])

  // Poll every 60 s — l’enseignant peut publier le résumé / message en cours de journée
  useEffect(() => {
    if (activeTab !== "home" && activeTab !== "presence") return
    if (!child?.id) return
    if (refreshResumeRef.current) clearInterval(refreshResumeRef.current)
    refreshResumeRef.current = setInterval(() => {
      setResumeRefreshTick(t => t + 1)
    }, 60_000)
    return () => { if (refreshResumeRef.current) clearInterval(refreshResumeRef.current) }
  }, [activeTab, child?.id])

  useEffect(() => {
    if (activeTab !== "presence") return
    if (!child?.id) return
    let cancelled = false
    setPresenceLoading(true)
    const [year, month] = presenceFilterMonth ? presenceFilterMonth.split("-") : []
    const dateMin = year && month ? `${year}-${month}-01` : undefined
    const dateMax = year && month ? `${year}-${month}-${new Date(Number(year), Number(month), 0).getDate()}` : undefined
    apiClient.getChildPresences(child.id as string, presencePage, presencePageSize, dateMin, dateMax)
      .then(res => {
        if (cancelled) return
        const payload = res.data
        const items = payload?.data ?? payload?.items ?? (Array.isArray(payload) ? payload : [])
        setPresences(Array.isArray(items) ? items : [])
        setPresenceTotal(payload?.pagination?.total ?? payload?.total ?? items.length)
      })
      .catch(() => { if (!cancelled) setPresences([]) })
      .finally(() => { if (!cancelled) setPresenceLoading(false) })
    return () => { cancelled = true }
  }, [activeTab, child?.id, presencePage, presenceFilterMonth])

  // Load health when switching to child tab (runs once per enfant, not on every render)
  useEffect(() => {
    if (activeTab !== "child" || !child?.id) return
    if (editingDelegation || addingDelegation || editingSante) return
    let cancelled = false
    async function fetchSante() {
      setSanteLoading(true)
      try {
        const res = await apiClient.getChildSante(child!.id as string)
        if (!cancelled && res.data) {
          const s = res.data
          setSante(s)
          setSanteForm({
            medecin: (s.medecin as string) ?? "",
            notes: (s.notes as string) ?? "",
            restrictionAlimentaire: (s.restrictionAlimentaire as string) ?? "",
            tags: Array.isArray(s.tags) ? (s.tags as string[]) : [],
            allergies: Array.isArray(s.allergies) ? (s.allergies as {nom:string;severite?:string}[]).map(a => ({ nom: a.nom, severite: a.severite ?? "" })) : [],
            intolerances: Array.isArray(s.intolerances) ? (s.intolerances as {nom:string}[]).map(i => ({ nom: i.nom })) : [],
          })
        }
      } catch { /* 404 = no health profile yet, keep pre-populated data from profile response */ }
      finally { if (!cancelled) setSanteLoading(false) }
    }
    fetchSante()
    return () => { cancelled = true }
  }, [activeTab, child?.id, editingDelegation, addingDelegation, editingSante])

  const handleSaveProfile = async () => {
    setProfileSaveMsg(null); setProfileSaveErr(null); setProfileSaving(true)
    try {
      await apiClient.updateParentMe({ telephone: editTelephone || undefined, adresse: editAdresse || undefined })
      setTuteurs(prev => prev.map((tt, i) => i === 0 ? { ...tt, telephone: editTelephone||null, adresse: editAdresse||null } : tt))
      setProfileSaveMsg(t("ui.profileUpdated")); setEditingProfile(false)
    } catch (err: any) {
      const msg = err?.response?.data?.message
      setProfileSaveErr(typeof msg === "string" ? msg : t("ui.updateError"))
    } finally { setProfileSaving(false) }
  }

  const visibleUpcomingEvents = useMemo(
    () => filterEventsForClasse(upcomingEvents, activeClasseId),
    [upcomingEvents, activeClasseId],
  )
  const visiblePastEvents = useMemo(
    () => filterEventsForClasse(pastEvents, activeClasseId),
    [pastEvents, activeClasseId],
  )
  const allVisibleEvents = (() => {
    const byId = new Map<string, ParentEventItem>()
    for (const ev of [...visibleUpcomingEvents, ...visiblePastEvents]) byId.set(ev.id, ev)
    return Array.from(byId.values())
  })()

  const selectedEnfantForWelcome = useMemo(() => {
    if (!selectedEnfantId) return null
    return enfantsInFamily.find((e: any) => String(e.id) === selectedEnfantId) ?? null
  }, [selectedEnfantId, enfantsInFamilyKey])

  if (profileLoading) return (
    <div className="min-h-screen bg-white pb-24">
      <div className="sticky top-0 z-30 bg-white border-b border-border px-4 py-3 animate-pulse">
        <div className="h-10 bg-muted rounded-xl max-w-xs" />
      </div>
      <div className="px-4 py-6 space-y-4 max-w-lg mx-auto">
        <div className="h-32 bg-muted/60 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
          <div className="h-24 bg-muted/50 rounded-xl animate-pulse" />
        </div>
        <div className="h-40 bg-muted/40 rounded-2xl animate-pulse" />
        <p className="text-center text-sm text-muted-foreground">{t("ui.loading")}</p>
      </div>
    </div>
  )
  if (profileError) return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <Card className="w-full max-w-sm text-center p-6"><p className="text-red-600 text-sm">{profileError}</p></Card>
    </div>
  )

  // ─── Nav items ────────────────────────────────────────────────────────────
  const navItems: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: "home",     icon: <Home className="w-5 h-5" />,          label: t("nav.home") },
    { id: "photos",   icon: <Camera className="w-5 h-5" />,         label: t("nav.photos") },
    { id: "presence", icon: <CheckCircle2 className="w-5 h-5" />,  label: t("nav.presence") },
    { id: "child",    icon: <Baby className="w-5 h-5" />,          label: t("nav.child") },
    { id: "menu",     icon: <Utensils className="w-5 h-5" />,      label: t("nav.menu") },
    { id: "events",   icon: <CalendarDays className="w-5 h-5" />,  label: t("nav.events") },
  ]

  const openParentEventDetail = (ev: ParentEventItem) => {
    setParentEventDayPicker(null)
    setSelectedParentEvent(ev)
  }

  const openParentEventDay = (dayEvents: ParentEventItem[]) => {
    if (dayEvents.length === 0) return
    if (dayEvents.length === 1) {
      openParentEventDetail(dayEvents[0])
      return
    }
    setSelectedParentEvent(null)
    setParentEventDayPicker(dayEvents)
  }

  // ─── Daily Resume Cards ───────────────────────────────────────────────────
  const PresenceOnlyFallback = ({ forDate, statut }: { forDate: string; statut: string }) => {
    const stLabel = statut === "Present" ? t("ui.statusPresent") : statut === "Absent" ? t("ui.statusAbsent") : statut
    return (
      <div className="rounded-xl p-3 border space-y-1" style={{ background: "#F0FDF4", borderColor: "#BBF7D0" }}>
        <p className="text-xs text-gray-500 capitalize">
          {new Date(`${forDate}T12:00:00`).toLocaleDateString(dateLocale, { weekday: "long", day: "2-digit", month: "long" })}
        </p>
        <p className="text-sm text-gray-800">{t("ui.presenceOnlyLine", { status: stLabel })}</p>
      </div>
    )
  }

  /** Grille 4 cartes (appétit, humeur, sieste, participation) — alignée sur la saisie enseignant */
  const ResumeCards = ({ resume }: { resume: DailyResume | null }) => {
    if (!resume) return null
    const dRaw = resume.date as unknown
    const ymdPrefer =
      resume.requestedDate ??
      (typeof dRaw === "string" ? dRaw.slice(0, 10) : dRaw instanceof Date ? formatLocalDateKey(dRaw) : null)
    const dateForDisplay = safeDateForLocaleDisplay(resume.date as unknown, ymdPrefer)
    const dateLine =
      dateForDisplay != null && !Number.isNaN(dateForDisplay.getTime())
        ? dateForDisplay.toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })
        : "—"
    const shownForFallback =
      dateForDisplay != null && !Number.isNaN(dateForDisplay.getTime())
        ? dateForDisplay.toLocaleDateString(dateLocale, { weekday: "long", day: "numeric", month: "long" })
        : "—"

    const appet = parentResumeAppetit(resume.appetit as string | undefined)
    const hum = parentResumeHumeur(resume.humeur as string | undefined)
    const si = parentResumeSieste(resume.sieste as string | undefined)
    const part = parentResumeParticipation(resume.participation as string | undefined)

    const metricRows = [
      { label: t("ui.appetite"), text: appet, kind: "appetit" as const, raw: resume.appetit, color: "#FFF4ED", textColor: "#D97706" },
      { label: t("ui.mood"), text: hum, kind: "humeur" as const, raw: resume.humeur, color: "#EBF7FD", textColor: "#1A73A7" },
      { label: t("ui.nap"), text: si, kind: "sieste" as const, raw: resume.sieste, color: "#F0EEFF", textColor: "#5B4FCF" },
      { label: t("ui.participation"), text: part, kind: "participation" as const, raw: resume.participation, color: "#F0FDF4", textColor: "#16A34A" },
    ]

    return (
      <div className="space-y-3">
        {resume.isFallback && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {t("ui.resumeFallbackNotice", { shown: shownForFallback })}
          </p>
        )}
        <p className="text-xs text-gray-500 capitalize">
          {dateLine}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {metricRows.map(item => (
            <div key={item.label} className="rounded-xl p-3 flex flex-col gap-1" style={{ background: item.color, border: "1px solid rgba(0,0,0,0.06)" }}>
              <div style={{ color: item.textColor }}>
                <ResumeMetricIcon kind={item.kind} value={String(item.raw ?? "")} className="h-6 w-6" />
              </div>
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className="text-sm font-bold" style={{ color: item.textColor }}>{item.text}</p>
            </div>
          ))}
        </div>
        {resume.observations && resume.observations.length > 0 && (
          <div className="rounded-xl p-3 border" style={{ background: "rgba(174,223,247,0.2)", borderColor: "#AEDFF7" }}>
            <p className="text-xs font-medium mb-1" style={{ color: "#1A1A1A" }}>{t("ui.observations")}</p>
            <ul className="text-sm text-gray-600 space-y-0.5">
              {resume.observations.map((obs, i) => <li key={i}>• {obs}</li>)}
            </ul>
          </div>
        )}
      </div>
    )
  }

  /** Album photos de classe (date + historique) — onglet Accueil et onglet Photos */
  const ParentClassPhotosCard = () => {
    if (!activeClasseId) return null
    const atToday = parentActivityPhotoDay === photoDayTodayStr
    return (
      <Card
        id="parent-class-activity-photos"
        className="border shadow-sm rounded-2xl scroll-mt-24 md:scroll-mt-32"
        style={{ borderColor: "#AEDFF7" }}
      >
        <CardHeader className="pb-3 border-b" style={{ borderColor: "#AEDFF7" }}>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-sm font-bold text-gray-900">{t("ui.classActivitiesTitle")}</CardTitle>
              <p className="text-xs text-gray-500 mt-0.5">{t("ui.classActivitiesSubtitle")}</p>
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="parent-icon-button h-9 w-9 shrink-0 rounded-xl"
                onClick={() => shiftParentActivityPhotoDay(-1)}
                aria-label={t("ui.classActivitiesPrevDay")}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Input
                type="date"
                value={parentActivityPhotoDay}
                onChange={e => setParentActivityPhotoDay(e.target.value)}
                className="h-9 text-sm w-auto min-w-[9rem]"
                aria-label={t("ui.classActivitiesPickDay")}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="parent-icon-button h-9 w-9 shrink-0 rounded-xl"
                onClick={() => shiftParentActivityPhotoDay(1)}
                disabled={atToday}
                aria-label={t("ui.classActivitiesNextDay")}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="parent-soft-button h-9 text-xs rounded-xl shrink-0"
                onClick={goParentActivityPhotoToday}
                disabled={atToday}
              >
                {t("ui.today")}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {parentClassActivityPhotosLoading ? (
            <p className="text-sm text-gray-400 py-4">{t("ui.classActivitiesLoading")}</p>
          ) : parentClassActivityPhotos.length === 0 ? (
            <p className="text-sm text-gray-500">{t("ui.classActivitiesEmpty")}</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {parentClassActivityPhotos.map(p => (
                <div key={p.id} className="rounded-xl overflow-hidden border border-gray-100 bg-white shadow-sm">
                  <ActivityPhotoFromApi photoId={p.id} linkToFull imgClassName="w-full h-32 object-cover" />
                  {p.legende ? <p className="text-xs p-2 text-gray-600 line-clamp-2">{p.legende}</p> : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  const ArchivedChildrenCard = () => {
    if (!enfantsArchives.length) return null
    return (
      <Card className="border border-amber-100 bg-amber-50/30 shadow-sm rounded-2xl">
        <CardHeader className="pb-3 border-b border-amber-100">
          <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
            <Archive className="h-4 w-4 text-amber-700" aria-hidden />
            {t("ui.viewArchivedChildren")}
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">{t("ui.archivedProfileReadOnly")}</p>
        </CardHeader>
        <CardContent className="pt-4 space-y-2">
          {enfantsArchives.map((e: any) => (
            <div
              key={String(e.id)}
              className="rounded-xl border border-amber-100 bg-white px-3 py-2.5"
            >
              <p className="text-sm font-semibold text-gray-900">
                {`${e.prenom ?? ""} ${e.nom ?? ""}`.trim() || t("ui.defaultChildName")}
              </p>
              <p className="text-xs text-muted-foreground">
                {e.classeNom ? e.classeNom : t("ui.noClassAssigned")}
              </p>
              <p className="mt-1 text-[11px] font-medium text-amber-800">{t("ui.archivedChildLabel")}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    )
  }

  const ChildrenOverviewCards = () => {
    if (enfantsInFamily.length <= 1) return null

    const selectChildOnPage = (id: string) => {
      if (String(child?.id) !== id) handleSelectChild(id, { resetDates: false })
    }

    return (
      <Card className="border border-sky-100 bg-white shadow-sm rounded-2xl">
        <CardHeader className="pb-3 border-b border-sky-100">
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-bold text-gray-900">{t("ui.childrenOverviewTitle")}</CardTitle>
              <p className="mt-0.5 text-xs text-muted-foreground">{t("ui.childrenOverviewSubtitle")}</p>
            </div>
            {childrenTodayLoading ? (
              <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700">
                {t("ui.loading")}
              </span>
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {enfantsInFamily.map((e: any) => {
              const id = String(e.id)
              const active = id === String(child?.id)
              const name = `${e.prenom ?? ""} ${e.nom ?? ""}`.trim() || t("ui.defaultChildName")
              const classe = e.classeNom ?? e.classeId ?? "—"
              const age = childAgeLabel(e.dateNaissance)
              const summary = childrenTodaySummaries[id]
              const resumeLine = childResumePreview(summary?.resume ?? null)
              const status = summary?.presenceStatus ?? null
              const statusLabel = status === "Present"
                ? t("ui.statusPresent")
                : status === "Absent"
                ? t("ui.statusAbsent")
                : t("ui.unknownStatus")

              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectChildOnPage(id)}
                  aria-pressed={active}
                  className={`parent-card-action rounded-2xl border p-3 text-left ${
                    active ? "border-sky-400 bg-sky-50/70 ring-2 ring-sky-100" : "border-sky-100 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-sky-100 bg-sky-50">
                      {e.photoUrl ? <img src={e.photoUrl} alt={name} className="h-full w-full object-cover" /> : <UserRound className="h-6 w-6 text-sky-700" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-bold text-gray-900">{name}</span>
                        {active ? <CheckCircle2 className="h-4 w-4 shrink-0 text-sky-600" aria-hidden /> : null}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-gray-500">{classe}</span>
                      <span className="mt-0.5 block truncate text-[11px] text-gray-400">{age || (e.dateNaissance ? new Date(`${e.dateNaissance.slice(0, 10)}T12:00:00`).toLocaleDateString(dateLocale) : "—")}</span>
                    </span>
                  </div>
                  <div className="mt-3 rounded-xl bg-white/80 px-3 py-2 border border-sky-50">
                    <Badge variant={presenceBadgeVariant(status)} className="text-[11px]">
                      {statusLabel}
                    </Badge>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-gray-600">
                      {resumeLine ?? t("ui.childCardNoSummary")}
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-sky-700">{t("ui.childCardDetailsCta")}</p>
                  </div>
                </button>
              )
            })}
          </div>
        </CardContent>
      </Card>
    )
  }

  // ─── Tab: Home (body only — welcome card is a stable sibling component in render) ──
  const HomeTab = () => {
    const calendarTodayStr = formatLocalDateKey(new Date())
    return (
    <div className="space-y-4">
      <ArchivedChildrenCard />
      <ChildrenOverviewCards />

      <ParentClassPhotosCard />

      {/* Résumé du jour (même présentation que la saisie enseignant : 4 cartes) */}
      <Card className="border shadow-sm rounded-2xl" style={{ borderColor: "#AEDFF7" }}>
        <CardHeader className="pb-3 border-b" style={{ borderColor: "#AEDFF7" }}>
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm font-bold text-gray-900">{t("ui.dailySummaryTitle")}</CardTitle>
            <button
              type="button"
              onClick={() => setResumeRefreshTick(tk => tk + 1)}
              disabled={todayResumeLoading}
              className="parent-icon-button p-1 rounded-md text-gray-400 disabled:opacity-40"
              title={t("ui.refreshTitle")}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${todayResumeLoading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <p className="text-xs text-gray-500 mb-3">{t("ui.homeSummaryPresenceHint")}</p>
          {todayResumeLoading ? (
            <p className="text-sm text-gray-400 text-center py-6 animate-pulse">{t("ui.loading")}</p>
          ) : dailyResumeToday ? (
            <ResumeCards resume={dailyResumeToday} />
          ) : presenceOnToday ? (
            <PresenceOnlyFallback forDate={calendarTodayStr} statut={presenceOnToday.statut} />
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">{t("ui.dailySummaryEmpty")}</p>
          )}
        </CardContent>
      </Card>

      {/* Class message — only when selected child has a class */}
      {activeClasseId ? (
        <Card className="border shadow-sm rounded-2xl" style={{ borderColor: "#AEDFF7" }}>
          <CardHeader className="pb-3 border-b" style={{ borderColor: "#AEDFF7" }}>
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-sky-600" aria-hidden />
              {t("ui.messageClassTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {dailyMessage ? (
              <RichTextDisplay html={dailyMessage} className="text-gray-700" />
            ) : (
              <p className="text-sm text-gray-400">{t("ui.noMessageToday")}</p>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* Events preview */}
      {visibleUpcomingEvents.length > 0 && (
        <Card className="overflow-hidden border shadow-sm rounded-3xl" style={{ borderColor: "#AEDFF7", background: "linear-gradient(180deg, #F7FCFF 0%, #FFFFFF 100%)" }}>
          <CardHeader className="pb-3 border-b" style={{ borderColor: "#E0F2FE" }}>
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-100">
                  <Calendar className="h-4 w-4 text-sky-700" aria-hidden />
                </span>
                {t("ui.upcomingEventsTitle")}
              </CardTitle>
              <button type="button" onClick={() => setActiveTab("events")} className="parent-soft-button rounded-full px-2.5 py-1 text-xs font-semibold" style={{ color: "#FF6F61" }}>{t("ui.seeAll")}</button>
            </div>
          </CardHeader>
          <CardContent className="pt-3 space-y-2.5">
            {visibleUpcomingEvents.slice(0, 2).map(ev => (
              <button
                key={ev.id}
                type="button"
                onClick={() => openParentEventDetail(ev)}
                className="parent-card-action flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm"
                style={{ border: "1px solid #C5E8F7" }}
              >
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-xs font-black flex-shrink-0 text-center leading-tight" style={{ background: "#AEDFF7", color: "#1A1A1A" }}>{ev.date}</div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-gray-900">{ev.title}</p>
                  {ev.time && (
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden />
                      {ev.time}
                    </p>
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
    )
  }

  // ─── Tab: Photos (album classe + historique) ─────────────────────────────
  const PhotosTab = () => {
    if (!child?.id) {
      return (
        <div className="px-4 pt-4 pb-4 space-y-4">
          <Card className="border shadow-sm rounded-2xl" style={{ borderColor: "#AEDFF7" }}>
            <CardContent className="py-10 px-4 text-center text-sm text-muted-foreground leading-relaxed">
              {t("ui.featureRequiresChild")}
            </CardContent>
          </Card>
        </div>
      )
    }
    return (
    <div className="px-4 pt-4 pb-4 space-y-4">
      <div className="rounded-2xl p-4 border" style={{ background: "#EBF6FB", borderColor: "#C5E8F7" }}>
        <div className="flex items-start gap-3">
          <Camera className="mt-0.5 h-6 w-6 shrink-0 text-sky-700" aria-hidden />
          <div>
            <h2 className="text-lg font-bold text-gray-900">{t("ui.classActivitiesTitle")}</h2>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t("ui.classActivitiesTabIntro")}</p>
          </div>
        </div>
      </div>
      {activeClasseId ? (
        <ParentClassPhotosCard />
      ) : (
        <ParentNoClassEmpty message={t("ui.noClassAssigned")} />
      )}
    </div>
    )
  }

  // ─── Tab: Presence ────────────────────────────────────────────────────────
  const PresenceTab = () => {
    const calendarTodayStr = formatLocalDateKey(new Date())
    const todayStr = calendarTodayStr
    const isPresenceDayToday = presenceViewDateKey === calendarTodayStr

    const goPresencePrevDay = () => {
      setPresenceViewDate(d => {
        const p = new Date(d)
        p.setDate(p.getDate() - 1)
        p.setHours(0, 0, 0, 0)
        return p
      })
    }
    const goPresenceNextDay = () => {
      if (isPresenceDayToday) return
      setPresenceViewDate(d => {
        const cap = new Date()
        cap.setHours(0, 0, 0, 0)
        const n = new Date(d)
        n.setDate(n.getDate() + 1)
        n.setHours(0, 0, 0, 0)
        return n.getTime() > cap.getTime() ? cap : n
      })
    }
    const goPresenceToday = () => {
      const t = new Date()
      t.setHours(0, 0, 0, 0)
      setPresenceViewDate(t)
    }
    // For today's status: check if current filter month matches today, then look in loaded data
    const todayPresence = presences.find((p: any) => (p.date ?? "").slice(0, 10) === todayStr)
    const statut = todayPresence?.statut

    const totalPages = Math.max(1, Math.ceil(presenceTotal / presencePageSize))

    // Build month options: current month + 11 previous months
    const monthOptions: { value: string; label: string }[] = []
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`
      const label = d.toLocaleDateString(dateLocale, { month: "long", year: "numeric" })
      monthOptions.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) })
    }

    // Stats for filtered period
    const nbPresent = presences.filter(p => p.statut === "Present").length
    const nbAbsent  = presences.filter(p => p.statut === "Absent").length

    const dayOffsetFromToday = daysFromTodayLocal(presenceViewDate)
    const resumePage = Math.min(MAX_RESUME_DAY_PAGE, Math.max(0, Math.floor(dayOffsetFromToday / RESUME_DAYS_PAGE_SIZE)))
    const pageBaseOffset = resumePage * RESUME_DAYS_PAGE_SIZE
    const todayMid = new Date()
    todayMid.setHours(0, 0, 0, 0)
    const weekDayChips = Array.from({ length: RESUME_DAYS_PAGE_SIZE }, (_, i) => {
      const d = new Date(todayMid)
      d.setDate(todayMid.getDate() - (pageBaseOffset + i))
      return d
    })
    const weekRangeFirst = weekDayChips[0]
    const weekRangeLast = weekDayChips[RESUME_DAYS_PAGE_SIZE - 1]
    const weekRangeLabel =
      weekRangeFirst && weekRangeLast
        ? t("ui.resumeWeekRange", {
            from: weekRangeLast.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" }),
            to: weekRangeFirst.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" }),
          })
        : ""

    const goOlderResumeWeek = () => {
      const nextP = Math.min(MAX_RESUME_DAY_PAGE, resumePage + 1)
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - nextP * RESUME_DAYS_PAGE_SIZE)
      setPresenceViewDate(d)
    }
    const goNewerResumeWeek = () => {
      const prevP = Math.max(0, resumePage - 1)
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - prevP * RESUME_DAYS_PAGE_SIZE)
      setPresenceViewDate(d)
    }

    if (!child?.id) {
      return (
        <div className="px-4 pt-4 pb-4 space-y-4">
          <Card className="border shadow-sm rounded-2xl" style={{ borderColor: "#AEDFF7" }}>
            <CardContent className="py-10 px-4 text-center text-sm text-muted-foreground leading-relaxed">
              {t("ui.featureRequiresChild")}
            </CardContent>
          </Card>
        </div>
      )
    }

    return (
      <div className="px-4 pt-4 pb-4 space-y-4">
        <div
          className={`rounded-2xl p-4 border-2 ${
            statut === "Present"
              ? "pp-surface-success border-[var(--status-present-border)]"
              : statut === "Absent"
                ? "pp-surface-rejected border-[var(--status-rejected-border)]"
                : "bg-[var(--status-neutral-bg)] border-[var(--status-neutral-border)]"
          }`}
        >
          <div className="flex items-center gap-3">
            {statut === "Present" ? (
              <CheckCircle2 className="w-9 h-9 shrink-0 text-[var(--status-present-text)]" aria-hidden />
            ) : statut === "Absent" ? (
              <XCircle className="w-9 h-9 shrink-0 text-[var(--status-rejected-text)]" aria-hidden />
            ) : (
              <HelpCircle className="w-9 h-9 shrink-0 text-gray-400" aria-hidden />
            )}
            <div>
              <p className="font-bold text-gray-900">{statut === "Present" ? t("ui.presentToday") : statut === "Absent" ? t("ui.absentToday") : t("ui.unknownStatus")}</p>
              <p className="text-xs text-gray-500">{new Date().toLocaleDateString(dateLocale, { weekday: "long", day: "2-digit", month: "long" })}</p>
            </div>
          </div>
        </div>

        {/* Résumé + présence pour le jour choisi (date locale, pas UTC) */}
        <Card className="border shadow-sm rounded-2xl" style={{ borderColor: "#AEDFF7" }}>
          <CardHeader className="pb-3 border-b" style={{ borderColor: "#AEDFF7" }}>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2 flex-shrink-0">
                <CardTitle className="text-sm font-bold text-gray-900">{t("ui.dailySummaryTitle")}</CardTitle>
                <button
                  type="button"
                  onClick={() => setResumeRefreshTick(tk => tk + 1)}
                  disabled={presenceDayResumeLoading}
                  className="parent-icon-button p-1 rounded-md text-gray-400 disabled:opacity-40"
                  title={t("ui.refreshTitle")}
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${presenceDayResumeLoading ? "animate-spin" : ""}`} />
                </button>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <button type="button" onClick={goPresencePrevDay} className="parent-icon-button w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600" aria-label={t("ui.prev")}>
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="text-center min-w-[100px]">
                  <p className="text-xs font-semibold" style={{ color: "#1A1A1A" }}>
                    {isPresenceDayToday ? t("ui.today") : presenceViewDate.toLocaleDateString(dateLocale, { weekday: "short", day: "2-digit", month: "short" })}
                  </p>
                </div>
                <button type="button" onClick={goPresenceNextDay} disabled={isPresenceDayToday} className="parent-icon-button w-8 h-8 flex items-center justify-center rounded-full border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed" aria-label={t("ui.next")}>
                  <ChevronRight className="w-4 h-4" />
                </button>
                {!isPresenceDayToday && (
                  <button type="button" onClick={goPresenceToday} className="ml-1 text-xs hover:underline whitespace-nowrap" style={{ color: "#FF6F61" }}>
                    {t("ui.backToToday")}
                  </button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="mb-4 space-y-2">
              <p className="text-xs text-center text-gray-500">{weekRangeLabel}</p>
              <div className="flex flex-wrap gap-1.5 justify-center">
                {weekDayChips.map(d => {
                  const key = formatLocalDateKey(d)
                  const sel = key === presenceViewDateKey
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => {
                        const next = new Date(d)
                        next.setHours(0, 0, 0, 0)
                        setPresenceViewDate(next)
                      }}
                      className={`parent-soft-button min-w-[2.75rem] rounded-lg px-2 py-1.5 text-xs font-medium ${
                        sel ? "text-white" : "bg-gray-100 text-gray-700"
                      }`}
                      style={sel ? { background: "#1A73A7" } : undefined}
                    >
                      {d.toLocaleDateString(dateLocale, { weekday: "short", day: "numeric" })}
                    </button>
                  )
                })}
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={goOlderResumeWeek}
                  disabled={resumePage >= MAX_RESUME_DAY_PAGE}
                  className="text-xs font-medium px-2 py-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: "#1A73A7" }}
                >
                  {t("ui.resumeDaysOlder")}
                </button>
                <button
                  type="button"
                  onClick={goNewerResumeWeek}
                  disabled={resumePage <= 0}
                  className="text-xs font-medium px-2 py-1 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: "#1A73A7" }}
                >
                  {t("ui.resumeDaysNewer")}
                </button>
              </div>
            </div>
            {presenceDayResumeLoading ? (
              <p className="text-sm text-gray-400 text-center py-6 animate-pulse">{t("ui.loading")}</p>
            ) : dailyResumePresenceDay ? (
              <ResumeCards resume={dailyResumePresenceDay} />
            ) : presenceStatForSelectedDay ? (
              <PresenceOnlyFallback forDate={presenceViewDateKey} statut={presenceStatForSelectedDay.statut} />
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">{t("ui.dailySummaryEmpty")}</p>
            )}
          </CardContent>
        </Card>

        {/* Attendance history with filter + pagination */}
        <Card className="border border-gray-100 shadow-sm rounded-2xl">
          <CardHeader className="pb-3 border-b border-gray-100">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <CardTitle className="text-sm font-bold text-gray-900 flex-shrink-0">{t("ui.attendanceHistory")}</CardTitle>
              {/* Month filter */}
              <select
                value={presenceFilterMonth}
                onChange={e => { setPresenceFilterMonth(e.target.value); setPresencePage(1) }}
                className="text-xs border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 max-w-[160px]"
                style={{ borderColor: "#C5E8F7", color: "#1A1A1A" }}
              >
                <option value="">{t("ui.allMonths")}</option>
                {monthOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </CardHeader>
          <CardContent className="pt-3">
            {/* Mini stats */}
            {(nbPresent > 0 || nbAbsent > 0) && (
              <div className="flex gap-2 mb-3">
                <div className="flex-1 rounded-xl px-3 py-2 text-center pp-surface-success border">
                  <p className="text-lg font-bold pp-text-success">{nbPresent}</p>
                  <p className="text-xs pp-text-success">{t("ui.present")}</p>
                </div>
                <div className="flex-1 rounded-xl px-3 py-2 text-center pp-surface-rejected border">
                  <p className="text-lg font-bold text-[var(--status-rejected-text)]">{nbAbsent}</p>
                  <p className="text-xs text-[var(--status-rejected-text)]">{t("ui.absent")}</p>
                </div>
                <div className="flex-1 rounded-xl px-3 py-2 text-center" style={{ background: "#EAF5FB", border: "1px solid #C5E8F7" }}>
                  <p className="text-lg font-bold" style={{ color: "#1A73A7" }}>{presenceTotal}</p>
                  <p className="text-xs text-gray-500">{t("ui.total")}</p>
                </div>
              </div>
            )}

            {presenceLoading ? (
              <p className="text-sm text-gray-400 text-center py-6 animate-pulse">{t("ui.loading")}</p>
            ) : presences.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">{t("ui.noPresencesFound")}</p>
            ) : (
              <div className="space-y-1">
                {presences.map((p: any, i: number) => {
                  const d = (p.date ?? "").slice(0, 10)
                  const label = d ? new Date(`${d}T12:00:00`).toLocaleDateString(dateLocale, { weekday: "short", day: "2-digit", month: "short" }) : "—"
                  const stLabel = p.statut === "Present" ? t("ui.statusPresent") : p.statut === "Absent" ? t("ui.statusAbsent") : (p.statut ?? "—")
                  return (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <p className="text-sm text-gray-700 capitalize">{label}</p>
                      <Badge variant={presenceBadgeVariant(p.statut)}>
                        {stLabel}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                <button type="button" onClick={() => setPresencePage(p => Math.max(1, p-1))} disabled={presencePage <= 1 || presenceLoading}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-40"
                  style={{ background: "#EAF5FB", color: "#1A1A1A", border: "1px solid #C5E8F7" }}>
                  <ChevronLeft className="w-3.5 h-3.5" /> {t("ui.prev")}
                </button>
                <p className="text-xs text-gray-500">{t("ui.presencePage", { page: presencePage, totalPages })}</p>
                <button type="button" onClick={() => setPresencePage(p => Math.min(totalPages, p+1))} disabled={presencePage >= totalPages || presenceLoading}
                  className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg disabled:opacity-40"
                  style={{ background: "#EAF5FB", color: "#1A1A1A", border: "1px solid #C5E8F7" }}>
                  {t("ui.next")} <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─── Tab: Child ───────────────────────────────────────────────────────────

  const loadSante = async () => {
    if (!child?.id) return
    setSanteLoading(true)
    try {
      const res = await apiClient.getChildSante(child.id as string)
      const s = res.data ?? null
      setSante(s)
      if (s) {
        setSanteForm({
          medecin: (s.medecin as string) ?? "",
          notes: (s.notes as string) ?? "",
          restrictionAlimentaire: (s.restrictionAlimentaire as string) ?? "",
          tags: Array.isArray(s.tags) ? (s.tags as string[]) : [],
          allergies: Array.isArray(s.allergies) ? (s.allergies as {nom:string;severite?:string}[]).map(a => ({ nom: a.nom, severite: a.severite ?? "" })) : [],
          intolerances: Array.isArray(s.intolerances) ? (s.intolerances as {nom:string}[]).map(i => ({ nom: i.nom })) : [],
        })
      } else {
        setSanteForm({ medecin: "", notes: "", restrictionAlimentaire: "", tags: [], allergies: [], intolerances: [] })
      }
    } catch { setSante(null) }
    finally { setSanteLoading(false) }
  }

  const handleSaveSante = async () => {
    if (!child?.id) return
    setSanteSaving(true); setSanteSaveMsg(null)
    try {
      await apiClient.upsertChildSante(child.id as string, santeForm)
      setSanteSaveMsg(t("ui.santeSaved"))
      await loadSante()
      setEditingSante(false)
    } catch (err: unknown) {
      const msg = (err as {response?: {data?: {message?: unknown}}})?.response?.data?.message
      setSanteSaveMsg(typeof msg === "string" ? t("ui.errorWithDetail", { detail: msg }) : t("ui.updateError"))
    } finally { setSanteSaving(false) }
  }

  const handleDeleteSante = async () => {
    if (!child?.id) return
    setSanteDeleting(true)
    try {
      await apiClient.deleteChildSante(child.id as string)
      setSante(null)
      setSanteForm({ medecin: "", notes: "", restrictionAlimentaire: "", tags: [], allergies: [], intolerances: [] })
      setSanteSaveMsg(t("ui.santeDeleted"))
      setSanteDeleteOpen(false)
    } catch {
      setSanteSaveMsg(t("ui.updateError"))
    } finally {
      setSanteDeleting(false)
    }
  }

  const handleStartEditDelegation = (d: { id: string; name: string; phone?: string | null; role?: string | null }) => {
    const fromServer = enfantsInFamily.find((e: any) => String(e.id) === String(child?.id))
    const raw = (fromServer?.delegations as any[] | undefined)?.find((x: any) => String(x.id) === String(d.id))
    const rawRelation = String(d.role ?? raw?.relation ?? "")
    const normalizedRelation = normalizeDelegationRelation(rawRelation)
    setEditingDelegation(d.id)
    setDelegationForm({
      nom: d.name ?? "",
      telephone: d.phone ?? "",
      cin: typeof raw?.cin === "string" ? raw.cin : "",
      relation: normalizedRelation,
      relationDetail: normalizedRelation === "Autre" && rawRelation && !isDelegationRelationCode(rawRelation) ? rawRelation : "",
    })
  }

  const handleSaveDelegation = async (delegationId: string, body: ReturnType<typeof toApiDelegationBody>) => {
    if (!child?.id) return
    setDelegationSaving(true)
    try {
      await apiClient.updateParentDelegation(String(child.id), delegationId, body)
      setAuthorizedPersons(prev =>
        prev.map(p =>
          p.id === delegationId ? { ...p, name: body.nom, phone: body.telephone, role: body.relation } : p,
        ),
      )
      setEnfantsInFamily(prev =>
        prev.map((e: any) => {
          if (String(e.id) !== String(child.id)) return e
          const dels = Array.isArray(e.delegations) ? e.delegations : []
          return {
            ...e,
            delegations: dels.map((d: any) =>
              String(d.id) === String(delegationId)
                ? { ...d, nom: body.nom, telephone: body.telephone, relation: body.relation, cin: body.cin ?? d.cin }
                : d,
            ),
          }
        }),
      )
      setEditingDelegation(null)
      toast.success(t("ui.delegationUpdated"))
      void reloadDelegationsForCurrentChild()
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { message?: unknown } } }
      const msg = ax.response?.data?.message
      const detail = Array.isArray(msg) ? msg.join(", ") : typeof msg === "string" ? msg : null
      toast.error(detail ? t("ui.errorWithDetail", { detail }) : t("ui.delegationSaveError"))
    } finally {
      setDelegationSaving(false)
    }
  }

  const performDeleteDelegation = async () => {
    const target = delegationDeleteTarget
    if (!target?.enfantId || !target.delegationId) {
      setDelegationDeleteTarget(null)
      return
    }
    setDelegationSaving(true)
    try {
      await apiClient.deleteParentDelegation(target.enfantId, target.delegationId)
      setAuthorizedPersons(prev => prev.filter(p => p.id !== target.delegationId))
      setEnfantsInFamily(prev =>
        prev.map((e: any) => {
          if (String(e.id) !== String(target.enfantId)) return e
          const dels = Array.isArray(e.delegations) ? e.delegations : []
          return { ...e, delegations: dels.filter((d: any) => String(d.id) !== String(target.delegationId)) }
        }),
      )
      if (editingDelegation === target.delegationId) setEditingDelegation(null)
      toast.success(t("ui.delegationDeleted"))
      void reloadDelegationsForCurrentChild()
    } catch (err: unknown) {
      const ax = err as { response?: { status?: number; data?: { message?: unknown } } }
      const status = ax.response?.status
      const msg = ax.response?.data?.message
      const detail = Array.isArray(msg) ? msg.join(", ") : typeof msg === "string" ? msg : null
      if (status === 404) toast.error(t("ui.delegationNotFound"))
      else toast.error(detail ? t("ui.errorWithDetail", { detail }) : t("ui.delegationDeleteError"))
    } finally {
      setDelegationSaving(false)
      setDelegationDeleteTarget(null)
    }
  }

  const handleAddDelegation = async (body: ReturnType<typeof toApiDelegationBody>) => {
    if (!child?.id) return
    setDelegationSaving(true)
    try {
      const res = await apiClient.addParentDelegation(String(child.id), body)
      const d = parseDelegationFromResponse(res.data)
      if (!d) throw new Error("invalid delegation response")
      const row = { id: d.id, name: d.nom, phone: d.telephone, role: d.relation ?? null }
      setAuthorizedPersons(prev => [...prev, row])
      setEnfantsInFamily(prev =>
        prev.map((e: any) => {
          if (String(e.id) !== String(child.id)) return e
          const dels = Array.isArray(e.delegations) ? e.delegations : []
          return {
            ...e,
            delegations: [...dels, { id: d.id, nom: d.nom, telephone: d.telephone, relation: d.relation ?? "", cin: d.cin ?? body.cin ?? "" }],
          }
        }),
      )
      setAddingDelegation(false)
      setNewDelegationForm({ ...EMPTY_DELEGATION_FORM })
      toast.success(t("ui.delegationAdded"))
      void reloadDelegationsForCurrentChild()
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { message?: unknown } } }
      const msg = ax.response?.data?.message
      const detail = Array.isArray(msg) ? msg.join(", ") : typeof msg === "string" ? msg : null
      toast.error(detail ? t("ui.errorWithDetail", { detail }) : t("ui.delegationAddError"))
    } finally {
      setDelegationSaving(false)
    }
  }

  // ─── Tab: Menu ────────────────────────────────────────────────────────────
  const MenuTab = () => {
    const MENU_ROWS = [
      { icon: <Milk className="w-5 h-5 shrink-0 text-sky-700" aria-hidden />, label: t("ui.collation"),  hint: t("ui.hintApprox9"),  key: "entree"  as const },
      { icon: <Utensils className="w-5 h-5 shrink-0 text-sky-700" aria-hidden />, label: t("ui.lunch"),   hint: t("ui.hintApprox12"), key: "plat"    as const },
      { icon: <Cookie className="w-5 h-5 shrink-0 text-sky-700" aria-hidden />, label: t("ui.snack"),     hint: t("ui.hintApprox16"), key: "dessert" as const },
    ]
    if (!activeClasseId) {
      return (
        <div className="px-4 pt-4 pb-4 space-y-4">
          <h2 className="text-xl font-bold text-gray-900">{t("ui.menuTabTitle")}</h2>
          {selectedChildHeader ? (
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{selectedChildHeader.name}</span>
            </p>
          ) : null}
          <ParentNoClassEmpty message={t("ui.noClassAssigned")} />
        </div>
      )
    }
    // Current week: Mon–Sun (local dates, no UTC offset issues)
    const today = new Date()
    const weekStart = new Date(today.getFullYear(), today.getMonth(), today.getDate() - (today.getDay() + 6) % 7)
    const weekEnd   = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate() + 6)
    // Parse date string as local (YYYY-MM-DD → local midnight)
    const parseLocal = (iso: string) => { const [y,m,d] = iso.split("-").map(Number); return new Date(y, m-1, d) }
    const weekMenuList = Object.values(weekMenus)
      .filter((m: any) => {
        const d = parseLocal(m.date as string)
        return d >= weekStart && d <= weekEnd
      })
      .sort((a: any, b: any) => parseLocal(a.date).getTime() - parseLocal(b.date).getTime())
    const todayKey = formatLocalDateKey(today)
    const menuHistoryPageSize = 4
    const pastMenuList = Object.values(weekMenus)
      .filter((m: any) => typeof m.date === "string" && m.date < todayKey)
      .sort((a: any, b: any) => parseLocal(b.date).getTime() - parseLocal(a.date).getTime())
    const filteredPastMenuList = menuHistoryFilterMonth
      ? pastMenuList.filter((m: any) => typeof m.date === "string" && m.date.slice(0, 7) === menuHistoryFilterMonth)
      : pastMenuList
    const menuHistoryMonthOptions = buildRecentMonthOptions(dateLocale)
    const menuHistoryTotalPages = Math.max(1, Math.ceil(filteredPastMenuList.length / menuHistoryPageSize))
    const currentMenuHistoryPage = Math.min(menuHistoryPage, menuHistoryTotalPages)
    const visibleMenuHistory = filteredPastMenuList.slice(
      (currentMenuHistoryPage - 1) * menuHistoryPageSize,
      currentMenuHistoryPage * menuHistoryPageSize,
    )

    const renderMenuDayCard = (menu: { date: string; entree?: string | null; plat?: string | null; dessert?: string | null }, compact = false) => {
      const isMenuToday = menu.date === todayKey
      return (
        <div
          className="parent-card-action rounded-2xl p-3"
          style={{
            background: isMenuToday ? "rgba(174,223,247,0.25)" : compact ? "#FFFFFF" : "rgba(174,223,247,0.08)",
            border: `1px solid ${isMenuToday ? "#AEDFF7" : compact ? "#E5E7EB" : "rgba(174,223,247,0.35)"}`,
          }}
        >
          <p className="text-xs font-bold mb-2 capitalize flex items-center gap-1.5" style={{ color: isMenuToday ? "#1A73A7" : "#1A1A1A" }}>
            {isMenuToday && <span className="text-[10px] bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{t("ui.todayBadge")}</span>}
            {new Date(menu.date + "T12:00:00").toLocaleDateString(dateLocale, { weekday: "long", day: "2-digit", month: "short" })}
          </p>
          <div className="space-y-1.5">
            {MENU_ROWS.filter(r => menu[r.key]).map(row => (
              <div key={row.key} className="flex items-start gap-2 text-xs">
                <span className="flex-shrink-0 w-5 text-center">{row.icon}</span>
                <span className="text-gray-500 flex-shrink-0 w-24">{row.label}</span>
                <span className="text-gray-800 font-medium break-words min-w-0 flex-1">{menu[row.key]}</span>
              </div>
            ))}
            {!menu.entree && !menu.plat && !menu.dessert && <p className="text-xs text-gray-400 italic">{t("ui.noMealsDay")}</p>}
          </div>
        </div>
      )
    }

    return (
      <div className="px-4 pt-4 pb-4 space-y-4">
        <h2 className="text-xl font-bold text-gray-900">{t("ui.menuTabTitle")}</h2>
        {selectedChildHeader ? (
          <p className="text-sm text-gray-600">
            <span className="font-semibold text-gray-900">{selectedChildHeader.name}</span>
            {selectedChildHeader.classe ? (
              <span className="text-gray-500"> · {selectedChildHeader.classe}</span>
            ) : null}
          </p>
        ) : null}
        {childSwitchLoading ? (
          <p className="text-sm text-gray-400 animate-pulse">{t("ui.loading")}</p>
        ) : null}

        {/* Today's menu */}
        <Card className="shadow-md rounded-2xl overflow-hidden" style={{ border: "2px solid #AEDFF7", background: "linear-gradient(to bottom, rgba(174,223,247,0.12), white)" }}>
          <CardHeader className="pb-3 border-b" style={{ borderColor: "#AEDFF7" }}>
            <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <Utensils className="w-4 h-4 shrink-0" aria-hidden /> {t("ui.menuTodayTitle")}
              {todayMenu && <span className="ml-auto text-xs font-normal text-gray-400">{new Date(`${todayMenu.date}T12:00:00`).toLocaleDateString(dateLocale, { weekday: "long", day: "2-digit", month: "long" })}</span>}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {todayMenu ? (
              <div className="space-y-2">
                {MENU_ROWS.filter(r => todayMenu[r.key]).map(row => (
                  <div key={row.key} className="flex items-start gap-3 py-2.5 border-t first:border-0 first:pt-0" style={{ borderColor: "rgba(174,223,247,0.5)" }}>
                    <span className="flex-shrink-0 leading-none mt-0.5">{row.icon}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">{row.label}</p>
                        <p className="text-[9px] text-gray-400">{row.hint}</p>
                      </div>
                      <p className="text-sm font-semibold text-gray-900 leading-snug break-words">{todayMenu[row.key]}</p>
                    </div>
                  </div>
                ))}
                {!todayMenu.entree && !todayMenu.plat && !todayMenu.dessert && <p className="text-sm text-gray-400">{t("ui.noMealsFilled")}</p>}
              </div>
            ) : (
              <div className="text-center py-4">
                <Utensils className="w-10 h-10 mx-auto text-gray-300" aria-hidden />
                <p className="text-sm text-gray-400 mt-2">{t("ui.noMenuPublished")}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Week menus — current week only */}
        <Card className="border shadow-sm rounded-2xl overflow-hidden" style={{ borderColor: "#AEDFF7" }}>
          <CardHeader className="pb-3 border-b" style={{ borderColor: "#AEDFF7" }}>
            <CardTitle className="text-sm font-bold text-gray-900">
              <ClipboardList className="w-4 h-4 shrink-0 inline-block align-middle" aria-hidden /> {t("ui.menuWeekTitle")}
              <span className="ml-2 text-[11px] font-normal text-gray-400">
                {weekStart.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" })} – {weekEnd.toLocaleDateString(dateLocale, { day: "2-digit", month: "short" })}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3 space-y-2 px-3">
            {weekMenuList.length === 0 ? (
              <div className="text-center py-5">
                <CalendarDays className="w-10 h-10 mx-auto text-gray-300" aria-hidden />
                <p className="text-sm text-gray-400 mt-2">{t("ui.noMenuWeek")}</p>
              </div>
            ) : weekMenuList.map((menu: any) => (
              <div key={menu.date}>{renderMenuDayCard(menu)}</div>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-gray-100 bg-white shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/70">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <CardTitle className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <History className="w-4 h-4 shrink-0 text-gray-600" aria-hidden />
                  {t("ui.menuHistoryTitle")}
                </CardTitle>
                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{t("ui.menuHistorySubtitle")}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="parent-soft-button shrink-0 rounded-xl border-gray-200 text-xs font-semibold"
                onClick={() => {
                  setShowMenuHistory(prev => !prev)
                  setMenuHistoryPage(1)
                }}
              >
                {showMenuHistory ? t("ui.menuHistoryHide") : t("ui.menuHistoryShow")}
              </Button>
            </div>
          </CardHeader>
          {showMenuHistory ? (
            <CardContent className="pt-4 space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <label htmlFor="menu-history-month-filter" className="text-xs font-semibold text-gray-600">
                  {t("ui.filterByMonth")}
                </label>
                <select
                  id="menu-history-month-filter"
                  value={menuHistoryFilterMonth}
                  onChange={e => {
                    setMenuHistoryFilterMonth(e.target.value)
                    setMenuHistoryPage(1)
                  }}
                  className="text-xs border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 max-w-[180px]"
                  style={{ borderColor: "#C5E8F7", color: "#1A1A1A" }}
                >
                  <option value="">{t("ui.allMonths")}</option>
                  {menuHistoryMonthOptions.map(o => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {filteredPastMenuList.length === 0 ? (
                <div className="py-6 text-center">
                  <ClipboardList className="w-10 h-10 mx-auto text-gray-300" aria-hidden />
                  <p className="text-sm text-gray-400 mt-2">
                    {menuHistoryFilterMonth ? t("ui.noMenuHistoryForPeriod") : t("ui.noMenuHistory")}
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-2.5">
                    {visibleMenuHistory.map((menu: any) => (
                      <div key={menu.date}>{renderMenuDayCard(menu, true)}</div>
                    ))}
                  </div>
                  {filteredPastMenuList.length > menuHistoryPageSize ? (
                    <div className="flex items-center justify-between gap-3 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        className="parent-soft-button rounded-xl border-gray-200 text-xs font-semibold"
                        disabled={currentMenuHistoryPage <= 1}
                        onClick={() => setMenuHistoryPage(prev => Math.max(1, prev - 1))}
                      >
                        <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                        {t("ui.prev")}
                      </Button>
                      <span className="text-xs font-semibold text-gray-500">
                        {currentMenuHistoryPage}/{menuHistoryTotalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        className="parent-soft-button rounded-xl border-gray-200 text-xs font-semibold"
                        disabled={currentMenuHistoryPage >= menuHistoryTotalPages}
                        onClick={() => setMenuHistoryPage(prev => Math.min(menuHistoryTotalPages, prev + 1))}
                      >
                        {t("ui.next")}
                        <ChevronRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </CardContent>
          ) : null}
        </Card>
      </div>
    )
  }

  // ─── Tab: Events ──────────────────────────────────────────────────────────
  const EventsTab = () => {
    if (!activeClasseId) {
      return (
        <div className="px-4 pt-4 pb-4 space-y-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Agenda</p>
            <h2 className="text-xl font-bold text-gray-900">{t("ui.eventsTitle")}</h2>
            {selectedChildHeader ? (
              <p className="mt-1 text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{selectedChildHeader.name}</span>
              </p>
            ) : null}
          </div>
          <ParentNoClassEmpty message={t("ui.noClassAssigned")} />
        </div>
      )
    }
    const pastEventsPageSize = 5
    const pastEventsMonthOptions = buildRecentMonthOptions(dateLocale)
    const filteredPastEvents = pastEventsFilterMonth
      ? visiblePastEvents.filter(ev => {
          const key = ev.rawDate ? formatLocalDateKey(new Date(ev.rawDate)) : ""
          return key.slice(0, 7) === pastEventsFilterMonth
        })
      : visiblePastEvents
    const pastEventsTotalPages = Math.max(1, Math.ceil(filteredPastEvents.length / pastEventsPageSize))
    const currentPastEventsPage = Math.min(pastEventsPage, pastEventsTotalPages)
    const paginatedPastEvents = filteredPastEvents.slice(
      (currentPastEventsPage - 1) * pastEventsPageSize,
      currentPastEventsPage * pastEventsPageSize,
    )
    const monthLabel = parentEventsMonth.toLocaleDateString(dateLocale, { month: "long", year: "numeric" })
    const firstDay = new Date(parentEventsMonth.getFullYear(), parentEventsMonth.getMonth(), 1)
    const daysInMonth = new Date(parentEventsMonth.getFullYear(), parentEventsMonth.getMonth() + 1, 0).getDate()
    const startOffset = (firstDay.getDay() + 6) % 7
    const endPadding = (7 - ((startOffset + daysInMonth) % 7)) % 7
    const todayKey = formatLocalDateKey(new Date())
    const calendarCells: (number | null)[] = [
      ...Array.from({ length: startOffset }, () => null),
      ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
      ...Array.from({ length: endPadding }, () => null),
    ]
    const weekdayLabels = locale === "ar"
      ? ["إث", "ثل", "أر", "خم", "جم", "سب", "أح"]
      : ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"]
    const eventsByDate = allVisibleEvents.reduce<Record<string, ParentEventItem[]>>((acc, ev) => {
      const key = parentEventDateKey(ev)
      if (!key) return acc
      acc[key] = [...(acc[key] ?? []), ev]
      return acc
    }, {})
    const shiftEventsMonth = (delta: number) => {
      setParentEventsMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1))
    }

    const EventCard = ({ ev, past = false, onOpen }: { ev: ParentEventItem; past?: boolean; onOpen: () => void }) => (
      <button
        type="button"
        onClick={onOpen}
        className={`parent-card-action flex w-full cursor-pointer items-start gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ${past ? "opacity-90" : ""}`}
        style={{ border: past ? "1px solid #E5E7EB" : "1px solid #C5E8F7" }}
      >
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xs font-black flex-shrink-0 text-center leading-tight" style={{ background: past ? "#F3F4F6" : "#AEDFF7", color: "#1A1A1A" }}>
          {ev.date}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-bold text-gray-900 text-sm leading-snug">{ev.title}</p>
            {past ? (
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-500">Passé</span>
            ) : null}
          </div>
          {ev.time ? (
            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 shrink-0 text-sky-600" aria-hidden />
              {ev.time}
            </p>
          ) : null}
          {ev.description?.trim() ? (
            <p className="mt-2 text-xs text-gray-600 leading-relaxed line-clamp-2">{ev.description.trim()}</p>
          ) : null}
          <div className="mt-2 inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-800">
            {typeof ev.cost === "number" ? `${ev.cost} ${ev.currency || "MAD"}` : "Gratuit / non renseigné"}
          </div>
        </div>
      </button>
    )

    const renderCalendar = () => (
      <div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button type="button" variant="outline" size="icon" className="parent-icon-button h-9 w-9 rounded-xl border-sky-200" onClick={() => shiftEventsMonth(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <p className="text-sm font-bold capitalize text-gray-900">{monthLabel}</p>
          <Button type="button" variant="outline" size="icon" className="parent-icon-button h-9 w-9 rounded-xl border-sky-200" onClick={() => shiftEventsMonth(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
          <div className="grid grid-cols-7 border-b border-sky-100 bg-sky-50/80">
            {weekdayLabels.map(day => (
              <div key={day} className="py-2 text-center text-[11px] font-bold uppercase tracking-wide text-sky-800">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 divide-x divide-y divide-sky-50">
            {calendarCells.map((day, index) => {
              if (!day) {
                return <div key={`pad-${index}`} className="min-h-[5.5rem] bg-gray-50/40" aria-hidden />
              }
              const key = formatLocalDateKey(new Date(parentEventsMonth.getFullYear(), parentEventsMonth.getMonth(), day, 12))
              const dayEvents = eventsByDate[key] ?? []
              const isToday = key === todayKey
              const hasEvents = dayEvents.length > 0
              return (
                <div
                  key={key}
                  role={hasEvents ? "button" : undefined}
                  tabIndex={hasEvents ? 0 : undefined}
                  onClick={hasEvents ? () => openParentEventDay(dayEvents) : undefined}
                  onKeyDown={
                    hasEvents
                      ? e => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault()
                            openParentEventDay(dayEvents)
                          }
                        }
                      : undefined
                  }
                  className={`min-h-[5.5rem] p-1.5 text-left transition-colors ${
                    isToday ? "bg-sky-50/80 ring-1 ring-inset ring-sky-200" : "bg-white"
                  } ${hasEvents ? "cursor-pointer hover:bg-sky-50/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61]/40" : ""}`}
                >
                  <div className={`mb-1 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${isToday ? "bg-sky-600 text-white" : "text-gray-800"}`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayEvents.slice(0, 2).map(ev => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          openParentEventDetail(ev)
                        }}
                        className="w-full truncate rounded-md bg-sky-100 px-1.5 py-1 text-left text-[10px] font-semibold text-sky-900 hover:bg-sky-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                        title={ev.title}
                      >
                        {ev.title}
                      </button>
                    ))}
                    {dayEvents.length > 2 ? (
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation()
                          openParentEventDay(dayEvents)
                        }}
                        className="w-full rounded-md px-1 py-0.5 text-left text-[10px] font-semibold text-[#FF6F61] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6F61]/40"
                      >
                        +{dayEvents.length - 2} {locale === "ar" ? "أخرى" : "autres"}
                      </button>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
        {allVisibleEvents.length === 0 ? (
          <p className="mt-3 text-center text-xs text-gray-400">{t("ui.noUpcomingEventsShort")}</p>
        ) : (
          <p className="mt-3 text-center text-xs text-gray-500">{t("ui.calendarTapHint")}</p>
        )}
      </div>
    )

    return (
      <div className="px-4 pt-4 pb-4 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-sky-600">Agenda</p>
            <h2 className="text-xl font-bold text-gray-900">{t("ui.eventsTitle")}</h2>
            {selectedChildHeader ? (
              <p className="mt-1 text-sm text-gray-600">
                <span className="font-semibold text-gray-900">{selectedChildHeader.name}</span>
                {selectedChildHeader.classe ? (
                  <span className="text-gray-500"> · {selectedChildHeader.classe}</span>
                ) : null}
              </p>
            ) : null}
            {childSwitchLoading ? (
              <p className="mt-1 text-sm text-gray-400 animate-pulse">{t("ui.loading")}</p>
            ) : null}
          </div>
          <div className="flex rounded-2xl border border-sky-100 bg-sky-50/60 p-1">
            {[
              { id: "simple" as const, label: "Simple", icon: <ClipboardList className="h-3.5 w-3.5" /> },
              { id: "calendar" as const, label: "Calendrier", icon: <CalendarDays className="h-3.5 w-3.5" /> },
            ].map(option => {
              const active = parentEventsView === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setParentEventsView(option.id)}
                  className="parent-segment-button inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold"
                  style={active ? { background: "#FFFFFF", color: "#0F172A", boxShadow: "0 1px 6px rgba(15,23,42,0.08)" } : { color: "#64748B" }}
                >
                  {option.icon}
                  {option.label}
                </button>
              )
            })}
          </div>
        </div>

        <Card className="rounded-3xl border shadow-sm" style={{ borderColor: "#C5E8F7" }}>
          <CardHeader className="pb-3 border-b bg-sky-50/40" style={{ borderColor: "#E0F2FE" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-sky-700 shadow-sm">
                  <CalendarDays className="h-4 w-4" aria-hidden />
                </span>
                <CardTitle className="text-sm font-bold text-gray-900">{t("ui.upcomingEventsTitle")}</CardTitle>
              </div>
              <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-sky-700 shadow-sm">
                {visibleUpcomingEvents.length}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {parentEventsView === "simple" ? (
              visibleUpcomingEvents.length === 0 ? (
                <div className="py-6 text-center">
                  <CalendarDays className="w-12 h-12 mx-auto text-gray-300" aria-hidden />
                  <p className="mt-3 text-sm text-gray-400">{t("ui.noUpcomingEventsShort")}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {visibleUpcomingEvents.map(ev => (
                    <EventCard key={ev.id} ev={ev} onOpen={() => openParentEventDetail(ev)} />
                  ))}
                </div>
              )
            ) : (
              renderCalendar()
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border border-gray-100 bg-white shadow-sm">
          <CardHeader className="pb-3 border-b border-gray-100 bg-gray-50/70">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-gray-600 shadow-sm">
                  <History className="h-4 w-4" aria-hidden />
                </span>
                <CardTitle className="text-sm font-bold text-gray-900">{t("ui.pastEventsTitle")}</CardTitle>
              </div>
              <select
                value={pastEventsFilterMonth}
                onChange={e => {
                  setPastEventsFilterMonth(e.target.value)
                  setPastEventsPage(1)
                }}
                className="text-xs border rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-1 max-w-[180px]"
                style={{ borderColor: "#E5E7EB", color: "#1A1A1A" }}
                aria-label={t("ui.filterByMonth")}
              >
                <option value="">{t("ui.allMonths")}</option>
                {pastEventsMonthOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              {filteredPastEvents.length > pastEventsPageSize ? (
                <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-gray-500 shadow-sm">
                  Page {currentPastEventsPage}/{pastEventsTotalPages}
                </span>
              ) : null}
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {filteredPastEvents.length === 0 ? (
              <div className="py-5 text-center">
                <p className="text-sm text-gray-400">
                  {pastEventsFilterMonth ? t("ui.noPastEventsForPeriod") : t("ui.noPastEventsShort")}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {paginatedPastEvents.map(ev => (
                  <EventCard key={ev.id} ev={ev} past onOpen={() => openParentEventDetail(ev)} />
                ))}
                {filteredPastEvents.length > pastEventsPageSize ? (
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="parent-soft-button rounded-xl border-gray-200 text-xs font-semibold"
                      disabled={currentPastEventsPage <= 1}
                      onClick={() => setPastEventsPage(prev => Math.max(1, prev - 1))}
                    >
                      <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                      Précédent
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="parent-soft-button rounded-xl border-gray-200 text-xs font-semibold"
                      disabled={currentPastEventsPage >= pastEventsTotalPages}
                      onClick={() => setPastEventsPage(prev => Math.min(pastEventsTotalPages, prev + 1))}
                    >
                      Suivant
                      <ChevronRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    )
  }

  const ParentEventModals = () => (
    <>
      {parentEventDayPicker && parentEventDayPicker.length > 0 ? (
        <div
          className="fixed inset-0 z-[360] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="parent-event-day-picker-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label={t("ui.closeEventDetail")}
            onClick={() => setParentEventDayPicker(null)}
          />
          <div className="relative flex max-h-[min(70vh,420px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-sky-100 px-5 py-4">
              <h3 id="parent-event-day-picker-title" className="text-base font-bold text-gray-900">
                {t("ui.eventDayPickerTitle")}
              </h3>
              <button
                type="button"
                onClick={() => setParentEventDayPicker(null)}
                className="parent-icon-button rounded-full p-1 text-gray-500"
                aria-label={t("ui.closeEventDetail")}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <ul className="min-h-0 flex-1 overflow-y-auto p-3 space-y-2">
              {parentEventDayPicker.map(ev => (
                <li key={ev.id}>
                  <button
                    type="button"
                    onClick={() => openParentEventDetail(ev)}
                    className="parent-card-action flex w-full items-start gap-3 rounded-xl border border-sky-100 bg-sky-50/50 p-3 text-left hover:bg-sky-50"
                  >
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-sky-200 text-[10px] font-black leading-tight text-sky-900">
                      {ev.date}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-sm text-gray-900">{ev.title}</p>
                      {ev.time ? (
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-600">
                          <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                          {ev.time}
                        </p>
                      ) : null}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {selectedParentEvent ? (
        <div
          className="fixed inset-0 z-[370] flex items-end justify-center p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="parent-event-detail-title"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            aria-label={t("ui.closeEventDetail")}
            onClick={() => setSelectedParentEvent(null)}
          />
          <div className="relative w-full max-w-md rounded-2xl border border-sky-100 bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <h3 id="parent-event-detail-title" className="text-lg font-bold text-gray-900 pr-2">
                {selectedParentEvent.title}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedParentEvent(null)}
                className="parent-icon-button shrink-0 rounded-full p-1 text-gray-500"
                aria-label={t("ui.closeEventDetail")}
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <p className="mt-2 text-sm font-semibold text-sky-800">{selectedParentEvent.date}</p>
            {selectedParentEvent.time ? (
              <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-600">
                <Clock className="h-4 w-4 shrink-0 text-sky-600" aria-hidden />
                {selectedParentEvent.time}
              </p>
            ) : null}
            {selectedParentEvent.description?.trim() ? (
              <p className="mt-3 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
                {selectedParentEvent.description.trim()}
              </p>
            ) : (
              <p className="mt-3 text-sm italic text-gray-400">{t("ui.eventNoDescription")}</p>
            )}
            <div className="mt-4 inline-flex rounded-full bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-800">
              {typeof selectedParentEvent.cost === "number"
                ? `${selectedParentEvent.cost} ${selectedParentEvent.currency || "MAD"}`
                : t("ui.eventFreeOrUnknown")}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )

  // ─── Main render ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen pb-20 md:pb-8 overflow-x-hidden" style={{ background: "linear-gradient(180deg, #F7FCFF 0%, #FFFFFF 34%, #FFFFFF 100%)" }}>
      <style>{`
        .parent-primary-button,
        .parent-danger-button,
        .parent-soft-button,
        .parent-icon-button,
        .parent-card-action,
        .parent-segment-button,
        .parent-tab-button {
          transition: background-color 160ms ease, border-color 160ms ease, color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
        }

        @media (hover: hover) and (pointer: fine) {
          .parent-primary-button:hover {
            background-color: #F45F52;
            color: #FFFFFF;
            box-shadow: 0 8px 20px rgba(255, 111, 97, 0.24);
            transform: translateY(-1px);
          }

          .parent-danger-button:hover {
            background-color: #FEE2E2;
            border-color: #FCA5A5;
            color: #B91C1C;
            box-shadow: 0 4px 12px rgba(185, 28, 28, 0.10);
          }

          .parent-soft-button:hover {
            background-color: rgba(174, 223, 247, 0.28);
            border-color: #AEDFF7;
            color: #1A73A7;
            box-shadow: 0 1px 6px rgba(15, 23, 42, 0.06);
          }

          .parent-icon-button:hover {
            background-color: rgba(174, 223, 247, 0.22);
            border-color: #AEDFF7;
            color: #1A73A7;
            box-shadow: 0 1px 6px rgba(15, 23, 42, 0.06);
          }

          .parent-card-action:hover {
            border-color: #7CCDF0;
            box-shadow: 0 6px 18px rgba(15, 23, 42, 0.08);
            transform: translateY(-1px);
          }

          .parent-segment-button:hover,
          .parent-tab-button:hover {
            background-color: rgba(174, 223, 247, 0.22);
            color: #0F172A;
          }
        }

        .parent-primary-button:focus-visible,
        .parent-danger-button:focus-visible,
        .parent-soft-button:focus-visible,
        .parent-icon-button:focus-visible,
        .parent-segment-button:focus-visible,
        .parent-tab-button:focus-visible {
          outline: 3px solid rgba(174, 223, 247, 0.70);
          outline-offset: 2px;
        }

        .parent-primary-button:disabled,
        .parent-danger-button:disabled,
        .parent-soft-button:disabled,
        .parent-icon-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          transform: none;
          box-shadow: none;
        }

        .parent-primary-button:disabled:hover,
        .parent-danger-button:disabled:hover,
        .parent-soft-button:disabled:hover,
        .parent-icon-button:disabled:hover {
          transform: none;
          box-shadow: none;
        }

        .parent-primary-button:active,
        .parent-danger-button:active,
        .parent-soft-button:active,
        .parent-icon-button:active,
        .parent-card-action:active,
        .parent-segment-button:active,
        .parent-tab-button:active {
          transform: scale(0.98);
        }
      `}</style>
      {/* Desktop tab bar */}
      <div className="hidden md:block sticky top-0 z-30 border-b" style={{ background: "rgba(255,255,255,0.96)", backdropFilter: "blur(8px)", borderColor: "#C5E8F7" }}>
        <div className="max-w-3xl mx-auto px-2 flex flex-wrap gap-1 py-2 justify-center">
          {navItems.map(item => {
            const isActive = activeTab === item.id
            return (
              <button key={item.id} type="button" onClick={() => setActiveTab(item.id)}
                className="parent-tab-button flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium"
                style={isActive ? { background: "#AEDFF7", color: "#1A1A1A", boxShadow: "0 2px 10px rgba(26, 115, 167, 0.14)" } : { color: "#6B7280" }}>
                {item.icon}<span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-3 pt-4 sm:px-4 md:pt-6">
        {activeTab === "home" && (
          <div className="px-4 pt-4 pb-4 space-y-4">
            <ParentWelcomeCard
              dateLocale={dateLocale}
              parentPrenom={parentPrenom}
              childName={selectedChildHeader?.name ?? null}
              childClass={selectedChildHeader?.classe ?? null}
              childPhotoUrl={
                (selectedEnfantForWelcome as { photoUrl?: string | null } | null)?.photoUrl ?? null
              }
              noChildSubtitle={
                profilIncomplet
                  ? (profileIncompleteMessage ?? t("ui.profileIncomplete"))
                  : enfantsInFamily.length === 0
                    ? t("ui.noLinkedChild")
                    : t("ui.noChildHomeSubtitle")
              }
              greeting={t("ui.greeting")}
              greetingNamed={t("ui.greetingNamed", { name: parentPrenom })}
            />
            <HomeTab />
          </div>
        )}
        {activeTab === "photos"   && <div key={selectedEnfantId || "none"}><PhotosTab /></div>}
        {activeTab === "presence" && <div key={selectedEnfantId || "none"}><PresenceTab /></div>}
        {activeTab === "child" && (
          child ? (
          <div className="space-y-4">
            <ParentChildTabPanel
              child={child}
              dateLocale={dateLocale}
              t={t}
              formatLien={formatLien}
              authorizedPersons={authorizedPersons}
              editingDelegation={editingDelegation}
              setEditingDelegation={setEditingDelegation}
              delegationForm={delegationForm}
              setDelegationForm={setDelegationForm}
              addingDelegation={addingDelegation}
              setAddingDelegation={setAddingDelegation}
              newDelegationForm={newDelegationForm}
              setNewDelegationForm={setNewDelegationForm}
              delegationSaving={delegationSaving}
              onStartAddDelegation={() => {
                setNewDelegationForm({ ...EMPTY_DELEGATION_FORM })
                setAddingDelegation(true)
              }}
              onStartEditDelegation={handleStartEditDelegation}
              onSaveDelegation={handleSaveDelegation}
              onRequestDeleteDelegation={id => {
                if (!child?.id) return
                setDelegationDeleteTarget({ enfantId: String(child.id), delegationId: id })
              }}
              onAddDelegation={handleAddDelegation}
              onCancelAddDelegation={() => {
                setAddingDelegation(false)
                setNewDelegationForm({ ...EMPTY_DELEGATION_FORM })
              }}
            />
          </div>
          ) : (
            <div className="px-4 pt-2 pb-4">
              <Card className="border shadow-sm rounded-2xl" style={{ borderColor: "#AEDFF7" }}>
                <CardContent className="py-10 px-4 text-center text-sm text-muted-foreground leading-relaxed">
                  {t("ui.featureRequiresChild")}
                </CardContent>
              </Card>
            </div>
          )
        )}
        {activeTab === "menu"     && <div key={selectedEnfantId || "none"}><MenuTab /></div>}
        {activeTab === "events"   && <div key={selectedEnfantId || "none"}><EventsTab /></div>}
      </div>

      <ParentEventModals />

      <SimpleConfirmDialog
        open={santeDeleteOpen}
        title={t("ui.santeDeleteConfirm")}
        confirmLabel={t("ui.delegationDialogConfirm")}
        cancelLabel={t("ui.delegationDialogCancel")}
        variant="destructive"
        pending={santeDeleting}
        onCancel={() => {
          if (!santeDeleting) setSanteDeleteOpen(false)
        }}
        onConfirm={handleDeleteSante}
      />

      <SimpleConfirmDialog
        open={delegationDeleteTarget !== null}
        title={t("ui.delegationDialogTitle")}
        description={t("ui.delegationDialogDescription")}
        confirmLabel={t("ui.delegationDialogConfirm")}
        cancelLabel={t("ui.delegationDialogCancel")}
        variant="destructive"
        pending={delegationSaving}
        onCancel={() => {
          if (!delegationSaving) setDelegationDeleteTarget(null)
        }}
        onConfirm={performDeleteDelegation}
      />

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 border-t"
        style={{ background: "rgba(255,255,255,0.97)", backdropFilter: "blur(10px)", borderColor: "#C5E8F7", paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
          {navItems.map(item => {
            const isActive = activeTab === item.id
            return (
              <button key={item.id} type="button" onClick={() => setActiveTab(item.id)}
                className={"parent-tab-button flex flex-col items-center justify-center gap-0.5 flex-1 py-2 rounded-xl "+(isActive?"":"text-gray-400")}
                style={isActive ? { color: "#FF6F61", background: "#FFF4F2", boxShadow: "inset 0 0 0 1px rgba(255, 111, 97, 0.14)" } : {}}>
                <span style={{ transform: isActive ? "scale(1.1)" : "scale(1)", transition: "transform 0.15s" }}>{item.icon}</span>
                <span className="text-[10px] font-medium" style={isActive ? { color: "#FF6F61" } : {}}>{item.label}</span>
                {isActive && <span className="w-1 h-1 rounded-full mt-0.5" style={{ background: "#FF6F61" }} />}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
