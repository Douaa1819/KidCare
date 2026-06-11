import { NextRequest, NextResponse } from "next/server"
import { resolveNestApiBaseUrl } from "@/lib/auth/constants"

function resolvePublicAppUrl(req: NextRequest): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (fromEnv) {
    try {
      return new URL(fromEnv).origin
    } catch {
      /* continue */
    }
  }
  const origin = req.headers.get("origin")?.trim()
  if (origin) {
    try {
      return new URL(origin).origin
    } catch {
      /* continue */
    }
  }
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host")
  const proto = req.headers.get("x-forwarded-proto") ?? "http"
  if (host) {
    return `${proto}://${host}`
  }
  return "http://localhost:3001"
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body?.email) {
    return NextResponse.json({ message: "Email requis" }, { status: 400 })
  }

  const appUrl = resolvePublicAppUrl(req)

  const upstream = await fetch(`${resolveNestApiBaseUrl()}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: body.email,
      locale: body.locale ?? "fr",
      appUrl,
    }),
  })

  const data = await upstream.json().catch(() => ({}))
  return NextResponse.json(data, { status: upstream.status })
}
