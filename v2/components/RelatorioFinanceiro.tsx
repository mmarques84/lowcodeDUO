"use client";

import { useEffect, useState } from "react";
import ModalLancamento from "@/components/ModalLancamento";
import ExcluirLancamento from "@/components/ExcluirLancamento";
import { CardRemovivel, useCardsVisiveis } from "@/components/relatorio/CardRemovivel";
import type { Lancamento } from "@/lib/lancamentos";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function fmtData(iso: string) {
  const [ano, mes, dia] = iso.slice(0, 10).split("-");
  return `${dia}/${mes}`;
}

export default function RelatorioFinanceiro({
  projetoId,
  projetoSlug,
  lancamentos,
}: {
  projetoId: number;
  projetoSlug: string;
  lancamentos: Lancamento[];
}) {
  const { visivel, remover, restaurarTodos, totalRemovidos } = useCardsVisiveis(projetoId);
  const [ordemCards, setOrdemCards] = useState<string[]>([]);
  useEffect(() => {
    function atualizar() {
      try {
        const ordem = JSON.parse(localStorage.getItem(`lowcodeduo_ordem_cards_${projetoId}`) ?? "[]");
        setOrdemCards(Array.isArray(ordem) ? ordem : []);
      } catch { setOrdemCards([]); }
    }
    atualizar();
    window.addEventListener("lowcodeduo:cards-layout", atualizar);
    return () => window.removeEventListener("lowcodeduo:cards-layout", atualizar);
  }, [projetoId]);
  function posicao(id: string, padrao: number) {
    const index = ordemCards.indexOf(id);
    return index < 0 ? padrao : index;
  }
  const entradas = lancamentos.filter((l) => l.tipo === "entrada").reduce((s, l) => s + l.valor, 0);
  const saidas = lancamentos.filter((l) => l.tipo === "saida").reduce((s, l) => s + l.valor, 0);
  const saldo = entradas - saidas;

  return (
    <>
      {totalRemovidos > 0 && (
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={restaurarTodos} className="text-sm font-medium text-accent hover:underline">
            Restaurar cards ({totalRemovidos})
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {visivel("financeiro-entradas") && <CardRemovivel id="financeiro-entradas" titulo="Entradas" onRemover={remover} style={{ order: posicao("financeiro-entradas", 0) }}>
          <div className="mb-1 text-xs text-text-muted">Entradas</div>
          <div className="text-xl font-bold tabular-nums text-live">{fmtBRL(entradas)}</div>
        </CardRemovivel>}
        {visivel("financeiro-saidas") && <CardRemovivel id="financeiro-saidas" titulo="Saidas" onRemover={remover} style={{ order: posicao("financeiro-saidas", 1) }}>
          <div className="mb-1 text-xs text-text-muted">Saídas</div>
          <div className="text-xl font-bold tabular-nums text-danger">{fmtBRL(saidas)}</div>
        </CardRemovivel>}
        {visivel("financeiro-saldo") && <CardRemovivel id="financeiro-saldo" titulo="Saldo" onRemover={remover} style={{ order: posicao("financeiro-saldo", 2) }}>
          <div className="mb-1 text-xs text-text-muted">Saldo</div>
          <div className="text-xl font-bold tabular-nums">{fmtBRL(saldo)}</div>
        </CardRemovivel>}
      {visivel("financeiro-lancamentos") && <CardRemovivel id="financeiro-lancamentos" titulo="Lancamentos" onRemover={remover} className="sm:col-span-3" style={{ order: posicao("financeiro-lancamentos", 3) }}>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Lançamentos
        </h3>
        {lancamentos.length === 0 ? (
          <p className="text-sm text-text-muted">Nenhum lançamento ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-text-faint">
                  <th className="pb-2 pr-3 font-semibold">Data</th>
                  <th className="pb-2 pr-3 font-semibold">Descrição</th>
                  <th className="pb-2 pr-3 font-semibold">Categoria</th>
                  <th className="pb-2 pr-3 font-semibold">Tipo</th>
                  <th className="pb-2 pr-3 font-semibold">Status</th>
                  <th className="pb-2 pr-3 text-right font-semibold">Valor</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {lancamentos.map((l) => (
                  <tr key={l.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3 tabular-nums">{fmtData(l.data)}</td>
                    <td className="py-2 pr-3">{l.descricao}</td>
                    <td className="py-2 pr-3">
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">
                        {l.categoria}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className="inline-flex items-center gap-1"
                        style={{ color: l.tipo === "entrada" ? "var(--live)" : "var(--danger)" }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ background: "currentColor" }}
                        />
                        {l.tipo === "entrada" ? "Entrada" : "Saída"}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{
                          background: l.status === "pago" ? "var(--live-soft)" : "var(--pending-soft)",
                          color: l.status === "pago" ? "var(--live)" : "var(--pending)",
                        }}
                      >
                        {l.status === "pago" ? "Pago" : "Pendente"}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-right tabular-nums font-medium">{fmtBRL(l.valor)}</td>
                    <td className="py-2 text-right whitespace-nowrap">
                      <ModalLancamento projetoSlug={projetoSlug} lancamento={l} />
                      <ExcluirLancamento id={l.id} projetoSlug={projetoSlug} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardRemovivel>}
      </div>
    </>
  );
}
