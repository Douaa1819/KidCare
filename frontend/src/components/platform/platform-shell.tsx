"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { SidebarNew } from "@/components/layout/sidebar-new";
import { AdminMainContent } from "@/components/layout/sidebar-context";
import { withLocalePath } from "@/lib/i18n/locale-path";
import type { Locale } from "@/lib/i18n/config";
import {
  LayoutDashboard,
  Users,
  KeyRound,
  Shield,
  Lock,
  Settings,
  Flag,
} from "lucide-react";

const NAV = [
  { href: "/admin/platform", labelKey: "overview", icon: LayoutDashboard },
  { href: "/admin/platform/users", labelKey: "users", icon: Users },
  { href: "/admin/platform/access", labelKey: "access", icon: KeyRound },
  { href: "/admin/platform/roles", labelKey: "roles", icon: Shield },
  { href: "/admin/platform/security", labelKey: "security", icon: Lock },
  { href: "/admin/platform/settings", labelKey: "settings", icon: Settings },
  { href: "/admin/platform/feature-flags", labelKey: "featureFlags", icon: Flag },
] as const;

export function PlatformShell({
  locale,
  title,
  description,
  children,
}: {
  locale: Locale;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const pathSansLocale = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
  const t = useTranslations("platform");

  return (
    <div className="flex min-h-screen bg-gray-50/80">
      <SidebarNew currentLocale={locale} />
      <AdminMainContent className="flex flex-col min-w-0">
        <div className="border-b bg-white/90 backdrop-blur sticky top-0 z-30">
          <div className="px-4 md:px-8 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">{t("badge")}</p>
            <h1 className="text-xl md:text-2xl font-bold text-gray-900 mt-0.5">{title}</h1>
            {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
          </div>
          <nav className="flex gap-1 overflow-x-auto px-4 md:px-8 pb-3 scrollbar-thin">
            {NAV.map((item) => {
              const href = withLocalePath(locale, item.href);
              const active =
                pathSansLocale === item.href ||
                (item.href !== "/admin/platform" && pathSansLocale.startsWith(item.href));
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={href}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-colors no-underline",
                    active
                      ? "bg-violet-600 text-white hover:bg-violet-700"
                      : "bg-gray-100 text-gray-600 hover:bg-violet-50 hover:text-violet-800",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {t(`nav.${item.labelKey}`)}
                </Link>
              );
            })}
          </nav>
        </div>
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </AdminMainContent>
    </div>
  );
}
