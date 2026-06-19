"use client";

import { useState, useEffect, use, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Eye,
  CheckCircle2,
  XCircle,
  Baby,
  User,
  Mail,
  CalendarDays,
  ClipboardList,
  LayoutGrid,
  Clock,
  Loader2,
  Inbox,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Locale } from "@/lib/i18n/config";
import { withLocalePath } from "@/lib/i18n/locale-path";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { AdminMainContent } from "@/components/layout/sidebar-context";
import { apiClient } from "@/lib/api";
import { getApiErrorMessage, notifyError, notifySuccess } from "@/lib/feedback";
import { inscriptionStatusBadgeVariant } from "@/lib/design/status-badges";
import { AdminListPagination } from "@/components/admin/admin-list-pagination";
import { RejectInscriptionDialog } from "@/components/admin/reject-inscription-dialog";

const PAGE_SIZE = 12;

type InscriptionItem = {
  id: string;
  childName: string;
  parentName: string;
  email: string;
  statutCode: "CANDIDATURE" | "EN_COURS" | "ACTIF" | "REJETEE" | null;
  createdAt: string;
};

type StatusFilter = InscriptionItem["statutCode"] | null;

const FILTER_OPTIONS: {
  value: StatusFilter;
  labelKey: "all" | "review" | "inProgress" | "accepted" | "rejected";
  icon: typeof LayoutGrid;
}[] = [
  { value: null, labelKey: "all", icon: LayoutGrid },
  { value: "CANDIDATURE", labelKey: "review", icon: Clock },
  { value: "EN_COURS", labelKey: "inProgress", icon: Loader2 },
  { value: "ACTIF", labelKey: "accepted", icon: CheckCircle2 },
  { value: "REJETEE", labelKey: "rejected", icon: XCircle },
];

function childInitial(name: string): string {
  const trimmed = name.trim();
  return trimmed ? trimmed[0]!.toUpperCase() : "?";
}

