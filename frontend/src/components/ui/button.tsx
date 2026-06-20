import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium",
    "ring-offset-background transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    "disabled:pointer-events-none disabled:opacity-50",
    "active:scale-[0.98]",
  ].join(" "),
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] focus-visible:ring-[var(--btn-primary-ring)]",
        primary:
          "bg-primary text-primary-foreground hover:bg-[var(--primary-hover)] active:bg-[var(--primary-active)] focus-visible:ring-[var(--btn-primary-ring)]",
        brand:
          "bg-accent text-accent-foreground hover:bg-[var(--accent-hover)] active:bg-[var(--accent-active)] focus-visible:ring-[var(--accent-ring)]",
        auth:
          "bg-[var(--auth-accent)] text-white hover:bg-[var(--auth-accent-hover)] active:brightness-95 focus-visible:ring-[var(--auth-accent-ring)] shadow-sm",
        success:
          "bg-secondary text-secondary-foreground hover:bg-[var(--secondary-hover)] active:bg-[var(--secondary-active)] focus-visible:ring-[var(--success-ring)]",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[var(--secondary-hover)] active:bg-[var(--secondary-active)] focus-visible:ring-[var(--btn-secondary-ring)]",
        warning:
          "bg-[var(--warning-soft)] text-[var(--warning-text)] border border-[var(--warning-border)] hover:brightness-95 focus-visible:ring-[var(--warning-ring)]",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-[var(--destructive-hover)] active:bg-[var(--destructive-active)] focus-visible:ring-[var(--destructive-ring)]",
        "destructive-outline":
          "border border-[var(--status-rejected-border)] bg-background text-[var(--status-rejected-text)] hover:bg-[var(--status-rejected-bg)] hover:border-[var(--destructive)] focus-visible:ring-[var(--destructive-ring)]",
        "warning-outline":
          "border border-[var(--warning-border)] bg-background text-[var(--warning-text)] hover:bg-[var(--warning-soft)] hover:border-[var(--warning-border)] focus-visible:ring-[var(--warning-ring)]",
        "info-outline":
          "border border-[var(--info-border)] bg-background text-[var(--info-text)] hover:bg-[var(--info-soft)] hover:border-[var(--info-border)] focus-visible:ring-[var(--info-ring)]",
        outline:
          "border border-border bg-background text-foreground hover:bg-[var(--btn-outline-hover-bg)] hover:border-[var(--btn-outline-hover-border)] focus-visible:ring-[var(--btn-outline-ring)]",
        ghost:
          "text-foreground hover:bg-[var(--btn-ghost-hover-bg)] focus-visible:ring-[var(--btn-ghost-ring)]",
        link:
          "text-[var(--info-text)] font-medium underline-offset-4 hover:text-[var(--status-progress-text)] hover:underline focus-visible:ring-[var(--info-ring)]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp className={cn(buttonVariants({ variant, size }), className)} ref={ref} {...props} />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
