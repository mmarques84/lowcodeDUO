"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
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
  const [filtrosAtivos, setFiltrosAtivos] = useState(false);
  const [busca, setBusca] = useState("");
  const [categoriaFiltro, setCategoriaFiltro] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState("");
  const [statusFiltro, setStatusFiltro] = useState("");
  useEffect(() => {
    function atualizarFiltros() {
      setFiltrosAtivos(localStorage.getItem(`lowcodeduo_filtros_tabela_${projetoId}`) === "true");
    }
    atualizarFiltros();
    window.addEventListener("lowcodeduo:filtros-tabela", atualizarFiltros);
    return () => window.removeEventListener("lowcodeduo:filtros-tabela", atualizarFiltros);
  }, [projetoId]);
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
  const categorias = [...new Set(lancamentos.map((l) => l.categoria))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const filtrados = lancamentos.filter((l) =>
    (!categoriaFiltro || l.categoria === categoriaFiltro) &&
    (!tipoFiltro || l.tipo === tipoFiltro) &&
    (!statusFiltro || l.status === statusFiltro) &&
    (!busca || `${l.descricao} ${l.categoria} ${l.data} ${l.status}`.toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")))
  );
  function removerFiltros() {
    setBusca("");
    setCategoriaFiltro("");
    setTipoFiltro("");
    setStatusFiltro("");
    setFiltrosAtivos(false);
    localStorage.removeItem(`lowcodeduo_filtros_tabela_${projetoId}`);
  }

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
        {filtrosAtivos && <div className="mb-3 space-y-2">
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-[180px] flex-1 text-xs text-text-muted sm:max-w-xs">Buscar
              <span className="relative mt-1 block"><Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" /><input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Descrição, categoria ou data" className="w-full rounded-md border border-border bg-surface px-8 py-1.5 text-sm text-text" /></span>
            </label>
            <label className="text-xs text-text-muted">Categoria
              <select value={categoriaFiltro} onChange={(e) => setCategoriaFiltro(e.target.value)} className="mt-1 block max-w-44 rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text"><option value="">Todas</option>{categorias.map((c) => <option key={c} value={c}>{c}</option>)}</select>
            </label>
            <label className="text-xs text-text-muted">Tipo
              <select value={tipoFiltro} onChange={(e) => setTipoFiltro(e.target.value)} className="mt-1 block rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text"><option value="">Todos</option><option value="entrada">Entrada</option><option value="saida">Saída</option></select>
            </label>
            <label className="text-xs text-text-muted">Status
              <select value={statusFiltro} onChange={(e) => setStatusFiltro(e.target.value)} className="mt-1 block rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text"><option value="">Todos</option><option value="pago">Pago</option><option value="pendente">Pendente</option></select>
            </label>
            <button type="button" onClick={removerFiltros} title="Remover filtros" aria-label="Remover filtros" className="rounded-md p-2 text-text-faint hover:bg-surface-2 hover:text-danger"><X size={16} /></button>
          </div>
          <p className="text-xs text-text-muted">{filtrados.length} de {lancamentos.length} lançamentos</p>
        </div>}
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
                {(filtrosAtivos ? filtrados : lancamentos).map((l) => (
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
            {filtrosAtivos && filtrados.length === 0 && <p className="py-4 text-center text-sm text-text-muted">Nenhum lançamento corresponde aos filtros.</p>}
          </div>
        )}
      </CardRemovivel>}
      </div>
    </>
  );
}
