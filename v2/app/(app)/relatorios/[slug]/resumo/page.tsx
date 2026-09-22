import { notFound, redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/session";
import { buscarProjetoPorSlug, listarLancamentos } from "@/lib/lancamentos";
import { buscarRelatorioGenerico } from "@/lib/relatorioGenerico";
import ResumoCompartilhavel from "@/components/ResumoCompartilhavel";

export default async function PaginaResumo({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");
  const projeto = await buscarProjetoPorSlug(slug, sessao.id, sessao.papel);
  if (!projeto) notFound();
  const lancamentos = await listarLancamentos(projeto.id);
  const relatorio = lancamentos.length ? null : await buscarRelatorioGenerico(projeto.id);
  return <ResumoCompartilhavel
    projetoNome={projeto.nome}
    colunas={lancamentos.length ? [{ nome: "Data", tipo: "data" }, { nome: "Categoria", tipo: "texto" }, { nome: "Tipo", tipo: "texto" }, { nome: "Valor", tipo: "numero" }] : relatorio?.colunas ?? []}
    linhas={lancamentos.length ? lancamentos.map((l) => ({ Data: l.data, Categoria: l.categoria, Tipo: l.tipo, Valor: l.valor })) : relatorio?.linhas ?? []}
  />;
}
