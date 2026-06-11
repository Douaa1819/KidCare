"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlatformShell } from "@/components/platform/platform-shell";
import { AuditActionBadge, AuditEntityLabel } from "@/components/platform/audit-action-badge";
import { PlatformPagination } from "@/components/platform/platform-pagination";
import { StatusBadge } from "@/components/platform/status-badge";
import { apiClient } from "@/lib/api";
import { withLocalePath } from "@/lib/i18n/locale-path";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { AUDIT_ACTIONS } from "@/lib/platform-audit";
import type { Locale } from "@/lib/i18n/config";
import {
  AlertTriangle, ExternalLink, Loader2, Lock, Search, ShieldAlert, Users,
} from "lucide-react";

type AuditEntry = {
  id: string;
  action: string;
  userEmail?: string | null;
  entity?: string | null;
  entityId?: string | null;
  ip?: string | null;
  creeLe: string;
};

type SecurityUser = {
  id?: string;
  email?: string;
  prenom?: string;
  nom?: string;
  role?: string;
  creeLe?: string;
  lastActivity?: string;
};

const AUDIT_PAGE_SIZE = 20;

function UserLink({ locale, email, id, name }: { locale: Locale; email?: string; id?: string; name?: string }) {
  const t = useTranslations("platform.security");
  if (!email && !id) return <span className="text-gray-400">—</span>;
  const href = withLocalePath(locale, `/admin/platform/users?q=${encodeURIComponent(email ?? "")}`);
  return (
    <Link href={href} className="inline-flex items-center gap-1 text-violet-700 hover:text-violet-900 font-medium">
      {name ?? email}
      <ExternalLink className="h-3 w-3 opacity-60" />
      <span className="sr-only">{t("viewUser")}</span>
    </Link>
  );
}

