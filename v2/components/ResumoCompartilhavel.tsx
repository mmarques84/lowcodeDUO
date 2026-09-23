"use client";

import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown, FileDown, Printer, RotateCcw, Share2, Sparkles, Undo2 } from "lucide-react";
import type { ColunaDetectada } from "@/lib/relatorioGenerico";

type PeriodoTipo = "semana" | "mes" | "personalizado";
type ModoTela = "editar" | "visualizar";
type FonteResumo = "automatico" | "ia" | "editado";
type HistoricoResumo = { texto: string | null; fonte: FonteResumo } | null;

function dataIso(valor: unknown): string | null {
  if (typeof valor === "number" && valor > 20000 && valor < 100000) {
    return new Date(Date.UTC(1899, 11, 30) + valor * 86400000).toISOString().slice(0, 10);
  }
  const texto = String(valor ?? "").trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return null;
}

function isoLocal(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

function hojeIso() {
  return isoLocal(new Date());
}

function inicioSemanaHoje() {
  const data = new Date();
  data.setDate(data.getDate() - ((data.getDay() + 6) % 7));
  return isoLocal(data);
}

function inicioSemanaDe(dataIso: string) {
  const data = new Date(`${dataIso}T12:00:00`);
  if (Number.isNaN(data.getTime())) return inicioSemanaHoje();
  data.setDate(data.getDate() - ((data.getDay() + 6) % 7));
  return isoLocal(data);
}

function limiteMes(dataIso: string, fim = false) {
  const data = new Date(`${dataIso}T12:00:00`);
  if (Number.isNaN(data.getTime())) return hojeIso();
  data.setMonth(data.getMonth() + (fim ? 1 : 0), fim ? 0 : 1);
  return isoLocal(data);
}

function moverDias(data: string, dias: number) {
  const resultado = new Date(`${data}T12:00:00`);
  resultado.setDate(resultado.getDate() + dias);
  return isoLocal(resultado);
}

function formatarData(data: string, curto = false) {
  const valor = new Date(`${data}T12:00:00`);
  if (Number.isNaN(valor.getTime())) return data;
  return valor.toLocaleDateString("pt-BR", curto
    ? { day: "2-digit", month: "short" }
    : { day: "2-digit", month: "2-digit", year: "numeric" });
}

function moeda(valor: number) {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calcularFinanceiro(linhas: Record<string, unknown>[]) {
  return linhas.reduce<{ entradas: number; saidas: number }>((acc, linha) => {
    const valor = Number(linha.Valor) || 0;
    if (String(linha.Tipo).toLowerCase() === "entrada") acc.entradas += valor;
    if (String(linha.Tipo).toLowerCase() === "saida") acc.saidas += valor;
    return acc;
  }, { entradas: 0, saidas: 0 });
}

function ehNumero(tipo: string) {
  return tipo.normalize("NFD").replace(/[^a-zA-Z]/g, "").toLowerCase() === "numero";
}

function numeroPlanilha(valor: unknown) {
  const direto = Number(valor);
  if (Number.isFinite(direto)) return direto;
  const convertido = Number(String(valor ?? "").replace(/\./g, "").replace(",", "."));
  return Number.isFinite(convertido) ? convertido : null;
}

function dataMaisRecente(linhas: Record<string, unknown>[], coluna: string) {
  if (!coluna) return null;
  return linhas.reduce<string | null>((maisRecente, linha) => {
    const data = dataIso(linha[coluna]);
    return data && (!maisRecente || data > maisRecente) ? data : maisRecente;
  }, null);
}

function tituloPorConteudo(colunas: ColunaDetectada[], financeiro: boolean, projetoNome: string) {
  if (financeiro) return "Resumo financeiro";
  const nomes = `${projetoNome} ${colunas.map((coluna) => coluna.nome).join(" ")}`.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/curso|aluno|turma|disciplina|nota|matricula|professor|instrutor/.test(nomes)) return "Resumo acadêmico";
  if (/produto|estoque|sku|quantidade|fornecedor/.test(nomes)) return "Resumo de estoque";
  if (/cliente|lead|venda|oportunidade|contato/.test(nomes)) return "Resumo comercial";
  if (/paciente|consulta|atendimento|clinica|medico/.test(nomes)) return "Resumo de atendimentos";
  if (/tarefa|status|responsavel|projeto|prazo/.test(nomes)) return "Resumo operacional";
  return "Resumo da planilha";
}

export default function ResumoCompartilhavel({ projetoSlug, projetoNome, colunas, linhas }: {
  projetoSlug: string;
  projetoNome: string;
  colunas: ColunaDetectada[];
  linhas: Record<string, unknown>[];
}) {
  const datas = colunas.filter((coluna) => /data|date/i.test(coluna.nome) || coluna.tipo === "data");
  const temFinanceiro = colunas.some((coluna) => coluna.nome === "Valor") && colunas.some((coluna) => coluna.nome === "Tipo");
  const colunaDataInicial = datas[0]?.nome ?? "";
  const dataInicial = useMemo(() => dataMaisRecente(linhas, colunaDataInicial) ?? hojeIso(), [colunaDataInicial, linhas]);
  const [colunaData, setColunaData] = useState(colunaDataInicial);
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>("semana");
  const [dataReferencia, setDataReferencia] = useState(dataInicial);
  const [inicioPersonalizado, setInicioPersonalizado] = useState(() => inicioSemanaDe(dataInicial));
  const [fimPersonalizado, setFimPersonalizado] = useState(dataInicial);
  const [modo, setModo] = useState<ModoTela>("editar");
  const [textoResumo, setTextoResumo] = useState<string | null>(null);
  const [fonteResumo, setFonteResumo] = useState<FonteResumo>("automatico");
  const [historicoResumo, setHistoricoResumo] = useState<HistoricoResumo>(null);
  const [gerandoIA, setGerandoIA] = useState(false);
  const [erroIA, setErroIA] = useState<string | null>(null);
  const [exportarAberto, setExportarAberto] = useState(false);
  const [avisoCompartilhar, setAvisoCompartilhar] = useState<string | null>(null);
  const tituloResumo = tituloPorConteudo(colunas, temFinanceiro, projetoNome);

  const inicio = useMemo(() => {
    if (periodoTipo === "personalizado") return inicioPersonalizado;
    if (periodoTipo === "mes") return limiteMes(dataReferencia);
    const data = new Date(`${dataReferencia}T12:00:00`);
    if (Number.isNaN(data.getTime())) return dataReferencia;
    data.setDate(data.getDate() - ((data.getDay() + 6) % 7));
    return isoLocal(data);
  }, [dataReferencia, inicioPersonalizado, periodoTipo]);

  const fim = useMemo(() => {
    if (periodoTipo === "personalizado") return fimPersonalizado;
    if (periodoTipo === "mes") return limiteMes(dataReferencia, true);
    return moverDias(inicio, 6);
  }, [dataReferencia, fimPersonalizado, inicio, periodoTipo]);

  const periodoInvalido = inicio > fim;
  const analise = useMemo(() => {
    const filtrarPeriodo = (periodoInicio: string, periodoFim: string) => colunaData
      ? linhas.filter((linha) => {
        const data = dataIso(linha[colunaData]);
        return data !== null && data >= periodoInicio && data <= periodoFim;
      })
      : linhas;
    const selecionadas = periodoInvalido ? [] : filtrarPeriodo(inicio, fim);
    const duracao = Math.max(1, Math.round((new Date(`${fim}T12:00:00`).getTime() - new Date(`${inicio}T12:00:00`).getTime()) / 86400000) + 1);
    const fimAnterior = moverDias(inicio, -1);
    const inicioAnterior = moverDias(fimAnterior, -(duracao - 1));
    const anteriores = periodoInvalido || !colunaData ? [] : filtrarPeriodo(inicioAnterior, fimAnterior);
    const grupos = colunas
      .filter((coluna) => coluna.tipo === "texto" && !/nome|usuario|usuário|email|e-mail|telefone|cpf/i.test(coluna.nome))
      .slice(0, 2);
    const distribuicoes = grupos.map((grupo) => {
      const agrupados = selecionadas.reduce<Record<string, { total: number; valor: number }>>((acc, linha) => {
        const chave = String(linha[grupo.nome] ?? "").trim() || "Sem informação";
        acc[chave] ??= { total: 0, valor: 0 };
        acc[chave].total += 1;
        acc[chave].valor += Math.abs(Number(linha.Valor) || 0);
        return acc;
      }, {});
      return {
        nome: grupo.nome,
        valores: Object.entries(agrupados)
          .map(([nome, dados]) => ({ nome, ...dados, percentual: selecionadas.length ? dados.total / selecionadas.length * 100 : 0 }))
          .sort((a, b) => b.total - a.total)
          .slice(0, 8),
      };
    });
    const metricasNumericas = temFinanceiro ? [] : colunas
      .filter((coluna) => ehNumero(coluna.tipo) && !/\bid\b|codigo|código|cpf|cep|telefone|ano/i.test(coluna.nome))
      .slice(0, 2)
      .map((coluna) => {
        const valores = selecionadas.map((linha) => numeroPlanilha(linha[coluna.nome])).filter((valor): valor is number => valor !== null);
        const usarMedia = /nota|media|média|percent|taxa|idade|duracao|duração/i.test(coluna.nome);
        const total = valores.reduce((soma, valor) => soma + valor, 0);
        const resultado = usarMedia && valores.length ? total / valores.length : total;
        return {
          nome: coluna.nome,
          label: `${usarMedia ? "Média" : "Total"} de ${coluna.nome}`,
          valor: resultado.toLocaleString("pt-BR", { maximumFractionDigits: 1 }),
        };
      });
    const financeiroAtual = temFinanceiro ? calcularFinanceiro(selecionadas) : null;
    const financeiroAnterior = temFinanceiro && colunaData ? calcularFinanceiro(anteriores) : null;
    const saldo = financeiroAtual ? financeiroAtual.entradas - financeiroAtual.saidas : null;
    const saldoAnterior = financeiroAnterior ? financeiroAnterior.entradas - financeiroAnterior.saidas : null;
    return {
      selecionadas,
      distribuicoes,
      metricasNumericas,
      financeiroAtual,
      saldo,
      diferencaRegistros: selecionadas.length - anteriores.length,
      diferencaSaldo: saldo !== null && saldoAnterior !== null ? saldo - saldoAnterior : null,
    };
  }, [colunaData, colunas, fim, inicio, linhas, periodoInvalido, temFinanceiro]);
  const { selecionadas, distribuicoes, metricasNumericas, financeiroAtual, saldo, diferencaRegistros, diferencaSaldo } = analise;
  const principal = distribuicoes[0]?.valores[0];
  const metricaPrincipal = metricasNumericas[0];
  const resumoAutomatico = selecionadas.length
    ? `${colunaData ? `Entre ${formatarData(inicio)} e ${formatarData(fim)}` : "Na base importada"}, foram encontrados ${selecionadas.length} registro${selecionadas.length === 1 ? "" : "s"}.${financeiroAtual ? ` As entradas somaram ${moeda(financeiroAtual.entradas)}, as saídas ${moeda(financeiroAtual.saidas)} e o saldo do período foi ${moeda(saldo ?? 0)}.` : ""}${metricaPrincipal ? ` ${metricaPrincipal.label}: ${metricaPrincipal.valor}.` : ""}${principal ? ` Em ${distribuicoes[0].nome}, ${principal.nome} foi o item mais frequente, com ${principal.total} registro${principal.total === 1 ? "" : "s"}.` : ""}`
    : periodoInvalido
      ? "A data inicial precisa ser menor ou igual à data final."
      : "Nenhum registro foi encontrado no período selecionado.";
  const textoAtual = textoResumo ?? resumoAutomatico;

  function invalidarResumo() {
    setTextoResumo(null);
    setFonteResumo("automatico");
    setHistoricoResumo(null);
    setErroIA(null);
  }

  function limparFiltros() {
    setPeriodoTipo("semana");
    setDataReferencia(dataInicial);
    setInicioPersonalizado(inicioSemanaDe(dataInicial));
    setFimPersonalizado(dataInicial);
    setColunaData(colunaDataInicial);
    invalidarResumo();
  }

  function alterarColunaData(novaColuna: string) {
    const maisRecente = dataMaisRecente(linhas, novaColuna);
    setColunaData(novaColuna);
    if (maisRecente) {
      setDataReferencia(maisRecente);
      setInicioPersonalizado(inicioSemanaDe(maisRecente));
      setFimPersonalizado(maisRecente);
    }
    invalidarResumo();
  }

  function editarResumo(texto: string) {
    if (fonteResumo !== "editado") setHistoricoResumo({ texto: textoResumo, fonte: fonteResumo });
    setTextoResumo(texto);
    setFonteResumo("editado");
  }

  function desfazerResumo() {
    if (!historicoResumo) return;
    setTextoResumo(historicoResumo.texto);
    setFonteResumo(historicoResumo.fonte);
    setHistoricoResumo(null);
  }

  function usarAutomatico() {
    setHistoricoResumo({ texto: textoResumo, fonte: fonteResumo });
    setTextoResumo(null);
    setFonteResumo("automatico");
  }

  async function gerarComIA() {
    setGerandoIA(true);
    setErroIA(null);
    try {
      const resposta = await fetch("/api/ia/resumo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projetoSlug,
          periodo: { inicio, fim },
          registros: selecionadas.length,
          baseCompleta: linhas.length,
          distribuicoes: distribuicoes.filter((distribuicao) => distribuicao.valores.length).map((distribuicao) => ({
            nome: distribuicao.nome,
            valores: distribuicao.valores.map((item) => [item.nome, item.total]),
          })),
          valoresFinanceiros: financeiroAtual,
        }),
      });
      const dados = await resposta.json();
      if (!resposta.ok || !dados.resumo) {
        setErroIA(dados.erro ?? "Não consegui gerar o resumo com IA.");
        return;
      }
      setHistoricoResumo({ texto: textoResumo, fonte: fonteResumo });
      setTextoResumo(dados.resumo);
      setFonteResumo("ia");
    } catch {
      setErroIA("Não consegui falar com o serviço de IA.");
    } finally {
      setGerandoIA(false);
    }
  }

  async function compartilhar() {
    const conteudo = `${projetoNome}\n${tituloResumo}\n${colunaData ? `${formatarData(inicio)} a ${formatarData(fim)}` : "Base completa"}\n\n${textoAtual}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Resumo - ${projetoNome}`, text: conteudo });
        setAvisoCompartilhar("Resumo compartilhado");
      } else {
        await navigator.clipboard.writeText(conteudo);
        setAvisoCompartilhar("Resumo copiado");
      }
      window.setTimeout(() => setAvisoCompartilhar(null), 2500);
    } catch (erro) {
      if (erro instanceof DOMException && erro.name === "AbortError") return;
      setAvisoCompartilhar("Não foi possível compartilhar");
    }
  }

  const seloResumo = fonteResumo === "automatico" ? "Resumo automático" : fonteResumo === "ia" ? "Revisado por IA" : "Texto editado";

  return <div className="print-report w-full pb-10">
    <div className="print-hide relative z-20 border-b border-border bg-surface/95 md:sticky md:top-0 md:backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-3 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div className="min-w-0"><h1 className="truncate text-base font-bold sm:text-lg">{tituloResumo}</h1><p className="truncate text-xs text-text-muted sm:text-sm">{projetoNome}</p></div>
        <div className="grid grid-cols-[minmax(0,1fr)_44px_auto] items-center gap-2 sm:flex sm:flex-wrap">
          <div className="col-span-3 grid grid-cols-2 rounded-md border border-border bg-surface-2 p-1 sm:col-auto sm:min-w-48" aria-label="Modo da tela">
            {([['editar', 'Editar'], ['visualizar', 'Visualizar']] as const).map(([valor, rotulo]) => <button key={valor} type="button" onClick={() => setModo(valor)} className={`min-h-9 rounded px-3 text-sm font-semibold transition ${modo === valor ? "bg-surface text-text shadow-sm" : "text-text-muted hover:text-text"}`}>{rotulo}</button>)}
          </div>
          <button type="button" onClick={gerarComIA} disabled={gerandoIA || periodoInvalido} className="flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md border border-accent px-3 text-sm font-semibold text-accent transition hover:bg-accent-soft disabled:opacity-60 sm:flex-none"><Sparkles size={16} className="shrink-0" /> {gerandoIA ? "Gerando..." : fonteResumo === "ia" ? <><span className="sm:hidden">Regenerar</span><span className="hidden sm:inline">Gerar novamente</span></> : <><span className="sm:hidden">Melhorar IA</span><span className="hidden sm:inline">Melhorar com IA</span></>}</button>
          <button type="button" onClick={compartilhar} className="grid h-11 w-11 place-items-center rounded-md border border-border bg-surface text-text hover:bg-surface-2" title="Compartilhar resumo" aria-label="Compartilhar resumo"><Share2 size={17} /></button>
          <div className="relative">
            <button type="button" onClick={() => setExportarAberto((aberto) => !aberto)} className="flex min-h-11 items-center gap-2 rounded-md bg-accent px-3 text-sm font-semibold text-white hover:brightness-95" aria-expanded={exportarAberto}><FileDown size={17} /> Exportar <ChevronDown size={15} /></button>
            {exportarAberto && <div className="absolute right-0 top-12 z-30 w-56 rounded-md border border-border bg-surface p-1 shadow-lg"><button type="button" onClick={() => { setExportarAberto(false); window.print(); }} className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm hover:bg-surface-2"><Printer size={16} /> Imprimir ou salvar PDF</button></div>}
          </div>
        </div>
      </div>
    </div>

    <div className="mx-auto w-full max-w-6xl px-3 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      {avisoCompartilhar && <p role="status" className="print-hide mb-4 rounded-md bg-live-soft px-3 py-2 text-sm font-medium text-live">{avisoCompartilhar}</p>}
      {erroIA && <p role="alert" className="print-hide mb-4 rounded-md bg-danger-soft px-3 py-2 text-sm text-danger">{erroIA}</p>}

      {modo === "editar" && <section className="print-hide mb-6 border-b border-border pb-6" aria-label="Filtros do relatório">
        {datas.length > 0 ? <><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2 lg:col-span-1"><span className="mb-1 block text-xs font-medium text-text-muted">Período</span><div className="grid min-h-11 grid-cols-3 rounded-md border border-border bg-surface p-1">
              {([['semana', 'Semana'], ['mes', 'Mês'], ['personalizado', 'Personalizado']] as const).map(([valor, rotulo]) => <button key={valor} type="button" onClick={() => { setPeriodoTipo(valor); invalidarResumo(); }} className={`rounded px-2 text-xs font-semibold transition ${periodoTipo === valor ? "bg-accent text-white" : "text-text-muted hover:bg-surface-2 hover:text-text"}`}>{rotulo}</button>)}
            </div></div>
            {periodoTipo === "semana" && <label className="text-xs text-text-muted">Semana de referência<input type="date" value={dataReferencia} onChange={(evento) => { setDataReferencia(evento.target.value); invalidarResumo(); }} className="mt-1 block min-h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-text" /></label>}
            {periodoTipo === "personalizado" && <><label className="text-xs text-text-muted">Data inicial<input type="date" value={inicioPersonalizado} onChange={(evento) => { setInicioPersonalizado(evento.target.value); invalidarResumo(); }} className="mt-1 block min-h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-text" /></label><label className="text-xs text-text-muted">Data final<input type="date" value={fimPersonalizado} onChange={(evento) => { setFimPersonalizado(evento.target.value); invalidarResumo(); }} className="mt-1 block min-h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-text" /></label></>}
            <label className="text-xs text-text-muted">Coluna de data<select value={colunaData} onChange={(evento) => alterarColunaData(evento.target.value)} className="mt-1 block min-h-11 w-full rounded-md border border-border bg-surface px-3 text-sm text-text">{datas.map((coluna) => <option key={coluna.nome} value={coluna.nome}>{coluna.nome}</option>)}</select></label>
          </div>
          <button type="button" onClick={limparFiltros} className="flex min-h-11 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-semibold text-text-muted hover:bg-surface-2 hover:text-text"><RotateCcw size={16} /> Limpar filtros</button>
        </div>
        <p className="mt-4 flex items-center gap-2 text-sm font-medium text-text-muted"><CalendarDays size={16} /> {formatarData(inicio, true)} – {formatarData(fim, true)}</p>
        </> : <p className="text-sm text-text-muted">Esta planilha não possui coluna de data. O resumo considera todos os {linhas.length} registros importados.</p>}
      </section>}

      <article className="overflow-hidden rounded-md border border-slate-200 bg-white text-slate-950 shadow-sm">
        <header className="border-b-2 border-blue-700 px-4 py-5 sm:px-6 sm:py-7"><p className="truncate text-sm font-semibold text-blue-700">{projetoNome}</p><h2 className="mt-1 text-xl font-bold sm:text-2xl">{colunaData ? "Resumo do período" : "Resumo da base"}</h2><div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">{colunaData && <><span>{formatarData(inicio)} a {formatarData(fim)}</span><span aria-hidden="true">·</span></>}<span>{selecionadas.length} registro{selecionadas.length === 1 ? "" : "s"}</span></div></header>

        <section className={`grid gap-px border-b border-slate-200 bg-slate-200 ${(financeiroAtual || metricasNumericas.length) ? "grid-cols-2 lg:grid-cols-4" : "grid-cols-2"}`} aria-label="Indicadores do resumo">
          <div className="min-w-0 bg-white p-4 sm:p-6"><p className="text-[11px] font-medium uppercase text-slate-500 sm:text-xs">Registros</p><p className="mt-1 text-2xl font-bold sm:text-3xl">{selecionadas.length}</p>{colunaData && <p className={`mt-1 text-xs ${diferencaRegistros >= 0 ? "text-emerald-700" : "text-red-700"}`}>{diferencaRegistros >= 0 ? "+" : ""}{diferencaRegistros} vs. período anterior</p>}</div>
          {financeiroAtual ? <><div className="min-w-0 bg-white p-4 sm:p-6"><p className="text-[11px] font-medium uppercase text-slate-500 sm:text-xs">Entradas</p><p className="mt-1 break-words text-lg font-bold text-emerald-700 sm:text-xl">{moeda(financeiroAtual.entradas)}</p></div><div className="min-w-0 bg-white p-4 sm:p-6"><p className="text-[11px] font-medium uppercase text-slate-500 sm:text-xs">Saídas</p><p className="mt-1 break-words text-lg font-bold text-red-700 sm:text-xl">{moeda(financeiroAtual.saidas)}</p></div><div className="min-w-0 bg-white p-4 sm:p-6"><p className="text-[11px] font-medium uppercase text-slate-500 sm:text-xs">Saldo</p><p className={`mt-1 break-words text-lg font-bold sm:text-xl ${(saldo ?? 0) < 0 ? "text-red-700" : "text-emerald-700"}`}>{moeda(saldo ?? 0)}</p>{diferencaSaldo !== null && <p className="mt-1 text-xs text-slate-500">{diferencaSaldo >= 0 ? "+" : ""}{moeda(diferencaSaldo)} vs. anterior</p>}</div></> : <><div className="min-w-0 bg-white p-4 sm:p-6"><p className="text-[11px] font-medium uppercase text-slate-500 sm:text-xs">Base completa</p><p className="mt-1 text-2xl font-bold sm:text-3xl">{linhas.length}</p></div>{metricasNumericas.map((metrica) => <div key={metrica.nome} className="min-w-0 bg-white p-4 sm:p-6"><p className="text-[11px] font-medium uppercase text-slate-500 sm:text-xs">{metrica.label}</p><p className="mt-1 break-words text-lg font-bold text-blue-700 sm:text-xl">{metrica.valor}</p></div>)}</>}
        </section>

        <section className="border-b border-slate-200 px-4 py-5 sm:px-6 sm:py-6">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-2"><h3 className="text-base font-semibold">Visão geral</h3><span className={`print-hide rounded-full px-2 py-0.5 text-xs font-medium ${fonteResumo === "ia" ? "bg-accent-soft text-accent" : fonteResumo === "editado" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-600"}`}>{seloResumo}</span></div>{modo === "editar" && <div className="print-hide flex flex-wrap items-center gap-1">{historicoResumo && <button type="button" onClick={desfazerResumo} className="flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-semibold text-text-muted hover:bg-surface-2 hover:text-text"><Undo2 size={14} /> Desfazer</button>}{fonteResumo !== "automatico" && <button type="button" onClick={usarAutomatico} className="min-h-9 rounded-md px-2 text-xs font-semibold text-text-muted hover:bg-surface-2 hover:text-text">Usar automático</button>}</div>}</div>
          {modo === "editar" ? <textarea aria-label="Editar texto do resumo" value={textoAtual} onChange={(evento) => editarResumo(evento.target.value)} className="print-hide min-h-36 w-full resize-y rounded-md border border-border p-3 text-base leading-6 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent-soft sm:min-h-28 sm:text-sm" /> : <p className="whitespace-pre-wrap text-sm leading-6">{textoAtual}</p>}
          <p className="print-show hidden whitespace-pre-wrap text-sm leading-6">{textoAtual}</p>
        </section>

        {distribuicoes.filter((distribuicao) => distribuicao.valores.length).map((distribuicao) => <section key={distribuicao.nome} className="border-b border-slate-200 px-4 py-5 sm:px-6 sm:py-6"><div className="mb-4 flex items-baseline justify-between gap-3"><h3 className="text-base font-semibold">Distribuição por {distribuicao.nome}</h3><span className="text-xs text-slate-500">% dos registros</span></div><div className="space-y-5 sm:space-y-4">{distribuicao.valores.map((item) => <div key={item.nome}><div className="mb-2 flex min-w-0 items-start justify-between gap-3 text-sm"><span className="min-w-0 truncate font-medium">{item.nome}</span><span className="shrink-0 text-right tabular-nums text-slate-600">{item.total} · {item.percentual.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%{temFinanceiro ? ` · ${moeda(item.valor)}` : ""}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-blue-700" style={{ width: `${item.percentual}%` }} /></div></div>)}</div></section>)}

        <footer className="px-4 py-4 text-xs leading-5 text-slate-500 sm:px-6">Gerado em {new Date().toLocaleDateString("pt-BR")} · Dados do projeto {projetoNome}</footer>
      </article>
    </div>
  </div>;
}
