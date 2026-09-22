import type { RelatorioGenerico } from "@/lib/relatorioGenerico";

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

export function analisarFrequencia(dados: RelatorioGenerico, pedido: string): string | null {
  const pergunta = normalizar(pedido);
  if (!/qual|quais|mais|menos|frequen|quant|distribui|contag|total/.test(pergunta)) return null;

  const coluna = dados.colunas
    .filter((c) => c.tipo === "texto")
    .map((c) => ({
      coluna: c,
      posicao: Math.min(...normalizar(c.nome).split(/\W+/).filter((p) => p.length > 2).map((p) => {
        const singular = pergunta.indexOf(p);
        const plural = pergunta.indexOf(`${p}s`);
        return singular >= 0 ? singular : plural >= 0 ? plural : Infinity;
      })),
    }))
    .filter((item) => Number.isFinite(item.posicao))
    .sort((a, b) => a.posicao - b.posicao)[0]?.coluna;
  if (!coluna) return null;

  const contagem = new Map<string, number>();
  for (const linha of dados.linhas) {
    const valor = String(linha[coluna.nome] ?? "").trim();
    if (valor) contagem.set(valor, (contagem.get(valor) ?? 0) + 1);
  }
  if (!contagem.size) return `A coluna ${coluna.nome} não tem valores preenchidos.`;

  const ordenados = [...contagem].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"));
  const topo = ordenados.slice(0, 10);
  const linhas = topo.map(([nome, total], i) => `${i + 1}. ${nome}: ${total} registro${total === 1 ? "" : "s"}`);
  return `${coluna.nome}: ${dados.linhas.length} registros, ${contagem.size} valores distintos.\n${linhas.join("\n")}${ordenados.length > topo.length ? `\nMostrando os 10 primeiros de ${ordenados.length}.` : ""}`;
}
