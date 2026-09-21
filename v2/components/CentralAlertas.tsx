"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Plus, Trash2 } from "lucide-react";
import type { Alerta, RegraAlerta } from "@/lib/alertas";

export default function CentralAlertas({ slug, alertas, regras, colunas }: {
  slug: string; alertas: Alerta[]; regras: RegraAlerta[]; colunas: string[];
}) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [coluna, setColuna] = useState(colunas[0] ?? "");
  const [operador, setOperador] = useState("maior");
  const [valor, setValor] = useState("");
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState("");

  async function enviar(url: string, method: string, body: object) {
    setBusy(true);
    setErro("");
    try {
      const resposta = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ projetoSlug: slug, ...body }) });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.erro ?? "Nao foi possivel concluir.");
      router.refresh();
      return true;
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro inesperado.");
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center gap-2"><Bell size={17} /><h2 className="text-sm font-semibold">Pendentes</h2><span className="text-xs text-text-muted">{alertas.filter((a) => a.status === "novo").length}</span></div>
        <div className="divide-y divide-border border-y border-border">
          {alertas.filter((a) => a.status === "novo").map((a) => (
            <div key={a.id} className="flex items-start justify-between gap-4 py-4">
              <div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2 w-2 shrink-0 rounded-full ${a.severidade === "erro" ? "bg-red-600" : "bg-amber-500"}`} /><strong className="text-sm">{a.titulo}</strong></div><p className="mt-1 text-sm text-text-muted">{a.descricao}</p><time className="text-xs text-text-faint">{a.criado_em.slice(0, 16)}</time></div>
              <button disabled={busy} title="Marcar como resolvido" aria-label={`Resolver ${a.titulo}`} onClick={() => enviar("/api/alertas", "PATCH", { id: a.id })} className="rounded-md p-2 text-text-muted hover:bg-surface-2 hover:text-text"><Check size={17} /></button>
            </div>
          ))}
          {!alertas.some((a) => a.status === "novo") && <p className="py-8 text-sm text-text-muted">Nenhum alerta pendente.</p>}
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-sm font-semibold">Regras personalizadas</h2>
        <p className="mb-4 text-sm text-text-muted">Avisos gerados quando uma linha da proxima importacao atender a regra.</p>
        {colunas.length > 0 ? (
          <form className="mb-4 flex flex-wrap items-end gap-2" onSubmit={async (e) => { e.preventDefault(); if (await enviar("/api/alertas/regras", "POST", { nome, coluna, operador, valor })) { setNome(""); setValor(""); } }}>
            <label className="min-w-40 flex-1 text-xs text-text-muted">Nome<input required maxLength={120} value={nome} onChange={(e) => setNome(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text" /></label>
            <label className="min-w-36 text-xs text-text-muted">Coluna<select value={coluna} onChange={(e) => setColuna(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text">{colunas.map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="text-xs text-text-muted">Condicao<select value={operador} onChange={(e) => setOperador(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"><option value="maior">Maior que</option><option value="menor">Menor que</option><option value="igual">Igual a</option></select></label>
            <label className="min-w-28 text-xs text-text-muted">Valor<input required value={valor} onChange={(e) => setValor(e.target.value)} className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text" /></label>
            <button disabled={busy} className="flex items-center gap-1 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"><Plus size={16} /> Criar regra</button>
          </form>
        ) : <p className="mb-4 text-sm text-text-muted">Importe uma planilha para criar regras por coluna.</p>}
        {erro && <p role="alert" className="mb-3 text-sm text-red-600">{erro}</p>}
        <div className="divide-y divide-border border-y border-border">{regras.map((r) => <div key={r.id} className="flex items-center justify-between gap-4 py-3 text-sm"><span><strong>{r.nome}</strong><span className="ml-2 text-text-muted">{r.coluna} {r.operador} {r.valor}</span></span><button disabled={busy} title="Excluir regra" aria-label={`Excluir ${r.nome}`} onClick={() => enviar("/api/alertas/regras", "DELETE", { id: r.id })} className="rounded-md p-2 text-text-muted hover:bg-surface-2"><Trash2 size={16} /></button></div>)}{regras.length === 0 && <p className="py-4 text-sm text-text-muted">Nenhuma regra criada.</p>}</div>
      </section>
      {alertas.some((a) => a.status === "resolvido") && <section><h2 className="mb-2 text-sm font-semibold">Resolvidos</h2><div className="divide-y divide-border border-y border-border">{alertas.filter((a) => a.status === "resolvido").map((a) => <div key={a.id} className="py-3 text-sm text-text-muted"><strong>{a.titulo}</strong><span className="ml-2">{a.descricao}</span></div>)}</div></section>}
    </div>
  );
}
