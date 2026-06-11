import { NextResponse } from "next/server";
import {
  applyAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromCookies,
} from "@/lib/auth/cookies.server";
import { resolveNestApiBaseUrl } from "@/lib/auth/constants";

export async function POST() {
  const refreshToken = await getRefreshTokenFromCookies();
  if (!refreshToken) {
    const res = NextResponse.json({ message: "Session expirée" }, { status: 401 });
    clearAuthCookies(res);
    return res;
  }

  const upstream = await fetch(`${resolveNestApiBaseUrl()}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    const res = NextResponse.json(data, { status: upstream.status });
    clearAuthCookies(res);
    return res;
  }

  const { accessToken, role, email, userId } = data as {
    accessToken?: string;
    role?: string;
    email?: string;
    userId?: string;
  };

  if (!accessToken) {
    const res = NextResponse.json({ message: "Refresh invalide" }, { status: 502 });
    clearAuthCookies(res);
    return res;
  }

  const res = NextResponse.json({ role, email, userId });
  applyAuthCookies(res, accessToken, refreshToken);
  return res;
}
