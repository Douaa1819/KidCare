"use client"

import { use, useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SidebarNew } from "@/components/layout/sidebar-new"
import { AdminMainContent } from "@/components/layout/sidebar-context"
import { apiClient } from "@/lib/api"
import { Locale } from "@/lib/i18n/config"
import { useTranslations } from "next-intl"
import { RichTextEditorLite } from "@/components/rich-text/rich-text-editor-lite"
import { RichTextDisplay } from "@/components/rich-text/rich-text-display"
import { renderReglementContent } from "@/lib/rich-text"

export default function ReglementInterieurAdminPage({
  params,
}: {
  params: Promise<{ locale: Locale }>
}) {
  const { locale } = use(params)
  const t = useTranslations("admin.reglement")
  const dateLocale = locale === "ar" ? "ar-MA" : "fr-FR"
  const [contenu, setContenu] = useState("")
  const [version, setVersion] = useState<number | null>(null)
  const [modifieLe, setModifieLe] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [preview, setPreview] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await apiClient.getAdminReglement()
        if (!cancelled) {
          setContenu(renderReglementContent(res.data?.contenu ?? ""))
          setVersion(res.data?.version ?? null)
          setModifieLe(res.data?.modifieLe ?? null)
        }
      } catch {
        if (!cancelled) setErrorMsg(t("loadError"))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  const handleSave = async () => {
    if (!contenu.trim()) {
      setErrorMsg(t("emptyError"))
      return
    }
    setSaving(true)
    setErrorMsg(null)
    setSuccessMsg(null)
    try {
      const res = await apiClient.updateAdminReglement(contenu)
      setVersion(res.data?.version ?? version)
      setModifieLe(res.data?.modifieLe ?? null)
      setSuccessMsg(t("success"))
    } catch {
      setErrorMsg(t("saveError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={locale} />

      <AdminMainContent className="p-4 md:p-8 pt-16 md:pt-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">
                {t("subtitle")}
              </p>
              {version && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t("versionLine", { version })}
                  {modifieLe &&
                    ` · ${t("modifiedOn", { date: new Date(modifieLe).toLocaleDateString(dateLocale, { day: "2-digit", month: "long", year: "numeric" }) })}`}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setPreview(!preview)}
                className="text-sm"
              >
                {preview ? t("edit") : t("preview")}
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-primary text-primary-foreground text-sm"
              >
                {saving ? t("saving") : t("save")}
              </Button>
            </div>
          </div>

          {successMsg && (
            <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-md px-4 py-3">
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-md px-4 py-3">
              {errorMsg}
            </div>
          )}

          <Card className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <p className="text-muted-foreground text-sm">{t("loading")}</p>
              </div>
            ) : preview ? (
              /* Preview mode */
              <div className="min-h-64">
                <p className="text-xs text-muted-foreground mb-4 italic">{t("previewHint")}</p>
                <RichTextDisplay html={renderReglementContent(contenu)} className="text-sm text-muted-foreground" />
              </div>
            ) : (
              /* Edit mode */
              <div className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <Label className="text-sm font-medium">{t("contentLabel")}</Label>
                  <span className="text-xs text-muted-foreground">
                    Gras, italique, titres, listes, liens et aperçu.
                  </span>
                </div>
                <RichTextEditorLite
                  value={contenu}
                  onChange={setContenu}
                  placeholder={t("contentPlaceholder")}
                  className="border-border"
                />
                <p className="text-xs text-muted-foreground">
                  {t("footerNote")}
                </p>
              </div>
            )}
          </Card>
        </div>
      </AdminMainContent>
    </div>
  )
}

function Label({ className, children }: { className?: string; children: React.ReactNode }) {
  return <label className={className}>{children}</label>
}
