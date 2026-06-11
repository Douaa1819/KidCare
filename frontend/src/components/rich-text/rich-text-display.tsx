"use client"

import { cn } from "@/lib/utils"
import { isRichHtmlEmpty, richHtmlToPlainText, sanitizeRichHtml } from "@/lib/rich-text"

type Props = {
  html: string | null | undefined
  className?: string
  /** Si true, affiche le texte brut si le HTML est vide */
  fallbackPlain?: boolean
}

export function RichTextDisplay({ html, className, fallbackPlain = true }: Props) {
  const raw = html ?? ""
  const safe = sanitizeRichHtml(raw)
  if (isRichHtmlEmpty(safe)) {
    if (!fallbackPlain || !raw.trim()) return null
    return <p className={cn("text-sm leading-relaxed text-gray-700", className)}>{richHtmlToPlainText(raw)}</p>
  }
  return (
    <div
      className={cn(
        "text-sm leading-relaxed text-gray-700 [&_a]:text-sky-700 [&_a]:underline [&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic [&_i]:italic [&_h2]:mt-4 [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h3]:mt-3 [&_h3]:font-semibold [&_h3]:text-gray-900 [&_ul]:ml-5 [&_ul]:list-disc [&_ol]:ml-5 [&_ol]:list-decimal",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  )
}
