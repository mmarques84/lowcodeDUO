import { NextRequest, NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/session";
import { buscarProjetoPorSlug } from "@/lib/lancamentos";
import { mutate, query } from "@/lib/db";
import { registrarVersao } from "@/lib/historicoVersoes";
import { isDashboardSnapshot } from "@/lib/dashboardSnapshot";

export async function POST(req: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { projetoSlug, versao } = await req.json();
  if (typeof projetoSlug !== "string" || !Number.isInteger(versao)) {
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
    return NextResponse.json({ erro: "Essa versão não tem um layout recuperável." }, { status: 400 });
  }

  await mutate(`UPDATE projetos SET versao = versao + 1, publicado = 1 WHERE id = ?`, [projeto.id]);
  await registrarVersao(projeto.id, "restauracao", `Layout restaurado da v${versao}`, snapshot);
  return NextResponse.json({ snapshot });
}