export default function PlatformSecurityPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  const t = useTranslations("platform.security");
  const ta = useTranslations("platform.audit");
  const uiLocale = useLocale();
  const dateLocale = uiLocale === "ar" ? "ar-MA" : "fr-FR";

  const [data, setData] = useState<Record<string, unknown[]> | null>(null);
  const [securityLoading, setSecurityLoading] = useState(true);

  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [auditLoading, setAuditLoading] = useState(true);
  const [auditQ, setAuditQ] = useState("");
  const debouncedQ = useDebouncedValue(auditQ.trim(), 400);
  const [actionFilter, setActionFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [auditPage, setAuditPage] = useState(1);
  const [auditPagination, setAuditPagination] = useState({ page: 1, limit: AUDIT_PAGE_SIZE, total: 0, pages: 1 });

  useEffect(() => {
    setSecurityLoading(true);
    void apiClient.getPlatformSecurity()
      .then((res) => setData(res.data))
      .finally(() => setSecurityLoading(false));
  }, []);

  const loadAudit = useCallback(async () => {
    setAuditLoading(true);
    try {
      const res = await apiClient.listPlatformAuditLogs({
        page: auditPage,
        limit: AUDIT_PAGE_SIZE,
        q: debouncedQ || undefined,
        action: actionFilter || undefined,
        from: dateFrom || undefined,
        to: dateTo || undefined,
      });
      setLogs(res.data.data ?? []);
      setAuditPagination(res.data.pagination ?? { page: auditPage, limit: AUDIT_PAGE_SIZE, total: 0, pages: 1 });
    } finally {
      setAuditLoading(false);
    }
  }, [auditPage, debouncedQ, actionFilter, dateFrom, dateTo]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  useEffect(() => {
    setAuditPage(1);
  }, [debouncedQ, actionFilter, dateFrom, dateTo]);

  const sections = [
    { key: "failedLogins", title: t("failedLogins"), icon: ShieldAlert, color: "text-red-600 bg-red-50" },
    { key: "activeSessions", title: t("activeSessions"), icon: Users, color: "text-blue-600 bg-blue-50" },
    { key: "blockedUsers", title: t("blockedUsers"), icon: Lock, color: "text-orange-600 bg-orange-50" },
    { key: "suspiciousActivity", title: t("suspicious"), icon: AlertTriangle, color: "text-amber-600 bg-amber-50" },
  ] as const;

  function renderSecurityItem(key: string, item: Record<string, unknown>, i: number) {
    if (key === "failedLogins") {
      const email = String(item.email ?? item.userEmail ?? "");
      return (
        <li key={i} className="flex items-start justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
          <div>
            <UserLink locale={locale} email={email} name={email} />
            {item.ip ? <span className="block text-xs text-gray-400 mt-0.5">{String(item.ip)}</span> : null}
          </div>
          {item.creeLe ? (
            <time className="text-xs text-gray-400 shrink-0">
              {new Date(String(item.creeLe)).toLocaleString(dateLocale)}
            </time>
          ) : null}
        </li>
      );
    }
    if (key === "activeSessions") {
      const user = item.utilisateur as SecurityUser | undefined;
      return (
        <li key={i} className="flex items-start justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
          <UserLink locale={locale} email={user?.email} id={user?.id} name={user ? `${user.prenom} ${user.nom}` : undefined} />
          {item.lastActivity ? (
            <time className="text-xs text-gray-400 shrink-0">
              {new Date(String(item.lastActivity)).toLocaleString(dateLocale)}
            </time>
          ) : null}
        </li>
      );
    }
    if (key === "blockedUsers") {
      const user = item as SecurityUser;
      return (
        <li key={i} className="flex items-center justify-between gap-2 py-2 border-b border-gray-50 last:border-0">
          <UserLink locale={locale} email={user.email} id={user.id} name={`${user.prenom} ${user.nom}`} />
          <StatusBadge status="DISABLED" />
        </li>
      );
    }
    if (key === "suspiciousActivity") {
      return (
        <li key={i} className="py-2 border-b border-gray-50 last:border-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <AuditActionBadge action={String(item.action ?? "")} />
            {item.userEmail ? (
              <UserLink locale={locale} email={String(item.userEmail)} name={String(item.userEmail)} />
            ) : null}
          </div>
          {item.creeLe ? (
            <time className="text-xs text-gray-400">
              {new Date(String(item.creeLe)).toLocaleString(dateLocale)}
            </time>
          ) : null}
        </li>
      );
    }
    return null;
  }

  return (
    <PlatformShell locale={locale} title={t("title")} description={t("description")}>
      {securityLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400 gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-violet-500" />
          {t("loading")}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2 mb-10">
          {sections.map(({ key, title, icon: Icon, color }) => {
            const items = (data?.[key] as Record<string, unknown>[]) ?? [];
            return (
              <Card key={key} className="p-5 border-gray-200/80 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`rounded-xl p-2.5 ${color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{title}</h3>
                    <p className="text-xs text-gray-500">{t("count", { count: items.length })}</p>
                  </div>
                </div>
                {items.length === 0 ? (
                  <p className="text-sm text-gray-400 py-4 text-center rounded-lg bg-gray-50/80">{t("noEntries")}</p>
                ) : (
                  <ul className="max-h-56 overflow-y-auto text-sm">
                    {items.slice(0, 10).map((item, i) => renderSecurityItem(key, item, i))}
                  </ul>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{ta("title")}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{ta("description")}</p>
      </div>

      <Card className="p-4 mb-4 border-gray-200/80 shadow-sm">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative sm:col-span-2">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={ta("filterPlaceholder")}
              value={auditQ}
              onChange={(e) => setAuditQ(e.target.value)}
              className="ps-9"
            />
          </div>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="">{ta("allActions")}</option>
            {AUDIT_ACTIONS.map((action) => (
              <option key={action} value={action}>
                {ta(`actions.${action.replace(/\./g, "_")}` as "actions.login_failed")}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="text-sm" aria-label={ta("dateFrom")} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="text-sm" aria-label={ta("dateTo")} />
          </div>
        </div>
        {(actionFilter || dateFrom || dateTo || auditQ) && (
          <Button variant="ghost" size="sm" className="mt-2 text-gray-500" onClick={() => {
            setAuditQ(""); setActionFilter(""); setDateFrom(""); setDateTo("");
          }}>
            {ta("clearFilters")}
          </Button>
        )}
      </Card>

      <Card className="overflow-hidden border-gray-200/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 text-start text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">{ta("date")}</th>
                <th className="px-4 py-3 font-medium">{ta("user")}</th>
                <th className="px-4 py-3 font-medium">{ta("action")}</th>
                <th className="px-4 py-3 font-medium">{ta("entity")}</th>
                <th className="px-4 py-3 font-medium">{ta("ip")}</th>
              </tr>
            </thead>
            <tbody>
              {auditLoading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-violet-500" />
                    {ta("loading")}
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400">{ta("empty")}</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-t border-gray-100 hover:bg-violet-50/20">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {new Date(log.creeLe).toLocaleString(dateLocale)}
                    </td>
                    <td className="px-4 py-3">
                      {log.userEmail ? (
                        <UserLink locale={locale} email={log.userEmail} name={log.userEmail} />
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <AuditActionBadge action={log.action} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <AuditEntityLabel entity={log.entity} />
                      {log.entityId && (
                        <span className="block text-xs text-gray-400 font-mono mt-0.5">
                          {log.entityId.slice(0, 8)}…
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{log.ip ?? "—"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4">
          <PlatformPagination
            page={auditPagination.page}
            pages={auditPagination.pages}
            total={auditPagination.total}
            limit={auditPagination.limit}
            onPageChange={setAuditPage}
          />
        </div>
      </Card>
    </PlatformShell>
  );
}
