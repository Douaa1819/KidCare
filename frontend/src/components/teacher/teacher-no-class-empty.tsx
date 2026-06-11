"use client"

import { useTranslations } from "next-intl"
import { Card, CardContent } from "@/components/ui/card"
import { School } from "lucide-react"

export function TeacherNoClassEmpty() {
  const t = useTranslations("teacher.dashboard")

  return (
    <div className="max-w-lg mx-auto py-8 px-2">
      <Card className="rounded-2xl border border-dashed border-sky-200 bg-sky-50/40 shadow-sm">
        <CardContent className="flex flex-col items-center text-center py-10 px-6 gap-4">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-full bg-sky-100 text-sky-700"
            aria-hidden
          >
            <School className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-gray-900">{t("noClassAssignedTitle")}</h2>
            <p className="text-sm text-gray-600 leading-relaxed">{t("noClassAssignedDescription")}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
