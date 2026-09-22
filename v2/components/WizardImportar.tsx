"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { useAviso } from "@/components/aviso/AvisoProvider";
import { analisarQualidade } from "@/lib/qualidadePlanilha";
import type { RelatorioGenerico } from "@/lib/relatorioGenerico";
import { carregarAIConfig } from "@/lib/widgets";
import {
  detectarColunas,
  pareceLancamentoAluguel,
  chutarNegocio,
  calcularPreviaGenerica,
  CHAVE_IMPORT_PENDENTE,
  type ColunaInfo,
  type LinhaPlanilha,
} from "@/lib/planilha";

type Passo = 0 | 1 | 2 | 3;

export default function WizardImportar({
  projetoSlug,
  projetoNome,
  relatorioAtual,
  projetoId,
}: {
  projetoSlug: string;
  projetoNome: string;
  relatorioAtual: RelatorioGenerico | null;
  projetoId: number;
}) {
  const router = useRouter();
  const { aviso } = useAviso();

  const [passo, setPasso] = useState<Passo>(0);
  const [carregando, setCarregando] = useState(false);
  const [arquivoNome, setArquivoNome] = useState("");
  const [rows, setRows] = useState<LinhaPlanilha[]>([]);
  const [colunas, setColunas] = useState<ColunaInfo[]>([]);
  const [negocio, setNegocio] = useState("");
  const [pedido, setPedido] = useState("");
  const [modo, setModo] = useState<"substituir" | "acrescentar">("substituir");

  const ehLancamento = pareceLancamentoAluguel(colunas.map((c) => c.nome));
  const linhasFinais = modo === "acrescentar" && relatorioAtual ? [...relatorioAtual.linhas, ...rows] : rows;
  const previa = passo === 3 ? calcularPreviaGenerica(colunas, linhasFinais, pedido) : null;
  const qualidade = rows.length ? analisarQualidade(colunas, rows) : [];
  const nomesAtuais = relatorioAtual?.colunas.map((c) => c.nome) ?? [];
  const nomesNovos = colunas.map((c) => c.nome);
  const colunasIguais = nomesAtuais.length === nomesNovos.length && nomesAtuais.every((c) => nomesNovos.includes(c));
  const colunasRemovidas = nomesAtuais.filter((c) => !nomesNovos.includes(c));
  const [graficosAfetados, setGraficosAfetados] = useState<string[]>([]);

  useEffect(() => {
    if (!relatorioAtual || !colunas.length) return;
    const afetados = (carregarAIConfig(projetoId).widgets ?? [])
      .filter((w) => !nomesNovos.includes(w.groupBy) || (w.campo && !nomesNovos.includes(w.campo)))
      .map((w) => w.title);
    setGraficosAfetados(afetados);
  }, [colunas, projetoId, relatorioAtual]);

  function diagnostico() {
    return <section className="mb-4 border-t border-border pt-4">
      <h3 className="mb-2 text-sm font-semibold">Qualidade da planilha</h3>
      {qualidade.length === 0 ? <p className="text-sm text-live">Nenhum problema encontrado nas verificações iniciais.</p> : (
        <div className="space-y-2">{qualidade.map((item) => (
          <div key={item.codigo} className={`border-l-2 px-3 py-1 text-sm ${item.severidade === "erro" ? "border-danger" : "border-pending"}`}>
            <div className="font-medium">{item.titulo}</div>
            <p className="text-xs text-text-muted">{item.descricao}</p>
          </div>
        ))}</div>
      )}
    </section>;
  }

  useEffect(() => {
    try {
      const pendente = sessionStorage.getItem(CHAVE_IMPORT_PENDENTE);
      if (!pendente) return;
      sessionStorage.removeItem(CHAVE_IMPORT_PENDENTE);
      const dados = JSON.parse(pendente) as {
        arquivoNome: string;
        rows: LinhaPlanilha[];
        colunas: ColunaInfo[];
      };
      setArquivoNome(dados.arquivoNome);
      setRows(dados.rows);
      setColunas(dados.colunas);
      setNegocio(chutarNegocio(dados.colunas.map((c) => c.nome)));
      setModo("substituir");
      setPasso(1);
    } catch {
      // planilha pendente corrompida/indisponível — usuário só recomeça do passo 0
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function lerArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivoNome(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json<LinhaPlanilha>(sheet, { defval: "" });
        if (parsed.length === 0) {
          aviso("Planilha vazia ou não reconhecida.", "error", "Arquivo inválido");
          return;
        }
        const colunasDetectadas = detectarColunas(parsed);
        setRows(parsed);
        setColunas(colunasDetectadas);
        setNegocio(chutarNegocio(colunasDetectadas.map((c) => c.nome)));
        setModo("substituir");
        setPasso(1);
      } catch {
        aviso("Não consegui ler esse arquivo. Confira se é um .xlsx válido.", "error", "Arquivo inválido");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  async function importarComoLancamentos() {
    setCarregando(true);
    try {
      const resp = await fetch("/api/lancamentos/importar-lote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projetoSlug, linhas: rows }),
      });
      const corpo = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(corpo.erro ?? "Erro ao importar");
      aviso(
        `${corpo.importados} lançamento(s) importado(s)` +
          (corpo.erros ? `, ${corpo.erros} ignorado(s) por falta de dado.` : "."),
        "success",
        "Importação concluída"
      );
      router.push(`/relatorios/${projetoSlug}`);
      router.refresh();
    } catch (err) {
      aviso(err instanceof Error ? err.message : "Erro ao importar", "error");
    } finally {
      setCarregando(false);
    }
  }

  async function confirmarEPublicar() {
    setCarregando(true);
    try {
      const resp = await fetch("/api/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projetoSlug,
          arquivoOriginal: arquivoNome,
          colunas: colunas.map((c) => ({ nome: c.nome, tipo: c.tipo })),
          linhas: rows,
          modo,
        }),
      });
      const corpo = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(corpo.erro ?? "Erro ao publicar");
      aviso("Versão publicada com os dados importados.", "success", "Versão publicada");
      router.push(`/relatorios/${projetoSlug}`);
      router.refresh();
    } catch (err) {
      aviso(err instanceof Error ? err.message : "Erro ao publicar", "error");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl p-6">
      <Link href={`/relatorios/${projetoSlug}`} className="text-xs text-text-faint hover:text-accent">
        ← Voltar pro relatório
      </Link>
      <h1 className="mb-1 mt-1 text-lg font-bold">Importar planilha</h1>
      <p className="mb-6 text-sm text-text-muted">{projetoNome}</p>
      {relatorioAtual && <div className="mb-5 border-l-2 border-accent pl-3 text-sm text-text-muted">Planilha atual: {relatorioAtual.linhas.length} linhas. A nova importação criará outra versão do projeto.</div>}

      {passo === 0 && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
          <p className="mb-4 text-sm text-text-muted">
            Envie um arquivo .xlsx. A gente detecta as colunas automaticamente e monta um relatório.
          </p>
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={lerArquivo}
            className="block w-full text-sm text-text file:mr-3 file:rounded-lg file:border-0 file:bg-accent file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
        </div>
      )}

      {passo === 1 && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
          <h3 className="mb-3 text-sm font-semibold">Colunas detectadas</h3>
          {relatorioAtual && <fieldset className="mb-5 border-b border-border pb-5">
            <legend className="mb-2 text-sm font-semibold">Como atualizar os dados?</legend>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2"><input type="radio" name="modo" checked={modo === "substituir"} onChange={() => setModo("substituir")} /> Substituir dados atuais</label>
              <label className="flex items-center gap-2"><input type="radio" name="modo" checked={modo === "acrescentar"} onChange={() => setModo("acrescentar")} disabled={!colunasIguais} /> Acrescentar linhas</label>
            </div>
            <p className="mt-2 text-xs text-text-muted">{colunasIguais ? "Colunas compatíveis com a planilha atual." : `Colunas diferentes. Para acrescentar, use os mesmos nomes: ${nomesAtuais.join(", ")}.`}</p>
            {colunasRemovidas.length > 0 && <p className="mt-2 text-xs text-pending">Colunas ausentes: {colunasRemovidas.join(", ")}. Gráficos que dependem delas podem parar de funcionar.</p>}
            {graficosAfetados.length > 0 && <p className="mt-2 text-xs text-danger">Gráficos afetados neste navegador: {graficosAfetados.join(", ")}.</p>}
          </fieldset>}
          {diagnostico()}
          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-text-faint">
                  <th className="pb-2 pr-3 font-semibold">Coluna</th>
                  <th className="pb-2 pr-3 font-semibold">Tipo</th>
                  <th className="pb-2 font-semibold">Exemplo</th>
                </tr>
              </thead>
              <tbody>
                {colunas.map((c) => (
                  <tr key={c.nome} className="border-b border-border last:border-0">
                    <td className="py-2 pr-3">{c.nome}</td>
                    <td className="py-2 pr-3">
                      <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs">{c.tipo}</span>
                    </td>
                    <td className="py-2 text-text-muted">{c.exemplo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <label className="mb-4 block text-xs text-text-muted">
            Do que se trata esse negócio?
            <input
              type="text"
              value={negocio}
              onChange={(e) => setNegocio(e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
            />
          </label>

          {ehLancamento && (
            <div className="mb-4 rounded-lg border border-border bg-surface-2 p-3 text-sm">
              <p className="mb-2 text-text-muted">
                Essa planilha parece ter o formato de lançamentos (data/descrição/categoria/tipo/valor).
              </p>
              <button
                onClick={importarComoLancamentos}
                disabled={carregando}
                className="rounded-lg bg-live px-3 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
              >
                {carregando ? "Importando..." : "Importar direto pra lista de lançamentos"}
              </button>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPasso(0)}
              className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-text hover:bg-surface-3"
            >
              Voltar
            </button>
            <button
              onClick={() => setPasso(2)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Confirmar estrutura
            </button>
          </div>
        </div>
      )}

      {passo === 2 && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
          <label className="mb-4 block text-xs text-text-muted">
            Descreva o que você quer ver no relatório (opcional)
            <textarea
              value={pedido}
              onChange={(e) => setPedido(e.target.value)}
              rows={3}
              placeholder={`Ex: quero ver ${colunas[0]?.nome ?? "..."} agrupado`}
              className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text"
            />
          </label>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPasso(1)}
              className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-text hover:bg-surface-3"
            >
              Voltar
            </button>
            <button
              onClick={() => setPasso(3)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Gerar prévia
            </button>
          </div>
        </div>
      )}

      {passo === 3 && previa && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-4 border-b border-border pb-3 text-sm"><strong>{modo === "acrescentar" ? "Acrescentar" : "Substituir"}</strong> · {relatorioAtual?.linhas.length ?? 0} linhas atuais · {rows.length} novas · {linhasFinais.length} no relatório após confirmar.</div>
          {diagnostico()}
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {previa.kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-border bg-surface-2 p-4">
                <div className="mb-1 text-xs text-text-muted">{k.label}</div>
                <div className="text-lg font-bold tabular-nums">{k.valor}</div>
              </div>
            ))}
          </div>

          {previa.grafico ? (
            <div className="mb-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
                {previa.grafico.titulo}
              </h3>
              <div className="space-y-1.5">
                {previa.grafico.barras.map((b) => (
                  <div key={b.chave} className="grid grid-cols-[1fr_2fr_auto] items-center gap-2 text-sm">
                    <span className="truncate">{b.chave}</span>
                    <span className="h-2 overflow-hidden rounded-full bg-surface-3">
                      <span
                        className="block h-full rounded-full bg-accent"
                        style={{ width: `${b.pct}%` }}
                      />
                    </span>
                    <span className="tabular-nums text-right text-text-muted">
                      {b.valor.toLocaleString("pt-BR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="mb-4 text-sm text-text-muted">
              Essa planilha não tem uma combinação óbvia de categoria + número pra gerar gráfico.
            </p>
          )}

          <div className="mb-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-text-faint">
                  {colunas.map((c) => (
                    <th key={c.nome} className="pb-2 pr-3 font-semibold">
                      {c.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {linhasFinais.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {colunas.map((c) => (
                      <td key={c.nome} className="py-2 pr-3">
                        {String(r[c.nome] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {linhasFinais.length > 50 && (
              <p className="mt-2 text-xs text-text-faint">Mostrando 50 de {linhasFinais.length} linhas.</p>
            )}
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPasso(2)}
              className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-text hover:bg-surface-3"
            >
              Ajustar pedido
            </button>
            <button
              onClick={confirmarEPublicar}
              disabled={carregando}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-60"
            >
              {carregando ? "Publicando..." : "Confirmar e publicar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
