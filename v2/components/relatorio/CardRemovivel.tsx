"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { useAviso } from "@/components/aviso/AvisoProvider";
import { Trash2 } from "lucide-react";

export function useCardsVisiveis(projetoId: number) {
  const [removidos, setRemovidos] = useState<string[]>([]);
  const chave = `lowcodeduo_cards_ocultos_${projetoId}`;

  useEffect(() => {
    function atualizar() {
      try {
        const salvo = JSON.parse(localStorage.getItem(chave) ?? "[]");
        setRemovidos(Array.isArray(salvo) ? salvo : []);
      } catch {
        setRemovidos([]);
      }
    }
    atualizar();
    window.addEventListener("lowcodeduo:cards-layout", atualizar);
    return () => window.removeEventListener("lowcodeduo:cards-layout", atualizar);
  }, [chave]);

  function remover(id: string) {
    setRemovidos((atuais) => {
      const novos = [...new Set([...atuais, id])];
      localStorage.setItem(chave, JSON.stringify(novos));
      return novos;
    });
  }

  function restaurarTodos() {
    localStorage.removeItem(chave);
    setRemovidos([]);
  }

  return { visivel: (id: string) => !removidos.includes(id), remover, restaurarTodos, totalRemovidos: removidos.length };
}

export function CardRemovivel({
  id,
  titulo,
  onRemover,
  children,
  className = "",
  style,
}: {
  id: string;
  titulo: string;
  onRemover: (id: string) => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const { confirmar } = useAviso();

  return (
    <div style={style} className={`relative rounded-lg border border-border bg-surface p-4 pr-10 shadow-[var(--shadow-soft)] ${className}`}>
      <button
        type="button"
        onClick={() => confirmar(`Remover "${titulo}" do relatório? Os dados continuam salvos.`, "Remover card", () => onRemover(id), "Remover")}
        className="absolute right-3 top-3 rounded p-1 text-text-faint hover:bg-danger-soft hover:text-danger"
        title={`Remover ${titulo}`}
        aria-label={`Remover ${titulo}`}
      >
        <Trash2 size={16} />
      </button>
      {children}
    </div>
  );
}
