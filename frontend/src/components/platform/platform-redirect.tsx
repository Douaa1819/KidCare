"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { withLocalePath } from "@/lib/i18n/locale-path";
import type { Locale } from "@/lib/i18n/config";

export function PlatformRedirect({ href }: { href: string }) {
  const router = useRouter();
  const params = useParams();
  const locale = (params?.locale ?? "fr") as Locale;

  useEffect(() => {
    router.replace(withLocalePath(locale, href));
  }, [router, locale, href]);

  return null;
}
