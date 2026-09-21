import type { Lancamento } from "@/lib/lancamentos";
import { ehTipoNumero } from "@/lib/planilha";

export type Widget = {
  type: "pie" | "bar";
  title: string;
  groupBy: string;
  agg: "sum" | "avg" | "count";
  signed?: boolean;
  campo?: string;
  sort?: "value_desc" | "value_asc" | "label_asc" | "label_desc";
};

export type AiConfig = { widgets?: Widget[] };

export const WIDGETS_PADRAO: Widget[] = [
  { type: "bar", title: "Saldo por categoria", groupBy: "categoria", agg: "sum", signed: true },
];

const PARECE_MOEDA = /valor|preço|preco|total|venda|receita|custo/i;

function aiConfigKey(projetoId: number) {
  return `lowcodeduo_ai_config_${projetoId}`;
}

/** widgets undefined = nunca configurado ainda (chamador decide o default pelo modo). */
export function carregarAIConfig(projetoId: number): AiConfig {
  try {
    const raw = localStorage.getItem(aiConfigKey(projetoId));
    const parsed = raw ? JSON.parse(raw) : {};
    return { widgets: Array.isArray(parsed.widgets) ? parsed.widgets : undefined };
  } catch {
    return {};
  }
}

export function salvarAIConfig(projetoId: number, cfg: AiConfig) {
  try {
    localStorage.setItem(aiConfigKey(projetoId), JSON.stringify(cfg));
  } catch {
    // localStorage indisponível (modo privado etc) — widget só não persiste entre sessões
  }
}

function mesmoWidget(a: Widget, b: Widget): boolean {
  return (
    a.type === b.type &&
    a.groupBy === b.groupBy &&
    (a.agg || "sum") === (b.agg || "sum") &&
    !!a.signed === !!b.signed &&
    (a.campo || "") === (b.campo || "")
  );
}

export function mesclarWidgets(existentes: Widget[], novos: Widget[]): Widget[] {
  const resultado = existentes.slice();
  novos.forEach((widget) => {
    const idx = resultado.findIndex((atual) => atual.title === widget.title || mesmoWidget(atual, widget));
    if (idx >= 0) resultado[idx] = widget;
    else resultado.push(widget);
  });
  return resultado;
}

export function removerWidgetPorTitulo(widgets: Widget[], titulo: string): Widget[] {
  return widgets.filter((w) => w.title !== titulo);
}

// ---------- modo financeiro (lançamentos) ----------

function valorAssinado(l: Lancamento): number {
  return (l.tipo === "saida" ? -1 : 1) * l.valor;
}

function chaveGroupBy(l: Lancamento, campo: string): string {
  if (campo === "mes") return (l.data || "").slice(0, 7) || "sem-data";
  if (campo === "tipo") return l.tipo === "entrada" ? "Entrada" : "Saída";
  if (campo === "status") return l.status === "pago" ? "Pago" : "Pendente";
  return (l as unknown as Record<string, string>)[campo] || `Sem ${campo}`;
}

export function agregarWidget(lancamentos: Lancamento[], widget: Widget): Record<string, number> {
  const campo = widget.groupBy || "categoria";
  const agg = widget.agg || "sum";
  const signed = widget.type !== "pie" && !!widget.signed;
  const grupos: Record<string, { total: number; count: number }> = {};
  lancamentos.forEach((l) => {
    const chave = chaveGroupBy(l, campo);
    const v = signed ? valorAssinado(l) : Math.abs(l.valor);
    if (!grupos[chave]) grupos[chave] = { total: 0, count: 0 };
    grupos[chave].total += v;
    grupos[chave].count += 1;
  });
  const resultado: Record<string, number> = {};
  Object.keys(grupos).forEach((k) => {
    const g = grupos[k];
    resultado[k] = agg === "avg" ? (g.count ? g.total / g.count : 0) : agg === "count" ? g.count : g.total;
  });
  return resultado;
}

export function formatarValorFinanceiro(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ---------- modo genérico (planilha importada) ----------

export function widgetPadraoGenerico(
  colunas: { nome: string; tipo: string }[]
): Widget | null {
  const textos = colunas.filter((c) => c.tipo === "texto");
  const numericas = colunas.filter((c) => ehTipoNumero(c.tipo));
  if (!textos.length || !numericas.length) return null;
  const campo = numericas[0];
  const pareceTaxa = /%|percentual|percent|taxa/i.test(campo.nome);
  const agg = pareceTaxa ? "avg" : "sum";
  const titulo = (pareceTaxa ? `Média de ${campo.nome}` : campo.nome) + ` por ${textos[0].nome}`;
  return { type: "bar", title: titulo, groupBy: textos[0].nome, agg, campo: campo.nome };
}

export function agregarWidgetGenerico(
  linhas: Record<string, unknown>[],
  widget: Widget
): Record<string, number> {
  const grupos: Record<string, { total: number; count: number }> = {};
  linhas.forEach((r) => {
    const chave = String(r[widget.groupBy] ?? `Sem ${widget.groupBy}`) || `Sem ${widget.groupBy}`;
    const n = Number(String(r[widget.campo ?? ""] ?? "").replace(",", "."));
    if (!grupos[chave]) grupos[chave] = { total: 0, count: 0 };
    grupos[chave].total += isNaN(n) ? 0 : n;
    grupos[chave].count += 1;
  });
  const agg = widget.agg || "sum";
  const resultado: Record<string, number> = {};
  Object.keys(grupos).forEach((k) => {
    const g = grupos[k];
    resultado[k] = agg === "avg" ? (g.count ? g.total / g.count : 0) : agg === "count" ? g.count : g.total;
  });
  return resultado;
}

export function formatarValorGenerico(v: number, widget: Widget): string {
  if (widget.agg === "count") return v.toLocaleString("pt-BR");
  const pareceMoeda = PARECE_MOEDA.test(widget.campo || "");
  return pareceMoeda ? formatarValorFinanceiro(v) : v.toLocaleString("pt-BR");
}
