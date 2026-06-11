"use client"

import { useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DailyMessageBlock } from "@/components/teacher/daily-message-block"
import { useTeacherClass } from "@/components/teacher/teacher-class-context"
import { TeacherClassSelect } from "@/components/teacher/teacher-class-select"
import { TeacherClassActivityPhotosPanel } from "@/app/[locale]/teacher/teacher-class-activity-photos-panel"
import { useClassDayStats } from "@/hooks/use-class-day-stats"
import { formatLocalDateKey } from "@/lib/date-local"
import { ArrowLeft, Loader2 } from "lucide-react"

export default function TeacherSummaryPage() {
  const t = useTranslations("teacher.summary")
  const params = useParams()
  const locale = (params?.locale as string) ?? "fr"
  const { selectedClass, selectedClassId } = useTeacherClass()

  const [summaryDate, setSummaryDate] = useState(() => formatLocalDateKey(new Date()))
  const { stats, loading: kpisLoading } = useClassDayStats(selectedClassId, summaryDate)

  if (!selectedClass) return null

  const kpiItems = [
    { label: t("kpis.presentLabel"), value: stats.present },
    { label: t("kpis.absentLabel"), value: stats.absent },
    { label: t("kpis.resumesLabel"), value: stats.resumes },
    {
      label: t("kpis.attendanceRateLabel"),
      value: `${stats.attendanceRate}%`,
    },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2 min-w-0 flex-1">
          <Link href={`/${locale}/teacher`}>
            <Button variant="ghost" size="sm" className="gap-1.5 -ml-2 h-9">
              <ArrowLeft className="h-4 w-4 shrink-0" />
              {t("back")}
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">{t("title")}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{selectedClass.nom}</p>
          </div>
          <TeacherClassSelect className="max-w-xs" />
        </div>
        <label className="flex flex-col gap-1 sm:items-end shrink-0">
          <span className="text-xs font-medium text-gray-600">{t("summaryDateLabel")}</span>
          <Input
            type="date"
            value={summaryDate}
            onChange={e => setSummaryDate(e.target.value)}
            className="h-9 w-full sm:w-auto min-w-[9.5rem] rounded-xl border-sky-200"
          />
        </label>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
        {kpiItems.map(item => (
          <Card key={item.label} className="rounded-xl border-sky-100 shadow-sm">
            <CardContent className="p-3 sm:p-4 text-center">
              <p className="text-[10px] sm:text-xs font-medium text-gray-500 uppercase tracking-wide">
                {item.label}
              </p>
              <p className="text-lg sm:text-xl font-bold text-gray-900 mt-1 flex items-center justify-center gap-1.5 min-h-[1.75rem]">
                {kpisLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin text-sky-500" aria-label="Chargement" />
                ) : (
                  item.value
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <DailyMessageBlock
        key={`${selectedClass.id}-${summaryDate}`}
        classeId={selectedClass.id}
        dateYmd={summaryDate}
        t={t}
      />

      <TeacherClassActivityPhotosPanel
        key={`photos-${selectedClass.id}-${summaryDate}`}
        classeId={selectedClass.id}
        dateYmd={summaryDate}
        onDateChange={setSummaryDate}
      />
    </div>
  )
}
