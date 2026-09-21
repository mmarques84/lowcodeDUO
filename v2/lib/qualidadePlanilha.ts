import { ehTipoNumero, type ColunaInfo, type LinhaPlanilha } from "@/lib/planilha";

export type AchadoQualidade = {
  codigo: string;
  severidade: "aviso" | "erro";
  titulo: string;
  descricao: string;
};

export function analisarQualidade(
  colunas: Pick<ColunaInfo, "nome" | "tipo">[],
  linhas: LinhaPlanilha[],
  colunasAnteriores: string[] = []
): AchadoQualidade[] {
  const achados: AchadoQualidade[] = [];
  if (!linhas.length) return [{ codigo: "vazia", severidade: "erro", titulo: "Planilha vazia", descricao: "Não há linhas para importar." }];

  const chaves = new Set<string>();
  let duplicadas = 0;
  for (const linha of linhas) {
    const chave = JSON.stringify(colunas.map((c) => String(linha[c.nome] ?? "").trim().toLocaleLowerCase("pt-BR")));
    if (chaves.has(chave)) duplicadas++;
    else chaves.add(chave);
  }
  if (duplicadas) achados.push({ codigo: "duplicadas", severidade: "aviso", titulo: "Linhas repetidas", descricao: `${duplicadas} de ${linhas.length} linhas são idênticas a outra linha.` });

  for (const coluna of colunas) {
    const ausentes = linhas.filter((linha) => String(linha[coluna.nome] ?? "").trim() === "").length;
    if (ausentes === linhas.length) {
      achados.push({ codigo: `vazia:${coluna.nome}`, severidade: "erro", titulo: `Coluna ${coluna.nome} vazia`, descricao: "Todas as linhas estão sem valor nessa coluna." });
    } else if (ausentes / linhas.length >= 0.2) {
      achados.push({ codigo: `incompleta:${coluna.nome}`, severidade: "aviso", titulo: `Coluna ${coluna.nome} incompleta`, descricao: `${ausentes} de ${linhas.length} linhas estão vazias.` });
    }
    if (ehTipoNumero(coluna.tipo)) {
      const invalidos = linhas.filter((linha) => {
        const valor = String(linha[coluna.nome] ?? "").trim();
        if (!valor) return false;
        const normalizado = valor.includes(",") ? valor.replace(/\./g, "").replace(",", ".") : valor;
        return !Number.isFinite(Number(normalizado));
      }).length;
      if (invalidos) achados.push({ codigo: `numero:${coluna.nome}`, severidade: "erro", titulo: `Números inválidos em ${coluna.nome}`, descricao: `${invalidos} linha(s) têm texto onde era esperado um número.` });
    }
  }

  if (colunasAnteriores.length) {
    const atuais = new Set(colunas.map((c) => c.nome.toLocaleLowerCase("pt-BR")));
    const removidas = colunasAnteriores.filter((nome) => !atuais.has(nome.toLocaleLowerCase("pt-BR")));
    if (removidas.length) achados.push({ codigo: "colunas-removidas", severidade: "aviso", titulo: "Estrutura alterada", descricao: `Colunas da importação anterior não aparecem nesta: ${removidas.join(", ")}.` });
  }
  return achados;
}
