"use client";

import { useMemo, useState } from "react";
import { Printer } from "lucide-react";
import type { ColunaDetectada } from "@/lib/relatorioGenerico";

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

function inicioSemanaHoje() {
  const d = new Date();
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

export default function ResumoCompartilhavel({ projetoNome, colunas, linhas }: {
  projetoNome: string; colunas: ColunaDetectada[]; linhas: Record<string, unknown>[];
}) {
  const datas = colunas.filter((c) => /data|date/i.test(c.nome) || c.tipo === "data");
  const [colunaData, setColunaData] = useState(datas[0]?.nome ?? "");
  const [semana, setSemana] = useState(inicioSemanaHoje);
  const [textoEditado, setTextoEditado] = useState<string | null>(null);
  const inicio = useMemo(() => {
    const d = new Date(`${semana}T12:00:00`);
    if (Number.isNaN(d.getTime())) return semana;
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    return d.toISOString().slice(0, 10);
  }, [semana]);
  const fim = useMemo(() => {
    const d = new Date(`${inicio}T12:00:00`);
    d.setDate(d.getDate() + 6);
    return d.toISOString().slice(0, 10);
  }, [inicio]);
  const selecionadas = colunaData ? linhas.filter((l) => {
    const data = dataIso(l[colunaData]);
    return data !== null && data >= inicio && data <= fim;
  }) : linhas;
  const grupos = colunas.filter((c) => c.tipo === "texto" && !/nome|usuario|usuário|email|e-mail|telefone|cpf/i.test(c.nome)).slice(0, 2);
  const distribuicoes = grupos.map((grupo) => ({
    nome: grupo.nome,
    valores: Object.entries(selecionadas.reduce<Record<string, number>>((acc, l) => {
      const chave = String(l[grupo.nome] ?? "").trim() || "Sem informação";
      acc[chave] = (acc[chave] ?? 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8),
  }));
  const valoresFinanceiros = colunas.some((c) => c.nome === "Valor") && colunas.some((c) => c.nome === "Tipo")
    ? selecionadas.reduce<{ entradas: number; saidas: number }>((acc, linha) => {
      const valor = Number(linha.Valor) || 0;
      if (linha.Tipo === "entrada") acc.entradas += valor;
      if (linha.Tipo === "saida") acc.saidas += valor;
      return acc;
    }, { entradas: 0, saidas: 0 }) : null;
  const resumoAutomatico = selecionadas.length
    ? `No período de ${inicio.split("-").reverse().join("/")} a ${fim.split("-").reverse().join("/")}, foram encontrados ${selecionadas.length} registros${colunaData ? ` pela coluna ${colunaData}` : " no conjunto de dados"}.${distribuicoes[0]?.valores.length ? ` O grupo mais frequente em ${distribuicoes[0].nome} foi ${distribuicoes[0].valores[0][0]}, com ${distribuicoes[0].valores[0][1]} registros.` : ""}`
    : "Nenhum registro encontrado para a semana selecionada.";

  return <div className="print-report mx-auto w-full max-w-4xl p-6">
    <div className="print-hide mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
      <div><h1 className="text-lg font-bold">Resumo para compartilhar</h1><p className="text-sm text-text-muted">{projetoNome}</p></div>
      <button type="button" onClick={() => window.print()} className="flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white"><Printer size={16} /> Imprimir / salvar PDF</button>
    </div>
    <div className="print-hide mb-8 flex flex-wrap gap-4">
      <label className="text-xs text-text-muted">Semana<input type="date" value={semana} onChange={(e) => { setSemana(e.target.value); setTextoEditado(null); }} className="mt-1 block rounded-md border border-border bg-surface px-3 py-2 text-sm text-text" /></label>
      {datas.length > 0 && <label className="text-xs text-text-muted">Coluna de data<select value={colunaData} onChange={(e) => { setColunaData(e.target.value); setTextoEditado(null); }} className="mt-1 block rounded-md border border-border bg-surface px-3 py-2 text-sm text-text">{datas.map((c) => <option key={c.nome} value={c.nome}>{c.nome}</option>)}</select></label>}
      {datas.length === 0 && <p className="self-end text-sm text-amber-700">Sem coluna de data: o resumo inclui todos os registros.</p>}
    </div>
    <article className="bg-white text-slate-950">
      <div className="border-b-2 border-blue-700 pb-5"><p className="text-sm font-semibold text-blue-700">{projetoNome}</p><h2 className="mt-1 text-2xl font-bold">Resumo do período</h2><p className="mt-1 text-sm text-slate-600">{inicio.split("-").reverse().join("/")} a {fim.split("-").reverse().join("/")}</p></div>
      <section className="grid grid-cols-2 gap-6 border-b border-slate-200 py-6"><div><p className="text-xs uppercase text-slate-500">Registros no período</p><p className="text-3xl font-bold">{selecionadas.length}</p></div><div><p className="text-xs uppercase text-slate-500">Base completa</p><p className="text-3xl font-bold">{linhas.length}</p></div></section>
      {valoresFinanceiros && <section className="grid grid-cols-2 gap-6 border-b border-slate-200 py-6"><div><p className="text-xs uppercase text-slate-500">Entradas</p><p className="text-xl font-bold text-emerald-700">{valoresFinanceiros.entradas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div><div><p className="text-xs uppercase text-slate-500">Saídas</p><p className="text-xl font-bold text-red-700">{valoresFinanceiros.saidas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</p></div></section>}
      <section className="border-b border-slate-200 py-6"><h3 className="mb-3 text-base font-semibold">Visão geral</h3><textarea aria-label="Editar texto do resumo" value={textoEditado ?? resumoAutomatico} onChange={(e) => setTextoEditado(e.target.value)} className="print-hide min-h-24 w-full resize-y rounded-md border border-border p-3 text-sm leading-6" /><p className="print-show hidden whitespace-pre-wrap text-sm leading-6">{textoEditado ?? resumoAutomatico}</p></section>
      {distribuicoes.filter((d) => d.valores.length).map((distribuicao) => <section key={distribuicao.nome} className="border-b border-slate-200 py-6"><h3 className="mb-4 text-base font-semibold">Distribuição por {distribuicao.nome}</h3><div className="space-y-3">{distribuicao.valores.map(([nome, total]) => <div key={nome} className="grid grid-cols-[minmax(0,1fr)_2fr_36px] items-center gap-3 text-sm"><span className="truncate">{nome}</span><div className="h-2 bg-slate-200"><div className="h-2 bg-blue-700" style={{ width: `${total / distribuicao.valores[0][1] * 100}%` }} /></div><span className="text-right tabular-nums">{total}</span></div>)}</div></section>)}
      <footer className="mt-6 border-t border-slate-200 pt-3 text-xs text-slate-500">Gerado em {new Date().toLocaleDateString("pt-BR")} · Dados do projeto {projetoNome}</footer>
    </article>
  </div>;
}
