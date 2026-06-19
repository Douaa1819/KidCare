"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { PlatformShell } from "@/components/platform/platform-shell";
import { apiClient } from "@/lib/api";
import { withLocalePath } from "@/lib/i18n/locale-path";
import type { Locale } from "@/lib/i18n/config";
import { Shield, GraduationCap, Users, UserCheck, UserX, ScrollText, KeyRound, Lock, Settings, Flag } from "lucide-react";

type Stats = {
  admins: number;
  teachers: number;
  parents: number;
  activeUsers: number;
  disabledUsers: number;
  auditLast24h: number;
};

export default function PlatformDashboardPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = use(params);
  const t = useTranslations("platform.dashboard");
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    void apiClient.getPlatformStats().then((res) => setStats(res.data));
  }, []);

  const statCards = [
    { label: t("admins"), value: stats?.admins, icon: Shield, color: "text-indigo-600" },
    { label: t("teachers"), value: stats?.teachers, icon: GraduationCap, color: "text-blue-600" },
    { label: t("parents"), value: stats?.parents, icon: Users, color: "text-cyan-600" },
    { label: t("activeUsers"), value: stats?.activeUsers, icon: UserCheck, color: "pp-text-success" },
    { label: t("disabledUsers"), value: stats?.disabledUsers, icon: UserX, color: "text-orange-600" },
    { label: t("audit24h"), value: stats?.auditLast24h, icon: ScrollText, color: "text-violet-600" },
  ];

  const quickLinks = [
    { href: "/admin/platform/users", label: t("linkUsers"), icon: Users },
    { href: "/admin/platform/roles", label: t("linkPermissions"), icon: Shield },
    { href: "/admin/platform/access", label: t("linkAccess"), icon: KeyRound },
    { href: "/admin/platform/security", label: t("linkSecurity"), icon: Lock },
    { href: "/admin/platform/settings", label: t("linkSettings"), icon: Settings },
    { href: "/admin/platform/feature-flags", label: t("linkFeatureFlags"), icon: Flag },
  ];

  return (
    <PlatformShell locale={locale} title={t("title")} description={t("description")}>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-8">
        {statCards.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.label} className="p-5 flex items-start gap-4">
              <div className={`rounded-lg bg-gray-50 p-2.5 ${c.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{c.value ?? "—"}</p>
                <p className="text-sm text-gray-500">{c.label}</p>
              </div>
            </Card>
          );
        })}
      </div>

      <h2 className="text-sm font-semibold text-gray-700 mb-3">{t("quickActions")}</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link key={link.href} href={withLocalePath(locale, link.href)}>
              <Card className="p-4 flex items-center gap-3 hover:bg-violet-50/50 hover:border-violet-200 transition-colors cursor-pointer h-full">
                <div className="rounded-lg bg-violet-100 p-2 text-violet-700">
                  <Icon className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium text-gray-800">{link.label}</span>
              </Card>
            </Link>
          );
        })}
      </div>
    </PlatformShell>
  );
}
