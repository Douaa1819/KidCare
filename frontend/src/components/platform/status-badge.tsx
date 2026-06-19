"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { USER_STATUS_BADGE_VARIANT } from "@/lib/design/status-badges";
import { cn } from "@/lib/utils";

type UserStatus = "ACTIVE" | "DISABLED" | "ARCHIVED" | "INVITED" | string;

export function StatusBadge({ status, className }: { status: UserStatus; className?: string }) {
  const t = useTranslations("platform.status");
  const key = String(status).toUpperCase();
  const known = ["ACTIVE", "DISABLED", "ARCHIVED", "INVITED", "BLOCKED"] as const;
  const label = (known as readonly string[]).includes(key)
    ? t(key as (typeof known)[number])
    : status;

  const variant = USER_STATUS_BADGE_VARIANT[key] ?? "neutral";

  return (
    <Badge variant={variant} className={cn("font-medium", className)}>
      {label}
    </Badge>
  );
}
