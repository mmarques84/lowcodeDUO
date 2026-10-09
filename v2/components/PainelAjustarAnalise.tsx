"use client";

import { useEffect, useId, useRef, useState } from "react";
import { FileText, SlidersHorizontal, X } from "lucide-react";
import ConfiguracaoAnaliseGrid from "@/components/ConfiguracaoAnaliseGrid";
import PromptAnaliseView from "@/components/PromptAnaliseView";
import { executarAnalise, type ConfiguracaoAnalise } from "@/lib/configuracaoAnalise";
import type { ColunaInfo, LinhaPlanilha } from "@/lib/planilha";

export default function PainelAjustarAnalise({ config, onChange, colunas, linhas, erros, onFechar, onAplicar, onSugerir, abaInicial = "ajustes", alterado }: {
  config: ConfiguracaoAnalise;
  onChange: (config: ConfiguracaoAnalise) => void;
  colunas: ColunaInfo[];
  linhas: LinhaPlanilha[];
  erros: string[];
  onFechar: () => void;
  onAplicar: () => void;
  onSugerir: () => void;
  abaInicial?: "ajustes" | "prompt";
  alterado: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [aba, setAba] = useState(abaInicial);
  const previa = executarAnalise(config, linhas);
  useEffect(() => {
    const elemento = dialog.current;
    if (elemento && !elemento.open) elemento.showModal();
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = overflowAnterior; };
  }, []);
  return <dialog ref={dialog} aria-labelledby={`${id}-titulo`} onClose={onFechar} onClick={(e) => {
    if (e.target !== e.currentTarget) return;
    const rect = e.currentTarget.getBoundingClientRect();
    if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) onFechar();
  }} className="fixed inset-y-0 right-0 left-auto m-0 hidden h-dvh max-h-none w-full max-w-none flex-col border-0 bg-bg p-0 text-text shadow-2xl backdrop:bg-slate-950/35 open:flex sm:w-[620px]">
    <header className="shrink-0 border-b border-border bg-surface px-5 py-5 sm:px-6"><div className="flex items-start justify-between gap-4"><div><p className="mb-1 text-xs font-semibold uppercase tracking-wider text-accent">Sua análise, do seu jeito</p><h2 id={`${id}-titulo`} className="text-xl font-semibold">Ajustar análise</h2><p className="mt-2 text-sm text-text-muted">Confira as regras e veja o prompt que elas geram.</p></div><button type="button" onClick={onFechar} aria-label="Fechar ajustes" className="rounded-lg p-2 text-text-muted hover:bg-surface-2"><X size={20} /></button></div></header>
    <nav className="flex shrink-0 gap-2 border-b border-border bg-surface px-5 pt-2 sm:px-6" aria-label="Seções dos ajustes">{([['ajustes', 'Configuração', SlidersHorizontal], ['prompt', 'Ver prompt', FileText]] as const).map(([valor, titulo, Icone]) => <button key={valor} type="button" onClick={() => setAba(valor)} aria-pressed={aba === valor} className={`flex items-center gap-2 border-b-2 px-3 py-3 text-sm font-medium ${aba === valor ? "border-accent text-accent" : "border-transparent text-text-muted hover:text-text"}`}><Icone size={16} />{titulo}</button>)}</nav>
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{aba === "ajustes" ? <><ConfiguracaoAnaliseGrid config={config} onChange={onChange} colunas={colunas} erros={erros} compacto mostrarPrompt={false} /><div className="mt-4 rounded-xl border border-accent/20 bg-accent-soft/50 p-4"><p className="text-xs font-semibold uppercase tracking-wide text-accent">Prévia com suas escolhas</p><div className="mt-3 flex flex-wrap gap-6">{previa.previa.kpis.map((k) => <div key={k.label}><p className="text-xs text-text-muted">{k.label}</p><p className="mt-1 text-xl font-semibold tabular-nums">{k.valor}</p></div>)}</div><p className="mt-3 text-xs text-text-muted">{previa.resumo}</p></div><button type="button" onClick={onSugerir} className="mt-4 text-sm text-accent hover:underline">Restaurar sugestões da planilha</button></> : <><PromptAnaliseView config={config} colunas={colunas} onChange={onChange} />{erros.length > 0 && <p role="alert" className="mt-4 rounded-lg bg-pending-soft p-3 text-sm text-pending">{erros.join(" ")}</p>}</>}</div>
    <footer className="shrink-0 border-t border-border bg-surface p-4 sm:px-6"><p aria-live="polite" className="mb-3 text-xs text-text-muted">{alterado ? "Alterações pendentes. Aplique para atualizar o painel." : "Modelo salvo neste navegador, por projeto."}</p><div className="flex justify-end gap-2"><button type="button" onClick={onFechar} className="rounded-lg border border-border px-4 py-2.5 text-sm font-medium hover:bg-surface-2">{alterado ? "Descartar alterações" : "Fechar"}</button><button type="button" onClick={onAplicar} className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110">Aplicar alterações</button></div></footer>
  </dialog>;
}
