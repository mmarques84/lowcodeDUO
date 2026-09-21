import { NextRequest, NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/session";
import { buscarProjetoPorSlug } from "@/lib/lancamentos";
import { mutate } from "@/lib/db";

export async function POST(req: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { projetoSlug, data, descricao, categoria, tipo, valor, status } = body ?? {};

  if (!projetoSlug || !data || !descricao || !categoria || !tipo || valor === undefined || !status) {
    return NextResponse.json({ erro: "Campos obrigatórios faltando" }, { status: 400 });
  }
  if (tipo !== "entrada" && tipo !== "saida") {
    return NextResponse.json({ erro: "Tipo inválido" }, { status: 400 });
  }
  if (status !== "pendente" && status !== "pago") {
    return NextResponse.json({ erro: "Status inválido" }, { status: 400 });
  }
  const valorNum = Number(valor);
  if (!Number.isFinite(valorNum) || valorNum < 0) {
    return NextResponse.json({ erro: "Valor inválido" }, { status: 400 });
  }

  const projeto = await buscarProjetoPorSlug(projetoSlug, sessao.id, sessao.papel);
  if (!projeto) return NextResponse.json({ erro: "Projeto não encontrado" }, { status: 404 });

  const resultado = await mutate(
    `INSERT INTO lancamentos (projeto_id, data, descricao, categoria, tipo, valor, status)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [projeto.id, data, descricao, categoria, tipo, valorNum, status]
  );

  return NextResponse.json({ id: resultado.insertId }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const { id, projetoSlug, data, descricao, categoria, tipo, valor, status } = body ?? {};

  if (!id || !projetoSlug || !data || !descricao || !categoria || !tipo || valor === undefined || !status) {
    return NextResponse.json({ erro: "Campos obrigatórios faltando" }, { status: 400 });
  }
  if (tipo !== "entrada" && tipo !== "saida") {
    return NextResponse.json({ erro: "Tipo inválido" }, { status: 400 });
  }
  if (status !== "pendente" && status !== "pago") {
    return NextResponse.json({ erro: "Status inválido" }, { status: 400 });
  }
  const valorNum = Number(valor);
  if (!Number.isFinite(valorNum) || valorNum < 0) {
    return NextResponse.json({ erro: "Valor inválido" }, { status: 400 });
  }

  const projeto = await buscarProjetoPorSlug(projetoSlug, sessao.id, sessao.papel);
  if (!projeto) return NextResponse.json({ erro: "Projeto não encontrado" }, { status: 404 });

  const resultado = await mutate(
    `UPDATE lancamentos SET data = ?, descricao = ?, categoria = ?, tipo = ?, valor = ?, status = ?
     WHERE id = ? AND projeto_id = ?`,
    [data, descricao, categoria, tipo, valorNum, status, id, projeto.id]
  );
  if (resultado.affectedRows === 0) {
    return NextResponse.json({ erro: "Lançamento não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  const projetoSlug = searchParams.get("projetoSlug");
  if (!id || !projetoSlug) {
    return NextResponse.json({ erro: "Parâmetros faltando" }, { status: 400 });
  }

  const projeto = await buscarProjetoPorSlug(projetoSlug, sessao.id, sessao.papel);
  if (!projeto) return NextResponse.json({ erro: "Projeto não encontrado" }, { status: 404 });

  const resultado = await mutate(`DELETE FROM lancamentos WHERE id = ? AND projeto_id = ?`, [
    id,
    projeto.id,
  ]);
  if (resultado.affectedRows === 0) {
    return NextResponse.json({ erro: "Lançamento não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
