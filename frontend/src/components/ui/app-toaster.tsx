"use client"

import { Toaster } from "sonner"

/** Toaster global — à monter une fois dans le layout racine locale. */
export function AppToaster() {
  return (
    <Toaster
      position="top-center"
      richColors
      closeButton
      offset="4.5rem"
      toastOptions={{
        className: "text-sm shadow-md",
        duration: 4000,
      }}
    />
  )
}
