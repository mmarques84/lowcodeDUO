"use client";

import { useEffect, useState } from "react";
import ModalLancamento from "@/components/ModalLancamento";

export default function NovoLancamentoOpcional({ projetoId, projetoSlug }: { projetoId: number; projetoSlug: string }) {
  const [habilitado, setHabilitado] = useState(false);

  useEffect(() => {
    function atualizar() {
      setHabilitado(localStorage.getItem(`lowcodeduo_novo_lancamento_${projetoId}`) === "true");
    }
    atualizar();
    window.addEventListener("lowcodeduo:novo-lancamento", atualizar);
    return () => window.removeEventListener("lowcodeduo:novo-lancamento", atualizar);
  }, [projetoId]);

  return habilitado ? <ModalLancamento projetoSlug={projetoSlug} /> : null;
}
