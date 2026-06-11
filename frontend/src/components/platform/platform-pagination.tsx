"use client";

import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function PlatformPagination({ page, pages, total, limit, onPageChange, className }: Props) {
  const t = useTranslations("platform.pagination");
  if (total === 0) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  return (
    <div className={cn("flex flex-col sm:flex-row items-center justify-between gap-3 pt-4", className)}>
      <p className="text-sm text-gray-500">{t("range", { from, to, total })}</p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" />
          {t("prev")}
        </Button>
        <span className="text-sm text-gray-600 min-w-[4rem] text-center">
          {t("pageOf", { page, pages: Math.max(pages, 1) })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("next")}
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
