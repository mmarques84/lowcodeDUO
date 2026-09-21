"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { calcularPreviaGenerica } from "@/lib/planilha";
import type { RelatorioGenerico } from "@/lib/relatorioGenerico";
import { CardRemovivel, useCardsVisiveis } from "@/components/relatorio/CardRemovivel";

export default function RelatorioGenericoView({ dados, projetoId }: { dados: RelatorioGenerico; projetoId: number }) {
  const previa = calcularPreviaGenerica(dados.colunas, dados.linhas, "");
  const { visivel, remover, restaurarTodos, totalRemovidos } = useCardsVisiveis(projetoId);
  const [ordem, setOrdem] = useState<{ coluna: string; direcao: "asc" | "desc" } | null>(null);
  const [filtrosAtivos, setFiltrosAtivos] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState<Record<string, string>>({});
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

  useEffect(() => {
    function atualizar() {
      try {
        const salvo = JSON.parse(localStorage.getItem(`lowcodeduo_ordem_lista_${projetoId}`) ?? "null");
        setOrdem(salvo && typeof salvo.coluna === "string" && (salvo.direcao === "asc" || salvo.direcao === "desc") ? salvo : null);
      } catch {
        setOrdem(null);
      }
    }
    atualizar();
    window.addEventListener("lowcodeduo:ordem-lista", atualizar);
    return () => window.removeEventListener("lowcodeduo:ordem-lista", atualizar);
  }, [projetoId]);

  useEffect(() => {
    function atualizarFiltros() {
      setFiltrosAtivos(localStorage.getItem(`lowcodeduo_filtros_tabela_${projetoId}`) === "true");
    }
    atualizarFiltros();
    window.addEventListener("lowcodeduo:filtros-tabela", atualizarFiltros);
    return () => window.removeEventListener("lowcodeduo:filtros-tabela", atualizarFiltros);
  }, [projetoId]);

  const linhasOrdenadas = ordem && dados.colunas.some((c) => c.nome === ordem.coluna)
    ? [...dados.linhas].sort((a, b) => String(a[ordem.coluna] ?? "").localeCompare(String(b[ordem.coluna] ?? ""), "pt-BR", { numeric: true }) * (ordem.direcao === "asc" ? 1 : -1))
    : dados.linhas;
  const colunasFiltro = dados.colunas.filter((c) => c.tipo === "texto" && !/email|e-mail/i.test(c.nome)).slice(0, 3);
  const linhasFiltradas = linhasOrdenadas.filter((linha) => {
    if (busca && !dados.colunas.some((c) => String(linha[c.nome] ?? "").toLocaleLowerCase("pt-BR").includes(busca.toLocaleLowerCase("pt-BR")))) return false;
    return colunasFiltro.every((c) => !filtros[c.nome] || String(linha[c.nome] ?? "") === filtros[c.nome]);
  });

  function removerFiltros() {
    localStorage.removeItem(`lowcodeduo_filtros_tabela_${projetoId}`);
    setFiltrosAtivos(false);
    setBusca("");
    setFiltros({});
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
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {previa.kpis.map((k, i) => visivel(`generico-kpi-${i}`) && (
          <CardRemovivel
            key={k.label}
            id={`generico-kpi-${i}`}
            titulo={k.label}
            onRemover={remover}
            style={{ order: posicao(`generico-kpi-${i}`, i) }}
          >
            <div className="mb-1 text-xs text-text-muted">{k.label}</div>
            <div className="text-xl font-bold tabular-nums">{k.valor}</div>
          </CardRemovivel>
        ))}
      {previa.grafico && visivel("generico-grafico") && (
        <CardRemovivel id="generico-grafico" titulo={previa.grafico.titulo} onRemover={remover} className="sm:col-span-4" style={{ order: posicao("generico-grafico", 4) }}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
            {previa.grafico.titulo}
          </h3>
          <div className="space-y-1.5">
            {previa.grafico.barras.map((b) => (
              <div key={b.chave} className="grid grid-cols-[1fr_2fr_auto] items-center gap-2 text-sm">
                <span className="truncate">{b.chave}</span>
                <span className="h-2 overflow-hidden rounded-full bg-surface-3">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${b.pct}%` }} />
                </span>
                <span className="tabular-nums text-right text-text-muted">
                  {b.valor.toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </CardRemovivel>
      )}

      {visivel("generico-dados") && <CardRemovivel id="generico-dados" titulo="Dados importados" onRemover={remover} className="sm:col-span-4" style={{ order: posicao("generico-dados", 5) }}>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-text-muted">
          Dados importados
        </h3>
        {filtrosAtivos && (
          <div className="mb-3 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="relative min-w-[180px] flex-1 sm:max-w-xs">
                <Search size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-faint" />
                <input
                  type="search"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar na tabela"
                  aria-label="Buscar na tabela"
                  className="w-full rounded border border-border bg-surface px-8 py-1.5 text-sm"
                />
              </label>
              {colunasFiltro.map((c) => (
                <label key={c.nome} className="flex items-center gap-1.5 text-xs text-text-muted">
                  {c.nome}
                  <select
                    value={filtros[c.nome] ?? ""}
                    onChange={(e) => setFiltros((atual) => ({ ...atual, [c.nome]: e.target.value }))}
                    className="max-w-40 rounded border border-border bg-surface px-2 py-1.5 text-sm text-text"
                  >
                    <option value="">Todos</option>
                    {[...new Set(dados.linhas.map((linha) => String(linha[c.nome] ?? "")))].filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR")).map((valor) => (
                      <option key={valor} value={valor}>{valor}</option>
                    ))}
                  </select>
                </label>
              ))}
              <button type="button" onClick={removerFiltros} title="Remover filtros da tabela" aria-label="Remover filtros da tabela" className="rounded p-1.5 text-text-faint hover:bg-surface-2 hover:text-danger">
                <X size={16} />
              </button>
            </div>
            <div className="text-xs text-text-muted">{linhasFiltradas.length} de {dados.linhas.length} registros</div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-text-faint">
                {dados.colunas.map((c) => (
                  <th key={c.nome} className="pb-2 pr-3 font-semibold">
                    {c.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhasFiltradas.slice(0, 50).map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {dados.colunas.map((c) => (
                    <td key={c.nome} className="py-2 pr-3">
                      {String(r[c.nome] ?? "")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {linhasFiltradas.length > 50 && (
            <p className="mt-2 text-xs text-text-faint">Mostrando 50 de {linhasFiltradas.length} linhas.</p>
          )}
        </div>
      </CardRemovivel>}
      </div>
    </>
  );
}
