"use client"

import { useLocale, useTranslations } from "next-intl"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { fieldErrorClass } from "@/lib/form-error-focus"
import {
  countryHasCityList,
  getCitiesForCountry,
  getCountryLabel,
  getCityLabel,
  INSCRIPTION_COUNTRIES,
  LOCATION_OTHER,
} from "@/lib/inscription-locations"

const selectClass =
  "mt-2 w-full h-10 rounded-md border border-border bg-input px-3 py-2 text-sm transition-colors hover:border-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 focus-visible:ring-offset-2"

type CountryCityFieldsProps = {
  idPrefix: string
  countryLabel: string
  cityLabel: string
  countryValue: string
  cityValue: string
  cityOtherValue: string
  onCountryChange: (country: string) => void
  onCityChange: (city: string) => void
  onCityOtherChange: (value: string) => void
  countryError?: string
  cityError?: string
  cityOtherError?: string
  required?: boolean
  onBlurCountry?: () => void
  onBlurCity?: () => void
  onBlurCityOther?: () => void
}

export function CountryCityFields({
  idPrefix,
  countryLabel,
  cityLabel,
  countryValue,
  cityValue,
  cityOtherValue,
  onCountryChange,
  onCityChange,
  onCityOtherChange,
  countryError,
  cityError,
  cityOtherError,
  required = true,
  onBlurCountry,
  onBlurCity,
  onBlurCityOther,
}: CountryCityFieldsProps) {
  const locale = useLocale()
  const t = useTranslations("registration.child")
  const cities = getCitiesForCountry(countryValue)
  const showCitySelect = countryValue && countryHasCityList(countryValue)
  const showCityOther =
    countryValue === "OTHER" || cityValue === LOCATION_OTHER || (!showCitySelect && !!countryValue)

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div>
        <Label htmlFor={`${idPrefix}Country`} className="text-sm font-medium">
          {countryLabel}
          {required ? <span className="text-destructive"> *</span> : null}
        </Label>
        <select
          id={`${idPrefix}Country`}
          className={`${selectClass} ${countryError ? "border-destructive ring-1 ring-destructive/30" : "border-border"}`}
          value={countryValue}
          onChange={(e) => onCountryChange(e.target.value)}
          onBlur={onBlurCountry}
          aria-invalid={!!countryError}
        >
          <option value="">{t("selectCountry")}</option>
          {INSCRIPTION_COUNTRIES.map((c) => (
            <option key={c.code} value={c.code}>
              {getCountryLabel(c.code, locale)}
            </option>
          ))}
        </select>
        {countryError ? (
          <p className="text-xs text-destructive mt-1.5" role="alert">
            {countryError}
          </p>
        ) : null}
      </div>

      <div>
        {showCitySelect ? (
          <>
            <Label htmlFor={`${idPrefix}City`} className="text-sm font-medium">
              {cityLabel}
              {required ? <span className="text-destructive"> *</span> : null}
            </Label>
            <select
              id={`${idPrefix}City`}
              className={`${selectClass} ${cityError ? "border-destructive ring-1 ring-destructive/30" : "border-border"}`}
              value={cityValue}
              onChange={(e) => onCityChange(e.target.value)}
              onBlur={onBlurCity}
              disabled={!countryValue}
              aria-invalid={!!cityError}
            >
              <option value="">{t("selectCity")}</option>
              {cities.map((c) => (
                <option key={c.value} value={c.value}>
                  {getCityLabel(countryValue, c.value, locale)}
                </option>
              ))}
              <option value={LOCATION_OTHER}>{t("cityOther")}</option>
            </select>
            {cityError ? (
              <p className="text-xs text-destructive mt-1.5" role="alert">
                {cityError}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <Label htmlFor={`${idPrefix}CityOther`} className="text-sm font-medium">
              {cityLabel}
              {required ? <span className="text-destructive"> *</span> : null}
            </Label>
            <Input
              id={`${idPrefix}CityOther`}
              placeholder={t("placeholders.cityOther")}
              value={cityOtherValue}
              onChange={(e) => onCityOtherChange(e.target.value)}
              onBlur={onBlurCityOther}
              disabled={!countryValue}
              aria-invalid={!!(cityOtherError || cityError)}
              className={`mt-2 ${fieldErrorClass(!!(cityOtherError || cityError))}`}
            />
            {(cityOtherError || cityError) ? (
              <p className="text-xs text-destructive mt-1.5" role="alert">
                {cityOtherError || cityError}
              </p>
            ) : null}
          </>
        )}

        {showCitySelect && showCityOther ? (
          <div className="mt-3">
            <Label htmlFor={`${idPrefix}CityOther`} className="text-sm font-medium">
              {t("cityOtherLabel")}
              <span className="text-destructive"> *</span>
            </Label>
            <Input
              id={`${idPrefix}CityOther`}
              placeholder={t("placeholders.cityOther")}
              value={cityOtherValue}
              onChange={(e) => onCityOtherChange(e.target.value)}
              onBlur={onBlurCityOther}
              aria-invalid={!!cityOtherError}
              className={`mt-2 ${fieldErrorClass(!!cityOtherError)}`}
            />
            {cityOtherError ? (
              <p className="text-xs text-destructive mt-1.5" role="alert">
                {cityOtherError}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}
