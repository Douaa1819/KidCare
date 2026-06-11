"use client"

import type React from "react"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { usePathname, useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { TeacherAccountMenu } from "@/components/layout/teacher-account-menu"
import { TeacherClassProvider, useTeacherClass } from "@/components/teacher/teacher-class-context"
import { TeacherClassSelect } from "@/components/teacher/teacher-class-select"
import { TeacherNoClassEmpty } from "@/components/teacher/teacher-no-class-empty"
import { logoutSession } from "@/lib/auth-session"

function TeacherLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const t = useTranslations()
  const { loading, isEmpty, loadError } = useTeacherClass()
  const isArabic = pathname?.startsWith("/ar")
  const currentLocale = isArabic ? "ar" : "fr"
  const currentLabel = isArabic ? "AR" : "FR"
  const nextLocale = isArabic ? "fr" : "ar"
  const nextLabel = isArabic ? "FR" : "AR"

  const handleToggleLanguage = () => {
    if (!pathname) return
    const segments = pathname.split("/")
    const rest = segments.slice(3).join("/")
    const newPath = `/${nextLocale}/teacher${rest ? `/${rest}` : ""}`
    router.push(newPath)
  }

  const handleLogout = async () => {
    await logoutSession()
    router.push(`/${currentLocale}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-slate-50">
      <header className="border-b bg-white">
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 md:px-6 py-4 pt-[calc(env(safe-area-inset-top)+1rem)] md:pt-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-sky-200">
              <Image src="/Group 13.svg" alt="Logo PetitsPas" width={40} height={40} />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-gray-900 truncate">{t("teacher.dashboard.title")}</h1>
              <p className="text-sm text-gray-500">Crèche PetitsPas</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full sm:w-auto sm:justify-end">
            <TeacherClassSelect showLabel={false} className="flex-1 sm:flex-initial" />
            <Button
              variant="outline"
              size="sm"
              className="rounded-full shrink-0"
              onClick={handleToggleLanguage}
            >
              {currentLabel} • {nextLabel}
            </Button>
            <TeacherAccountMenu onLogout={() => void handleLogout()} />
          </div>
        </div>
      </header>

      <main className="px-3 md:px-6 py-6 md:py-8">
        {loading ? (
          <p className="text-sm text-gray-500 py-12 text-center">{t("teacher.dashboard.loading")}</p>
        ) : loadError ? (
          <p className="text-sm text-red-600 py-12 text-center">{t("teacher.dashboard.loadClassesError")}</p>
        ) : isEmpty ? (
          <TeacherNoClassEmpty />
        ) : (
          children
        )}
      </main>
    </div>
  )
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <TeacherClassProvider>
      <TeacherLayoutShell>{children}</TeacherLayoutShell>
    </TeacherClassProvider>
  )
}
