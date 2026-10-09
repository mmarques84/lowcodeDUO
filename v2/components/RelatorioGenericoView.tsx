"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { FileText, Search, SlidersHorizontal, Table2, X } from "lucide-react";
import { calcularPreviaGenerica } from "@/lib/planilha";
import type { RelatorioGenerico } from "@/lib/relatorioGenerico";
import { CardRemovivel, useCardsVisiveis } from "@/components/relatorio/CardRemovivel";
import PainelAjustarAnalise from "@/components/PainelAjustarAnalise";
import { descreverCalculo } from "@/lib/promptAnalise";
import { aplicarPrompt } from "@/lib/aplicarPrompt";
import { assinarModelos, interpretarConfiguracao, lerModeloSalvo, executarAnalise, salvarConfiguracao, sugerirConfiguracao, validarConfiguracao, type ConfiguracaoAnalise } from "@/lib/configuracaoAnalise";
import { useAviso } from "@/components/aviso/AvisoProvider";

export default function RelatorioGenericoView({ dados, projetoId }: { dados: RelatorioGenerico; projetoId: number }) {
  const { aviso } = useAviso();
  const modeloSalvo = useSyncExternalStore(assinarModelos, () => lerModeloSalvo(projetoId), () => null);
  const config = useMemo(() => interpretarConfiguracao(modeloSalvo), [modeloSalvo]);
  const [rascunho, setRascunho] = useState<ConfiguracaoAnalise>(() => sugerirConfiguracao(dados.colunas));
  const [editando, setEditando] = useState(false);
  const [abaAjustes, setAbaAjustes] = useState<"ajustes" | "prompt">("ajustes");
  const [errosConfig, setErrosConfig] = useState<string[]>([]);
  const incompatibilidades = config ? validarConfiguracao(config, dados.colunas) : [];
  const configAtiva = config && !incompatibilidades.length ? config : null;
  const analise = configAtiva ? executarAnalise(configAtiva, dados.linhas) : null;
  const previa = analise?.previa ?? calcularPreviaGenerica(dados.colunas, dados.linhas, "");
  const colunasVisiveis = configAtiva ? dados.colunas.filter((c) => configAtiva.colunas.includes(c.nome)) : dados.colunas;
  const dadosAnalisados = analise?.linhas ?? dados.linhas;
  const { visivel, remover, restaurarTodos, totalRemovidos } = useCardsVisiveis(projetoId);
  const [ordem, setOrdem] = useState<{ coluna: string; direcao: "asc" | "desc" } | null>(null);
  const [filtrosAtivos, setFiltrosAtivos] = useState(false);
  const [busca, setBusca] = useState("");
  const [filtros, setFiltros] = useState<Record<string, string>>({});
  const [ordemCards, setOrdemCards] = useState<string[]>([]);

  function editarConfiguracao(aba: "ajustes" | "prompt" = "ajustes") {
    setRascunho(config ?? sugerirConfiguracao(dados.colunas));
    setErrosConfig([]);
    setAbaAjustes(aba);
    setEditando(true);
  }

  function salvarERecalcular() {
    const interpretacao = aplicarPrompt(rascunho, dados.colunas);
    const erros = interpretacao.erros;
    setErrosConfig(erros);
    if (erros.length) return;
    try {
      salvarConfiguracao(projetoId, interpretacao.config);
      setEditando(false);
      aviso(`Análise atualizada: ${descreverCalculo(interpretacao.config)}. Modelo salvo neste navegador.`, "success");
    } catch { aviso("Não foi possível salvar a configuração neste navegador.", "error"); }
  }

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
    ? [...dadosAnalisados].sort((a, b) => String(a[ordem.coluna] ?? "").localeCompare(String(b[ordem.coluna] ?? ""), "pt-BR", { numeric: true }) * (ordem.direcao === "asc" ? 1 : -1))
    : dadosAnalisados;
  const colunasFiltro = colunasVisiveis.filter((c) => c.tipo === "texto" && !/email|e-mail/i.test(c.nome)).slice(0, 3);
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
      <section className="mb-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4"><div className="min-w-0 flex-1"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-text-muted">Você está acompanhando</p><h2 className="text-lg font-semibold sm:text-xl">{configAtiva ? descreverCalculo(configAtiva) : "Visão geral dos dados"}</h2><p className="mt-1 text-sm text-text-muted">{configAtiva?.objetivo ?? "Confira os resultados ou escolha como deseja analisar a planilha."}</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => editarConfiguracao("prompt")} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-text-muted hover:bg-surface-2 hover:text-text"><FileText size={16} />Ver prompt</button><button type="button" onClick={() => editarConfiguracao()} className="flex items-center gap-2 rounded-lg border border-accent/25 bg-accent-soft px-3 py-2 text-sm font-semibold text-accent hover:brightness-95"><SlidersHorizontal size={16} />Ajustar análise</button></div></div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-text-muted"><span className="flex items-center gap-1.5 rounded-md bg-surface-2/70 px-2.5 py-1.5"><Table2 size={13} />{configAtiva?.aba || "Dados importados"}</span><span className="rounded-md bg-surface-2/70 px-2.5 py-1.5">{dadosAnalisados.length.toLocaleString("pt-BR")} registros considerados</span><span className="rounded-md bg-surface-2/70 px-2.5 py-1.5">{configAtiva?.inicio || configAtiva?.fim ? `${configAtiva.inicio || "Início"} a ${configAtiva.fim || "sem limite final"}` : "Todo o período"}</span>{configAtiva?.filtros.map((f, i) => <span key={i} className="rounded-md bg-accent-soft px-2.5 py-1.5 text-accent">{f.coluna} {f.operador === "igual" ? "=" : f.operador === "diferente" ? "≠" : "contém"} {f.valor}</span>)}</div>
        {incompatibilidades.length > 0 && <div role="alert" className="mt-3 rounded-lg bg-pending-soft p-3 text-sm text-pending">O modelo salvo precisa de ajustes: {incompatibilidades.join(" ")} O painel está exibindo a análise padrão até a correção.</div>}
      </section>
      {editando && <PainelAjustarAnalise config={rascunho} onChange={setRascunho} colunas={dados.colunas} linhas={dados.linhas} erros={errosConfig} onFechar={() => setEditando(false)} onAplicar={salvarERecalcular} onSugerir={() => { setRascunho(sugerirConfiguracao(dados.colunas, config?.aba)); setErrosConfig([]); }} abaInicial={abaAjustes} alterado={JSON.stringify(rascunho) !== JSON.stringify(config ?? sugerirConfiguracao(dados.colunas))} />}
      {totalRemovidos > 0 && (
        <div className="mb-3 flex justify-end">
          <button type="button" onClick={restaurarTodos} className="text-sm font-medium text-accent hover:underline">
            Restaurar cards ({totalRemovidos})
          </button>
        </div>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        {(configAtiva?.entregas.indicadores ?? true) && previa.kpis.map((k, i) => visivel(`generico-kpi-${i}`) && (
          <CardRemovivel
            key={k.label}
            id={`generico-kpi-${i}`}
            titulo={k.label}
            onRemover={remover}
            className={previa.kpis.length <= 2 ? "sm:col-span-2" : ""}
            style={{ order: posicao(`generico-kpi-${i}`, i) }}
          >
            <div className="mb-3 text-sm text-text-muted">{k.label}</div>
            <div className="text-3xl font-semibold tracking-tight tabular-nums">{k.valor}</div>
            <p className="mt-3 text-xs text-text-muted">{i === 0 && configAtiva?.operacao !== "contagem" && configAtiva ? `Calculado a partir de ${configAtiva.medida}` : "Conforme o período e os filtros da análise"}</p>
          </CardRemovivel>
        ))}
      {(configAtiva?.entregas.grafico ?? true) && previa.grafico && visivel("generico-grafico") && (
        <CardRemovivel id="generico-grafico" titulo={previa.grafico.titulo} onRemover={remover} className="sm:col-span-4" style={{ order: posicao("generico-grafico", 4) }}>
          <h3 className="mb-1 text-base font-semibold">
            {previa.grafico.titulo}
          </h3>
          <p className="mb-5 text-xs text-text-muted">Até 10 grupos, do maior resultado para o menor.</p>
          <div className="space-y-3">
            {previa.grafico.barras.map((b) => (
              <div key={b.chave} className="grid grid-cols-[minmax(70px,1fr)_2fr_minmax(65px,auto)] items-center gap-3 text-sm">
                <span className="truncate" title={b.chave}>{b.chave}</span>
                <span className="h-6 overflow-hidden rounded-md bg-surface-2">
                  <span className={`block h-full rounded-md ${b.valor < 0 ? "bg-danger/80" : "bg-accent/80"}`} style={{ width: `${b.pct}%` }} />
                </span>
                <span className="tabular-nums text-right text-text-muted">
                  {b.valor.toLocaleString("pt-BR")}
                </span>
              </div>
            ))}
          </div>
        </CardRemovivel>
      )}

      {configAtiva?.entregas.grafico && !previa.grafico && <p className="text-sm text-text-muted sm:col-span-4">Não há grupos para exibir. Confira o agrupamento e os filtros em Ajustar análise.</p>}
      {(configAtiva?.entregas.dados ?? true) && visivel("generico-dados") && <CardRemovivel id="generico-dados" titulo="Dados importados" onRemover={remover} className="sm:col-span-4" style={{ order: posicao("generico-dados", 5) }}>
        <h3 className="mb-1 text-base font-semibold">
          Registros da análise
        </h3>
        <p className="mb-5 text-xs text-text-muted">Confira os dados que sustentam os resultados acima.</p>
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
                    {[...new Set(dadosAnalisados.map((linha) => String(linha[c.nome] ?? "")))].filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR")).map((valor) => (
                      <option key={valor} value={valor}>{valor}</option>
                    ))}
                  </select>
                </label>
              ))}
              <button type="button" onClick={removerFiltros} title="Remover filtros da tabela" aria-label="Remover filtros da tabela" className="rounded p-1.5 text-text-faint hover:bg-surface-2 hover:text-danger">
                <X size={16} />
              </button>
            </div>
            <div className="text-xs text-text-muted">{linhasFiltradas.length} de {dadosAnalisados.length} registros da análise</div>
          </div>
        )}
        <div className="overflow-x-auto">
          {linhasFiltradas.length === 0 && <p className="mb-3 text-sm text-text-muted">Nenhum registro atende aos filtros e ao período escolhidos.</p>}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-text-faint">
                {colunasVisiveis.map((c) => (
                  <th key={c.nome} className="pb-2 pr-3 font-semibold">
                    {c.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {linhasFiltradas.slice(0, 50).map((r, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {colunasVisiveis.map((c) => (
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
