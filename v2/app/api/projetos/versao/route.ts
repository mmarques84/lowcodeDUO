import { NextRequest, NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/session";
import { buscarProjetoPorSlug } from "@/lib/lancamentos";
import { query } from "@/lib/db";
import { isDashboardSnapshot } from "@/lib/dashboardSnapshot";

export async function GET(req: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const projetoSlug = req.nextUrl.searchParams.get("projetoSlug");
  const versao = Number(req.nextUrl.searchParams.get("versao"));
  if (!projetoSlug || !Number.isInteger(versao) || versao < 1) {
    return NextResponse.json({ erro: "Pedido inválido" }, { status: 400 });
  }
  const projeto = await buscarProjetoPorSlug(projetoSlug, sessao.id, sessao.papel);
  if (!projeto) return NextResponse.json({ erro: "Projeto não encontrado" }, { status: 404 });

  const rows = await query<{ snapshot_json: string | object | null }>(
    `SELECT snapshot_json FROM historico_versoes WHERE projeto_id = ? AND versao = ?`,
    [projeto.id, versao]
  );
  const bruto = rows[0]?.snapshot_json;
  const snapshot = typeof bruto === "string" ? JSON.parse(bruto) : bruto;
  if (!isDashboardSnapshot(snapshot)) {
    return NextResponse.json({ erro: "Essa versão não tem uma prévia disponível." }, { status: 404 });
  }
  return NextResponse.json({ snapshot });
}
