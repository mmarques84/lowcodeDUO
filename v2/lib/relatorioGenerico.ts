import "server-only";
import { query } from "@/lib/db";

export type ColunaDetectada = { nome: string; tipo: string };
export type RelatorioGenerico = {
  colunas: ColunaDetectada[];
  linhas: Record<string, unknown>[];
};

export async function buscarRelatorioGenerico(projetoId: number): Promise<RelatorioGenerico | null> {
  const colunas = await query<{ nome_coluna: string; tipo_inferido: string }>(
    `SELECT nome_coluna, tipo_inferido FROM colunas_detectadas
     WHERE importacao_id = (SELECT id FROM importacoes WHERE projeto_id = ? ORDER BY id DESC LIMIT 1)
     ORDER BY ordem`,
    [projetoId]
  );
  if (colunas.length === 0) return null;

  const linhas = await query<{ linha_json: string | Record<string, unknown> }>(
    `SELECT linha_json FROM dados_importados
     WHERE importacao_id = (SELECT id FROM importacoes WHERE projeto_id = ? ORDER BY id DESC LIMIT 1)`,
    [projetoId]
  );

  return {
    colunas: colunas.map((c) => ({ nome: c.nome_coluna, tipo: c.tipo_inferido })),
    linhas: linhas.map((l) =>
      typeof l.linha_json === "string" ? JSON.parse(l.linha_json) : l.linha_json
    ),
  };
}
