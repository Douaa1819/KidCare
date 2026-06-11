import { NextResponse } from "next/server";
import { getAccessTokenFromCookies } from "@/lib/auth/cookies.server";
import { PROTECTED_CACHE_HEADERS } from "@/lib/auth/constants";
import { decodeJwtPayload, normalizeAppRole } from "@/lib/auth/jwt-edge";

/** État de session sans exposer les jetons au client. */
export async function GET() {
  const token = await getAccessTokenFromCookies();
  if (!token) {
    return NextResponse.json(
      { authenticated: false, role: "", email: "", userId: "" },
      { headers: PROTECTED_CACHE_HEADERS },
    );
  }

  const payload = decodeJwtPayload(token);
  const role = normalizeAppRole(payload?.role);
  if (!role) {
    return NextResponse.json(
      { authenticated: false, role: "", email: "", userId: "" },
      { headers: PROTECTED_CACHE_HEADERS },
    );
  }

  return NextResponse.json(
    {
      authenticated: true,
      role,
      email: String(payload?.email ?? ""),
      userId: String(payload?.userId ?? payload?.sub ?? ""),
    },
    { headers: PROTECTED_CACHE_HEADERS },
  );
}
