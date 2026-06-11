import { fetchSession } from "@/lib/auth-session"

export async function readJwtUserId(): Promise<string> {
  const session = await fetchSession()
  return session.authenticated ? session.userId : ""
}

export async function readJwtEmail(): Promise<string> {
  const session = await fetchSession()
  return session.authenticated ? session.email : ""
}
