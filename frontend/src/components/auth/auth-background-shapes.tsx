/** Decorative soft shapes for auth pages — purely visual, hidden from assistive tech. */
export function AuthBackgroundShapes() {
  return (
    <div className="auth-shapes pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="auth-blob auth-blob-blue auth-blob-1" />
      <div className="auth-blob auth-blob-mint auth-blob-2" />
      <div className="auth-blob auth-blob-cream auth-blob-3" />
      <div className="auth-blob auth-blob-blue auth-blob-4" />
      <div className="auth-blob auth-blob-mint auth-blob-5" />
      <div className="auth-wave" />
    </div>
  )
}
