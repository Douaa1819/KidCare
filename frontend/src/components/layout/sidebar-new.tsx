"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { fetchSession, logoutSession } from "@/lib/auth-session";
import {
  LayoutDashboard,
  Users,
  Baby,
  FileText,
  Settings,
  LogOut,
  UtensilsCrossed,
  Calendar,
  ClipboardList,
  Menu,
  X,
  ScrollText,
  Building2,
  Crown,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { withLocalePath } from "@/lib/i18n/locale-path";
import type { Locale } from "@/lib/i18n/config";
import { useSidebar } from "@/components/layout/sidebar-context";
import { NavTooltip } from "@/components/layout/nav-tooltip";

interface SidebarItem {
  labelKey: string;
  href: string;
  icon: React.ReactNode;
  submenu?: { labelKey: string; href: string }[];
}

export function SidebarNew({ currentLocale }: { currentLocale: Locale }) {
  const pathname = usePathname();
  const router = useRouter();
  const [expandedMenus, setExpandedMenus] = useState<string[]>([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [sessionRole, setSessionRole] = useState("");
  const [sessionEmail, setSessionEmail] = useState("");
  const t = useTranslations('sidebar');
  const tr = useTranslations('roles');
  const ta = useTranslations('common.a11y');
  const tc = useTranslations('common');
  const { collapsed, toggleCollapsed } = useSidebar();

  useEffect(() => {
    void fetchSession().then((s) => {
      setSessionRole(s.role);
      setSessionEmail(s.email);
    });
  }, []);

  const isSuperAdmin = sessionRole === "SUPER_ADMIN";
  const adminEmail = sessionEmail;

  const platformItem: SidebarItem | null = isSuperAdmin
    ? {
        labelKey: "platform",
        href: "/admin/platform",
        icon: <Shield className="w-5 h-5" />,
      }
    : null;

  const sidebarItems: SidebarItem[] = [
    {
      labelKey: "overview",
      href: "/admin",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },
    ...(platformItem ? [platformItem] : []),
    {
      labelKey: "children",
      href: "/admin/enfants",
      icon: <Baby className="w-5 h-5" />,
    },
    {
      labelKey: "registrations",
      href: "/admin/inscriptions",
      icon: <FileText className="w-5 h-5" />,
    },
    {
      labelKey: "classes",
      href: "/admin/classes",
      icon: <Users className="w-5 h-5" />,
    },
    {
      labelKey: "teachers",
      href: "/admin/teachers",
      icon: <Users className="w-5 h-5" />,
    },
    {
      labelKey: "menus",
      href: "/admin/menus",
      icon: <UtensilsCrossed className="w-5 h-5" />,
    },
    {
      labelKey: "events",
      href: "/admin/events",
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      labelKey: "presenceHistory",
      href: "/admin/presences",
      icon: <ClipboardList className="w-5 h-5" />,
    },
    {
      labelKey: "users",
      href: "/admin/utilisateurs",
      icon: <Users className="w-5 h-5" />,
    },
    {
      labelKey: "reglement",
      href: "/admin/reglement-interieur",
      icon: <ScrollText className="w-5 h-5" />,
    },
    {
      labelKey: "etablissement",
      href: "/admin/etablissement",
      icon: <Building2 className="w-5 h-5" />,
    },
    {
      labelKey: "profile",
      href: "/admin/profile",
      icon: <Settings className="w-5 h-5" />,
    },
  ];

  const toggleMenu = (labelKey: string) => {
    setExpandedMenus((prev) =>
      prev.includes(labelKey) ? prev.filter((m) => m !== labelKey) : [...prev, labelKey],
    );
  };

  const handleLogout = async () => {
    await logoutSession();
    const loginPath = withLocalePath(currentLocale, "/");
    setMobileOpen(false);
    router.replace(loginPath);
  };

  const renderNavLink = (item: SidebarItem, onNavigate?: () => void) => {
    const pathForActive = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
    const isActive =
      pathForActive === item.href ||
      (item.href !== "/admin" && pathForActive.startsWith(item.href + "/"));
    const label = t(item.labelKey);

    const link = (
      <Link
        href={withLocalePath(currentLocale, item.href)}
        onClick={onNavigate}
        className={cn(
          "w-full flex items-center rounded-lg text-sm font-medium transition-all",
          collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-2",
          isActive
            ? "bg-primary text-primary-foreground"
            : "text-sidebar-foreground hover:bg-sidebar-accent/30",
        )}
        aria-label={collapsed ? label : undefined}
      >
        <span className="shrink-0">{item.icon}</span>
        {!collapsed && <span className="flex-1 min-w-0 text-start truncate">{label}</span>}
      </Link>
    );

    return (
      <NavTooltip key={item.labelKey} label={label} show={collapsed}>
        {link}
      </NavTooltip>
    );
  };

  const renderSidebarFooter = (closeMobile?: () => void) => (
    <div className="relative z-10 flex-shrink-0 border-t border-sidebar-border p-2 space-y-1 bg-sidebar pb-[max(0.5rem,env(safe-area-inset-bottom))]">
      <button
        type="button"
        onClick={toggleCollapsed}
        className={cn(
          "hidden md:flex w-full items-center rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/30 transition-all",
          collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-2",
        )}
        aria-label={collapsed ? t("expandMenu") : t("collapseMenu")}
      >
        {collapsed ? (
          <PanelLeftOpen className="w-5 h-5 shrink-0" />
        ) : (
          <>
            <PanelLeftClose className="w-5 h-5 shrink-0" />
            <span className="flex-1 text-start">{t("collapseMenu")}</span>
          </>
        )}
      </button>
      <div className={cn("py-2", collapsed ? "flex justify-center px-1" : "px-4")}>
        <LanguageSwitcher currentLocale={currentLocale} variant="toggle" compact={collapsed} />
      </div>
      <NavTooltip label={t("logout")} show={collapsed}>
        <button
          onClick={() => {
            closeMobile?.();
            setLogoutConfirm(true);
          }}
          className={cn(
            "w-full flex items-center rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-all",
            collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-3",
          )}
          aria-label={collapsed ? t("logout") : undefined}
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!collapsed && t("logout")}
        </button>
      </NavTooltip>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed start-4 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[60] inline-flex items-center justify-center h-10 w-10 rounded-lg border border-gray-200 bg-white shadow-md active:scale-95 transition-transform"
        aria-label={tc("openMenu")}
      >
        <Menu className="h-5 w-5" />
      </button>

      <div
        className={cn(
          "md:hidden fixed inset-0 z-[55] bg-black/40 transition-opacity duration-200",
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside
        className={cn(
          "bg-sidebar border-e border-sidebar-border flex flex-col overflow-hidden fixed start-0 top-0 bottom-0 z-50 transition-[width] duration-300 ease-in-out",
          "hidden md:flex",
          collapsed ? "w-16" : "w-64",
        )}
      >
        <div className={cn("flex-shrink-0 mb-4 pt-6", collapsed ? "px-2" : "px-6")}>
          <Link
            href={withLocalePath(currentLocale, "/admin")}
            className={cn("flex items-center", collapsed ? "justify-center" : "gap-3")}
            title="PetitsPas"
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-transparent shrink-0">
              <Image
                src="/Group 13.svg"
                alt={ta("logoAlt")}
                width={40}
                height={40}
              />
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <h1 className="font-bold text-lg text-sidebar-foreground">PetitsPas</h1>
                {isSuperAdmin ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600">
                    <Crown className="h-3.5 w-3.5" aria-hidden /> {tr("superAdmin")}
                  </span>
                ) : (
                  <p className="text-xs text-sidebar-foreground/60">{tr("admin")}</p>
                )}
              </div>
            )}
          </Link>
          {!collapsed && isSuperAdmin && adminEmail && (
            <p className="text-[10px] text-sidebar-foreground/50 mt-1 truncate ps-[52px]">{adminEmail}</p>
          )}
        </div>

        <nav className={cn("flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 pb-3", collapsed ? "px-1.5" : "px-3")}>
          {sidebarItems.map((item) => {
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            if (!hasSubmenu) return renderNavLink(item);

            const pathForActive = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
            const isActive = pathForActive === item.href || (item.href !== "/admin" && pathForActive.startsWith(item.href + "/"));
            const isExpanded = expandedMenus.includes(item.labelKey);
            const label = t(item.labelKey);

            return (
              <div key={item.labelKey}>
                <NavTooltip label={label} show={collapsed}>
                  <button
                    type="button"
                    onClick={() => toggleMenu(item.labelKey)}
                    className={cn(
                      "w-full flex items-center rounded-lg text-sm font-medium transition-all",
                      collapsed ? "justify-center px-2 py-2.5" : "gap-3 px-4 py-2",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/30",
                    )}
                    aria-label={collapsed ? label : undefined}
                  >
                    {item.icon}
                    {!collapsed && <span className="flex-1 min-w-0 text-start truncate">{label}</span>}
                    {!collapsed && (
                      <Baby className={cn("w-4 h-4 transition-transform", isExpanded && "rotate-180")} />
                    )}
                  </button>
                </NavTooltip>

                {isExpanded && item.submenu && !collapsed && (
                  <div className="ms-4 mt-1 space-y-1">
                    {item.submenu.map((subitem) => {
                      const subPathForActive = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
                      const isSubActive = subPathForActive === subitem.href;
                      return (
                        <Link
                          key={subitem.href}
                          href={withLocalePath(currentLocale, subitem.href)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all",
                            isSubActive
                              ? "bg-primary/20 text-primary-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/20",
                          )}
                        >
                          <span>•</span>
                          {t(subitem.labelKey)}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {renderSidebarFooter()}
      </aside>

      <aside
        className={cn(
          "md:hidden w-[85vw] max-w-[20rem] bg-sidebar border-e border-sidebar-border flex flex-col overflow-hidden fixed start-0 top-0 bottom-0 pt-[calc(env(safe-area-inset-top)+1.5rem)] z-[60] transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full rtl:translate-x-full",
        )}
      >
        <div className="flex-shrink-0 px-6 mb-4 flex items-start justify-between gap-3">
          <Link
            href={withLocalePath(currentLocale, "/admin")}
            className="flex items-center gap-3"
            onClick={() => setMobileOpen(false)}
          >
            <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center bg-transparent">
              <Image
                src="/Group 13.svg"
                alt={ta("logoAlt")}
                width={40}
                height={40}
              />
            </div>
            <div className="min-w-0">
              <h1 className="font-bold text-lg text-sidebar-foreground">PetitsPas</h1>
              {isSuperAdmin ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600">
                  <Crown className="h-3.5 w-3.5" aria-hidden /> {tr("superAdmin")}
                </span>
              ) : (
                <p className="text-xs text-sidebar-foreground/60">{tr("admin")}</p>
              )}
            </div>
          </Link>

          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-sidebar-border text-sidebar-foreground"
            aria-label={tc("closeMenu")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-2 px-3 pb-3">
          {sidebarItems.map((item) => {
            const pathForActive = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
            const isActive = pathForActive === item.href || (item.href !== "/admin" && pathForActive.startsWith(item.href + "/"));
            const hasSubmenu = item.submenu && item.submenu.length > 0;
            const isExpanded = expandedMenus.includes(item.labelKey);

            if (!hasSubmenu) {
              return (
                <Link
                  key={item.labelKey}
                  href={withLocalePath(currentLocale, item.href)}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/30",
                  )}
                >
                  {item.icon}
                  <span className="flex-1 min-w-0 text-left truncate [@media(max-width:220px)]:hidden">{t(item.labelKey)}</span>
                </Link>
              );
            }

            return (
              <div key={item.labelKey}>
                <button
                  type="button"
                  onClick={() => toggleMenu(item.labelKey)}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/30",
                  )}
                >
                  {item.icon}
                  <span className="flex-1 min-w-0 text-left truncate [@media(max-width:220px)]:hidden">{t(item.labelKey)}</span>
                  <Baby
                    className={cn(
                      "w-4 h-4 transition-transform",
                      isExpanded && "rotate-180",
                    )}
                  />
                </button>

                {isExpanded && item.submenu && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.submenu.map((subitem) => {
                      const subPathForActive = pathname.replace(/^\/[a-z]{2}(\/|$)/, "/");
                      const isSubActive = subPathForActive === subitem.href;
                      return (
                        <Link
                          key={subitem.href}
                          href={withLocalePath(currentLocale, subitem.href)}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all",
                            isSubActive
                              ? "bg-primary/20 text-primary-foreground"
                              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/20",
                          )}
                        >
                          <span>•</span>
                          {t(subitem.labelKey)}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {renderSidebarFooter(() => setMobileOpen(false))}
      </aside>

      {/* Logout confirmation dialog */}
      {logoutConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <LogOut className="w-5 h-5 text-destructive" />
              </div>
              <h2 className="text-base font-semibold text-gray-900">{t('logoutConfirmTitle')}</h2>
            </div>
            <p className="text-sm text-gray-600">{t('logoutConfirmMessage')}</p>
            <div className="flex gap-3 pt-1">
            <button
              onClick={() => void handleLogout()}
                className="flex-1 rounded-lg bg-destructive px-4 py-2 text-sm font-semibold text-white hover:bg-destructive/90 transition-colors"
              >
                {t('logoutConfirmYes')}
              </button>
              <button
                onClick={() => setLogoutConfirm(false)}
                className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                {t('logoutConfirmNo')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
