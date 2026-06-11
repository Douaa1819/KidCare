"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type UserStatus = "ACTIVE" | "DISABLED" | "ARCHIVED" | "INVITED" | string;

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  DISABLED: "bg-orange-100 text-orange-800 border-orange-200",
  ARCHIVED: "bg-gray-100 text-gray-600 border-gray-200",
  INVITED: "bg-blue-100 text-blue-800 border-blue-200",
  BLOCKED: "bg-red-100 text-red-800 border-red-200",
};

export function StatusBadge({ status, className }: { status: UserStatus; className?: string }) {
  const t = useTranslations("platform.status");
  const key = String(status).toUpperCase();
  const known = ["ACTIVE", "DISABLED", "ARCHIVED", "INVITED", "BLOCKED"] as const;
  const label = (known as readonly string[]).includes(key)
    ? t(key as (typeof known)[number])
    : status;

  return (
    <Badge
      variant="outline"
      className={cn("font-medium", STATUS_STYLES[key] ?? STATUS_STYLES.ARCHIVED, className)}
    >
      {label}
    </Badge>
  );
}
