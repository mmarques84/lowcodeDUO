import { chutarNegocio, ehTipoNumero, type ColunaInfo, type LinhaPlanilha, type PreviaGenerica } from "@/lib/planilha";

export type FiltroAnalise = { coluna: string; operador: "igual" | "diferente" | "contem"; valor: string };
export type ConfiguracaoAnalise = {
  versao: 1;
  assunto: string;
  objetivo: string;
  aba: string;
  colunas: string[];
  agruparPor: string;
  medida: string;
  operacao: "soma" | "media" | "contagem";
  colunaData: string;
  inicio: string;
  fim: string;
  filtros: FiltroAnalise[];
  entregas: { indicadores: boolean; grafico: boolean; dados: boolean };
  promptPersonalizado?: { texto: string; base: string; aplicado?: string };
};

export function sugerirConfiguracao(colunas: ColunaInfo[], aba = ""): ConfiguracaoAnalise {
  const medidas = colunas.filter((c) => ehTipoNumero(c.tipo) && !/^(id|c[oó]digo|cep|telefone)$|(^|[_ ])id($|[_ ])/i.test(c.nome));
  const medida = medidas.find((c) => /valor|receita|custo|pre[cç]o|quantidade|total/i.test(c.nome)) ?? medidas[0];
  const grupo = colunas.find((c) => c.tipo === "texto" && /categoria|produto|vendedor|status|unidade|departamento/i.test(c.nome)) ?? colunas.find((c) => c.tipo === "texto");
  return {
    versao: 1,
    assunto: chutarNegocio(colunas.map((c) => c.nome)),
    objetivo: medida && grupo ? `Acompanhar ${medida.nome} por ${grupo.nome}.` : "Conhecer os dados e acompanhar a distribuição dos registros.",
    aba,
    colunas: colunas.map((c) => c.nome),
    agruparPor: grupo?.nome ?? "",
    medida: medida?.nome ?? "",
    operacao: medida ? /%|percentual|progresso/i.test(medida.nome) ? "media" : "soma" : "contagem",
    colunaData: "",
    inicio: "",
    fim: "",
    filtros: [],
    entregas: { indicadores: true, grafico: true, dados: true },
  };
}

function ehConfiguracao(value: unknown): value is ConfiguracaoAnalise {
  if (!value || typeof value !== "object") return false;
  const c = value as ConfiguracaoAnalise;
  return c.versao === 1 && [c.assunto, c.objetivo, c.aba, c.agruparPor, c.medida, c.colunaData, c.inicio, c.fim].every((v) => typeof v === "string") &&
    Array.isArray(c.colunas) && c.colunas.every((v) => typeof v === "string") &&
    ["soma", "media", "contagem"].includes(c.operacao) && Array.isArray(c.filtros) && c.filtros.every((f) =>
      f && typeof f.coluna === "string" && typeof f.valor === "string" && ["igual", "diferente", "contem"].includes(f.operador)) &&
    !!c.entregas && [c.entregas.indicadores, c.entregas.grafico, c.entregas.dados].every((v) => typeof v === "boolean") &&
    (c.promptPersonalizado === undefined || !!c.promptPersonalizado && typeof c.promptPersonalizado.texto === "string" && typeof c.promptPersonalizado.base === "string" && (c.promptPersonalizado.aplicado === undefined || typeof c.promptPersonalizado.aplicado === "string"));
}

export function carregarConfiguracao(projetoId: number): ConfiguracaoAnalise | null {
  return interpretarConfiguracao(lerModeloSalvo(projetoId));
}

export function interpretarConfiguracao(valor: string | null): ConfiguracaoAnalise | null {
  try {
    const config: unknown = JSON.parse(valor ?? "null");
    return ehConfiguracao(config) ? config : null;
  } catch { return null; }
}

export function lerModeloSalvo(projetoId: number): string | null {
  try { return localStorage.getItem(`lowcodeduo_analise_${projetoId}`); }
  catch { return null; }
}

export function assinarModelos(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("lowcodeduo:analise", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("lowcodeduo:analise", callback);
  };
}

export function salvarConfiguracao(projetoId: number, config: ConfiguracaoAnalise) {
  // Mantém a mesma persistência por navegador usada pelos widgets do projeto.
  localStorage.setItem(`lowcodeduo_analise_${projetoId}`, JSON.stringify(config));
  window.dispatchEvent(new Event("lowcodeduo:analise"));
}

