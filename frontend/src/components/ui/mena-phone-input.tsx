"use client"

import * as React from "react"
import { useLocale } from "next-intl"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  DEFAULT_MENA_PHONE_COUNTRY,
  MENA_PHONE_COUNTRIES,
  formatMenaPhone,
  formatMenaPhoneDialCode,
  getMenaPhoneCountryFlag,
  getMenaPhoneCountryLabel,
  getMenaPhonePlaceholder,
  parseMenaPhone,
} from "@/lib/mena-phone"

export type MenaPhoneInputProps = {
  id?: string
  value: string
  onChange: (value: string) => void
  onBlur?: () => void
  defaultCountry?: string
  className?: string
  inputClassName?: string
  selectClassName?: string
  disabled?: boolean
  placeholder?: string
  "aria-invalid"?: boolean
}

const flagEmojiClass =
  "inline-block text-lg leading-none select-none [font-family:'Segoe_UI_Emoji','Apple_Color_Emoji','Noto_Color_Emoji',sans-serif]"

export const MenaPhoneInput = React.forwardRef<HTMLInputElement, MenaPhoneInputProps>(
  (
    {
      id,
      value,
      onChange,
      onBlur,
      defaultCountry = DEFAULT_MENA_PHONE_COUNTRY,
      className,
      inputClassName,
      selectClassName,
      disabled,
      placeholder,
      "aria-invalid": ariaInvalid,
    },
    ref,
  ) => {
    const locale = useLocale()
    const parsed = React.useMemo(() => parseMenaPhone(value, defaultCountry), [value, defaultCountry])
    const [countryCode, setCountryCode] = React.useState(parsed.countryCode)
    const [local, setLocal] = React.useState(parsed.local)
    const [open, setOpen] = React.useState(false)

    React.useEffect(() => {
      const next = parseMenaPhone(value, defaultCountry)
      setCountryCode(next.countryCode)
      setLocal(next.local)
    }, [value, defaultCountry])

    const emitChange = (nextCountry: string, nextLocal: string) => {
      setCountryCode(nextCountry)
      setLocal(nextLocal)
      onChange(formatMenaPhone(nextCountry, nextLocal))
    }

    const handleCountryChange = (nextCountry: string) => {
      emitChange(nextCountry, local)
      setOpen(false)
      onBlur?.()
    }

    const handleLocalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      emitChange(countryCode, e.target.value)
    }

    const resolvedPlaceholder = placeholder ?? getMenaPhonePlaceholder(countryCode, locale)
    const selectedFlag = getMenaPhoneCountryFlag(countryCode)
    const selectedDial = formatMenaPhoneDialCode(countryCode)
    const countryLabel = getMenaPhoneCountryLabel(countryCode, locale)

    return (
      <div
        className={cn(
          "flex h-10 w-full overflow-hidden rounded-md border border-border bg-input text-foreground shadow-sm transition-colors",
          "hover:border-foreground/30 focus-within:border-foreground/35 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          disabled && "cursor-not-allowed opacity-50",
          ariaInvalid && "border-destructive focus-within:ring-destructive/30",
          className,
        )}
      >
        <DropdownMenu open={open} onOpenChange={setOpen}>
          <DropdownMenuTrigger asChild disabled={disabled}>
            <button
              type="button"
              id={id ? `${id}-country` : undefined}
              aria-label={
                locale === "ar"
                  ? `رمز الدولة — ${countryLabel} (${selectedDial})`
                  : `Indicatif pays — ${countryLabel} (${selectedDial})`
              }
              title={`${countryLabel} (${selectedDial})`}
              className={cn(
                "inline-flex h-full shrink-0 items-center gap-1.5 border-e border-border bg-[var(--primary-light)]/50 px-2.5",
                "text-sm font-medium text-foreground transition-colors hover:bg-[var(--primary-light)]",
                "focus-visible:outline-none disabled:pointer-events-none",
                selectClassName,
              )}
            >
              <span className={flagEmojiClass} aria-hidden>
                {selectedFlag}
              </span>
              <span className="tabular-nums tracking-tight text-[var(--status-progress-text)]">
                {selectedDial}
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
                  open && "rotate-180",
                )}
                aria-hidden
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            sideOffset={6}
            className="z-[200] max-h-64 w-52 overflow-y-auto border-border bg-popover p-1 text-popover-foreground shadow-lg"
          >
            {MENA_PHONE_COUNTRIES.map((c) => {
              const selected = countryCode === c.code
              const label = getMenaPhoneCountryLabel(c.code, locale)
              return (
                <DropdownMenuItem
                  key={c.code}
                  title={label}
                  onSelect={() => handleCountryChange(c.code)}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 focus:bg-primary-light focus:text-foreground",
                    selected && "bg-primary-light ring-1 ring-[var(--status-progress-border)]",
                  )}
                >
                  <span className={flagEmojiClass} aria-hidden>
                    {c.flag}
                  </span>
                  <span className="min-w-[2.75rem] tabular-nums text-sm font-semibold text-[var(--status-progress-text)]">
                    +{c.dialCode}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{label}</span>
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <input
          ref={ref}
          id={id}
          type="tel"
          inputMode="tel"
          autoComplete="tel-national"
          disabled={disabled}
          value={local}
          onChange={handleLocalChange}
          onBlur={onBlur}
          placeholder={resolvedPlaceholder}
          aria-invalid={ariaInvalid}
          className={cn(
            "min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground",
            "focus-visible:outline-none disabled:cursor-not-allowed",
            inputClassName,
          )}
        />
      </div>
    )
  },
)

MenaPhoneInput.displayName = "MenaPhoneInput"
