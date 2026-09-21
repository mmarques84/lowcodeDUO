import { redirect, notFound } from "next/navigation";
import { sessaoAtual } from "@/lib/session";
import { buscarProjetoPorSlug } from "@/lib/lancamentos";
import WizardImportar from "@/components/WizardImportar";

export default async function PaginaImportar({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login");

  const projeto = await buscarProjetoPorSlug(slug, sessao.id, sessao.papel);
  if (!projeto) notFound();

  return <WizardImportar projetoSlug={projeto.slug} projetoNome={projeto.nome} />;
}
