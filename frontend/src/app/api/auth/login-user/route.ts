import { NextRequest, NextResponse } from "next/server";
import { applyAuthCookies } from "@/lib/auth/cookies.server";
import { fetchNestApi } from "@/lib/auth/fetch-nest-api.server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.email || !body?.password) {
    return NextResponse.json({ message: "Email et mot de passe requis" }, { status: 400 });
  }

  const upstream = await fetchNestApi("/auth/login-user", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const data = await upstream.json().catch(() => ({}));
  if (!upstream.ok) {
    return NextResponse.json(data, { status: upstream.status });
  }

  const { accessToken, refreshToken, role, email, userId } = data as {
    accessToken?: string;
    refreshToken?: string;
    role?: string;
    email?: string;
    userId?: string;
  };

  if (!accessToken) {
    return NextResponse.json(
      { code: "SERVER_ERROR", message: "Réponse serveur invalide" },
      { status: 502 },
    );
  }

  const res = NextResponse.json({
    role,
    email,
    userId,
  });
  applyAuthCookies(res, accessToken, refreshToken);
  return res;
}
