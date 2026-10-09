import type { ConfiguracaoAnalise } from "@/lib/configuracaoAnalise";
import type { ColunaInfo } from "@/lib/planilha";

export function descreverCalculo(config: ConfiguracaoAnalise): string {
  const calculo = config.operacao === "contagem" ? "Contagem de registros" : `${config.operacao === "media" ? "Média" : "Soma"} de ${config.medida || "uma coluna"}`;
  return `${calculo}${config.agruparPor ? ` por ${config.agruparPor}` : ""}`;
}

export function gerarPromptAnalise(config: ConfiguracaoAnalise, colunas: ColunaInfo[]): string {
  const operadores = { igual: "é igual a", diferente: "é diferente de", contem: "contém" };
  const entregas = [config.entregas.indicadores && "indicadores", config.entregas.grafico && "gráfico", config.entregas.dados && "tabela de dados"].filter(Boolean).join(", ");
  return [
    "Analise a planilha Excel anexada seguindo a configuração abaixo.",
    "",
    `CONTEXTO: ${config.assunto || "Análise de dados"}`,
    `OBJETIVO: ${config.objetivo || "Não definido"}`,
    "",
    "FONTE DOS DADOS",
    `Aba: ${config.aba || "Use a aba de dados do arquivo anexado; confirme seu nome antes de analisar."}`,
    `Colunas disponíveis: ${colunas.map((c) => `${c.nome} (${c.tipo})`).join(", ")}.`,
    `Colunas a exibir na tabela: ${config.colunas.join(", ") || "Nenhuma selecionada"}.`,
    "Use também as colunas necessárias ao cálculo, ao agrupamento e aos filtros, mesmo que estejam ocultas na tabela.",
    "",
    "CÁLCULO",
    descreverCalculo(config) + ".",
    config.operacao === "contagem" ? "Conte as linhas após aplicar os filtros." : "Valores vazios ou não numéricos devem ser desconsiderados no cálculo e contabilizados separadamente. Na média, divida pela quantidade de valores numéricos válidos, inclusive valores iguais a zero. Se não houver valores numéricos válidos, apresente 'Sem valores numéricos', sem substituir por zero.",
    config.agruparPor ? "Apresente até 10 grupos, ordenados do maior resultado para o menor. Mostre valores negativos com seu sinal." : "Não há agrupamento definido.",
    "",
    "PERÍODO E FILTROS",
    config.inicio || config.fim ? `Filtre pela coluna ${config.colunaData || "(a definir)"}, de ${config.inicio || "qualquer data inicial"} até ${config.fim || "qualquer data final"}, incluindo os limites. Datas ausentes ou inválidas ficam fora desse período.` : "Considere todo o período disponível.",
    config.filtros.length ? config.filtros.map((f, i) => `${i + 1}. ${f.coluna || "(coluna a definir)"} ${operadores[f.operador]} ${JSON.stringify(f.valor)}.`).join("\n") + "\nCombine todas as condições com E. Compare textos sem diferenciar maiúsculas e minúsculas e removendo espaços nas extremidades." : "Sem filtros adicionais.",
    "",
    "ENTREGA",
    `Apresente: ${entregas || "(a definir)"}.`,
    "Explique os resultados de forma objetiva e indique aba, colunas, filtros e cálculo de cada indicador. Mostre a quantidade de registros considerados.",
    "O objetivo fornece contexto; as regras de cálculo acima definem os números. Se o objetivo exigir outra análise, peça esclarecimento antes de mudar essas regras.",
    "Não invente dados, metas, tendências ou causas. Não some dados de outras abas nem altere o arquivo original. Se faltar uma coluna necessária, indique o que falta antes de calcular.",
  ].join("\n");
}
