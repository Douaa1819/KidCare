"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { fetchSession } from "@/lib/auth-session";
import { normalizeAppRole } from "@/lib/auth/jwt-edge";

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/";
  const [ready, setReady] = useState(false);
  const t = useTranslations("common");

  useEffect(() => {
    let cancelled = false;
    void fetchSession().then((session) => {
      if (cancelled) return;
      const locale = pathname.split("/").filter(Boolean)[0] || "fr";
      if (!session.authenticated) {
        router.replace(`/${locale}`);
        return;
      }
      if (normalizeAppRole(session.role) !== "SUPER_ADMIN") {
        router.replace(`/${locale}/admin`);
        return;
      }
      setReady(true);
    });
    return () => { cancelled = true; };
  }, [pathname, router]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-muted-foreground">{t("loading")}</p>
      </div>
    );
  }

  return <>{children}</>;
}
