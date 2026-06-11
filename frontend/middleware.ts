import { NextRequest, NextResponse } from "next/server";
import {
  ACCESS_COOKIE,
  LEGACY_ACCESS_COOKIES,
  PROTECTED_CACHE_HEADERS,
} from "@/lib/auth/constants";
import {
  canAccessDashboardSegment,
  canAccessPlatformAdmin,
  dashboardPathForRole,
  readRoleFromAccessToken,
} from "@/lib/auth/jwt-edge";

const LOCALES = new Set(["fr", "ar"]);
/** Chemin interne réécrit par le middleware pour afficher la page 404 stylée. */
const NOT_FOUND_REWRITE_PATH = "__not-found__";
const DASHBOARD_SEGMENTS = new Set(["admin", "teacher", "parent"]);
const PUBLIC_LOCALE_SECTIONS = new Set([
  "inscriptions",
  "mot-de-passe-oublie",
  "reinitialiser-mot-de-passe",
]);

function readAccessToken(req: NextRequest): string | undefined {
  return (
    req.cookies.get(ACCESS_COOKIE)?.value ||
    LEGACY_ACCESS_COOKIES.map((n) => req.cookies.get(n)?.value).find(Boolean)
  );
}

function withNoStore(res: NextResponse): NextResponse {
  for (const [key, value] of Object.entries(PROTECTED_CACHE_HEADERS)) {
    res.headers.set(key, value);
  }
  return res;
}

function isLoginHome(pathname: string, segments: string[]): boolean {
  return segments.length === 1 && LOCALES.has(segments[0]);
}

function isAuthLegacyPath(pathname: string): boolean {
  return pathname === "/auth/login" || pathname === "/auth/login-user" || pathname.startsWith("/auth/");
}

function preferredLocale(req: NextRequest): string {
  const cookie = req.cookies.get("NEXT_LOCALE")?.value;
  return cookie && LOCALES.has(cookie) ? cookie : "fr";
}

/** URL sans préfixe fr/ar valide (ex. /parent, /en, /foo/bar) → page 404 PetitsPas. */
function rewriteToStyledNotFound(req: NextRequest): NextResponse {
  const loc = preferredLocale(req);
  const url = req.nextUrl.clone();
  url.pathname = `/${loc}/${NOT_FOUND_REWRITE_PATH}`;
  return NextResponse.rewrite(url, { status: 404 });
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const segments = pathname.split("/").filter(Boolean);

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const firstSegment = segments[0];
  if (firstSegment && !LOCALES.has(firstSegment) && !isAuthLegacyPath(pathname)) {
    return rewriteToStyledNotFound(req);
  }

  const token = readAccessToken(req);
  const role = readRoleFromAccessToken(token);
  const isAuthenticated = Boolean(token && role);

  const locale = segments[0];
  const hasLocale = LOCALES.has(locale);
  const section = hasLocale ? segments[1] : undefined;

  if (isAuthLegacyPath(pathname)) {
    if (isAuthenticated) {
      const loc =
        req.cookies.get("NEXT_LOCALE")?.value && LOCALES.has(req.cookies.get("NEXT_LOCALE")!.value)
          ? req.cookies.get("NEXT_LOCALE")!.value
          : "fr";
      return withNoStore(
        NextResponse.redirect(new URL(dashboardPathForRole(loc, role), req.url)),
      );
    }
    return NextResponse.next();
  }

  if (hasLocale && isLoginHome(pathname, segments)) {
    if (isAuthenticated) {
      return withNoStore(
        NextResponse.redirect(new URL(dashboardPathForRole(locale, role), req.url)),
      );
    }
    return NextResponse.next();
  }

  if (hasLocale && section && PUBLIC_LOCALE_SECTIONS.has(section)) {
    return NextResponse.next();
  }

  if (hasLocale && section && DASHBOARD_SEGMENTS.has(section)) {
    if (!isAuthenticated) {
      return withNoStore(NextResponse.redirect(new URL(`/${locale}`, req.url)));
    }
    if (!canAccessDashboardSegment(role, section)) {
      return withNoStore(
        NextResponse.redirect(new URL(dashboardPathForRole(locale, role), req.url)),
      );
    }
    const isPlatformRoute = segments[2] === "platform";
    if (isPlatformRoute && !canAccessPlatformAdmin(role)) {
      return withNoStore(
        NextResponse.redirect(new URL(`/${locale}/admin`, req.url)),
      );
    }
    return withNoStore(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
