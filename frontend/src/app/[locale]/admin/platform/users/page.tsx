"use client";

import { use, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { PlatformShell } from "@/components/platform/platform-shell";
import { UserManagementTable } from "@/components/platform/user-management-table";
import type { Locale } from "@/lib/i18n/config";

function UsersContent({ locale }: { locale: Locale }) {
  const searchParams = useSearchParams();
  const t = useTranslations("platform.usersPage");
  const roleParam = searchParams.get("role");
  const initialRoleFilter =
    roleParam === "ADMIN" || roleParam === "ENSEIGNANT" || roleParam === "PARENT" ? roleParam : "";

  return (
    <PlatformShell locale={locale} title={t("title")} description={t("description")}>
      <UserManagementTable
        title={t("title")}
        allowCreate
        initialRoleFilter={initialRoleFilter}
      />
    </PlatformShell>
  );
}

export default function PlatformUsersPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);

  return (
    <Suspense>
      <UsersContent locale={locale} />
    </Suspense>
  );
}
