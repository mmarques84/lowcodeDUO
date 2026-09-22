import { NextRequest, NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/session";
import { buscarProjetoPorSlug, listarLancamentos } from "@/lib/lancamentos";
import { buscarRelatorioGenerico } from "@/lib/relatorioGenerico";
import type { Widget } from "@/lib/widgets";

const N8N_BASE = process.env.N8N_BASE_URL ?? "http://localhost:5678/webhook";

export async function POST(req: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { projetoSlug, pedido, widgetsAtuais } = body ?? {};
  if (!projetoSlug || !pedido) {
    return NextResponse.json({ erro: "Dados inválidos" }, { status: 400 });
  }

  const projeto = await buscarProjetoPorSlug(projetoSlug, sessao.id, sessao.papel);
  if (!projeto) return NextResponse.json({ erro: "Projeto não encontrado" }, { status: 404 });

  const relatorioGenerico = await buscarRelatorioGenerico(projeto.id);
  const lancamentos = await listarLancamentos(projeto.id);

  const payload = {
    pedido,
    projeto: {
      nome: projeto.nome,
      aiConfig: { widgets: (widgetsAtuais as Widget[]) ?? [] },
      ...(relatorioGenerico ? { relatorioGenerico } : {}),
      ...(lancamentos.length ? { financeiro: {
        colunas: ["data", "descricao", "categoria", "tipo", "valor", "status"],
        lancamentos: lancamentos.map(({ data, descricao, categoria, tipo, valor, status }) => ({ data, descricao, categoria, tipo, valor, status })),
      } } : {}),
    },
  };

  try {
    const resp = await fetch(`${N8N_BASE}/ia/rascunho`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!resp.ok) {
      return NextResponse.json({ erro: "IA indisponível no momento." }, { status: 502 });
    }
    const dados = await resp.json();
    return NextResponse.json(dados);
  } catch {
    return NextResponse.json(
      { erro: "Não consegui falar com o serviço de IA (n8n). Ele está rodando?" },
      { status: 502 }
    );
  }
}
