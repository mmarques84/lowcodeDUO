"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAviso } from "@/components/aviso/AvisoProvider";

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

export type LancamentoEditavel = {
  id: number;
  data: string;
  descricao: string;
  categoria: string;
  tipo: "entrada" | "saida";
  valor: number;
  status: "pendente" | "pago";
};

export default function ModalLancamento({
  projetoSlug,
  lancamento,
}: {
  projetoSlug: string;
  lancamento?: LancamentoEditavel;
}) {
  const router = useRouter();
  const { aviso } = useAviso();
  const editando = !!lancamento;
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const [data, setData] = useState(lancamento?.data.slice(0, 10) ?? hoje());
  const [descricao, setDescricao] = useState(lancamento?.descricao ?? "");
  const [categoria, setCategoria] = useState(lancamento?.categoria ?? "");
  const [tipo, setTipo] = useState<"entrada" | "saida">(lancamento?.tipo ?? "entrada");
  const [valor, setValor] = useState(lancamento ? String(lancamento.valor) : "");
  const [status, setStatus] = useState<"pendente" | "pago">(lancamento?.status ?? "pago");

  function abrir() {
    setData(lancamento?.data.slice(0, 10) ?? hoje());
    setDescricao(lancamento?.descricao ?? "");
    setCategoria(lancamento?.categoria ?? "");
    setTipo(lancamento?.tipo ?? "entrada");
    setValor(lancamento ? String(lancamento.valor) : "");
    setStatus(lancamento?.status ?? "pago");
    setAberto(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!descricao.trim() || !categoria.trim() || !valor) {
      aviso("Preencha descrição, categoria e valor.", "error");
      return;
    }
    setCarregando(true);
    try {
      const resp = await fetch("/api/lancamentos", {
        method: editando ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lancamento?.id,
          projetoSlug,
          data,
          descricao,
          categoria,
          tipo,
          valor,
          status,
        }),
      });
      if (!resp.ok) {
        const corpo = await resp.json().catch(() => ({}));
        throw new Error(corpo.erro ?? "Erro ao salvar lançamento");
      }
      setAberto(false);
      aviso(editando ? "Lançamento atualizado." : "Lançamento adicionado.", "success");
      router.refresh();
    } catch (err) {
      aviso(err instanceof Error ? err.message : "Erro ao salvar lançamento", "error");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      {editando ? (
        <button
          onClick={abrir}
          className="rounded-md px-1.5 py-0.5 text-xs text-text-faint hover:bg-accent-soft hover:text-accent"
          title="Editar lançamento"
        >
          ✎
        </button>
      ) : (
        <button
          onClick={abrir}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
        >
          + Novo lançamento
        </button>
      )}

      {aberto && (
        <div
          className="fixed inset-0 z-40 flex items-center justify-center bg-[rgba(18,21,28,0.38)] p-4"
          onClick={() => setAberto(false)}
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={salvar}
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-[var(--shadow-elevated)]"
          >
            <h3 className="mb-4 text-lg font-semibold">
              {editando ? "Editar lançamento" : "Novo lançamento"}
            </h3>

            <div className="mb-3 grid grid-cols-2 gap-3">
              <label className="text-xs text-text-muted">
                Data
                <input
                  type="date"
                  value={data}
                  onChange={(e) => setData(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
                  required
                />
              </label>
              <label className="text-xs text-text-muted">
                Valor
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
                  required
                />
              </label>
            </div>

            <label className="mb-3 block text-xs text-text-muted">
              Descrição
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
                required
              />
            </label>

            <label className="mb-3 block text-xs text-text-muted">
              Categoria
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
                required
              />
            </label>

            <div className="mb-5 grid grid-cols-2 gap-3">
              <label className="text-xs text-text-muted">
                Tipo
                <select
                  value={tipo}
                  onChange={(e) => setTipo(e.target.value as "entrada" | "saida")}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
                >
                  <option value="entrada">Entrada</option>
                  <option value="saida">Saída</option>
                </select>
              </label>
              <label className="text-xs text-text-muted">
                Status
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "pendente" | "pago")}
                  className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
                >
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                </select>
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAberto(false)}
                className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-text hover:bg-surface-3"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={carregando}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                {carregando ? "Salvando..." : "Salvar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
