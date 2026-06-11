"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export type SimpleConfirmDialogProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  pending?: boolean
  variant?: "default" | "destructive"
}

export function SimpleConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  pending,
  variant = "default",
}: SimpleConfirmDialogProps) {
  React.useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !pending) onCancel()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onCancel, pending])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[400] flex items-end justify-center p-4 sm:items-center sm:p-6" aria-labelledby="simple-confirm-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label={cancelLabel}
        onClick={() => {
          if (!pending) onCancel()
        }}
      />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="simple-confirm-title"
        className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="simple-confirm-title" className="text-base font-semibold text-gray-900">
          {title}
        </h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p> : null}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending} className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "brand"}
            onClick={() => void onConfirm()}
            disabled={pending}
            className={cn("w-full sm:w-auto gap-2")}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {pending ? "…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
