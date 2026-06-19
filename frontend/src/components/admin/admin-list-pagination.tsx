"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  className?: string;
};

export function AdminListPagination({
  page,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  className,
}: Props) {
  const t = useTranslations("platform.pagination");

  if (totalItems === 0) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);
  const pages = Math.max(1, totalPages);

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-border/60",
        className,
      )}
    >
      <p className="text-xs text-muted-foreground">
        {t("range", { from, to, total: totalItems })}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1 rounded-xl"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="w-4 h-4" aria-hidden />
          {t("prev")}
        </Button>
        <span className="text-xs text-muted-foreground min-w-[4.5rem] text-center font-medium">
          {t("pageOf", { page, pages })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1 rounded-xl"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          {t("next")}
          <ChevronRight className="w-4 h-4" aria-hidden />
        </Button>
      </div>
    </div>
  );
}
