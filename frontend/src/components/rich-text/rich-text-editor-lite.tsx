"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Bold, Heading2, Italic, Link2, List, ListOrdered } from "lucide-react"
import { cn } from "@/lib/utils"
import { normalizeRichHtml } from "@/lib/rich-text"
import { PromptDialog } from "@/components/ui/prompt-dialog"

export type RichTextEditorLiteProps = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  id?: string
  "aria-label"?: string
  linkPrompt?: {
    title: string
    label: string
    placeholder: string
    confirmLabel: string
    cancelLabel: string
  }
}

type ToolbarBtnProps = {
  onClick: () => void
  disabled?: boolean
  active?: boolean
  label: string
  children: React.ReactNode
}

function ToolbarBtn({ onClick, disabled, active, label, children }: ToolbarBtnProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition-colors",
        "hover:bg-sky-100 hover:text-sky-900",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-1",
        "disabled:pointer-events-none disabled:opacity-40 disabled:hover:bg-transparent",
        active && "bg-sky-100 text-sky-800",
      )}
    >
      {children}
    </button>
  )
}

/**
 * Mini éditeur riche (titres, listes, gras, italique, lien) — contentEditable.
 * Prévu pour être remplacé plus tard par un RTE complet (TipTap, etc.).
 */
export function RichTextEditorLite({
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  id,
  "aria-label": ariaLabel,
  linkPrompt,
}: RichTextEditorLiteProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const syncingRef = useRef(false)
  const [linkDialogOpen, setLinkDialogOpen] = useState(false)
  const defaultLinkPrompt = {
    title: "Insérer un lien",
    label: "URL",
    placeholder: "https://",
    confirmLabel: "Valider",
    cancelLabel: "Annuler",
  }
  const lp = linkPrompt ?? defaultLinkPrompt

  useEffect(() => {
    const el = editorRef.current
    if (!el || syncingRef.current) return
    const next = value || ""
    if (el.innerHTML !== next) {
      el.innerHTML = next
    }
  }, [value])

  const emitChange = useCallback(() => {
    const el = editorRef.current
    if (!el) return
    syncingRef.current = true
    onChange(normalizeRichHtml(el.innerHTML))
    queueMicrotask(() => {
      syncingRef.current = false
    })
  }, [onChange])

  const exec = (command: string, commandValue?: string) => {
    if (disabled) return
    editorRef.current?.focus()
    document.execCommand(command, false, commandValue)
    emitChange()
  }

  const applyLink = (url: string) => {
    if (!url.trim()) return
    const href = /^https?:\/\//i.test(url.trim()) ? url.trim() : `https://${url.trim()}`
    exec("createLink", href)
    setLinkDialogOpen(false)
  }

  return (
    <>
    <PromptDialog
      open={linkDialogOpen}
      title={lp.title}
      label={lp.label}
      placeholder={lp.placeholder}
      defaultValue="https://"
      inputType="url"
      confirmLabel={lp.confirmLabel}
      cancelLabel={lp.cancelLabel}
      onCancel={() => setLinkDialogOpen(false)}
      onConfirm={applyLink}
    />
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-sky-200 bg-white shadow-sm",
        disabled && "opacity-75",
        className,
      )}
    >
      <div
        role="toolbar"
        aria-label="Mise en forme"
        className="flex flex-wrap items-center gap-0.5 border-b border-sky-100 bg-gradient-to-r from-sky-50/80 to-white px-2 py-1.5"
      >
        <ToolbarBtn
          label="Titre"
          disabled={disabled}
          onClick={() => exec("formatBlock", "h3")}
        >
          <Heading2 className="h-4 w-4" aria-hidden />
        </ToolbarBtn>
        <ToolbarBtn
          label="Gras"
          disabled={disabled}
          onClick={() => exec("bold")}
        >
          <Bold className="h-4 w-4" aria-hidden />
        </ToolbarBtn>
        <ToolbarBtn
          label="Italique"
          disabled={disabled}
          onClick={() => exec("italic")}
        >
          <Italic className="h-4 w-4" aria-hidden />
        </ToolbarBtn>
        <ToolbarBtn
          label="Liste à puces"
          disabled={disabled}
          onClick={() => exec("insertUnorderedList")}
        >
          <List className="h-4 w-4" aria-hidden />
        </ToolbarBtn>
        <ToolbarBtn
          label="Liste numérotée"
          disabled={disabled}
          onClick={() => exec("insertOrderedList")}
        >
          <ListOrdered className="h-4 w-4" aria-hidden />
        </ToolbarBtn>
        <ToolbarBtn
          label="Insérer un lien"
          disabled={disabled}
          onClick={() => !disabled && setLinkDialogOpen(true)}
        >
          <Link2 className="h-4 w-4" aria-hidden />
        </ToolbarBtn>
      </div>

      <div
        ref={editorRef}
        id={id}
        role="textbox"
        aria-label={ariaLabel ?? placeholder}
        aria-multiline="true"
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        onInput={emitChange}
        onBlur={emitChange}
        className={cn(
          "min-h-[7.5rem] max-h-[min(40vh,16rem)] overflow-y-auto px-3 py-2.5 text-sm leading-relaxed text-gray-900",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-300/80",
          "empty:before:pointer-events-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]",
          disabled && "cursor-not-allowed bg-gray-50/80",
        )}
      />
    </div>
    </>
  )
}
