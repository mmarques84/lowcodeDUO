"use client";

import { useRouter } from "next/navigation";
import { useAviso } from "@/components/aviso/AvisoProvider";

export default function ExcluirLancamento({
  id,
  projetoSlug,
}: {
  id: number;
  projetoSlug: string;
}) {
  const router = useRouter();
  const { aviso, confirmar } = useAviso();

  async function excluir() {
    try {
      const resp = await fetch(
        `/api/lancamentos?id=${id}&projetoSlug=${encodeURIComponent(projetoSlug)}`,
        { method: "DELETE" }
      );
      if (!resp.ok) {
        const corpo = await resp.json().catch(() => ({}));
        throw new Error(corpo.erro ?? "Erro ao excluir");
      }
      router.refresh();
    } catch (err) {
      aviso(err instanceof Error ? err.message : "Erro ao excluir lançamento", "error");
    }
  }

  return (
    <button
      onClick={() =>
        confirmar("Excluir este lançamento?", "Confirmar exclusão", excluir, "Excluir")
      }
      className="rounded-md px-1.5 py-0.5 text-xs text-text-faint hover:bg-danger-soft hover:text-danger"
      title="Excluir lançamento"
    >
      ✕
    </button>
  );
}
