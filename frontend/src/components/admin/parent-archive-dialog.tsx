"use client"

import { useEffect, useState } from "react"
import { Archive, Loader2, X, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { apiClient } from "@/lib/api"
import { getApiErrorMessage } from "@/lib/feedback"

export type ParentArchivePreviewChild = {
  id: string
  prenom: string
  nom: string
  classeNom?: string | null
  hasOtherActiveGuardian: boolean
  otherGuardians: Array<{ prenom: string; nom: string; email: string }>
  archiveByDefault: boolean
}

type ParentArchiveDialogProps = {
  open: boolean
  userId: string
  parentLabel: string
  onClose: () => void
  onArchived: (result: { archivedChildren: number; skippedChildren: number }) => void
  t: (key: string, values?: Record<string, string | number>) => string
}

export function ParentArchiveDialog({
  open,
  userId,
  parentLabel,
  onClose,
  onArchived,
  t,
}: ParentArchiveDialogProps) {
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [children, setChildren] = useState<ParentArchivePreviewChild[]>([])
  const [archiveChildren, setArchiveChildren] = useState(true)
  const [confirmedChildIds, setConfirmedChildIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open || !userId) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      setArchiveChildren(true)
      setConfirmedChildIds(new Set())
      try {
        const res = await apiClient.getParentArchivePreview(userId)
        const payload = res.data as { children?: ParentArchivePreviewChild[] }
        if (!cancelled) {
          setChildren(Array.isArray(payload?.children) ? payload.children : [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err, t("archivePreviewError")))
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, userId, t])

  const childrenWithGuardian = children.filter((c) => c.hasOtherActiveGuardian)
  const childrenAutoArchive = children.filter((c) => !c.hasOtherActiveGuardian)

  const toggleConfirmed = (childId: string) => {
    setConfirmedChildIds((prev) => {
      const next = new Set(prev)
      if (next.has(childId)) next.delete(childId)
      else next.add(childId)
      return next
    })
  }

  const handleConfirm = async () => {
    setPending(true)
    setError(null)
    try {
      const res = await apiClient.archiveParent(userId, {
        archiveLinkedChildren: archiveChildren,
        confirmedChildIds: archiveChildren ? Array.from(confirmedChildIds) : [],
      })
      const data = res.data as { archivedChildren?: number; skippedChildren?: number }
      onArchived({
        archivedChildren: data.archivedChildren ?? 0,
        skippedChildren: data.skippedChildren ?? 0,
      })
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err, t("archiveError")))
    } finally {
      setPending(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div
        role="dialog"
        aria-modal
        className="w-full max-w-lg rounded-xl bg-white shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <Archive className="h-5 w-5 text-amber-700" aria-hidden />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">{t("archiveParentTitle")}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{parentLabel}</p>
            </div>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
            onClick={() => !pending && onClose()}
            aria-label={t("cancel")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4 max-h-[70vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              {t("archivePreviewLoading")}
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">{t("archiveParentDescription")}</p>

              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/30">
                  <input
                    type="radio"
                    name="archive-mode"
                    className="mt-1"
                    checked={!archiveChildren}
                    onChange={() => setArchiveChildren(false)}
                  />
                  <span>
                    <span className="block text-sm font-medium">{t("archiveParentOnly")}</span>
                    <span className="block text-xs text-muted-foreground">{t("archiveParentOnlyHint")}</span>
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-muted/30">
                  <input
                    type="radio"
                    name="archive-mode"
                    className="mt-1"
                    checked={archiveChildren}
                    onChange={() => setArchiveChildren(true)}
                  />
                  <span>
                    <span className="block text-sm font-medium">{t("archiveParentAndChildren")}</span>
                    <span className="block text-xs text-muted-foreground">{t("archiveParentAndChildrenHint")}</span>
                  </span>
                </label>
              </div>

              {archiveChildren && children.length > 0 ? (
                <div className="space-y-3 rounded-lg border border-amber-100 bg-amber-50/40 p-3">
                  {childrenAutoArchive.length > 0 ? (
                    <div>
                      <p className="text-xs font-semibold text-amber-900">{t("childrenAutoArchiveTitle")}</p>
                      <ul className="mt-2 space-y-1 text-sm text-gray-700">
                        {childrenAutoArchive.map((c) => (
                          <li key={c.id}>
                            {c.prenom} {c.nom}
                            {c.classeNom ? ` — ${c.classeNom}` : ""}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  {childrenWithGuardian.length > 0 ? (
                    <div>
                      <div className="flex items-start gap-2 text-xs text-amber-900">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
                        <p>{t("childrenGuardianWarning")}</p>
                      </div>
                      <ul className="mt-3 space-y-2">
                        {childrenWithGuardian.map((c) => (
                          <li key={c.id} className="rounded-md border bg-white p-2">
                            <label className="flex cursor-pointer items-start gap-2">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={confirmedChildIds.has(c.id)}
                                onChange={() => toggleConfirmed(c.id)}
                              />
                              <span className="text-sm">
                                <span className="font-medium">
                                  {c.prenom} {c.nom}
                                </span>
                                {c.classeNom ? (
                                  <span className="text-muted-foreground"> — {c.classeNom}</span>
                                ) : null}
                                <span className="block text-xs text-muted-foreground mt-0.5">
                                  {t("otherGuardians", {
                                    names: c.otherGuardians
                                      .map((g) => `${g.prenom} ${g.nom}`.trim())
                                      .join(", "),
                                  })}
                                </span>
                              </span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
            </>
          )}
        </div>

        <div className="flex gap-3 border-t px-5 py-4">
          <Button variant="outline" className="flex-1" disabled={pending} onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            variant="warning"
            className="flex-1"
            disabled={pending || loading}
            onClick={() => void handleConfirm()}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {t("archiveConfirm")}
          </Button>
        </div>
      </div>
    </div>
  )
}
