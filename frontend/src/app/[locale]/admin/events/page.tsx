"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { use, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarDays, ChevronLeft, ChevronRight, List, Plus, Trash2, Pencil } from "lucide-react";
import { SidebarNew } from "@/components/layout/sidebar-new"
import { AdminMainContent } from "@/components/layout/sidebar-context";
import { InlineAlert } from "@/components/ui/inline-alert";
import { SimpleConfirmDialog } from "@/components/ui/simple-confirm-dialog";
import { apiClient } from "@/lib/api";
import { getApiErrorMessage, notifyError, notifySuccess } from "@/lib/feedback";
import { Locale } from "@/lib/i18n/config";
import { useTranslations } from "next-intl";
import { validateTimeRange } from "@/lib/form-validation";

interface EventItem {
  id: string;
  titre: string;
  description?: string | null;
  startAt: string;
  endAt: string;
  classeId?: string | null;
  cost?: number | null;
  currency?: string | null;
}

interface ClasseItem {
  id: string;
  nom: string;
}

const SUPPORTED_EVENT_CURRENCIES = ["MAD", "EUR", "USD"] as const;

export default function EventsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const resolvedParams = use(params);
  const currentLocale = resolvedParams.locale;
  const t = useTranslations("admin.eventsManage");
  const dateLocale = currentLocale === "ar" ? "ar-MA" : "fr-FR";

  const [events, setEvents] = useState<EventItem[]>([]);
  const [classes, setClasses] = useState<ClasseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletePending, setDeletePending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("calendar");
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const [formData, setFormData] = useState({
    titre: "",
    description: "",
    date: "",
    startTime: "",
    endTime: "",
    classeId: "",
    cost: "",
    currency: "MAD",
  });

  const resetForm = () => {
    setFormData({
      titre: "",
      description: "",
      date: "",
      startTime: "",
      endTime: "",
      classeId: "",
      cost: "",
      currency: "MAD",
    });
    setEditingEventId(null);
  };

  const toDateInputValue = (iso: string) => {
    const d = new Date(iso);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const toTimeInputValue = (iso: string) => {
    const d = new Date(iso);
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  };

  useEffect(() => {
    void loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [eventsRes, classesRes] = await Promise.all([
        apiClient.listAdminEvents({ page: 1, pageSize: 50 }),
        apiClient.listClasses(),
      ]);

      const eventsPayload = eventsRes.data;
      const rawEvents: any[] = Array.isArray(eventsPayload?.data)
        ? eventsPayload.data
        : Array.isArray(eventsPayload?.items)
        ? eventsPayload.items
        : Array.isArray(eventsPayload)
        ? eventsPayload
        : [];

      const classesPayload = classesRes.data;
      const rawClasses: any[] = Array.isArray(classesPayload?.data)
        ? classesPayload.data
        : Array.isArray(classesPayload?.items)
        ? classesPayload.items
        : Array.isArray(classesPayload)
        ? classesPayload
        : [];

      setEvents(
        rawEvents.map((ev: any) => ({
          id: ev.id,
          titre: ev.titre,
          description: ev.description ?? null,
          startAt: ev.startAt,
          endAt: ev.endAt,
          classeId: ev.classeId ?? null,
          cost: typeof ev.cost === "number" ? ev.cost : typeof ev.cout === "number" ? ev.cout : null,
          currency: typeof ev.currency === "string" ? ev.currency : typeof ev.devise === "string" ? ev.devise : null,
        })),
      );

      setClasses(
        rawClasses.map((c: any) => ({
          id: c.id,
          nom: c.nom,
        })),
      );
    } catch (err) {
      console.error("[Admin/Events] Error loading events/classes", err);
      setError(t("loadError"));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const parseCostPayload = (): { cost: number | null; currency: string | null } | null => {
    const trimmed = formData.cost.trim();
    if (trimmed === "") return { cost: null, currency: null };
    const n = Number(trimmed);
    if (Number.isNaN(n)) {
      setFormError(t("costInvalid"));
      return null;
    }
    if (n < 0) {
      setFormError(t("costNegative"));
      return null;
    }
    if (!SUPPORTED_EVENT_CURRENCIES.includes(formData.currency as (typeof SUPPORTED_EVENT_CURRENCIES)[number])) {
      setFormError(t("currencyUnsupported"));
      return null;
    }
    return { cost: n, currency: formData.currency.toUpperCase() };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.titre.trim() || !formData.date || !formData.startTime || !formData.endTime || !formData.classeId) {
      setFormError(t("validationError"));
      return;
    }
    const timeError = validateTimeRange(formData.date, formData.startTime, formData.endTime);
    if (timeError) {
      setFormError(timeError);
      return;
    }

    const costPayload = parseCostPayload();
    if (!costPayload) return;

    try {
      setSaving(true);
      setFormError(null);
      setError(null);

      const startAt = new Date(`${formData.date}T${formData.startTime}:00`).toISOString();
      const endAt = new Date(`${formData.date}T${formData.endTime}:00`).toISOString();

      const basePayload = {
        titre: formData.titre.trim(),
        description: formData.description || undefined,
        startAt,
        endAt,
        classeId: formData.classeId,
      };

      if (editingEventId) {
        await apiClient.updateAdminEvent(editingEventId, {
          ...basePayload,
          cost: costPayload.cost,
          currency: costPayload.currency,
        });
        notifySuccess(t("successUpdate"));
      } else {
        await apiClient.createAdminEvent({
          ...basePayload,
          ...(costPayload.cost !== null
            ? { cost: costPayload.cost, currency: costPayload.currency ?? "MAD" }
            : {}),
        });
        notifySuccess(t("successCreate"));
      }

      await loadData();
      resetForm();
      setShowForm(false);
    } catch (err: unknown) {
      console.error("[Admin/Events] Error saving event", err);
      const msg = getApiErrorMessage(err, t("createError"));
      setFormError(msg);
      notifyError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (ev: EventItem) => {
    setError(null);
    setFormError(null);
    setEditingEventId(ev.id);
    setShowForm(true);
    setFormData({
      titre: ev.titre,
      description: ev.description ?? "",
      date: toDateInputValue(ev.startAt),
      startTime: toTimeInputValue(ev.startAt),
      endTime: toTimeInputValue(ev.endAt),
      classeId: ev.classeId ?? "",
      cost: typeof ev.cost === "number" ? String(ev.cost) : "",
      currency:
        typeof ev.currency === "string" &&
        SUPPORTED_EVENT_CURRENCIES.includes(ev.currency as (typeof SUPPORTED_EVENT_CURRENCIES)[number])
          ? ev.currency
          : "MAD",
    });
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;
    try {
      setDeletePending(true);
      setError(null);
      await apiClient.deleteAdminEvent(deleteTargetId);
      notifySuccess(t("successDelete"));
      setDeleteTargetId(null);
      await loadData();
    } catch (err: unknown) {
      console.error("[Admin/Events] Error deleting event", err);
      const msg = getApiErrorMessage(err, t("deleteError"));
      setError(msg);
      notifyError(msg);
    } finally {
      setDeletePending(false);
    }
  };

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(dateLocale, {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <SidebarNew currentLocale={currentLocale} />
        <AdminMainContent className="p-4 md:p-8 pt-16 md:pt-8 flex items-center justify-center">
          <div className="space-y-4 text-center">
            <h1 className="text-2xl font-bold">{t("title")}</h1>
            <p className="text-muted-foreground">{t("loading")}</p>
          </div>
        </AdminMainContent>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={currentLocale} />

      <AdminMainContent className="p-4 md:p-8 pt-16 md:pt-8">
        <div className="space-y-6 max-w-5xl mx-auto">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
              <p className="text-sm text-muted-foreground mt-1">{t("subtitle")}</p>
            </div>
            <Button
              onClick={() => {
                if (showForm) {
                  resetForm();
                  setShowForm(false);
                  return;
                }
                setShowForm(true);
              }}
              className="gap-2 bg-primary hover:bg-primary/90 flex-shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">
                {showForm ? t("close") : t("addEvent")}
              </span>
              <span className="sm:hidden">{showForm ? t("close") : t("addShort")}</span>
            </Button>
          </div>

          {error && (
            <InlineAlert variant="error" onDismiss={() => setError(null)}>
              {error}
            </InlineAlert>
          )}

          {showForm && (
            <Card className="p-6 border-2 border-primary/20">
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {editingEventId ? t("formEdit") : t("formTitle")}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {formError ? (
                  <InlineAlert variant="error" onDismiss={() => setFormError(null)}>
                    {formError}
                  </InlineAlert>
                ) : null}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t("fieldTitle")}
                    </label>
                    <Input
                      name="titre"
                      placeholder={t("titlePh")}
                      value={formData.titre}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t("fieldClass")}
                    </label>
                    <select
                      name="classeId"
                      value={formData.classeId}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      required
                    >
                      <option value="">{t("selectClass")}</option>
                      {classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nom}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {t("fieldDescription")}
                  </label>
                  <Textarea
                    name="description"
                    placeholder={t("descPh")}
                    value={formData.description}
                    onChange={handleInputChange}
                    className="resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t("fieldDate")}
                    </label>
                    <Input
                      type="date"
                      name="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t("startTimeLabel")}
                    </label>
                    <Input
                      type="time"
                      name="startTime"
                      value={formData.startTime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t("endTime")}
                    </label>
                    <Input
                      type="time"
                      name="endTime"
                      value={formData.endTime}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t("costLabel")}
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      name="cost"
                      value={formData.cost}
                      onChange={handleInputChange}
                      placeholder={t("costPh")}
                    />
                    <p className="text-xs text-muted-foreground mt-1">{t("costFreeHint")}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      {t("currencyLabel")}
                    </label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {SUPPORTED_EVENT_CURRENCIES.map((currencyCode) => (
                        <option key={currencyCode} value={currencyCode}>
                          {currencyCode}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button type="submit" className="bg-primary hover:bg-primary/90" disabled={saving}>
                    {saving ? t("saveCreating") : editingEventId ? t("update") : t("create")}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      resetForm();
                      setShowForm(false);
                    }}
                  >
                    {t("cancel")}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* ── Filtered event lists ── */}
          {(() => {
            const now = new Date();
            const future = events
              .filter(ev => new Date(ev.endAt) >= now)
              .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
            const past = events
              .filter(ev => new Date(ev.endAt) < now)
              .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());

            const monthStart = new Date(calendarMonth.getFullYear(), calendarMonth.getMonth(), 1);
            const gridStart = new Date(monthStart);
            gridStart.setDate(monthStart.getDate() - ((monthStart.getDay() + 6) % 7));
            const calendarDays = Array.from({ length: 42 }, (_, i) => {
              const d = new Date(gridStart);
              d.setDate(gridStart.getDate() + i);
              return d;
            });
            const keyForDay = (d: Date) =>
              `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            const eventsForDay = (d: Date) => {
              const key = keyForDay(d);
              return events
                .filter(ev => keyForDay(new Date(ev.startAt)) === key)
                .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
            };
            const shiftMonth = (delta: number) => {
              setCalendarMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
            };

            const CalendarGrid = () => (
              <Card className="overflow-hidden border border-border bg-white">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border p-3">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => shiftMonth(-1)} aria-label={t("prevMonth")}>
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <p className="min-w-[11rem] text-center text-sm font-semibold capitalize">
                      {calendarMonth.toLocaleDateString(dateLocale, { month: "long", year: "numeric" })}
                    </p>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => shiftMonth(1)} aria-label={t("nextMonth")}>
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setCalendarMonth(new Date(now.getFullYear(), now.getMonth(), 1))}>
                    {t("today")}
                  </Button>
                </div>
                <div className="grid grid-cols-7 border-b border-border bg-muted/40 text-center text-[11px] font-semibold text-muted-foreground">
                  {(["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const).map(day => (
                    <div key={day} className="py-2">{t(`weekdays.${day}`)}</div>
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-2 p-3 sm:grid-cols-7 sm:gap-0 sm:p-0">
                  {calendarDays.map(day => {
                    const inMonth = day.getMonth() === calendarMonth.getMonth();
                    const dayEvents = eventsForDay(day);
                    const isToday = keyForDay(day) === keyForDay(now);
                    return (
                      <div
                        key={keyForDay(day)}
                        className={`min-h-28 rounded-xl border p-2 sm:rounded-none sm:border-l-0 sm:border-t-0 ${
                          inMonth ? "bg-white" : "bg-muted/20 text-muted-foreground"
                        } ${isToday ? "ring-2 ring-primary/40" : ""}`}
                      >
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <span className={`text-xs font-semibold ${isToday ? "text-primary" : ""}`}>{day.getDate()}</span>
                          {dayEvents.length > 0 && <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">{dayEvents.length}</span>}
                        </div>
                        <div className="space-y-1">
                          {dayEvents.slice(0, 3).map(ev => (
                            <button
                              key={ev.id}
                              type="button"
                              onClick={() => handleEdit(ev)}
                              className="block w-full rounded-md bg-sky-50 px-2 py-1 text-left text-[11px] font-medium text-sky-800 hover:bg-sky-100"
                            >
                              <span className="block truncate">{ev.titre}</span>
                              <span className="block truncate text-[10px] text-sky-600">{formatDateTime(ev.startAt).split(" ").slice(-1)[0]}</span>
                            </button>
                          ))}
                          {dayEvents.length > 3 && <p className="text-[10px] text-muted-foreground">{t("moreEvents", { count: dayEvents.length - 3 })}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );

            const EventCard = ({ ev, isPast }: { ev: EventItem; isPast: boolean }) => (
              <Card
                key={ev.id}
                className={`p-5 transition-colors ${isPast ? "opacity-60 border border-border bg-muted/30" : "border-2 border-secondary/30 hover:border-secondary/60 bg-gradient-to-r from-white to-secondary/5"}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base font-bold text-foreground">{ev.titre}</h3>
                      <Badge className={isPast ? "bg-muted text-muted-foreground" : "bg-secondary text-secondary-foreground font-semibold"}>
                        {ev.classeId ? classes.find(c => c.id === ev.classeId)?.nom ?? t("scopeClass") : t("scopeGeneral")}
                      </Badge>
                      {isPast && <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">{t("pastBadge")}</span>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDateTime(ev.startAt)} → {formatDateTime(ev.endAt)}
                    </p>
                    <div className="mt-2 space-y-2">
                      <div className="rounded-md border border-gray-200 bg-gray-50 p-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">{t("description")}</p>
                        <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">
                          {ev.description?.trim() || t("noDescription")}
                        </p>
                      </div>
                      <div className="rounded-md border border-sky-200 bg-sky-50 p-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">{t("cost")}</p>
                        <p className="text-sm font-semibold text-sky-800 mt-1">
                          {typeof ev.cost === "number"
                            ? ev.cost === 0
                              ? t("free")
                              : `${ev.cost} ${ev.currency || "MAD"}`
                            : t("notProvided")}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 flex-shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 hover:bg-muted"
                      onClick={() => handleEdit(ev)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1 text-destructive hover:bg-destructive/10"
                      onClick={() => setDeleteTargetId(ev.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            );

            return (
              <div className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex rounded-xl border border-border bg-white p-1">
                    <Button
                      type="button"
                      size="sm"
                      variant={viewMode === "calendar" ? "default" : "ghost"}
                      onClick={() => setViewMode("calendar")}
                      className="gap-1.5"
                    >
                      <CalendarDays className="h-4 w-4" /> {t("viewCalendar")}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant={viewMode === "list" ? "default" : "ghost"}
                      onClick={() => setViewMode("list")}
                      className="gap-1.5"
                    >
                      <List className="h-4 w-4" /> {t("viewList")}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">{t("autoSort")}</p>
                </div>
                {viewMode === "calendar" && <CalendarGrid />}
                {/* À venir */}
                <div className={`space-y-3 ${viewMode === "calendar" ? "hidden" : ""}`}>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground">{t("upcoming")}</h2>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">{future.length}</span>
                  </div>
                  {future.length === 0 ? (
                    <Card className="p-8 text-center border-dashed">
                      <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-2 opacity-40" />
                      <p className="text-sm text-muted-foreground">{t("noUpcoming")}</p>
                    </Card>
                  ) : (
                    <div className="grid gap-3">
                      {future.map(ev => <EventCard key={ev.id} ev={ev} isPast={false} />)}
                    </div>
                  )}
                </div>

                {/* Passés — collapsible */}
                {past.length > 0 && (
                  <div className={`space-y-3 ${viewMode === "calendar" ? "hidden" : ""}`}>
                    <button
                      type="button"
                      onClick={() => setShowPast(v => !v)}
                      className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <span>{showPast ? "▾" : "▸"} {t("pastToggle")}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border">{past.length}</span>
                    </button>
                    {showPast && (
                      <div className="grid gap-3">
                        {past.map(ev => <EventCard key={ev.id} ev={ev} isPast={true} />)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </AdminMainContent>

      <SimpleConfirmDialog
        open={Boolean(deleteTargetId)}
        title={t("deleteConfirm")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        variant="destructive"
        pending={deletePending}
        onCancel={() => {
          if (!deletePending) setDeleteTargetId(null);
        }}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
