import type { Widget } from "@/lib/widgets";

export type DashboardSnapshot = {
  version: 1;
  widgets: Widget[];
  hiddenCards: string[];
  cardOrder: string[];
  filtersEnabled: boolean;
  listOrder: { coluna: string; direcao: "asc" | "desc" } | null;
  newEntryEnabled: boolean;
};

export function isDashboardSnapshot(value: unknown): value is DashboardSnapshot {
  if (!value || typeof value !== "object") return false;
  const s = value as Partial<DashboardSnapshot>;
  return s.version === 1 && Array.isArray(s.widgets) && s.widgets.every((w) =>
    w && typeof w.title === "string" && (w.type === "bar" || w.type === "pie") && typeof w.groupBy === "string"
  ) && Array.isArray(s.hiddenCards) && s.hiddenCards.every((x) => typeof x === "string") &&
    Array.isArray(s.cardOrder) && s.cardOrder.every((x) => typeof x === "string") &&
    typeof s.filtersEnabled === "boolean" && typeof s.newEntryEnabled === "boolean" &&
    (s.listOrder === null || !!s.listOrder && typeof s.listOrder.coluna === "string" && (s.listOrder.direcao === "asc" || s.listOrder.direcao === "desc"));
}

export function capturarDashboard(projetoId: number, widgets: Widget[]): DashboardSnapshot {
  function ler<T>(chave: string, padrao: T): T {
    try { return JSON.parse(localStorage.getItem(chave) ?? "null") ?? padrao; }
    catch { return padrao; }
  }
  return {
    version: 1,
    widgets,
    hiddenCards: ler(`lowcodeduo_cards_ocultos_${projetoId}`, []),
    cardOrder: ler(`lowcodeduo_ordem_cards_${projetoId}`, []),
    filtersEnabled: localStorage.getItem(`lowcodeduo_filtros_tabela_${projetoId}`) === "true",
    listOrder: ler(`lowcodeduo_ordem_lista_${projetoId}`, null),
    newEntryEnabled: localStorage.getItem(`lowcodeduo_novo_lancamento_${projetoId}`) === "true",
  };
}

export function aplicarDashboard(projetoId: number, snapshot: DashboardSnapshot) {
  localStorage.setItem(`lowcodeduo_ai_config_${projetoId}`, JSON.stringify({ widgets: snapshot.widgets }));
  localStorage.setItem(`lowcodeduo_cards_ocultos_${projetoId}`, JSON.stringify(snapshot.hiddenCards));
  localStorage.setItem(`lowcodeduo_ordem_cards_${projetoId}`, JSON.stringify(snapshot.cardOrder));
  localStorage.setItem(`lowcodeduo_filtros_tabela_${projetoId}`, String(snapshot.filtersEnabled));
  if (snapshot.listOrder) localStorage.setItem(`lowcodeduo_ordem_lista_${projetoId}`, JSON.stringify(snapshot.listOrder));
  else localStorage.removeItem(`lowcodeduo_ordem_lista_${projetoId}`);
  localStorage.setItem(`lowcodeduo_novo_lancamento_${projetoId}`, String(snapshot.newEntryEnabled));
}
