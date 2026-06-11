/**
 * Session côté client : aucun jeton en localStorage / cookies lisibles par JS.
 * Utiliser fetchSession() pour l’état (rôle, email) ou s’appuyer sur le middleware.
 */

export type ClientSession = {
  authenticated: boolean;
  role: string;
  email: string;
  userId: string;
};

const EMPTY_SESSION: ClientSession = {
  authenticated: false,
  role: "",
  email: "",
  userId: "",
};

let cachedSession: ClientSession | null = null;
let inflight: Promise<ClientSession> | null = null;

export async function fetchSession(force = false): Promise<ClientSession> {
  if (!force && cachedSession) return cachedSession;
  if (!force && inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch("/api/auth/session", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!res.ok) {
        cachedSession = EMPTY_SESSION;
        return EMPTY_SESSION;
      }
      const data = (await res.json()) as ClientSession;
      cachedSession = {
        authenticated: Boolean(data.authenticated),
        role: String(data.role ?? ""),
        email: String(data.email ?? ""),
        userId: String(data.userId ?? ""),
      };
      return cachedSession;
    } catch {
      cachedSession = EMPTY_SESSION;
      return EMPTY_SESSION;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function clearClientSessionCache(): void {
  cachedSession = null;
  inflight = null;
}

/** @deprecated Ne stocke plus de jetons côté client. */
export function setSessionTokens(_accessToken: string, _refreshToken?: string): void {
  /* no-op : cookies HttpOnly via /api/auth/* */
}

/** @deprecated */
export function clearSessionTokens(): void {
  clearClientSessionCache();
}

/** @deprecated Utiliser fetchSession(). */
export function getSessionSnapshot() {
  return {
    token: null as string | null,
    authToken: null as string | null,
    refreshToken: null as string | null,
    hasAnyToken: Boolean(cachedSession?.authenticated),
    accessTokensInSync: true,
  };
}

export async function logoutSession(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
  } catch {
    /* ignore */
  }
  clearClientSessionCache();
}
