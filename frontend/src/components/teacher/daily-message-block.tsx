"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RichTextEditorLite } from "@/components/rich-text/rich-text-editor-lite"
import { apiClient } from "@/lib/api"
import {
  isRichHtmlEmpty,
  normalizeRichHtml,
  plainTextToRichHtml,
  richHtmlToPlainText,
  sanitizeRichHtml,
} from "@/lib/rich-text"
import { cn } from "@/lib/utils"
import { Loader2, Pencil, Sparkles } from "lucide-react"
import { InlineAlert } from "@/components/ui/inline-alert"
import { notifySuccess } from "@/lib/feedback"
import { useTranslations } from "next-intl"

type CollectiveSummary = {
  id: string
  statut: "Brouillon" | "Publie"
  observations?: string | null
  activites?: string
  apprentissages?: string
  humeurGroupe?: string
}

export type DailyMessageBlockProps = {
  classeId: string
  dateYmd: string
  t: (key: string, values?: Record<string, string | number>) => string
}

const aiButtonClass = cn(
  "h-9 gap-2 rounded-xl border border-violet-200 bg-violet-50 text-violet-800 shadow-sm",
  "hover:bg-violet-100 hover:border-violet-300 hover:text-violet-900",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:ring-offset-2",
  "disabled:pointer-events-none disabled:opacity-50 disabled:hover:bg-violet-50 disabled:hover:border-violet-200",
)

