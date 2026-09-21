import { NextRequest, NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/session";
import { buscarProjetoPorSlug } from "@/lib/lancamentos";
import { mutate } from "@/lib/db";
import { detectarColunas } from "@/lib/planilha";
import { analisarQualidade } from "@/lib/qualidadePlanilha";
import { atualizarAlertasImportacao } from "@/lib/alertas";

type LinhaBruta = Record<string, unknown>;

function normalizarChaves(linha: LinhaBruta): Record<string, unknown> {
  const normalizada: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(linha)) {
    normalizada[k.toLowerCase().trim()] = v;
  }
  return normalizada;
}

export async function POST(req: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { projetoSlug, linhas } = body ?? {};
  if (!projetoSlug || !Array.isArray(linhas)) {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  const projeto = await buscarProjetoPorSlug(projetoSlug, sessao.id, sessao.papel);
  if (!projeto) return NextResponse.json({ erro: "Projeto não encontrado" }, { status: 404 });

  let importados = 0;
  let erros = 0;

  for (const linhaBruta of linhas as LinhaBruta[]) {
    const linha = normalizarChaves(linhaBruta);
    const valor = parseFloat(String(linha["valor"] ?? "").replace(",", "."));
    const tipoRaw = String(linha["tipo"] ?? "").toLowerCase();
    const tipo = tipoRaw.startsWith("sa") ? "saida" : "entrada";
    const descricao = (linha["descrição"] ?? linha["descricao"]) as string | undefined;

    if (!descricao || isNaN(valor)) {
      erros++;
      continue;
    }
    await mutate(
      `INSERT INTO lancamentos (projeto_id, data, descricao, categoria, tipo, valor, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pago')`,
      [
        projeto.id,
        linha["data"] ? String(linha["data"]) : new Date().toISOString().slice(0, 10),
        descricao,
        linha["categoria"] || "Sem categoria",
        tipo,
        valor,
      ]
    );
    importados++;
  }

  const achados = analisarQualidade(detectarColunas(linhas), linhas);
  if (erros) achados.push({ codigo: "linhas-invalidas", severidade: "erro", titulo: "Linhas nao importadas", descricao: `${erros} linha(s) sem descricao ou valor valido.` });
  await atualizarAlertasImportacao(projeto.id, achados, linhas);
  return NextResponse.json({ importados, erros, achados });
}
