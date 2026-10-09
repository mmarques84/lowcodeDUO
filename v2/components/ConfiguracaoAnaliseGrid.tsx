"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown, Plus, SlidersHorizontal, Table2, Trash2 } from "lucide-react";
import type { ColunaInfo } from "@/lib/planilha";
import { ehTipoNumero } from "@/lib/planilha";
import type { ConfiguracaoAnalise } from "@/lib/configuracaoAnalise";
import PromptAnaliseView from "@/components/PromptAnaliseView";

const campo = "w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15";

export default function ConfiguracaoAnaliseGrid({ config, onChange, colunas, abas, onAbaChange, erros = [], compacto = false, mostrarPrompt = true }: {
  config: ConfiguracaoAnalise;
  onChange: (config: ConfiguracaoAnalise) => void;
  colunas: ColunaInfo[];
  abas?: { nome: string; linhas: number }[];
  onAbaChange?: (nome: string) => void;
  erros?: string[];
  compacto?: boolean;
  mostrarPrompt?: boolean;
}) {
  const [avancado, setAvancado] = useState(false);
  const id = useId();
  function alterar<K extends keyof ConfiguracaoAnalise>(chave: K, valor: ConfiguracaoAnalise[K]) {
    onChange({ ...config, [chave]: valor });
  }
  function linha(chave: string, titulo: string, ajuda: string, controle: ReactNode) {
    return <div className={`grid gap-3 border-b border-border px-5 py-5 last:border-0 ${compacto ? "" : "md:grid-cols-[210px_1fr]"}`}>
      <div><label htmlFor={`${id}-${chave}`} className="text-sm font-semibold">{titulo}</label><p className="mt-1 text-xs leading-relaxed text-text-muted">{ajuda}</p></div>
      <div className="min-w-0">{controle}</div>
    </div>;
  }
  function selecionar(chave: "medida" | "agruparPor" | "colunaData", titulo: string, opcoes: ColunaInfo[], vazio: string) {
    return <select id={`${id}-${chave}`} aria-label={titulo} value={config[chave]} onChange={(e) => alterar(chave, e.target.value)} className={campo}>
      <option value="">{vazio}</option>
      {config[chave] && !opcoes.some((c) => c.nome === config[chave]) && <option value={config[chave]}>⚠ {config[chave]} — confira esta coluna</option>}
      {opcoes.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}
    </select>;
  }
  return <section className="overflow-hidden rounded-2xl border border-border bg-surface shadow-[var(--shadow-soft)]">
    {!compacto && <header className="flex items-start gap-3 border-b border-border bg-accent-soft/40 px-5 py-5">
      <span className="rounded-xl bg-accent-soft p-2.5 text-accent"><SlidersHorizontal size={20} /></span>
      <div><h2 className="text-base font-semibold">Defina sua análise</h2><p className="mt-1 text-sm text-text-muted">As sugestões estão preenchidas. Confira o cálculo e ajuste o que precisar.</p></div>
    </header>}
    {linha("objetivo", "Nome ou objetivo da análise", "Identifica a análise e dá contexto ao prompt. Escolha o cálculo abaixo.", <input id={`${id}-objetivo`} value={config.objetivo} onChange={(e) => alterar("objetivo", e.target.value)} maxLength={1000} className={campo} placeholder="Ex.: vendas por categoria" />)}
    {linha("operacao", "O que vamos calcular?", "Esta escolha define os números do painel.", <div className="grid gap-3 sm:grid-cols-2"><select id={`${id}-operacao`} value={config.operacao} onChange={(e) => alterar("operacao", e.target.value as ConfiguracaoAnalise["operacao"])} className={campo}><option value="soma">Somar valores</option><option value="media">Calcular média</option><option value="contagem">Contar registros</option></select>{config.operacao !== "contagem" && selecionar("medida", "Coluna de valor", colunas.filter((c) => ehTipoNumero(c.tipo)), "Escolha a coluna de valor")}</div>)}
    {linha("agruparPor", "Como comparar?", "Separe o resultado por produto, categoria, pessoa ou outro campo.", selecionar("agruparPor", "Agrupar por", colunas, "Sem agrupamento"))}
    {linha("dados", "Dados utilizados", "Escolha uma aba e as colunas que aparecerão na tabela.", <div className="space-y-3">
      {abas && onAbaChange ? <label className="block text-xs text-text-muted">Aba da planilha<select aria-label="Aba da planilha" value={config.aba} onChange={(e) => onAbaChange(e.target.value)} className={`${campo} mt-1`}>
        {abas.map((a) => <option key={a.nome} value={a.nome} disabled={!a.linhas}>{a.nome} · {a.linhas} registros{!a.linhas ? " (vazia)" : ""}</option>)}
      </select><span className="mt-1 block">Cada análise utiliza uma aba, sem somar abas de resumo e dados.</span></label> : config.aba && <p className="flex items-center gap-2 text-sm text-text-muted"><Table2 size={15} />{config.aba}</p>}
      <fieldset id={`${id}-dados`}><legend className="sr-only">Colunas da tabela</legend><div className="flex flex-wrap gap-2">{colunas.map((c) => <label key={c.nome} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs transition ${config.colunas.includes(c.nome) ? "border-accent/30 bg-accent-soft text-accent" : "border-border text-text-muted"}`}>
        <input type="checkbox" checked={config.colunas.includes(c.nome)} onChange={(e) => alterar("colunas", e.target.checked ? [...config.colunas, c.nome] : config.colunas.filter((nome) => nome !== c.nome))} className="accent-accent" />{c.nome}
      </label>)}{config.colunas.filter((nome) => !colunas.some((c) => c.nome === nome)).map((nome) => <label key={nome} className="flex items-center gap-2 rounded-lg border border-pending/30 bg-pending-soft px-3 py-2 text-xs text-pending"><input type="checkbox" checked onChange={() => alterar("colunas", config.colunas.filter((c) => c !== nome))} />{nome} — ausente</label>)}</div></fieldset>
    </div>)}
    {linha("entregas", "Resultado desejado", "Selecione o que quer ver no painel.", <fieldset id={`${id}-entregas`} className="flex flex-wrap gap-3"><legend className="sr-only">Resultado desejado</legend>{([['indicadores', 'Indicadores'], ['grafico', 'Gráfico'], ['dados', 'Tabela de dados']] as const).map(([chave, titulo]) => <label key={chave} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"><input type="checkbox" checked={config.entregas[chave]} onChange={(e) => alterar("entregas", { ...config.entregas, [chave]: e.target.checked })} className="accent-accent" />{titulo}</label>)}</fieldset>)}
    <button type="button" onClick={() => setAvancado(!avancado)} aria-expanded={avancado} aria-controls={`${id}-avancado`} className="flex w-full items-center justify-between gap-3 border-t border-border px-5 py-4 text-left text-sm font-medium text-accent hover:bg-accent-soft/40"><span>Período, filtros e contexto <span className="mt-1 block text-xs font-normal text-text-muted">{config.filtros.length ? `${config.filtros.length} filtro(s)` : "Sem filtros"}{config.inicio || config.fim ? " · período definido" : " · todo o período"}</span></span><ChevronDown size={18} className={`shrink-0 transition ${avancado ? "rotate-180" : ""}`} /></button>
    <div id={`${id}-avancado`} hidden={!avancado} className="border-t border-border">
      {linha("assunto", "Assunto", "Um contexto livre: vendas, pessoas, projetos ou qualquer outro.", <input id={`${id}-assunto`} value={config.assunto} onChange={(e) => alterar("assunto", e.target.value)} maxLength={200} className={campo} />)}
      {linha("colunaData", "Período", "Sem datas preenchidas, todos os registros são considerados.", <div className="space-y-3">{selecionar("colunaData", "Coluna de data", colunas, "Escolha a coluna de data")}<div className="grid grid-cols-2 gap-3"><label className="text-xs text-text-muted">De<input type="date" value={config.inicio} onChange={(e) => alterar("inicio", e.target.value)} className={`${campo} mt-1`} /></label><label className="text-xs text-text-muted">Até<input type="date" value={config.fim} onChange={(e) => alterar("fim", e.target.value)} className={`${campo} mt-1`} /></label></div></div>)}
      {linha("filtros", "Regras e filtros", "Todas as condições devem ser atendidas. O arquivo original é preservado.", <div id={`${id}-filtros`} className="space-y-3">{config.filtros.map((f, i) => <div key={i} className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 p-3">
        <select aria-label={`Coluna do filtro ${i + 1}`} value={f.coluna} onChange={(e) => alterar("filtros", config.filtros.map((v, j) => j === i ? { ...v, coluna: e.target.value } : v))} className={`${campo} min-w-32 flex-1`}><option value="">Coluna</option>{f.coluna && !colunas.some((c) => c.nome === f.coluna) && <option value={f.coluna}>⚠ {f.coluna}</option>}{colunas.map((c) => <option key={c.nome}>{c.nome}</option>)}</select>
        <select aria-label={`Condição do filtro ${i + 1}`} value={f.operador} onChange={(e) => alterar("filtros", config.filtros.map((v, j) => j === i ? { ...v, operador: e.target.value as typeof f.operador } : v))} className={`${campo} min-w-32 flex-1`}><option value="igual">É igual a</option><option value="diferente">É diferente de</option><option value="contem">Contém</option></select>
        <input aria-label={`Valor do filtro ${i + 1}`} value={f.valor} onChange={(e) => alterar("filtros", config.filtros.map((v, j) => j === i ? { ...v, valor: e.target.value } : v))} placeholder="Valor" className={`${campo} min-w-32 flex-1`} />
        <button type="button" aria-label={`Remover filtro ${i + 1}`} onClick={() => alterar("filtros", config.filtros.filter((_, j) => j !== i))} className="rounded-lg p-2 text-text-muted hover:bg-danger-soft hover:text-danger"><Trash2 size={16} /></button>
      </div>)}<button type="button" onClick={() => alterar("filtros", [...config.filtros, { coluna: "", operador: "igual", valor: "" }])} className="flex items-center gap-1.5 text-sm font-medium text-accent"><Plus size={16} />Adicionar filtro</button></div>)}
    </div>
    {erros.length > 0 && <div role="alert" className="border-t border-border bg-pending-soft px-5 py-4 text-sm text-pending"><p className="font-semibold">Confira antes de gerar</p><ul className="mt-2 list-inside list-disc space-y-1">{erros.map((erro) => <li key={erro}>{erro}</li>)}</ul></div>}
    {mostrarPrompt && <details className="border-t border-border"><summary className="cursor-pointer px-5 py-4 text-sm font-medium text-accent">Ver e editar prompt</summary><div className="px-5 pb-5"><PromptAnaliseView config={config} colunas={colunas} onChange={onChange} /></div></details>}
  </section>;
}
