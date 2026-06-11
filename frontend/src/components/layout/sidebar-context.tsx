"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

export const SIDEBAR_COLLAPSED_STORAGE_KEY = "petitspas.sidebar.collapsed";

type SidebarContextValue = {
  collapsed: boolean;
  toggleCollapsed: () => void;
  setCollapsed: (value: boolean) => void;
  mainOffsetClass: string;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

function readStoredCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsedState] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setCollapsedState(readStoredCollapsed());
    setHydrated(true);
  }, []);

  const setCollapsed = useCallback((value: boolean) => {
    setCollapsedState(value);
    try {
      window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, value ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleCollapsed = useCallback(() => {
    setCollapsed(!collapsed);
  }, [collapsed, setCollapsed]);

  const mainOffsetClass = collapsed ? "md:ms-16" : "md:ms-64";

  const value = useMemo(
    () => ({
      collapsed: hydrated ? collapsed : false,
      toggleCollapsed,
      setCollapsed,
      mainOffsetClass: hydrated ? mainOffsetClass : "md:ms-64",
    }),
    [collapsed, hydrated, mainOffsetClass, setCollapsed, toggleCollapsed],
  );

  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) {
    throw new Error("useSidebar must be used within SidebarProvider");
  }
  return ctx;
}

export function useSidebarOptional() {
  return useContext(SidebarContext);
}

export function AdminMainContent({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  const ctx = useSidebarOptional();
  const offset = ctx?.mainOffsetClass ?? "md:ms-64";

  return (
    <div
      className={cn(
        "flex-1 min-w-0 transition-[margin] duration-300 ease-in-out",
        offset,
        className,
      )}
    >
      {children}
    </div>
  );
}
