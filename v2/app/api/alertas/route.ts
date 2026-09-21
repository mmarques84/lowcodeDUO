import { NextRequest, NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/session";
import { buscarProjetoPorSlug } from "@/lib/lancamentos";
import { mutate } from "@/lib/db";

export async function PATCH(req: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Nao autenticado" }, { status: 401 });
  const { projetoSlug, id } = await req.json();
  const projeto = await buscarProjetoPorSlug(projetoSlug, sessao.id, sessao.papel);
  if (!projeto) return NextResponse.json({ erro: "Projeto nao encontrado" }, { status: 404 });
  if (!Number.isInteger(id)) return NextResponse.json({ erro: "Alerta invalido" }, { status: 400 });
  const resultado = await mutate("UPDATE alertas SET status = 'resolvido', resolvido_em = NOW() WHERE id = ? AND projeto_id = ?", [id, projeto.id]);
  return NextResponse.json({ ok: resultado.affectedRows > 0 });
}
