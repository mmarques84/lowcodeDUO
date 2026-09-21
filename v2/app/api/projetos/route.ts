import { NextRequest, NextResponse } from "next/server";
import { sessaoAtual } from "@/lib/session";
import { query, mutate } from "@/lib/db";
import { registrarVersao } from "@/lib/historicoVersoes";

function slugify(s: string): string {
  return (
    s
      .toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-+|-+$)/g, "") || "projeto"
  );
}

export async function POST(req: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const body = await req.json();
  const nome = (body?.nome ?? "").toString().trim();
  const tipo = (body?.tipo ?? "").toString().trim() || "Geral";
  const descricao = (body?.descricao ?? "").toString().trim().slice(0, 500);
  const cor = (body?.cor ?? "#2B59C3").toString().trim();

  if (!nome) {
    return NextResponse.json({ erro: "Informe um nome para o projeto." }, { status: 400 });
  }

  const slug = `${slugify(nome)}-${Date.now().toString(36)}`;

  const resultado = await mutate(
    `INSERT INTO projetos (usuario_id, nome, slug, tipo, descricao, cor) VALUES (?, ?, ?, ?, ?, ?)`,
    [sessao.id, nome, slug, tipo, descricao || null, cor]
  );

  const criado = await query<{
    id: number;
    usuario_id: number;
    nome: string;
    slug: string;
    tipo: string;
    cor: string;
    versao: number;
    publicado: number;
  }>(
    `SELECT id, usuario_id, nome, slug, tipo, cor, versao, publicado FROM projetos WHERE id = ?`,
    [resultado.insertId]
  );

  await registrarVersao(resultado.insertId, "criacao", "Projeto criado");

  return NextResponse.json({ projeto: { ...criado[0], saldo: 0 } }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const sessao = await sessaoAtual();
  if (!sessao) return NextResponse.json({ erro: "Não autenticado" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = Number(searchParams.get("id"));
  if (!id) return NextResponse.json({ erro: "Parâmetro id faltando" }, { status: 400 });

  const projetos = await query<{ id: number; usuario_id: number }>(
    `SELECT id, usuario_id FROM projetos WHERE id = ? AND (? = 'admin' OR usuario_id = ?)`,
    [id, sessao.papel, sessao.id]
  );
  if (projetos.length === 0) {
    return NextResponse.json({ erro: "Projeto não encontrado" }, { status: 404 });
  }

  const total = await query<{ total: number }>(
    `SELECT COUNT(*) AS total FROM projetos WHERE ? = 'admin' OR usuario_id = ?`,
    [sessao.papel, sessao.id]
  );
  if (total[0].total <= 1) {
    return NextResponse.json(
      { erro: "Você precisa ter pelo menos 1 projeto — crie outro antes de excluir este." },
      { status: 400 }
    );
  }

  await mutate(`DELETE FROM lancamentos WHERE projeto_id = ?`, [id]);
  await mutate(`DELETE FROM dados_importados WHERE projeto_id = ?`, [id]);
  await mutate(`DELETE FROM colunas_detectadas WHERE projeto_id = ?`, [id]);
  await mutate(`DELETE FROM importacoes WHERE projeto_id = ?`, [id]);
  await mutate(`DELETE FROM projetos WHERE id = ?`, [id]);

  return NextResponse.json({ ok: true });
}
