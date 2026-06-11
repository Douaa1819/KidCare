"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ActivityPhotoFromApi } from "@/components/activity-photo-from-api"
import { Camera, Trash2, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ACTIVITY_PHOTO_ACCEPT,
  type ActivityPhotoValidationErrorKey,
  filterValidActivityPhotoFiles,
} from "@/lib/activity-photo-upload"

export type ClassActivityPhotoRow = { id: string; mimeType?: string; legende?: string | null }

type StagedPhoto = { file: File; preview: string }

export type TeacherActivityPhotosSectionProps = {
  t: (k: string, values?: Record<string, number | string>) => string
  dateYmd: string
  onDateChange: (v: string) => void
  photos: ClassActivityPhotoRow[]
  loading: boolean
  legende: string
  onLegendeChange: (v: string) => void
  uploading: boolean
  onUploadFiles: (files: File[]) => Promise<void>
  onDelete: (id: string) => void
  onValidationError?: (key: ActivityPhotoValidationErrorKey) => void
}

const dateInputClass =
  "h-9 min-h-9 text-sm rounded-xl border-sky-200 bg-white w-full min-w-0 sm:w-auto sm:min-w-[9.5rem]"

function PhotoSkeletonTile() {
  return <div className="aspect-[4/3] w-full rounded-xl bg-sky-100/80 animate-pulse" aria-hidden />
}

