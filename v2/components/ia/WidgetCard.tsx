"use client";

import { useAviso } from "@/components/aviso/AvisoProvider";
import { Trash2 } from "lucide-react";
import type { Widget } from "@/lib/widgets";

const CORES = ["#2B59C3", "#187A4C", "#A6690A", "#B33A22", "#7C3AED", "#0F766E", "#D97706", "#5B6273"];

function Donut({
  grupos,
  formatValue,
}: {
  grupos: Record<string, number>;
  formatValue: (v: number) => string;
}) {
  const chaves = Object.keys(grupos).filter((k) => grupos[k] > 0);
  const total = chaves.reduce((s, k) => s + grupos[k], 0);
  if (!total) {
    return <p className="text-sm text-text-muted">Ainda não há dados para montar o gráfico pizza.</p>;
  }
  let inicio = 0;
  const partes = chaves.map((k, i) => {
    const fim = inicio + (grupos[k] / total) * 100;
    const parte = `${CORES[i % CORES.length]} ${inicio.toFixed(2)}% ${fim.toFixed(2)}%`;
    inicio = fim;
    return parte;
  });
  return (
    <div className="flex items-center gap-4">
      <div
        className="h-28 w-28 shrink-0 rounded-full"
        style={{ background: `conic-gradient(${partes.join(",")})` }}
      />
      <div className="flex flex-col gap-1 text-sm">
        {chaves.map((k, i) => {
          const pct = Math.round((grupos[k] / total) * 100);
          return (
            <div key={k} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: CORES[i % CORES.length] }}
              />
              <span className="truncate">{k}</span>
              <span className="tabular-nums text-text-muted">
                {pct}% · {formatValue(grupos[k])}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BarList({
  grupos,
  formatValue,
  ordenarPorChave,
  sort,
}: {
  grupos: Record<string, number>;
  formatValue: (v: number) => string;
  ordenarPorChave?: boolean;
  sort?: Widget["sort"];
}) {
  const ordem = sort ?? (ordenarPorChave ? "label_asc" : "value_desc");
  const keys = Object.keys(grupos).sort((a, b) => {
    if (ordem === "label_asc") return a.localeCompare(b, "pt-BR");
    if (ordem === "label_desc") return b.localeCompare(a, "pt-BR");
    if (ordem === "value_asc") return grupos[a] - grupos[b];
    return grupos[b] - grupos[a];
  });
  if (!keys.length) return <p className="text-sm text-text-muted">Sem dados para este gráfico.</p>;
  const max = Math.max(1, ...keys.map((k) => Math.abs(grupos[k])));
  return (
    <div className="space-y-1.5">
      {keys.map((k) => {
        const v = grupos[k];
        const pct = Math.round((Math.abs(v) / max) * 100);
        return (
          <div key={k} className="grid grid-cols-[1fr_2fr_auto] items-center gap-2 text-sm">
            <span className="truncate">{k}</span>
            <span className="h-2 overflow-hidden rounded-full bg-surface-3">
              <span
                className="block h-full rounded-full"
                style={{ width: `${pct}%`, background: v < 0 ? "var(--danger)" : "var(--accent)" }}
              />
            </span>
            <span className="tabular-nums text-right text-text-muted">{formatValue(v)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function WidgetCard({
  titulo,
  tipo,
  grupos,
  formatValue,
  ordenarPorChave,
  sort,
  onRemover,
}: {
  titulo: string;
  tipo: "pie" | "bar";
  grupos: Record<string, number>;
  formatValue: (v: number) => string;
  ordenarPorChave?: boolean;
  sort?: Widget["sort"];
  onRemover?: () => void;
}) {
  const { confirmar } = useAviso();

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)]">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {onRemover && (
          <button
            onClick={() =>
              confirmar("Remover este gráfico do dashboard?", "Remover gráfico", onRemover, "Remover")
            }
            className="rounded-md px-1.5 py-0.5 text-xs text-text-faint hover:bg-danger-soft hover:text-danger"
            title="Remover este gráfico"
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
      {tipo === "pie" ? (
        <Donut grupos={grupos} formatValue={formatValue} />
      ) : (
        <BarList grupos={grupos} formatValue={formatValue} ordenarPorChave={ordenarPorChave} sort={sort} />
      )}
    </div>
  );
}
