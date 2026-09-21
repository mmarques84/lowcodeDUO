import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verificarSenha } from "@/lib/password";
import { criarToken, SESSION_COOKIE, type Papel } from "@/lib/auth";

type UsuarioRow = {
  id: number;
  nome: string;
  email: string;
  senha_hash: string;
  papel: Papel;
  ativo: number;
};

const SETE_DIAS_EM_SEGUNDOS = 60 * 60 * 24 * 7;

export async function POST(req: NextRequest) {
  let body: { email?: string; senha?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "Corpo da requisição inválido." }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const senha = body.senha ?? "";
  if (!email || !senha) {
    return NextResponse.json({ ok: false, erro: "Informe e-mail e senha." }, { status: 400 });
  }

  const rows = await query<UsuarioRow>(
    "SELECT id, nome, email, senha_hash, papel, ativo FROM usuarios WHERE email = ? AND ativo = 1 LIMIT 1",
    [email]
  );
  const usuario = rows[0];

  if (!usuario || !verificarSenha(senha, usuario.senha_hash)) {
    return NextResponse.json({ ok: false, erro: "E-mail ou senha inválidos." }, { status: 401 });
  }

  const token = await criarToken({
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    papel: usuario.papel,
  });

  const res = NextResponse.json({
    ok: true,
    usuario: { id: usuario.id, nome: usuario.nome, email: usuario.email, papel: usuario.papel },
  });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SETE_DIAS_EM_SEGUNDOS,
  });
  return res;
}
