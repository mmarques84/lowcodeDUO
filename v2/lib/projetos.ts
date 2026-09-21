import "server-only";
import { query } from "@/lib/db";
import type { Papel } from "@/lib/auth";

export type Projeto = {
  id: number;
  usuario_id: number;
  nome: string;
  slug: string;
  tipo: string;
  descricao: string | null;
  cor: string;
  versao: number;
  publicado: number;
  saldo: number;
  tem_lancamentos: number;
};

type ProjetoRow = Omit<Projeto, "saldo"> & { saldo: string | number };

/** Admin vê os projetos de todos os usuários; cliente só vê os próprios (mesma regra da v1). */
export async function listarProjetos(usuarioId: number, papel: Papel): Promise<Projeto[]> {
  const linhas = await query<ProjetoRow>(
    `SELECT p.id, p.usuario_id, p.nome, p.slug, p.tipo, p.descricao, p.cor, p.versao, p.publicado,
            COALESCE(s.saldo, 0) AS saldo, COALESCE(s.tem_lancamentos, 0) AS tem_lancamentos
     FROM projetos p
     LEFT JOIN (
       SELECT projeto_id,
              SUM(CASE WHEN tipo = 'entrada' THEN valor ELSE -valor END) AS saldo,
              COUNT(*) AS tem_lancamentos
       FROM lancamentos GROUP BY projeto_id
     ) s ON s.projeto_id = p.id
     WHERE (? = 'admin' OR p.usuario_id = ?)
     ORDER BY p.id`,
    [papel, usuarioId]
  );
  // mysql2 devolve DECIMAL como string por padrão — convertemos aqui pra quem
  // consumir `Projeto` nunca precisar lembrar disso.
  return linhas.map((l) => ({ ...l, saldo: Number(l.saldo) }));
}
