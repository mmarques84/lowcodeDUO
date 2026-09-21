import "server-only";
import { query } from "@/lib/db";
import type { Papel } from "@/lib/auth";

export type Lancamento = {
  id: number;
  projeto_id: number;
  data: string;
  descricao: string;
  categoria: string;
  tipo: "entrada" | "saida";
  valor: number;
  status: "pendente" | "pago";
};

export type ProjetoDetalhe = {
  id: number;
  usuario_id: number;
  nome: string;
  slug: string;
  tipo: string;
  cor: string;
  versao: number;
  publicado: number;
};

type ProjetoRow = ProjetoDetalhe;
type LancamentoRow = Omit<Lancamento, "valor"> & { valor: string | number };

/** Retorna null se o projeto não existir OU se pertencer a outro usuário (cliente não-admin). */
export async function buscarProjetoPorSlug(
  slug: string,
  usuarioId: number,
  papel: Papel
): Promise<ProjetoDetalhe | null> {
  const linhas = await query<ProjetoRow>(
    `SELECT id, usuario_id, nome, slug, tipo, cor, versao, publicado
     FROM projetos
     WHERE slug = ? AND (? = 'admin' OR usuario_id = ?)
     LIMIT 1`,
    [slug, papel, usuarioId]
  );
  return linhas[0] ?? null;
}

export async function listarLancamentos(projetoId: number): Promise<Lancamento[]> {
  const linhas = await query<LancamentoRow>(
    `SELECT id, projeto_id, data, descricao, categoria, tipo, valor, status
     FROM lancamentos
     WHERE projeto_id = ?
     ORDER BY data DESC, id DESC`,
    [projetoId]
  );
  return linhas.map((l) => ({ ...l, valor: Number(l.valor) }));
}
