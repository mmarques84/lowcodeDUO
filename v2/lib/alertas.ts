import "server-only";
import { mutate, query } from "@/lib/db";
import type { AchadoQualidade } from "@/lib/qualidadePlanilha";
import type { LinhaPlanilha } from "@/lib/planilha";

export type RegraAlerta = {
  id: number;
  nome: string;
  coluna: string;
  operador: "maior" | "menor" | "igual";
  valor: string;
  ativo: number;
};

export type Alerta = {
  id: number;
  tipo: "qualidade" | "regra";
  severidade: "info" | "aviso" | "erro";
  titulo: string;
  descricao: string;
  status: "novo" | "resolvido";
  criado_em: string;
};

export function listarAlertas(projetoId: number) {
  return query<Alerta>(
    `SELECT id, tipo, severidade, titulo, descricao, status, criado_em FROM alertas
     WHERE projeto_id = ? ORDER BY status = 'novo' DESC, criado_em DESC, id DESC LIMIT 100`,
    [projetoId]
  );
}

export function listarRegras(projetoId: number) {
  return query<RegraAlerta>(
    `SELECT id, nome, coluna, operador, valor, ativo FROM regras_alerta WHERE projeto_id = ? ORDER BY id DESC`,
    [projetoId]
  );
}

export async function atualizarAlertasImportacao(projetoId: number, achados: AchadoQualidade[], linhas: LinhaPlanilha[]) {
  await mutate(`UPDATE alertas SET status = 'resolvido', resolvido_em = NOW() WHERE projeto_id = ? AND status = 'novo'`, [projetoId]);
  for (const achado of achados) {
    await mutate(
      `INSERT INTO alertas (projeto_id, tipo, severidade, titulo, descricao) VALUES (?, 'qualidade', ?, ?, ?)`,
      [projetoId, achado.severidade, achado.titulo, achado.descricao]
    );
  }
  const regras = await listarRegras(projetoId);
  for (const regra of regras.filter((r) => r.ativo)) {
    const quantidade = linhas.filter((linha) => {
      const valor = String(linha[regra.coluna] ?? "").trim();
      if (!valor) return false;
      if (regra.operador === "igual") return valor.toLocaleLowerCase("pt-BR") === regra.valor.toLocaleLowerCase("pt-BR");
      const numero = Number(valor.includes(",") ? valor.replace(/\./g, "").replace(",", ".") : valor);
      const limite = Number(regra.valor.includes(",") ? regra.valor.replace(/\./g, "").replace(",", ".") : regra.valor);
      return Number.isFinite(numero) && Number.isFinite(limite) && (regra.operador === "maior" ? numero > limite : numero < limite);
    }).length;
    if (quantidade) {
      await mutate(
        `INSERT INTO alertas (projeto_id, regra_id, tipo, severidade, titulo, descricao) VALUES (?, ?, 'regra', 'aviso', ?, ?)`,
        [projetoId, regra.id, regra.nome, `${quantidade} linha(s) atendem à regra: ${regra.coluna} ${regra.operador} ${regra.valor}.`]
      );
    }
  }
}
