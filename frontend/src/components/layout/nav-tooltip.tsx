"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function NavTooltip({
  label,
  show,
  children,
  className,
}: {
  label: string;
  show: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (!show) return <>{children}</>;

  return (
    <div className={cn("group relative", className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute top-1/2 z-[70] -translate-y-1/2 whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 start-full ms-2 rtl:start-auto rtl:end-full rtl:ms-0 rtl:me-2"
      >
        {label}
      </span>
    </div>
  );
}
