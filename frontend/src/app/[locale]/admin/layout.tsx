"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { fetchSession } from "@/lib/auth-session"
import { dashboardPathForRole, normalizeAppRole } from "@/lib/auth/jwt-edge"
import { SidebarProvider } from "@/components/layout/sidebar-context"

/**
 * Renfort côté client — le middleware impose déjà auth + rôle ADMIN.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname() || "/"
  const [ready, setReady] = useState(false)
  const t = useTranslations("common")

  useEffect(() => {
    let cancelled = false
    void fetchSession().then((session) => {
      if (cancelled) return
      const locale = pathname.split("/").filter(Boolean)[0] || "fr"
      if (!session.authenticated) {
        router.replace(`/${locale}`)
        return
      }
      const role = normalizeAppRole(session.role)
      if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
        router.replace(dashboardPathForRole(locale, role))
        return
      }
      setReady(true)
    })
    return () => {
      cancelled = true
    }
  }, [pathname, router])

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    )
  }

  return <SidebarProvider>{children}</SidebarProvider>
}
