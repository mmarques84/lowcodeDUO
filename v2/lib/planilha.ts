export type ColunaInfo = { nome: string; tipo: string; exemplo?: string };
export type LinhaPlanilha = Record<string, unknown>;

/** sessionStorage: planilha já parseada no formulário "Novo projeto", aguardando o wizard pegar no primeiro mount. */
export const CHAVE_IMPORT_PENDENTE = "lowcodeduo_import_pendente";

function pareceNumero(v: unknown): boolean {
  if (v === "" || v === null || v === undefined) return false;
  const n = Number(String(v).replace(/\./g, "").replace(",", "."));
  if (!isNaN(Number(v))) return true;
  return !isNaN(n);
}

export function inferirTipoColuna(nome: string, valores: unknown[]): string {
  const nomeLower = nome.toLowerCase();
  if (nomeLower.includes("data") || nomeLower.includes("date")) return "data";
  const amostra = valores.filter((v) => v !== "" && v !== null && v !== undefined).slice(0, 20);
  if (amostra.length === 0) return "texto";
  const numericos = amostra.filter(pareceNumero).length;
  if (numericos / amostra.length >= 0.7) return "número";
  return "texto";
}

export function detectarColunas(rows: LinhaPlanilha[]): ColunaInfo[] {
  const colunas = Object.keys(rows[0] ?? {});
  return colunas.map((nome) => {
    const valores = rows.map((r) => r[nome]);
    const exemplo = valores.find((v) => v !== "" && v !== null && v !== undefined);
    return {
      nome,
      tipo: inferirTipoColuna(nome, valores),
      exemplo: exemplo === undefined ? "" : String(exemplo),
    };
  });
}

export function pareceLancamentoAluguel(colunas: string[]): boolean {
  const texto = colunas.join(" ").toLowerCase();
  return (
    /data/.test(texto) &&
    /descri/.test(texto) &&
    /categoria/.test(texto) &&
    /\btipo\b/.test(texto) &&
    /valor/.test(texto)
  );
}

export function chutarNegocio(colunas: string[]): string {
  const texto = colunas.join(" ").toLowerCase();
  if (/valor|preço|preco|total|venda|receita|custo/.test(texto)) return "Controle financeiro";
  if (/estoque|produto|quantidade|sku/.test(texto)) return "Controle de estoque";
  if (/aluguel|inquilino|imovel|imóvel/.test(texto)) return "Controle de aluguel";
  if (/cliente|contato|telefone|email/.test(texto)) return "Lista de clientes";
  return "Seus dados importados";
}

/** Comparação tolerante: tipo_inferido pode vir com acento corrompido do MySQL (bug de charset do n8n na v1). */
export function ehTipoNumero(tipo: string): boolean {
  const limpo = (tipo || "").replace(/[^a-zA-Z]/g, "").toLowerCase();
  return limpo === "nmero" || limpo === "numero";
}

const PARECE_MOEDA = /valor|preço|preco|total|venda|receita|custo/i;

export type PreviaGenerica = {
  kpis: { label: string; valor: string }[];
  grafico: { titulo: string; barras: { chave: string; valor: number; pct: number }[] } | null;
};

const PARECE_PERCENTUAL = /%|percentual|porcentagem|progresso|progress/i;

export function calcularPreviaGenerica(
  colunas: ColunaInfo[],
  rows: LinhaPlanilha[],
  pedido: string
): PreviaGenerica {
  let numericas = colunas.filter((c) => ehTipoNumero(c.tipo));
  let textos = colunas.filter((c) => c.tipo === "texto");

  const pedidoLower = (pedido || "").toLowerCase();
  const textoMencionado = textos.find((c) => pedidoLower.includes(c.nome.toLowerCase()));
  const numMencionado = numericas.find((c) => pedidoLower.includes(c.nome.toLowerCase()));
  if (textoMencionado) textos = [textoMencionado, ...textos.filter((c) => c !== textoMencionado)];
  if (numMencionado) numericas = [numMencionado, ...numericas.filter((c) => c !== numMencionado)];

  const kpis = numericas.slice(0, 4).map((c) => {
    const valores = rows.map((r) => {
      const bruto = String(r[c.nome] ?? "").trim();
      if (!bruto) return null;
      const n = Number(bruto.replace(",", "."));
      return Number.isFinite(n) ? n : null;
    }).filter((n): n is number => n !== null);
    const soma = valores.reduce((s, n) => s + n, 0);
    const percentual = PARECE_PERCENTUAL.test(c.nome);
    const resultado = percentual && valores.length ? soma / valores.length : soma;
    const valor = PARECE_MOEDA.test(c.nome)
      ? resultado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })
      : resultado.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
    return { label: `${percentual ? "Média" : "Total"} de ${c.nome}`, valor };
  });
  if (kpis.length === 0) {
    kpis.push({ label: "Linhas importadas", valor: rows.length.toLocaleString("pt-BR") });
  }

  let grafico: PreviaGenerica["grafico"] = null;
  if (textos.length > 0 && numericas.length > 0) {
    const colCat = textos[0].nome;
    const colNum = numericas[0].nome;
    const grupos: Record<string, number> = {};
    const contagens: Record<string, number> = {};
    const percentual = PARECE_PERCENTUAL.test(colNum);
    rows.forEach((r) => {
      const chave = String(r[colCat] ?? "(vazio)") || "(vazio)";
      const bruto = String(r[colNum] ?? "").trim();
      if (!bruto) return;
      const n = Number(bruto.replace(",", "."));
      if (!Number.isFinite(n)) return;
      grupos[chave] = (grupos[chave] ?? 0) + n;
      contagens[chave] = (contagens[chave] ?? 0) + 1;
    });
    if (percentual) {
      Object.keys(grupos).forEach((chave) => { grupos[chave] /= contagens[chave]; });
    }
    const max = Math.max(1, ...Object.values(grupos));
    const barras = Object.keys(grupos)
      .sort((a, b) => grupos[b] - grupos[a])
      .slice(0, 10)
      .map((chave) => ({
        chave,
        valor: grupos[chave],
        pct: Math.round((grupos[chave] / max) * 100),
      }));
    grafico = { titulo: `${percentual ? "Média" : "Total"} de ${colNum} por ${colCat}`, barras };
  }

  return { kpis, grafico };
}
