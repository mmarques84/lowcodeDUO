import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verificarToken } from "@/lib/auth";

// Roda ANTES de qualquer página renderizar — por isso o F5 nunca "pisca" pro
// login: o servidor já sabe quem é o usuário pelo cookie antes de montar a
// tela, diferente da v1 (sessionStorage + JS decidindo depois que a página já carregou).
const CAMINHOS_PUBLICOS = ["/login"];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (CAMINHOS_PUBLICOS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const sessao = token ? await verificarToken(token) : null;

  if (!sessao) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("proximo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|api/cron|_next/static|_next/image|favicon.ico).*)"],
};
