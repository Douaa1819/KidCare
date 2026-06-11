import type { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  ACCESS_COOKIE,
  LEGACY_ACCESS_COOKIES,
  LEGACY_REFRESH_COOKIE,
  REFRESH_COOKIE,
} from "./constants";

const SEVEN_DAYS = 7 * 24 * 60 * 60;
const FIFTEEN_MIN = 15 * 60;

function cookieBase() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true as const,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
  };
}

export async function getAccessTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACCESS_COOKIE)?.value ?? null;
}

export async function getRefreshTokenFromCookies(): Promise<string | null> {
  const store = await cookies();
  return store.get(REFRESH_COOKIE)?.value ?? null;
}

export function applyAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken?: string,
): void {
  const base = cookieBase();
  response.cookies.set(ACCESS_COOKIE, accessToken, {
    ...base,
    maxAge: FIFTEEN_MIN,
  });
  if (refreshToken) {
    response.cookies.set(REFRESH_COOKIE, refreshToken, {
      ...base,
      maxAge: SEVEN_DAYS,
    });
  }
  for (const legacy of LEGACY_ACCESS_COOKIES) {
    response.cookies.set(legacy, "", { ...base, maxAge: 0 });
  }
  response.cookies.set(LEGACY_REFRESH_COOKIE, "", { ...base, maxAge: 0 });
}

export function clearAuthCookies(response: NextResponse): void {
  const base = cookieBase();
  response.cookies.set(ACCESS_COOKIE, "", { ...base, maxAge: 0 });
  response.cookies.set(REFRESH_COOKIE, "", { ...base, maxAge: 0 });
  for (const legacy of LEGACY_ACCESS_COOKIES) {
    response.cookies.set(legacy, "", { ...base, maxAge: 0 });
  }
  response.cookies.set(LEGACY_REFRESH_COOKIE, "", { ...base, maxAge: 0 });
}
