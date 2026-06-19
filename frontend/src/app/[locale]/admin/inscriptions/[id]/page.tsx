"use client"

/* eslint-disable @typescript-eslint/no-explicit-any, react/no-unescaped-entities */

import { use, useEffect, useState, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  Baby,
  Users,
  UserCircle,
  HeartPulse,
  ShieldCheck,
  FileCheck,
  StickyNote,
  FolderOpen,
  Mail,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Loader2,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SidebarNew } from "@/components/layout/sidebar-new"
import { AdminMainContent } from "@/components/layout/sidebar-context"
import { apiClient } from "@/lib/api"
import type { Locale } from "@/lib/i18n/config"
import { formatFoodRestriction } from "@/lib/form-validation"
import { normalizeAuthorizedPerson, resolveInscriptionChildPhoto } from "@/lib/admin/enfant-profile"
import { inscriptionStatusBadgeVariant } from "@/lib/design/status-badges"
import { getApiErrorMessage, notifyError, notifySuccess } from "@/lib/feedback"
import { useTranslations } from "next-intl"
import { RejectInscriptionDialog } from "@/components/admin/reject-inscription-dialog"
import {
  extractEnfantDossierFields,
  extractFamilleDossierFields,
  type TuteurPayload,
} from "@/lib/admin/inscription-dossier"

type ClasseItem = { id: string; nom: string; niveau?: string | null }

const LIEN_LABELS: Record<string, string> = {
  Mere: "Mère", Pere: "Père", Tuteur: "Tuteur/Tutrice",
  GrandMere: "Grand-mère", GrandPere: "Grand-père", Autre: "Autre",
}
const formatLien = (lien?: string | null): string =>
  (lien && LIEN_LABELS[lien]) ? LIEN_LABELS[lien] : (lien ?? "—")

function formatEmailError(code: string | null | undefined): string | null {
  if (!code) return null
  if (code === "NO_PARENT_EMAIL") return "Aucun email parent trouvé dans le dossier"
  return code
}

