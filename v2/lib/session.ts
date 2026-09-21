import "server-only";
import { cookies } from "next/headers";
import { SESSION_COOKIE, verificarToken, type SessionPayload } from "@/lib/auth";

/** Lê a sessão atual a partir do cookie httpOnly — só funciona em Server Components/Route Handlers. */
export async function sessaoAtual(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verificarToken(token);
}
