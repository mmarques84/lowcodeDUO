"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import * as XLSX from "xlsx";
import { useAviso } from "@/components/aviso/AvisoProvider";
import { analisarQualidade } from "@/lib/qualidadePlanilha";
import type { RelatorioGenerico } from "@/lib/relatorioGenerico";
import { type Widget } from "@/lib/widgets";
import ConfiguracaoAnaliseGrid from "@/components/ConfiguracaoAnaliseGrid";
import { aplicarPrompt } from "@/lib/aplicarPrompt";
import { carregarConfiguracao, executarAnalise, salvarConfiguracao, sugerirConfiguracao, type ConfiguracaoAnalise } from "@/lib/configuracaoAnalise";
import {
  detectarColunas,
  pareceLancamentoAluguel,
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
  const [config, setConfig] = useState<ConfiguracaoAnalise>(() => sugerirConfiguracao([]));
  const [abas, setAbas] = useState<{ nome: string; rows: LinhaPlanilha[] }[]>([]);
  const [errosConfig, setErrosConfig] = useState<string[]>([]);
  const [modo, setModo] = useState<"substituir" | "acrescentar">("substituir");

  const ehLancamento = pareceLancamentoAluguel(colunas.map((c) => c.nome));
  const linhasFinais = modo === "acrescentar" && relatorioAtual ? [...relatorioAtual.linhas, ...rows] : rows;
  const analise = passo === 3 ? executarAnalise(config, linhasFinais) : null;
  const previa = analise?.previa;
  const colunasVisiveis = colunas.filter((c) => config.colunas.includes(c.nome));
  const qualidade = rows.length ? analisarQualidade(colunas, rows) : [];
  const nomesAtuais = relatorioAtual?.colunas.map((c) => c.nome) ?? [];
  const nomesNovos = colunas.map((c) => c.nome);
  const colunasIguais = nomesAtuais.length === nomesNovos.length && nomesAtuais.every((c) => nomesNovos.includes(c));
  const colunasRemovidas = nomesAtuais.filter((c) => !nomesNovos.includes(c));
  const widgetsSalvos = useSyncExternalStore(
    (callback) => { window.addEventListener("storage", callback); return () => window.removeEventListener("storage", callback); },
    () => { try { return localStorage.getItem(`lowcodeduo_ai_config_${projetoId}`); } catch { return null; } },
    () => null,
  );
  const graficosAfetados = useMemo(() => {
    if (!relatorioAtual || !colunas.length) return [];
    try {
      const widgets = JSON.parse(widgetsSalvos ?? "{}").widgets;
      if (!Array.isArray(widgets)) return [];
      const nomes = colunas.map((c) => c.nome);
      return (widgets as Widget[]).filter((w) => w && (!nomes.includes(w.groupBy) || (w.campo && !nomes.includes(w.campo)))).map((w) => w.title);
    } catch { return []; }
  }, [widgetsSalvos, colunas, relatorioAtual]);

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
    // O arquivo é transferido de outra tela via sessionStorage. Consumimos após
    // a hidratação, em uma tarefa cancelável, antes de apresentar a estrutura.
    const tarefa = window.setTimeout(() => {
    try {
      const pendente = sessionStorage.getItem(CHAVE_IMPORT_PENDENTE);
      if (!pendente) return;
      sessionStorage.removeItem(CHAVE_IMPORT_PENDENTE);
      const dados = JSON.parse(pendente) as {
        arquivoNome: string;
        rows: LinhaPlanilha[];
        colunas: ColunaInfo[];
        abas?: { nome: string; rows: LinhaPlanilha[] }[];
      };
      setArquivoNome(dados.arquivoNome);
      setRows(dados.rows);
      setColunas(dados.colunas);
      const abasLidas = dados.abas ?? [{ nome: "Dados", rows: dados.rows }];
      setAbas(abasLidas);
      const salvo = carregarConfiguracao(projetoId);
      const selecionada = abasLidas.find((a) => a.nome === salvo?.aba && a.rows.length) ?? abasLidas.find((a) => a.rows.length);
      if (selecionada) {
        const detectadas = detectarColunas(selecionada.rows);
        setRows(selecionada.rows);
        setColunas(detectadas);
        setConfig(salvo ? { ...salvo, aba: selecionada.nome } : sugerirConfiguracao(detectadas, selecionada.nome));
      }
      setModo("substituir");
      setPasso(1);
    } catch {
      // planilha pendente corrompida/indisponível — usuário só recomeça do passo 0
    }
    }, 0);
    return () => window.clearTimeout(tarefa);
  }, [projetoId]);

  function lerArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setArquivoNome(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = new Uint8Array(ev.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const abasLidas = wb.SheetNames.map((nome) => ({ nome, rows: XLSX.utils.sheet_to_json<LinhaPlanilha>(wb.Sheets[nome], { defval: "" }) }));
        const salvo = carregarConfiguracao(projetoId);
        const selecionada = abasLidas.find((a) => a.nome === salvo?.aba && a.rows.length) ?? abasLidas.find((a) => a.rows.length);
        if (!selecionada) {
          aviso("Planilha vazia ou não reconhecida.", "error", "Arquivo inválido");
          return;
        }
        const colunasDetectadas = detectarColunas(selecionada.rows);
        setAbas(abasLidas);
        setRows(selecionada.rows);
        setColunas(colunasDetectadas);
        setConfig(salvo ? { ...salvo, aba: selecionada.nome } : sugerirConfiguracao(colunasDetectadas, selecionada.nome));
        setErrosConfig([]);
        setModo("substituir");
        setPasso(1);
      } catch {
        aviso("Não consegui ler esse arquivo. Confira se é um .xlsx válido.", "error", "Arquivo inválido");
      }
    };
    reader.onerror = () => aviso("Não foi possível ler o arquivo. Tente novamente.", "error");
    reader.readAsArrayBuffer(file);
  }

  function selecionarAba(nome: string) {
    const selecionada = abas.find((a) => a.nome === nome);
    if (!selecionada?.rows.length) return;
    const detectadas = detectarColunas(selecionada.rows);
    setRows(selecionada.rows);
    setColunas(detectadas);
    setConfig(sugerirConfiguracao(detectadas, nome));
    setModo("substituir");
    setErrosConfig([]);
  }

  function gerarPrevia() {
    const resultado = aplicarPrompt(config, colunas);
    setErrosConfig(resultado.erros);
    if (!resultado.erros.length) { setConfig(resultado.config); setPasso(3); }
  }

  function salvarModelo() {
    const resultado = aplicarPrompt(config, colunas);
    setErrosConfig(resultado.erros);
    if (resultado.erros.length) return;
    try {
      salvarConfiguracao(projetoId, resultado.config);
      setConfig(resultado.config);
      aviso("Modelo salvo neste navegador para os próximos envios deste projeto.", "success");
    } catch { aviso("Não foi possível salvar neste navegador. Você ainda pode gerar a análise.", "error"); }
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
      try { salvarConfiguracao(projetoId, config); }
      catch { aviso("Os dados foram publicados, mas a configuração não pôde ser salva neste navegador.", "error"); }
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
    <div className="mx-auto w-full max-w-4xl p-4 sm:p-6">
      <Link href={`/relatorios/${projetoSlug}`} className="text-xs text-text-faint hover:text-accent">
        ← Voltar pro relatório
      </Link>
      <h1 className="mb-1 mt-1 text-lg font-bold">Importar planilha</h1>
      <p className="mb-6 text-sm text-text-muted">{projetoNome}</p>
      <ol className="mb-6 grid grid-cols-4 gap-2 text-xs text-text-muted" aria-label="Etapas da importação">{["Enviar arquivo", "Conferir dados", "Personalizar", "Ver resultado"].map((titulo, i) => <li key={titulo} aria-current={passo === i ? "step" : undefined} className={`border-t-2 pt-2 ${passo === i ? "border-accent font-semibold text-accent" : passo > i ? "border-live text-live" : "border-border"}`}>{i + 1}. {titulo}</li>)}</ol>
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
          <label className="mb-5 block text-xs text-text-muted">Aba da planilha<select value={config.aba} onChange={(e) => selecionarAba(e.target.value)} className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text">{abas.map((a) => <option key={a.nome} value={a.nome} disabled={!a.rows.length}>{a.nome} · {a.rows.length} registros</option>)}</select></label>
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
        <div>
          <ConfiguracaoAnaliseGrid config={config} onChange={setConfig} colunas={colunas} abas={abas.map((a) => ({ nome: a.nome, linhas: a.rows.length }))} onAbaChange={selecionarAba} erros={errosConfig} />
          <p className="my-3 text-xs text-text-muted">O modelo é salvo neste navegador, por projeto. Uma mudança de aba inicia novas sugestões.</p>
          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button type="button" onClick={() => { setConfig(sugerirConfiguracao(colunas, config.aba)); setErrosConfig([]); }} className="mr-auto text-sm text-accent hover:underline">Usar novas sugestões</button>
            <button
              onClick={() => setPasso(1)}
              className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-text hover:bg-surface-3"
            >
              Voltar
            </button>
            <button type="button" onClick={salvarModelo} className="rounded-lg border border-accent/30 bg-accent-soft px-4 py-2 text-sm font-semibold text-accent">Salvar modelo</button>
            <button
              onClick={gerarPrevia}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              Gerar análise
            </button>
          </div>
        </div>
      )}

      {passo === 3 && previa && (
        <div className="rounded-xl border border-border bg-surface p-6 shadow-[var(--shadow-soft)]">
          <div className="mb-4 border-b border-border pb-3 text-sm"><strong>{modo === "acrescentar" ? "Acrescentar" : "Substituir"}</strong> · {relatorioAtual?.linhas.length ?? 0} linhas atuais · {rows.length} novas · {linhasFinais.length} no relatório após confirmar.</div>
          {diagnostico()}
          <div className="mb-4 rounded-xl bg-accent-soft p-4"><h2 className="text-sm font-semibold">{config.objetivo}</h2><p className="mt-1 text-xs text-text-muted">{analise?.resumo}</p></div>
          {config.entregas.indicadores && <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {previa.kpis.map((k) => (
              <div key={k.label} className="rounded-xl border border-border bg-surface-2 p-4">
                <div className="mb-1 text-xs text-text-muted">{k.label}</div>
                <div className="text-lg font-bold tabular-nums">{k.valor}</div>
              </div>
            ))}
          </div>}

          {config.entregas.grafico && (previa.grafico ? (
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
                        className={`block h-full rounded-full ${b.valor < 0 ? "bg-danger" : "bg-accent"}`}
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
              Escolha um agrupamento em Mais opções para gerar o gráfico. Se houver filtros, confira se existem registros no período.
            </p>
          ))}

          {config.entregas.dados && <div className="mb-4 overflow-x-auto">
            {analise?.linhas.length === 0 && <p className="mb-3 text-sm text-text-muted">Nenhum registro atende aos filtros e ao período escolhidos.</p>}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase text-text-faint">
                  {colunasVisiveis.map((c) => (
                    <th key={c.nome} className="pb-2 pr-3 font-semibold">
                      {c.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {analise?.linhas.slice(0, 50).map((r, i) => (
                  <tr key={i} className="border-b border-border last:border-0">
                    {colunasVisiveis.map((c) => (
                      <td key={c.nome} className="py-2 pr-3">
                        {String(r[c.nome] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {(analise?.linhas.length ?? 0) > 50 && (
              <p className="mt-2 text-xs text-text-faint">Mostrando 50 de {analise?.linhas.length} linhas.</p>
            )}
          </div>}

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPasso(2)}
              className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-sm font-semibold text-text hover:bg-surface-3"
            >
              Editar configuração
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
