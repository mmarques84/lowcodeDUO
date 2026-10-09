"use client";

import { useState } from "react";
import { Check, Copy, FileText, Pencil, RotateCcw } from "lucide-react";
import type { ConfiguracaoAnalise } from "@/lib/configuracaoAnalise";
import type { ColunaInfo } from "@/lib/planilha";
import { descreverCalculo, gerarPromptAnalise } from "@/lib/promptAnalise";
import { aplicarPrompt } from "@/lib/aplicarPrompt";
import { useAviso } from "@/components/aviso/AvisoProvider";

export default function PromptAnaliseView({ config, colunas, onChange }: { config: ConfiguracaoAnalise; colunas: ColunaInfo[]; onChange: (config: ConfiguracaoAnalise) => void }) {
  const { aviso } = useAviso();
  const automatico = gerarPromptAnalise(config, colunas);
  const personalizado = config.promptPersonalizado;
  const prompt = personalizado?.texto ?? automatico;
  const configuracaoMudou = !!personalizado && personalizado.base !== automatico;
  const interpretacaoAtual = personalizado ? aplicarPrompt(config, colunas) : null;
  const [copiado, setCopiado] = useState<string | null>(null);
  const [errosInterpretacao, setErrosInterpretacao] = useState<string[]>([]);
  function interpretar() {
    const resultado = aplicarPrompt(config, colunas);
    setErrosInterpretacao(resultado.erros);
    if (!resultado.erros.length) { onChange(resultado.config); aviso("Prompt interpretado. Confira a configuração e aplique para atualizar o painel.", "success"); }
  }
  async function copiar() {
    if (!prompt.trim()) { aviso("Preencha o prompt antes de copiar.", "error"); return; }
    try { await navigator.clipboard.writeText(prompt); setCopiado(prompt); }
    catch { aviso("Não foi possível copiar automaticamente. Selecione o texto do prompt e copie.", "error"); }
  }
  return <section className="space-y-4">
    <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-semibold"><FileText size={17} className="text-accent" />Seu prompt de análise</div><button type="button" onClick={copiar} className="flex shrink-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium hover:bg-surface-2">{copiado === prompt ? <Check size={16} /> : <Copy size={16} />}{copiado === prompt ? "Copiado" : "Copiar prompt"}</button></div>
    <div className="flex flex-wrap items-center justify-between gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${personalizado ? "bg-pending-soft text-pending" : "bg-accent-soft text-accent"}`}>{personalizado ? "Prompt personalizado" : "Prompt automático"}</span>{personalizado ? <button type="button" onClick={() => onChange({ ...config, promptPersonalizado: undefined })} className="flex items-center gap-1.5 text-sm text-accent hover:underline"><RotateCcw size={15} />Restaurar automático</button> : <button type="button" onClick={() => onChange({ ...config, promptPersonalizado: { texto: automatico, base: automatico } })} className="flex items-center gap-1.5 text-sm font-medium text-accent hover:underline"><Pencil size={15} />Editar prompt</button>}</div>
    <p className="text-sm leading-relaxed text-text-muted">{personalizado ? "Edite as seções CÁLCULO, PERÍODO E FILTROS ou ENTREGA. Ao aplicar, essas instruções atualizam os campos e os resultados do painel." : "Este texto acompanha suas escolhas. Você pode editar as regras para atualizar a análise ou copiar para usar em outra IA."}</p>
    {configuracaoMudou && <p role="status" className="rounded-lg bg-pending-soft p-3 text-sm text-pending">A configuração mudou desde a personalização. Confira abas, colunas, cálculo e filtros no seu texto, ou restaure o prompt automático.</p>}
    <textarea aria-label={personalizado ? "Prompt personalizado" : "Prompt gerado"} readOnly={!personalizado} value={prompt} onChange={(e) => { setErrosInterpretacao([]); onChange({ ...config, promptPersonalizado: { ...personalizado, texto: e.target.value, base: personalizado?.base ?? automatico } }); }} maxLength={30000} rows={22} spellCheck={false} className="w-full resize-y rounded-xl border border-border bg-surface-2/50 p-4 font-mono text-xs leading-6 text-text outline-none focus:border-accent" />
    {personalizado && <button type="button" onClick={interpretar} className="rounded-lg border border-accent/30 bg-accent-soft px-3 py-2 text-sm font-semibold text-accent">Interpretar e conferir configuração</button>}
    {interpretacaoAtual && !interpretacaoAtual.erros.length && <p className="rounded-lg bg-live-soft p-3 text-sm text-live">Ao aplicar: {descreverCalculo(interpretacaoAtual.config)} · {interpretacaoAtual.config.filtros.length} filtro(s).</p>}
    {errosInterpretacao.length > 0 && <div role="alert" className="rounded-lg bg-pending-soft p-3 text-sm text-pending">{errosInterpretacao.map((erro) => <p key={erro} className="mb-2 last:mb-0">{erro}</p>)}</div>}
    <p className="text-xs leading-relaxed text-text-muted">O painel reconhece as regras no formato deste modelo. Instruções livres ou cálculos ainda não suportados precisam ser ajustados antes de aplicar. Não há envio automático à IA.</p>
  </section>;
}