export default function InscriptionsPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const resolvedParams = use(params);
  const currentLocale = resolvedParams.locale;
  const t = useTranslations("admin.inscriptions");
  const [search, setSearch] = useState("");
  const [inscriptions, setInscriptions] = useState<InscriptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(null);
  const [page, setPage] = useState(1);
  const [rejectTargetId, setRejectTargetId] = useState<string | null>(null);
  const [rejectPending, setRejectPending] = useState(false);

  const handleAccept = async (id: string) => {
    try {
      await apiClient.acceptAdminInscription(id);
      setInscriptions((prev) =>
        prev.map((insc) => (insc.id === id ? { ...insc, statutCode: "ACTIF" } : insc)),
      );
      notifySuccess("Inscription acceptée.");
    } catch (err) {
      console.error("[Admin/Inscriptions] Error accepting inscription", err);
      notifyError(getApiErrorMessage(err, t("errors.accept")));
    }
  };

  const handleReject = async (id: string, raison?: string) => {
    try {
      setRejectPending(true);
      const res = await apiClient.rejectAdminInscription(id, raison);
      const emailSent = (res.data as { emailSent?: boolean })?.emailSent;
      setInscriptions((prev) =>
        prev.map((insc) => (insc.id === id ? { ...insc, statutCode: "REJETEE" } : insc)),
      );
      setRejectTargetId(null);
      if (emailSent === false) {
        notifySuccess(t("rejectDialog.emailFailed"));
      } else if (raison?.trim()) {
        notifySuccess(t("rejectDialog.emailWithReason"));
      } else {
        notifySuccess(t("rejectDialog.emailWithoutReason"));
      }
    } catch (err) {
      console.error("[Admin/Inscriptions] Error rejecting inscription", err);
      notifyError(getApiErrorMessage(err, t("errors.reject")));
    } finally {
      setRejectPending(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function fetchInscriptions() {
      try {
        setLoading(true);
        setError(null);
        const res = await apiClient.listAdminInscriptions();
        const items = res.data?.items ?? [];

        const mapped: InscriptionItem[] = items.map((insc: any) => {
          const childName = insc.enfant
            ? `${insc.enfant.prenom ?? ""} ${insc.enfant.nom ?? ""}`.trim() || "—"
            : "—";
          const firstParent = Array.isArray(insc.parents) && insc.parents.length > 0 ? insc.parents[0] : null;
          const parentName = firstParent?.nom ?? "—";
          const email = firstParent?.email ?? "—";

          return {
            id: insc.id,
            childName,
            parentName,
            email,
            statutCode: insc.statut ?? null,
            createdAt: insc.createdAt,
          };
        });

        if (!cancelled) setInscriptions(mapped);
      } catch (err) {
        console.error("[Admin/Inscriptions] Error loading inscriptions", err);
        if (!cancelled) setError(t("errors.load"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchInscriptions();
    return () => {
      cancelled = true;
    };
  }, [currentLocale, t]);

  const labelForStatus = (code: InscriptionItem["statutCode"]) => {
    if (!code) return t("status.UNKNOWN");
    const key =
      code === "CANDIDATURE"
        ? "status.CANDIDATURE"
        : code === "EN_COURS"
          ? "status.EN_COURS"
          : code === "ACTIF"
            ? "status.ACTIF"
            : "status.REJETEE";
    return t(key);
  };

  const statusCounts = useMemo(() => {
    const counts = { all: inscriptions.length, CANDIDATURE: 0, EN_COURS: 0, ACTIF: 0, REJETEE: 0 };
    for (const insc of inscriptions) {
      if (insc.statutCode && insc.statutCode in counts) {
        counts[insc.statutCode as keyof typeof counts] += 1;
      }
    }
    return counts;
  }, [inscriptions]);

  const filtered = inscriptions.filter((insc) => {
    const q = search.toLowerCase();
    const matchesSearch =
      insc.childName.toLowerCase().includes(q) ||
      insc.parentName.toLowerCase().includes(q) ||
      insc.email.toLowerCase().includes(q);
    const matchesStatus = statusFilter ? insc.statutCode === statusFilter : true;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = statusCounts.CANDIDATURE + statusCounts.EN_COURS;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter]);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <SidebarNew currentLocale={currentLocale} />

      <AdminMainContent className="p-4 md:p-8 pt-16 md:pt-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary-light)] border border-[var(--status-progress-border)] flex items-center justify-center shrink-0 relative overflow-hidden">
                <span className="absolute inset-y-0 start-0 w-1 bg-[var(--pp-secondary)]" aria-hidden />
                <ClipboardList className="w-6 h-6 text-[var(--status-progress-text)]" aria-hidden />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{t("title")}</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {t("countLabel", { count: inscriptions.length })}
                  {pendingCount > 0 ? (
                    <span className="ms-2 inline-flex items-center gap-1 text-[var(--status-review-text)] font-medium">
                      <Clock className="w-3.5 h-3.5" aria-hidden />
                      {pendingCount} en attente
                    </span>
                  ) : null}
                </p>
              </div>
            </div>
          </div>

          {/* Stats rapides */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(
              [
                { key: "CANDIDATURE" as const, label: t("filters.review"), variant: "review" as const },
                { key: "EN_COURS" as const, label: t("filters.inProgress"), variant: "progress" as const },
                { key: "ACTIF" as const, label: t("filters.accepted"), variant: "accepted" as const },
                { key: "REJETEE" as const, label: t("filters.rejected"), variant: "rejected" as const },
              ] as const
            ).map((stat) => (
              <button
                key={stat.key}
                type="button"
                onClick={() => setStatusFilter(statusFilter === stat.key ? null : stat.key)}
                className={`text-start rounded-xl border p-3 transition-shadow hover:shadow-sm ${
                  statusFilter === stat.key ? "ring-2 ring-[var(--pp-primary)] ring-offset-1" : ""
                }`}
              >
                <Badge variant={stat.variant} className="mb-2">
                  {stat.label}
                </Badge>
                <p className="text-2xl font-bold text-foreground">{statusCounts[stat.key]}</p>
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <Card className="p-4 border border-border/80 shadow-sm rounded-2xl bg-white">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={t("searchPlaceholder")}
                  className="ps-9 rounded-xl"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {FILTER_OPTIONS.map(({ value, labelKey, icon: Icon }) => (
                  <Button
                    key={labelKey}
                    variant={statusFilter === value ? "default" : "outline"}
                    size="sm"
                    className="rounded-full px-3.5 gap-1.5"
                    onClick={() => setStatusFilter(value)}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden />
                    {t(`filters.${labelKey}`)}
                  </Button>
                ))}
              </div>
            </div>
          </Card>

          {error ? (
            <p className="text-sm text-destructive flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0" aria-hidden />
              {error}
            </p>
          ) : null}

          {/* Liste */}
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden />
              <span className="text-sm">{t("loading")}</span>
            </div>
          ) : filtered.length === 0 ? (
            <Card className="p-12 text-center border-dashed rounded-2xl bg-white">
              <Inbox className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" aria-hidden />
              <p className="text-sm text-muted-foreground">{t("empty")}</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {paged.map((insc) => {
                const canModerate =
                  insc.statutCode === "CANDIDATURE" || insc.statutCode === "EN_COURS";
                return (
                  <Card
                    key={insc.id}
                    className="p-5 border border-border/80 shadow-sm rounded-2xl bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-[var(--primary-light)] border border-[var(--status-progress-border)] flex items-center justify-center shrink-0 text-lg font-bold text-[var(--status-progress-text)]">
                        {childInitial(insc.childName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="min-w-0">
                            <h3 className="font-bold text-base text-foreground truncate flex items-center gap-1.5">
                              <Baby className="w-4 h-4 text-[var(--status-progress-text)] shrink-0" aria-hidden />
                              {insc.childName}
                            </h3>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <CalendarDays className="w-3.5 h-3.5 shrink-0" aria-hidden />
                              {new Date(insc.createdAt).toLocaleDateString(
                                currentLocale === "ar" ? "ar-MA" : "fr-FR",
                                { day: "numeric", month: "short", year: "numeric" },
                              )}
                            </p>
                          </div>
                          <Badge variant={inscriptionStatusBadgeVariant(insc.statutCode)} className="shrink-0">
                            {labelForStatus(insc.statutCode)}
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm rounded-xl bg-muted/30 p-3 mb-4">
                          <div className="flex items-center gap-2 min-w-0">
                            <User className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
                            <span className="text-muted-foreground shrink-0">{t("parent")}:</span>
                            <span className="font-medium truncate ms-auto text-end">{insc.parentName}</span>
                          </div>
                          <div className="flex items-center gap-2 min-w-0">
                            <Mail className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
                            <span className="text-muted-foreground shrink-0">{t("email")}:</span>
                            <span className="font-medium truncate ms-auto text-end">{insc.email}</span>
                          </div>
                        </div>

                        <div className="flex gap-2 flex-wrap">
                          <Link href={withLocalePath(currentLocale, `/admin/inscriptions/${insc.id}`)}>
                            <Button size="sm" variant="outline" className="gap-1.5 rounded-xl">
                              <Eye className="w-4 h-4" aria-hidden />
                              {t("viewDetails")}
                              <ChevronRight className="w-3.5 h-3.5 opacity-60" aria-hidden />
                            </Button>
                          </Link>
                          {canModerate ? (
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="gap-1.5 rounded-xl"
                                onClick={() => handleAccept(insc.id)}
                              >
                                <CheckCircle2 className="w-4 h-4" aria-hidden />
                                {t("actions.accept")}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive-outline"
                                className="gap-1.5 rounded-xl"
                                onClick={() => setRejectTargetId(insc.id)}
                              >
                                <XCircle className="w-4 h-4" aria-hidden />
                                {t("actions.reject")}
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}

          {!loading && filtered.length > 0 ? (
            <AdminListPagination
              page={page}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      </AdminMainContent>

      <RejectInscriptionDialog
        open={Boolean(rejectTargetId)}
        title={t("rejectDialog.title")}
        description={t("rejectDialog.description")}
        reasonLabel={t("rejectDialog.reasonLabel")}
        reasonPlaceholder={t("rejectDialog.reasonPlaceholder")}
        confirmLabel={t("rejectDialog.confirm")}
        cancelLabel={t("rejectDialog.cancel")}
        pending={rejectPending}
        onCancel={() => {
          if (!rejectPending) setRejectTargetId(null);
        }}
        onConfirm={(raison) => {
          if (rejectTargetId) void handleReject(rejectTargetId, raison);
        }}
      />
    </div>
  );
}
