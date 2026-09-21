"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { useAviso } from "@/components/aviso/AvisoProvider";

export default function ExcluirProjeto({ id, nome }: { id: number; nome: string }) {
  const router = useRouter();
  const { aviso, confirmar } = useAviso();

  async function excluir() {
    try {
      const resp = await fetch(`/api/projetos?id=${id}`, { method: "DELETE" });
      const corpo = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(corpo.erro ?? "Erro ao excluir projeto");
      aviso(`Projeto "${nome}" excluído.`, "success", "Excluído");
      router.refresh();
    } catch (err) {
      aviso(err instanceof Error ? err.message : "Erro ao excluir projeto", "error");
    }
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        confirmar(
          `Excluir o projeto "${nome}"? Isso apaga todos os lançamentos e planilhas importadas dele. Essa ação não pode ser desfeita.`,
          "Excluir projeto",
          excluir,
          "Excluir"
        );
      }}
      className="absolute right-2 top-2 rounded-md p-1 text-text-faint hover:bg-danger-soft hover:text-danger"
      title="Excluir projeto"
      aria-label={`Excluir projeto ${nome}`}
    >
      <Trash2 size={16} />
    </button>
  );
}
