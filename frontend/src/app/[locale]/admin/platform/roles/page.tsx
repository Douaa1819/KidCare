"use client";

import { use, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { PlatformShell } from "@/components/platform/platform-shell";
import { PermissionMatrix } from "@/components/platform/permission-matrix";
import { apiClient } from "@/lib/api";
import { notifyError, notifySuccess } from "@/lib/feedback";
import type { Locale } from "@/lib/i18n/config";

export default function PlatformRolesPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  const t = useTranslations("platform.rolesPage");
  const tp = useTranslations("platform.permissions");
  const [matrix, setMatrix] = useState<Record<string, Record<string, Record<string, boolean>>>>({});
  const [roleFilter, setRoleFilter] = useState("");

  useEffect(() => {
    void apiClient.getPlatformPermissions().then((res) => setMatrix(res.data));
  }, []);

  async function onToggle(role: string, resource: string, flag: string, value: boolean) {
    try {
      await apiClient.updatePlatformPermission(role, resource, { [flag]: value });
      setMatrix((prev) => ({
        ...prev,
        [role]: {
          ...prev[role],
          [resource]: { ...prev[role]?.[resource], [flag]: value },
        },
      }));
      notifySuccess(t("updated"));
    } catch {
      notifyError(t("updateError"));
    }
  }

  const roleOptions = [
    { value: "SUPER_ADMIN", label: tp("roles.superAdmin") },
    { value: "ADMIN", label: tp("roles.admin") },
    { value: "ENSEIGNANT", label: tp("roles.teacher") },
    { value: "PARENT", label: tp("roles.parent") },
  ] as const;

  return (
    <PlatformShell locale={locale} title={t("title")} description={t("description")}>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label htmlFor="permission-role-filter" className="text-sm font-medium text-gray-700">
          {t("filterByRole")}
        </label>
        <select
          id="permission-role-filter"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-800 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
        >
          <option value="">{t("allRoles")}</option>
          {roleOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <PermissionMatrix
        matrix={matrix}
        editable
        visibleRoles={roleFilter ? [roleFilter] : undefined}
        onToggle={(r, res, f, v) => void onToggle(r, res, f, v)}
      />
    </PlatformShell>
  );
}
