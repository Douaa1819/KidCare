import { NextResponse } from "next/server";
import {
  applyAuthCookies,
  clearAuthCookies,
  getAccessTokenFromCookies,
  getRefreshTokenFromCookies,
} from "@/lib/auth/cookies.server";
import { resolveNestApiBaseUrl } from "@/lib/auth/constants";

export async function POST() {
  const accessToken = await getAccessTokenFromCookies();
  const refreshToken = await getRefreshTokenFromCookies();

  if (accessToken) {
    try {
      await fetch(`${resolveNestApiBaseUrl()}/auth/logout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(refreshToken ? { refreshToken } : {}),
      });
    } catch {
      /* invalide côté serveur si l’API est indisponible — on efface quand même les cookies */
    }
  }

  const res = NextResponse.json({ ok: true });
  clearAuthCookies(res);
  return res;
}
