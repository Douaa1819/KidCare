/** Cookies HttpOnly — jamais lus par le JavaScript client. */
export const ACCESS_COOKIE = "pp_access";
export const REFRESH_COOKIE = "pp_refresh";

/** Anciens noms (à effacer au login/logout). */
export const LEGACY_ACCESS_COOKIES = ["token", "auth_token"] as const;
export const LEGACY_REFRESH_COOKIE = "refresh_token";

export type AppRole = "ADMIN" | "SUPER_ADMIN" | "ENSEIGNANT" | "PARENT" | "";

export const PROTECTED_CACHE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
} as const;

export function resolveNestApiBaseUrl(): string {
  let raw = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000")
    .trim()
    .replace(/\/+$/, "");
  if (!raw.endsWith("/api")) raw = `${raw}/api`;
  raw = raw.replace(/\/api\/api(\/|$)/, "/api$1");
  return raw.replace(/\/+$/, "");
}
