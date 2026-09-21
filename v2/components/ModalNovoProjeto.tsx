"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import * as XLSX from "xlsx";
import { useAviso } from "@/components/aviso/AvisoProvider";
import { detectarColunas, pareceLancamentoAluguel, CHAVE_IMPORT_PENDENTE } from "@/lib/planilha";

export default function ModalNovoProjeto() {
  const router = useRouter();
  const { aviso } = useAviso();
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const [nome, setNome] = useState("");
  const [tipo, setTipo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [cor, setCor] = useState("#2B59C3");
  const [arquivo, setArquivo] = useState<File | null>(null);

  function limpar() {
    setNome("");
    setTipo("");
    setDescricao("");
    setCor("#2B59C3");
    setArquivo(null);
  }

  function lerArquivoXlsx(file: File): Promise<Record<string, unknown>[]> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array" });
          const sheet = wb.Sheets[wb.SheetNames[0]];
          resolve(XLSX.utils.sheet_to_json(sheet, { defval: "" }));
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      aviso("Informe um nome para o projeto.", "error", "Nome obrigatório");
      return;
    }

    let rows: Record<string, unknown>[] | null = null;
    if (arquivo) {
      try {
        rows = await lerArquivoXlsx(arquivo);
      } catch {
        aviso("Não consegui ler essa planilha. Confira se é um .xlsx válido.", "error", "Arquivo inválido");
        return;
      }
      if (rows.length === 0) {
        aviso("Planilha vazia ou não reconhecida.", "error", "Arquivo inválido");
        return;
      }
    }

    setCarregando(true);
    try {
      const resp = await fetch("/api/projetos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome, tipo, descricao, cor }),
      });
      const corpo = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(corpo.erro ?? "Erro ao criar projeto");
      const slug: string = corpo.projeto.slug;

      limpar();
      setAberto(false);

      if (!rows) {
        aviso(`Projeto "${corpo.projeto.nome}" criado.`, "success", "Projeto criado");
        router.push(`/relatorios/${slug}`);
        router.refresh();
        return;
      }

      const colunas = detectarColunas(rows);
      if (pareceLancamentoAluguel(colunas.map((c) => c.nome))) {
        const loteResp = await fetch("/api/lancamentos/importar-lote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projetoSlug: slug, linhas: rows }),
        });
        const loteCorpo = await loteResp.json().catch(() => ({}));
        aviso(
          `Projeto criado com ${loteCorpo.importados ?? 0} lançamento(s) importado(s)` +
            (loteCorpo.erros ? `, ${loteCorpo.erros} ignorado(s).` : "."),
          "success",
          "Projeto criado"
        );
        router.push(`/relatorios/${slug}`);
      } else {
        sessionStorage.setItem(
          CHAVE_IMPORT_PENDENTE,
          JSON.stringify({ arquivoNome: arquivo?.name ?? "", rows, colunas })
        );
        aviso(
          `Projeto "${corpo.projeto.nome}" criado. Essa planilha não é de lançamentos — confira as colunas detectadas.`,
          "info",
          "Confirme os dados"
        );
        router.push(`/relatorios/${slug}/importar`);
      }
      router.refresh();
    } catch (err) {
      aviso(err instanceof Error ? err.message : "Erro ao criar projeto", "error");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setAberto(true)}
        className="flex min-h-[132px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border bg-surface p-4 text-text-muted transition hover:border-accent hover:text-accent"
      >
        <span className="text-2xl leading-none">+</span>
        <span className="text-sm font-medium">Novo projeto</span>
      </button>

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
            <h3 className="mb-4 text-lg font-semibold">Novo projeto</h3>

            <label className="mb-3 block text-xs text-text-muted">
              Nome
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
                autoFocus
                required
              />
            </label>

            <label className="mb-3 block text-xs text-text-muted">
              Tipo
              <input
                type="text"
                value={tipo}
                onChange={(e) => setTipo(e.target.value)}
                placeholder="Geral"
                className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
              />
            </label>

            <label className="mb-3 block text-xs text-text-muted">
              Descrição (opcional)
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Sobre o que é este projeto?"
                className="mt-1 w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
              />
            </label>

            <label className="mb-3 block text-xs text-text-muted">
              Cor
              <input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="mt-1 h-9 w-16 rounded-lg border border-border bg-surface-2"
              />
            </label>

            <label className="mb-5 block text-xs text-text-muted">
              Importar planilha (opcional)
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                className="mt-1 block w-full text-sm text-text file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-text"
              />
            </label>

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
                {carregando ? "Criando..." : "Criar projeto"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