export function validarConfiguracao(config: ConfiguracaoAnalise, colunas: ColunaInfo[]): string[] {
  const nomes = new Set(colunas.map((c) => c.nome));
  const erros: string[] = [];
  if (!config.objetivo.trim()) erros.push("Descreva o que deseja descobrir.");
  if (!config.colunas.length) erros.push("Selecione pelo menos uma coluna.");
  const referencias = [...config.colunas, config.entregas.grafico ? config.agruparPor : "", config.operacao !== "contagem" ? config.medida : "", config.inicio || config.fim ? config.colunaData : "", ...config.filtros.map((f) => f.coluna)].filter(Boolean);
  const ausentes = [...new Set(referencias.filter((nome) => !nomes.has(nome)))];
  if (ausentes.length) erros.push(`Confira as colunas ausentes: ${ausentes.join(", ")}.`);
  if (config.operacao !== "contagem" && !colunas.some((c) => c.nome === config.medida && ehTipoNumero(c.tipo))) erros.push("Escolha uma coluna numérica para somar ou calcular a média.");
  if (config.inicio && config.fim && config.inicio > config.fim) erros.push("A data inicial deve ser anterior ou igual à data final.");
  if ((config.inicio || config.fim) && !config.colunaData) erros.push("Escolha a coluna de data para aplicar o período.");
  if (config.filtros.some((f) => !f.coluna || !f.valor.trim())) erros.push("Preencha a coluna e o valor de cada filtro ou remova o filtro.");
  if (!Object.values(config.entregas).some(Boolean)) erros.push("Escolha pelo menos um resultado desejado.");
  if (config.promptPersonalizado && !config.promptPersonalizado.texto.trim()) erros.push("Preencha o prompt personalizado ou restaure o automático.");
  if (config.promptPersonalizado && config.promptPersonalizado.texto.length > 30000) erros.push("O prompt personalizado deve ter até 30.000 caracteres.");
  return erros;
}

export function numeroAnalise(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== "string" || !valor.trim()) return null;
  let texto = valor.trim().replace(/R\$\s*/g, "").replace(/\s/g, "").replace(/%$/, "");
  if (texto.includes(",")) texto = texto.replace(/\./g, "").replace(",", ".");
  const n = Number(texto);
  return Number.isFinite(n) ? n : null;
}

function dataAnalise(valor: unknown): string | null {
  if (typeof valor === "number") {
    // Datas seriais do Excel, incluindo a correção do calendário de 1900.
    const data = new Date(Date.UTC(1899, 11, 30) + Math.floor(valor) * 86400000);
    return Number.isFinite(data.getTime()) ? data.toISOString().slice(0, 10) : null;
  }
  const texto = String(valor ?? "").trim();
  const iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T|\s)/);
  const br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:$|\s)/);
  const chave = iso ? `${iso[1]}-${iso[2]}-${iso[3]}` : br ? `${br[3]}-${br[2]}-${br[1]}` : null;
  if (!chave) return null;
  const data = new Date(`${chave}T00:00:00Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 10) === chave ? chave : null;
}

export function executarAnalise(config: ConfiguracaoAnalise, rows: LinhaPlanilha[]): { previa: PreviaGenerica; linhas: LinhaPlanilha[]; resumo: string } {
  const linhas = rows.filter((linha) => {
    if (config.inicio || config.fim) {
      const data = dataAnalise(linha[config.colunaData]);
      if (!data || (config.inicio && data < config.inicio) || (config.fim && data > config.fim)) return false;
    }
    return config.filtros.every((f) => {
      const valor = String(linha[f.coluna] ?? "").trim().toLocaleLowerCase("pt-BR");
      const esperado = f.valor.trim().toLocaleLowerCase("pt-BR");
      return f.operador === "igual" ? valor === esperado : f.operador === "diferente" ? valor !== esperado : valor.includes(esperado);
    });
  });
  const valores = linhas.map((l) => numeroAnalise(l[config.medida])).filter((n): n is number => n !== null);
  const soma = valores.reduce((s, n) => s + n, 0);
  const resultado = config.operacao === "contagem" ? linhas.length : config.operacao === "media" ? valores.length ? soma / valores.length : null : valores.length ? soma : null;
  const rotulo = config.operacao === "contagem" ? "Registros analisados" : `${config.operacao === "media" ? "Média" : "Total"} de ${config.medida}`;
  const formatar = (valor: number) => valor.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
  const kpis = [{ label: rotulo, valor: resultado === null ? "Sem valores numéricos" : formatar(resultado) }];
  if (config.operacao !== "contagem") kpis.push({ label: "Registros analisados", valor: formatar(linhas.length) });
  const grupos = new Map<string, { soma: number; quantidade: number }>();
  if (config.agruparPor) for (const linha of linhas) {
    const n = config.operacao === "contagem" ? 1 : numeroAnalise(linha[config.medida]);
    if (n === null) continue;
    const chave = String(linha[config.agruparPor] ?? "").trim() || "(vazio)";
    const grupo = grupos.get(chave) ?? { soma: 0, quantidade: 0 };
    grupo.soma += n;
    grupo.quantidade++;
    grupos.set(chave, grupo);
  }
  const barras = [...grupos].map(([chave, grupo]) => ({ chave, valor: config.operacao === "media" ? grupo.soma / grupo.quantidade : grupo.soma, pct: 0 }))
    .sort((a, b) => b.valor - a.valor).slice(0, 10);
  const max = Math.max(1, ...barras.map((b) => Math.abs(b.valor)));
  for (const barra of barras) barra.pct = Math.round(Math.abs(barra.valor) / max * 100);
  return {
    linhas,
    previa: { kpis, grafico: config.agruparPor && barras.length ? { titulo: `${rotulo} por ${config.agruparPor}`, barras } : null },
    resumo: `${formatar(linhas.length)} de ${formatar(rows.length)} registros atendem à configuração.${config.operacao !== "contagem" && valores.length !== linhas.length ? ` ${formatar(linhas.length - valores.length)} registro(s) sem valor numérico foram desconsiderados no cálculo.` : ""}`,
  };
}
