"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MenaPhoneInput } from "@/components/ui/mena-phone-input";
import { Badge } from "@/components/ui/badge";
import { SimpleConfirmDialog } from "@/components/ui/simple-confirm-dialog";
import { PlatformPagination } from "@/components/platform/platform-pagination";
import { apiClient } from "@/lib/api";
import { StatusBadge } from "@/components/platform/status-badge";
import { getApiErrorMessage, notifyError, notifySuccess } from "@/lib/feedback";
import { ROLE_BADGE_VARIANT } from "@/lib/design/status-badges";
import {
  AlertTriangle, Archive, KeyRound, Loader2, LogOut, Mail, RotateCcw, Search, UserX,
} from "lucide-react";

export type ManagedUser = {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  role: string;
  statut: string;
  dernierAcces?: string | null;
  archivedAt?: string | null;
};

type RoleFilter = "" | "ADMIN" | "ENSEIGNANT" | "PARENT";
type StatusFilter = "" | "ACTIVE" | "DISABLED" | "INVITED" | "ARCHIVED";
type CreateRole = "ADMIN" | "ENSEIGNANT" | "PARENT";
type ConfirmType = "deactivate" | "archive" | "resetPassword" | "forceLogout" | "restore" | "resendInvitation";

type Props = {
  fixedRole?: CreateRole;
  title: string;
  allowCreate?: boolean;
  initialRoleFilter?: RoleFilter;
};

const PAGE_SIZE = 15;

const actionBtnClass =
  "hover:bg-violet-50 hover:text-violet-900 hover:border-violet-200";

