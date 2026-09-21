import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/session";
import { buscarProjetoPorSlug } from "@/lib/lancamentos";
import { buscarRelatorioGenerico } from "@/lib/relatorioGenerico";
import { listarAlertas, listarRegras } from "@/lib/alertas";
import CentralAlertas from "@/components/CentralAlertas";

export default async function PaginaAlertas({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  const projeto = await buscarProjetoPorSlug(slug, sessao.id, sessao.papel);
  if (!projeto) notFound();
  const [alertas, regras, relatorio] = await Promise.all([
    listarAlertas(projeto.id), listarRegras(projeto.id), buscarRelatorioGenerico(projeto.id),
  ]);
  return (
    <div className="mx-auto w-full max-w-5xl p-6">
      <header className="mb-6">
        <h1 className="text-lg font-bold">Alertas</h1>
        <p className="text-sm text-text-muted">{projeto.nome}</p>
      </header>
      <CentralAlertas slug={slug} alertas={alertas} regras={regras} colunas={relatorio?.colunas.map((c) => c.nome) ?? []} />
    </div>
  );
}