function formatSentAt(iso: string | null | undefined, locale: Locale): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleString(locale === "ar" ? "ar-MA" : "fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

type EmailDeliveryStatus = "sent" | "failed" | "pending"

function resolveEmailStatus(
  sentAt: string | null | undefined,
  error: string | null | undefined,
): EmailDeliveryStatus {
  if (sentAt && !error) return "sent"
  if (error && !sentAt) return "failed"
  if (sentAt && error) return "sent"
  return "pending"
}

function EmailStatusBadge({ status }: { status: EmailDeliveryStatus }) {
  if (status === "sent") {
    return (
      <Badge variant="accepted" className="gap-1">
        <CheckCircle2 className="w-3 h-3" aria-hidden />
        Envoyé
      </Badge>
    )
  }
  if (status === "failed") {
    return (
      <Badge variant="rejected" className="gap-1">
        <XCircle className="w-3 h-3" aria-hidden />
        Échec
      </Badge>
    )
  }
  return (
    <Badge variant="review" className="gap-1">
      <AlertTriangle className="w-3 h-3" aria-hidden />
      Non envoyé
    </Badge>
  )
}

function SectionTitle({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-4 pb-3 border-b border-border/60">
      <span className="w-8 h-8 rounded-lg bg-[var(--primary-light)] border border-[var(--status-progress-border)] flex items-center justify-center shrink-0">
        <Icon className="w-4 h-4 text-[var(--status-progress-text)]" aria-hidden />
      </span>
      <span className="uppercase tracking-wide text-xs text-muted-foreground">{children}</span>
    </h2>
  )
}

interface AdminInscriptionDetailProps {
  params: Promise<{ locale: Locale; id: string }>
}

export default function AdminInscriptionDetailPage({ params }: AdminInscriptionDetailProps) {
  const resolvedParams = use(params)
  const { id, locale } = resolvedParams
  const router = useRouter()
  const t = useTranslations("admin.inscriptions")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [inscription, setInscription] = useState<any | null>(null)
  const [classes, setClasses] = useState<ClasseItem[]>([])
  const [resendingConfirmation, setResendingConfirmation] = useState(false)
  const [resendingCredentials, setResendingCredentials] = useState(false)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectPending, setRejectPending] = useState(false)
  const [acceptPending, setAcceptPending] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchAll() {
      try {
        setLoading(true)
        setError(null)
        const [inscRes, classesRes] = await Promise.all([
          apiClient.getAdminInscription(id),
          apiClient.listClasses().catch(() => ({ data: [] })),
        ])
        if (!cancelled) {
          setInscription(inscRes.data)
          const raw = classesRes.data
          const list = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : (raw?.items ?? []))
          setClasses(list)
        }
      } catch (err: any) {
        console.error("[Admin/InscriptionDetail] Error loading inscription", err)
        if (!cancelled) setError("Impossible de charger le détail de l'inscription.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAll()
    return () => { cancelled = true }
  }, [id])

  const goBack = () => router.push(`/${locale}/admin/inscriptions`)

  const handleAccept = async () => {
    try {
      setAcceptPending(true)
      const res = await apiClient.acceptAdminInscription(id)
      if (res.data) setInscription((prev: typeof inscription) => ({ ...prev, ...res.data, statut: "ACTIF" }))
      notifySuccess("Inscription acceptée.")
    } catch (err) {
      notifyError(getApiErrorMessage(err, t("errors.accept")))
    } finally {
      setAcceptPending(false)
    }
  }

  const handleReject = async (raison?: string) => {
    try {
      setRejectPending(true)
      const res = await apiClient.rejectAdminInscription(id, raison)
      const data = res.data as { emailSent?: boolean; statut?: string; notes?: string | null }
      setInscription((prev: typeof inscription) =>
        prev ? { ...prev, statut: "REJETEE", notes: raison?.trim() || data.notes || prev.notes } : prev,
      )
      setRejectDialogOpen(false)
      if (data.emailSent === false) {
        notifySuccess(t("rejectDialog.emailFailed"))
      } else if (raison?.trim()) {
        notifySuccess(t("rejectDialog.emailWithReason"))
      } else {
        notifySuccess(t("rejectDialog.emailWithoutReason"))
      }
    } catch (err) {
      notifyError(getApiErrorMessage(err, t("errors.reject")))
    } finally {
      setRejectPending(false)
    }
  }

  const handleResendConfirmation = async () => {
    try {
      setResendingConfirmation(true)
      const res = await apiClient.resendAdminInscriptionConfirmation(id)
      const data = res.data as {
        sent?: boolean
        sentCount?: number
        total?: number
        error?: string | null
        inscription?: typeof inscription
      }
      if (data.inscription) setInscription(data.inscription)
      if (data.sent) {
        notifySuccess("Email de confirmation renvoyé avec succès.")
      } else {
        notifyError(formatEmailError(data.error) ?? "L'email n'a pas pu être envoyé.")
      }
    } catch (err) {
      notifyError(getApiErrorMessage(err, "Impossible de renvoyer l'email de confirmation."))
    } finally {
      setResendingConfirmation(false)
    }
  }

  const handleResendCredentials = async () => {
    try {
      setResendingCredentials(true)
      const res = await apiClient.resendAdminInscriptionCredentials(id)
      const data = res.data as {
        sent?: boolean
        error?: string | null
        inscription?: typeof inscription
      }
      if (data.inscription) setInscription(data.inscription)
      if (data.sent) {
        notifySuccess("Identifiants renvoyés par email.")
      } else {
        notifyError(formatEmailError(data.error) ?? "Les identifiants n'ont pas pu être envoyés.")
      }
    } catch (err) {
      notifyError(getApiErrorMessage(err, "Impossible de renvoyer les identifiants."))
    } finally {
      setResendingCredentials(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Chargement…</p>
      </div>
    )
  }

  if (error || !inscription) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center flex-col gap-4">
        <p className="text-sm text-destructive">{error ?? "Inscription introuvable."}</p>
        <Button variant="outline" onClick={goBack}>← Retour aux inscriptions</Button>
      </div>
    )
  }

  const statut = inscription.statut as string | undefined
  const badgeVariant = inscriptionStatusBadgeVariant(statut as "CANDIDATURE" | "EN_COURS" | "ACTIF" | "REJETEE" | null)

  const payload = inscription.payload ?? {}
  const enfant = payload.enfant ?? {}
  const photo = resolveInscriptionChildPhoto(payload as Record<string, unknown>)
  const famille = payload.famille ?? {}
  const sante = payload.sante ?? {}
  const restrictions = payload.restrictions ?? {}
  const personnesAutorisees: any[] = restrictions.personnesAutorisees ?? []
  const sansRestriction: boolean = restrictions.sansRestriction ?? false
  const parents = inscription.parents ?? []
  type TuteurRow = { prenom?: string; nom?: string; lien?: string; email?: string; telephone?: string; cin?: string; profession?: string; adresse?: string; principal?: boolean }
  const payloadTuteurs: TuteurRow[] = payload.tuteurs ?? []

  // Résoudre l'ID de classe en nom
  const classeIdSouhaitee: string | undefined = payload.classeIdSouhaitee ?? enfant.classeIdSouhaitee
  const classeFound = classeIdSouhaitee ? classes.find((c) => c.id === classeIdSouhaitee) : undefined
  const classeNom = classeFound
    ? `${classeFound.nom}${classeFound.niveau ? ` (${classeFound.niveau})` : ""}`
    : classeIdSouhaitee

  const tagsMaladies: string[] = sante.tagsMaladies ?? []
  const tagsAllergies: string[] = sante.tagsAllergies ?? []
  const tagsIntolerances: string[] = sante.tagsIntolerances ?? []
  const tagsSuivi: string[] = sante.tagsSuivi ?? []
  const restrictionAlimentaire: string | null = sante.restrictionAlimentaire ?? payload.restrictionAlimentaire ?? null
  const hasHealthTags = tagsMaladies.length + tagsAllergies.length + tagsIntolerances.length + tagsSuivi.length > 0

  const TagList = ({ tags, colorClass }: { tags: string[]; colorClass: string }) => (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => (
        <span key={tag} className={`px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
          {tag}
        </span>
      ))}
    </div>
  )

  const Field = ({ label, value, multiline }: { label: string; value?: string | null; multiline?: boolean }) => (
    <div className="flex justify-between gap-4 py-1.5">
      <span className="text-muted-foreground text-xs shrink-0">{label}</span>
      <span
        className={`text-sm font-medium text-right max-w-[65%] break-words ${multiline ? "whitespace-pre-line" : ""} ${value ? "text-foreground" : "text-muted-foreground/70 italic"}`}
      >
        {value || "—"}
      </span>
    </div>
  )

  const enfantFields = extractEnfantDossierFields(enfant as Record<string, unknown>, locale)
  const familleFields = extractFamilleDossierFields(
    famille as Record<string, unknown>,
    payloadTuteurs as TuteurPayload[],
    locale,
  )
  const santeExtraFields = [
    { label: "Taille", value: sante.taille ? `${sante.taille} cm` : null },
    { label: "Poids", value: sante.poids ? `${sante.poids} kg` : null },
    { label: "Antécédents familiaux", value: sante.antecedentsFamiliaux ?? null, multiline: true },
    { label: "Interventions chirurgicales", value: sante.interventionsChirurgicales ?? null, multiline: true },
    { label: "Remarques parent", value: payload.commentaire ?? null, multiline: true },
  ] as const

  const confirmationEmailSentAt = inscription.confirmationEmailSentAt as string | null | undefined
  const confirmationEmailError = inscription.confirmationEmailError as string | null | undefined
  const credentialsEmailSentAt = inscription.credentialsEmailSentAt as string | null | undefined
  const credentialsEmailError = inscription.credentialsEmailError as string | null | undefined
  const confirmationStatus = resolveEmailStatus(confirmationEmailSentAt, confirmationEmailError)
  const credentialsStatus = resolveEmailStatus(credentialsEmailSentAt, credentialsEmailError)
  const showCredentialsEmail = statut === "ACTIF" || Boolean(credentialsEmailSentAt || credentialsEmailError)
  const canModerate = statut === "CANDIDATURE" || statut === "EN_COURS"

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={locale} />

      <AdminMainContent className="p-4 md:p-8 pt-16 md:pt-8">
        <div className="max-w-3xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 flex-wrap rounded-2xl border border-border/80 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-xl bg-[var(--primary-light)] border border-[var(--status-progress-border)] flex items-center justify-center shrink-0">
                <FolderOpen className="w-5 h-5 text-[var(--status-progress-text)]" aria-hidden />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl md:text-2xl font-bold text-foreground">Dossier d&apos;inscription</h1>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">ID: {inscription.id}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant={badgeVariant} className="uppercase">
                {statut ?? "Inconnu"}
              </Badge>
              {canModerate ? (
                <>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1.5 rounded-xl"
                    disabled={acceptPending || rejectPending}
                    onClick={() => void handleAccept()}
                  >
                    {acceptPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" aria-hidden />
                    )}
                    {t("actions.accept")}
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive-outline"
                    className="gap-1.5 rounded-xl"
                    disabled={acceptPending || rejectPending}
                    onClick={() => setRejectDialogOpen(true)}
                  >
                    <XCircle className="w-4 h-4" aria-hidden />
                    {t("actions.reject")}
                  </Button>
                </>
              ) : null}
              <Button variant="outline" size="sm" onClick={goBack} className="gap-1.5 rounded-xl">
                <ArrowLeft className="w-4 h-4" aria-hidden />
                Retour
              </Button>
            </div>
          </div>

          {/* Notifications email */}
          <Card className="p-6 rounded-2xl border-border/80 shadow-sm">
            <SectionTitle icon={Mail}>Notifications email</SectionTitle>
            <div className="space-y-4">
              <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-foreground">Email de confirmation (candidature)</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Accusé de réception envoyé au parent lors de la soumission du formulaire
                    </p>
                  </div>
                  <EmailStatusBadge status={confirmationStatus} />
                </div>
                {confirmationEmailSentAt ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-accepted-text)] shrink-0" aria-hidden />
                    Envoyé le {formatSentAt(confirmationEmailSentAt, locale)}
                  </p>
                ) : null}
                {confirmationEmailError ? (
                  <p className="text-xs text-destructive flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
                    {formatEmailError(confirmationEmailError)}
                  </p>
                ) : null}
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 rounded-xl"
                  onClick={() => void handleResendConfirmation()}
                  disabled={resendingConfirmation}
                >
                  {resendingConfirmation ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                  ) : (
                    <RefreshCw className="w-4 h-4" aria-hidden />
                  )}
                  Renvoyer l&apos;email de confirmation
                </Button>
              </div>

              {showCredentialsEmail ? (
                <div className="rounded-xl border border-border/80 bg-muted/20 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">Email identifiants (acceptation)</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Mot de passe temporaire envoyé après acceptation de l&apos;inscription
                      </p>
                    </div>
                    <EmailStatusBadge status={credentialsStatus} />
                  </div>
                  {credentialsEmailSentAt ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[var(--status-accepted-text)] shrink-0" aria-hidden />
                      Envoyé le {formatSentAt(credentialsEmailSentAt, locale)}
                    </p>
                  ) : statut === "ACTIF" ? (
                    <p className="text-xs text-muted-foreground">Aucun envoi enregistré pour le moment.</p>
                  ) : null}
                  {credentialsEmailError ? (
                    <p className="text-xs text-destructive flex items-start gap-1.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" aria-hidden />
                      {formatEmailError(credentialsEmailError)}
                    </p>
                  ) : null}
                  {statut === "ACTIF" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 rounded-xl"
                      onClick={() => void handleResendCredentials()}
                      disabled={resendingCredentials}
                    >
                      {resendingCredentials ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                      ) : (
                        <RefreshCw className="w-4 h-4" aria-hidden />
                      )}
                      Renvoyer les identifiants
                    </Button>
                  ) : null}
                </div>
              ) : null}
            </div>
          </Card>

          {/* Enfant */}
          <Card className="p-6 rounded-2xl border-border/80 shadow-sm">
            <SectionTitle icon={Baby}>Enfant</SectionTitle>
            <div className="flex items-start gap-5 flex-wrap">
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden bg-muted flex-shrink-0 border border-border shadow-sm">
                {photo ? (
                  <img
                    src={photo}
                    alt={`Photo — ${enfant.prenom ?? ""} ${enfant.nom ?? ""}`.trim() || "enfant"}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-muted-foreground bg-[var(--primary-light)]">
                    {enfant.prenom?.[0]?.toUpperCase() ?? "?"}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-foreground">
                  {`${enfant.prenom ?? ""} ${enfant.nom ?? ""}`.trim() || "Nom inconnu"}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Inscrit le {new Date(inscription.createdAt).toLocaleDateString(locale, { day: "2-digit", month: "long", year: "numeric" })}
                </p>
                <div className="mt-3 divide-y divide-border">
                  {enfantFields.map((f) => (
                    <Field key={f.label} label={f.label} value={f.value} multiline={f.multiline} />
                  ))}
                  <Field label="Classe souhaitée" value={classeNom ?? null} />
                </div>
              </div>
            </div>
          </Card>

          {/* Famille */}
          <Card className="p-6 rounded-2xl border-border/80 shadow-sm">
            <SectionTitle icon={Users}>Famille</SectionTitle>
            <div className="divide-y divide-border">
              {familleFields.map((f) => (
                <Field key={f.label} label={f.label} value={f.value} />
              ))}
            </div>
          </Card>

          {/* Parents / Tuteurs */}
          <Card className="p-6 rounded-2xl border-border/80 shadow-sm">
            <SectionTitle icon={UserCircle}>Parents / Tuteurs</SectionTitle>
            {/* Utilise les tuteurs du payload (CANDIDATURE) ou les parents DB (ACTIF) */}
            {(payloadTuteurs.length > 0 ? payloadTuteurs : parents).length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun parent associé à ce dossier.</p>
            ) : (
              <div className="space-y-4">
                {(payloadTuteurs.length > 0 ? payloadTuteurs : parents as TuteurRow[]).map((p, idx) => (
                  <div key={idx} className="rounded-lg border bg-background p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <p className="font-semibold text-foreground">
                        {`${p.prenom ?? ""} ${p.nom ?? ""}`.trim() || "—"}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {p.lien ? (
                          <Badge variant="outline" className="text-xs font-medium text-foreground">
                            {formatLien(p.lien)}
                          </Badge>
                        ) : null}
                        {p.principal ? (
                          <Badge variant="accepted" className="text-xs">
                            Responsable principal
                          </Badge>
                        ) : null}
                      </div>
                    </div>
                    <div className="divide-y divide-border">
                      <Field label="Email" value={p.email} />
                      <Field label="Téléphone" value={p.telephone} />
                      {p.cin && <Field label="CIN" value={p.cin} />}
                      <Field label="Profession" value={p.profession} />
                      <Field label="Adresse" value={p.adresse} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Santé */}
          <Card className="p-6 rounded-2xl border-border/80 shadow-sm">
            <SectionTitle icon={HeartPulse}>Profil Santé</SectionTitle>
            {!hasHealthTags && !restrictionAlimentaire && !santeExtraFields.some((f) => f.value) ? (
              <p className="text-xs text-muted-foreground">Aucune information de santé déclarée.</p>
            ) : (
              <div className="space-y-4">
                <div className="divide-y divide-border pb-2">
                  {santeExtraFields.map((f) => (
                    <Field
                      key={f.label}
                      label={f.label}
                      value={f.value}
                      multiline={"multiline" in f ? f.multiline : false}
                    />
                  ))}
                </div>
                {tagsMaladies.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Maladies / Antécédents</p>
                    <TagList tags={tagsMaladies} colorClass="bg-red-50 text-red-700 border-red-200" />
                  </div>
                )}
                {tagsAllergies.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Allergies</p>
                    <TagList tags={tagsAllergies} colorClass="bg-orange-50 text-orange-700 border-orange-200" />
                  </div>
                )}
                {tagsIntolerances.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Intolérances</p>
                    <TagList tags={tagsIntolerances} colorClass="bg-amber-50 text-amber-700 border-amber-200" />
                  </div>
                )}
                {tagsSuivi.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">Suivi médical</p>
                    <TagList tags={tagsSuivi} colorClass="bg-blue-50 text-blue-700 border-blue-200" />
                  </div>
                )}
                {restrictionAlimentaire && (
                  <div className="pt-2 divide-y divide-border">
                    <Field label="Restriction alimentaire" value={formatFoodRestriction(restrictionAlimentaire)} />
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* Personnes autorisées */}
          <Card className="p-6 rounded-2xl border-border/80 shadow-sm">
            <SectionTitle icon={ShieldCheck}>Personnes autorisées à récupérer l&apos;enfant</SectionTitle>
            {sansRestriction ? (
              <p className="text-xs font-medium pp-surface-success px-3 py-2 rounded-lg border inline-block">
                ✓ Sans restriction — tout représentant légal peut récupérer l'enfant
              </p>
            ) : personnesAutorisees.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune personne autorisée déclarée.</p>
            ) : (
              <div className="space-y-3">
                {personnesAutorisees.map((p: any, idx: number) => {
                  const person = normalizeAuthorizedPerson(p as Record<string, unknown>)
                  return (
                  <div key={idx} className="rounded-lg border bg-background p-4">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <p className="font-semibold text-foreground text-sm">{person.name}</p>
                      {person.relationship && (
                        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                          {person.relationship}
                        </span>
                      )}
                    </div>
                    <div className="divide-y divide-border">
                      {person.cin && <Field label="CIN" value={person.cin} />}
                      {person.phone && <Field label="Téléphone" value={person.phone} />}
                    </div>
                  </div>
                  )
                })}
              </div>
            )}
          </Card>

          {/* Déclarations */}
          <Card className="p-6 rounded-2xl border-border/80 shadow-sm">
            <SectionTitle icon={FileCheck}>Déclarations & Confirmations</SectionTitle>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 flex-shrink-0 rounded text-xs flex items-center justify-center font-bold ${payload.declarationHonneur ? "pp-surface-success border" : "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]"}`}>
                  {payload.declarationHonneur ? "✓" : "—"}
                </span>
                <span className="text-sm">Déclaration sur l'honneur signée</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`w-4 h-4 flex-shrink-0 rounded text-xs flex items-center justify-center font-bold ${payload.confirmationExacte ? "pp-surface-success border" : "bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]"}`}>
                  {payload.confirmationExacte ? "✓" : "—"}
                </span>
                <span className="text-sm">Règlement intérieur accepté</span>
              </div>
            </div>
          </Card>

          {/* Motif du refus */}
          {statut === "REJETEE" && inscription.notes ? (
            <Card className="p-6 rounded-2xl border-border/80 shadow-sm pp-surface-rejected border">
              <SectionTitle icon={StickyNote}>{t("rejectReasonTitle")}</SectionTitle>
              <p className="text-sm text-foreground whitespace-pre-wrap">{inscription.notes}</p>
            </Card>
          ) : null}

          {/* Notes admin (hors refus) */}
          {inscription.notes && statut !== "REJETEE" ? (
            <Card className="p-6 rounded-2xl border-border/80 shadow-sm">
              <SectionTitle icon={StickyNote}>Notes administratives</SectionTitle>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{inscription.notes}</p>
            </Card>
          ) : null}
        </div>
      </AdminMainContent>

      <RejectInscriptionDialog
        open={rejectDialogOpen}
        title={t("rejectDialog.title")}
        description={t("rejectDialog.description")}
        reasonLabel={t("rejectDialog.reasonLabel")}
        reasonPlaceholder={t("rejectDialog.reasonPlaceholder")}
        confirmLabel={t("rejectDialog.confirm")}
        cancelLabel={t("rejectDialog.cancel")}
        pending={rejectPending}
        onCancel={() => {
          if (!rejectPending) setRejectDialogOpen(false)
        }}
        onConfirm={(raison) => void handleReject(raison)}
      />
    </div>
  )
}