export function UserManagementTable({
  fixedRole,
  title,
  allowCreate = false,
  initialRoleFilter = "",
}: Props) {
  const t = useTranslations("platform.users");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search.trim(), 400);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>(fixedRole ?? initialRoleFilter);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [includeArchived, setIncludeArchived] = useState(false);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ page: 1, limit: PAGE_SIZE, total: 0, pages: 1 });
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ email: "", prenom: "", nom: "", telephone: "" });
  const [createRole, setCreateRole] = useState<CreateRole>(fixedRole ?? "ENSEIGNANT");
  const [actionId, setActionId] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ type: ConfirmType; user: ManagedUser } | null>(null);
  const [confirmPending, setConfirmPending] = useState(false);

  const showAllRoles = !fixedRole;
  const dateLocale = locale === "ar" ? "ar-MA" : "fr-FR";

  const roleLabel = (role: string) => {
    const map: Record<string, string> = {
      SUPER_ADMIN: t("roleSuperAdmin"),
      ADMIN: t("roleAdmin"),
      ENSEIGNANT: t("roleTeacher"),
      PARENT: t("roleParent"),
    };
    return map[role] ?? role;
  };

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.listPlatformUsers({
        role: fixedRole ?? (roleFilter || undefined),
        statut: statusFilter || undefined,
        includeArchived,
        q: debouncedSearch || undefined,
        page,
        limit: PAGE_SIZE,
      });
      setUsers(res.data.data ?? []);
      setPagination(res.data.pagination ?? { page, limit: PAGE_SIZE, total: 0, pages: 1 });
    } catch (err) {
      notifyError(getApiErrorMessage(err, t("toast.loadError")));
    } finally {
      setLoading(false);
    }
  }, [fixedRole, roleFilter, statusFilter, includeArchived, debouncedSearch, page, t]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (initialRoleFilter && !fixedRole) setRoleFilter(initialRoleFilter);
  }, [initialRoleFilter, fixedRole]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, roleFilter, statusFilter, includeArchived]);

  async function handleCreate() {
    try {
      const role = fixedRole ?? createRole;
      if (role === "ADMIN") {
        await apiClient.createPlatformAdmin(form);
      } else {
        await apiClient.createUser({ ...form, role });
      }
      notifySuccess(t("toast.createSuccess"));
      setShowForm(false);
      setForm({ email: "", prenom: "", nom: "", telephone: "" });
      void load();
    } catch (err) {
      notifyError(getApiErrorMessage(err, t("toast.createError")));
    }
  }

  async function executeAction(type: ConfirmType, user: ManagedUser) {
    setActionId(user.id);
    try {
      switch (type) {
        case "deactivate":
          await apiClient.setPlatformUserStatus(user.id, "DISABLED");
          notifySuccess(t("toast.disabled"));
          break;
        case "archive":
          await apiClient.archivePlatformUser(user.id);
          notifySuccess(t("toast.archived"));
          break;
        case "restore":
          await apiClient.restorePlatformUser(user.id);
          notifySuccess(t("toast.restored"));
          break;
        case "resetPassword": {
          await apiClient.resetPlatformUserPassword(user.id);
          notifySuccess(t("toast.emailSentSuccess"));
          break;
        }
        case "resendInvitation": {
          await apiClient.resendPlatformInvitation(user.id);
          notifySuccess(t("toast.emailSentSuccess"));
          break;
        }
        case "forceLogout":
          await apiClient.forceLogoutPlatformUser(user.id);
          notifySuccess(t("toast.sessionsRevoked"));
          break;
      }
      void load();
    } catch (err) {
      const fallback =
        type === "resetPassword" || type === "resendInvitation"
          ? t("toast.emailSendFailed")
          : t("toast.actionError");
      notifyError(getApiErrorMessage(err, fallback));
    } finally {
      setActionId(null);
    }
  }

  async function runDirectAction(type: "activate", user: ManagedUser) {
    setActionId(user.id);
    try {
      await apiClient.setPlatformUserStatus(user.id, "ACTIVE");
      notifySuccess(t("toast.activated"));
      void load();
    } catch (err) {
      notifyError(getApiErrorMessage(err, t("toast.actionError")));
    } finally {
      setActionId(null);
    }
  }

  async function handleConfirm() {
    if (!confirm) return;
    setConfirmPending(true);
    await executeAction(confirm.type, confirm.user);
    setConfirmPending(false);
    setConfirm(null);
  }

  function openConfirm(type: ConfirmType, user: ManagedUser) {
    setConfirm({ type, user });
  }

  const confirmTitle = confirm
    ? t(`confirm.${confirm.type}.title` as "confirm.archive.title")
    : "";
  const confirmDesc = confirm
    ? t(`confirm.${confirm.type}.description` as "confirm.archive.description", {
        name: `${confirm.user.prenom} ${confirm.user.nom}`,
      })
    : "";

  return (
    <div className="space-y-4">
      <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <div className="flex flex-wrap gap-2">
          <div className="relative w-full sm:w-56">
            <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <Input
              type="search"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 pe-9"
              autoComplete="off"
            />
            {loading && (
              <Loader2 className="absolute end-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-violet-600" />
            )}
          </div>
          {showAllRoles && (
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className="border rounded-lg px-3 py-2 text-sm bg-white min-w-[140px]"
            >
              <option value="">{t("allRoles")}</option>
              <option value="ADMIN">{t("roleAdmin")}</option>
              <option value="ENSEIGNANT">{t("roleTeacher")}</option>
              <option value="PARENT">{t("roleParent")}</option>
            </select>
          )}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="border rounded-lg px-3 py-2 text-sm bg-white min-w-[140px]"
          >
            <option value="">{t("allStatuses")}</option>
            <option value="ACTIVE">{t("statusActive")}</option>
            <option value="DISABLED">{t("statusDisabled")}</option>
            <option value="INVITED">{t("statusInvited")}</option>
            <option value="ARCHIVED">{t("statusArchived")}</option>
          </select>
          <label className="inline-flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={includeArchived}
              onChange={(e) => setIncludeArchived(e.target.checked)}
            />
            {t("includeArchived")}
          </label>
          {allowCreate && (
            <Button onClick={() => setShowForm((v) => !v)}>{t("create")}</Button>
          )}
        </div>
      </div>

      {showForm && allowCreate && (
        <Card className="p-4 grid gap-3 sm:grid-cols-2 border-violet-100">
          <Input placeholder={t("form.email")} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <MenaPhoneInput value={form.telephone} onChange={(telephone) => setForm({ ...form, telephone })} />
          <Input placeholder={t("form.firstName")} value={form.prenom} onChange={(e) => setForm({ ...form, prenom: e.target.value })} />
          <Input placeholder={t("form.lastName")} value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
          {showAllRoles && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">{t("form.role")}</label>
              <select
                value={createRole}
                onChange={(e) => setCreateRole(e.target.value as CreateRole)}
                className="w-full border rounded-lg px-3 py-2 text-sm"
              >
                <option value="ADMIN">{t("roleAdmin")}</option>
                <option value="ENSEIGNANT">{t("roleTeacher")}</option>
                <option value="PARENT">{t("roleParent")}</option>
              </select>
              {createRole === "ADMIN" && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-amber-600">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  {t("adminWarning")}
                </p>
              )}
            </div>
          )}
          <div className="sm:col-span-2 flex gap-2">
            <Button onClick={() => void handleCreate()}>{t("sendInvitation")}</Button>
            <Button variant="outline" className={actionBtnClass} onClick={() => setShowForm(false)}>{tc("cancel")}</Button>
          </div>
        </Card>
      )}

      <Card className="overflow-hidden border-gray-200/80 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80 text-start text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">{t("userColumn")}</th>
                {showAllRoles && <th className="px-4 py-3 font-medium">{t("roleColumn")}</th>}
                <th className="px-4 py-3 font-medium">{t("statusColumn")}</th>
                <th className="px-4 py-3 font-medium">{t("lastLogin")}</th>
                <th className="px-4 py-3 font-medium text-end">{t("actionsColumn")}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={showAllRoles ? 5 : 4} className="px-4 py-12 text-center text-gray-400">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-violet-500" />
                    {t("loading")}
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={showAllRoles ? 5 : 4} className="px-4 py-12 text-center text-gray-400">
                    {t("noUsers")}
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSuperAdmin = u.role === "SUPER_ADMIN";
                  const busy = actionId === u.id;
                  return (
                    <tr key={u.id} className="border-t border-gray-100 hover:bg-violet-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900">{u.prenom} {u.nom}</p>
                        <p className="text-xs text-gray-500">{u.email}</p>
                      </td>
                      {showAllRoles && (
                        <td className="px-4 py-3">
                          <Badge variant={ROLE_BADGE_VARIANT[u.role] ?? "neutral"}>
                            {roleLabel(u.role)}
                          </Badge>
                        </td>
                      )}
                      <td className="px-4 py-3"><StatusBadge status={u.statut} /></td>
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {u.dernierAcces ? new Date(u.dernierAcces).toLocaleString(dateLocale) : t("never")}
                      </td>
                      <td className="px-4 py-3">
                        {isSuperAdmin ? (
                          <span className="text-xs text-gray-400">{t("notEditable")}</span>
                        ) : (
                          <div className="flex flex-wrap justify-end gap-1">
                            {u.statut === "ARCHIVED" ? (
                              <Button size="sm" variant="outline" className={actionBtnClass} disabled={busy}
                                onClick={() => openConfirm("restore", u)}>
                                <RotateCcw className="h-3.5 w-3.5 me-1" /> {t("restore")}
                              </Button>
                            ) : (
                              <>
                                {u.statut === "ACTIVE" ? (
                                  <Button size="sm" variant="destructive-outline" disabled={busy}
                                    onClick={() => openConfirm("deactivate", u)}>
                                    <UserX className="h-3.5 w-3.5 me-1" /> {t("deactivate")}
                                  </Button>
                                ) : (
                                  <Button size="sm" variant="outline" className={actionBtnClass} disabled={busy}
                                    onClick={() => void runDirectAction("activate", u)}>
                                    {t("activate")}
                                  </Button>
                                )}
                                <Button size="sm" variant="warning-outline" disabled={busy}
                                  onClick={() => openConfirm("archive", u)}>
                                  <Archive className="h-3.5 w-3.5 me-1" /> {t("archive")}
                                </Button>
                                {u.statut === "INVITED" && (
                                  <Button size="sm" variant="outline" className={actionBtnClass} disabled={busy}
                                    onClick={() => openConfirm("resendInvitation", u)}>
                                    <Mail className="h-3.5 w-3.5 me-1" /> {t("resendInvitation")}
                                  </Button>
                                )}
                                <Button size="sm" variant="outline" className={actionBtnClass} disabled={busy}
                                  onClick={() => openConfirm("resetPassword", u)}>
                                  <KeyRound className="h-3.5 w-3.5 me-1" /> {t("resetPassword")}
                                </Button>
                                <Button size="sm" variant="outline" className={actionBtnClass} disabled={busy}
                                  onClick={() => openConfirm("forceLogout", u)}>
                                  <LogOut className="h-3.5 w-3.5 me-1" /> {t("forceLogout")}
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 pb-4">
          <PlatformPagination
            page={pagination.page}
            pages={pagination.pages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={setPage}
          />
        </div>
      </Card>

      <SimpleConfirmDialog
        open={!!confirm}
        title={confirmTitle}
        description={confirmDesc}
        confirmLabel={tc("confirm")}
        cancelLabel={tc("cancel")}
        pending={confirmPending}
        variant={confirm?.type === "archive" || confirm?.type === "deactivate" ? "destructive" : "default"}
        onConfirm={() => void handleConfirm()}
        onCancel={() => { if (!confirmPending) setConfirm(null); }}
      />
    </div>
  );
}
