import type { Lancamento } from "@/lib/lancamentos";

const moeda = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function analisarLancamentos(lancamentos: Lancamento[], pedido: string, hoje = new Date()): string {
  const texto = pedido.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const meses = [...new Set(lancamentos.map((l) => l.data.slice(0, 7)))].sort();
  const atual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
  const periodo = /mes|mensal|periodo|seman/.test(texto) ? atual : null;
  const linhas = periodo ? lancamentos.filter((l) => l.data.startsWith(periodo)) : lancamentos;
  const titulo = periodo ? `Mês de ${hoje.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}` : "Todos os lançamentos";

  if (!linhas.length) {
    return periodo
      ? `${titulo}: nenhum lançamento encontrado. ${meses.length ? `Meses com dados: ${meses.map((m) => `${m.slice(5)}/${m.slice(0, 4)}`).join(", ")}.` : "Ainda não há lançamentos neste projeto."}`
      : "Ainda não há lançamentos neste projeto.";
  }

  const entradas = linhas.filter((l) => l.tipo === "entrada").reduce((s, l) => s + l.valor, 0);
  const saidas = linhas.filter((l) => l.tipo === "saida").reduce((s, l) => s + l.valor, 0);
  const pendentes = linhas.filter((l) => l.status === "pendente");
  const categorias = new Map<string, number>();
  for (const l of linhas.filter((item) => item.tipo === "saida")) {
    categorias.set(l.categoria, (categorias.get(l.categoria) ?? 0) + l.valor);
  }
  const maiores = [...categorias].sort((a, b) => b[1] - a[1]).slice(0, 3);
  const detalhes = maiores.length ? `Maiores despesas: ${maiores.map(([nome, valor]) => `${nome} (${moeda(valor)})`).join(", ")}.` : "Não houve despesas no período.";
  const pendencia = pendentes.length ? `${pendentes.length} lançamento(s) pendente(s), somando ${moeda(pendentes.reduce((s, l) => s + l.valor, 0))}.` : "Nenhum lançamento pendente.";

  return `${titulo}: ${linhas.length} lançamento(s). Entradas: ${moeda(entradas)}. Saídas: ${moeda(saidas)}. Saldo: ${moeda(entradas - saidas)}. ${detalhes} ${pendencia}`;
}
