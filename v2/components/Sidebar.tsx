"use client";

import Link from "next/link";
import Image from "next/image";
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

  const match = pathname.match(/^\/relatorios\/([^/]+)/);
  const slugAtual = match ? match[1] : null;
  const projetoAtual = projetos.find((p) => p.slug === slugAtual) ?? null;
  const emHome = pathname === "/";

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-surface">
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
            if (e.target.value) router.push(`/relatorios/${e.target.value}`);
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

      <nav className="flex-1 space-y-1 p-3">
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
    </aside>
  );
}
