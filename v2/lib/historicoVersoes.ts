import "server-only";
import { mutate, query } from "@/lib/db";

export type VersaoHistorico = {
  versao: number;
  tipo: string;
  descricao: string;
  criado_em: string;
  recuperavel: number;
};

export async function registrarVersao(projetoId: number, tipo: string, descricao: string, snapshot?: unknown) {
  await mutate(
    `INSERT INTO historico_versoes (projeto_id, versao, tipo, descricao, snapshot_json)
     SELECT id, versao, ?, ?, ? FROM projetos WHERE id = ?`,
    [tipo, descricao.slice(0, 255), snapshot ? JSON.stringify(snapshot) : null, projetoId]
  );
}

export async function listarVersoes(projetoId: number): Promise<VersaoHistorico[]> {
  return query<VersaoHistorico>(
    `SELECT versao, tipo, descricao, criado_em, snapshot_json IS NOT NULL AS recuperavel FROM historico_versoes
     WHERE projeto_id = ? ORDER BY versao DESC`,
    [projetoId]
  );
}
