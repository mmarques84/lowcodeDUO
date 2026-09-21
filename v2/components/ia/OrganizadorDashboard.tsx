"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, LayoutGrid, X } from "lucide-react";
import type { Widget } from "@/lib/widgets";
import { calcularPreviaGenerica } from "@/lib/planilha";
import type { RelatorioGenerico } from "@/lib/relatorioGenerico";
import { useAviso } from "@/components/aviso/AvisoProvider";

type Item = { id: string; titulo: string; grupo: "ia" | "relatorio"; visivel: boolean; widget?: Widget };

export default function OrganizadorDashboard({
  projetoId, modo, relatorioGenerico, widgets, widgetsRemovidos, onApply,
}: {
  projetoId: number;
  modo: "financeiro" | "generico";
  relatorioGenerico?: RelatorioGenerico | null;
  widgets: Widget[];
  widgetsRemovidos: Widget[];
  onApply: (visiveis: Widget[], ocultos: Widget[]) => Promise<void>;
}) {
  const [aberto, setAberto] = useState(false);
  const [itens, setItens] = useState<Item[]>([]);
  const [salvando, setSalvando] = useState(false);
  const { aviso } = useAviso();

  function abrir() {
    let ocultos: string[] = [];
    let ordem: string[] = [];
    try { ocultos = JSON.parse(localStorage.getItem(`lowcodeduo_cards_ocultos_${projetoId}`) ?? "[]"); } catch {}
    try { ordem = JSON.parse(localStorage.getItem(`lowcodeduo_ordem_cards_${projetoId}`) ?? "[]"); } catch {}
    if (!Array.isArray(ocultos)) ocultos = [];
    if (!Array.isArray(ordem)) ordem = [];
    const previa = relatorioGenerico ? calcularPreviaGenerica(relatorioGenerico.colunas, relatorioGenerico.linhas, "") : null;

    const base: Item[] = modo === "financeiro"
      ? [
          { id: "financeiro-entradas", titulo: "Entradas", grupo: "relatorio", visivel: true },
          { id: "financeiro-saidas", titulo: "Saídas", grupo: "relatorio", visivel: true },
          { id: "financeiro-saldo", titulo: "Saldo", grupo: "relatorio", visivel: true },
          { id: "financeiro-lancamentos", titulo: "Lançamentos", grupo: "relatorio", visivel: true },
        ]
      : [
          ...(previa ? previa.kpis.map((k, i) => ({ id: `generico-kpi-${i}`, titulo: k.label, grupo: "relatorio" as const, visivel: true })) : []),
          ...(previa?.grafico ? [{ id: "generico-grafico", titulo: previa.grafico.titulo, grupo: "relatorio" as const, visivel: true }] : []),
          ...(relatorioGenerico ? [{ id: "generico-dados", titulo: "Dados importados", grupo: "relatorio" as const, visivel: true }] : []),
        ];
    const padrao = new Map(base.map((item, i) => [item.id, i]));
    base.sort((a, b) => (ordem.indexOf(a.id) < 0 ? padrao.get(a.id)! : ordem.indexOf(a.id)) - (ordem.indexOf(b.id) < 0 ? padrao.get(b.id)! : ordem.indexOf(b.id)));
    const todosWidgets = [...widgets, ...widgetsRemovidos.filter((w) => !widgets.some((atual) => atual.title === w.title))];
    setItens([
      ...todosWidgets.map((w) => ({ id: `ia:${w.title}`, titulo: w.title, grupo: "ia" as const, visivel: widgets.some((atual) => atual.title === w.title), widget: w })),
      ...base.map((item) => ({ ...item, visivel: !ocultos.includes(item.id) })),
    ]);
    setAberto(true);
  }

  function mover(index: number, delta: number) {
    const destino = index + delta;
    if (destino < 0 || destino >= itens.length || itens[index].grupo !== itens[destino].grupo) return;
    const novos = itens.slice();
    [novos[index], novos[destino]] = [novos[destino], novos[index]];
    setItens(novos);
  }

  async function aplicar() {
    setSalvando(true);
    const chaveOcultos = `lowcodeduo_cards_ocultos_${projetoId}`;
    const chaveOrdem = `lowcodeduo_ordem_cards_${projetoId}`;
    const antigosOcultos = localStorage.getItem(chaveOcultos);
    const antigaOrdem = localStorage.getItem(chaveOrdem);
    try {
      const visiveis = itens.filter((i) => i.grupo === "ia" && i.visivel).map((i) => i.widget!);
      const ocultos = itens.filter((i) => i.grupo === "ia" && !i.visivel).map((i) => i.widget!);
      localStorage.setItem(chaveOcultos, JSON.stringify(itens.filter((i) => i.grupo === "relatorio" && !i.visivel).map((i) => i.id)));
      localStorage.setItem(chaveOrdem, JSON.stringify(itens.filter((i) => i.grupo === "relatorio").map((i) => i.id)));
      await onApply(visiveis, ocultos);
      window.dispatchEvent(new Event("lowcodeduo:cards-layout"));
      setAberto(false);
    } catch (erro) {
      if (antigosOcultos === null) localStorage.removeItem(chaveOcultos);
      else localStorage.setItem(chaveOcultos, antigosOcultos);
      if (antigaOrdem === null) localStorage.removeItem(chaveOrdem);
      else localStorage.setItem(chaveOrdem, antigaOrdem);
      aviso(erro instanceof Error ? erro.message : "Erro ao salvar layout", "error");
    } finally { setSalvando(false); }
  }

  const visiveis = itens.filter((i) => i.visivel);
  const duplicados = new Set(itens.filter((i) => i.visivel && itens.some((outro) => outro !== i && outro.visivel && outro.titulo.toLocaleLowerCase("pt-BR") === i.titulo.toLocaleLowerCase("pt-BR"))).map((i) => i.id));

  return (
    <>
      <button type="button" onClick={abrir} className="mb-3 inline-flex items-center gap-2 rounded border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:bg-surface-2">
        <LayoutGrid size={16} /> Organizar dashboard
      </button>
      {aberto && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(18,21,28,0.38)] p-4">
          <div role="dialog" aria-modal="true" aria-label="Organizar dashboard" className="flex max-h-[90vh] w-full max-w-4xl flex-col rounded-lg border border-border bg-surface p-5 shadow-[var(--shadow-elevated)]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold">Organizar dashboard</h2>
              <button type="button" onClick={() => setAberto(false)} title="Fechar" aria-label="Fechar" className="rounded p-1 text-text-faint hover:bg-surface-2"><X size={18} /></button>
            </div>
            <div className="grid min-h-0 flex-1 gap-5 overflow-y-auto md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)]">
              <div className="space-y-2">
                {itens.map((item, index) => (
                  <div key={item.id} className={`flex items-center gap-2 rounded border px-3 py-2 ${item.visivel ? "border-border" : "border-border bg-surface-2 text-text-muted"}`}>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium">{item.titulo}</div>
                      <div className="text-xs text-text-faint">{item.grupo === "ia" ? "Gráfico da IA" : "Card do relatório"}{duplicados.has(item.id) ? " · Possível duplicata" : ""}</div>
                    </div>
                    <button type="button" onClick={() => mover(index, -1)} disabled={index === 0 || itens[index - 1].grupo !== item.grupo} title="Mover para cima" aria-label={`Mover ${item.titulo} para cima`} className="rounded p-1 hover:bg-surface-2 disabled:opacity-30"><ArrowUp size={16} /></button>
                    <button type="button" onClick={() => mover(index, 1)} disabled={index === itens.length - 1 || itens[index + 1].grupo !== item.grupo} title="Mover para baixo" aria-label={`Mover ${item.titulo} para baixo`} className="rounded p-1 hover:bg-surface-2 disabled:opacity-30"><ArrowDown size={16} /></button>
                    <button type="button" onClick={() => setItens(itens.map((atual, i) => i === index ? { ...atual, visivel: !atual.visivel } : atual))} title={item.visivel ? "Ocultar" : "Mostrar"} aria-label={`${item.visivel ? "Ocultar" : "Mostrar"} ${item.titulo}`} className="rounded p-1 hover:bg-surface-2">{item.visivel ? <Eye size={16} /> : <EyeOff size={16} />}</button>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase text-text-faint">Prévia do layout</h3>
                <div className="space-y-1 border-t border-border">
                  {visiveis.map((item, index) => <div key={item.id} className="flex gap-3 border-b border-border py-2 text-sm"><span className="w-5 text-text-faint">{index + 1}</span><span>{item.titulo}</span></div>)}
                  {visiveis.length === 0 && <p className="py-3 text-sm text-text-muted">Nenhum card visível.</p>}
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
              <button type="button" onClick={() => setAberto(false)} className="rounded border border-border px-3 py-2 text-sm font-medium">Cancelar</button>
              <button type="button" onClick={aplicar} disabled={salvando} className="rounded bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">{salvando ? "Salvando..." : "Aplicar layout"}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
