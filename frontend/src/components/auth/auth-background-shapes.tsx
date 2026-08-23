/** Soft ambient blobs for auth pages — purely visual, hidden from assistive tech. */
export function AuthBackgroundShapes() {
  return (
    <div className="auth-shapes pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="auth-blob auth-blob-violet auth-blob-1" />
      <div className="auth-blob auth-blob-violet-soft auth-blob-2" />
      <div className="auth-blob auth-blob-indigo auth-blob-3" />
    </div>
  )
}
