import { fetchSession } from "@/lib/auth-session";
import { normalizeAppRole } from "@/lib/auth/jwt-edge";

/** Rôle depuis la session serveur (sans décoder de JWT côté client). */
export async function readJwtRoleAsync(): Promise<string> {
  const session = await fetchSession();
  return session.authenticated ? session.role : "";
}

/** Lecture synchrone du cache session (vide tant que fetchSession n’a pas été appelé). */
export function readJwtRole(): string {
  return "";
}

export function readJwtPayload(): null {
  return null;
}

export function readJwtRoleFromSession(role: string | undefined | null): string {
  return normalizeAppRole(role);
}
