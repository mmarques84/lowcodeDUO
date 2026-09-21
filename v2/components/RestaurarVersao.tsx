"use client";

import { RotateCcw } from "lucide-react";
import { useState } from "react";
import { useAviso } from "@/components/aviso/AvisoProvider";
import { aplicarDashboard, isDashboardSnapshot } from "@/lib/dashboardSnapshot";

export default function RestaurarVersao({ projetoId, projetoSlug, versao }: { projetoId: number; projetoSlug: string; versao: number }) {
  const { aviso, confirmar } = useAviso();
  const [carregando, setCarregando] = useState(false);

  async function restaurar() {
    setCarregando(true);
    try {
      const resposta = await fetch("/api/projetos/restaurar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projetoSlug, versao }),
      });
      const dados = await resposta.json();
      if (!resposta.ok || !isDashboardSnapshot(dados.snapshot)) throw new Error(dados.erro ?? "Não foi possível restaurar esta versão.");
      aplicarDashboard(projetoId, dados.snapshot);
      window.location.href = `/relatorios/${projetoSlug}`;
    } catch (erro) {
      aviso(erro instanceof Error ? erro.message : "Erro ao restaurar versão", "error");
      setCarregando(false);
    }
  }

  return (
    <button
      type="button"
      disabled={carregando}
      onClick={() => confirmar(`Restaurar o layout da v${versao}? Isso cria uma nova versão. Os dados importados e lançamentos permanecem.`, "Restaurar layout", restaurar, "Restaurar")}
      className="inline-flex items-center gap-1.5 rounded border border-border px-2.5 py-1.5 text-xs font-medium text-text hover:bg-surface-2 disabled:opacity-50"
    >
      <RotateCcw size={14} /> Restaurar
    </button>
  );
}
