"use client";



import { use, useState, useEffect } from "react";

import { SidebarNew } from "@/components/layout/sidebar-new"
import { AdminMainContent } from "@/components/layout/sidebar-context";

import { Card } from "@/components/ui/card";

import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";

import { apiClient } from "@/lib/api";

import type { Locale } from "@/lib/i18n/config";

import { useTranslations } from "next-intl";

import {

  Building2, Phone, Mail, Globe, Clock, Users, MapPin,

  Pencil, Check, X, Plus, Trash2,

} from "lucide-react";

import { isValidEmail, isValidPhone, normalizePhone } from "@/lib/form-validation";

import {

  cloneHours,

  DAY_KEYS,

  dayHoursLabel,

  DEFAULT_HOURS,

  parseWeeklyHours,

  serializeWeeklyHours,

  validateDayIntervals,

  type DayHours,

  type DayKey,

  type TimeInterval,

  type WeeklyHours,

} from "@/lib/weekly-hours";



interface EtablissementInfo {

  nom: string;

  adresse: string;

  telephone: string;

  email: string;

  siteWeb?: string | null;

  description?: string | null;

  horaires?: string | null;

  capacite?: number | null;

}



type UpdateEtablissementPayload = {

  nom?: string;

  adresse?: string;

  telephone?: string;

  email?: string;

  siteWeb?: string;

  description?: string;

  horaires?: string;

  capacite?: number;

};



const DAY_DATES: Record<DayKey, string> = {

  monday: "2026-05-25",

  tuesday: "2026-05-26",

  wednesday: "2026-05-27",

  thursday: "2026-05-28",

  friday: "2026-05-29",

  saturday: "2026-05-30",

  sunday: "2026-05-31",

};



const TEXT_RE = /^[A-Za-zÀ-ÖØ-öø-ÿ\u0600-\u06FF0-9\s'’.,;:()&/+-]+$/;

const WEBSITE_RE = /^https?:\/\/[^\s]+\.[^\s]{2,}$/i;



const EMPTY: EtablissementInfo = {

  nom: "", adresse: "", telephone: "", email: "",

  siteWeb: "", description: "", horaires: "", capacite: undefined,

};



function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string | number | null }) {

  if (!value && value !== 0) return null;

  return (

    <div className="flex items-start gap-3 py-3 border-b border-border last:border-b-0">

      <div className="flex-shrink-0 text-muted-foreground mt-0.5">{icon}</div>

      <div className="min-w-0">

        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>

        <p className="text-sm font-medium text-foreground break-words">{value}</p>

      </div>

    </div>

  );

}



function dayLabel(day: DayKey, locale: Locale, style: "short" | "long" = "short") {

  return new Date(`${DAY_DATES[day]}T12:00:00`).toLocaleDateString(locale === "ar" ? "ar-MA" : "fr-FR", { weekday: style });

}



