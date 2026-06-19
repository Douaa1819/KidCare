"use client"

import { cn } from "@/lib/utils"
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react"

export type InlineAlertVariant = "success" | "error" | "info"

const styles: Record<InlineAlertVariant, string> = {
  success: "pp-surface-success border",
  error: "pp-surface-rejected border",
  info: "pp-surface-primary border",
}

const icons: Record<InlineAlertVariant, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
}

export type InlineAlertProps = {
  variant: InlineAlertVariant
  children: React.ReactNode
  className?: string
  onDismiss?: () => void
  role?: "status" | "alert"
}

export function InlineAlert({ variant, children, className, onDismiss, role }: InlineAlertProps) {
  const Icon = icons[variant]
  return (
    <div
      role={role ?? (variant === "error" ? "alert" : "status")}
      className={cn(
        "flex items-start gap-2 rounded-xl border px-3 py-2.5 text-sm leading-relaxed",
        styles[variant],
        className,
      )}
    >
      <Icon className="h-4 w-4 shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0 flex-1">{children}</div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-md p-0.5 opacity-70 hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  )
}
