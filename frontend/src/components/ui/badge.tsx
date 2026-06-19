import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground",
        primary:
          "border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] text-[var(--status-progress-text)]",
        secondary:
          "border-[var(--status-accepted-border)] bg-[var(--status-accepted-bg)] text-[var(--status-accepted-text)]",
        accent:
          "border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] text-[var(--status-rejected-text)]",
        review:
          "border-[var(--status-review-border)] bg-[var(--status-review-bg)] text-[var(--status-review-text)]",
        progress:
          "border-[var(--status-progress-border)] bg-[var(--status-progress-bg)] text-[var(--status-progress-text)]",
        accepted:
          "border-[var(--status-accepted-border)] bg-[var(--status-accepted-bg)] text-[var(--status-accepted-text)]",
        rejected:
          "border-[var(--status-rejected-border)] bg-[var(--status-rejected-bg)] text-[var(--status-rejected-text)]",
        present:
          "border-[var(--status-present-border)] bg-[var(--status-present-bg)] text-[var(--status-present-text)]",
        neutral:
          "border-[var(--status-neutral-border)] bg-[var(--status-neutral-bg)] text-[var(--status-neutral-text)]",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-border text-foreground bg-background",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
