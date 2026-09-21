import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/session";
import { listarProjetos } from "@/lib/projetos";
import ModalNovoProjeto from "@/components/ModalNovoProjeto";
import ExcluirProjeto from "@/components/ExcluirProjeto";

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PaginaInicio() {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login"); // o middleware já garante isso; fallback defensivo

  const projetos = await listarProjetos(sessao.id, sessao.papel);

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <header className="mb-6">
        <h1 className="text-lg font-bold">Olá, {sessao.nome}</h1>
        <p className="text-sm text-text-muted">Seus projetos</p>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {projetos.map((p) => (
          <a
            key={p.id}
            href={`/relatorios/${p.slug}`}
            className="relative rounded-xl border border-border bg-surface p-4 shadow-[var(--shadow-soft)] transition hover:border-accent hover:shadow-md"
          >
            <ExcluirProjeto id={p.id} nome={p.nome} />
            <div className="font-semibold">{p.nome}</div>
            <div className="mb-2 text-xs text-text-faint">{p.tipo}</div>
            {p.descricao && <p className="mb-3 line-clamp-2 min-h-10 text-sm text-text-muted">{p.descricao}</p>}
            {p.tem_lancamentos > 0 && (
              <div className="mb-3 text-xl font-bold tabular-nums">{fmtBRL(p.saldo)}</div>
            )}
            <span
              className="inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                background: p.publicado ? "var(--live-soft)" : "var(--pending-soft)",
                color: p.publicado ? "var(--live)" : "var(--pending)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: p.publicado ? "var(--live)" : "var(--pending)" }}
              />
              v{p.versao}
            </span>
          </a>
        ))}
        <ModalNovoProjeto />
      </div>
    </div>
  );
}
