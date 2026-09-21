import { NextRequest, NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/session";
import { buscarProjetoPorSlug } from "@/lib/lancamentos";
import { buscarRelatorioGenerico } from "@/lib/relatorioGenerico";
import { mutate } from "@/lib/db";

async function projetoDaRequisicao(slug: string) {
  const sessao = await sessaoAtual();
  if (!sessao) return null;
  return buscarProjetoPorSlug(slug, sessao.id, sessao.papel);
}

export async function POST(req: NextRequest) {
  const { projetoSlug, nome, coluna, operador, valor } = await req.json();
  const projeto = await projetoDaRequisicao(projetoSlug);
  if (!projeto) return NextResponse.json({ erro: "Projeto indisponivel" }, { status: 404 });
  const relatorio = await buscarRelatorioGenerico(projeto.id);
  if (!relatorio?.colunas.some((c) => c.nome === coluna) || !["maior", "menor", "igual"].includes(operador) ||
      typeof nome !== "string" || !nome.trim() || nome.length > 120 || typeof valor !== "string" || !valor.trim() || valor.length > 255 ||
      (operador !== "igual" && !Number.isFinite(Number(valor.replace(",", "."))))) {
    return NextResponse.json({ erro: "Revise os dados da regra" }, { status: 400 });
  }
  await mutate("INSERT INTO regras_alerta (projeto_id, nome, coluna, operador, valor) VALUES (?, ?, ?, ?, ?)", [projeto.id, nome.trim(), coluna, operador, valor.trim()]);
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const { projetoSlug, id } = await req.json();
  const projeto = await projetoDaRequisicao(projetoSlug);
  if (!projeto) return NextResponse.json({ erro: "Projeto indisponivel" }, { status: 404 });
  if (!Number.isInteger(id)) return NextResponse.json({ erro: "Regra invalida" }, { status: 400 });
  const resultado = await mutate("DELETE FROM regras_alerta WHERE id = ? AND projeto_id = ?", [id, projeto.id]);
  return NextResponse.json({ ok: resultado.affectedRows > 0 });
}
