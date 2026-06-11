import type { AppRole } from "./constants";

export type JwtPayloadLite = {
  role?: string;
  userId?: string;
  email?: string;
  sub?: string;
  typ?: string;
  exp?: number;
};

export function decodeJwtPayload(token?: string | null): JwtPayloadLite | null {
  if (!token) return null;
  try {
    const payloadPart = token.split(".")[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4 ? "=".repeat(4 - (base64.length % 4)) : "";
    return JSON.parse(atob(base64 + pad)) as JwtPayloadLite;
  } catch {
    return null;
  }
}

export function normalizeAppRole(raw?: string | null): AppRole {
  const role = String(raw ?? "").toUpperCase();
  if (
    role === "ADMIN" ||
    role === "SUPER_ADMIN" ||
    role === "ENSEIGNANT" ||
    role === "PARENT"
  ) {
    return role;
  }
  return "";
}

export function readRoleFromAccessToken(token?: string | null): AppRole {
  return normalizeAppRole(decodeJwtPayload(token)?.role);
}

export function dashboardPathForRole(locale: string, role: AppRole): string {
  if (role === "ADMIN" || role === "SUPER_ADMIN") return `/${locale}/admin`;
  if (role === "ENSEIGNANT") return `/${locale}/teacher`;
  if (role === "PARENT") return `/${locale}/parent`;
  return `/${locale}`;
}

export function canAccessDashboardSegment(role: AppRole, segment: string): boolean {
  if (segment === "admin") return role === "ADMIN" || role === "SUPER_ADMIN";
  if (segment === "teacher") return role === "ENSEIGNANT";
  if (segment === "parent") return role === "PARENT";
  return false;
}

/** Routes /admin/platform/* réservées au Super Admin */
export function canAccessPlatformAdmin(role: AppRole): boolean {
  return role === "SUPER_ADMIN";
}
