interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

export default function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, index) => {
        const step = index + 1
        const isCompleted = step < currentStep
        const isCurrent = step === currentStep

        return (
          <div key={step} className="flex items-center gap-2">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                isCompleted
                  ? "bg-[var(--status-accepted-bg)] text-[var(--status-accepted-text)] ring-2 ring-[var(--status-accepted-border)]"
                  : isCurrent
                    ? "bg-[var(--status-progress-bg)] text-[var(--status-progress-text)] shadow-md ring-2 ring-[var(--status-progress-border)]"
                    : "bg-white/80 text-muted-foreground ring-1 ring-border"
              }`}
            >
              {isCompleted ? (
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              ) : (
                step
              )}
            </div>
            {step < totalSteps && (
              <div
                className={`w-8 sm:w-12 h-1 rounded-full ${
                  isCompleted ? "bg-[var(--status-accepted-border)]" : "bg-border"
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