function ActivityPhotoTile({
  photo,
  onDelete,
  deleteLabel,
}: {
  photo: ClassActivityPhotoRow
  onDelete: (id: string) => void
  deleteLabel: string
}) {
  return (
    <div className="group relative overflow-hidden rounded-xl border border-sky-100 bg-white shadow-sm">
      <ActivityPhotoFromApi
        photoId={photo.id}
        linkToFull
        imgClassName="aspect-[4/3] w-full object-cover"
      />
      {photo.legende ? (
        <p className="border-t border-sky-50 px-2.5 py-2 text-xs leading-snug text-gray-600 line-clamp-2">
          {photo.legende}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => onDelete(photo.id)}
        className="absolute top-2 right-2 rounded-lg border border-red-200 bg-white/95 p-1.5 text-red-600 shadow-sm opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100"
        aria-label={deleteLabel}
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  )
}

/** Album classe : galerie visible dans la carte + modale dédiée à l’envoi */
export function TeacherActivityPhotosSection({
  t,
  dateYmd,
  onDateChange,
  photos,
  loading,
  legende,
  onLegendeChange,
  uploading,
  onUploadFiles,
  onDelete,
  onValidationError,
}: TeacherActivityPhotosSectionProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [staged, setStaged] = useState<StagedPhoto[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showSkeleton = loading && photos.length === 0
  const showEmpty = !loading && photos.length === 0
  const showGallery = photos.length > 0

  useEffect(() => {
    if (!modalOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setModalOpen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [modalOpen])

  useEffect(() => {
    if (modalOpen) return
    setStaged(prev => {
      prev.forEach(s => URL.revokeObjectURL(s.preview))
      return []
    })
  }, [modalOpen])

  const addFiles = (list: FileList | null) => {
    if (!list?.length) return
    const { valid, errors } = filterValidActivityPhotoFiles(Array.from(list))
    if (errors.length > 0) {
      onValidationError?.(errors[0])
    }
    if (!valid.length) return
    const next = valid.map(file => ({ file, preview: URL.createObjectURL(file) }))
    setStaged(prev => [...prev, ...next])
  }

  const removeStaged = (index: number) => {
    setStaged(prev => {
      const copy = [...prev]
      const [removed] = copy.splice(index, 1)
      if (removed) URL.revokeObjectURL(removed.preview)
      return copy
    })
  }

  const handleSendStaged = async () => {
    if (staged.length === 0) return
    const files = staged.map(s => s.file)
    await onUploadFiles(files)
    setStaged(prev => {
      prev.forEach(s => URL.revokeObjectURL(s.preview))
      return []
    })
    setModalOpen(false)
  }

  return (
    <>
      <Card className="overflow-hidden border border-sky-100 shadow-sm rounded-2xl lg:col-span-3 bg-gradient-to-br from-sky-50/60 via-white to-white">
        <CardContent className="p-4 sm:p-5 space-y-4">
          {/* En-tête : titre à gauche, actions à droite (desktop) / empilé (mobile) */}
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between md:gap-6">
            <div className="min-w-0 flex-1 space-y-1">
              <h2 className="text-base font-bold leading-tight text-gray-900 sm:text-lg">
                {t("activityPhotosTitle")}
              </h2>
              <p className="text-xs leading-relaxed text-gray-500 sm:text-sm max-w-xl">
                {t("activityPhotosSubtitle")}
              </p>
              {!showSkeleton && (
                <p className="text-xs font-medium text-sky-800/90 pt-0.5">
                  {loading && photos.length > 0
                    ? t("activityPhotosLoading")
                    : t("activityPhotosCountThisDay", { count: photos.length })}
                </p>
              )}
            </div>

            <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center md:w-auto md:shrink-0 md:justify-end">
              <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2">
                <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
                  {t("activityPhotosDate")}
                </span>
                <Input
                  type="date"
                  value={dateYmd}
                  onChange={e => onDateChange(e.target.value)}
                  className={dateInputClass}
                />
              </label>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="h-9 w-full sm:w-auto sm:min-w-[11rem] shrink-0"
                onClick={() => setModalOpen(true)}
              >
                <Camera className="h-4 w-4 shrink-0" aria-hidden />
                <span>{t("activityPhotosManage")}</span>
              </Button>
            </div>
          </div>

          {/* Galerie above the fold */}
          {showSkeleton ? (
            <div
              className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4"
              aria-busy="true"
              aria-label={t("activityPhotosLoading")}
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <PhotoSkeletonTile key={i} />
              ))}
            </div>
          ) : showGallery ? (
            <div
              className={cn(
                "grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4",
                loading && "opacity-90",
              )}
            >
              {photos.map(p => (
                <ActivityPhotoTile
                  key={p.id}
                  photo={p}
                  onDelete={onDelete}
                  deleteLabel={t("activityPhotosDelete")}
                />
              ))}
            </div>
          ) : showEmpty ? (
            <div className="rounded-xl border border-dashed border-sky-200 bg-sky-50/40 px-4 py-8 text-center">
              <p className="text-sm text-gray-500">{t("activityPhotosEmpty")}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-3 gap-2 rounded-xl border-sky-300 bg-white text-sky-800 hover:bg-sky-50 hover:text-sky-900 hover:border-sky-400"
                onClick={() => setModalOpen(true)}
              >
                <Camera className="h-4 w-4" aria-hidden />
                {t("activityPhotosManage")}
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
          role="presentation"
          onClick={() => setModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal
            aria-labelledby="activity-photos-modal-title"
            className="flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:max-w-lg sm:rounded-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex shrink-0 items-center justify-between border-b border-gray-100 bg-white px-4 py-3">
              <h3 id="activity-photos-modal-title" className="pr-2 text-sm font-bold text-gray-900">
                {t("activityPhotosModalTitle")}
              </h3>
              <button
                type="button"
                className="shrink-0 rounded-lg p-2 text-gray-500 hover:bg-gray-100"
                onClick={() => setModalOpen(false)}
                aria-label={t("activityPhotosClose")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-700">
                  {t("activityPhotosLegende")}
                </label>
                <Input
                  value={legende}
                  onChange={e => onLegendeChange(e.target.value)}
                  placeholder={t("activityPhotosLegende")}
                  className="h-9 rounded-xl text-sm"
                />
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={ACTIVITY_PHOTO_ACCEPT}
                multiple
                className="hidden"
                onChange={e => {
                  addFiles(e.target.files)
                  e.target.value = ""
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
                className="h-9 w-full gap-2 rounded-xl border-sky-300 bg-white text-sky-800 hover:bg-sky-50 hover:text-sky-900 hover:border-sky-400"
                onClick={() => fileInputRef.current?.click()}
              >
                <Camera className="h-4 w-4" aria-hidden />
                {t("activityPhotosPickMultiple")}
              </Button>

              {staged.length > 0 ? (
                <>
                  <p className="text-xs font-medium text-sky-800">
                    {t("activityPhotosStaged", { count: staged.length })}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    {staged.map((s, i) => (
                      <div
                        key={`${s.preview}-${i}`}
                        className="relative aspect-square overflow-hidden rounded-lg border border-sky-200"
                      >
                        <img src={s.preview} alt="" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          className="absolute bottom-1 right-1 rounded border border-gray-200 bg-white/95 px-1.5 py-0.5 text-[10px] text-gray-700"
                          onClick={() => removeStaged(i)}
                        >
                          {t("activityPhotosRemoveStaged")}
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}

              <Button
                type="button"
                variant="primary"
                size="sm"
                className="h-9 w-full"
                disabled={uploading || staged.length === 0}
                onClick={() => void handleSendStaged()}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
                {uploading ? t("activityPhotosUploading") : t("activityPhotosSend")}
              </Button>
              <p className="text-xs leading-relaxed text-gray-400">{t("activityPhotosMultipleHint")}</p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
