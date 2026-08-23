import { resolveNestApiBaseUrl } from "@/lib/auth/constants";

const UNAVAILABLE_BODY = {
  code: "SERVER_ERROR",
  message: "Le serveur API est indisponible. Démarrez le backend (port 10000).",
} as const;

/** Appelle l'API Nest ; renvoie 503 si le serveur est injoignable. */
export async function fetchNestApi(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${resolveNestApiBaseUrl()}${path}`, init);
  } catch {
    return Response.json(UNAVAILABLE_BODY, { status: 503 });
  }
}
