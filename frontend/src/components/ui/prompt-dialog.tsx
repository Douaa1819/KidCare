"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Loader2 } from "lucide-react"

export type PromptDialogProps = {
  open: boolean
  title: string
  description?: string
  label?: string
  placeholder?: string
  defaultValue?: string
  confirmLabel: string
  cancelLabel: string
  onConfirm: (value: string) => void | Promise<void>
  onCancel: () => void
  pending?: boolean
  inputType?: "text" | "url"
}

export function PromptDialog({
  open,
  title,
  description,
  label,
  placeholder,
  defaultValue = "",
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  pending,
  inputType = "text",
}: PromptDialogProps) {
  const [value, setValue] = React.useState(defaultValue)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      setValue(defaultValue)
      const t = window.setTimeout(() => inputRef.current?.focus(), 50)
      return () => window.clearTimeout(t)
    }
  }, [open, defaultValue])

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
    <div className="fixed inset-0 z-[400] flex items-end justify-center p-4 sm:items-center sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
        aria-label={cancelLabel}
        onClick={() => {
          if (!pending) onCancel()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-dialog-title"
        className="relative w-full max-w-md rounded-2xl border border-gray-200 bg-white p-5 shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <h2 id="prompt-dialog-title" className="text-base font-semibold text-gray-900">
          {title}
        </h2>
        {description ? <p className="mt-2 text-sm leading-relaxed text-gray-600">{description}</p> : null}
        <div className="mt-4">
          {label ? <p className="mb-1 text-xs font-medium text-gray-600">{label}</p> : null}
          <Input
            ref={inputRef}
            type={inputType}
            value={value}
            onChange={e => setValue(e.target.value)}
            placeholder={placeholder}
            disabled={pending}
            className="h-10 rounded-xl"
            onKeyDown={e => {
              if (e.key === "Enter" && !pending) void onConfirm(value.trim())
            }}
          />
        </div>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={onCancel} disabled={pending} className="w-full sm:w-auto">
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="brand"
            onClick={() => void onConfirm(value.trim())}
            disabled={pending || !value.trim()}
            className="w-full sm:w-auto gap-2"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
            {pending ? "…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
