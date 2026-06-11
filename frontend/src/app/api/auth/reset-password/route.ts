import { NextRequest, NextResponse } from "next/server"
import { resolveNestApiBaseUrl } from "@/lib/auth/constants"

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.token || !body?.newPassword || !body?.confirmPassword) {
    return NextResponse.json(
      { message: "Jeton et mots de passe requis" },
      { status: 400 },
    )
  }

  const upstream = await fetch(`${resolveNestApiBaseUrl()}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })

  const data = await upstream.json().catch(() => ({}))
  return NextResponse.json(data, { status: upstream.status })
}
