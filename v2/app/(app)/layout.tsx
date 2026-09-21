import { redirect } from "next/navigation";
import { sessaoAtual } from "@/lib/session";
import { listarProjetos } from "@/lib/projetos";
import Sidebar from "@/components/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sessao = await sessaoAtual();
  if (!sessao) redirect("/login"); // o proxy já garante isso; fallback defensivo

  const projetos = await listarProjetos(sessao.id, sessao.papel);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        usuarioNome={sessao.nome}
        projetos={projetos.map((p) => ({ id: p.id, nome: p.nome, slug: p.slug }))}
      />
      <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
