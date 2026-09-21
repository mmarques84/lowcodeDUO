"use client";

import { useState, type ReactNode } from "react";
import { Eye, LoaderCircle, X } from "lucide-react";
import { useAviso } from "@/components/aviso/AvisoProvider";
import RestaurarVersao from "@/components/RestaurarVersao";
import WidgetCard from "@/components/ia/WidgetCard";
import type { Lancamento } from "@/lib/lancamentos";
import type { RelatorioGenerico } from "@/lib/relatorioGenerico";
import { isDashboardSnapshot, type DashboardSnapshot } from "@/lib/dashboardSnapshot";
import { calcularPreviaGenerica } from "@/lib/planilha";
import { agregarWidget, agregarWidgetGenerico, formatarValorFinanceiro, formatarValorGenerico } from "@/lib/widgets";

export default function VisualizarVersao({
  projetoId, projetoSlug, versao, atual, lancamentos, relatorioGenerico,
}: {
  projetoId: number;
  projetoSlug: string;
  versao: number;
  atual: boolean;
  lancamentos: Lancamento[];
  relatorioGenerico: RelatorioGenerico | null;
}) {
  const { aviso } = useAviso();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function abrir() {
    setCarregando(true);
    try {
      const params = new URLSearchParams({ projetoSlug, versao: String(versao) });
      const resposta = await fetch(`/api/projetos/versao?${params}`);
      const dados = await resposta.json();
      if (!resposta.ok || !isDashboardSnapshot(dados.snapshot)) throw new Error(dados.erro ?? "Prévia indisponível.");
      setSnapshot(dados.snapshot);
      setAberto(true);
    } catch (erro) {
      aviso(erro instanceof Error ? erro.message : "Erro ao carregar versão", "error");
    } finally { setCarregando(false); }
  }

  const previa = relatorioGenerico ? calcularPreviaGenerica(relatorioGenerico.colunas, relatorioGenerico.linhas, "") : null;
  const linhasPrevia = relatorioGenerico ? [...relatorioGenerico.linhas] : [];
  if (snapshot?.listOrder) {
    const { coluna, direcao } = snapshot.listOrder;
    linhasPrevia.sort((a, b) => String(a[coluna] ?? "").localeCompare(String(b[coluna] ?? ""), "pt-BR", { numeric: true }) * (direcao === "asc" ? 1 : -1));
  }
  const entradas = lancamentos.filter((l) => l.tipo === "entrada").reduce((total, l) => total + l.valor, 0);
  const saidas = lancamentos.filter((l) => l.tipo === "saida").reduce((total, l) => total + l.valor, 0);
  const base: { id: string; titulo: string; conteudo: ReactNode; largo?: boolean }[] = relatorioGenerico ? [
    ...(previa?.kpis.map((k, i) => ({ id: `generico-kpi-${i}`, titulo: k.label, conteudo: <strong className="text-xl tabular-nums">{k.valor}</strong> })) ?? []),
    ...(previa?.grafico ? [{
      id: "generico-grafico", titulo: previa.grafico.titulo, largo: true,
      conteudo: <div className="space-y-1.5">{previa.grafico.barras.map((b) => <div key={b.chave} className="grid grid-cols-[minmax(80px,1fr)_2fr_auto] items-center gap-2 text-xs"><span className="truncate">{b.chave}</span><span className="h-2 rounded-full bg-surface-3"><span className="block h-2 rounded-full bg-accent" style={{ width: `${b.pct}%` }} /></span><span>{b.valor.toLocaleString("pt-BR")}</span></div>)}</div>,
    }] : []),
    { id: "generico-dados", titulo: "Dados importados", largo: true, conteudo: <div className="overflow-x-auto"><table className="w-full text-xs"><thead><tr>{relatorioGenerico.colunas.map((c) => <th key={c.nome} className="border-b border-border px-2 py-1 text-left">{c.nome}</th>)}</tr></thead><tbody>{linhasPrevia.slice(0, 5).map((linha, i) => <tr key={i}>{relatorioGenerico.colunas.map((c) => <td key={c.nome} className="border-b border-border px-2 py-1">{String(linha[c.nome] ?? "")}</td>)}</tr>)}</tbody></table></div> },
  ] : [
    { id: "financeiro-entradas", titulo: "Entradas", conteudo: <strong className="text-xl tabular-nums">{formatarValorFinanceiro(entradas)}</strong> },
    { id: "financeiro-saidas", titulo: "Saídas", conteudo: <strong className="text-xl tabular-nums">{formatarValorFinanceiro(saidas)}</strong> },
    { id: "financeiro-saldo", titulo: "Saldo", conteudo: <strong className="text-xl tabular-nums">{formatarValorFinanceiro(entradas - saidas)}</strong> },
    { id: "financeiro-lancamentos", titulo: "Lançamentos", largo: true, conteudo: <div className="space-y-1 text-xs">{lancamentos.slice(0, 5).map((l) => <div key={l.id} className="flex justify-between border-b border-border py-1"><span>{l.descricao}</span><span>{formatarValorFinanceiro(l.valor)}</span></div>)}</div> },
  ];
  const visiveis = snapshot ? base.filter((item) => !snapshot.hiddenCards.includes(item.id)).sort((a, b) => {
    const primeiro = snapshot.cardOrder.indexOf(a.id);
    const segundo = snapshot.cardOrder.indexOf(b.id);
    return (primeiro < 0 ? base.indexOf(a) : primeiro) - (segundo < 0 ? base.indexOf(b) : segundo);
  }) : [];

  return (
    <>
      <button type="button" onClick={abrir} disabled={carregando} className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-2 disabled:opacity-50">
        {carregando ? <LoaderCircle size={14} className="animate-spin" /> : <Eye size={14} />} Visualizar
      </button>
      {aberto && snapshot && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(18,21,28,0.4)] p-3 sm:p-6" onClick={() => setAberto(false)}>
          <div role="dialog" aria-modal="true" aria-label={`Prévia da versão ${versao}`} onClick={(e) => e.stopPropagation()} className="flex max-h-[92vh] w-full max-w-5xl flex-col rounded-lg bg-bg shadow-[var(--shadow-elevated)]">
            <header className="flex items-start justify-between gap-3 border-b border-border bg-surface p-4">
              <div><h2 className="text-base font-semibold">Prévia da v{versao}{atual ? " · versão atual" : ""}</h2><p className="mt-1 text-xs text-text-muted">Layout salvo nesta versão. Os números usam os dados atuais do projeto.</p></div>
              <button type="button" onClick={() => setAberto(false)} title="Fechar prévia" aria-label="Fechar prévia" className="rounded p-1 text-text-faint hover:bg-surface-2"><X size={18} /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {snapshot.widgets.map((w, i) => <WidgetCard key={`${w.title}-${i}`} titulo={w.title} tipo={w.type} grupos={relatorioGenerico ? agregarWidgetGenerico(relatorioGenerico.linhas, w) : agregarWidget(lancamentos, w)} formatValue={relatorioGenerico ? (v) => formatarValorGenerico(v, w) : formatarValorFinanceiro} ordenarPorChave={w.groupBy === "mes"} sort={w.sort} />)}
              </div>
              <div className={`mt-3 grid grid-cols-1 gap-3 ${relatorioGenerico ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
                {visiveis.map((item) => <div key={item.id} className={`rounded-lg border border-border bg-surface p-4 ${item.largo ? relatorioGenerico ? "sm:col-span-4" : "sm:col-span-3" : ""}`}><h3 className="mb-2 text-xs font-semibold text-text-muted">{item.titulo}</h3>{item.conteudo}</div>)}
              </div>
              {snapshot.filtersEnabled && <p className="mt-3 text-xs text-text-muted">Filtros da tabela: ativados</p>}
              {snapshot.newEntryEnabled && <p className="mt-1 text-xs text-text-muted">Novo lançamento: ativado</p>}
            </div>
            <footer className="flex justify-end gap-2 border-t border-border bg-surface p-4">
              <button type="button" onClick={() => setAberto(false)} className="rounded border border-border px-3 py-2 text-sm font-medium">Fechar</button>
              {!atual && <RestaurarVersao projetoId={projetoId} projetoSlug={projetoSlug} versao={versao} />}
            </footer>
          </div>
        </div>
      )}
    </>
  );
}