export default function EtablissementPage({ params }: { params: Promise<{ locale: Locale }> }) {

  const { locale: currentLocale } = use(params);

  const t = useTranslations("admin.etablissement");



  const [etab,        setEtab]        = useState<EtablissementInfo>(EMPTY);

  const [form,        setForm]        = useState<EtablissementInfo>(EMPTY);

  const [loading,     setLoading]     = useState(true);

  const [editing,     setEditing]     = useState(false);

  const [saving,      setSaving]      = useState(false);

  const [error,       setError]       = useState<string | null>(null);

  const [success,     setSuccess]     = useState<string | null>(null);

  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(() => cloneHours(DEFAULT_HOURS));

  const [selectedDay, setSelectedDay] = useState<DayKey>("monday");

  const [formErrors, setFormErrors] = useState<Record<string, string>>({});



  useEffect(() => {

    apiClient.getEtablissement()

      .then((res) => {

        const d = res.data ?? {};

        const info: EtablissementInfo = {

          nom:         d.nom         ?? "",

          adresse:     d.adresse     ?? "",

          telephone:   d.telephone   ?? "",

          email:       d.email       ?? "",

          siteWeb:     d.siteWeb     ?? "",

          description: d.description ?? "",

          horaires:    d.horaires    ?? "",

          capacite:    d.capacite    ?? undefined,

        };

        setEtab(info);

        setForm(info);

        setWeeklyHours(parseWeeklyHours(info.horaires).hours);

      })

      .catch(() => setError(t("loadError")))

      .finally(() => setLoading(false));

  }, [t]);



  const openEdit = () => {

    setForm({ ...etab });

    setWeeklyHours(parseWeeklyHours(etab.horaires).hours);

    setSelectedDay("monday");

    setEditing(true);

    setFormErrors({});

    setError(null);

    setSuccess(null);

  };

  const cancelEdit = () => { setEditing(false); setError(null); setFormErrors({}); };



  const intervalMessages = {

    empty: t("validationHoursEmpty"),

    order: t("validationHours"),

    overlap: t("validationHoursOverlap"),

  };



  const validateForm = () => {

    const errs: Record<string, string> = {};

    const trimmed = {

      nom: form.nom.trim(),

      adresse: form.adresse.trim(),

      telephone: form.telephone.trim(),

      email: form.email.trim(),

      siteWeb: (form.siteWeb ?? "").trim(),

      description: (form.description ?? "").trim(),

    };



    if (!trimmed.nom) errs.nom = t("validationNameRequired");

    else if (!TEXT_RE.test(trimmed.nom)) errs.nom = t("validationText");



    if (!trimmed.adresse) errs.adresse = t("validationAddressRequired");

    else if (!TEXT_RE.test(trimmed.adresse)) errs.adresse = t("validationText");



    if (!trimmed.telephone) errs.telephone = t("validationPhoneRequired");

    else if (!isValidPhone(trimmed.telephone)) errs.telephone = t("validationPhone");



    if (!trimmed.email) errs.email = t("validationEmailRequired");

    else if (!isValidEmail(trimmed.email)) errs.email = t("validationEmail");



    if (trimmed.siteWeb && !WEBSITE_RE.test(trimmed.siteWeb)) errs.siteWeb = t("validationWebsite");

    if (trimmed.description && !TEXT_RE.test(trimmed.description)) errs.description = t("validationText");



    if (form.capacite != null && (!Number.isInteger(Number(form.capacite)) || Number(form.capacite) < 1 || Number(form.capacite) > 1000)) {

      errs.capacite = t("validationCapacity");

    }



    DAY_KEYS.forEach(day => {

      const hours = weeklyHours[day];

      if (!hours.open) return;

      const dayErr = validateDayIntervals(hours.intervals, intervalMessages);

      if (dayErr) errs.horaires = dayErr;

    });



    setFormErrors(errs);

    return Object.keys(errs).length === 0;

  };



  const save = async () => {

    if (!validateForm()) return;

    setSaving(true);

    setError(null);

    try {

      const payload: UpdateEtablissementPayload = {

        nom: form.nom.trim(),

        adresse: form.adresse.trim(),

        telephone: normalizePhone(form.telephone),

        email: form.email.trim().toLowerCase(),

        siteWeb: form.siteWeb?.trim() || "",

        description: form.description?.trim() || "",

        horaires: serializeWeeklyHours(weeklyHours),

        capacite: form.capacite ? Number(form.capacite) : undefined,

      };

      const res = await apiClient.updateEtablissement(payload);

      const d = res.data ?? {};

      const saved: EtablissementInfo = {

        nom: d.nom ?? "", adresse: d.adresse ?? "", telephone: d.telephone ?? "",

        email: d.email ?? "", siteWeb: d.siteWeb ?? "", description: d.description ?? "",

        horaires: d.horaires ?? "", capacite: d.capacite ?? undefined,

      };

      setEtab(saved);

      setWeeklyHours(parseWeeklyHours(saved.horaires).hours);

      setEditing(false);

      setSuccess(t("success"));

      setTimeout(() => setSuccess(null), 3000);

    } catch {

      setError(t("saveError"));

    } finally {

      setSaving(false);

    }

  };



  const hasInfo = etab.nom || etab.adresse || etab.telephone || etab.email ||

    etab.siteWeb || etab.description || etab.horaires || etab.capacite;

  const displayedHours = parseWeeklyHours(etab.horaires);

  const selectedHours = displayedHours.hours[selectedDay];

  const selectedEditHours = weeklyHours[selectedDay];



  const updateSelectedDay = (patch: Partial<DayHours>) => {

    setWeeklyHours(prev => ({

      ...prev,

      [selectedDay]: { ...prev[selectedDay], ...patch },

    }));

  };



  const updateInterval = (index: number, patch: Partial<TimeInterval>) => {

    setWeeklyHours(prev => {

      const day = prev[selectedDay];

      const intervals = day.intervals.map((item, i) => (i === index ? { ...item, ...patch } : item));

      return { ...prev, [selectedDay]: { ...day, intervals } };

    });

  };



  const addInterval = () => {

    setWeeklyHours(prev => {

      const day = prev[selectedDay];

      const last = day.intervals[day.intervals.length - 1];

      const next: TimeInterval = last

        ? { start: last.end, end: "18:00" }

        : { start: "09:00", end: "12:00" };

      return { ...prev, [selectedDay]: { ...day, intervals: [...day.intervals, next] } };

    });

  };



  const removeInterval = (index: number) => {

    setWeeklyHours(prev => {

      const day = prev[selectedDay];

      if (day.intervals.length <= 1) return prev;

      return {

        ...prev,

        [selectedDay]: { ...day, intervals: day.intervals.filter((_, i) => i !== index) },

      };

    });

  };



  return (

    <div className="min-h-screen bg-gray-50 flex">

      <SidebarNew currentLocale={currentLocale} />



      <AdminMainContent className="p-4 md:p-8 pt-16 md:pt-8">

        <div className="max-w-2xl mx-auto space-y-6">



          <div className="flex items-start justify-between gap-4">

            <div>

              <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">

                <Building2 className="w-7 h-7 text-primary" />

                {t("title")}

              </h1>

              <p className="text-sm text-muted-foreground mt-1">

                {t("subtitle")}

              </p>

            </div>

            {!editing && (

              <Button onClick={openEdit} className="gap-2 flex-shrink-0">

                <Pencil className="w-4 h-4" /> {t("edit")}

              </Button>

            )}

          </div>



          {success && (

            <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">

              {success}

            </div>

          )}

          {error && (

            <div className="rounded-lg bg-destructive/10 border border-destructive/30 px-4 py-3 text-sm text-destructive">

              {error}

            </div>

          )}



          <Card className="p-6">

            {loading ? (

              <p className="text-sm text-muted-foreground">{t("loading")}</p>

            ) : editing ? (

              <div className="space-y-4">

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div>

                    <label className="block text-xs font-medium text-foreground mb-1">{t("nameInstitution")}</label>

                    <Input

                      value={form.nom}

                      onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}

                      placeholder={t("placeholderName")}

                      className={formErrors.nom ? "border-red-400 focus-visible:ring-red-300" : ""}

                    />

                    {formErrors.nom && <p className="mt-1 text-xs text-red-500">{formErrors.nom}</p>}

                  </div>

                  <div>

                    <label className="block text-xs font-medium text-foreground mb-1">{t("capacity")}</label>

                    <Input

                      type="number"

                      min={1}

                      max={1000}

                      value={form.capacite ?? ""}

                      onChange={e => setForm(f => ({ ...f, capacite: e.target.value === "" ? undefined : Number(e.target.value) }))}

                      placeholder="60"

                      className={formErrors.capacite ? "border-red-400 focus-visible:ring-red-300" : ""}

                    />

                    {formErrors.capacite && <p className="mt-1 text-xs text-red-500">{formErrors.capacite}</p>}

                  </div>

                </div>

                <div>

                  <label className="block text-xs font-medium text-foreground mb-1">{t("address")}</label>

                  <Input

                    value={form.adresse}

                    onChange={e => setForm(f => ({ ...f, adresse: e.target.value }))}

                    placeholder={t("placeholderAddress")}

                    className={formErrors.adresse ? "border-red-400 focus-visible:ring-red-300" : ""}

                  />

                  {formErrors.adresse && <p className="mt-1 text-xs text-red-500">{formErrors.adresse}</p>}

                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                  <div>

                    <label className="block text-xs font-medium text-foreground mb-1">{t("phone")}</label>

                    <Input

                      value={form.telephone}

                      onChange={e => setForm(f => ({ ...f, telephone: normalizePhone(e.target.value) }))}

                      placeholder={t("placeholderPhone")}

                      className={formErrors.telephone ? "border-red-400 focus-visible:ring-red-300" : ""}

                    />

                    {formErrors.telephone && <p className="mt-1 text-xs text-red-500">{formErrors.telephone}</p>}

                  </div>

                  <div>

                    <label className="block text-xs font-medium text-foreground mb-1">{t("contactEmail")}</label>

                    <Input

                      type="email"

                      value={form.email}

                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}

                      placeholder={t("placeholderEmail")}

                      className={formErrors.email ? "border-red-400 focus-visible:ring-red-300" : ""}

                    />

                    {formErrors.email && <p className="mt-1 text-xs text-red-500">{formErrors.email}</p>}

                  </div>

                </div>

                <div>

                  <label className="block text-xs font-medium text-foreground mb-1">{t("website")}</label>

                  <Input

                    value={form.siteWeb ?? ""}

                    onChange={e => setForm(f => ({ ...f, siteWeb: e.target.value }))}

                    placeholder={t("placeholderWebsite")}

                    className={formErrors.siteWeb ? "border-red-400 focus-visible:ring-red-300" : ""}

                  />

                  {formErrors.siteWeb && <p className="mt-1 text-xs text-red-500">{formErrors.siteWeb}</p>}

                </div>



                <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-3 space-y-3">

                  <div>

                    <p className="text-xs font-semibold text-foreground">{t("openingHours")}</p>

                    <p className="text-xs text-muted-foreground mt-0.5">{t("hoursHint")}</p>

                  </div>

                  <div className="flex flex-wrap gap-2">

                    {DAY_KEYS.map(day => {

                      const active = selectedDay === day;

                      const hours = weeklyHours[day];

                      return (

                        <button

                          key={day}

                          type="button"

                          onClick={() => setSelectedDay(day)}

                          className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${

                            active ? "border-sky-400 bg-white text-sky-800 shadow-sm" : "border-sky-100 bg-white/70 text-gray-600 hover:border-sky-300"

                          }`}

                        >

                          <span className="capitalize">{dayLabel(day, currentLocale)}</span>

                          <span className={`ml-1.5 inline-block h-2 w-2 rounded-full ${hours.open ? "bg-emerald-500" : "bg-gray-300"}`} />

                        </button>

                      );

                    })}

                  </div>

                  <div className="rounded-xl bg-white p-3 border border-sky-100 space-y-3">

                    <div className="flex items-center justify-between gap-3">

                      <p className="text-sm font-bold text-gray-900 capitalize">{dayLabel(selectedDay, currentLocale, "long")}</p>

                      <label className="flex items-center gap-2 text-xs font-medium text-gray-700">

                        <input

                          type="checkbox"

                          checked={selectedEditHours.open}

                          onChange={e => updateSelectedDay({ open: e.target.checked })}

                          className="h-4 w-4 rounded accent-sky-600"

                        />

                        {t("openDay")}

                      </label>

                    </div>

                    {selectedEditHours.open ? (

                      <div className="space-y-3">

                        {selectedEditHours.intervals.map((interval, index) => (

                          <div key={index} className="rounded-lg border border-sky-50 bg-sky-50/30 p-3 space-y-2">

                            <div className="flex items-center justify-between gap-2">

                              <p className="text-xs font-semibold text-gray-700">

                                {t("intervalLabel", { index: index + 1 })}

                              </p>

                              {selectedEditHours.intervals.length > 1 ? (

                                <button

                                  type="button"

                                  onClick={() => removeInterval(index)}

                                  className="inline-flex items-center gap-1 text-xs text-red-600 hover:text-red-700"

                                >

                                  <Trash2 className="h-3.5 w-3.5" />

                                  {t("removeInterval")}

                                </button>

                              ) : null}

                            </div>

                            <div className="grid grid-cols-2 gap-3">

                              <div>

                                <label className="block text-xs font-medium text-muted-foreground mb-1">{t("opensAt")}</label>

                                <Input

                                  type="time"

                                  value={interval.start}

                                  onChange={e => updateInterval(index, { start: e.target.value })}

                                  className={formErrors.horaires ? "border-red-400 focus-visible:ring-red-300" : ""}

                                />

                              </div>

                              <div>

                                <label className="block text-xs font-medium text-muted-foreground mb-1">{t("closesAt")}</label>

                                <Input

                                  type="time"

                                  value={interval.end}

                                  onChange={e => updateInterval(index, { end: e.target.value })}

                                  className={formErrors.horaires ? "border-red-400 focus-visible:ring-red-300" : ""}

                                />

                              </div>

                            </div>

                          </div>

                        ))}

                        <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={addInterval}>

                          <Plus className="h-3.5 w-3.5" />

                          {t("addInterval")}

                        </Button>

                      </div>

                    ) : (

                      <p className="text-xs text-muted-foreground">{t("closed")}</p>

                    )}

                    <p className="text-xs text-muted-foreground">

                      {t("selectedDayHours", { day: dayLabel(selectedDay, currentLocale, "long"), hours: dayHoursLabel(selectedEditHours, t("closed")) })}

                    </p>

                  </div>

                  {formErrors.horaires && <p className="text-xs text-red-500">{formErrors.horaires}</p>}

                </div>



                <div>

                  <label className="block text-xs font-medium text-foreground mb-1">{t("description")}</label>

                  <textarea

                    value={form.description ?? ""}

                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}

                    placeholder={t("placeholderDescription")}

                    rows={3}

                    className={`w-full rounded-md border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none ${

                      formErrors.description ? "border-red-400 focus-visible:ring-red-300" : "border-input"

                    }`}

                  />

                  {formErrors.description && <p className="mt-1 text-xs text-red-500">{formErrors.description}</p>}

                </div>



                <div className="flex items-center gap-3 pt-2">

                  <Button onClick={save} disabled={saving} className="gap-1.5">

                    <Check className="w-3.5 h-3.5" />

                    {saving ? t("saving") : t("save")}

                  </Button>

                  <Button variant="outline" onClick={cancelEdit} disabled={saving} className="gap-1.5">

                    <X className="w-3.5 h-3.5" /> {t("cancel")}

                  </Button>

                </div>

              </div>

            ) : hasInfo ? (

              <div>

                {etab.nom && (

                  <div className="flex items-start gap-3 py-3 border-b border-border">

                    <Building2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />

                    <div>

                      <p className="text-xs text-muted-foreground mb-0.5">{t("name")}</p>

                      <p className="text-base font-bold text-foreground">{etab.nom}</p>

                    </div>

                  </div>

                )}

                {etab.description && (

                  <div className="py-3 border-b border-border">

                    <p className="text-xs text-muted-foreground mb-1">Description</p>

                    <p className="text-sm text-foreground">{etab.description}</p>

                  </div>

                )}

                <InfoRow icon={<MapPin   className="w-4 h-4" />} label={t("address")}           value={etab.adresse} />

                <InfoRow icon={<Phone    className="w-4 h-4" />} label={t("phone")}         value={etab.telephone} />

                <InfoRow icon={<Mail     className="w-4 h-4" />} label={t("email")}             value={etab.email} />

                <InfoRow icon={<Globe    className="w-4 h-4" />} label={t("website")}          value={etab.siteWeb} />

                {etab.horaires && (

                  <div className="py-3 border-b border-border">

                    <div className="flex items-center gap-2 mb-3">

                      <Clock className="w-4 h-4 text-muted-foreground" />

                      <p className="text-xs text-muted-foreground">{t("openingHours")}</p>

                    </div>

                    {displayedHours.structured ? (

                      <div className="space-y-3">

                        <div className="flex flex-wrap gap-2">

                          {DAY_KEYS.map(day => {

                            const active = selectedDay === day;

                            const hours = displayedHours.hours[day];

                            return (

                              <button

                                key={day}

                                type="button"

                                onClick={() => setSelectedDay(day)}

                                className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition-all ${

                                  active ? "border-primary bg-primary/10 text-primary shadow-sm" : "border-border bg-background text-muted-foreground hover:border-primary/40"

                                }`}

                              >

                                <span className="capitalize">{dayLabel(day, currentLocale)}</span>

                                <span className={`ml-1.5 inline-block h-2 w-2 rounded-full ${hours.open ? "bg-emerald-500" : "bg-gray-300"}`} />

                              </button>

                            );

                          })}

                        </div>

                        <div className="rounded-xl bg-muted/40 border border-border px-4 py-3">

                          <p className="text-xs text-muted-foreground capitalize">{dayLabel(selectedDay, currentLocale, "long")}</p>

                          <p className="text-base font-bold text-foreground mt-1">

                            {dayHoursLabel(selectedHours, t("closed"))}

                          </p>

                        </div>

                      </div>

                    ) : (

                      <p className="text-sm font-medium text-foreground break-words">{displayedHours.legacyText}</p>

                    )}

                  </div>

                )}

                <InfoRow icon={<Users    className="w-4 h-4" />} label={t("capacityLabel")} value={etab.capacite ? t("capacityChildren", { count: etab.capacite }) : null} />

              </div>

            ) : (

              <div className="text-center py-8">

                <Building2 className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />

                <p className="text-sm text-muted-foreground mb-4">

                  {t("emptyState")}

                </p>

                <Button onClick={openEdit} variant="outline" className="gap-2">

                  <Pencil className="w-4 h-4" /> {t("fillInfo")}

                </Button>

              </div>

            )}

          </Card>



        </div>

      </AdminMainContent>

    </div>

  );

}


