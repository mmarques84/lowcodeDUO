import { NextRequest, NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/session";
import { buscarProjetoPorSlug } from "@/lib/lancamentos";
import { getPool } from "@/lib/db";
import { buscarRelatorioGenerico } from "@/lib/relatorioGenerico";
import { analisarQualidade } from "@/lib/qualidadePlanilha";
import { atualizarAlertasImportacao } from "@/lib/alertas";

type ColunaEntrada = { nome: string; tipo?: string };

export async function POST(req: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { projetoSlug, arquivoOriginal, colunas, linhas, modo = "substituir" } = body ?? {};

  if (!projetoSlug || !Array.isArray(colunas) || !Array.isArray(linhas) || colunas.length === 0 || !["substituir", "acrescentar"].includes(modo)) {
    return NextResponse.json({ erro: "Dados de importação inválidos" }, { status: 400 });
  }

  const projeto = await buscarProjetoPorSlug(projetoSlug, sessao.id, sessao.papel);
  if (!projeto) return NextResponse.json({ erro: "Projeto não encontrado" }, { status: 404 });

  const anterior = await buscarRelatorioGenerico(projeto.id);
  const nomesNovos = (colunas as ColunaEntrada[]).map((c) => c.nome);
  if (modo === "acrescentar" && anterior &&
      (anterior.colunas.length !== nomesNovos.length || anterior.colunas.some((c) => !nomesNovos.includes(c.nome)))) {
    return NextResponse.json({ erro: "As colunas precisam corresponder a planilha atual para acrescentar linhas." }, { status: 400 });
  }
  const linhasFinais = modo === "acrescentar" && anterior ? [...anterior.linhas, ...linhas] : linhas;
  const achados = analisarQualidade(colunas, linhasFinais, anterior?.colunas.map((c) => c.nome) ?? []);
  const conexao = await getPool().getConnection();
  let importacaoId = 0;
  try {
    await conexao.beginTransaction();
    const [importacao] = await conexao.execute<import("mysql2/promise").ResultSetHeader>(
      `INSERT INTO importacoes (projeto_id, arquivo_original, importado_por, status) VALUES (?, ?, ?, 'ok')`,
      [projeto.id, String(arquivoOriginal ?? ""), sessao.nome]
    );
    importacaoId = importacao.insertId;
    for (const [i, c] of (colunas as ColunaEntrada[]).entries()) {
      await conexao.execute(
        `INSERT INTO colunas_detectadas (projeto_id, importacao_id, nome_coluna, tipo_inferido, ordem) VALUES (?, ?, ?, ?, ?)`,
        [projeto.id, importacaoId, c.nome, c.tipo ?? "texto", i]
      );
    }
    for (const linha of linhasFinais as Record<string, unknown>[]) {
      await conexao.execute(
        `INSERT INTO dados_importados (projeto_id, importacao_id, linha_json) VALUES (?, ?, ?)`,
        [projeto.id, importacaoId, JSON.stringify(linha)]
      );
    }
    await conexao.execute(`UPDATE projetos SET versao = versao + 1, publicado = 1 WHERE id = ?`, [projeto.id]);
    await conexao.execute(
      `INSERT INTO historico_versoes (projeto_id, versao, tipo, descricao)
       SELECT id, versao, 'importacao', ? FROM projetos WHERE id = ?`,
      [`${modo === "acrescentar" ? "Linhas acrescentadas" : "Planilha substituida"}: ${String(arquivoOriginal || "sem nome")}`.slice(0, 255), projeto.id]
    );
    await conexao.commit();
  } catch (erro) {
    await conexao.rollback();
    throw erro;
  } finally {
    conexao.release();
  }
  await atualizarAlertasImportacao(projeto.id, achados, linhasFinais);
  return NextResponse.json({ ok: true, importacaoId, achados, total: linhasFinais.length }, { status: 201 });
}
