import { NextRequest, NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/session";
import { buscarProjetoPorSlug } from "@/lib/lancamentos";
import { mutate } from "@/lib/db";
import { registrarVersao } from "@/lib/historicoVersoes";
import { isDashboardSnapshot } from "@/lib/dashboardSnapshot";

export async function POST(req: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { projetoSlug, resumo, snapshot } = body ?? {};
  if (!projetoSlug) return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  if (snapshot !== undefined && !isDashboardSnapshot(snapshot)) return NextResponse.json({ erro: "Layout inválido" }, { status: 400 });

  const projeto = await buscarProjetoPorSlug(projetoSlug, sessao.id, sessao.papel);
  if (!projeto) return NextResponse.json({ erro: "Projeto não encontrado" }, { status: 404 });

  await mutate(`UPDATE projetos SET versao = versao + 1, publicado = 1 WHERE id = ?`, [projeto.id]);
  await registrarVersao(projeto.id, "dashboard", typeof resumo === "string" && resumo.trim() ? resumo.trim() : "Dashboard atualizado", snapshot);

  return NextResponse.json({ ok: true });
}
