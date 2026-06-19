"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export function ProfileField({
  icon: Icon,
  label,
  value,
  multiline,
}: {
  icon?: LucideIcon;
  label: string;
  value?: ReactNode;
  multiline?: boolean;
}) {
  const empty = value == null || value === "" || value === "—";

  return (
    <div className="flex justify-between gap-4 py-2.5 border-b border-border/50 last:border-0">
      <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1.5">
        {Icon ? <Icon className="w-3.5 h-3.5 opacity-70" aria-hidden /> : null}
        {label}
      </span>
      <span
        className={`text-sm font-medium text-right max-w-[65%] break-words ${
          multiline ? "whitespace-pre-line" : ""
        } ${empty ? "text-muted-foreground/70 italic" : "text-foreground"}`}
      >
        {empty ? "—" : value}
      </span>
    </div>
  );
}

export function ProfileSectionTitle({
  icon: Icon,
  children,
  action,
}: {
  icon: LucideIcon;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-border/60">
      <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
        <span className="w-8 h-8 rounded-lg bg-[var(--primary-light)] border border-[var(--status-progress-border)] flex items-center justify-center shrink-0">
          <Icon className="w-4 h-4 text-[var(--status-progress-text)]" aria-hidden />
        </span>
        <span className="uppercase tracking-wide text-xs text-muted-foreground">{children}</span>
      </h2>
      {action}
    </div>
  );
}
