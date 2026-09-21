"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Sparkles, X } from "lucide-react";
import { useAviso } from "@/components/aviso/AvisoProvider";
import WidgetCard from "@/components/ia/WidgetCard";
import OrganizadorDashboard from "@/components/ia/OrganizadorDashboard";
import type { Lancamento } from "@/lib/lancamentos";
import type { RelatorioGenerico } from "@/lib/relatorioGenerico";
import { capturarDashboard } from "@/lib/dashboardSnapshot";
import {
  type Widget,
  carregarAIConfig,
  salvarAIConfig,
  mesclarWidgets,
  removerWidgetPorTitulo,
  WIDGETS_PADRAO,
  widgetPadraoGenerico,
  agregarWidget,
  agregarWidgetGenerico,
  formatarValorFinanceiro,
  formatarValorGenerico,
} from "@/lib/widgets";

type ItemRascunho =
  | { kind: "widget"; ref: Widget; selecionado: boolean }
  | { kind: "lancamento"; habilitar: boolean; selecionado: boolean }
  | { kind: "filtro"; selecionado: boolean }
  | { kind: "lista"; coluna: string; direcao: "asc" | "desc"; selecionado: boolean }
  | { kind: "remocao"; titulo: string; selecionado: boolean };

type MudancaIA = { tipo: string; titulo?: string; descricao?: string; widgetTitle?: string };
type RespostaIA = { ok?: boolean; erro?: string; widgets?: Widget[]; mudancas?: MudancaIA[] };

