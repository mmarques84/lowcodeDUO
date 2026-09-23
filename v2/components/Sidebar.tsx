"use client";

import Link from "next/link";
import Image from "next/image";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import BotaoSair from "@/components/BotaoSair";

type ProjetoResumo = { id: number; nome: string; slug: string };

export default function Sidebar({
  usuarioNome,
  projetos,
}: {
  usuarioNome: string;
  projetos: ProjetoResumo[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuAberto, setMenuAberto] = useState(false);

  const match = pathname.match(/^\/relatorios\/([^/]+)/);
  const slugAtual = match ? match[1] : null;
  const projetoAtual = projetos.find((p) => p.slug === slugAtual) ?? null;
  const emHome = pathname === "/";

  const conteudo = <>
      <div className="flex items-center gap-2 border-b border-border px-5 py-4">
        <Image src="/brand-mark.svg" alt="" width={32} height={32} className="h-8 w-8" />
        <span className="text-sm font-bold">lowcodeDUO</span>
      </div>

      <div className="border-b border-border p-3">
        <label className="mb-1 block px-1 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
          Projeto
        </label>
        <select
          value={projetoAtual?.slug ?? ""}
          onChange={(e) => {
            if (e.target.value) {
              setMenuAberto(false);
              router.push(`/relatorios/${e.target.value}`);
            }
          }}
          className="w-full rounded-lg border border-border bg-surface-2 px-2.5 py-2 text-sm text-text"
        >
          <option value="" disabled>
            Selecione um projeto
          </option>
          {projetos.map((p) => (
            <option key={p.id} value={p.slug}>
              {p.nome}
            </option>
          ))}
        </select>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3" onClick={() => setMenuAberto(false)}>
        <Link
          href="/"
          className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
            emHome ? "bg-accent-soft text-accent" : "text-text-muted hover:bg-surface-2 hover:text-text"
          }`}
        >
          Início
        </Link>

        {projetoAtual && (
          <>
            <div className="mt-4 mb-1 px-3 text-[11px] font-semibold uppercase tracking-wide text-text-faint">
              {projetoAtual.nome}
            </div>
            <Link
              href={`/relatorios/${projetoAtual.slug}`}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === `/relatorios/${projetoAtual.slug}`
                  ? "bg-accent-soft text-accent"
                  : "text-text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              Relatórios
            </Link>
            <Link
              href={`/relatorios/${projetoAtual.slug}/importar`}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === `/relatorios/${projetoAtual.slug}/importar`
                  ? "bg-accent-soft text-accent"
                  : "text-text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              Importar / atualizar
            </Link>
            <Link
              href={`/relatorios/${projetoAtual.slug}/versoes`}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === `/relatorios/${projetoAtual.slug}/versoes`
                  ? "bg-accent-soft text-accent"
                  : "text-text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              Histórico de versões
            </Link>
            <Link
              href={`/relatorios/${projetoAtual.slug}/alertas`}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === `/relatorios/${projetoAtual.slug}/alertas`
                  ? "bg-accent-soft text-accent"
                  : "text-text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              Alertas
            </Link>
            <Link
              href={`/relatorios/${projetoAtual.slug}/resumo`}
              className={`block rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === `/relatorios/${projetoAtual.slug}/resumo`
                  ? "bg-accent-soft text-accent"
                  : "text-text-muted hover:bg-surface-2 hover:text-text"
              }`}
            >
              Resumo para PDF
            </Link>
          </>
        )}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 px-1 text-sm font-medium text-text">{usuarioNome}</div>
        <BotaoSair />
      </div>
  </>;

  return (
    <>
      <aside className="app-sidebar-desktop hidden h-screen w-64 shrink-0 flex-col border-r border-border bg-surface md:flex">
        {conteudo}
      </aside>

      <header className="app-mobile-header print-hide fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-surface px-4 md:hidden">
        <Link href="/" className="flex min-w-0 items-center gap-2" onClick={() => setMenuAberto(false)}>
          <Image src="/brand-mark.svg" alt="" width={28} height={28} className="h-7 w-7 shrink-0" />
          <span className="truncate text-sm font-bold">{projetoAtual?.nome ?? "lowcodeDUO"}</span>
        </Link>
        <button
          type="button"
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuAberto}
          onClick={() => setMenuAberto((aberto) => !aberto)}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-md text-text hover:bg-surface-2"
        >
          {menuAberto ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {menuAberto && <>
        <button type="button" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} className="fixed inset-0 z-30 bg-slate-950/35 md:hidden" />
        <aside className="fixed inset-y-0 right-0 z-50 flex w-[min(86vw,320px)] flex-col bg-surface shadow-2xl md:hidden">
          <button type="button" aria-label="Fechar menu" onClick={() => setMenuAberto(false)} className="absolute right-3 top-3 z-10 grid h-10 w-10 place-items-center rounded-md text-text hover:bg-surface-2">
            <X size={22} />
          </button>
          {conteudo}
        </aside>
      </>}
    </>
  );
}