export function DailyMessageBlock({ classeId, dateYmd, t }: DailyMessageBlockProps) {
  const tc = useTranslations("common")
  const [summary, setSummary] = useState<CollectiveSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [html, setHtml] = useState("")
  const [savedHtml, setSavedHtml] = useState("")
  const [saving, setSaving] = useState(false)
  const [rewriting, setRewriting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [editingPublished, setEditingPublished] = useState(false)
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; text: string } | null>(null)

  const isPublished = summary?.statut === "Publie"
  const readonly = isPublished && !editingPublished

  const dirty = useMemo(() => {
    return normalizeRichHtml(html) !== normalizeRichHtml(savedHtml)
  }, [html, savedHtml])

  const loadSummary = useCallback(async () => {
    if (!classeId || !dateYmd) return
    setLoading(true)
    setFeedback(null)
    try {
      const res = await apiClient.listClassDailySummaries({
        classeId,
        date: dateYmd,
        page: 1,
        pageSize: 1,
      })
      const payload = res.data as { data?: CollectiveSummary[] }
      const row = Array.isArray(payload?.data) ? payload.data[0] : null
      setSummary(row ?? null)
      const obs = row?.observations?.trim()
        ? sanitizeRichHtml(row.observations)
        : ""
      setHtml(obs)
      setSavedHtml(obs)
      setEditingPublished(false)
    } catch {
      setSummary(null)
      setHtml("")
      setSavedHtml("")
      setFeedback({ type: "error", text: t("errors.loadSummaryError") })
    } finally {
      setLoading(false)
    }
  }, [classeId, dateYmd, t])

  useEffect(() => {
    void loadSummary()
  }, [loadSummary])

  const handleSave = async () => {
    if (!classeId || readonly || !dirty) return
    setSaving(true)
    setFeedback(null)
    const observations = sanitizeRichHtml(html) || null
    try {
      if (summary?.id) {
        await apiClient.updateClassDailySummary(summary.id, { observations })
        setSummary(prev => (prev ? { ...prev, observations: observations ?? "" } : prev))
      } else {
        const res = await apiClient.createClassDailySummary({
          classeId,
          date: dateYmd,
          activites: "—",
          apprentissages: "—",
          humeurGroupe: "Bonne",
          observations,
        })
        const created = res.data as CollectiveSummary
        setSummary(created)
      }
      const next = observations ?? ""
      setSavedHtml(next)
      setHtml(next)
      if (isPublished) {
        setEditingPublished(false)
        notifySuccess(t("success.dailyMessageUpdated"))
      } else {
        notifySuccess(t("success.dailyMessageSaved"))
      }
    } catch {
      setFeedback({ type: "error", text: t("errors.saveMessageError") })
    } finally {
      setSaving(false)
    }
  }

  const handleAiRewrite = async () => {
    if (readonly || rewriting) return
    const plain = richHtmlToPlainText(html)
    if (!plain.trim()) {
      setFeedback({ type: "error", text: t("errors.aiRewriteInputMissing") })
      return
    }
    setRewriting(true)
    setFeedback(null)
    try {
      const res = await apiClient.rewriteDailyMessageWithAi(plain)
      const data = res.data as { message?: string }
      const rewritten = typeof data?.message === "string" ? data.message.trim() : ""
      if (!rewritten) throw new Error("empty")
      setHtml(plainTextToRichHtml(rewritten))
      notifySuccess(t("success.aiRewriteReady"))
    } catch {
      setFeedback({ type: "error", text: t("errors.aiRewriteError") })
    } finally {
      setRewriting(false)
    }
  }

  const handlePublish = async () => {
    if (!summary?.id || publishing) return
    if (dirty) {
      setFeedback({ type: "error", text: t("errors.unsavedBeforePublish") })
      return
    }
    setPublishing(true)
    setFeedback(null)
    try {
      await apiClient.publishClassDailySummary(summary.id)
      setSummary(prev => (prev ? { ...prev, statut: "Publie" } : prev))
      setEditingPublished(false)
      notifySuccess(t("success.messageSentToParents"))
    } catch {
      setFeedback({ type: "error", text: t("errors.sendMessageError") })
    } finally {
      setPublishing(false)
    }
  }

  return (
    <Card className="border border-sky-100 shadow-sm rounded-2xl overflow-hidden bg-gradient-to-br from-white to-sky-50/30">
      <CardHeader className="pb-3 border-b border-sky-100">
        <CardTitle className="text-base font-bold text-gray-900">
          {t("sections.dailyMessageTitle")}
        </CardTitle>
        {isPublished && !editingPublished ? (
          <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg px-2.5 py-1.5 mt-2">
            {t("sections.publishedHint")}
          </p>
        ) : null}
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {loading ? (
          <p className="text-sm text-gray-400 py-6 text-center">{t("loading")}</p>
        ) : (
          <>
            <RichTextEditorLite
              value={html}
              onChange={setHtml}
              placeholder={t("sections.dailyMessagePlaceholder")}
              disabled={readonly}
              aria-label={t("sections.dailyMessageTitle")}
              linkPrompt={{
                title: tc("linkPromptTitle"),
                label: tc("linkPromptLabel"),
                placeholder: tc("linkPromptPlaceholder"),
                confirmLabel: tc("confirm"),
                cancelLabel: tc("cancel"),
              }}
            />

            {feedback ? (
              <InlineAlert
                variant={feedback.type === "success" ? "success" : "error"}
                onDismiss={() => setFeedback(null)}
              >
                {feedback.text}
              </InlineAlert>
            ) : null}

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className={aiButtonClass}
                disabled={readonly || rewriting || isRichHtmlEmpty(html)}
                onClick={() => void handleAiRewrite()}
              >
                {rewriting ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                ) : (
                  <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                )}
                {rewriting ? t("sections.aiRewritingButton") : t("sections.aiRewriteButton")}
              </Button>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap sm:justify-end">
                {isPublished && !editingPublished ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-9 rounded-xl gap-1.5 border-sky-200 text-sky-800"
                    onClick={() => {
                      setEditingPublished(true)
                      setFeedback(null)
                    }}
                  >
                    <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                    {t("sections.editButton")}
                  </Button>
                ) : (
                  <>
                    {isPublished && editingPublished ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-9 rounded-xl"
                        disabled={saving}
                        onClick={() => {
                          setHtml(savedHtml)
                          setEditingPublished(false)
                          setFeedback(null)
                        }}
                      >
                        {t("sections.cancelEditButton")}
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      className="h-9 rounded-xl"
                      disabled={readonly || saving || !dirty}
                      onClick={() => void handleSave()}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" aria-hidden />
                          …
                        </>
                      ) : (
                        t("sections.saveButton")
                      )}
                    </Button>
                    {summary?.id && summary.statut === "Brouillon" ? (
                      <Button
                        type="button"
                        variant="secondary"
                        className="h-9 rounded-xl"
                        disabled={publishing || dirty || readonly}
                        onClick={() => void handlePublish()}
                      >
                        {publishing ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-1.5" aria-hidden />
                        ) : null}
                        {t("sections.sendAllButton")}
                      </Button>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
