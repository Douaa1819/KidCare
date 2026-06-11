"use client"

import { useEffect, useState } from "react"
import {
  EMPTY_STATS,
  fetchClassDayStats,
  type ClassDayStats,
} from "@/lib/teacher-class-day-stats"

export function useClassDayStats(classeId: string | null, dateYmd: string) {
  const [stats, setStats] = useState<ClassDayStats>(EMPTY_STATS)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!classeId || !dateYmd) {
      setStats(EMPTY_STATS)
      return
    }

    const resolvedClasseId = classeId
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const data = await fetchClassDayStats(resolvedClasseId, dateYmd)
        if (!cancelled) setStats(data)
      } catch {
        if (!cancelled) setStats(EMPTY_STATS)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [classeId, dateYmd])

  return { stats, loading }
}
