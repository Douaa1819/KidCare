"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { CheckCircle2, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthShell } from "@/components/auth/auth-shell";
import type { Locale } from "@/lib/i18n/config";

export default function SuccessScreen() {
  const t = useTranslations("registration.success");
  const pathname = usePathname();
  const locale: Locale = pathname?.startsWith("/ar") ? "ar" : "fr";

  return (
    <AuthShell locale={locale} title={t("title")} subtitle={t("subtitle")} maxWidth="md" bareContent>
      <div className="auth-card relative w-full overflow-hidden text-center space-y-5">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          {[
            { left: "12%", delay: "0s", color: "bg-[#C4B5FD]" },
            { left: "28%", delay: "0.15s", color: "bg-[#b8e986]" },
            { left: "44%", delay: "0.3s", color: "bg-[#eef8fc]" },
            { left: "60%", delay: "0.1s", color: "bg-[#C4B5FD]/70" },
            { left: "76%", delay: "0.25s", color: "bg-[#b8e986]/70" },
            { left: "88%", delay: "0.05s", color: "bg-[#dff0fa]" },
          ].map((piece, i) => (
            <span
              key={i}
              className={`absolute top-0 h-2 w-2 rounded-full opacity-0 animate-[confetti-fall_1.2s_ease-out_forwards] ${piece.color}`}
              style={{ left: piece.left, animationDelay: piece.delay }}
            />
          ))}
        </div>

        <div className="relative mx-auto w-16 h-16 rounded-full pp-surface-success border flex items-center justify-center animate-[success-pop_0.5s_ease-out]">
          <CheckCircle2 className="w-9 h-9 text-[var(--status-accepted-text)] animate-[success-check_0.6s_ease-out_0.15s_both]" aria-hidden />
        </div>

        <div className="relative space-y-2">
          <p className="text-base sm:text-lg font-semibold text-[var(--auth-text)]">{t("congratulations")}</p>
          <p className="text-sm text-[var(--auth-text-muted)] leading-relaxed">{t("message")}</p>
        </div>

        <div className="relative rounded-xl pp-surface-success border p-4 text-start space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--status-accepted-text)]">{t("nextStepsTitle")}</p>
          <ul className="space-y-2 text-sm text-[var(--auth-text)]">
            <li className="flex items-start gap-2">
              <Clock className="h-4 w-4 mt-0.5 shrink-0 text-[var(--status-accepted-text)]" aria-hidden />
              <span>{t("nextStepReview")}</span>
            </li>
            <li className="flex items-start gap-2">
              <Mail className="h-4 w-4 mt-0.5 shrink-0 text-[var(--status-progress-text)]" aria-hidden />
              <span>{t("nextStepEmail")}</span>
            </li>
          </ul>
        </div>

        <Button asChild variant="auth" className="relative w-full mt-1 font-semibold">
          <Link href={`/${locale}`}>{t("backToLogin")}</Link>
        </Button>
      </div>
    </AuthShell>
  );
}
