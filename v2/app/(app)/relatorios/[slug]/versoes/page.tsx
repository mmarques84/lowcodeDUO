import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/session";
import { buscarProjetoPorSlug, listarLancamentos } from "@/lib/lancamentos";
import { buscarRelatorioGenerico } from "@/lib/relatorioGenerico";
import { listarVersoes } from "@/lib/historicoVersoes";
import RestaurarVersao from "@/components/RestaurarVersao";
import VisualizarVersao from "@/components/VisualizarVersao";

export default async function PaginaVersoes({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const projeto = await buscarProjetoPorSlug(slug, sessao.id, sessao.papel);
  if (!projeto) notFound();
  const versoes = await listarVersoes(projeto.id);
  const lancamentos = await listarLancamentos(projeto.id);
  const relatorioGenerico = lancamentos.length ? null : await buscarRelatorioGenerico(projeto.id);

  return (
    <div className="mx-auto w-full max-w-4xl p-6">
      <header className="mb-6">
        <h1 className="text-lg font-bold">Histórico de versões</h1>
        <p className="text-sm text-text-muted">{projeto.nome} · versão atual v{projeto.versao}</p>
      </header>

      {versoes.length === 0 ? (
        <p className="border-t border-border py-5 text-sm text-text-muted">
          Este projeto já existia antes do registro de histórico. As próximas alterações aparecerão aqui.
        </p>
      ) : (
        <div className="border-t border-border">
          {versoes.map((item) => (
            <div key={item.versao} className="grid gap-2 border-b border-border py-4 sm:grid-cols-[64px_minmax(0,1fr)_auto_auto] sm:items-start sm:gap-4">
              <span className="text-sm font-bold text-accent">v{item.versao}</span>
              <div>
                <div className="text-sm font-medium text-text">{item.descricao}</div>
                <div className="mt-1 text-xs text-text-muted">
                  {item.tipo === "importacao" ? "Importação" : item.tipo === "criacao" ? "Criação" : "Dashboard"}
                </div>
              </div>
              <time className="text-xs text-text-muted" dateTime={item.criado_em.replace(" ", "T")}>
                {`${item.criado_em.slice(8, 10)}/${item.criado_em.slice(5, 7)}/${item.criado_em.slice(0, 4)} ${item.criado_em.slice(11, 16)}`}
              </time>
              {item.recuperavel ? (
                <div className="flex flex-wrap items-center gap-2">
                  <VisualizarVersao projetoId={projeto.id} projetoSlug={slug} versao={item.versao} atual={item.versao === projeto.versao} lancamentos={lancamentos} relatorioGenerico={relatorioGenerico} />
                  {item.versao !== projeto.versao && <RestaurarVersao projetoId={projeto.id} projetoSlug={slug} versao={item.versao} />}
                </div>
              ) : <span className="text-xs text-text-faint">Sem cópia do layout</span>}
            </div>
          ))}
        </div>
      )}

      {versoes.length > 0 && versoes[versoes.length - 1].versao > 1 && (
        <p className="mt-4 text-xs text-text-muted">Versões anteriores ao início do histórico não têm detalhes disponíveis.</p>
      )}
    </div>
  );
}
