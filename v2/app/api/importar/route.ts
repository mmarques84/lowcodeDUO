import { NextRequest, NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/session";
import { buscarProjetoPorSlug } from "@/lib/lancamentos";
import { mutate, query } from "@/lib/db";
import { registrarVersao } from "@/lib/historicoVersoes";
import { analisarQualidade } from "@/lib/qualidadePlanilha";
import { atualizarAlertasImportacao } from "@/lib/alertas";

type ColunaEntrada = { nome: string; tipo?: string };

export async function POST(req: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { projetoSlug, arquivoOriginal, colunas, linhas } = body ?? {};

  if (!projetoSlug || !Array.isArray(colunas) || !Array.isArray(linhas) || colunas.length === 0) {
    return NextResponse.json({ erro: "Dados de importação inválidos" }, { status: 400 });
  }

  const projeto = await buscarProjetoPorSlug(projetoSlug, sessao.id, sessao.papel);
  if (!projeto) return NextResponse.json({ erro: "Projeto não encontrado" }, { status: 404 });

  const anteriores = await query<{ nome_coluna: string }>(
    `SELECT nome_coluna FROM colunas_detectadas WHERE importacao_id =
     (SELECT id FROM importacoes WHERE projeto_id = ? ORDER BY id DESC LIMIT 1)`,
    [projeto.id]
  );
  const achados = analisarQualidade(colunas, linhas, anteriores.map((c) => c.nome_coluna));

  const importacao = await mutate(
    `INSERT INTO importacoes (projeto_id, arquivo_original, importado_por, status) VALUES (?, ?, ?, 'ok')`,
    [projeto.id, arquivoOriginal ?? "", sessao.nome]
  );
  const importacaoId = importacao.insertId;

  for (const [i, c] of (colunas as ColunaEntrada[]).entries()) {
    await mutate(
      `INSERT INTO colunas_detectadas (projeto_id, importacao_id, nome_coluna, tipo_inferido, ordem) VALUES (?, ?, ?, ?, ?)`,
      [projeto.id, importacaoId, c.nome, c.tipo ?? "texto", i]
    );
  }

  for (const linha of linhas as Record<string, unknown>[]) {
    await mutate(
      `INSERT INTO dados_importados (projeto_id, importacao_id, linha_json) VALUES (?, ?, ?)`,
      [projeto.id, importacaoId, JSON.stringify(linha)]
    );
  }

  await mutate(`UPDATE projetos SET versao = versao + 1, publicado = 1 WHERE id = ?`, [projeto.id]);
  await registrarVersao(projeto.id, "importacao", `Planilha importada: ${String(arquivoOriginal || "sem nome")}`);

  await atualizarAlertasImportacao(projeto.id, achados, linhas);
  return NextResponse.json({ ok: true, importacaoId, achados }, { status: 201 });
}
