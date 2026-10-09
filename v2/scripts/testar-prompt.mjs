import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import XLSX from "xlsx";

const raizTeste = path.dirname(fileURLToPath(import.meta.url));

function carregar(arquivo, dependencias = {}) {
  const modulo = { exports: {} };
  const codigo = ts.transpileModule(fs.readFileSync(path.join(raizTeste, "..", arquivo), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  vm.runInNewContext(codigo, { module: modulo, exports: modulo.exports, require: (nome) => dependencias[nome] });
  return modulo.exports;
}
const planilha = carregar("lib/planilha.ts");
const analise = carregar("lib/configuracaoAnalise.ts", { "@/lib/planilha": planilha });
const prompt = carregar("lib/promptAnalise.ts");
const { aplicarPrompt } = carregar("lib/aplicarPrompt.ts", {
  "@/lib/configuracaoAnalise": analise, "@/lib/planilha": planilha, "@/lib/promptAnalise": prompt,
});
const workbook = XLSX.readFile(path.join(raizTeste, "../../v1/vendas-loja-teste.xlsx"));
const dados = XLSX.utils.sheet_to_json(workbook.Sheets.Vendas, { defval: "" });
const colunas = planilha.detectarColunas(dados);
const config = analise.sugerirConfiguracao(colunas, "Vendas");
const base = prompt.gerarPromptAnalise(config, colunas);
const editado = (texto) => ({ ...config, promptPersonalizado: { texto, base } });
const conferir = (resultado) => { assert.equal(resultado.erros.length, 0, resultado.erros.join("\n")); return resultado.config; };

const texto = base.replace("Soma de Quantidade por Produto.", "Soma de Valor Total por Vendedor.");
const vendas = conferir(aplicarPrompt(editado(texto), colunas));
assert.equal(vendas.medida, "Valor Total");
assert.equal(vendas.agruparPor, "Vendedor");
assert.equal(analise.executarAnalise(vendas, dados).previa.kpis[0].valor, "6.998,5");
conferir(aplicarPrompt(vendas, colunas));
const contagem = conferir(aplicarPrompt({ ...vendas, promptPersonalizado: { ...vendas.promptPersonalizado,
  texto: vendas.promptPersonalizado.texto.replace("Soma de Valor Total por Vendedor.", "Contagem de registros por Categoria."),
} }, colunas));
assert.equal(contagem.operacao, "contagem");
assert.equal(analise.executarAnalise(contagem, dados).previa.kpis[0].valor, "15");
const media = conferir(aplicarPrompt({ ...contagem, promptPersonalizado: { ...contagem.promptPersonalizado,
  texto: contagem.promptPersonalizado.texto.replace("Contagem de registros por Categoria.", "Média de Valor Total por Categoria."),
} }, colunas));
assert.equal(media.operacao, "media");
const filtrada = conferir(aplicarPrompt(editado(texto.replace("Sem filtros adicionais.", '1. Categoria é igual a "Calcados".')), colunas));
assert.equal(analise.executarAnalise(filtrada, dados).linhas.length, 5);
assert.equal(analise.executarAnalise(filtrada, dados).previa.kpis[0].valor, "2.838,9");
const periodo = conferir(aplicarPrompt(editado(texto.replace("Considere todo o período disponível.", "Filtre pela coluna Data, de 2026-09-01 até 2026-09-02, incluindo os limites. Datas ausentes ou inválidas ficam fora desse período.")), colunas));
assert.equal(analise.executarAnalise(periodo, dados).linhas.length, 2);
for (const invalido of [
  texto.replace("Soma de Valor Total por Vendedor.", "Calcule o lucro de cada vendedor."),
  texto + "\nExclua todos os vendedores chamados Camila.",
  texto.replace("Sem filtros adicionais.", '1. Categoria é igual a "\\x".'),
  texto.replace("Considere todo o período disponível.", "Filtre pela coluna Data, de 2026-02-31 até 2026-09-30, incluindo os limites."),
  texto.replace("Aba: Vendas", "Aba: Outra aba"),
]) {
  const resultado = aplicarPrompt(editado(invalido), colunas);
  assert.ok(resultado.erros.length > 0, invalido);
  assert.equal(resultado.config.medida, "Quantidade", "Não aplicar parcialmente uma instrução inválida");
}
// Após interpretar, alterações feitas nos campos não devem ser revertidas pelo prompt já aplicado.
assert.equal(conferir(aplicarPrompt({ ...vendas, agruparPor: "Categoria" }, colunas)).agruparPor, "Categoria");
console.log("OK: edição do prompt atualiza cálculos e filtros; instruções inválidas não alteram os dados.");
