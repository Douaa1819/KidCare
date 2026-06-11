"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { readLocaleCookie } from "@/lib/locale-cookie";

/** Anciens liens / auth interceptors : même destination que `/{locale}` (formulaire de connexion). */
function loginHomeHref(): string {
  return `/${readLocaleCookie()}`;
}

export default function AuthLoginUserFallbackPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace(loginHomeHref());
  }, [router]);

  return null;
}
