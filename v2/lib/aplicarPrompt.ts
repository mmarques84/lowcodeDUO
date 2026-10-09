import { validarConfiguracao, type ConfiguracaoAnalise, type FiltroAnalise } from "@/lib/configuracaoAnalise";
import { gerarPromptAnalise } from "@/lib/promptAnalise";
import { ehTipoNumero, type ColunaInfo } from "@/lib/planilha";

function normalizar(texto: string) {
  return texto.trim().replace(/\.$/, "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").toLowerCase();
}

/** Converte as instruções estruturadas em regras verificáveis; não executa texto livre. */
export function aplicarPrompt(config: ConfiguracaoAnalise, colunas: ColunaInfo[]): { config: ConfiguracaoAnalise; erros: string[] } {
  const personalizado = config.promptPersonalizado;
  if (!personalizado || personalizado.texto === personalizado.base || personalizado.texto === personalizado.aplicado) return { config, erros: validarConfiguracao(config, colunas) };
  const texto = personalizado.texto.trim();
  const linhas = texto.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const base = new Set(personalizado.base.split(/\r?\n/).map((l) => l.trim()).filter(Boolean));
  for (const linha of personalizado.aplicado?.split(/\r?\n/) ?? []) if (linha.trim()) base.add(linha.trim());
  const erros: string[] = [];
  const proxima: ConfiguracaoAnalise = { ...config, filtros: [...config.filtros], entregas: { ...config.entregas } };
  const depois = (titulo: string) => {
    const i = linhas.findIndex((l) => normalizar(l) === titulo);
    return i >= 0 ? linhas[i + 1] ?? "" : "";
  };
  const campo = (prefixo: string) => {
    const correspondentes = linhas.filter((l) => normalizar(l).startsWith(prefixo));
    if (correspondentes.length > 1) erros.push(`Mantenha apenas uma linha para ${prefixo}`);
    const linha = correspondentes[0];
    return linha?.slice(linha.indexOf(":") + 1).trim();
  };
  const resolverColuna = (nome: string) => colunas.find((c) => normalizar(c.nome) === normalizar(nome))?.nome;
  const contexto = campo("contexto:");
  const objetivo = campo("objetivo:");
  if (contexto !== undefined) proxima.assunto = contexto;
  if (objetivo !== undefined) proxima.objetivo = objetivo;
  const aba = campo("aba:");
  if (aba !== undefined && normalizar(aba) !== normalizar(config.aba) && !aba.startsWith("Use a aba de dados")) {
    erros.push("Para trocar a aba, importe novamente a planilha e selecione a aba desejada. O relatório só contém os dados da aba importada.");
  }
  const exibidas = campo("colunas a exibir na tabela:");
  if (exibidas !== undefined) {
    const nomes = exibidas.replace(/\.$/, "").split(",").map((n) => n.trim()).filter(Boolean);
    const encontradas = nomes.map(resolverColuna);
    if (encontradas.some((n) => !n)) erros.push(`Colunas não reconhecidas na tabela: ${nomes.filter((_, i) => !encontradas[i]).join(", ")}.`);
    else proxima.colunas = encontradas as string[];
  }

  const calculo = depois("calculo");
  let calculoReconhecido = false;
  for (const grupo of ["", ...colunas.map((c) => c.nome)]) {
    const sufixo = grupo ? ` por ${grupo}` : "";
    for (const nome of ["Contagem de registros", "Contar registros", "Quantidade de registros"]) {
      if (normalizar(calculo) === normalizar(nome + sufixo)) {
        proxima.operacao = "contagem"; proxima.medida = ""; proxima.agruparPor = grupo; calculoReconhecido = true;
      }
    }
    for (const medida of colunas.filter((c) => ehTipoNumero(c.tipo))) {
      for (const [operacao, nomes] of [["soma", ["Soma de", "Somar", "Total de"]], ["media", ["Média de", "Calcular média de"]]] as const) {
        if (nomes.some((nome) => normalizar(calculo) === normalizar(`${nome} ${medida.nome}${sufixo}`))) {
          proxima.operacao = operacao; proxima.medida = medida.nome; proxima.agruparPor = grupo; calculoReconhecido = true;
        }
      }
    }
  }
  if (!calculoReconhecido) erros.push('Não reconheci o cálculo. Na seção CÁLCULO, use por exemplo "Soma de Valor Total por Vendedor", "Média de Valor Total por Categoria" ou "Contagem de registros por Produto", com os nomes das suas colunas.');

  const periodo = depois("periodo e filtros");
  if (normalizar(periodo) === "considere todo o periodo disponivel") {
    proxima.inicio = ""; proxima.fim = "";
  } else {
    const intervalo = periodo.match(/^Filtre pela coluna (.+), de (\d{4}-\d{2}-\d{2}|qualquer data inicial) at[eé] (\d{4}-\d{2}-\d{2}|qualquer data final), incluindo os limites\./i);
    if (!intervalo || !resolverColuna(intervalo[1])) erros.push("Não reconheci o período. Use o formato automático com datas AAAA-MM-DD ou ajuste o período na configuração.");
    else {
      proxima.colunaData = resolverColuna(intervalo[1])!;
      proxima.inicio = intervalo[2] === "qualquer data inicial" ? "" : intervalo[2];
      proxima.fim = intervalo[3] === "qualquer data final" ? "" : intervalo[3];
      for (const data of [proxima.inicio, proxima.fim].filter(Boolean)) {
        const interpretada = new Date(`${data}T00:00:00Z`);
        if (!Number.isFinite(interpretada.getTime()) || interpretada.toISOString().slice(0, 10) !== data) erros.push(`Data inválida no período: ${data}.`);
      }
    }
  }
  const filtros: FiltroAnalise[] = [];
  const enumeradas = linhas.filter((l) => /^\d+\./.test(l));
  if (enumeradas.length && linhas.some((l) => normalizar(l) === "sem filtros adicionais")) erros.push("O prompt contém filtros e também diz 'Sem filtros adicionais'. Remova a instrução que não se aplica.");
  for (const linha of enumeradas) {
    const filtro = linha.match(/^\d+\. (.+?) (é igual a|e igual a|é diferente de|e diferente de|contém|contem) ("(?:[^"\\]|\\.)*")\.?$/i);
    const coluna = filtro ? resolverColuna(filtro[1]) : undefined;
    if (!filtro || !coluna) { erros.push(`Não reconheci este filtro: ${linha}. Use, por exemplo, 1. Categoria é igual a "Calcados".`); continue; }
    const op = normalizar(filtro[2]);
    try { filtros.push({ coluna, operador: op === "e igual a" ? "igual" : op === "e diferente de" ? "diferente" : "contem", valor: JSON.parse(filtro[3]) as string }); }
    catch { erros.push(`Confira as aspas e os caracteres do valor neste filtro: ${linha}.`); }
  }
  if (enumeradas.length || linhas.some((l) => normalizar(l) === "sem filtros adicionais")) proxima.filtros = filtros;
  else erros.push("Defina os filtros na seção PERÍODO E FILTROS, ou escreva 'Sem filtros adicionais'.");
  const entrega = campo("apresente:");
  if (entrega === undefined) erros.push("Mantenha a linha 'Apresente:' na seção ENTREGA para definir os resultados.");
  else {
    const opcoes = entrega.replace(/\.$/, "").split(",").map(normalizar);
    if (opcoes.some((o) => !["indicadores", "grafico", "tabela de dados"].includes(o))) erros.push("Resultados disponíveis no painel: indicadores, gráfico e tabela de dados.");
    proxima.entregas = { indicadores: opcoes.includes("indicadores"), grafico: opcoes.includes("grafico"), dados: opcoes.includes("tabela de dados") };
  }

  const reconhecidas = new Set([calculo, periodo]);
  const livres = linhas.filter((l) => !base.has(l) && !reconhecidas.has(l) && !["calculo", "periodo e filtros", "entrega", "fonte dos dados"].includes(normalizar(l)) && !/^(CONTEXTO:|OBJETIVO:|Aba:|Colunas a exibir na tabela:|Apresente:|\d+\.)/i.test(l));
  if (livres.length) erros.push(`Estas instruções ainda não podem ser aplicadas ao painel: ${livres.slice(0, 2).join(" / ")}. Use os campos de configuração ou mantenha essas instruções apenas no prompt para copiar à sua IA.`);
  const validacao = validarConfiguracao(proxima, colunas);
  if (erros.length || validacao.length) return { config, erros: [...new Set([...erros, ...validacao])] };
  proxima.promptPersonalizado = { texto: personalizado.texto, base: gerarPromptAnalise(proxima, colunas), aplicado: personalizado.texto };
  return { config: proxima, erros: [] };
}
