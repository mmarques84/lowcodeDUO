import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { sessaoAtual } from "@/lib/session";
import { buscarProjetoPorSlug, listarLancamentos } from "@/lib/lancamentos";
import { buscarRelatorioGenerico } from "@/lib/relatorioGenerico";
import NovoLancamentoOpcional from "@/components/NovoLancamentoOpcional";
import RelatorioFinanceiro from "@/components/RelatorioFinanceiro";
import RelatorioGenericoView from "@/components/RelatorioGenericoView";
import PainelIA from "@/components/ia/PainelIA";
import { FileText, RefreshCw } from "lucide-react";

export default async function PaginaRelatorio({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login"); // fallback defensivo, o proxy já garante isso

  const projeto = await buscarProjetoPorSlug(slug, sessao.id, sessao.papel);
  if (!projeto) notFound();

  const lancamentos = await listarLancamentos(projeto.id);
  const modoFinanceiro = lancamentos.length > 0;
  const relatorioGenerico = modoFinanceiro ? null : await buscarRelatorioGenerico(projeto.id);

  return (
    <div className="mx-auto w-full max-w-6xl p-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold">Relatórios</h1>
          <p className="text-sm text-text-muted">{projeto.nome}</p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link href={`/relatorios/${projeto.slug}/importar`} className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:bg-surface-2"><RefreshCw size={16} /> Atualizar dados</Link>
          <Link href={`/relatorios/${projeto.slug}/resumo`} className="flex items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm font-medium text-text hover:bg-surface-2"><FileText size={16} /> Gerar resumo</Link>
          <NovoLancamentoOpcional projetoId={projeto.id} projetoSlug={projeto.slug} />
        </div>
      </header>

      <PainelIA
        projetoId={projeto.id}
        projetoSlug={projeto.slug}
        modo={modoFinanceiro ? "financeiro" : "generico"}
        lancamentos={modoFinanceiro ? lancamentos : undefined}
        relatorioGenerico={modoFinanceiro ? undefined : relatorioGenerico}
      />

      {modoFinanceiro ? (
        <RelatorioFinanceiro projetoId={projeto.id} projetoSlug={projeto.slug} lancamentos={lancamentos} />
      ) : relatorioGenerico ? (
        <RelatorioGenericoView projetoId={projeto.id} dados={relatorioGenerico} />
      ) : (
        <div className="rounded-xl border border-border bg-surface p-8 text-center shadow-[var(--shadow-soft)]">
          <p className="mb-4 text-sm text-text-muted">
            Esse projeto ainda não tem nenhum lançamento ou planilha importada.
          </p>
          <Link
            href={`/relatorios/${projeto.slug}/importar`}
            className="inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
          >
            Importar planilha
          </Link>
        </div>
      )}
    </div>
  );
}
