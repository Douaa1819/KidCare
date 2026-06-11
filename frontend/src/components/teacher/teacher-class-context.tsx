"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { apiClient } from "@/lib/api"
import { readJwtEmail, readJwtUserId } from "@/lib/teacher-jwt"
import {
  parseTeacherClassesFromApi,
  persistTeacherClassId,
  resolveInitialClassId,
  type TeacherClasse,
} from "@/lib/teacher-class-selection"

type TeacherClassContextValue = {
  classes: TeacherClasse[]
  selectedClass: TeacherClasse | null
  selectedClassId: string | null
  selectClass: (classId: string) => void
  loading: boolean
  loadError: string | null
  teacherName: string
  hasMultipleClasses: boolean
  isEmpty: boolean
}

const TeacherClassContext = createContext<TeacherClassContextValue | null>(null)

type EnseignantClasseRow = {
  enseignant?: {
    utilisateur?: { id?: string; prenom?: string; nom?: string; email?: string }
  }
}

async function resolveTeacherNameFromRaw(rawClasses: unknown[]): Promise<string> {
  const myUserId = await readJwtUserId()
  for (const cls of rawClasses) {
    const enseignants =
      (cls as { enseignants?: EnseignantClasseRow[] }).enseignants ?? []
    const myEnseignant = enseignants.find(
      ec => ec.enseignant?.utilisateur?.id === myUserId,
    )
    const u = myEnseignant?.enseignant?.utilisateur
    if (u) {
      const name = [u.prenom, u.nom].filter(Boolean).join(" ").trim()
      return name || u.email || ""
    }
  }
  return readJwtEmail()
}

export function TeacherClassProvider({ children }: { children: ReactNode }) {
  const [classes, setClasses] = useState<TeacherClasse[]>([])
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [teacherName, setTeacherName] = useState("")

  const loadClasses = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const res = await apiClient.listClasses()
      const rawList = Array.isArray(res.data?.data)
        ? res.data.data
        : Array.isArray(res.data)
          ? res.data
          : []
      const parsed = parseTeacherClassesFromApi(res.data)
      if (!parsed.length) {
        setClasses([])
        setSelectedClassId(null)
        setTeacherName(await resolveTeacherNameFromRaw(rawList))
        return
      }
      setClasses(parsed)
      setTeacherName(await resolveTeacherNameFromRaw(rawList))
      setSelectedClassId(prev => {
        const ids = parsed.map(c => c.id)
        if (prev && ids.includes(prev)) return prev
        return resolveInitialClassId(ids)
      })
    } catch {
      setClasses([])
      setSelectedClassId(null)
      setLoadError("load_failed")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadClasses()
  }, [loadClasses])

  const selectClass = useCallback(
    (classId: string) => {
      if (!classes.some(c => c.id === classId)) return
      setSelectedClassId(classId)
      persistTeacherClassId(classId)
    },
    [classes],
  )

  const selectedClass = useMemo(
    () => classes.find(c => c.id === selectedClassId) ?? null,
    [classes, selectedClassId],
  )

  const value = useMemo<TeacherClassContextValue>(
    () => ({
      classes,
      selectedClass,
      selectedClassId,
      selectClass,
      loading,
      loadError,
      teacherName,
      hasMultipleClasses: classes.length > 1,
      isEmpty: !loading && classes.length === 0,
    }),
    [classes, selectedClass, selectedClassId, selectClass, loading, loadError, teacherName],
  )

  return <TeacherClassContext.Provider value={value}>{children}</TeacherClassContext.Provider>
}

export function useTeacherClass(): TeacherClassContextValue {
  const ctx = useContext(TeacherClassContext)
  if (!ctx) {
    throw new Error("useTeacherClass must be used within TeacherClassProvider")
  }
  return ctx
}
