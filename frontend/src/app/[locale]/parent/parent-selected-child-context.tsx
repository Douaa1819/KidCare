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
import { PARENT_STORAGE_ENFANT_ID } from "./parent-child-selector"

type ParentSelectedChildContextValue = {
  selectedEnfantId: string
  setSelectedEnfantId: (id: string) => void
}

const ParentSelectedChildContext = createContext<ParentSelectedChildContextValue | null>(
  null,
)

/** Selected child id for the parent area — persisted in localStorage, never in the URL. */
export function ParentSelectedChildProvider({ children }: { children: ReactNode }) {
  const [selectedEnfantId, setSelectedEnfantIdState] = useState("")

  const setSelectedEnfantId = useCallback((id: string) => {
    if (!id) return
    setSelectedEnfantIdState(prev => (prev === id ? prev : id))
    try {
      localStorage.setItem(PARENT_STORAGE_ENFANT_ID, id)
    } catch {
      /* ignore */
    }
  }, [])

  const value = useMemo(
    () => ({ selectedEnfantId, setSelectedEnfantId }),
    [selectedEnfantId, setSelectedEnfantId],
  )

  return (
    <ParentSelectedChildContext.Provider value={value}>
      {children}
    </ParentSelectedChildContext.Provider>
  )
}

export function useParentSelectedChild(): ParentSelectedChildContextValue {
  const ctx = useContext(ParentSelectedChildContext)
  if (!ctx) {
    throw new Error("useParentSelectedChild must be used within ParentSelectedChildProvider")
  }
  return ctx
}

export function readStoredEnfantId(validIds: string[]): string {
  try {
    const saved = localStorage.getItem(PARENT_STORAGE_ENFANT_ID)
    if (saved && validIds.includes(saved)) return saved
  } catch {
    /* ignore */
  }
  return validIds[0] ?? ""
}