function normalizar(texto: string) {
  return texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function ordemPedida(texto: string): Widget["sort"] | null {
  const pedido = normalizar(texto);
  if (!/orden|classific|rank|maior|menor|crescente|decrescente/.test(pedido)) return null;
  if (/alfabet|nome|a-z|z-a/.test(pedido)) return /z-a|decrescente|invers/.test(pedido) ? "label_desc" : "label_asc";
  return /menor|crescente/.test(pedido) ? "value_asc" : "value_desc";
}

export default function PainelIA({
  projetoId,
  projetoSlug,
  modo,
  lancamentos,
  relatorioGenerico,
}: {
  projetoId: number;
  projetoSlug: string;
  modo: "financeiro" | "generico";
  lancamentos?: Lancamento[];
  relatorioGenerico?: RelatorioGenerico | null;
}) {
  const { aviso } = useAviso();
  const router = useRouter();

  const [montado, setMontado] = useState(false);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [widgetsRemovidos, setWidgetsRemovidos] = useState<Widget[]>([]);
  const [painelAberto, setPainelAberto] = useState(false);
  const [pedido, setPedido] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [itens, setItens] = useState<ItemRascunho[] | null>(null);
  const [infos, setInfos] = useState<MudancaIA[]>([]);

  useEffect(() => {
    const cfg = carregarAIConfig(projetoId);
    let iniciais = cfg.widgets;
    if (!iniciais) {
      if (modo === "financeiro") {
        iniciais = WIDGETS_PADRAO.slice();
      } else {
        const padrao = relatorioGenerico ? widgetPadraoGenerico(relatorioGenerico.colunas) : null;
        iniciais = padrao ? [padrao] : [];
      }
      salvarAIConfig(projetoId, { widgets: iniciais });
    }
    setWidgets(iniciais);
    try {
      const salvos = JSON.parse(localStorage.getItem(`lowcodeduo_widgets_removidos_${projetoId}`) ?? "[]");
      setWidgetsRemovidos(Array.isArray(salvos) ? salvos : []);
    } catch {
      setWidgetsRemovidos([]);
    }
    setMontado(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projetoId]);

  function computarGrupos(w: Widget): Record<string, number> {
    if (modo === "financeiro") return agregarWidget(lancamentos ?? [], w);
    return agregarWidgetGenerico(relatorioGenerico?.linhas ?? [], w);
  }

  function formatarValor(w: Widget) {
    return modo === "financeiro" ? formatarValorFinanceiro : (v: number) => formatarValorGenerico(v, w);
  }

  function removerWidget(titulo: string) {
    const removido = widgets.find((w) => w.title === titulo);
    const atualizados = removerWidgetPorTitulo(widgets, titulo);
    setWidgets(atualizados);
    salvarAIConfig(projetoId, { widgets: atualizados });
    if (removido) {
      const historico = [...widgetsRemovidos.filter((w) => w.title !== titulo), removido];
      setWidgetsRemovidos(historico);
      localStorage.setItem(`lowcodeduo_widgets_removidos_${projetoId}`, JSON.stringify(historico));
    }
    aviso("Gráfico removido do dashboard.", "success", "Removido");
  }

  function restaurarWidgets() {
    const atualizados = mesclarWidgets(widgets, widgetsRemovidos);
    setWidgets(atualizados);
    salvarAIConfig(projetoId, { widgets: atualizados });
    setWidgetsRemovidos([]);
    localStorage.removeItem(`lowcodeduo_widgets_removidos_${projetoId}`);
  }

  async function aplicarOrganizacao(visiveis: Widget[], ocultos: Widget[]) {
    const resposta = await fetch("/api/projetos/publicar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projetoSlug, resumo: "Layout do dashboard reorganizado", snapshot: capturarDashboard(projetoId, visiveis) }),
    });
    if (!resposta.ok) throw new Error("Não foi possível registrar a versão do layout.");
    setWidgets(visiveis);
    setWidgetsRemovidos(ocultos);
    salvarAIConfig(projetoId, { widgets: visiveis });
    localStorage.setItem(`lowcodeduo_widgets_removidos_${projetoId}`, JSON.stringify(ocultos));
    router.refresh();
  }

  async function gerarRascunho() {
    if (!pedido.trim()) {
      aviso("Descreva o que você quer mudar antes de gerar o rascunho.", "error", "Pedido vazio");
      return;
    }
    setCarregando(true);
    try {
      const pedidoNormalizado = normalizar(pedido);
      if (/lancamento/.test(pedidoNormalizado) && /adicion|inclu|mostr|habilit|ativ|quero|remov|ocult|escond/.test(pedidoNormalizado)) {
        const habilitar = !/remov|ocult|escond|desativ/.test(pedidoNormalizado);
        setItens([{ kind: "lancamento", habilitar, selecionado: true }]);
        setInfos([]);
        return;
      }
      if (relatorioGenerico && /filtr|pesquis|busca/.test(normalizar(pedido)) && /tabela|lista|dados|planilha/.test(normalizar(pedido))) {
        setItens([{ kind: "filtro", selecionado: true }]);
        setInfos([]);
        return;
      }
      const sort = ordemPedida(pedido);
      if (sort && relatorioGenerico && /lista|tabela|dados|linhas/.test(normalizar(pedido))) {
        const colunas = relatorioGenerico.colunas.map((c) => c.nome);
        const coluna = colunas.find((nome) => normalizar(pedido).includes(normalizar(nome))) ?? colunas[0];
        setItens([{ kind: "lista", coluna, direcao: sort.endsWith("asc") ? "asc" : "desc", selecionado: true }]);
        setInfos([]);
        return;
      }
      if (sort && widgets.length) {
        const termos = normalizar(pedido).split(/\W+/).filter((t) => t.length > 3);
        const alvo = widgets.find((w) => termos.some((t) => normalizar(`${w.title} ${w.groupBy} ${w.campo ?? ""}`).includes(t))) ?? widgets[0];
        setItens([{ kind: "widget", ref: { ...alvo, sort }, selecionado: true }]);
        setInfos([]);
        return;
      }
      const resp = await fetch("/api/ia/rascunho", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projetoSlug, pedido, widgetsAtuais: widgets }),
      });
      const dados: RespostaIA = await resp.json();
      if (!resp.ok || dados.erro) throw new Error(dados.erro ?? "Erro ao gerar rascunho");

      const mudancas = dados.mudancas ?? [];
      const remocoes: ItemRascunho[] = mudancas
        .filter((m) => m.tipo === "removerWidget" && m.widgetTitle)
        .map((m) => ({ kind: "remocao", titulo: m.widgetTitle as string, selecionado: true }));
      const tiposSelecionados = new Set<Widget["type"]>();
      const novosWidgets: ItemRascunho[] = (dados.widgets ?? []).map((w) => {
        const selecionado = !tiposSelecionados.has(w.type);
        tiposSelecionados.add(w.type);
        return { kind: "widget", ref: w, selecionado };
      });
      const novosItens = [...remocoes, ...novosWidgets];
      const analises = mudancas.filter((m) => m.tipo === "analysisOnly");
      setItens(novosItens.length ? novosItens : null);
      setInfos(analises);
      if (!novosItens.length) {
        aviso(analises[0]?.descricao || "A IA não sugeriu uma alteração para esse pedido. Tente descrever o que deseja filtrar ou mostrar.", "info", "Nenhuma sugestão");
      }
    } catch (err) {
      aviso(err instanceof Error ? err.message : "Erro ao gerar rascunho", "error");
    } finally {
      setCarregando(false);
    }
  }

  function alternarItem(idx: number) {
    if (!itens) return;
    const alvo = itens[idx];
    setItens(itens.map((item, i) => {
      if (i === idx) return { ...item, selecionado: !item.selecionado };
      if (alvo.kind === "widget" && !alvo.selecionado && item.kind === "widget" && item.ref.type === alvo.ref.type) {
        return { ...item, selecionado: false };
      }
      return item;
    }));
  }

  async function aprovarRascunho() {
    if (!itens) return;
    const selecionados = itens.filter((i) => i.selecionado);
    if (!selecionados.length) {
      aviso("Nenhum item do rascunho está marcado pra aplicar.", "error", "Nada selecionado");
      return;
    }
    let atualizados = widgets.slice();
    selecionados
      .filter((i): i is { kind: "remocao"; titulo: string; selecionado: boolean } => i.kind === "remocao")
      .forEach((i) => {
        atualizados = removerWidgetPorTitulo(atualizados, i.titulo);
      });
    const adicoes = selecionados
      .filter((i): i is { kind: "widget"; ref: Widget; selecionado: boolean } => i.kind === "widget")
      .map((i) => i.ref);
    atualizados = mesclarWidgets(atualizados, adicoes);
    const ordenacaoLista = selecionados.find((i): i is Extract<ItemRascunho, { kind: "lista" }> => i.kind === "lista");
    if (ordenacaoLista) {
      localStorage.setItem(`lowcodeduo_ordem_lista_${projetoId}`, JSON.stringify({ coluna: ordenacaoLista.coluna, direcao: ordenacaoLista.direcao }));
      window.dispatchEvent(new Event("lowcodeduo:ordem-lista"));
    }
    if (selecionados.some((i) => i.kind === "filtro")) {
      localStorage.setItem(`lowcodeduo_filtros_tabela_${projetoId}`, "true");
      window.dispatchEvent(new Event("lowcodeduo:filtros-tabela"));
    }
    const pedidoLancamento = selecionados.find((i): i is Extract<ItemRascunho, { kind: "lancamento" }> => i.kind === "lancamento");
    if (pedidoLancamento) {
      localStorage.setItem(`lowcodeduo_novo_lancamento_${projetoId}`, String(pedidoLancamento.habilitar));
      window.dispatchEvent(new Event("lowcodeduo:novo-lancamento"));
    }

    setWidgets(atualizados);
    salvarAIConfig(projetoId, { widgets: atualizados });

    try {
      await fetch("/api/projetos/publicar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projetoSlug, resumo: pedido, snapshot: capturarDashboard(projetoId, atualizados) }),
      });
    } catch {
      // publicação é cosmética (versão/pill) — não bloqueia o dashboard se falhar
    }

    setItens(null);
    setInfos([]);
    setPedido("");
    aviso("Rascunho aprovado e aplicado ao dashboard.", "success", "Aplicado");
    router.refresh();
  }

  function descartarRascunho() {
    setItens(null);
    setInfos([]);
  }

  if (!montado) return null;

  const itensSelecionados = itens?.filter((i) => i.selecionado) ?? [];
  const totalSelecionados = itens?.filter((i) => i.selecionado).length ?? 0;
  const totalGraficos = itensSelecionados.filter((i) => i.kind === "widget").length;
  const totalListas = itensSelecionados.filter((i) => i.kind === "lista").length;
  const totalFiltros = itensSelecionados.filter((i) => i.kind === "filtro").length;
  const totalLancamentos = itensSelecionados.filter((i) => i.kind === "lancamento").length;
  const totalRemocoes = totalSelecionados - totalGraficos - totalListas - totalFiltros - totalLancamentos;
  const apenasReordenacao = totalGraficos === 1 && totalRemocoes === 0 && itensSelecionados.some(
    (item) => item.kind === "widget" && widgets.some((w) => w.title === item.ref.title && w.sort !== item.ref.sort)
  );

  return (
    <>
      <OrganizadorDashboard
        projetoId={projetoId}
        modo={modo}
        relatorioGenerico={relatorioGenerico}
        widgets={widgets}
        widgetsRemovidos={widgetsRemovidos}
        onApply={aplicarOrganizacao}
      />
      {widgets.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {widgets.map((w) => (
            <WidgetCard
              key={w.title}
              titulo={w.title}
              tipo={w.type}
              grupos={computarGrupos(w)}
              formatValue={formatarValor(w)}
              ordenarPorChave={w.groupBy === "mes"}
              sort={w.sort}
              onRemover={() => removerWidget(w.title)}
            />
          ))}
        </div>
      )}
      {widgetsRemovidos.length > 0 && (
        <div className="mb-4 flex justify-end">
          <button type="button" onClick={restaurarWidgets} className="text-sm font-medium text-accent hover:underline">
            Restaurar gráficos ({widgetsRemovidos.length})
          </button>
        </div>
      )}

      <button
        onClick={() => setPainelAberto(true)}
        className="fixed bottom-6 right-6 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-2xl text-white shadow-[var(--shadow-elevated)] transition hover:brightness-110"
        title="Ajustar dashboard com IA"
      >
        <Sparkles size={24} />
      </button>

      {painelAberto && (
        <>
          <div
            className="fixed inset-0 z-30 bg-[rgba(18,21,28,0.3)]"
            onClick={() => setPainelAberto(false)}
          />
          <div className="fixed bottom-4 right-4 z-40 flex max-h-[calc(100vh-2rem)] w-[min(1040px,calc(100vw-2rem))] flex-col rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-elevated)] sm:bottom-6 sm:right-6">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Ajustar dashboard com IA</h3>
              <button
                onClick={() => setPainelAberto(false)}
                className="rounded-md px-1.5 py-0.5 text-text-faint hover:bg-surface-2"
              >
                <X size={18} />
              </button>
            </div>

            {modo === "generico" && relatorioGenerico && (
              <p className="mb-3 rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent">
                Esse relatório é de dados genéricos — a IA usa os nomes reais das colunas da sua planilha.
              </p>
            )}

            <div className="mb-3 overflow-y-auto">
              <textarea
                value={pedido}
                onChange={(e) => setPedido(e.target.value)}
                rows={3}
                placeholder="Ex: mostra um gráfico de pizza por categoria"
                className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
              />
              <button
                onClick={gerarRascunho}
                disabled={carregando}
                className="mt-2 w-full rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                {carregando ? <span className="inline-flex items-center gap-2"><LoaderCircle size={16} className="animate-spin" /> IA gerando retorno...</span> : "Gerar rascunho"}
              </button>

              {carregando && <p role="status" className="mt-2 text-center text-xs text-text-muted">Analisando seu pedido e preparando as sugestões</p>}

              {itens && (
                <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(240px,0.8fr)_minmax(0,1.2fr)]">
                  <div className="order-2 min-w-0">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <div className="text-xs font-semibold uppercase text-text-faint">Previa antes de aplicar</div>
                      <div className="text-xs text-text-muted">{totalSelecionados} selecionado(s)</div>
                    </div>
                    {itensSelecionados.length === 0 && (
                      <p className="text-sm text-text-muted">Selecione uma sugestao para ver o exemplo.</p>
                    )}
                    <div className="grid gap-3 sm:grid-cols-2">
                      {itensSelecionados.map((item, idx) => item.kind === "widget" ? (
                        <WidgetCard
                          key={`${item.ref.type}-${idx}`}
                          titulo={item.ref.title}
                          tipo={item.ref.type}
                          grupos={computarGrupos(item.ref)}
                          formatValue={formatarValor(item.ref)}
                          ordenarPorChave={item.ref.groupBy === "mes"}
                          sort={item.ref.sort}
                        />
                      ) : item.kind === "lancamento" ? (
                        <div key={`lancamento-${idx}`} className="rounded-lg border border-border bg-surface p-3 sm:col-span-2">
                          <div className="text-sm font-semibold">{item.habilitar ? "Novo lançamento no cabeçalho" : "Ocultar Novo lançamento"}</div>
                          <p className="mt-1 text-xs text-text-muted">{item.habilitar ? "Abre um formulário financeiro com data, descrição, categoria e valor." : "O botão será ocultado neste projeto; os lançamentos já salvos continuam."}</p>
                        </div>
                      ) : item.kind === "filtro" ? (
                        <div key={`filtro-${idx}`} className="rounded-lg border border-border bg-surface p-3 sm:col-span-2">
                          <div className="mb-2 text-sm font-semibold">Filtros na tabela</div>
                          <div className="grid gap-2 text-xs text-text-muted sm:grid-cols-2">
                            <div className="rounded border border-border bg-surface-2 px-3 py-2">Buscar em todas as colunas</div>
                            {(relatorioGenerico?.colunas ?? []).filter((c) => c.tipo === "texto" && !/email|e-mail/i.test(c.nome)).slice(0, 3).map((c) => (
                              <div key={c.nome} className="rounded border border-border bg-surface-2 px-3 py-2">{c.nome}: Todos</div>
                            ))}
                          </div>
                        </div>
                      ) : item.kind === "lista" ? (
                        <div key={`lista-${idx}`} className="rounded-lg border border-border bg-surface p-3 sm:col-span-2">
                          <div className="mb-2 text-sm font-semibold">Dados importados · {item.coluna} ({item.direcao === "asc" ? "crescente" : "decrescente"})</div>
                          <div className="space-y-1 text-xs text-text-muted">
                            {[...(relatorioGenerico?.linhas ?? [])]
                              .sort((a, b) => String(a[item.coluna] ?? "").localeCompare(String(b[item.coluna] ?? ""), "pt-BR", { numeric: true }) * (item.direcao === "asc" ? 1 : -1))
                              .slice(0, 5)
                              .map((linha, i) => <div key={i}>{String(linha[item.coluna] ?? "")}</div>)}
                          </div>
                        </div>
                      ) : (
                        <div key={`remocao-${idx}`} className="rounded-lg border border-danger bg-danger-soft px-3 py-3">
                          <div className="text-xs font-semibold uppercase text-danger">Sera removido</div>
                          <div className="font-semibold text-text">{item.titulo}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="order-1 space-y-2">
                    <div className="text-xs font-semibold uppercase text-text-faint">Sugestões</div>
                    {itens.map((item, idx) => (
                      <button
                        key={idx}
                        onClick={() => alternarItem(idx)}
                        aria-pressed={item.selecionado}
                        className={`block w-full rounded-lg border p-3 text-left text-sm transition ${
                          item.selecionado
                            ? "border-accent bg-accent-soft"
                            : "border-border bg-surface-2 opacity-60"
                        }`}
                      >
                        <div className="font-semibold">
                          {item.kind === "widget" ? item.ref.title : item.kind === "lancamento" ? (item.habilitar ? "Mostrar Novo lançamento" : "Ocultar Novo lançamento") : item.kind === "filtro" ? "Adicionar filtros à tabela" : item.kind === "lista" ? `Ordenar lista por ${item.coluna}` : `Remover: ${item.titulo}`}
                        </div>
                        <div className="text-xs text-text-muted">
                          {item.kind === "widget"
                            ? `${item.ref.type === "pie" ? "Pizza" : "Barras"} · agrupado por ${item.ref.groupBy}`
                            : item.kind === "lancamento" ? "Formulário financeiro opcional" : item.kind === "filtro" ? "Busca e filtros por coluna" : item.kind === "lista" ? (item.direcao === "asc" ? "Crescente" : "Decrescente") : "Esse gráfico será removido do dashboard"}
                        </div>
                        <div className="mt-1 text-xs font-semibold text-accent">
                          {item.selecionado
                            ? "Selecionado"
                            : item.kind === "widget" && itens.some((outro) => outro.kind === "widget" && outro.selecionado && outro.ref.type === item.ref.type)
                              ? "Selecionar e substituir"
                              : "Selecionar"}
                        </div>
                      </button>
                    ))}
                  </div>

                  {infos.map((m, i) => (
                    <p key={i} className="order-3 rounded-lg bg-surface-2 px-3 py-2 text-xs text-text-muted lg:col-span-2">
                      {m.descricao || m.titulo}
                    </p>
                  ))}

                  <div className="order-4 flex justify-end gap-2 lg:col-span-2">
                    <button
                      onClick={descartarRascunho}
                      className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm font-semibold text-text hover:bg-surface-3"
                    >
                      Descartar
                    </button>
                    <button
                      onClick={aprovarRascunho}
                      disabled={totalSelecionados === 0}
                      className="rounded-lg bg-live px-3 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {totalSelecionados === 0
                        ? "Selecione uma sugestão"
                        : totalLancamentos
                          ? "Aplicar no projeto"
                        : totalFiltros
                          ? "Adicionar filtros à tabela"
                        : totalListas
                          ? "Aplicar ordenação da lista"
                          : apenasReordenacao
                          ? "Aplicar ordenação"
                          : totalGraficos && totalRemocoes
                          ? `Adicionar ${totalGraficos} gráfico(s) e remover ${totalRemocoes}`
                          : totalGraficos
                            ? `Adicionar ${totalGraficos} gráfico(s)`
                            : `Remover ${totalRemocoes} gráfico(s)`}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
